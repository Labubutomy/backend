import { createStore, createEvent, createEffect, sample } from 'effector'
import { tasksApi } from '@shared/api'
import type { Task } from '@shared/api/tasks'
import { routes } from '@shared/router/router'
import { authModel } from '@pages/auth/model/auth-model'

export interface CustomerDashboardStats {
  totalTasks: number
  inProgress: number
  completed: number
  totalBudget: number
}

// Events
export const createTaskClicked = createEvent()
export const taskClicked = createEvent<string>()
export const tasksLoaded = createEvent()

// Effects
const fetchTasksFx = createEffect(async (clientId: string) => {
  try {
    const response = await tasksApi.listTasks({ client_id: clientId, limit: 100 })
    return response.data
  } catch (error) {
    console.warn('Failed to fetch tasks, using mock data:', error)
    // Return mock data if API fails
    return []
  }
})

const fetchStatsFx = createEffect(async (tasks: Task[]) => {
  const totalTasks = tasks.length
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'REVIEW').length
  const completed = tasks.filter(t => t.status === 'COMPLETED').length
  const totalBudget = tasks.reduce((sum, t) => sum + t.budget_upper_bound, 0)
  return { totalTasks, inProgress, completed, totalBudget }
})

// Stores
export const $tasks = createStore<Task[]>([])
export const $stats = createStore<CustomerDashboardStats>({
  totalTasks: 0,
  inProgress: 0,
  completed: 0,
  totalBudget: 0,
})
export const $isLoading = createStore(false)

// Reducers
$tasks.on(fetchTasksFx.doneData, (_, tasks) => tasks)
$stats.on(fetchStatsFx.doneData, (_, stats) => stats)

$isLoading
  .on(fetchTasksFx, () => true)
  .on(fetchTasksFx.done, () => false)
  .on(fetchTasksFx.fail, () => false)

// Samples
sample({
  clock: tasksLoaded,
  source: authModel.$user,
  filter: user => !!user?.user_id && user.user_type === 'CLIENT',
  fn: user => user!.user_id,
  target: fetchTasksFx,
})

sample({
  clock: fetchTasksFx.doneData,
  target: fetchStatsFx,
})

sample({
  clock: createTaskClicked,
  target: routes.customerCreateTask.open,
})

sample({
  clock: taskClicked,
  fn: (taskId: string) => ({ id: taskId }),
  target: routes.customerTaskDetails.open,
})

export const customerDashboardModel = {
  $tasks,
  $stats,
  $isLoading,
  createTaskClicked,
  taskClicked,
  tasksLoaded,
}

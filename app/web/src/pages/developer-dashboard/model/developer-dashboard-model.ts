import { createStore, createEvent, createEffect, sample } from 'effector'
import { usersApi, tasksApi } from '@shared/api'
import type { DeveloperProfile } from '@shared/api/users'
import type { Task } from '@shared/api/tasks'

// Events
export const taskClaimed = createEvent<string>()
export const updatePresenceClicked = createEvent<'OFFLINE' | 'IDLE' | 'SEARCHING'>()
export const updateProfileClicked = createEvent()
export const profileLoaded = createEvent()
export const availableTasksLoaded = createEvent()
export const myTasksLoaded = createEvent()

// Effects
const loadProfileFx = createEffect(async () => {
  const response = await usersApi.getCurrentUserProfile()
  return response.data
})

const loadAvailableTasksFx = createEffect(async () => {
  const response = await tasksApi.listTasks({ status: 'OPEN' })
  return response.data
})

const loadMyTasksFx = createEffect(async () => {
  const response = await tasksApi.listTasks({ status: 'IN_PROGRESS' })
  return response.data
})

const updatePresenceFx = createEffect(async (presence: 'OFFLINE' | 'IDLE' | 'SEARCHING') => {
  const profile = $profile.getState()
  if (profile) {
    await usersApi.updatePresence(profile.user_id, { presence })
  }
})

// Stores
export const $profile = createStore<DeveloperProfile | null>(null)
export const $availableTasks = createStore<Task[]>([])
export const $myTasks = createStore<Task[]>([])
export const $isLoading = createStore(false)
export const $stats = createStore({
  tasksCompleted: 0,
  averageRating: 0,
  activeTasks: 0,
  totalEarned: 0,
})

// Reducers
$isLoading
  .on(loadProfileFx, () => true)
  .on(loadProfileFx.done, () => false)
  .on(loadProfileFx.fail, () => false)
  .on(loadAvailableTasksFx, () => true)
  .on(loadAvailableTasksFx.done, () => false)
  .on(loadAvailableTasksFx.fail, () => false)
  .on(loadMyTasksFx, () => true)
  .on(loadMyTasksFx.done, () => false)
  .on(loadMyTasksFx.fail, () => false)

$profile.on(loadProfileFx.done, (_, { result }) => result)

$availableTasks.on(loadAvailableTasksFx.done, (_, { result }) => result)

$myTasks.on(loadMyTasksFx.done, (_, { result }) => result)

$stats.on(loadMyTasksFx.done, (_, { result }) => {
  const activeTasks = result.length
  const completed = result.filter(task => task.status === 'COMPLETED').length
  const totalEarned = result.reduce((sum, task) => sum + task.budget_upper_bound, 0)

  return {
    tasksCompleted: completed,
    averageRating: 4.5, // Mock data
    activeTasks,
    totalEarned,
  }
})

// Samples
sample({
  clock: profileLoaded,
  target: loadProfileFx,
})

sample({
  clock: availableTasksLoaded,
  target: loadAvailableTasksFx,
})

sample({
  clock: myTasksLoaded,
  target: loadMyTasksFx,
})

sample({
  clock: updatePresenceClicked,
  target: updatePresenceFx,
})

export const developerDashboardModel = {
  $profile,
  $availableTasks,
  $myTasks,
  $isLoading,
  $stats,
  taskClaimed,
  updatePresenceClicked,
  updateProfileClicked,
  profileLoaded,
  availableTasksLoaded,
  myTasksLoaded,
}

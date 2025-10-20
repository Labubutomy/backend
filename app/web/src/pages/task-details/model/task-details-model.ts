import { createStore, createEvent, createEffect, sample } from 'effector'
import { tasksApi, matchingApi } from '@shared/api'
import type { Task } from '@shared/api/tasks'
import type { CandidateScore } from '@shared/api/matching'

// Events
export const taskLoaded = createEvent<string>()
export const editClicked = createEvent()
export const deleteClicked = createEvent()
export const backClicked = createEvent()
export const getRecommendationsClicked = createEvent()

// Effects
const loadTaskFx = createEffect(async (taskId: string) => {
  const response = await tasksApi.getTask(taskId)
  return response.data
})

const deleteTaskFx = createEffect(async (taskId: string) => {
  await tasksApi.deleteTask(taskId)
})

const getRecommendationsFx = createEffect(async (taskId: string) => {
  const response = await matchingApi.getTaskRecommendations(taskId, { limit: 5 })
  return response.data.candidates
})

// Stores
export const $task = createStore<Task | null>(null)
export const $isLoading = createStore(false)
export const $error = createStore<string | null>(null)
export const $recommendations = createStore<CandidateScore[]>([])

// Reducers
$isLoading
  .on(loadTaskFx, () => true)
  .on(loadTaskFx.done, () => false)
  .on(loadTaskFx.fail, () => false)
  .on(deleteTaskFx, () => true)
  .on(deleteTaskFx.done, () => false)
  .on(deleteTaskFx.fail, () => false)
  .on(getRecommendationsFx, () => true)
  .on(getRecommendationsFx.done, () => false)
  .on(getRecommendationsFx.fail, () => false)

$task.on(loadTaskFx.done, (_, { result }) => result).on(deleteTaskFx.done, () => null)

$error
  .on(loadTaskFx.fail, (_, { error }: { error: unknown }) => {
    const err = error as { response?: { data?: { message?: string } } }
    return err.response?.data?.message || 'Failed to load task'
  })
  .on(deleteTaskFx.fail, (_, { error }: { error: unknown }) => {
    const err = error as { response?: { data?: { message?: string } } }
    return err.response?.data?.message || 'Failed to delete task'
  })
  .on(getRecommendationsFx.fail, (_, { error }: { error: unknown }) => {
    const err = error as { response?: { data?: { message?: string } } }
    return err.response?.data?.message || 'Failed to get recommendations'
  })

$recommendations.on(getRecommendationsFx.done, (_, { result }) => result)

// Samples
sample({
  clock: taskLoaded,
  target: loadTaskFx,
})

sample({
  clock: deleteClicked,
  source: $task,
  filter: task => !!task,
  fn: task => task!.task_id,
  target: deleteTaskFx,
})

sample({
  clock: getRecommendationsClicked,
  source: $task,
  filter: task => !!task,
  fn: task => task!.task_id,
  target: getRecommendationsFx,
})

export const taskDetailsModel = {
  $task,
  $isLoading,
  $error,
  $recommendations,
  taskLoaded,
  editClicked,
  deleteClicked,
  backClicked,
  getRecommendationsClicked,
}

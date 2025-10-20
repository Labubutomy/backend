import { createStore, createEvent, createEffect, sample } from 'effector'
import { usersApi } from '@shared/api'
import type { DeveloperProfile, ListDevelopersParams } from '@shared/api/users'

export interface MatchingFilters {
  skillSearch: string
  minRate: number
  maxRate: number
}

// Events
export const searchChanged = createEvent<Partial<MatchingFilters>>()
export const filterChanged = createEvent<Partial<MatchingFilters>>()
export const searchClicked = createEvent()
export const developerClicked = createEvent<string>()

// Effects
const searchDevelopersFx = createEffect(async (filters: MatchingFilters) => {
  const params: ListDevelopersParams = {
    skill_tags: filters.skillSearch ? filters.skillSearch.split(',').map(s => s.trim()) : undefined,
    budget_lower_bound: filters.minRate || 0,
    budget_upper_bound: filters.maxRate || 10000,
    limit: 50,
  }

  const response = await usersApi.listOnlineDevelopers(params)
  return response.data
})

// Stores
export const $developers = createStore<DeveloperProfile[]>([])
export const $isLoading = createStore(false)
export const $error = createStore<string | null>(null)
export const $filters = createStore<MatchingFilters>({
  skillSearch: '',
  minRate: 0,
  maxRate: 1000,
})

// Reducers
$filters
  .on(searchChanged, (state, changes) => ({ ...state, ...changes }))
  .on(filterChanged, (state, changes) => ({ ...state, ...changes }))

$isLoading
  .on(searchDevelopersFx, () => true)
  .on(searchDevelopersFx.done, () => false)
  .on(searchDevelopersFx.fail, () => false)

$developers.on(searchDevelopersFx.done, (_, { result }) => result)

$error
  .on(searchDevelopersFx.fail, (_, { error }: { error: unknown }) => {
    const err = error as { response?: { data?: { message?: string } } }
    return err.response?.data?.message || 'Failed to search developers'
  })
  .on(searchChanged, () => null)
  .on(filterChanged, () => null)

// Samples
sample({
  clock: searchClicked,
  source: $filters,
  target: searchDevelopersFx,
})

export const matchingModel = {
  $developers,
  $isLoading,
  $error,
  $filters,
  searchChanged,
  filterChanged,
  searchClicked,
  developerClicked,
}

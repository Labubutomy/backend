import { api } from './base'

export interface CandidateScore {
  user_id: string
  score: number
  breakdown: Record<string, number>
  reasons: string[]
}

export interface MatchingRequest {
  task_id: string
  skill_tags: string[]
  budget_lower_bound: number
  budget_upper_bound: number
  title: string
  description: string
  limit?: number
  strategy?: string
}

export interface MatchingResponse {
  candidates: CandidateScore[]
  metadata: Record<string, any>
}

export interface FilterCandidatesRequest {
  task_id: string
  skill_tags: string[]
  budget_lower_bound: number
  budget_upper_bound: number
  title: string
  description: string
  candidate_user_ids: string[]
  min_rating?: number
  max_hourly_rate?: number
  required_skills?: string[]
  online_only?: boolean
}

export interface FilterCandidatesResponse {
  filtered_user_ids: string[]
  total_filtered: number
}

export interface GetRecommendationsParams {
  limit?: number
  strategy?: string
}

export const matchingApi = {
  scoreTaskCandidates: (data: MatchingRequest) =>
    api.post<MatchingResponse>('/matching/score', data),

  filterCandidates: (data: FilterCandidatesRequest) =>
    api.post<FilterCandidatesResponse>('/matching/filter', data),

  getTaskRecommendations: (taskId: string, params?: GetRecommendationsParams) =>
    api.get<MatchingResponse>(`/matching/recommendations/${taskId}`, { params }),

  getMatchingHealth: () =>
    api.get('/matching/health'),
}

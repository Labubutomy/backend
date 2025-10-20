import { api } from './base'

export interface DeveloperProfile {
  user_id: string
  display_name: string
  email: string
  skill_tags: string[]
  hourly_rate: number
  rating: number
  presence: 'OFFLINE' | 'IDLE' | 'SEARCHING'
  updated_at: string
}

export interface CreateDeveloperProfileRequest {
  display_name: string
  email: string
  skill_tags: string[]
  hourly_rate: number
}

export interface UpdateDeveloperProfileRequest {
  skill_tags?: string[]
  hourly_rate?: number
  bio?: string
  links?: string[]
}

export interface UpdatePresenceRequest {
  presence: 'OFFLINE' | 'IDLE' | 'SEARCHING'
}

export interface ListDevelopersParams {
  skill_tags?: string[]
  budget_lower_bound?: number
  budget_upper_bound?: number
  limit?: number
}

export const usersApi = {
  // Developer profile management
  createDeveloperProfile: (data: CreateDeveloperProfileRequest) =>
    api.post<DeveloperProfile>('/users/developers', data),

  updateDeveloperProfile: (userId: string, data: UpdateDeveloperProfileRequest) =>
    api.put(`/users/developers/${userId}`, data),

  updatePresence: (userId: string, data: UpdatePresenceRequest) =>
    api.put(`/users/developers/${userId}/presence`, data),

  getDeveloperProfile: (userId: string) =>
    api.get<DeveloperProfile>(`/users/developers/${userId}`),

  listOnlineDevelopers: (params?: ListDevelopersParams) =>
    api.get<DeveloperProfile[]>('/users/developers', { params }),

  getCurrentUserProfile: () =>
    api.get('/users/me'),
}

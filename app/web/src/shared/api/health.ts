import { api } from './base'

export interface HealthResponse {
  status: string
  version: string
  services: Record<string, string>
}

export interface DetailedHealthResponse {
  status: string
  version: string
  services: Record<string, string>
}

export interface ReadinessResponse {
  status: string
  reason?: string
}

export interface LivenessResponse {
  status: string
}

export const healthApi = {
  getHealth: () =>
    api.get<HealthResponse>('/health'),

  getDetailedHealth: () =>
    api.get<DetailedHealthResponse>('/health/detailed'),

  getReadiness: () =>
    api.get<ReadinessResponse>('/health/ready'),

  getLiveness: () =>
    api.get<LivenessResponse>('/health/live'),
}

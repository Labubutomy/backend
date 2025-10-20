import { api } from './base'

export interface Task {
  task_id: string
  client_id: string
  title: string
  description: string
  skill_tags: string[]
  budget_lower_bound: number
  budget_upper_bound: number
  repository_url: string
  status: string
  created_at: string
  updated_at: string
}

export interface CreateTaskRequest {
  title: string
  description: string
  skill_tags: string[]
  budget_lower_bound: number
  budget_upper_bound: number
  repository_url?: string
  priority?: number
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  skill_tags?: string[]
  budget_lower_bound?: number
  budget_upper_bound?: number
  repository_url?: string
  status?: string
}

export interface ListTasksParams {
  client_id?: string
  status?: string
  skill_tags?: string[]
  limit?: number
  offset?: number
}

export const tasksApi = {
  createTask: (data: CreateTaskRequest) =>
    api.post<Task>('/tasks', data),
  
  getTask: (taskId: string) =>
    api.get<Task>(`/tasks/${taskId}`),
  
  updateTask: (taskId: string, data: UpdateTaskRequest) =>
    api.put(`/tasks/${taskId}`, data),
  
  listTasks: (params?: ListTasksParams) =>
    api.get<Task[]>('/tasks', { params }),
  
  deleteTask: (taskId: string) =>
    api.delete(`/tasks/${taskId}`),
}

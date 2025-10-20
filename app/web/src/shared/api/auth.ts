import { api } from './base'

export interface UserLogin {
  email: string
  password: string
}

export interface UserCreate {
  email: string
  password: string
  user_type: 'CLIENT' | 'DEVELOPER' | 'ADMIN'
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface RefreshToken {
  refresh_token: string
}

export interface LogoutRequest {
  refresh_token?: string
}

export interface UserResponse {
  user_id: string
  email: string
  user_type: 'CLIENT' | 'DEVELOPER' | 'ADMIN'
  created_at: string
  updated_at: string
}

export const authApi = {
  login: (data: UserLogin) =>
    api.post<AuthResponse>('/auth/login', data),

  register: (data: UserCreate) => 
    api.post<AuthResponse>('/auth/register', data),

  refresh: (data: RefreshToken) => 
    api.post<AuthResponse>('/auth/refresh', data),

  logout: (data?: LogoutRequest) => 
    api.post('/auth/logout', data),

  getMe: () => 
    api.get<UserResponse>('/auth/me'),
}

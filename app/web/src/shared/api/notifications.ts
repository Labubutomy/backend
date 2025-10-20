import { api } from './base'

export interface Notification {
  id: string
  type: 'task' | 'payment' | 'system'
  title: string
  message: string
  read: boolean
  createdAt: string
  data?: Record<string, any>
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  sms: boolean
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}

export const notificationsApi = {
  getNotifications: (params?: { type?: string; read?: boolean }) =>
    api.get<Notification[]>('/notifications', { params }),
  
  markAsRead: (id: string) =>
    api.put(`/notifications/${id}/read`),
  
  markAllAsRead: () =>
    api.put('/notifications/read-all'),
  
  deleteNotification: (id: string) =>
    api.delete(`/notifications/${id}`),
  
  getPreferences: () =>
    api.get<NotificationPreferences>('/notifications/preferences'),
  
  updatePreferences: (data: Partial<NotificationPreferences>) =>
    api.put<NotificationPreferences>('/notifications/preferences', data),
}

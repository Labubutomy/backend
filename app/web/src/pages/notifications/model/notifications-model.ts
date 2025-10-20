import { createStore, createEvent } from 'effector'

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

export const notificationsLoaded = createEvent<Notification[]>()
export const preferencesLoaded = createEvent<NotificationPreferences>()
export const notificationMarkedAsRead = createEvent<string>()
export const allNotificationsMarkedAsRead = createEvent<void>()
export const notificationDeleted = createEvent<string>()
export const preferencesUpdated = createEvent<Partial<NotificationPreferences>>()

export const $notifications = createStore<Notification[]>([])
export const $preferences = createStore<NotificationPreferences>({
  email: true,
  push: true,
  sms: false,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
})
export const $isLoading = createStore(false)

$notifications.on(notificationsLoaded, (_, notifications) => notifications)
$notifications.on(notificationMarkedAsRead, (current, id) =>
  current.map(n => n.id === id ? { ...n, read: true } : n)
)
$notifications.on(allNotificationsMarkedAsRead, (current) =>
  current.map(n => ({ ...n, read: true }))
)
$notifications.on(notificationDeleted, (current, id) =>
  current.filter(n => n.id !== id)
)

$preferences.on(preferencesLoaded, (_, preferences) => preferences)
$preferences.on(preferencesUpdated, (current, updates) => ({ ...current, ...updates }))

export const notificationsModel = {
  $notifications,
  $preferences,
  $isLoading,
  notificationsLoaded,
  preferencesLoaded,
  notificationMarkedAsRead,
  allNotificationsMarkedAsRead,
  notificationDeleted,
  preferencesUpdated,
}

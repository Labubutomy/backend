import React from 'react'
import { useUnit } from 'effector-react'
import { notificationsModel } from '../model/notifications-model'
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@shared/ui'
import {
  Bell,
  Check,
  Trash2,
  Settings,
  Mail,
  Smartphone,
  MessageSquare,
  Clock,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'

// Mock data for demonstration
const mockNotifications = [
  {
    id: '1',
    type: 'task',
    title: 'Новая задача назначена',
    message: 'Вам назначена задача "Создание мобильного приложения"',
    read: false,
    createdAt: '2024-01-20T10:30:00Z',
  },
  {
    id: '2',
    type: 'payment',
    title: 'Платеж получен',
    message: 'Получен платеж в размере ₽50,000 за выполненную задачу',
    read: false,
    createdAt: '2024-01-19T15:45:00Z',
  },
  {
    id: '3',
    type: 'system',
    title: 'Обновление системы',
    message: 'Планируется техническое обслуживание 22 января с 02:00 до 04:00',
    read: true,
    createdAt: '2024-01-18T09:00:00Z',
  },
  {
    id: '4',
    type: 'task',
    title: 'Задача завершена',
    message: 'Задача "Веб-сайт для стартапа" успешно завершена',
    read: true,
    createdAt: '2024-01-17T14:20:00Z',
  },
]

const mockPreferences = {
  email: true,
  push: true,
  sms: false,
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
  },
}

export const Notifications = () => {
  const {
    $notifications,
    $preferences,
    $isLoading,
    notificationMarkedAsRead,
    allNotificationsMarkedAsRead,
    notificationDeleted,
    preferencesUpdated,
  } = notificationsModel

  const [notifications, preferences, isLoading] = useUnit([
    $notifications,
    $preferences,
    $isLoading,
  ])

  // Use mock data for demonstration
  const currentNotifications = notifications.length > 0 ? notifications : mockNotifications
  const currentPreferences = preferences || mockPreferences

  const [activeTab, setActiveTab] = React.useState<
    'all' | 'unread' | 'tasks' | 'payments' | 'system'
  >('all')

  const filteredNotifications = React.useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return currentNotifications.filter(n => !n.read)
      case 'tasks':
        return currentNotifications.filter(n => n.type === 'task')
      case 'payments':
        return currentNotifications.filter(n => n.type === 'payment')
      case 'system':
        return currentNotifications.filter(n => n.type === 'system')
      default:
        return currentNotifications
    }
  }, [currentNotifications, activeTab])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <Bell className="w-5 h-5 text-blue-500" />
      case 'payment':
        return <DollarSign className="w-5 h-5 text-green-500" />
      case 'system':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Только что'
    if (diffInMinutes < 60) return `${diffInMinutes}м назад`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}ч назад`
    return `${Math.floor(diffInMinutes / 1440)}д назад`
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Уведомления</h1>
          <p className="text-muted-foreground">Будьте в курсе последних событий</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => allNotificationsMarkedAsRead()}>
            <Check className="w-4 h-4 mr-2" />
            Отметить все как прочитанные
          </Button>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Notification Tabs */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Категории</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { id: 'all', label: 'Все', count: currentNotifications.length },
                {
                  id: 'unread',
                  label: 'Непрочитанные',
                  count: currentNotifications.filter(n => !n.read).length,
                },
                {
                  id: 'tasks',
                  label: 'Задачи',
                  count: currentNotifications.filter(n => n.type === 'task').length,
                },
                {
                  id: 'payments',
                  label: 'Платежи',
                  count: currentNotifications.filter(n => n.type === 'payment').length,
                },
                {
                  id: 'system',
                  label: 'Система',
                  count: currentNotifications.filter(n => n.type === 'system').length,
                },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id as 'all' | 'unread' | 'tasks' | 'payments' | 'system')
                  }
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id ? 'bg-primary/20 text-primary' : 'hover:bg-muted'
                  }`}
                >
                  <span className="font-medium">{tab.label}</span>
                  <span className="text-sm text-muted-foreground">{tab.count}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Notification List */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'all' && 'Все уведомления'}
                {activeTab === 'unread' && 'Непрочитанные уведомления'}
                {activeTab === 'tasks' && 'Уведомления о задачах'}
                {activeTab === 'payments' && 'Уведомления о платежах'}
                {activeTab === 'system' && 'Системные уведомления'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      notification.read ? 'bg-muted/50' : 'bg-card border-primary/20'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4
                            className={`text-sm font-medium ${
                              notification.read ? 'text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">
                              {getTimeAgo(notification.createdAt)}
                            </span>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                        </div>

                        <p
                          className={`text-sm mt-1 ${
                            notification.read ? 'text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {notification.message}
                        </p>

                        <div className="flex items-center space-x-2 mt-3">
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => notificationMarkedAsRead(notification.id)}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Отметить как прочитанное
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => notificationDeleted(notification.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredNotifications.length === 0 && (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Нет уведомлений</h3>
                    <p className="text-muted-foreground">
                      {activeTab === 'all' && 'Вы в курсе всех событий!'}
                      {activeTab === 'unread' && 'Нет непрочитанных уведомлений'}
                      {activeTab === 'tasks' && 'Нет уведомлений о задачах'}
                      {activeTab === 'payments' && 'Нет уведомлений о платежах'}
                      {activeTab === 'system' && 'Нет системных уведомлений'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Настройки уведомлений</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <span className="font-medium">Email уведомления</span>
                  <p className="text-sm text-muted-foreground">Получать уведомления по email</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentPreferences.email}
                  onChange={e => preferencesUpdated({ email: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <span className="font-medium">Push уведомления</span>
                  <p className="text-sm text-muted-foreground">
                    Получать push уведомления на устройстве
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentPreferences.push}
                  onChange={e => preferencesUpdated({ push: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <div>
                  <span className="font-medium">SMS уведомления</span>
                  <p className="text-sm text-muted-foreground">Получать уведомления по SMS</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentPreferences.sms}
                  onChange={e => preferencesUpdated({ sms: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <span className="font-medium">Тихие часы</span>
                  <p className="text-sm text-muted-foreground">
                    Отключить уведомления в определенные часы
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentPreferences.quietHours.enabled}
                  onChange={e =>
                    preferencesUpdated({
                      quietHours: { ...currentPreferences.quietHours, enabled: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {currentPreferences.quietHours.enabled && (
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium mb-2">С</label>
                  <Input
                    type="time"
                    value={currentPreferences.quietHours.start}
                    onChange={e =>
                      preferencesUpdated({
                        quietHours: { ...currentPreferences.quietHours, start: e.target.value },
                      })
                    }
                    className="w-32"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">До</label>
                  <Input
                    type="time"
                    value={currentPreferences.quietHours.end}
                    onChange={e =>
                      preferencesUpdated({
                        quietHours: { ...currentPreferences.quietHours, end: e.target.value },
                      })
                    }
                    className="w-32"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

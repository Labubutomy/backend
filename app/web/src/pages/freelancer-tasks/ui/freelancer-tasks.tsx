import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  StatusBadge,
  SkillBadge,
} from '@shared/ui'
import { Clock, DollarSign, Calendar, User, CheckCircle, AlertCircle } from 'lucide-react'

// Mock data for completed tasks
const mockCompletedTasks = [
  {
    task_id: '1',
    title: 'Создание мобильного приложения',
    description: 'Разработка iOS приложения для управления задачами',
    status: 'COMPLETED' as const,
    skill_tags: ['Swift', 'iOS', 'Core Data'],
    budget_lower_bound: 50000,
    budget_upper_bound: 80000,
    created_at: '2024-01-15T10:00:00Z',
    completed_at: '2024-01-20T14:30:00Z',
    client_id: 'client-1',
    client_name: 'ООО "ТехноСтарт"',
    rating: 5,
    review: 'Отличная работа! Выполнено в срок и с высоким качеством.',
  },
  {
    task_id: '2',
    title: 'Веб-сайт для стартапа',
    description: 'Создание лендинга с интеграцией платежной системы',
    status: 'COMPLETED' as const,
    skill_tags: ['React', 'Node.js', 'Stripe'],
    budget_lower_bound: 30000,
    budget_upper_bound: 50000,
    created_at: '2024-01-10T14:30:00Z',
    completed_at: '2024-01-17T16:45:00Z',
    client_id: 'client-2',
    client_name: 'ИП Иванов',
    rating: 4,
    review: 'Хорошая работа, но были небольшие задержки.',
  },
]

// Mock data for current tasks
const mockCurrentTasks = [
  {
    task_id: '3',
    title: 'API для микросервисов',
    description: 'Разработка REST API с документацией и тестами',
    status: 'IN_PROGRESS' as const,
    skill_tags: ['Python', 'FastAPI', 'PostgreSQL'],
    budget_lower_bound: 40000,
    budget_upper_bound: 60000,
    created_at: '2024-01-12T09:15:00Z',
    deadline: '2024-01-25T18:00:00Z',
    client_id: 'client-3',
    client_name: 'ООО "Инновации"',
    progress: 65,
  },
  {
    task_id: '4',
    title: 'Дашборд аналитики',
    description: 'Создание дашборда для анализа данных',
    status: 'REVIEW' as const,
    skill_tags: ['React', 'D3.js', 'TypeScript'],
    budget_lower_bound: 35000,
    budget_upper_bound: 55000,
    created_at: '2024-01-08T11:20:00Z',
    deadline: '2024-01-22T17:00:00Z',
    client_id: 'client-4',
    client_name: 'ООО "Аналитика+"',
    progress: 100,
  },
]

export const FreelancerCompletedTasks: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'completed' | 'current'>('completed')

  const completedTasks = mockCompletedTasks
  const currentTasks = mockCurrentTasks

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Сегодня'
    if (diffInDays === 1) return 'Вчера'
    if (diffInDays < 7) return `${diffInDays} дней назад`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} недель назад`
    return `${Math.floor(diffInDays / 30)} месяцев назад`
  }

  const getDeadlineStatus = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const now = new Date()
    const diffInHours = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 0) return { status: 'overdue', text: 'Просрочено' }
    if (diffInHours < 24) return { status: 'urgent', text: 'Срочно' }
    if (diffInHours < 72) return { status: 'soon', text: 'Скоро' }
    return { status: 'normal', text: 'В срок' }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Мои задачи</h1>
          <p className="text-muted-foreground">Управление вашими проектами</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={activeTab === 'current' ? 'default' : 'outline'}
            onClick={() => setActiveTab('current')}
          >
            Текущие ({currentTasks.length})
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('completed')}
          >
            Выполненные ({completedTasks.length})
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Всего задач</p>
                <p className="text-2xl font-bold text-foreground">
                  {completedTasks.length + currentTasks.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">В работе</p>
                <p className="text-2xl font-bold text-foreground">
                  {currentTasks.filter(t => t.status === 'IN_PROGRESS').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-chart-blue/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-chart-blue" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">На проверке</p>
                <p className="text-2xl font-bold text-foreground">
                  {currentTasks.filter(t => t.status === 'REVIEW').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-chart-orange/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-chart-orange" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Заработано</p>
                <p className="text-2xl font-bold text-foreground">
                  ₽
                  {completedTasks
                    .reduce((sum, t) => sum + t.budget_upper_bound, 0)
                    .toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-chart-green/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-chart-green" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {activeTab === 'completed' ? 'Выполненные задачи' : 'Текущие задачи'}
        </h2>

        {activeTab === 'completed' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedTasks.map(task => (
              <Card key={task.task_id} className="task-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Skills */}
                  <div className="flex flex-wrap gap-2">
                    {task.skill_tags.map((skill, index) => (
                      <SkillBadge key={index} skill={skill} level={5} />
                    ))}
                  </div>

                  {/* Client Info */}
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>{task.client_name}</span>
                  </div>

                  {/* Budget */}
                  <div className="flex items-center space-x-2 text-sm">
                    <DollarSign className="w-4 h-4 text-chart-green" />
                    <span className="font-medium">₽{task.budget_upper_bound.toLocaleString()}</span>
                  </div>

                  {/* Completion Date */}
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Завершено {getTimeAgo(task.completed_at)}</span>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-sm ${
                            i < task.rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">({task.rating}/5)</span>
                  </div>

                  {/* Review */}
                  {task.review && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-foreground italic">"{task.review}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentTasks.map(task => {
              const deadlineStatus = getDeadlineStatus(task.deadline)
              return (
                <Card key={task.task_id} className="task-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <StatusBadge status={task.status} />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Skills */}
                    <div className="flex flex-wrap gap-2">
                      {task.skill_tags.map((skill, index) => (
                        <SkillBadge key={index} skill={skill} level={5} />
                      ))}
                    </div>

                    {/* Client Info */}
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{task.client_name}</span>
                    </div>

                    {/* Budget */}
                    <div className="flex items-center space-x-2 text-sm">
                      <DollarSign className="w-4 h-4 text-chart-green" />
                      <span className="font-medium">
                        ₽{task.budget_upper_bound.toLocaleString()}
                      </span>
                    </div>

                    {/* Deadline */}
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-4 h-4" />
                      <span className="text-muted-foreground">Дедлайн:</span>
                      <span
                        className={`font-medium ${
                          deadlineStatus.status === 'overdue'
                            ? 'text-destructive'
                            : deadlineStatus.status === 'urgent'
                              ? 'text-chart-orange'
                              : 'text-foreground'
                        }`}
                      >
                        {new Date(task.deadline).toLocaleDateString('ru-RU')}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          deadlineStatus.status === 'overdue'
                            ? 'bg-destructive/20 text-destructive'
                            : deadlineStatus.status === 'urgent'
                              ? 'bg-chart-orange/20 text-chart-orange'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {deadlineStatus.text}
                      </span>
                    </div>

                    {/* Progress */}
                    {task.status === 'IN_PROGRESS' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Прогресс</span>
                          <span className="font-medium">{task.progress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2">
                      {task.status === 'IN_PROGRESS' && (
                        <Button size="sm" className="flex-1">
                          Отметить выполненной
                        </Button>
                      )}
                      {task.status === 'REVIEW' && (
                        <Button size="sm" variant="outline" className="flex-1">
                          Просмотреть отзыв
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {((activeTab === 'completed' && completedTasks.length === 0) ||
          (activeTab === 'current' && currentTasks.length === 0)) && (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {activeTab === 'completed' ? 'Нет выполненных задач' : 'Нет текущих задач'}
            </h3>
            <p className="text-muted-foreground">
              {activeTab === 'completed'
                ? 'Выполненные задачи появятся здесь после завершения проектов'
                : 'Текущие задачи появятся здесь после принятия заказов'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

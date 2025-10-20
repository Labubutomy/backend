import React from 'react'
import { useUnit } from 'effector-react'
import { taskDetailsModel } from '../model/task-details-model'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  StatusBadge,
  SkillBadge,
} from '@shared/ui'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Calendar,
  Code,
  Clock,
  User,
} from 'lucide-react'
import { routes } from '@shared/router/router'

// Mock data for demonstration
const mockTask = {
  task_id: '1',
  title: 'Создание мобильного приложения',
  description:
    'Разработка iOS приложения для управления задачами с современным дизайном. Приложение должно включать:\n\n• Систему аутентификации пользователей\n• Создание и управление задачами\n• Уведомления и напоминания\n• Синхронизацию с облаком\n• Современный Material Design интерфейс\n\nТребования:\n- Swift 5.0+\n- iOS 14.0+\n- Core Data для локального хранения\n- Firebase для бэкенда\n- Поддержка темной темы',
  status: 'IN_PROGRESS' as const,
  skill_tags: ['Swift', 'iOS', 'Core Data', 'Firebase', 'UIKit'],
  budget_lower_bound: 50000,
  budget_upper_bound: 80000,
  repository_url: 'https://github.com/example/mobile-app',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-20T14:30:00Z',
  client_id: 'client-1',
  assignee_id: 'dev-1',
}

const mockAssignee = {
  user_id: 'dev-1',
  display_name: 'Александр Петров',
  email: 'alex.petrov@email.com',
  rating: 4.9,
  completed_tasks: 45,
}

const mockRecommendations = [
  {
    user_id: 'dev-2',
    score: 0.95,
    reasons: ['Swift экспертиза', 'iOS разработка', 'Core Data опыт'],
  },
  {
    user_id: 'dev-3',
    score: 0.87,
    reasons: ['Мобильная разработка', 'Firebase интеграция'],
  },
  {
    user_id: 'dev-4',
    score: 0.82,
    reasons: ['iOS приложения', 'UIKit опыт'],
  },
]

export const TaskDetailsPage = () => {
  const {
    $task,
    $isLoading,
    $error,
    $recommendations,
    taskLoaded,
    editClicked,
    deleteClicked,
    getRecommendationsClicked,
  } = taskDetailsModel

  const [task, isLoading, error, recommendations] = useUnit([
    $task,
    $isLoading,
    $error,
    $recommendations,
  ])

  // Use mock data for demonstration
  const currentTask = task || mockTask
  const currentRecommendations = recommendations.length > 0 ? recommendations : mockRecommendations

  React.useEffect(() => {
    // Get task ID from URL params
    const taskId = window.location.pathname.split('/').pop()
    if (taskId) {
      taskLoaded(taskId)
    }
  }, [taskLoaded])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ошибка</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => routes.customerDashboard.open()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="outline"
              onClick={() => routes.customerDashboard.open()}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{currentTask.title}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <StatusBadge
                  status={currentTask.status as 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'REVIEW'}
                />
                <span className="text-sm text-muted-foreground">ID: #{currentTask.task_id}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => editClicked()}>
              <Edit className="w-4 h-4 mr-2" />
              Редактировать
            </Button>
            <Button
              variant="outline"
              onClick={() => deleteClicked()}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Описание задачи</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {currentTask.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Требуемые навыки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {currentTask.skill_tags.map((tag, index) => (
                    <SkillBadge key={index} skill={tag} level={5} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {currentTask.repository_url && (
              <Card>
                <CardHeader>
                  <CardTitle>Репозиторий</CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={currentTask.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 flex items-center"
                  >
                    <Code className="w-4 h-4 mr-2" />
                    {currentTask.repository_url}
                  </a>
                </CardContent>
              </Card>
            )}

            {(currentTask as { assignee_id?: string }).assignee_id && (
              <Card>
                <CardHeader>
                  <CardTitle>Исполнитель</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{mockAssignee.display_name}</h4>
                      <p className="text-sm text-muted-foreground">{mockAssignee.email}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-muted-foreground">
                          ⭐ {mockAssignee.rating}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Задач выполнено: {mockAssignee.completed_tasks}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Информация о задаче</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center text-sm">
                  <DollarSign className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Бюджет:</span>
                  <span className="ml-2">
                    ₽{currentTask.budget_lower_bound.toLocaleString()} - ₽
                    {currentTask.budget_upper_bound.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Создана:</span>
                  <span className="ml-2">
                    {new Date(currentTask.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Обновлена:</span>
                  <span className="ml-2">
                    {new Date(currentTask.updated_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                <div className="flex items-center text-sm">
                  <span className="font-medium">Статус:</span>
                  <div className="ml-2">
                    <StatusBadge
                      status={currentTask.status as 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'REVIEW'}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Рекомендации исполнителей</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => getRecommendationsClicked()} className="w-full mb-4">
                  <Users className="w-4 h-4 mr-2" />
                  Найти исполнителей
                </Button>

                {currentRecommendations.length > 0 && (
                  <div className="space-y-3">
                    {currentRecommendations.map((candidate, index) => (
                      <div key={index} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-foreground">
                            Исполнитель #{candidate.user_id.slice(0, 8)}
                          </span>
                          <span className="text-sm font-bold text-chart-green">
                            {Math.round(candidate.score * 100)}% совпадение
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {candidate.reasons.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

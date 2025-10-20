import React from 'react'
import { useUnit } from 'effector-react'
import { matchingModel } from '../model/matching-model'
import { Button, Card, CardContent, StatusBadge, SearchAndFilters } from '@shared/ui'
import { Briefcase, Clock, DollarSign, Star, User } from 'lucide-react'

// Mock data for available tasks
const mockTasks = [
  {
    task_id: '1',
    title: 'Создание мобильного приложения',
    description:
      'Разработка iOS приложения для управления задачами с современным дизайном и интуитивным интерфейсом',
    status: 'OPEN' as const,
    skill_tags: ['React Native', 'iOS', 'TypeScript', 'Firebase'],
    budget_lower_bound: 50000,
    budget_upper_bound: 80000,
    repository_url: 'https://github.com/example/mobile-app',
    created_at: '2024-01-15T10:00:00Z',
    client_id: 'client-1',
    assignee_id: null,
    match_score: 95,
    client_name: 'ТехСтарт',
    deadline: '2024-02-15T23:59:59Z',
  },
  {
    task_id: '2',
    title: 'Веб-сайт для стартапа',
    description: 'Создание лендинга с интеграцией платежной системы и админ-панелью',
    status: 'OPEN' as const,
    skill_tags: ['React', 'Node.js', 'Stripe', 'MongoDB'],
    budget_lower_bound: 30000,
    budget_upper_bound: 50000,
    repository_url: 'https://github.com/example/startup-website',
    created_at: '2024-01-10T14:30:00Z',
    client_id: 'client-2',
    assignee_id: null,
    match_score: 88,
    client_name: 'Инновации Лтд',
    deadline: '2024-02-10T23:59:59Z',
  },
  {
    task_id: '3',
    title: 'API для микросервисов',
    description: 'Разработка REST API с документацией, тестами и мониторингом',
    status: 'OPEN' as const,
    skill_tags: ['Python', 'FastAPI', 'PostgreSQL', 'Docker'],
    budget_lower_bound: 40000,
    budget_upper_bound: 60000,
    repository_url: 'https://github.com/example/api-service',
    created_at: '2024-01-12T09:15:00Z',
    client_id: 'client-3',
    assignee_id: null,
    match_score: 92,
    client_name: 'КлаудТех',
    deadline: '2024-02-20T23:59:59Z',
  },
  {
    task_id: '4',
    title: 'Дашборд аналитики',
    description: 'Создание интерактивного дашборда с графиками, фильтрами и экспортом данных',
    status: 'OPEN' as const,
    skill_tags: ['Vue.js', 'D3.js', 'Chart.js', 'WebSocket'],
    budget_lower_bound: 35000,
    budget_upper_bound: 55000,
    repository_url: '',
    created_at: '2024-01-20T16:45:00Z',
    client_id: 'client-4',
    assignee_id: null,
    match_score: 75,
    client_name: 'Аналитика Плюс',
    deadline: '2024-02-25T23:59:59Z',
  },
  {
    task_id: '5',
    title: 'Чат-бот для поддержки',
    description: 'Разработка интеллектуального чат-бота с интеграцией в существующую систему',
    status: 'OPEN' as const,
    skill_tags: ['Python', 'OpenAI', 'Telegram Bot', 'Redis'],
    budget_lower_bound: 25000,
    budget_upper_bound: 40000,
    repository_url: '',
    created_at: '2024-01-18T11:20:00Z',
    client_id: 'client-5',
    assignee_id: null,
    match_score: 82,
    client_name: 'СервисПро',
    deadline: '2024-02-12T23:59:59Z',
  },
]

export const FreelancerTasksPage: React.FC = () => {
  const { $isLoading } = matchingModel
  const [isLoading] = useUnit([$isLoading])

  const [searchValue, setSearchValue] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, string | undefined>>({})

  React.useEffect(() => {
    // Mock loading for demonstration
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
  }

  const handleFilterChange = (key: string, value: string | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleClearFilters = () => {
    setSearchValue('')
    setFilters({})
  }

  const handleClaimTask = (taskId: string) => {
    console.log(`Claiming task: ${taskId}`)
    // Here would be the logic to claim a task
  }

  const filteredTasks = mockTasks.filter(task => {
    const matchesSearch =
      !searchValue ||
      task.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      task.description.toLowerCase().includes(searchValue.toLowerCase()) ||
      task.skill_tags.some(skill => skill.toLowerCase().includes(searchValue.toLowerCase()))

    const matchesStatus = !filters.status || task.status === filters.status
    const matchesBudget =
      !filters.budget ||
      (filters.budget === 'low' && task.budget_upper_bound < 40000) ||
      (filters.budget === 'medium' &&
        task.budget_upper_bound >= 40000 &&
        task.budget_upper_bound < 60000) ||
      (filters.budget === 'high' && task.budget_upper_bound >= 60000)

    return matchesSearch && matchesStatus && matchesBudget
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Доступные задачи</h1>
          <p className="text-muted-foreground">Найдите подходящие проекты для работы</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Briefcase className="w-4 h-4 mr-2" />
            Мои задачи
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="task-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Всего задач</p>
                <p className="text-2xl font-bold text-foreground">{mockTasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="task-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Высокое совпадение</p>
                <p className="text-2xl font-bold text-foreground">
                  {mockTasks.filter(t => t.match_score >= 90).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-chart-green/20 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-chart-green" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="task-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Средний бюджет</p>
                <p className="text-2xl font-bold text-foreground">
                  ₽
                  {Math.round(
                    mockTasks.reduce((sum, t) => sum + t.budget_upper_bound, 0) / mockTasks.length
                  ).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-chart-purple/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-chart-purple" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="task-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Средний срок</p>
                <p className="text-2xl font-bold text-foreground">25 дней</p>
              </div>
              <div className="w-12 h-12 bg-chart-yellow/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-chart-yellow" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <SearchAndFilters
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Tasks List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Рекомендованные задачи</h2>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Briefcase className="w-4 h-4" />
            <span>
              Показано {filteredTasks.length} из {mockTasks.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="task-card">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                    <div className="flex space-x-2">
                      <div className="h-6 bg-muted rounded w-16"></div>
                      <div className="h-6 bg-muted rounded w-20"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => (
              <Card key={task.task_id} className="task-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                        {task.title}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                        <User className="w-3 h-3" />
                        <span>{task.client_name}</span>
                        <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                        <Clock className="w-3 h-3" />
                        <span>до {new Date(task.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-sm">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{task.match_score}%</span>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-4 text-sm line-clamp-3">
                    {task.description}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-foreground mb-2 text-sm">Навыки:</h4>
                      <div className="flex flex-wrap gap-2">
                        {task.skill_tags.map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary/20 text-primary rounded-md text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">
                          ₽{task.budget_lower_bound.toLocaleString()} - ₽
                          {task.budget_upper_bound.toLocaleString()}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleClaimTask(task.task_id)}
                        size="sm"
                        className="gradient-bg"
                      >
                        Взять в работу
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredTasks.length === 0 && !isLoading && (
          <Card className="task-card">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Задач не найдено</h3>
              <p className="text-muted-foreground mb-4">
                Попробуйте изменить фильтры или обновить навыки в профиле
              </p>
              <Button variant="outline">Обновить профиль</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

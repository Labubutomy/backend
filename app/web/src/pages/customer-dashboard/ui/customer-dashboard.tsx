import React from 'react'
import { useUnit } from 'effector-react'
import { customerDashboardModel } from '../model/customer-dashboard-model'
import { Card, CardContent, TaskCard, SearchAndFilters } from '@shared/ui'
import { TrendingUp, Clock, CheckCircle, DollarSign, Filter } from 'lucide-react'

// Mock data for demonstration
const mockTasks = [
  {
    task_id: '1',
    title: 'Создание мобильного приложения',
    description: 'Разработка iOS приложения для управления задачами с современным дизайном',
    status: 'IN_PROGRESS' as const,
    skill_tags: ['React Native', 'iOS', 'TypeScript'],
    budget_lower_bound: 50000,
    budget_upper_bound: 80000,
    repository_url: 'https://github.com/example/mobile-app',
    created_at: '2024-01-15T10:00:00Z',
    client_id: 'client-1',
    assignee_id: 'dev-1',
  },
  {
    task_id: '2',
    title: 'Веб-сайт для стартапа',
    description: 'Создание лендинга с интеграцией платежной системы',
    status: 'COMPLETED' as const,
    skill_tags: ['React', 'Node.js', 'Stripe'],
    budget_lower_bound: 30000,
    budget_upper_bound: 50000,
    repository_url: 'https://github.com/example/startup-website',
    created_at: '2024-01-10T14:30:00Z',
    client_id: 'client-1',
    assignee_id: 'dev-2',
  },
  {
    task_id: '3',
    title: 'API для микросервисов',
    description: 'Разработка REST API с документацией и тестами',
    status: 'REVIEW' as const,
    skill_tags: ['Python', 'FastAPI', 'PostgreSQL'],
    budget_lower_bound: 40000,
    budget_upper_bound: 60000,
    repository_url: 'https://github.com/example/api-service',
    created_at: '2024-01-12T09:15:00Z',
    client_id: 'client-1',
    assignee_id: 'dev-3',
  },
  {
    task_id: '4',
    title: 'Дашборд аналитики',
    description: 'Создание интерактивного дашборда с графиками и фильтрами',
    status: 'OPEN' as const,
    skill_tags: ['Vue.js', 'D3.js', 'Chart.js'],
    budget_lower_bound: 35000,
    budget_upper_bound: 55000,
    repository_url: '',
    created_at: '2024-01-20T16:45:00Z',
    client_id: 'client-1',
    assignee_id: null,
  },
]

const mockStats = {
  totalTasks: 4,
  inProgress: 1,
  completed: 1,
  totalBudget: 240000,
}

export const CustomerDashboard: React.FC = () => {
  const { $isLoading, taskClicked, tasksLoaded } = customerDashboardModel
  const [isLoading] = useUnit([$isLoading])

  const [searchValue, setSearchValue] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, string | undefined>>({})

  React.useEffect(() => {
    // Load mock data
    tasksLoaded()
  }, [tasksLoaded])

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

  const filteredTasks = mockTasks.filter(task => {
    const matchesSearch =
      !searchValue ||
      task.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      task.description.toLowerCase().includes(searchValue.toLowerCase())

    const matchesStatus = !filters.status || task.status === filters.status

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Дашборд заказчика</h1>
          <p className="text-muted-foreground">Управляйте своими проектами и задачами</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="task-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Всего задач</p>
                <p className="text-2xl font-bold text-foreground">{mockStats.totalTasks}</p>
              </div>
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="task-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">В работе</p>
                <p className="text-2xl font-bold text-foreground">{mockStats.inProgress}</p>
              </div>
              <div className="w-12 h-12 bg-chart-yellow/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-chart-yellow" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="task-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Завершено</p>
                <p className="text-2xl font-bold text-foreground">{mockStats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-chart-green/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-chart-green" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="task-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Общий бюджет</p>
                <p className="text-2xl font-bold text-foreground">
                  ₽{mockStats.totalBudget.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-chart-purple/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-chart-purple" />
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
          <h2 className="text-xl font-semibold text-foreground">Мои задачи</h2>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
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
              <TaskCard
                key={task.task_id}
                task={task as unknown as import('@shared/ui/task-card').Task}
                onClick={(taskId: string) => {
                  console.log('Task clicked:', taskId)
                  taskClicked(taskId)
                }}
              />
            ))}
          </div>
        )}

        {filteredTasks.length === 0 && !isLoading && (
          <Card className="task-card">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Задач не найдено</h3>
              <p className="text-muted-foreground">Попробуйте изменить фильтры поиска</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

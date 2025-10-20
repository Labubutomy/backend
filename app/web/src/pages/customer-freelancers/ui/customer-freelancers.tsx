import React from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  SearchAndFilters,
} from '@shared/ui'
import { Star, Clock, DollarSign, MapPin, CheckCircle, MessageCircle, User } from 'lucide-react'

// Mock data for freelancers
const mockFreelancers = [
  {
    user_id: 'dev-1',
    display_name: 'Александр Петров',
    email: 'alex.petrov@email.com',
    rating: 4.9,
    hourly_rate: 2500,
    skill_tags: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    presence: 'ONLINE' as const,
    location: 'Москва, Россия',
    completed_tasks: 45,
    response_time: '2 часа',
    bio: 'Опытный full-stack разработчик с 5+ летним опытом. Специализируюсь на React и Node.js приложениях.',
    portfolio_url: 'https://github.com/alex-petrov',
    task_id: '1', // For which task this freelancer applied
  },
  {
    user_id: 'dev-2',
    display_name: 'Мария Сидорова',
    email: 'maria.sidorova@email.com',
    rating: 4.8,
    hourly_rate: 2200,
    skill_tags: ['Vue.js', 'Python', 'Django', 'MongoDB'],
    presence: 'ONLINE' as const,
    location: 'Санкт-Петербург, Россия',
    completed_tasks: 32,
    response_time: '1 час',
    bio: 'Frontend разработчик с глубокими знаниями Vue.js и Python backend разработки.',
    portfolio_url: 'https://github.com/maria-sidorova',
    task_id: '1',
  },
  {
    user_id: 'dev-3',
    display_name: 'Дмитрий Козлов',
    email: 'dmitry.kozlov@email.com',
    rating: 4.7,
    hourly_rate: 3000,
    skill_tags: ['React Native', 'iOS', 'Swift', 'Firebase'],
    presence: 'IDLE' as const,
    location: 'Екатеринбург, Россия',
    completed_tasks: 28,
    response_time: '4 часа',
    bio: 'Мобильный разработчик с экспертизой в iOS и React Native. Создаю качественные приложения.',
    portfolio_url: 'https://github.com/dmitry-kozlov',
    task_id: '2',
  },
  {
    user_id: 'dev-4',
    display_name: 'Анна Волкова',
    email: 'anna.volkova@email.com',
    rating: 4.9,
    hourly_rate: 2800,
    skill_tags: ['Angular', 'Java', 'Spring Boot', 'MySQL'],
    presence: 'ONLINE' as const,
    location: 'Новосибирск, Россия',
    completed_tasks: 67,
    response_time: '30 минут',
    bio: 'Senior разработчик с опытом в enterprise решениях. Специализируюсь на Angular и Java.',
    portfolio_url: 'https://github.com/anna-volkova',
    task_id: '3',
  },
]

const mockTask = {
  task_id: '1',
  title: 'Создание мобильного приложения',
  description: 'Разработка iOS приложения для управления задачами с современным дизайном',
  status: 'OPEN' as const,
  skill_tags: ['React Native', 'iOS', 'TypeScript'],
  budget_lower_bound: 50000,
  budget_upper_bound: 80000,
  repository_url: 'https://github.com/example/mobile-app',
  created_at: '2024-01-15T10:00:00Z',
  client_id: 'client-1',
  assignee_id: null,
}

export const CustomerFreelancersPage: React.FC = () => {
  const [searchValue, setSearchValue] = React.useState('')
  const [filters, setFilters] = React.useState<Record<string, string | undefined>>({})
  const [selectedTaskId, setSelectedTaskId] = React.useState('1')

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

  const handleSelectFreelancer = (freelancerId: string) => {
    console.log(`Selected freelancer ${freelancerId} for task ${selectedTaskId}`)
    // Here would be the logic to assign freelancer to task
  }

  const filteredFreelancers = mockFreelancers.filter(freelancer => {
    const matchesSearch =
      !searchValue ||
      freelancer.display_name.toLowerCase().includes(searchValue.toLowerCase()) ||
      freelancer.skill_tags.some(skill => skill.toLowerCase().includes(searchValue.toLowerCase()))

    const matchesPresence = !filters.presence || freelancer.presence === filters.presence
    const matchesTask = freelancer.task_id === selectedTaskId

    return matchesSearch && matchesPresence && matchesTask
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Выбор исполнителя</h1>
          <p className="text-muted-foreground">
            Выберите подходящего разработчика для вашей задачи
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTaskId}
            onChange={e => setSelectedTaskId(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground"
          >
            <option value="1">Создание мобильного приложения</option>
            <option value="2">Веб-сайт для стартапа</option>
            <option value="3">API для микросервисов</option>
          </select>
        </div>
      </div>

      {/* Task Info */}
      <Card className="task-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Задача: {mockTask.title}</span>
            <StatusBadge status={mockTask.status} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{mockTask.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-foreground mb-2">Навыки:</h4>
              <div className="flex flex-wrap gap-2">
                {mockTask.skill_tags.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-primary/20 text-primary rounded-md text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Бюджет:</h4>
              <p className="text-muted-foreground">
                ₽{mockTask.budget_lower_bound.toLocaleString()} - ₽
                {mockTask.budget_upper_bound.toLocaleString()}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Откликов:</h4>
              <p className="text-muted-foreground">{filteredFreelancers.length} разработчиков</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <SearchAndFilters
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Freelancers List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Откликнувшиеся разработчики</h2>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span>
              Показано {filteredFreelancers.length} из {mockFreelancers.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFreelancers.map(freelancer => (
            <Card key={freelancer.user_id} className="task-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{freelancer.display_name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{freelancer.location}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            freelancer.presence === 'ONLINE'
                              ? 'bg-green-500'
                              : freelancer.presence === 'IDLE'
                                ? 'bg-yellow-500'
                                : 'bg-gray-500'
                          }`}
                        ></span>
                        <span className="capitalize">{freelancer.presence.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-sm">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{freelancer.rating}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {freelancer.completed_tasks} задач
                    </p>
                  </div>
                </div>

                <p className="text-muted-foreground mb-4 text-sm">{freelancer.bio}</p>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-foreground mb-2 text-sm">Навыки:</h4>
                    <div className="flex flex-wrap gap-2">
                      {freelancer.skill_tags.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-accent/20 text-accent rounded-md text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">
                        ₽{freelancer.hourly_rate.toLocaleString()}/час
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">
                        Ответ: {freelancer.response_time}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button
                      onClick={() => handleSelectFreelancer(freelancer.user_id)}
                      className="flex-1 gradient-bg"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Выбрать
                    </Button>
                    <Button variant="outline" size="icon">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <a href={freelancer.portfolio_url} target="_blank" rel="noopener noreferrer">
                        <User className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredFreelancers.length === 0 && (
          <Card className="task-card">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Нет откликов</h3>
              <p className="text-muted-foreground mb-4">
                Пока никто не откликнулся на эту задачу. Попробуйте изменить фильтры или подождите.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

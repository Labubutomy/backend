import React from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  StatusBadge,
  SkillBadge,
} from '@shared/ui'
import { User, Star, Clock, DollarSign, MapPin, Edit, Save, X, Plus, Trash2 } from 'lucide-react'

// Mock data for developer profile
const mockProfile = {
  user_id: 'dev-1',
  display_name: 'Александр Петров',
  email: 'alex.petrov@email.com',
  bio: 'Опытный full-stack разработчик с 5+ летним опытом. Специализируюсь на React и Node.js приложениях. Создаю качественные и масштабируемые решения.',
  hourly_rate: 2500,
  skill_tags: [
    { skill: 'React', level: 'EXPERT' },
    { skill: 'TypeScript', level: 'EXPERT' },
    { skill: 'Node.js', level: 'ADVANCED' },
    { skill: 'PostgreSQL', level: 'ADVANCED' },
    { skill: 'Docker', level: 'INTERMEDIATE' },
  ],
  presence: 'ONLINE' as 'ONLINE' | 'IDLE' | 'OFFLINE',
  location: 'Москва, Россия',
  rating: 4.9,
  completed_tasks: 45,
  total_earned: 1250000,
  portfolio_url: 'https://github.com/alex-petrov',
  linkedin_url: 'https://linkedin.com/in/alex-petrov',
}

const mockStats = {
  tasksCompleted: 45,
  averageRating: 4.9,
  activeTasks: 2,
  totalEarned: 1250000,
}

export const FreelancerProfilePage: React.FC = () => {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editForm, setEditForm] = React.useState({
    display_name: mockProfile.display_name,
    bio: mockProfile.bio,
    hourly_rate: mockProfile.hourly_rate,
    location: mockProfile.location,
    portfolio_url: mockProfile.portfolio_url,
    linkedin_url: mockProfile.linkedin_url,
  })
  const [newSkill, setNewSkill] = React.useState({
    skill: '',
    level: 5 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
  })

  const handleSave = () => {
    console.log('Saving profile:', editForm)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditForm({
      display_name: mockProfile.display_name,
      bio: mockProfile.bio,
      hourly_rate: mockProfile.hourly_rate,
      location: mockProfile.location,
      portfolio_url: mockProfile.portfolio_url,
      linkedin_url: mockProfile.linkedin_url,
    })
    setIsEditing(false)
  }

  const handleAddSkill = () => {
    if (newSkill.skill.trim()) {
      console.log('Adding skill:', newSkill)
      setNewSkill({ skill: '', level: 5 })
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    console.log('Removing skill:', skillToRemove)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Профиль разработчика</h1>
          <p className="text-muted-foreground">Управляйте своим профилем и настройками</p>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Отмена
              </Button>
              <Button onClick={handleSave} className="gradient-bg">
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Редактировать
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card className="task-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Основная информация</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <Input
                      value={editForm.display_name}
                      onChange={e =>
                        setEditForm(prev => ({ ...prev, display_name: e.target.value }))
                      }
                      className="bg-card border-border text-lg font-semibold"
                    />
                  ) : (
                    <h2 className="text-xl font-semibold text-foreground">
                      {mockProfile.display_name}
                    </h2>
                  )}
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {isEditing ? (
                      <Input
                        value={editForm.location}
                        onChange={e => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                        className="bg-card border-border text-sm"
                        placeholder="Местоположение"
                      />
                    ) : (
                      <span>{mockProfile.location}</span>
                    )}
                    <span
                      className={`w-2 h-2 rounded-full ${
                        mockProfile.presence === 'ONLINE'
                          ? 'bg-green-500'
                          : mockProfile.presence === 'IDLE'
                            ? 'bg-yellow-500'
                            : 'bg-gray-500'
                      }`}
                    ></span>
                    <span className="capitalize">{mockProfile.presence.toLowerCase()}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">О себе</label>
                {isEditing ? (
                  <textarea
                    value={editForm.bio}
                    onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Расскажите о себе, своем опыте и специализации..."
                  />
                ) : (
                  <p className="text-muted-foreground">{mockProfile.bio}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Ставка за час (₽)
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editForm.hourly_rate}
                      onChange={e =>
                        setEditForm(prev => ({ ...prev, hourly_rate: Number(e.target.value) }))
                      }
                      className="bg-card border-border"
                    />
                  ) : (
                    <p className="text-foreground font-medium">
                      ₽{mockProfile.hourly_rate.toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Рейтинг</label>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-foreground font-medium">{mockProfile.rating}</span>
                    <span className="text-muted-foreground text-sm">
                      ({mockProfile.completed_tasks} отзывов)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="task-card">
            <CardHeader>
              <CardTitle>Навыки и экспертиза</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {mockProfile.skill_tags.map((skillTag, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <SkillBadge skill={skillTag.skill} level={5} />
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveSkill(skillTag.skill)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isEditing && (
                <div className="flex items-center space-x-2">
                  <Input
                    value={newSkill.skill}
                    onChange={e => setNewSkill(prev => ({ ...prev, skill: e.target.value }))}
                    placeholder="Новый навык"
                    className="bg-card border-border"
                  />
                  <select
                    value={newSkill.level}
                    onChange={e =>
                      setNewSkill(prev => ({
                        ...prev,
                        level: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
                      }))
                    }
                    className="px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground"
                  >
                    <option value="1">Начинающий (1)</option>
                    <option value="3">Средний (3)</option>
                    <option value="6">Продвинутый (6)</option>
                    <option value="9">Эксперт (9)</option>
                  </select>
                  <Button onClick={handleAddSkill} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links */}
          <Card className="task-card">
            <CardHeader>
              <CardTitle>Ссылки и портфолио</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  GitHub / Портфолио
                </label>
                {isEditing ? (
                  <Input
                    value={editForm.portfolio_url}
                    onChange={e =>
                      setEditForm(prev => ({ ...prev, portfolio_url: e.target.value }))
                    }
                    placeholder="https://github.com/username"
                    className="bg-card border-border"
                  />
                ) : (
                  <a
                    href={mockProfile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {mockProfile.portfolio_url}
                  </a>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">LinkedIn</label>
                {isEditing ? (
                  <Input
                    value={editForm.linkedin_url}
                    onChange={e => setEditForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/username"
                    className="bg-card border-border"
                  />
                ) : (
                  <a
                    href={mockProfile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {mockProfile.linkedin_url}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card className="task-card">
            <CardHeader>
              <CardTitle>Статистика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Завершено задач</p>
                    <p className="text-lg font-bold text-foreground">{mockStats.tasksCompleted}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-chart-green/20 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-chart-green" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Средний рейтинг</p>
                    <p className="text-lg font-bold text-foreground">{mockStats.averageRating}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-chart-yellow/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-chart-yellow" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Активных задач</p>
                    <p className="text-lg font-bold text-foreground">{mockStats.activeTasks}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-chart-purple/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-chart-purple" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Заработано</p>
                    <p className="text-lg font-bold text-foreground">
                      ₽{mockStats.totalEarned.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Presence Status */}
          <Card className="task-card">
            <CardHeader>
              <CardTitle>Статус доступности</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Текущий статус</span>
                  <StatusBadge
                    status={mockProfile.presence === 'ONLINE' ? 'IN_PROGRESS' : 'OPEN'}
                  />
                </div>
                <div className="space-y-2">
                  <Button
                    variant={mockProfile.presence === 'ONLINE' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                  >
                    Доступен для работы
                  </Button>
                  <Button
                    variant={mockProfile.presence === 'IDLE' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                  >
                    В поиске проектов
                  </Button>
                  <Button
                    variant={mockProfile.presence === 'OFFLINE' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                  >
                    Недоступен
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

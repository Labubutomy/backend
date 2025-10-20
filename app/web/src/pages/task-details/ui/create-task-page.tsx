import React from 'react'
import { useUnit } from 'effector-react'
import { createTaskModel } from '../model/create-task-model'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Wizard } from '@shared/ui'
import { ArrowLeft, Eye } from 'lucide-react'
import { routes } from '@shared/router/router'

export const CreateTaskPage: React.FC = () => {
  const { $form, $isLoading, $error, formChanged, taskCreated, errorCleared } = createTaskModel
  const [form, isLoading, error] = useUnit([$form, $isLoading, $error])

  const [currentStep, setCurrentStep] = React.useState(0)
  const [showPreview, setShowPreview] = React.useState(false)

  const steps = [
    {
      id: 'description',
      title: 'Описание задачи',
      description: 'Основная информация о проекте',
      component: (
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Название задачи *
            </label>
            <Input
              id="title"
              value={form.title}
              onChange={e => formChanged({ title: e.target.value })}
              placeholder="Краткое описание задачи"
              className="bg-card border-border"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
              Подробное описание *
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={e => formChanged({ description: e.target.value })}
              placeholder="Опишите детали задачи, требования, ожидаемый результат..."
              rows={6}
              className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      ),
      isValid: !!form.title && !!form.description,
    },
    {
      id: 'requirements',
      title: 'Требования и бюджет',
      description: 'Технические требования и финансы',
      component: (
        <div className="space-y-4">
          <div>
            <label htmlFor="skills" className="block text-sm font-medium text-foreground mb-2">
              Необходимые навыки *
            </label>
            <Input
              id="skills"
              value={form.skill_tags.join(', ')}
              onChange={e => {
                const skills = e.target.value
                  .split(',')
                  .map(s => s.trim())
                  .filter(s => s)
                formChanged({ skill_tags: skills })
              }}
              placeholder="React, TypeScript, Node.js (через запятую)"
              className="bg-card border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">Укажите навыки через запятую</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="budgetMin" className="block text-sm font-medium text-foreground mb-2">
                Минимальный бюджет (₽) *
              </label>
              <Input
                id="budgetMin"
                type="number"
                value={form.budget_lower_bound || ''}
                onChange={e => formChanged({ budget_lower_bound: Number(e.target.value) })}
                placeholder="30000"
                className="bg-card border-border"
              />
            </div>
            <div>
              <label htmlFor="budgetMax" className="block text-sm font-medium text-foreground mb-2">
                Максимальный бюджет (₽) *
              </label>
              <Input
                id="budgetMax"
                type="number"
                value={form.budget_upper_bound || ''}
                onChange={e => formChanged({ budget_upper_bound: Number(e.target.value) })}
                placeholder="50000"
                className="bg-card border-border"
              />
            </div>
          </div>
          <div>
            <label htmlFor="repository" className="block text-sm font-medium text-foreground mb-2">
              URL репозитория
            </label>
            <Input
              id="repository"
              value={form.repository_url}
              onChange={e => formChanged({ repository_url: e.target.value })}
              placeholder="https://github.com/username/project"
              className="bg-card border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Опционально: ссылка на существующий репозиторий
            </p>
          </div>
        </div>
      ),
      isValid:
        form.skill_tags.length > 0 && form.budget_lower_bound > 0 && form.budget_upper_bound > 0,
    },
    {
      id: 'preview',
      title: 'Предпросмотр и отправка',
      description: 'Проверьте данные перед созданием',
      component: (
        <div className="space-y-4">
          <Card className="task-card">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">{form.title}</h3>
              <p className="text-muted-foreground mb-4">{form.description}</p>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Навыки:</h4>
                  <div className="flex flex-wrap gap-2">
                    {form.skill_tags.map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-primary/20 text-primary rounded-md text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Бюджет:</h4>
                    <p className="text-muted-foreground">
                      ₽{form.budget_lower_bound?.toLocaleString()} - ₽
                      {form.budget_upper_bound?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Репозиторий:</h4>
                    <p className="text-muted-foreground">{form.repository_url || 'Не указан'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
      isValid: true,
    },
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = () => {
    taskCreated()
  }

  const canProceed = steps[currentStep].isValid

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => routes.customerDashboard.open()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Создание задачи</h1>
            <p className="text-muted-foreground">
              Опишите ваш проект и найдите идеального исполнителя
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Скрыть' : 'Показать'} предпросмотр
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-destructive">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => errorCleared()}
                className="text-destructive hover:text-destructive"
              >
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wizard */}
      <Wizard
        steps={steps}
        currentStep={currentStep}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onFinish={handleFinish}
        canProceed={canProceed}
        isLoading={isLoading}
      />

      {/* Preview Panel */}
      {showPreview && (
        <Card className="task-card">
          <CardHeader>
            <CardTitle>Предпросмотр задачи</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {form.title || 'Название задачи'}
                </h3>
                <p className="text-muted-foreground">{form.description || 'Описание задачи'}</p>
              </div>

              {form.skill_tags.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Навыки:</h4>
                  <div className="flex flex-wrap gap-2">
                    {form.skill_tags.map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-primary/20 text-primary rounded-md text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground mb-1">Бюджет:</h4>
                  <p className="text-muted-foreground">
                    ₽{form.budget_lower_bound?.toLocaleString() || '0'} - ₽
                    {form.budget_upper_bound?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Репозиторий:</h4>
                  <p className="text-muted-foreground">{form.repository_url || 'Не указан'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

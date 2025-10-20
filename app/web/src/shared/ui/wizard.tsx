import React from 'react'
import { cn } from '@shared/lib/utils'
import { Button } from './button'
import { Card, CardContent } from './card'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

interface WizardStep {
  id: string
  title: string
  description: string
  component: React.ReactNode
  isValid: boolean
}

interface WizardProps {
  steps: WizardStep[]
  currentStep: number
  onNext: () => void
  onPrevious: () => void
  onFinish?: () => void
  canProceed: boolean
  isLoading: boolean
}

export const Wizard: React.FC<WizardProps> = ({
  steps,
  currentStep,
  onNext,
  onPrevious,
  onFinish,
  canProceed,
  isLoading,
}) => {
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                index === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : index < currentStep
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn('w-16 h-0.5 mx-2', index < currentStep ? 'bg-accent' : 'bg-muted')}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">{steps[currentStep].component}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onPrevious} disabled={isFirstStep}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
        {isLastStep ? (
          <Button onClick={onFinish} disabled={!canProceed || isLoading} loading={isLoading}>
            Завершить
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={onNext} disabled={!canProceed}>
            Далее
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}

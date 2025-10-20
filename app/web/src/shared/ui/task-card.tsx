import React from 'react'
import { cn } from '@shared/lib/utils'
import { StatusBadge } from './status-badge'
import { SkillBadge } from './skill-badge'
import { Button } from './button'
import { DollarSign, User, Calendar } from 'lucide-react'
import type { TaskStatus } from './status-badge'

export interface Task {
  task_id: string
  title: string
  description: string
  status: TaskStatus
  skill_tags: string[]
  budget_lower_bound: number
  budget_upper_bound: number
  repository_url?: string
  created_at: string
  client_id: string
  assignee_id?: string | null
}

interface TaskCardProps {
  task: Task
  onClick?: (taskId: string) => void
  className?: string
  showActions?: boolean
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onClick,
  className,
  showActions = true,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(task.task_id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  return (
    <div
      className={cn(
        'task-card p-6 space-y-4',
        onClick && 'cursor-pointer hover:border-primary/50',
        className
      )}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">{task.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-2">
        {task.skill_tags.map((skill, index) => (
          <SkillBadge key={index} skill={skill} level={5} />
        ))}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            ₽{task.budget_lower_bound.toLocaleString()} - ₽
            {task.budget_upper_bound.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">{formatDate(task.created_at)}</span>
        </div>
      </div>

      {/* Repository Link */}
      {task.repository_url && (
        <div className="flex items-center space-x-2 text-sm">
          <User className="w-4 h-4 text-primary" />
          <a
            href={task.repository_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate"
            onClick={e => e.stopPropagation()}
          >
            {task.repository_url}
          </a>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex justify-end space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              handleClick()
            }}
          >
            Подробнее
          </Button>
        </div>
      )}
    </div>
  )
}

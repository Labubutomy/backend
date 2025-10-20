import React from 'react'
import { cn } from '@shared/lib/utils'

export type TaskStatus =
  | 'OPEN'
  | 'AI_ANALYSIS'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'COMPLETED'
  | 'CANCELLED'

interface StatusBadgeProps {
  status: TaskStatus
  className?: string
}

const statusConfig = {
  OPEN: {
    label: 'Открыта',
    className: 'status-ai',
    icon: '🔍',
  },
  AI_ANALYSIS: {
    label: 'AI Analysis',
    className: 'status-ai',
    icon: '🤖',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'status-progress',
    icon: '⚡',
  },
  REVIEW: {
    label: 'Review',
    className: 'status-review',
    icon: '👀',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'status-completed',
    icon: '✅',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'status-cancelled',
    icon: '❌',
  },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status]

  return (
    <span className={cn('status-badge', config.className, className)}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  )
}

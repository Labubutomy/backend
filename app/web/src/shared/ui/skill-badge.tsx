import React from 'react'
import { cn } from '@shared/lib/utils'

export type SkillLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

interface SkillBadgeProps {
  skill: string
  level: SkillLevel
  className?: string
}

const getSkillLevelConfig = (level: SkillLevel) => {
  if (level <= 3) {
    return {
      label: 'Beginner',
      className: 'skill-beginner',
    }
  } else if (level <= 6) {
    return {
      label: 'Intermediate',
      className: 'skill-intermediate',
    }
  } else if (level <= 8) {
    return {
      label: 'Advanced',
      className: 'skill-advanced',
    }
  } else {
    return {
      label: 'Expert',
      className: 'skill-expert',
    }
  }
}

export const SkillBadge: React.FC<SkillBadgeProps> = ({ skill, level, className }) => {
  const levelConfig = getSkillLevelConfig(level)

  return (
    <span className={cn('skill-badge', levelConfig.className, className)}>
      <span className="font-medium">{skill}</span>
      <span className="ml-1 text-xs opacity-75">({level}/10)</span>
    </span>
  )
}

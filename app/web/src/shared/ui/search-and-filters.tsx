import React from 'react'
import { cn } from '@shared/lib/utils'
import { Input } from './input'
import { Button } from './button'
import { Search, X } from 'lucide-react'

interface SearchAndFiltersProps {
  searchValue: string
  onSearchChange: (value: string) => void
  filters: Record<string, string | undefined>
  onFilterChange: (key: string, value: string | undefined) => void
  onClearFilters: () => void
  className?: string
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchValue,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  className,
}) => {
  const hasActiveFilters = Object.values(filters).some(
    value => value !== undefined && value !== '' && value !== null
  )

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search tasks..."
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.status || ''}
          onChange={e => onFilterChange('status', e.target.value || undefined)}
          className="px-3 py-2 bg-card border border-border rounded-md text-sm"
        >
          <option value="">All Statuses</option>
          <option value="AI_ANALYSIS">AI Analysis</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REVIEW">Review</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={filters.priority || ''}
          onChange={e => onFilterChange('priority', e.target.value || undefined)}
          className="px-3 py-2 bg-card border border-border rounded-md text-sm"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <select
          value={filters.budget || ''}
          onChange={e => onFilterChange('budget', e.target.value || undefined)}
          className="px-3 py-2 bg-card border border-border rounded-md text-sm"
        >
          <option value="">All Budgets</option>
          <option value="0-100">$0 - $100</option>
          <option value="100-500">$100 - $500</option>
          <option value="500-1000">$500 - $1,000</option>
          <option value="1000+">$1,000+</option>
        </select>

        <select
          value={filters.skill || ''}
          onChange={e => onFilterChange('skill', e.target.value || undefined)}
          className="px-3 py-2 bg-card border border-border rounded-md text-sm"
        >
          <option value="">All Skills</option>
          <option value="react">React</option>
          <option value="nodejs">Node.js</option>
          <option value="python">Python</option>
          <option value="typescript">TypeScript</option>
          <option value="docker">Docker</option>
        </select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}

'use client'

import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterPill {
  id: string
  label: string
  value: string
  active: boolean
}

interface FilterBarProps {
  filters: FilterPill[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export function FilterBar({ filters, onToggle, onRemove }: FilterBarProps) {
  const activeFilters = filters.filter((f) => f.active)

  return (
    <div className="flex items-center gap-2">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onToggle(filter.id)}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors',
            filter.active
              ? 'border-dash-red/30 bg-dash-red-light text-dash-red'
              : 'border-dash-border text-dash-text-secondary hover:border-dash-text-muted hover:text-dash-text'
          )}
        >
          <span>{filter.label}: {filter.value}</span>
          {filter.active && (
            <X
              size={12}
              className="text-dash-red/70 hover:text-dash-red"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(filter.id)
              }}
            />
          )}
        </button>
      ))}
      <button className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-dash-text-muted hover:text-dash-text-secondary">
        <Plus size={12} />
        Filter
      </button>
    </div>
  )
}

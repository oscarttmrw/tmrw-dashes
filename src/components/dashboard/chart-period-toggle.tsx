'use client'

import { cn } from '@/lib/utils'

export type PeriodOption = {
  label: string
  value: string
}

interface ChartPeriodToggleProps {
  options: PeriodOption[]
  selected: string
  onChange: (value: string) => void
}

export function ChartPeriodToggle({ options, selected, onChange }: ChartPeriodToggleProps) {
  return (
    <div className="inline-flex flex-wrap items-center rounded-lg border border-dash-border bg-dash-surface-alt p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-1.5 font-sans text-[11px] font-semibold transition-all duration-150',
            'min-h-[32px] md:min-h-0 md:py-1',
            selected === opt.value
              ? 'bg-dash-red text-white shadow-sm'
              : 'text-dash-text-secondary hover:bg-white hover:text-dash-text hover:shadow-sm'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

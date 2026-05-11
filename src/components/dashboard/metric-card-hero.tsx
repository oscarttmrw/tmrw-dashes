'use client'

import { cn } from '@/lib/utils'
import { StatusDot } from './status-dot'
import { TrendIndicator } from './trend-indicator'
import { Sparkline } from './sparkline'
import type { Status } from '@/lib/types'

interface MetricCardHeroProps {
  label: string
  value: string | number | null
  target?: string | null
  status: Status
  trend?: number | null
  sparkline?: number[]
  direction?: 'higher-better' | 'lower-better'
  building?: boolean
  className?: string
}

export function MetricCardHero({
  label,
  value,
  target,
  status,
  trend,
  sparkline,
  direction = 'higher-better',
  building = false,
  className,
}: MetricCardHeroProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dash-border bg-dash-surface p-5 border-l-[3px] border-l-dash-red',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          {trend !== undefined && trend !== null && (
            <TrendIndicator value={trend} direction={direction} />
          )}
        </div>
      </div>

      <div className="mt-2">
        {building ? (
          <p className="font-sans text-sm italic text-dash-text-muted">
            Building measurement
          </p>
        ) : (
          <p className="font-mono text-[32px] font-semibold tracking-[-0.02em] text-dash-text">
            {value ?? 'TBC'}
          </p>
        )}
      </div>

      {target && (
        <p className="mt-1 font-sans text-xs text-dash-text-muted">
          Target: {target}
        </p>
      )}

      {sparkline && sparkline.length > 1 && (
        <div className="mt-3">
          <Sparkline data={sparkline} />
        </div>
      )}
    </div>
  )
}

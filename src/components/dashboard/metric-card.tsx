'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StatusDot } from './status-dot'
import { TrendIndicator } from './trend-indicator'
import { Sparkline } from './sparkline'
import { useDashboardData } from '@/lib/context/data-context'
import type { Status } from '@/lib/types'

interface MetricCardProps {
  label: string
  value: string | number | null
  target?: string | null
  status: Status
  trend?: number | null
  sparkline?: number[]
  direction?: 'higher-better' | 'lower-better'
  format?: 'text' | 'currency' | 'percentage' | 'number'
  building?: boolean
  onClick?: () => void
  className?: string
}

export function MetricCard({
  label,
  value,
  target,
  status,
  trend,
  sparkline,
  direction = 'higher-better',
  building = false,
  onClick,
  className,
}: MetricCardProps) {
  const { dataMode } = useDashboardData()

  return (
    <div
      onClick={onClick}
      data-metric-card
      className={cn(
        'rounded-lg border border-dash-border bg-dash-surface p-3 md:p-5',
        'transition-all duration-150',
        onClick && 'cursor-pointer hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span data-metric-label className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary md:text-[11px]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          {trend !== undefined && trend !== null && (
            <TrendIndicator value={trend} direction={direction} />
          )}
        </div>
      </div>

      <div className="mt-1 md:mt-2">
        {building ? (
          <>
            <p className="font-sans text-sm italic text-dash-text-muted">
              Building measurement
            </p>
            {dataMode === 'actual' && (
              <Link href="/admin/registry" className="mt-1 inline-block text-[10px] text-dash-red hover:underline">
                Why is this TBD? &rarr;
              </Link>
            )}
          </>
        ) : (
          <p data-metric-value className="font-mono text-lg font-bold tracking-[-0.01em] text-dash-text md:text-2xl">
            {value ?? 'TBC'}
          </p>
        )}
      </div>

      {target && (
        <p className="mt-0.5 font-sans text-[10px] text-dash-text-muted md:mt-1 md:text-xs">
          Target: {target}
        </p>
      )}

      {sparkline && sparkline.length > 1 && (
        <div className="mt-1.5 md:mt-3">
          <Sparkline data={sparkline} height={24} className="md:hidden" />
          <Sparkline data={sparkline} className="hidden md:block" />
        </div>
      )}
    </div>
  )
}

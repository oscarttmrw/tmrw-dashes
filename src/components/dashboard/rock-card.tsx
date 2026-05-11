'use client'

import { cn } from '@/lib/utils'
import { StatusDot } from './status-dot'
import { Sparkline } from './sparkline'
import type { Status } from '@/lib/types'

interface RockMetricDisplay {
  label: string
  value: string
  target: string
  status: Status
  sparkData?: number[]
}

interface RockCardProps {
  number: number
  title: string
  owner: string
  status: string
  metrics: RockMetricDisplay[]
}

const rockStatusColors: Record<string, string> = {
  'on-track': 'text-status-green',
  'off-track': 'text-status-red',
  'at-risk': 'text-status-amber',
  'complete': 'text-status-green',
  'building': 'text-status-grey',
}

export function RockCard({ number, title, owner, status, metrics }: RockCardProps) {
  return (
    <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
              Rock {number}
            </span>
            <span className={cn(
              'font-sans text-[11px] font-medium uppercase tracking-[0.05em]',
              rockStatusColors[status] || 'text-status-grey'
            )}>
              {status.replace('-', ' ')}
            </span>
          </div>
          <h4 className="mt-1 font-sans text-sm font-medium text-dash-text">{title}</h4>
        </div>
        <span className="font-sans text-[11px] text-dash-text-muted">Owner: {owner}</span>
      </div>

      <div className="mt-3 space-y-2">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-dash-text-secondary">{m.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-dash-text">{m.value}</span>
                <span className="text-dash-text-muted">/ {m.target}</span>
                <StatusDot status={m.status} size="sm" />
              </div>
            </div>
            {m.sparkData && m.sparkData.length >= 2 && (
              <div className="mt-1">
                <Sparkline data={m.sparkData} color={m.status === 'red' ? '#DC2626' : m.status === 'amber' ? '#D97706' : '#16A34A'} width={200} height={18} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

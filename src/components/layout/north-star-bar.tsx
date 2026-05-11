'use client'

import { Star } from 'lucide-react'

export function NorthStarBar() {
  return (
    <div className="border-b border-dash-border bg-dash-surface/50 px-6 py-3">
      <div className="mx-auto flex max-w-[1440px] gap-8">
        <NorthStarMetric
          label="BETTER TOMORROWS CREATED"
          value="TBC"
          subtitle="Active members x days active"
        />
        <div className="w-px bg-dash-border" />
        <NorthStarMetric
          label="COHORT RETENTION POST-2ND"
          value="TBC"
          subtitle="Target: 75%+"
        />
      </div>
    </div>
  )
}

function NorthStarMetric({
  label,
  value,
  subtitle,
}: {
  label: string
  value: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-dash-red-light">
        <Star size={14} className="text-dash-red" />
      </div>
      <div className="border-l-[3px] border-dash-red pl-3">
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-semibold tracking-[-0.02em] text-dash-text">
            {value}
          </span>
          <span className="font-sans text-xs text-dash-text-muted">{subtitle}</span>
        </div>
      </div>
    </div>
  )
}

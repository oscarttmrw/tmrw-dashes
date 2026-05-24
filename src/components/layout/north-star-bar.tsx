'use client'

import { useMemo } from 'react'
import { Star } from 'lucide-react'
import { useDashboardData } from '@/lib/context/data-context'

const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return isNaN(n) ? 0 : n
}

const fmt = (n: number): string => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

export function NorthStarBar() {
  const { operational_data } = useDashboardData()

  // Latest total_casebook snapshot. The xlsx ships with trailing future-date
  // rows whose value cells are blank — skip those so the snapshot picks the
  // most recent date that actually has a casebook number.
  const totalCasebook = useMemo(() => {
    const withValue = operational_data.filter(r =>
      r.total_casebook !== null && r.total_casebook !== undefined && num(r.total_casebook) > 0
    )
    if (!withValue.length) return null
    const sorted = [...withValue].sort((a, b) =>
      String(b.date ?? '').localeCompare(String(a.date ?? ''))
    )
    return num(sorted[0].total_casebook)
  }, [operational_data])

  // Sum of pods dispatched in calendar year 2026.
  const podsDispatched = useMemo(() => {
    const ytd = operational_data.filter(r => String(r.date ?? '').startsWith('2026'))
    if (!ytd.length) return null
    return ytd.reduce((s, r) => s + num(r.pod_dispatched), 0)
  }, [operational_data])

  return (
    <div className="border-b border-dash-border bg-dash-surface/50 px-6 py-3">
      <div className="mx-auto flex max-w-[1440px] gap-8">
        <NorthStarMetric
          label="TOTAL CASEBOOK"
          value={totalCasebook === null ? '—' : fmt(totalCasebook)}
          subtitle="Cumulative customers (all time)"
        />
        <div className="w-px bg-dash-border" />
        <NorthStarMetric
          label="PODS DISPATCHED"
          value={podsDispatched === null ? '—' : fmt(podsDispatched)}
          subtitle="2026"
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
        <span className="font-ui text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary">
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

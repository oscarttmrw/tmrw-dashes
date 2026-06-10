'use client'

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { CountUp } from './count-up'
import { Spark } from './spark'
import { LiftCard } from './motion'

/* ─── Delta chip ──────────────────────────────────────────────────── */

export function DeltaChip({
  delta,
  direction = 'higher-better',
  suffix = 'vs prev',
}: {
  delta: number | null
  direction?: 'higher-better' | 'lower-better'
  suffix?: string
}) {
  if (delta === null || !isFinite(delta)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-dash-surface-alt px-2 py-0.5 font-mono text-[10px] font-medium text-dash-text-muted">
        <Minus size={10} /> n/a
      </span>
    )
  }
  const up = delta > 0
  const flat = Math.abs(delta) < 0.5
  const good = flat ? null : direction === 'higher-better' ? up : !up
  const tone = flat
    ? 'bg-dash-surface-alt text-dash-text-secondary'
    : good
      ? 'bg-status-green-light text-status-green'
      : 'bg-status-red-light text-status-red'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums ${tone}`}
      title={suffix}
    >
      {flat ? <Minus size={10} /> : up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(delta).toFixed(Math.abs(delta) < 10 ? 1 : 0)}%
    </span>
  )
}

/* ─── Standard KPI tile ───────────────────────────────────────────── */

export interface KpiProps {
  label: string
  value: number
  format?: (v: number) => string
  delta?: number | null
  direction?: 'higher-better' | 'lower-better'
  spark?: number[]
  sparkColor?: string
  sublabel?: string
}

export function KpiTile({
  label,
  value,
  format,
  delta,
  direction = 'higher-better',
  spark,
  sparkColor = '#8B0000',
  sublabel,
}: KpiProps) {
  return (
    <LiftCard accent className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-ui text-[10px] font-medium uppercase tracking-[0.1em] text-dash-text-secondary">
          {label}
        </p>
        {delta !== undefined && <DeltaChip delta={delta} direction={direction} />}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <CountUp
          value={value}
          format={format}
          className="font-mono text-[26px] font-bold leading-none tabular-nums text-dash-text"
        />
        {spark && spark.length > 1 && <Spark values={spark} width={86} height={30} color={sparkColor} />}
      </div>
      {sublabel && (
        <p className="mt-2.5 border-t border-dash-border-subtle pt-2 text-[11px] leading-snug text-dash-text-muted">
          {sublabel}
        </p>
      )}
    </LiftCard>
  )
}

/* ─── Oversized hero KPI (no card, editorial) ─────────────────────── */

export function HeroKpi({
  label,
  value,
  format,
  delta,
  direction = 'higher-better',
  spark,
  sparkColor = '#E61317',
}: KpiProps) {
  return (
    <div className="flex flex-col">
      <p className="font-ui text-[11px] font-medium uppercase tracking-[0.14em] text-dash-text-secondary">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-3">
        <CountUp
          value={value}
          format={format}
          className="font-mono text-4xl font-bold leading-none tabular-nums text-dash-text md:text-5xl"
        />
        {delta !== undefined && <DeltaChip delta={delta} direction={direction} />}
      </div>
      {spark && spark.length > 1 && (
        <div className="mt-3">
          <Spark values={spark} width={180} height={34} color={sparkColor} />
        </div>
      )}
    </div>
  )
}

/* ─── Tiny stat (labelled number, no card) ───────────────────────── */

export function MiniStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div title={hint}>
      <p className="font-mono text-lg font-bold tabular-nums text-dash-text">{value}</p>
      <p className="mt-0.5 font-ui text-[10px] uppercase tracking-[0.08em] text-dash-text-muted">{label}</p>
    </div>
  )
}

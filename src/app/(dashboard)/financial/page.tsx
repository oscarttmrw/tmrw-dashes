'use client'

import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import Link from 'next/link'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { StatusDot } from '@/components/dashboard/status-dot'
import { TrendIndicator } from '@/components/dashboard/trend-indicator'
import { TileChart } from '@/components/dashboard/tile-chart'
import { useDashboardData } from '@/lib/context/data-context'
import { cn } from '@/lib/utils'
import type { Status } from '@/lib/types'
import { Lock, Star } from 'lucide-react'

/* ─── Tile primitives (mirrors home-dashboard styling) ─────────────── */

interface TileProps {
  label: string
  value: string
  target?: string
  delta?: { value: number; period?: string } | null
  status: Status
  direction?: 'higher-better' | 'lower-better'
  href?: string
  chart?: React.ReactNode
  prominent?: boolean
}

function MetricTile({ label, value, target, delta, status, direction = 'higher-better', href, chart, prominent }: TileProps) {
  const tileClass = cn(
    'flex h-full flex-col rounded-lg border bg-dash-surface transition-all duration-150',
    prominent
      ? 'border-dash-border-strong p-4 md:p-5 shadow-sm'
      : 'border-dash-border p-3 md:p-4',
    href && 'hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px'
  )
  const inner = (
    <div className={tileClass}>
      <div className="flex items-start justify-between gap-2">
        <span className={cn(
          'font-ui font-medium uppercase tracking-[0.05em] text-dash-text-secondary',
          prominent ? 'text-[11px] md:text-[12px]' : 'text-[10px] md:text-[11px]'
        )}>
          {label}
        </span>
        <StatusDot status={status} />
      </div>
      <div className="mt-1 md:mt-2 flex items-baseline gap-2">
        <span className={cn(
          'font-mono font-bold tracking-[-0.01em] text-dash-text',
          prominent ? 'text-2xl md:text-3xl' : 'text-lg md:text-2xl'
        )}>
          {value}
        </span>
        {delta !== null && delta !== undefined && (
          <TrendIndicator value={delta.value} direction={direction} />
        )}
      </div>
      {chart && <div className="mt-3 mb-2">{chart}</div>}
      <div className="mt-auto pt-3 flex items-center justify-between text-[10px] text-dash-text-muted md:text-[11px]">
        {target ? <span>{target}</span> : <span />}
        {delta?.period && <span className="font-sans">{delta.period}</span>}
      </div>
    </div>
  )
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner
}

function LockedTile({ label, reason, target }: { label: string; reason: string; target?: string }) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-dashed border-dash-border bg-dash-surface/40 p-3 md:p-4 opacity-75">
      <div className="flex items-start justify-between gap-2">
        <span className="font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-muted md:text-[11px]">
          {label}
        </span>
        <Lock size={11} className="text-dash-text-muted" />
      </div>
      <div className="mt-1 md:mt-2">
        <span className="font-mono text-base text-dash-text-muted md:text-lg">—</span>
      </div>
      <p className="mt-auto pt-1.5 font-sans text-[10px] italic text-dash-text-muted md:text-[11px]">
        {reason}
      </p>
      {target && (
        <p className="font-sans text-[10px] text-dash-text-muted/80 md:text-[11px]">{target}</p>
      )}
    </div>
  )
}

function LockedCard({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-dash-border bg-dash-surface/40 p-6 text-center opacity-80">
      <Lock size={16} className="mb-2 text-dash-text-muted" />
      <p className="font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">{title}</p>
      <p className="mt-1 max-w-md font-sans text-[11px] italic text-dash-text-muted">{reason}</p>
    </div>
  )
}

function NarrativeSection({
  number, question, subtitle, right, children,
}: {
  number: number
  question: string
  subtitle: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-5 md:mb-7 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-start gap-4 md:gap-6">
            <span className="font-display text-4xl leading-none text-dash-text md:text-6xl">
              {String(number).padStart(2, '0')}
            </span>
            <h2 className="font-display uppercase tracking-tight text-dash-text text-2xl leading-none pt-[0.2rem] md:text-4xl md:pt-[0.4rem]">
              {question}
            </h2>
          </div>
          <p className="mt-2 ml-[3.5rem] md:ml-[5.5rem] font-ui text-[11px] uppercase tracking-[0.12em] text-dash-text-muted md:text-xs">
            {subtitle}
          </p>
        </div>
        {right && <div>{right}</div>}
      </div>
      {children}
    </section>
  )
}

/* ─── Formatters / helpers ────────────────────────────────────────── */

const fmtCurrency = (n: number, opts: { compact?: boolean; digits?: number } = {}) => {
  if (opts.compact && Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`
  }
  const digits = opts.digits ?? 0
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return isNaN(n) ? 0 : n
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/* ─── Page ────────────────────────────────────────────────────────── */

const RECURRING_REASONS = new Set(['subscription_cycle', 'subscription_update', 'subscription'])
const JOINING_REASONS = new Set(['subscription_create', 'manual'])

export default function FinancialPage() {
  const { stripe, plan_targets, loading, error, refresh } = useDashboardData()
  const [showTable, setShowTable] = useState(false)

  // "Today" anchors the MTD / projection logic. Use the most recent invoice
  // date in the data when available, else the system clock.
  const today = useMemo(() => {
    const maxTs = stripe.reduce((m, r) => {
      const t = new Date(String(r.created ?? '')).getTime()
      return isNaN(t) ? m : Math.max(m, t)
    }, 0)
    return maxTs > 0 ? new Date(maxTs) : new Date()
  }, [stripe])

  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const dim = daysInMonth(today)
  const dayOfMonth = today.getDate()

  /* ── Plan target for the current month ── */
  const currentPlanTarget = useMemo(() => {
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    return plan_targets.find(p => typeof p.month === 'string' && p.month.startsWith(ym)) ?? null
  }, [plan_targets, today])
  const planThisMonth = currentPlanTarget ? num(currentPlanTarget.gross_revenue_target) : null

  /* ── Group invoices by YYYY-MM ── */
  const byMonth = useMemo(() => {
    const map = new Map<string, { actual: number; txns: number; recurring: number; joining: number }>()
    for (const r of stripe) {
      const t = new Date(String(r.created ?? '')).getTime()
      if (isNaN(t)) continue
      const d = new Date(t)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const amt = num(r.amount_paid) / 100
      const reason = String(r.billing_reason ?? '').toLowerCase()
      const entry = map.get(key) ?? { actual: 0, txns: 0, recurring: 0, joining: 0 }
      entry.actual += amt
      entry.txns += 1
      if (RECURRING_REASONS.has(reason)) entry.recurring += amt
      else if (JOINING_REASONS.has(reason) || reason === '') entry.joining += amt
      map.set(key, entry)
    }
    return map
  }, [stripe])

  const monthlyRows = useMemo(() => {
    const keys = Array.from(byMonth.keys()).sort()
    return keys.map(k => {
      const [y, m] = k.split('-')
      const data = byMonth.get(k)!
      const planRow = plan_targets.find(p => typeof p.month === 'string' && p.month.startsWith(k))
      const plan = planRow ? num(planRow.gross_revenue_target) : null
      return {
        key: k,
        m: MONTH_LABELS[parseInt(m, 10) - 1],
        year: parseInt(y, 10),
        actual: data.actual,
        txns: data.txns,
        recurring: data.recurring,
        joining: data.joining,
        plan,
        aov: data.txns > 0 ? data.actual / data.txns : 0,
        recurringPct: data.actual > 0 ? data.recurring / data.actual : 0,
      }
    })
  }, [byMonth, plan_targets])

  /* ── This month: MTD figures ── */
  const mtd = useMemo(() => {
    let actual = 0, txns = 0, recurring = 0, joining = 0
    for (const r of stripe) {
      const t = new Date(String(r.created ?? '')).getTime()
      if (isNaN(t) || t < monthStart.getTime() || t > monthEnd.getTime()) continue
      const amt = num(r.amount_paid) / 100
      const reason = String(r.billing_reason ?? '').toLowerCase()
      actual += amt
      txns += 1
      if (RECURRING_REASONS.has(reason)) recurring += amt
      else joining += amt
    }
    return { actual, txns, recurring, joining }
  }, [stripe, monthStart, monthEnd])

  // Run-rate projection: MTD × (days in month / day-of-month)
  const projectedMonthEnd = dayOfMonth > 0 ? (mtd.actual / dayOfMonth) * dim : 0
  const gapToPlan = planThisMonth ? planThisMonth - projectedMonthEnd : null
  const daysRemaining = dim - dayOfMonth
  const requiredRunRate = gapToPlan !== null && daysRemaining > 0 ? Math.max(0, gapToPlan / daysRemaining) : null
  const mtdAov = mtd.txns > 0 ? mtd.actual / mtd.txns : 0

  /* ── YTD vs Plan ── */
  const yearStart = new Date(today.getFullYear(), 0, 1)
  const ytdActual = useMemo(() =>
    stripe.reduce((s, r) => {
      const t = new Date(String(r.created ?? '')).getTime()
      if (isNaN(t) || t < yearStart.getTime() || t > today.getTime()) return s
      return s + num(r.amount_paid) / 100
    }, 0)
  , [stripe, yearStart, today])

  const ytdPlan = useMemo(() => {
    const yPrefix = String(today.getFullYear())
    return plan_targets
      .filter(p => typeof p.month === 'string' && p.month.startsWith(yPrefix))
      .reduce((s, p) => {
        const mDate = new Date(String(p.month))
        if (mDate.getTime() <= today.getTime()) return s + num(p.gross_revenue_target)
        return s
      }, 0)
  }, [plan_targets, today])

  /* ── §05 Cumulative MTD overlay: prior months + current month ── */
  const cumulativeOverlay = useMemo(() => {
    const keys = Array.from(byMonth.keys()).sort().slice(-6)
    const series: Array<{ key: string; m: string; isCurrent: boolean; data: { day: number; value: number }[] }> = []
    for (const k of keys) {
      const [y, mIdx] = k.split('-').map(Number)
      const start = new Date(y, mIdx - 1, 1)
      const dimK = new Date(y, mIdx, 0).getDate()
      const isCurrent = k === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      const dailyTotals = new Array(dimK).fill(0) as number[]
      for (const r of stripe) {
        const t = new Date(String(r.created ?? '')).getTime()
        if (isNaN(t) || t < start.getTime() || t > new Date(y, mIdx - 1, dimK, 23, 59, 59).getTime()) continue
        const day = new Date(t).getDate()
        dailyTotals[day - 1] += num(r.amount_paid) / 100
      }
      const cap = isCurrent ? dayOfMonth : dimK
      let running = 0
      const data: { day: number; value: number }[] = []
      for (let d = 1; d <= cap; d++) {
        running += dailyTotals[d - 1]
        data.push({ day: d, value: running })
      }
      series.push({ key: k, m: MONTH_LABELS[mIdx - 1], isCurrent, data })
    }
    return series
  }, [byMonth, stripe, today, dayOfMonth])

  const cumOverlayCombined = useMemo(() => {
    const maxDay = cumulativeOverlay.reduce((m, s) => Math.max(m, s.data.length), 0)
    const out: Record<string, number | null>[] = []
    for (let d = 1; d <= maxDay; d++) {
      const row: Record<string, number | null> = { day: d }
      for (const s of cumulativeOverlay) {
        const point = s.data.find(p => p.day === d)
        row[s.key] = point ? point.value : null
      }
      out.push(row)
    }
    return out
  }, [cumulativeOverlay])

  /* ── §08 Actual vs Forecast ── */
  const actualVsForecast = useMemo(() => {
    return monthlyRows.map(r => ({ m: r.m, actual: r.actual, forecast: null as number | null }))
  }, [monthlyRows])

  const sparkAov = monthlyRows.map(r => ({ date: r.m, value: r.aov }))

  const projectionStatus: Status = planThisMonth === null
    ? 'grey'
    : projectedMonthEnd >= planThisMonth ? 'green'
    : projectedMonthEnd >= planThisMonth * 0.85 ? 'amber'
    : 'red'

  const monthlyChartData = monthlyRows.map(r => ({
    m: r.m,
    actual: r.actual,
    plan: r.plan ?? null,
  }))

  return (
    <div className="space-y-8 md:space-y-12">
      <Breadcrumb items={[{ label: 'Financial' }, { label: 'Summary' }]} />

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-status-red/30 bg-status-red/5 px-4 py-3">
          <p className="font-sans text-sm text-status-red">Could not load financial data: {error}</p>
          <button onClick={() => refresh()} className="ml-4 rounded border border-status-red/40 px-3 py-1 font-sans text-xs text-status-red hover:bg-status-red/10">Retry</button>
        </div>
      )}
      {loading && !error && (
        <div className="rounded-lg border border-dash-border bg-dash-bg/60 px-4 py-3">
          <p className="font-sans text-sm text-dash-text-muted">Loading latest data…</p>
        </div>
      )}

      {/* ────────────── HEADER STRIP — north-star tiles ────────────── */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <div className="flex items-center gap-4 rounded-lg border border-dash-border bg-dash-surface p-4 shadow-sm md:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dash-red/10 text-dash-red">
            <Star size={18} />
          </div>
          <div className="flex-1">
            <div className="font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
              Projected Month-End ({MONTH_LABELS[today.getMonth()]})
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-dash-text md:text-3xl">
                {fmtCurrency(projectedMonthEnd, { compact: true })}
              </span>
              {planThisMonth !== null && planThisMonth > 0 && (
                <span className="font-sans text-xs text-dash-text-muted">
                  vs plan {fmtCurrency(planThisMonth, { compact: true })} ·{' '}
                  {Math.round((projectedMonthEnd / planThisMonth) * 100)}%
                </span>
              )}
            </div>
          </div>
          <StatusDot status={projectionStatus} />
        </div>
        <LockedCard
          title="Revenue Capture Rate"
          reason="Requires list-price book to compute gross-at-list. Pending pricing data."
        />
      </section>

      {/* ────────────── 01 PLAN VS ACTUAL ────────────── */}
      <NarrativeSection number={1} question="Plan vs Actual" subtitle="Will we hit this month?">
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
          <MetricTile
            prominent
            label="Month-End Projection"
            value={fmtCurrency(projectedMonthEnd, { compact: true })}
            target={planThisMonth ? `Plan: ${fmtCurrency(planThisMonth, { compact: true })} · ${Math.round((projectedMonthEnd / planThisMonth) * 100)}%` : 'No plan set'}
            status={projectionStatus}
            delta={null}
          />
          <MetricTile
            prominent
            label="Gap to Plan"
            value={gapToPlan === null ? '—' : fmtCurrency(Math.abs(gapToPlan), { compact: true })}
            target={`${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`}
            status={gapToPlan === null ? 'grey' : gapToPlan <= 0 ? 'green' : gapToPlan <= (planThisMonth ?? 0) * 0.15 ? 'amber' : 'red'}
            direction="lower-better"
            delta={null}
          />
          <MetricTile
            prominent
            label="Required Run Rate"
            value={requiredRunRate === null ? '—' : fmtCurrency(requiredRunRate)}
            target="Per day to close gap"
            status={requiredRunRate === null ? 'grey' : 'amber'}
            delta={null}
          />
          <MetricTile
            prominent
            label="YTD vs Plan"
            value={ytdPlan > 0 ? `${Math.round((ytdActual / ytdPlan) * 100)}%` : '—'}
            target={ytdPlan > 0 ? `${fmtCurrency(ytdActual, { compact: true })} of ${fmtCurrency(ytdPlan, { compact: true })}` : 'No YTD plan'}
            status={ytdPlan === 0 ? 'grey' : ytdActual >= ytdPlan ? 'green' : ytdActual >= ytdPlan * 0.85 ? 'amber' : 'red'}
            delta={null}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          <LockedCard
            title="Variance Waterfall"
            reason="Joining/recurring split is buildable today; discount-leakage + refunds segments need list-price + Stripe refunds data."
          />
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
              Monthly Plan vs Actual
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer>
                <ComposedChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EFEDE8" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#737373' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v) || 0, { compact: true })} />
                  <Bar dataKey="actual" fill="#E61317" name="Actual" />
                  <Line type="monotone" dataKey="plan" stroke="#1A1A1A" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: '#1A1A1A' }} name="Plan" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </NarrativeSection>

      {/* ────────────── 02 REVENUE HEADLINES ────────────── */}
      <NarrativeSection number={2} question="Revenue Headlines" subtitle="What's flowing right now">
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
          <MetricTile
            label="Actual Revenue (MTD)"
            value={fmtCurrency(mtd.actual, { compact: true })}
            target={`${MONTH_LABELS[today.getMonth()]}, day ${dayOfMonth} of ${dim}`}
            status={mtd.actual > 0 ? 'green' : 'grey'}
            delta={null}
          />
          <LockedTile label="Gross at List (MTD)" reason="Pending list-price book — unlocks capture rate." />
          <MetricTile
            label="Avg Order Value"
            value={mtdAov > 0 ? fmtCurrency(mtdAov) : '—'}
            target="Target: $150+"
            status={mtdAov >= 150 ? 'green' : mtdAov > 0 ? 'amber' : 'grey'}
            delta={null}
            chart={<TileChart data={sparkAov} variant="line" formatValue={(n) => fmtCurrency(n)} />}
          />
          <LockedTile label="Declined Rate" reason="Stripe Invoices export carries no failure status. Needs Charges export." />
        </div>
      </NarrativeSection>

      {/* ────────────── 03 REVENUE BY MONTH ────────────── */}
      <NarrativeSection number={3} question="Revenue by Month" subtitle="Gross · Actual · Net">
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
              Actual Revenue (Charged)
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer>
                <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EFEDE8" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#737373' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v) || 0, { compact: true })} />
                  <Bar dataKey="actual" fill="#1A1A1A" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 font-sans text-[11px] italic text-dash-text-muted">
              Gross (list) and Net (after refunds) bars locked — pending list-price book and Stripe refunds data.
            </p>
          </div>
          <LockedCard
            title="By Product — Core · Pods · Add-ons"
            reason="Stripe product field populated, but Core/Pods/Add-ons taxonomy needs a lookup table."
          />
        </div>
      </NarrativeSection>

      {/* ────────────── 04 DISCOUNT DISCIPLINE ────────────── */}
      <NarrativeSection number={4} question="Discount Discipline" subtitle="Where are we leaking?">
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          <LockedCard title="Revenue Capture Rate Trend" reason="Needs list-price book to compute actual ÷ gross." />
          <LockedCard title="Discount Band Distribution" reason="Needs per-charge discount derived from list_price − amount_paid." />
        </div>
      </NarrativeSection>

      {/* ────────────── 05 CUMULATIVE MTD OVERLAY ────────────── */}
      <NarrativeSection
        number={5}
        question="Cumulative Month-to-Date"
        subtitle="Each month overlaid · current in bold"
      >
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
              Actual (billed)
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <LineChart data={cumOverlayCombined} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EFEDE8" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#737373' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v) || 0, { compact: true })} />
                  {cumulativeOverlay.map((s, i) => {
                    const isCurrent = s.isCurrent
                    const greys = ['#D8D5CE', '#B8B5AE', '#9A9690', '#737373', '#4A4A4A']
                    const shade = isCurrent ? '#E61317' : greys[Math.max(0, greys.length - (cumulativeOverlay.length - i))] ?? '#A3A3A3'
                    return (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        stroke={shade}
                        strokeWidth={isCurrent ? 3 : 1.5}
                        dot={false}
                        connectNulls={false}
                        name={`${s.m}${isCurrent ? ' (MTD)' : ''}`}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 font-ui text-[10px] uppercase tracking-wide text-dash-text-muted">
              {cumulativeOverlay.map((s, i) => {
                const isCurrent = s.isCurrent
                const greys = ['#D8D5CE', '#B8B5AE', '#9A9690', '#737373', '#4A4A4A']
                const shade = isCurrent ? '#E61317' : greys[Math.max(0, greys.length - (cumulativeOverlay.length - i))] ?? '#A3A3A3'
                return (
                  <span key={s.key} className={cn('flex items-center gap-1.5', isCurrent && 'font-bold text-dash-text')}>
                    <span className="inline-block h-0.5 w-4" style={{ background: shade }} />
                    {s.m}{isCurrent ? ' (MTD)' : ''}
                  </span>
                )
              })}
            </div>
          </div>
          <LockedCard
            title="Gross (list price) cumulative"
            reason="Locked — needs list-price book."
          />
        </div>
      </NarrativeSection>

      {/* ────────────── 06 RECURRING REVENUE & ARR ────────────── */}
      <NarrativeSection
        number={6}
        question="Recurring Revenue & ARR"
        subtitle="ARR is a proxy"
        right={
          <span className="rounded-full bg-dash-surface-alt px-3 py-1 font-ui text-[10px] uppercase tracking-wider text-dash-text-secondary">
            Implied ARR is a proxy
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
              Joining Fees vs Recurring Revenue
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer>
                <BarChart data={monthlyRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EFEDE8" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#737373' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v) || 0, { compact: true })} />
                  <Bar dataKey="joining" fill="#1A1A1A" name="Joining (one-time)" />
                  <Bar dataKey="recurring" fill="#E61317" name="Recurring" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex gap-4 font-ui text-[10px] uppercase tracking-wide text-dash-text-muted">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2" style={{ background: '#1A1A1A' }} />Joining (one-time)</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2" style={{ background: '#E61317' }} />Recurring</span>
            </div>
          </div>
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
              Recurring as % of Total
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer>
                <LineChart data={monthlyRows} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EFEDE8" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#737373' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={v => `${Math.round(v * 100)}%`} domain={[0, 1]} />
                  <Tooltip formatter={(v: unknown) => `${Math.round((Number(v) || 0) * 100)}%`} />
                  <Line type="monotone" dataKey="recurringPct" stroke="#1A1A1A" strokeWidth={2.5} dot={{ r: 4, fill: '#1A1A1A' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 font-ui text-[10px] uppercase tracking-wide text-dash-text-muted">Higher = more predictable</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:gap-3 lg:grid-cols-3">
          <MetricTile
            label="Recurring Revenue (MTD)"
            value={fmtCurrency(mtd.recurring, { compact: true })}
            target={`${MONTH_LABELS[today.getMonth()]} to date`}
            status={mtd.recurring > 0 ? 'green' : 'grey'}
            delta={null}
            chart={<TileChart data={monthlyRows.map(r => ({ date: r.m, value: r.recurring }))} variant="line" formatValue={(n) => fmtCurrency(n, { compact: true })} />}
          />
          <MetricTile
            label="Implied ARR (Proxy)"
            value={fmtCurrency(mtd.recurring * 12, { compact: true })}
            target="MTD recurring × 12 · see caveat"
            status="amber"
            delta={null}
          />
          <MetricTile
            label="Recurring Share (MTD)"
            value={mtd.actual > 0 ? `${Math.round((mtd.recurring / mtd.actual) * 100)}%` : '—'}
            target="Trending toward 50%+"
            status={mtd.actual > 0 ? (mtd.recurring / mtd.actual >= 0.5 ? 'green' : 'amber') : 'grey'}
            delta={null}
            chart={<TileChart data={monthlyRows.map(r => ({ date: r.m, value: r.recurringPct * 100 }))} variant="line" formatValue={(n) => `${Math.round(n)}%`} />}
          />
        </div>
      </NarrativeSection>

      {/* ────────────── 07 NON-CORE REVENUE ────────────── */}
      <NarrativeSection number={7} question="Non-Core Revenue" subtitle="Add-ons · supplements · one-offs">
        <LockedCard
          title="Add-on Revenue Deep Dive"
          reason="Needs product taxonomy (Core/Pods/Add-ons) mapped from Stripe product field."
        />
      </NarrativeSection>

      {/* ────────────── 08 ACTUAL VS FORECAST ────────────── */}
      <NarrativeSection
        number={8}
        question="Actual vs Forecast"
        subtitle="Where are we heading?"
        right={
          <span className="rounded-full bg-status-amber/10 px-3 py-1 font-ui text-[10px] uppercase tracking-wider text-status-amber">
            Forecast CSV Pending
          </span>
        }
      >
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
          <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
            Actual ({monthlyRows.length > 0 ? `${monthlyRows[0].m}–${monthlyRows[monthlyRows.length - 1].m}` : '—'}) · Forecast pending
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ComposedChart data={actualVsForecast} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#EFEDE8" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#737373' }} />
                <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v) || 0, { compact: true })} />
                <Line type="monotone" dataKey="actual" stroke="#1A1A1A" strokeWidth={2.5} dot={{ r: 3, fill: '#1A1A1A' }} connectNulls={false} name="Actual" />
                <Line type="monotone" dataKey="forecast" stroke="#E61317" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4, fill: '#E61317' }} connectNulls={false} name="Forecast" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 font-sans text-[11px] italic text-dash-text-muted">
            Forecast line activates when <code>forecast.csv</code> is uploaded (columns: month, forecast_revenue).
          </p>
        </div>
      </NarrativeSection>

      {/* ────────────── 09 REFUNDS & FAILURES ────────────── */}
      <NarrativeSection number={9} question="Refunds & Failures" subtitle="Where revenue is leaking">
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          <LockedCard title="Failure Rate" reason="Stripe Invoices export has no failed-charge status. Needs Charges export." />
          <LockedCard title="Failure Codes (YTD)" reason="Drill-down enabled once Stripe Charges data lands." />
        </div>
      </NarrativeSection>

      {/* ────────────── 10 UNIT ECONOMICS ────────────── */}
      <NarrativeSection
        number={10}
        question="Unit Economics"
        subtitle="LTV · CAC · payback"
        right={
          <span className="rounded-full bg-dash-surface-alt px-3 py-1 font-ui text-[10px] uppercase tracking-wider text-dash-text-secondary">
            Requires Marketing Spend Integration
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
          <LockedTile label="Blended CAC" reason="Pending CAC integration." />
          <LockedTile label="CM / Member" reason="Pending COGS feed." />
          <LockedTile label="LTV : CAC" reason="Pending member-level cohort data." />
          <LockedTile label="CAC Payback" reason="Pending CAC + cohort data." />
        </div>
      </NarrativeSection>

      {/* ────────────── 11 MONTHLY SUMMARY TABLE ────────────── */}
      <NarrativeSection
        number={11}
        question="Monthly Summary"
        subtitle="All key metrics · one view"
        right={
          <button
            onClick={() => setShowTable(s => !s)}
            className="rounded-md border border-dash-border bg-dash-surface px-3 py-1.5 font-ui text-[11px] uppercase tracking-wider text-dash-text-secondary hover:bg-dash-surface-hover"
          >
            {showTable ? 'Hide table' : 'Show table'}
          </button>
        }
      >
        {showTable && (
          <div className="overflow-x-auto rounded-lg border border-dash-border bg-dash-surface">
            <table className="w-full font-mono text-[12px]">
              <thead>
                <tr className="bg-dash-header text-white">
                  {['Month', 'Gross (List)', 'Actual', 'Discount %', 'Refunds', 'Net', '# Txn', 'Fail %', 'AOV', 'MoM %'].map((h, i) => (
                    <th key={h} className={cn('px-3 py-3 font-ui text-[10px] uppercase tracking-wider font-medium', i === 0 ? 'text-left' : 'text-center')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row, i) => {
                  const prev = i > 0 ? monthlyRows[i - 1] : null
                  const mom = prev && prev.actual > 0 ? ((row.actual - prev.actual) / prev.actual) * 100 : null
                  return (
                    <tr key={row.key} className="border-b border-dash-border-subtle last:border-b-0">
                      <td className="px-3 py-3 text-left text-dash-text">{row.m} {row.year}</td>
                      <td className="px-3 py-3 text-center text-dash-text-muted">—</td>
                      <td className="px-3 py-3 text-center text-dash-text">{fmtCurrency(row.actual)}</td>
                      <td className="px-3 py-3 text-center text-dash-text-muted">—</td>
                      <td className="px-3 py-3 text-center text-dash-text-muted">—</td>
                      <td className="px-3 py-3 text-center text-dash-text">{fmtCurrency(row.actual)}</td>
                      <td className="px-3 py-3 text-center text-dash-text-secondary">{row.txns}</td>
                      <td className="px-3 py-3 text-center text-dash-text-muted">—</td>
                      <td className="px-3 py-3 text-center text-dash-text">{row.aov > 0 ? fmtCurrency(row.aov) : '—'}</td>
                      <td className={cn('px-3 py-3 text-center', mom === null ? 'text-dash-text-muted' : mom < 0 ? 'text-status-red' : 'text-status-green')}>
                        {mom === null ? '—' : `${mom > 0 ? '+' : ''}${mom.toFixed(0)}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="px-4 py-3 font-sans text-[11px] italic text-dash-text-muted">
              Gross, Discount %, Refunds, Fail % columns locked — pending list-price book and Stripe Charges export.
            </p>
          </div>
        )}
      </NarrativeSection>

      {/* ────────────── 12 PARKED ────────────── */}
      <NarrativeSection number={12} question="Parked" subtitle="What we can't show yet — and why">
        <div className="overflow-x-auto rounded-lg border border-dash-border bg-dash-surface/40">
          <table className="w-full font-sans text-[13px]">
            <thead>
              <tr className="border-b border-dash-border text-dash-text-muted">
                <th className="px-4 py-3 text-left font-ui text-[10px] uppercase tracking-wider font-medium">Metric</th>
                <th className="px-4 py-3 text-left font-ui text-[10px] uppercase tracking-wider font-medium">Original slot</th>
                <th className="px-4 py-3 text-left font-ui text-[10px] uppercase tracking-wider font-medium">Why parked · what it needs</th>
              </tr>
            </thead>
            <tbody className="text-dash-text-secondary">
              {[
                ['MRR', 'Revenue Headlines', 'No clean subscription-state table. "Active subscriptions" is a proxy (unique invoice prefixes), not MRR. Needs subscription lifecycle events.'],
                ['MRR Waterfall', '§03', 'Needs Starting / New / Expansion / Contraction / Churn movements from subscription state changes, not just charge data.'],
                ['Cohort Revenue (M0–M5)', '§04', 'Achievable from CSV (invoice prefix → customer → signup month) but is a meaningful build. Parked as v2.'],
                ['Gross at List / Capture Rate', '§02, §03, §04', 'Requires list-price book to derive gross. Discount discipline view unlocks at the same time.'],
                ['Refunds & Failure Rate', '§09, §11', 'Stripe Charges export needed (current ingest is Invoices). Failure code drill-down enabled at the same time.'],
                ['CAC / LTV / Payback', '§10', 'Needs marketing spend integration + member-level cohort data.'],
              ].map((row, i) => (
                <tr key={i} className="border-b border-dash-border-subtle last:border-b-0">
                  <td className="px-4 py-3 font-mono text-dash-text">{row[0]}</td>
                  <td className="px-4 py-3 font-ui text-[11px] uppercase tracking-wider text-dash-text-muted">{row[1]}</td>
                  <td className="px-4 py-3">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NarrativeSection>

      {/* ────────────── 13 CFO POV ────────────── */}
      <NarrativeSection
        number={13}
        question="CFO POV"
        subtitle="What keeps me up — read before the board meeting"
      >
        <div className="rounded-lg bg-dash-header p-6 text-white md:p-8">
          <div className="font-ui text-[10px] uppercase tracking-[0.15em] text-white/60">The one sentence</div>
          <p className="mt-3 font-serif text-lg leading-relaxed md:text-xl">
            The growth chart is impressive, but the business is being carried by joining fees and steep
            discounting — both of which mask whether the recurring product is actually viable.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          {[
            { n: '01', title: 'We are not a recurring business yet — and the dashboard makes us look like one.', body: 'Joining fees dominate monthly revenue. If they vanish for one month, recurring covers only a small fraction of cost base. We are funding the business by acquiring customers, not retaining them.', evidence: '§06 recurring-share line bouncing, never climbing steadily.' },
            { n: '02', title: 'Steep-discount transactions are not a pricing strategy — they\'re a leak.', body: 'Once list-price data lands, expect a long tail of transactions captured at <20% of list value. Forces a pricing/comp policy decision.', evidence: '§04 discount band distribution (pending list-price book).' },
            { n: '03', title: 'We have no visibility on failed payments.', body: 'The current Invoices export does not surface declined charges. At meaningful scale this is recoverable revenue lost to broken dunning logic.', evidence: '§09 locked until Stripe Charges export is wired.' },
            { n: '04', title: 'Product-mix concentration is invisible.', body: 'Without Core/Pods/Add-ons taxonomy on Stripe products, we can\'t see whether spikes are coming from one product line or many. Single-customer effects look like trends.', evidence: '§03 By Product locked pending taxonomy.' },
            { n: '05', title: 'Add-on revenue could be a wedge — or a sample-size-of-one.', body: 'Once we can classify add-ons, the question becomes whether spikes are distributed across many members (a real product insight) or concentrated in one (a noisy outlier).', evidence: '§07 non-core deep dive locked.' },
            { n: '06', title: 'We have no idea what a customer is worth.', body: 'LTV:CAC and CAC Payback require marketing spend + cohort retention data we don\'t have. Until then, any LTV number is a guess multiplied by another guess.', evidence: '§10 Unit Economics greyed out — by design, until data exists.' },
          ].map((insight) => (
            <div key={insight.n} className="rounded-lg border border-dash-border bg-dash-surface p-5">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl leading-none text-dash-red">{insight.n}</span>
                <h3 className="font-serif text-base font-medium leading-snug text-dash-text md:text-lg">{insight.title}</h3>
              </div>
              <p className="mt-3 font-sans text-[13px] leading-relaxed text-dash-text">{insight.body}</p>
              <p className="mt-4 border-t border-dash-border-subtle pt-2 font-ui text-[10px] uppercase tracking-wider text-dash-text-muted">
                Evidence · {insight.evidence}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-status-amber/30 bg-status-amber/5 p-6">
          <div className="font-ui text-[10px] uppercase tracking-[0.15em] text-status-amber">The structural question</div>
          <p className="mt-3 font-serif text-base leading-relaxed text-dash-text md:text-lg">
            If we held acquisition flat for 90 days — no new joining fees, no new members — what does the P&amp;L look like?
          </p>
          <p className="mt-4 font-sans text-[13px] leading-relaxed text-dash-text">
            This is the test that separates &ldquo;fast-growing startup&rdquo; from &ldquo;subsidised consumption&rdquo;. To answer it the data layer needs three things:
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-6 font-sans text-[13px] leading-relaxed text-dash-text">
            <li><b>Cohort retention by signup month</b> — of the early joiners, how many are still paying today?</li>
            <li><b>Per-member monthly spend across all products</b> — Core + Pods + Add-ons aggregated to a single member view.</li>
            <li><b>Cost-of-acquisition feed from marketing</b> — without it, we can&apos;t tell whether each new member is creating or destroying value.</li>
          </ol>
        </div>
      </NarrativeSection>
    </div>
  )
}

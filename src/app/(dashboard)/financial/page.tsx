'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
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
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { StatusDot } from '@/components/dashboard/status-dot'
import { MetricTile, LockedTile, LockedCard } from '@/components/dashboard/metric-tile'
import { NarrativeSection } from '@/components/dashboard/narrative-section'
import { TileChart } from '@/components/dashboard/tile-chart'
import { TmrwBarChart } from '@/components/dashboard/tmrw-bar-chart'
import { useDashboardData } from '@/lib/context/data-context'
import { deltaPct } from '@/lib/utils/period'
import {
  ATTACH_CATEGORIES,
  buildCategoryLookup,
  categoryLabel,
  emptyLadder,
  reconcileAgainstManual,
  rollupByCategory,
  rollupByMonth,
  unmappedProducts,
} from '@/lib/analytics/revenue-metrics'
import { cn } from '@/lib/utils'
import type { Status } from '@/lib/types'
import { Star, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

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

type Row = Record<string, unknown>

// Product columns on financial_revenue, in stack order (recurring first).
const PRODUCT_KEYS = ['membership', 'joining_fees', 'tmrw_stacks', 'supplements', 'peptides', 'advanced_tests'] as const

const PRODUCT_LABELS: Record<string, string> = {
  membership: 'Membership',
  joining_fees: 'Joining Fees',
  tmrw_stacks: 'TMRW Stacks',
  supplements: 'Supplements',
  peptides: 'Peptides',
  advanced_tests: 'Advanced Tests',
}

const PRODUCT_COLORS: Record<string, string> = {
  membership: '#7A1F22',
  joining_fees: '#1A1A1A',
  tmrw_stacks: '#E5A04A',
  supplements: '#3676C9',
  peptides: '#16A34A',
  advanced_tests: '#7C3AED',
}

// Attach-category stack colours, in ATTACH_CATEGORIES order. Reuses the existing
// per-product hues so the same product family keeps the same colour across the
// manual-workbook charts and the Stripe line-item charts.
const ATTACH_COLORS = ['#E5A04A', '#16A34A', '#7C3AED', '#3676C9', '#0891B2']

/**
 * Month-on-month delta for a ladder figure. Returns null when there's no prior
 * month to compare against, so the tile renders no arrow rather than a fake 0%.
 */
function monthDelta(current: number, previous: number, prevLabel?: string) {
  if (!prevLabel) return null
  const value = deltaPct(current, previous)
  if (value === null) return null
  return { value, period: `vs ${prevLabel}` }
}

/* ─── Table cells (shared by the new revenue tables) ─────────────────── */

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={cn(
        'pb-2 font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-muted',
        align === 'right' ? 'pl-3 text-right' : 'pr-3 text-left'
      )}
    >
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('py-2 pl-3 text-right font-mono text-[12px] text-dash-text', className)}>
      {children}
    </td>
  )
}

function monthKey(dateVal: unknown): string | null {
  const t = new Date(String(dateVal ?? '')).getTime()
  if (isNaN(t)) return null
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

type OverlaySeries = { key: string; m: string; isCurrent: boolean; data: { day: number; value: number }[] }

// Pivot per-month cumulative series into one row per day-of-month, with a
// column per month — the shape Recharts wants for an overlaid line chart.
function combineOverlay(series: OverlaySeries[]): Record<string, number | null>[] {
  const maxDay = series.reduce((m, s) => Math.max(m, s.data.length), 0)
  const out: Record<string, number | null>[] = []
  for (let d = 1; d <= maxDay; d++) {
    const row: Record<string, number | null> = { day: d }
    for (const s of series) {
      const point = s.data.find(p => p.day === d)
      row[s.key] = point ? point.value : null
    }
    out.push(row)
  }
  return out
}

const OVERLAY_GREYS = ['#D8D5CE', '#B8B5AE', '#9A9690', '#737373', '#4A4A4A']

/* ─── Page ────────────────────────────────────────────────────────── */

export default function FinancialPage() {
  const {
    financial_revenue,
    stripe,
    stripe_revenue,
    product_category_map,
    plan_targets,
    loading,
    error,
    refresh,
  } = useDashboardData()
  const [showTable, setShowTable] = useState(false)

  /* ── Stripe line-item revenue (primary feed) ──
   * Categories are joined here, at read time, so re-uploading the workbook's
   * Mapping tab re-categorises history immediately and anything that falls out
   * of the map shows up as Unmapped rather than silently deflating a total. */
  const categoryLookup = useMemo(() => buildCategoryLookup(product_category_map), [product_category_map])
  const hasLineItems = stripe_revenue.length > 0

  const lineMonthly = useMemo(
    () => rollupByMonth(stripe_revenue, categoryLookup),
    [stripe_revenue, categoryLookup]
  )

  // Latest month present in the feed — the ladder headlines that rather than the
  // calendar month, so a mid-month upload gap doesn't read as a revenue collapse.
  const latestLineMonth = lineMonthly.length > 0 ? lineMonthly[lineMonthly.length - 1] : null
  const prevLineMonth = lineMonthly.length > 1 ? lineMonthly[lineMonthly.length - 2] : null

  const lineLadder = latestLineMonth?.ladder ?? emptyLadder()
  const prevLineLadder = prevLineMonth?.ladder ?? emptyLadder()

  const latestMonthLines = useMemo(() => {
    if (!latestLineMonth) return []
    return stripe_revenue.filter(r => String(r.transaction_date).slice(0, 7) === latestLineMonth.month)
  }, [stripe_revenue, latestLineMonth])

  const categoryRollup = useMemo(
    () => rollupByCategory(latestMonthLines, categoryLookup),
    [latestMonthLines, categoryLookup]
  )

  // Unmapped is computed over the WHOLE feed, not just the latest month: a
  // product that stopped being mapped six months ago still distorts history.
  const unmapped = useMemo(
    () => unmappedProducts(stripe_revenue, categoryLookup),
    [stripe_revenue, categoryLookup]
  )
  const unmappedTotals = useMemo(() => {
    const gross = unmapped.reduce((s, p) => s + p.gross, 0)
    const lines = unmapped.reduce((s, p) => s + p.lineCount, 0)
    const allGross = stripe_revenue.reduce((s, r) => s + num(r.gross_amount), 0)
    return { gross, lines, names: unmapped.length, share: allGross !== 0 ? gross / allGross : null }
  }, [unmapped, stripe_revenue])

  // Recurring / one-off / unmapped as a three-way split that always sums to
  // 100%, so recurring % can never be flattered by an unmapped product.
  const recurringChartData = useMemo(
    () => lineMonthly.map(m => ({
      m: m.label,
      recurring: m.recurring,
      oneOff: m.oneOff,
      unmapped: m.unmapped,
      recurringPct: m.recurringPct,
    })),
    [lineMonthly]
  )

  // Attach products only — Dan's "breakdown of attach products".
  const attachChartData = useMemo(
    () => lineMonthly.map(m => {
      const row: Record<string, unknown> = { m: m.label }
      for (const c of ATTACH_CATEGORIES) row[c] = m.byCategory[c] ?? 0
      return row
    }),
    [lineMonthly]
  )
  const attachRollup = categoryRollup.filter(c => c.category.startsWith('Attach products'))
  const attachTotalGross = attachRollup.reduce((s, c) => s + c.ladder.gross, 0)

  const reconciliation = useMemo(
    () => reconcileAgainstManual(lineMonthly, financial_revenue),
    [lineMonthly, financial_revenue]
  )
  // Only months both sides cover are meaningful to judge.
  const comparableRecon = reconciliation.filter(r => r.manualGross !== 0 || r.manualNet !== 0)
  const reconAllGood = comparableRecon.length > 0 && comparableRecon.every(r => r.reconciled)

  /* ── Split financial_revenue by type ──
   * net  = revenue actually collected (post-discount)
   * gross = list price (RRP). capture rate = net ÷ gross. */
  const netRows = useMemo(() => financial_revenue.filter(r => String(r.revenue_type) === 'net'), [financial_revenue])
  const grossRows = useMemo(() => financial_revenue.filter(r => String(r.revenue_type) === 'gross'), [financial_revenue])

  // Row total = sum of product columns (robust even if the stored `total` is 0).
  const rowTotal = useCallback((r: Row) => PRODUCT_KEYS.reduce((s, k) => s + num(r[k]), 0), [])

  // Calendar "today" — anchors the month, day-of-month and days-remaining so
  // they track the real date, not how fresh the data happens to be.
  const today = useMemo(() => new Date(), [])

  // Data freshness: most recent date in financial_revenue (else stripe). Used
  // as the run-rate projection denominator so we extrapolate from days of data
  // actually present, not calendar days.
  const dataAsOf = useMemo(() => {
    let maxTs = 0
    for (const r of financial_revenue) {
      const t = new Date(String(r.date ?? '')).getTime()
      if (!isNaN(t)) maxTs = Math.max(maxTs, t)
    }
    if (maxTs === 0) {
      for (const r of stripe) {
        const t = new Date(String(r.created ?? '')).getTime()
        if (!isNaN(t)) maxTs = Math.max(maxTs, t)
      }
    }
    return maxTs > 0 ? new Date(maxTs) : today
  }, [financial_revenue, stripe, today])

  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const dim = daysInMonth(today)
  const dayOfMonth = today.getDate()
  // Days of data we have this month — used as the run-rate denominator. Falls
  // back to the calendar day if the latest data point is from a prior month.
  const dataDayOfMonth =
    dataAsOf.getFullYear() === today.getFullYear() && dataAsOf.getMonth() === today.getMonth()
      ? dataAsOf.getDate()
      : dayOfMonth

  /* ── Plan target for the current month ── */
  const currentPlanTarget = useMemo(() => {
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    return plan_targets.find(p => typeof p.month === 'string' && p.month.startsWith(ym)) ?? null
  }, [plan_targets, today])
  const planThisMonth = currentPlanTarget ? num(currentPlanTarget.gross_revenue_target) : null

  /* ── Monthly aggregation (net + gross + per-product + stripe txns) ── */
  const monthlyRows = useMemo(() => {
    type Agg = Record<string, number>
    const blank = (): Agg => ({ total: 0, membership: 0, joining_fees: 0, tmrw_stacks: 0, supplements: 0, peptides: 0, advanced_tests: 0 })
    const net = new Map<string, Agg>()
    const gross = new Map<string, Agg>()
    const accumulate = (map: Map<string, Agg>, rows: Row[]) => {
      for (const r of rows) {
        const k = monthKey(r.date)
        if (!k) continue
        const a = map.get(k) ?? blank()
        for (const key of PRODUCT_KEYS) a[key] += num(r[key])
        a.total += rowTotal(r)
        map.set(k, a)
      }
    }
    accumulate(net, netRows)
    accumulate(gross, grossRows)

    const txnByMonth = new Map<string, number>()
    for (const r of stripe) {
      const k = monthKey(r.created)
      if (k) txnByMonth.set(k, (txnByMonth.get(k) ?? 0) + 1)
    }

    const keys = Array.from(new Set([...Array.from(net.keys()), ...Array.from(gross.keys())])).sort()
    return keys.map(k => {
      const [y, m] = k.split('-')
      const n = net.get(k) ?? blank()
      const g = gross.get(k) ?? blank()
      const planRow = plan_targets.find(p => typeof p.month === 'string' && p.month.startsWith(k))
      const txns = txnByMonth.get(k) ?? 0
      return {
        key: k,
        m: MONTH_LABELS[parseInt(m, 10) - 1],
        year: parseInt(y, 10),
        net: n.total,
        gross: g.total,
        membership: n.membership,
        joining: n.joining_fees,
        tmrw_stacks: n.tmrw_stacks,
        supplements: n.supplements,
        peptides: n.peptides,
        advanced_tests: n.advanced_tests,
        plan: planRow ? num(planRow.gross_revenue_target) : null,
        captureRate: g.total > 0 ? n.total / g.total : null,
        txns,
        aov: txns > 0 ? n.total / txns : 0,
        recurringPct: n.total > 0 ? n.membership / n.total : 0,
      }
    })
  }, [netRows, grossRows, stripe, plan_targets, rowTotal])

  /* ── This month: MTD figures ── */
  const mtd = useMemo(() => {
    const inMonth = (v: unknown) => {
      const t = new Date(String(v ?? '')).getTime()
      return !isNaN(t) && t >= monthStart.getTime() && t <= monthEnd.getTime()
    }
    let net = 0, gross = 0, membership = 0, joining = 0, txns = 0
    for (const r of netRows) if (inMonth(r.date)) { net += rowTotal(r); membership += num(r.membership); joining += num(r.joining_fees) }
    for (const r of grossRows) if (inMonth(r.date)) gross += rowTotal(r)
    for (const r of stripe) if (inMonth(r.created)) txns += 1
    return { net, gross, membership, joining, txns }
  }, [netRows, grossRows, stripe, monthStart, monthEnd, rowTotal])

  // Run-rate projection on net revenue (what we actually collect).
  const projectedMonthEnd = dataDayOfMonth > 0 ? (mtd.net / dataDayOfMonth) * dim : 0
  const gapToPlan = planThisMonth ? planThisMonth - projectedMonthEnd : null
  const daysRemaining = dim - dayOfMonth
  const requiredRunRate = gapToPlan !== null && daysRemaining > 0 ? Math.max(0, gapToPlan / daysRemaining) : null
  const mtdAov = mtd.txns > 0 ? mtd.net / mtd.txns : 0
  const captureRateMtd = mtd.gross > 0 ? mtd.net / mtd.gross : null

  /* ── YTD vs Plan ── */
  const yearStart = new Date(today.getFullYear(), 0, 1)
  const ytdActual = useMemo(() =>
    netRows.reduce((s, r) => {
      const t = new Date(String(r.date ?? '')).getTime()
      if (isNaN(t) || t < yearStart.getTime() || t > today.getTime()) return s
      return s + rowTotal(r)
    }, 0)
  , [netRows, yearStart, today, rowTotal])

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

  /* ── §05 month selector: which months to overlay ── */
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    for (const r of netRows) {
      const k = monthKey(r.date)
      if (k) set.add(k)
    }
    for (const r of grossRows) {
      const k = monthKey(r.date)
      if (k) set.add(k)
    }
    return Array.from(set).sort()
  }, [netRows, grossRows])
  const [selectedMonths, setSelectedMonths] = useState<Set<string> | null>(null)
  useEffect(() => {
    if (selectedMonths === null && availableMonths.length > 0) {
      setSelectedMonths(new Set(availableMonths))
    }
  }, [availableMonths, selectedMonths])
  const visibleMonths = selectedMonths ?? new Set(availableMonths)
  const allSelected = availableMonths.length > 0 && availableMonths.every(k => visibleMonths.has(k))
  const toggleMonth = (key: string) =>
    setSelectedMonths(prev => {
      const next = new Set(prev ?? availableMonths)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const monthKeyLabel = (key: string) => {
    const [y, m] = key.split('-')
    return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y}`
  }

  /* ── §05 Cumulative MTD overlay — build one per rowset (net + gross) ── */
  const buildOverlay = useCallback((rows: Row[]) => {
    const grouped = new Map<string, Row[]>()
    for (const r of rows) {
      const k = monthKey(r.date)
      if (!k) continue
      const arr = grouped.get(k) ?? []
      arr.push(r)
      grouped.set(k, arr)
    }
    const curKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const sel = selectedMonths ?? new Set(availableMonths)
    const keys = Array.from(grouped.keys()).sort().filter(k => sel.has(k))
    return keys.map(k => {
      const [y, mIdx] = k.split('-').map(Number)
      const dimK = new Date(y, mIdx, 0).getDate()
      const isCurrent = k === curKey
      const daily = new Array(dimK).fill(0) as number[]
      for (const r of grouped.get(k)!) {
        const d = new Date(String(r.date)).getDate()
        if (d >= 1 && d <= dimK) daily[d - 1] += rowTotal(r)
      }
      const cap = isCurrent ? dataDayOfMonth : dimK
      let running = 0
      const data: { day: number; value: number }[] = []
      for (let d = 1; d <= cap; d++) { running += daily[d - 1]; data.push({ day: d, value: running }) }
      return { key: k, m: MONTH_LABELS[mIdx - 1], isCurrent, data }
    })
  }, [today, dataDayOfMonth, rowTotal, selectedMonths, availableMonths])

  const netOverlay = useMemo(() => buildOverlay(netRows), [buildOverlay, netRows])
  const grossOverlay = useMemo(() => buildOverlay(grossRows), [buildOverlay, grossRows])
  const netOverlayCombined = useMemo(() => combineOverlay(netOverlay), [netOverlay])
  const grossOverlayCombined = useMemo(() => combineOverlay(grossOverlay), [grossOverlay])

  /* ── §08 Actual vs Forecast (actual = net collected) ── */
  const actualVsForecast = useMemo(() =>
    monthlyRows.map(r => ({ m: r.m, actual: r.net, forecast: null as number | null }))
  , [monthlyRows])

  const sparkAov = monthlyRows.map(r => ({ date: r.m, value: r.aov }))

  const projectionStatus: Status = planThisMonth === null
    ? 'grey'
    : projectedMonthEnd >= planThisMonth ? 'green'
    : projectedMonthEnd >= planThisMonth * 0.85 ? 'amber'
    : 'red'

  const captureStatus: Status = captureRateMtd === null
    ? 'grey'
    : captureRateMtd >= 0.65 ? 'green'
    : captureRateMtd >= 0.5 ? 'amber'
    : 'red'

  const monthlyChartData = monthlyRows.map(r => ({
    m: r.m,
    net: r.net,
    gross: r.gross,
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
        <div className="flex items-center gap-4 rounded-lg border border-dash-border bg-dash-surface p-4 shadow-sm md:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dash-red/10 text-dash-red">
            <Star size={18} />
          </div>
          <div className="flex-1">
            <div className="font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
              Revenue Capture Rate (MTD)
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-dash-text md:text-3xl">
                {captureRateMtd === null ? '—' : `${Math.round(captureRateMtd * 100)}%`}
              </span>
              <span className="font-sans text-xs text-dash-text-muted">net ÷ gross (RRP)</span>
            </div>
          </div>
          <StatusDot status={captureStatus} />
        </div>
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
              Monthly Net Revenue vs Plan
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer>
                <ComposedChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EFEDE8" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#737373' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v) || 0, { compact: true })} />
                  <Bar dataKey="net" fill="#E61317" name="Net revenue" />
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
            label="Net Revenue (MTD)"
            value={fmtCurrency(mtd.net, { compact: true })}
            target={`${MONTH_LABELS[today.getMonth()]}, day ${dayOfMonth} of ${dim}`}
            status={mtd.net > 0 ? 'green' : 'grey'}
            delta={null}
          />
          <MetricTile
            label="Gross at List (MTD)"
            value={fmtCurrency(mtd.gross, { compact: true })}
            target={captureRateMtd === null ? 'RRP' : `Capture: ${Math.round(captureRateMtd * 100)}%`}
            status={mtd.gross > 0 ? 'green' : 'grey'}
            delta={null}
          />
          <MetricTile
            label="Avg Order Value"
            value={mtdAov > 0 ? fmtCurrency(mtdAov) : '—'}
            target="Net ÷ Stripe txns · target $150+"
            status={mtdAov >= 150 ? 'green' : mtdAov > 0 ? 'amber' : 'grey'}
            delta={null}
            chart={<TileChart data={sparkAov} variant="line" formatValue={(n) => fmtCurrency(n)} />}
          />
          <LockedTile label="Declined Rate" reason="Stripe Invoices export carries no failure status. Needs Charges export." />
        </div>
      </NarrativeSection>

      {/* ────────────── 03 REVENUE LADDER (Stripe line items) ────────────── */}
      <NarrativeSection
        number={3}
        question="The Revenue Ladder"
        subtitle={
          latestLineMonth
            ? `Stripe line items · ${latestLineMonth.label} · list price down to ex-GST`
            : 'Stripe line items · list price down to ex-GST'
        }
      >
        {!hasLineItems ? (
          <LockedCard
            title="Revenue Ladder"
            reason="No Stripe line-item data yet. Upload the Stripe revenue extract (Admin → Data Upload → Stripe Revenue) to unlock gross, net, recurring and the attach-product breakdown."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <MetricTile
                prominent
                label="Gross (RRP)"
                value={fmtCurrency(lineLadder.gross, { compact: true })}
                target="List price before discounts"
                status={lineLadder.gross > 0 ? 'green' : 'grey'}
                delta={monthDelta(lineLadder.gross, prevLineLadder.gross, prevLineMonth?.label)}
              />
              <MetricTile
                label="Discounts"
                value={fmtCurrency(lineLadder.discount, { compact: true })}
                target="Coupons + comped value"
                status="grey"
                direction="lower-better"
                delta={monthDelta(lineLadder.discount, prevLineLadder.discount, prevLineMonth?.label)}
              />
              <MetricTile
                prominent
                label="Net (charged)"
                value={fmtCurrency(lineLadder.charged, { compact: true })}
                target="Gross − discounts"
                status={lineLadder.charged > 0 ? 'green' : 'grey'}
                delta={monthDelta(lineLadder.charged, prevLineLadder.charged, prevLineMonth?.label)}
                footnote="Matches the CH Summary workbook's Net row"
              />
              <MetricTile
                label="Stripe Fees"
                value={fmtCurrency(lineLadder.fee, { compact: true })}
                target={lineLadder.charged > 0 ? `${((lineLadder.fee / lineLadder.charged) * 100).toFixed(2)}% of charged` : '—'}
                status="grey"
                direction="lower-better"
                delta={null}
              />
              <MetricTile
                label="Ex-GST Net"
                value={fmtCurrency(lineLadder.exGstNet, { compact: true })}
                target={`GST ${fmtCurrency(lineLadder.gst, { compact: true })} · charged ÷ 1.1`}
                status={lineLadder.exGstNet > 0 ? 'green' : 'grey'}
                delta={null}
              />
              <MetricTile
                label="Capture Rate"
                value={lineLadder.captureRate === null ? '—' : `${(lineLadder.captureRate * 100).toFixed(1)}%`}
                target="Charged ÷ gross"
                status={
                  lineLadder.captureRate === null ? 'grey'
                    : lineLadder.captureRate >= 0.8 ? 'green'
                    : lineLadder.captureRate >= 0.5 ? 'amber'
                    : 'red'
                }
                delta={
                  prevLineLadder.captureRate !== null && lineLadder.captureRate !== null
                    ? { value: deltaPct(lineLadder.captureRate, prevLineLadder.captureRate), period: `vs ${prevLineMonth?.label ?? 'prior month'}` }
                    : null
                }
              />
            </div>

            <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                  Gross → Net by month
                </span>
                <span className="font-sans text-[11px] text-dash-text-muted">
                  {lineLadder.refundCount > 0
                    ? `${lineLadder.refundCount} refund line${lineLadder.refundCount === 1 ? '' : 's'} in ${latestLineMonth?.label} (${fmtCurrency(lineLadder.refundValue, { compact: true })})`
                    : 'No refunds in the latest month'}
                </span>
              </div>
              <TmrwBarChart
                data={lineMonthly.map(m => ({
                  m: m.label,
                  charged: m.ladder.charged,
                  discount: m.ladder.discount,
                })) as Record<string, unknown>[]}
                index="m"
                stacked
                series={[
                  { dataKey: 'charged', name: 'Net (charged)', color: '#E61317' },
                  { dataKey: 'discount', name: 'Discounts', color: '#D6D2CA' },
                ]}
                height={240}
                yAxisWidth={52}
                valueFormatter={(v) => fmtCurrency(v, { compact: true })}
              />
              <p className="mt-2 font-sans text-[11px] text-dash-text-muted">
                The two bands stack to gross at list price, so the grey band is exactly what discounting gave away.
              </p>
            </div>
          </>
        )}
      </NarrativeSection>

      {/* ────────────── 04 RECURRING VS ONE-OFF ────────────── */}
      <NarrativeSection
        number={4}
        question="Recurring vs One-Off"
        subtitle="Subscription + peptides + stacks + appointments · vs joining fees, supplements, advanced tests"
      >
        {!hasLineItems ? (
          <LockedCard title="Recurring Revenue" reason="Needs the Stripe line-item extract." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
              <MetricTile
                prominent
                label="Recurring"
                value={fmtCurrency(latestLineMonth?.recurring ?? 0, { compact: true })}
                target={latestLineMonth?.recurringPct === null || latestLineMonth === null
                  ? 'No data'
                  : `${latestLineMonth.recurringPct!.toFixed(1)}% of gross`}
                status={(latestLineMonth?.recurringPct ?? 0) >= 80 ? 'green' : (latestLineMonth?.recurringPct ?? 0) >= 50 ? 'amber' : 'red'}
                delta={monthDelta(latestLineMonth?.recurring ?? 0, prevLineMonth?.recurring ?? 0, prevLineMonth?.label)}
              />
              <MetricTile
                label="One-Off"
                value={fmtCurrency(latestLineMonth?.oneOff ?? 0, { compact: true })}
                target="Joining fees · supplements · advanced tests"
                status="grey"
                delta={monthDelta(latestLineMonth?.oneOff ?? 0, prevLineMonth?.oneOff ?? 0, prevLineMonth?.label)}
              />
              <MetricTile
                label="Recurring %"
                value={latestLineMonth?.recurringPct == null ? '—' : `${latestLineMonth.recurringPct.toFixed(1)}%`}
                target="Share of total gross"
                status={(latestLineMonth?.recurringPct ?? 0) >= 80 ? 'green' : 'amber'}
                delta={
                  latestLineMonth?.recurringPct != null && prevLineMonth?.recurringPct != null
                    ? { value: deltaPct(latestLineMonth.recurringPct, prevLineMonth.recurringPct), period: `vs ${prevLineMonth.label}` }
                    : null
                }
                footnote={
                  (latestLineMonth?.unmapped ?? 0) > 0 && latestLineMonth?.recurringPctOfClassified != null
                    ? `${latestLineMonth.recurringPctOfClassified.toFixed(1)}% of categorised revenue only`
                    : undefined
                }
              />
              {(latestLineMonth?.unmapped ?? 0) > 0 ? (
                <MetricTile
                  label="Unmapped"
                  value={fmtCurrency(latestLineMonth?.unmapped ?? 0, { compact: true })}
                  target="Not yet in the Mapping tab"
                  status="red"
                  direction="lower-better"
                  delta={null}
                  footnote="Can't be classified recurring or one-off until mapped"
                />
              ) : (
                <MetricTile
                  label="Unmapped"
                  value={fmtCurrency(0)}
                  target="Every product categorised"
                  status="green"
                  delta={null}
                />
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
                <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                  Gross split by month
                </div>
                <TmrwBarChart
                  data={recurringChartData as Record<string, unknown>[]}
                  index="m"
                  stacked
                  series={[
                    { dataKey: 'recurring', name: 'Recurring', color: '#E61317' },
                    { dataKey: 'oneOff', name: 'One-off', color: '#F5A623' },
                    { dataKey: 'unmapped', name: 'Unmapped', color: '#9CA3AF' },
                  ]}
                  height={240}
                  yAxisWidth={52}
                  valueFormatter={(v) => fmtCurrency(v, { compact: true })}
                />
              </div>
              <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
                <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                  Recurring share of gross
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer>
                    <LineChart data={recurringChartData as object[]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#EFEDE8" vertical={false} />
                      <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#737373' }} />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#737373' }}
                        domain={[0, 100]}
                        tickFormatter={v => `${v}%`}
                      />
                      <Tooltip formatter={(v: unknown) => `${Number(v).toFixed(1)}%`} />
                      <Line
                        type="monotone"
                        dataKey="recurringPct"
                        stroke="#E61317"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#E61317' }}
                        name="Recurring %"
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </NarrativeSection>

      {/* ────────────── 05 ATTACH PRODUCTS ────────────── */}
      <NarrativeSection
        number={5}
        question="Attach Products"
        subtitle={
          latestLineMonth
            ? `Supplements · peptides · advanced tests · stacks · appointments · ${latestLineMonth.label}`
            : 'Supplements · peptides · advanced tests · stacks · appointments'
        }
      >
        {!hasLineItems ? (
          <LockedCard title="Attach Products" reason="Needs the Stripe line-item extract." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
              <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                Attach gross by month
              </div>
              <TmrwBarChart
                data={attachChartData}
                index="m"
                stacked
                series={ATTACH_CATEGORIES.map((c, i) => ({
                  dataKey: c,
                  name: categoryLabel(c),
                  color: ATTACH_COLORS[i % ATTACH_COLORS.length],
                }))}
                height={260}
                yAxisWidth={52}
                valueFormatter={(v) => fmtCurrency(v, { compact: true })}
              />
            </div>
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
              <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                {latestLineMonth?.label} by category
              </div>
              {categoryRollup.length === 0 ? (
                <p className="font-sans text-sm text-dash-text-muted">No lines in this month.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left">
                    <thead>
                      <tr className="border-b border-dash-border">
                        <Th>Category</Th>
                        <Th align="right">Gross</Th>
                        <Th align="right">Discount</Th>
                        <Th align="right">Net</Th>
                        <Th align="right">% of gross</Th>
                        <Th align="right">Class</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRollup.map(c => (
                        <tr key={c.category} className="border-b border-dash-border/60 last:border-0">
                          <td className="py-2 pr-3 font-sans text-[12px] text-dash-text">{c.label}</td>
                          <Td>{fmtCurrency(c.ladder.gross)}</Td>
                          <Td>{fmtCurrency(c.ladder.discount)}</Td>
                          <Td>{fmtCurrency(c.ladder.charged)}</Td>
                          <Td>{c.shareOfGross === null ? '—' : `${(c.shareOfGross * 100).toFixed(1)}%`}</Td>
                          <Td>{c.revenueClass === 'one_off' ? 'One-off' : 'Recurring'}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 font-sans text-[11px] text-dash-text-muted">
                Attach products totalled {fmtCurrency(attachTotalGross, { compact: true })} gross in {latestLineMonth?.label}
                {lineLadder.gross > 0 && ` — ${((attachTotalGross / lineLadder.gross) * 100).toFixed(1)}% of the month`}.
              </p>
            </div>
          </div>
        )}
      </NarrativeSection>

      {/* ────────────── 06 MAPPING + RECONCILIATION ────────────── */}
      <NarrativeSection
        number={6}
        question="Does It Tie Out?"
        subtitle="Unmapped products · Stripe line items vs the manual workbook"
      >
        {!hasLineItems ? (
          <LockedCard title="Reconciliation" reason="Needs the Stripe line-item extract." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
            {/* Unmapped products — shown, never folded into a total. */}
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                  Unmapped products
                </span>
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 font-sans text-[11px] font-medium',
                    unmappedTotals.names === 0
                      ? 'bg-status-green-light text-status-green'
                      : 'bg-status-amber-light text-status-amber'
                  )}
                >
                  {unmappedTotals.names === 0
                    ? 'All mapped'
                    : `${unmappedTotals.names} product${unmappedTotals.names === 1 ? '' : 's'}`}
                </span>
              </div>
              {categoryLookup.isEmpty ? (
                <p className="font-sans text-sm text-dash-text-muted">
                  No product map uploaded yet. Upload the workbook&apos;s Mapping tab so revenue can be
                  categorised — until then everything counts as unmapped.
                </p>
              ) : unmapped.length === 0 ? (
                <p className="font-sans text-sm text-dash-text-muted">
                  Every product in the feed maps to a category. Nothing is leaking out of the breakdown.
                </p>
              ) : (
                <>
                  <p className="mb-3 font-sans text-[12px] text-dash-text-secondary">
                    {fmtCurrency(unmappedTotals.gross)} across {unmappedTotals.lines} line
                    {unmappedTotals.lines === 1 ? '' : 's'}
                    {unmappedTotals.share !== null && ` — ${(unmappedTotals.share * 100).toFixed(2)}% of all gross`}.
                    Add these to the Mapping tab and re-upload to fold them into the breakdown.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left">
                      <thead>
                        <tr className="border-b border-dash-border">
                          <Th>Product</Th>
                          <Th align="right">Lines</Th>
                          <Th align="right">Gross</Th>
                          <Th align="right">% of gross</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {unmapped.slice(0, 12).map(p => (
                          <tr key={p.productName} className="border-b border-dash-border/60 last:border-0">
                            <td className="py-2 pr-3 font-sans text-[12px] text-dash-text">{p.productName}</td>
                            <Td>{p.lineCount}</Td>
                            <Td>{fmtCurrency(p.gross)}</Td>
                            <Td>{p.shareOfGross === null ? '—' : `${(p.shareOfGross * 100).toFixed(2)}%`}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {unmapped.length > 12 && (
                    <p className="mt-2 font-sans text-[11px] text-dash-text-muted">
                      + {unmapped.length - 12} more, smaller than the ones listed.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Reconciliation against the hand-maintained workbook. */}
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                  Stripe feed vs manual workbook
                </span>
                {comparableRecon.length > 0 && (
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 font-sans text-[11px] font-medium',
                      reconAllGood
                        ? 'bg-status-green-light text-status-green'
                        : 'bg-status-amber-light text-status-amber'
                    )}
                  >
                    {reconAllGood ? 'Reconciled' : 'Investigate'}
                  </span>
                )}
              </div>
              {comparableRecon.length === 0 ? (
                <p className="font-sans text-sm text-dash-text-muted">
                  No overlapping months to compare yet. Upload both the Stripe line-item extract and the
                  manual Net/Gross sheets to cross-check them.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left">
                    <thead>
                      <tr className="border-b border-dash-border">
                        <Th>Month</Th>
                        <Th align="right">Stripe gross</Th>
                        <Th align="right">Manual gross</Th>
                        <Th align="right">Δ gross</Th>
                        <Th align="right">Stripe net</Th>
                        <Th align="right">Manual net</Th>
                        <Th align="right">Δ net</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparableRecon.map(r => (
                        <tr key={r.month} className="border-b border-dash-border/60 last:border-0">
                          <td className="py-2 pr-3 font-sans text-[12px] text-dash-text">{r.label}</td>
                          <Td>{fmtCurrency(r.stripeGross)}</Td>
                          <Td>{fmtCurrency(r.manualGross)}</Td>
                          <Td className={Math.round(r.grossVariance) === 0 ? 'text-status-green' : 'text-status-amber'}>
                            {fmtCurrency(r.grossVariance)}
                          </Td>
                          <Td>{fmtCurrency(r.stripeNet)}</Td>
                          <Td>{fmtCurrency(r.manualNet)}</Td>
                          <Td className={Math.round(r.netVariance) === 0 ? 'text-status-green' : 'text-status-amber'}>
                            {fmtCurrency(r.netVariance)}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 font-sans text-[11px] text-dash-text-muted">
                Mirrors the workbook&apos;s own Reconciliation tab. &ldquo;Stripe net&rdquo; is charged
                (gross − discounts), the same basis as the workbook&apos;s Net row.
              </p>
            </div>
          </div>
        )}
      </NarrativeSection>

      {/* ────────────── 07 REVENUE BY MONTH ────────────── */}
      <NarrativeSection number={7} question="Revenue by Month" subtitle="Gross (RRP) · Net">
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
              Gross (RRP) vs Net Collected
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer>
                <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EFEDE8" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#737373' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v) || 0, { compact: true })} />
                  <Bar dataKey="gross" fill="#D9D6D0" name="Gross (RRP)" />
                  <Bar dataKey="net" fill="#7A1F22" name="Net collected" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex gap-4 font-ui text-[10px] uppercase tracking-wide text-dash-text-muted">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2" style={{ background: '#D9D6D0' }} />Gross (RRP)</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2" style={{ background: '#7A1F22' }} />Net collected</span>
            </div>
            <p className="mt-2 font-sans text-[11px] italic text-dash-text-muted">
              The gap between the bars is discount leakage. Net = after discounts.
            </p>
          </div>
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
              Net Revenue by Product
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer>
                <BarChart data={monthlyRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EFEDE8" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#737373' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v) || 0, { compact: true })} />
                  {PRODUCT_KEYS.map(k => (
                    <Bar key={k} dataKey={k} stackId="prod" fill={PRODUCT_COLORS[k]} name={PRODUCT_LABELS[k]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-ui text-[10px] uppercase tracking-wide text-dash-text-muted">
              {PRODUCT_KEYS.map(k => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2" style={{ background: PRODUCT_COLORS[k] }} />{PRODUCT_LABELS[k]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </NarrativeSection>

      {/* ────────────── 04 DISCOUNT DISCIPLINE ────────────── */}
      <NarrativeSection number={8} question="Discount Discipline" subtitle="Where are we leaking?">
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
              Revenue Capture Rate (Net ÷ Gross)
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer>
                <ComposedChart data={monthlyRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EFEDE8" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#737373' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={v => `${Math.round(v * 100)}%`} domain={[0, 1]} />
                  <Tooltip formatter={(v: unknown) => `${Math.round((Number(v) || 0) * 100)}%`} />
                  <Line type="monotone" dataKey="captureRate" stroke="#E61317" strokeWidth={2.5} dot={{ r: 4, fill: '#E61317' }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 font-sans text-[11px] italic text-dash-text-muted">
              Higher = better discount discipline. 100% means full RRP collected.
            </p>
          </div>
          <LockedCard title="Discount Band Distribution" reason="Needs per-charge discount (list_price − amount_paid). financial_revenue is daily aggregate, not per-transaction." />
        </div>
      </NarrativeSection>

      {/* ────────────── 05 CUMULATIVE MTD OVERLAY ────────────── */}
      <NarrativeSection
        number={9}
        question="Cumulative Month-to-Date"
        subtitle="Each month overlaid · current in bold"
        right={
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-dash-border bg-dash-surface px-3 py-1.5 font-ui text-[11px] uppercase tracking-wider text-dash-text-secondary hover:bg-dash-surface-hover">
              {availableMonths.length === 0
                ? 'No months'
                : `${visibleMonths.size} of ${availableMonths.length} months`}
              <ChevronDown size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
              <DropdownMenuItem
                onSelect={e => { e.preventDefault(); setSelectedMonths(allSelected ? new Set() : new Set(availableMonths)) }}
                className="font-ui text-[11px] uppercase tracking-wider text-dash-text-secondary"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {availableMonths.map(k => (
                <DropdownMenuCheckboxItem
                  key={k}
                  checked={visibleMonths.has(k)}
                  onSelect={e => e.preventDefault()}
                  onCheckedChange={() => toggleMonth(k)}
                >
                  {monthKeyLabel(k)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          {([
            { title: 'Net Collected', overlay: netOverlay, combined: netOverlayCombined },
            { title: 'Gross (RRP / list price)', overlay: grossOverlay, combined: grossOverlayCombined },
          ] as const).map(({ title, overlay, combined }) => {
            const shadeFor = (s: OverlaySeries, i: number) =>
              s.isCurrent ? '#E61317' : OVERLAY_GREYS[Math.max(0, OVERLAY_GREYS.length - (overlay.length - i))] ?? '#A3A3A3'
            return (
              <div key={title} className="rounded-lg border border-dash-border bg-dash-surface p-4">
                <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                  {title}
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer>
                    <LineChart data={combined} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#EFEDE8" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#737373' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v) || 0, { compact: true })} />
                      {overlay.map((s, i) => (
                        <Line
                          key={s.key}
                          type="monotone"
                          dataKey={s.key}
                          stroke={shadeFor(s, i)}
                          strokeWidth={s.isCurrent ? 3 : 1.5}
                          dot={false}
                          connectNulls={false}
                          name={`${s.m}${s.isCurrent ? ' (MTD)' : ''}`}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 font-ui text-[10px] uppercase tracking-wide text-dash-text-muted">
                  {overlay.map((s, i) => (
                    <span key={s.key} className={cn('flex items-center gap-1.5', s.isCurrent && 'font-bold text-dash-text')}>
                      <span className="inline-block h-0.5 w-4" style={{ background: shadeFor(s, i) }} />
                      {s.m}{s.isCurrent ? ' (MTD)' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </NarrativeSection>

      {/* ────────────── 06 RECURRING REVENUE & ARR ────────────── */}
      <NarrativeSection
        number={10}
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
                  <Bar dataKey="membership" fill="#E61317" name="Recurring (Membership)" />
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
            value={fmtCurrency(mtd.membership, { compact: true })}
            target={`${MONTH_LABELS[today.getMonth()]} to date · Membership`}
            status={mtd.membership > 0 ? 'green' : 'grey'}
            delta={null}
            chart={<TileChart data={monthlyRows.map(r => ({ date: r.m, value: r.membership }))} variant="line" formatValue={(n) => fmtCurrency(n, { compact: true })} />}
          />
          <MetricTile
            label="Implied ARR (Proxy)"
            value={fmtCurrency(mtd.membership * 12, { compact: true })}
            target="MTD membership × 12 · see caveat"
            status="amber"
            delta={null}
          />
          <MetricTile
            label="Recurring Share (MTD)"
            value={mtd.net > 0 ? `${Math.round((mtd.membership / mtd.net) * 100)}%` : '—'}
            target="Trending toward 50%+"
            status={mtd.net > 0 ? (mtd.membership / mtd.net >= 0.5 ? 'green' : 'amber') : 'grey'}
            delta={null}
            chart={<TileChart data={monthlyRows.map(r => ({ date: r.m, value: r.recurringPct * 100 }))} variant="line" formatValue={(n) => `${Math.round(n)}%`} />}
          />
        </div>
      </NarrativeSection>

      {/* ────────────── 07 NON-CORE REVENUE ────────────── */}
      <NarrativeSection number={11} question="Non-Core Revenue" subtitle="Stacks · supplements · peptides · advanced tests">
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
          <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
            Net Revenue from Non-Core Products
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={monthlyRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#EFEDE8" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#737373' }} />
                <YAxis tick={{ fontSize: 10, fill: '#737373' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v) || 0, { compact: true })} />
                {(['tmrw_stacks', 'supplements', 'peptides', 'advanced_tests'] as const).map(k => (
                  <Bar key={k} dataKey={k} stackId="nc" fill={PRODUCT_COLORS[k]} name={PRODUCT_LABELS[k]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-ui text-[10px] uppercase tracking-wide text-dash-text-muted">
            {(['tmrw_stacks', 'supplements', 'peptides', 'advanced_tests'] as const).map(k => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2" style={{ background: PRODUCT_COLORS[k] }} />{PRODUCT_LABELS[k]}
              </span>
            ))}
          </div>
          <p className="mt-2 font-sans text-[11px] italic text-dash-text-muted">
            Excludes Membership + Joining Fees. Net (post-discount) figures.
          </p>
        </div>
      </NarrativeSection>

      {/* ────────────── 08 ACTUAL VS FORECAST ────────────── */}
      <NarrativeSection
        number={12}
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
      <NarrativeSection number={13} question="Refunds & Failures" subtitle="Where revenue is leaking">
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          <LockedCard title="Failure Rate" reason="Stripe Invoices export has no failed-charge status. Needs Charges export." />
          <LockedCard title="Failure Codes (YTD)" reason="Drill-down enabled once Stripe Charges data lands." />
        </div>
      </NarrativeSection>

      {/* ────────────── 10 UNIT ECONOMICS ────────────── */}
      <NarrativeSection
        number={14}
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
        number={15}
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
                  {['Month', 'Gross (RRP)', 'Net', 'Capture %', 'Refunds', '# Txn', 'Fail %', 'AOV', 'MoM %'].map((h, i) => (
                    <th key={h} className={cn('px-3 py-3 font-ui text-[10px] uppercase tracking-wider font-medium', i === 0 ? 'text-left' : 'text-center')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row, i) => {
                  const prev = i > 0 ? monthlyRows[i - 1] : null
                  const mom = prev && prev.net > 0 ? ((row.net - prev.net) / prev.net) * 100 : null
                  return (
                    <tr key={row.key} className="border-b border-dash-border-subtle last:border-b-0">
                      <td className="px-3 py-3 text-left text-dash-text">{row.m} {row.year}</td>
                      <td className="px-3 py-3 text-center text-dash-text-secondary">{row.gross > 0 ? fmtCurrency(row.gross) : '—'}</td>
                      <td className="px-3 py-3 text-center text-dash-text">{fmtCurrency(row.net)}</td>
                      <td className="px-3 py-3 text-center text-dash-text-secondary">{row.captureRate === null ? '—' : `${Math.round(row.captureRate * 100)}%`}</td>
                      <td className="px-3 py-3 text-center text-dash-text-muted">—</td>
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
              Refunds and Fail % columns locked — pending Stripe Charges export. # Txn / AOV from Stripe invoices.
            </p>
          </div>
        )}
      </NarrativeSection>

      {/* ────────────── 12 PARKED ────────────── */}
      <NarrativeSection number={16} question="Parked" subtitle="What we can't show yet — and why">
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
        number={17}
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

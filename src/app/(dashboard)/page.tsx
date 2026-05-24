'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { AlertCard } from '@/components/dashboard/alert-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { StatusDot } from '@/components/dashboard/status-dot'
import { TrendIndicator } from '@/components/dashboard/trend-indicator'
import {
  DateRangePicker,
  defaultDateRangePicker,
  type DateRangePickerValue,
} from '@/components/dashboard/date-range-picker'
import { TileChart, bucketByDay } from '@/components/dashboard/tile-chart'
import { useDashboardData } from '@/lib/context/data-context'
import { cn } from '@/lib/utils'
import type { Status } from '@/lib/types'
import { Lock } from 'lucide-react'

/* ─── Tile primitives ─────────────────────────────────────────────── */

interface TileProps {
  label: string
  value: string
  target?: string
  delta?: { value: number; period?: string } | null
  status: Status
  direction?: 'higher-better' | 'lower-better'
  href?: string
  chart?: React.ReactNode
}

function MetricTile({ label, value, target, delta, status, direction = 'higher-better', href, chart }: TileProps) {
  const tileClass = cn(
    'flex h-full flex-col rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4 transition-all duration-150',
    href && 'hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px'
  )
  const inner = (
    <div className={tileClass}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary md:text-[11px]">
          {label}
        </span>
        <StatusDot status={status} />
      </div>
      <div className="mt-1 md:mt-2 flex items-baseline gap-2">
        <span className="font-mono text-lg font-bold tracking-[-0.01em] text-dash-text md:text-2xl">
          {value}
        </span>
        {delta !== null && delta !== undefined && (
          <TrendIndicator value={delta.value} direction={direction} />
        )}
      </div>
      {chart && <div className="mt-2">{chart}</div>}
      <div className="mt-auto pt-1.5 flex items-center justify-between text-[10px] text-dash-text-muted md:text-[11px]">
        {target ? <span>{target}</span> : <span />}
        {delta?.period && <span className="font-sans">{delta.period}</span>}
      </div>
    </div>
  )

  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner
}

function LockedTile({ label, target, reason }: { label: string; target?: string; reason: string }) {
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

function Column({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 md:space-y-3">
      <h3 className="font-ui text-[10px] font-medium uppercase tracking-[0.08em] text-dash-text-secondary">
        {heading}
      </h3>
      {children}
    </div>
  )
}

/* ─── Section wrapper ─────────────────────────────────────────────── */

function NarrativeSection({
  number,
  question,
  subtitle,
  children,
}: {
  number: number
  question: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 md:mb-4">
        <SectionHeading number={number} title={question} />
        <p className="ml-9 -mt-2 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted md:text-xs">
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  )
}

/* ─── Formatters / helpers ────────────────────────────────────────── */

const fmtCurrency = (n: number, opts: { compact?: boolean } = {}) =>
  opts.compact && Math.abs(n) >= 1000
    ? `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`
    : `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`

const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return isNaN(n) ? 0 : n
}

function inPeriod(value: unknown, start: Date, end: Date): boolean {
  if (!value) return false
  const t = new Date(String(value)).getTime()
  if (isNaN(t)) return false
  return t >= start.getTime() && t <= end.getTime()
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const {
    meta_ads,
    stripe,
    hubspot_contacts,
    ghl_opportunities,
    operational_data: _operational_data,
    plan_targets,
    lastRefresh,
    loading,
    error,
    refresh,
  } = useDashboardData()

  // Suppress unused-var warning — operational_data is wired in for PR D.
  void _operational_data

  // User-controlled date range picker (PR C). Independent state per page.
  const [pickerValue, setPickerValue] = useState<DateRangePickerValue>(() => defaultDateRangePicker())
  const periodStart = pickerValue.period.start
  const periodEnd = pickerValue.period.end
  const prevPeriodStart = pickerValue.comparison.start
  const prevPeriodEnd = pickerValue.comparison.end

  // Plan target for the current month (matched by first-of-month).
  const currentPlanTarget = useMemo(() => {
    return plan_targets.find(p => {
      const m = p.month ? new Date(String(p.month)) : null
      return m && !isNaN(m.getTime()) && isSameMonth(m, periodStart)
    }) ?? null
  }, [plan_targets, periodStart])

  /* ── Section 1 — Headline Growth ── */
  // 1.1 Registrations
  const customerRows = useMemo(
    () => hubspot_contacts.filter(r => r.lifecycle_stage === 'Customer'),
    [hubspot_contacts]
  )
  const registrationsCurrent = useMemo(
    () => customerRows.filter(r => inPeriod(r.customer_entered_at, periodStart, periodEnd)).length,
    [customerRows, periodStart, periodEnd]
  )
  const registrationsPrev = useMemo(
    () => customerRows.filter(r => inPeriod(r.customer_entered_at, prevPeriodStart, prevPeriodEnd)).length,
    [customerRows, prevPeriodStart, prevPeriodEnd]
  )
  const registrationsTarget = currentPlanTarget ? num(currentPlanTarget.registrations_target) : null
  const registrationsDelta = deltaPct(registrationsCurrent, registrationsPrev)

  // 1.2 Gross Revenue — sum stripe.amount_paid (cents) / 100, scoped to `created` in period.
  const grossRevenueCurrent = useMemo(
    () => stripe
      .filter(r => inPeriod(r.created, periodStart, periodEnd))
      .reduce((s, r) => s + num(r.amount_paid), 0) / 100,
    [stripe, periodStart, periodEnd]
  )
  const grossRevenuePrev = useMemo(
    () => stripe
      .filter(r => inPeriod(r.created, prevPeriodStart, prevPeriodEnd))
      .reduce((s, r) => s + num(r.amount_paid), 0) / 100,
    [stripe, prevPeriodStart, prevPeriodEnd]
  )
  const grossRevenueTarget = currentPlanTarget ? num(currentPlanTarget.gross_revenue_target) : null
  const grossRevenueDelta = deltaPct(grossRevenueCurrent, grossRevenuePrev)

  /* ── Section 2 — Scale ── */
  const totalCustomers = customerRows.length

  // D1: eScript Sent (lifetime count)
  const escriptCount = useMemo(
    () => customerRows.filter(r => r.escript_sent === true).length,
    [customerRows]
  )

  // Di1: Blood Dashboards Released (lifetime)
  const bloodDashboardCount = useMemo(
    () => customerRows.filter(r => r.blood_dashboard_published === true).length,
    [customerRows]
  )

  // In1: Epi Dashboards Released — count in current period
  const epiDashCurrent = useMemo(
    () => customerRows.filter(r =>
      r.epigenetics_dashboard_unlocked === true
      && inPeriod(r.epigenetics_dashboard_unlocked_date, periodStart, periodEnd)
    ).length,
    [customerRows, periodStart, periodEnd]
  )
  const epiDashPrev = useMemo(
    () => customerRows.filter(r =>
      r.epigenetics_dashboard_unlocked === true
      && inPeriod(r.epigenetics_dashboard_unlocked_date, prevPeriodStart, prevPeriodEnd)
    ).length,
    [customerRows, prevPeriodStart, prevPeriodEnd]
  )
  const epiDashDelta = deltaPct(epiDashCurrent, epiDashPrev)

  // In2: Time TruDiag → Epi (avg days)
  const avgDaysTruDiagToEpi = useMemo(() => {
    const usable = customerRows.filter(r =>
      r.results_available_date
      && r.epigenetics_dashboard_unlocked_date
      && inPeriod(r.epigenetics_dashboard_unlocked_date, periodStart, periodEnd)
    )
    if (usable.length === 0) return null
    const total = usable.reduce((s, r) => {
      const a = new Date(String(r.results_available_date)).getTime()
      const b = new Date(String(r.epigenetics_dashboard_unlocked_date)).getTime()
      if (isNaN(a) || isNaN(b)) return s
      return s + (b - a) / 86_400_000
    }, 0)
    return { avg: Math.round(total / usable.length), n: usable.length }
  }, [customerRows, periodStart, periodEnd])

  const avgDaysTruDiagToEpiPrev = useMemo(() => {
    const usable = customerRows.filter(r =>
      r.results_available_date
      && r.epigenetics_dashboard_unlocked_date
      && inPeriod(r.epigenetics_dashboard_unlocked_date, prevPeriodStart, prevPeriodEnd)
    )
    if (usable.length === 0) return null
    const total = usable.reduce((s, r) => {
      const a = new Date(String(r.results_available_date)).getTime()
      const b = new Date(String(r.epigenetics_dashboard_unlocked_date)).getTime()
      if (isNaN(a) || isNaN(b)) return s
      return s + (b - a) / 86_400_000
    }, 0)
    return total / usable.length
  }, [customerRows, prevPeriodStart, prevPeriodEnd])

  const in2Delta =
    avgDaysTruDiagToEpi && avgDaysTruDiagToEpiPrev !== null
      ? deltaPct(avgDaysTruDiagToEpi.avg, avgDaysTruDiagToEpiPrev)
      : null

  /* ── Section 3 — Retention ── */
  // Monthly Churn Rate (Formula B, cumulative naive)
  const churnCurrentCount = useMemo(
    () => customerRows.filter(r => inPeriod(r.churn_date, periodStart, periodEnd)).length,
    [customerRows, periodStart, periodEnd]
  )
  const churnPrevCount = useMemo(
    () => customerRows.filter(r => inPeriod(r.churn_date, prevPeriodStart, prevPeriodEnd)).length,
    [customerRows, prevPeriodStart, prevPeriodEnd]
  )
  const monthlyChurnRate = totalCustomers > 0 ? (churnCurrentCount / totalCustomers) * 100 : 0
  const prevChurnRate = totalCustomers > 0 ? (churnPrevCount / totalCustomers) * 100 : 0
  const churnDelta = deltaPct(monthlyChurnRate, prevChurnRate)

  /* ── Section 4 — Economics ── */
  const CALL_STAGES = new Set(['Call Booked', 'No Show', 'Call Attended', 'Won', 'Cancelled', 'Rescheduled'])

  // Meta spend by period (meta_ads.spend in $)
  const metaSpendCurrent = useMemo(
    () => meta_ads.filter(r => inPeriod(r.date, periodStart, periodEnd)).reduce((s, r) => s + num(r.spend), 0),
    [meta_ads, periodStart, periodEnd]
  )
  const metaSpendPrev = useMemo(
    () => meta_ads.filter(r => inPeriod(r.date, prevPeriodStart, prevPeriodEnd)).reduce((s, r) => s + num(r.spend), 0),
    [meta_ads, prevPeriodStart, prevPeriodEnd]
  )

  // Meta leads — conversions_leads from the workbook (falls back to LPV if absent)
  const metaLeadsCurrent = useMemo(
    () => meta_ads.filter(r => inPeriod(r.date, periodStart, periodEnd))
      .reduce((s, r) => s + (num(r.conversions_leads) || num(r.landing_page_views)), 0),
    [meta_ads, periodStart, periodEnd]
  )
  const metaLeadsPrev = useMemo(
    () => meta_ads.filter(r => inPeriod(r.date, prevPeriodStart, prevPeriodEnd))
      .reduce((s, r) => s + (num(r.conversions_leads) || num(r.landing_page_views)), 0),
    [meta_ads, prevPeriodStart, prevPeriodEnd]
  )

  // 4.1 Cost per Lead
  const costPerLead = metaLeadsCurrent > 0 ? metaSpendCurrent / metaLeadsCurrent : null
  const costPerLeadPrev = metaLeadsPrev > 0 ? metaSpendPrev / metaLeadsPrev : null
  const costPerLeadDelta = costPerLead !== null && costPerLeadPrev !== null
    ? deltaPct(costPerLead, costPerLeadPrev) : null

  // Calls booked per period — GHL opportunities at the call stages, by created_on
  const callsBookedCurrent = useMemo(
    () => ghl_opportunities.filter(r =>
      CALL_STAGES.has(String(r.stage ?? ''))
      && inPeriod(r.created_on, periodStart, periodEnd)
    ).length,
    [ghl_opportunities, periodStart, periodEnd]
  )
  const callsBookedPrev = useMemo(
    () => ghl_opportunities.filter(r =>
      CALL_STAGES.has(String(r.stage ?? ''))
      && inPeriod(r.created_on, prevPeriodStart, prevPeriodEnd)
    ).length,
    [ghl_opportunities, prevPeriodStart, prevPeriodEnd]
  )

  // 4.2 Cost per Call
  const costPerCall = callsBookedCurrent > 0 ? metaSpendCurrent / callsBookedCurrent : null
  const costPerCallPrev = callsBookedPrev > 0 ? metaSpendPrev / callsBookedPrev : null
  const costPerCallDelta = costPerCall !== null && costPerCallPrev !== null
    ? deltaPct(costPerCall, costPerCallPrev) : null

  // 4.3 Call Conversion Rate
  const callsWonCurrent = useMemo(
    () => ghl_opportunities.filter(r =>
      String(r.status ?? '').toLowerCase() === 'won'
      && inPeriod(r.created_on, periodStart, periodEnd)
    ).length,
    [ghl_opportunities, periodStart, periodEnd]
  )
  const callsWonPrev = useMemo(
    () => ghl_opportunities.filter(r =>
      String(r.status ?? '').toLowerCase() === 'won'
      && inPeriod(r.created_on, prevPeriodStart, prevPeriodEnd)
    ).length,
    [ghl_opportunities, prevPeriodStart, prevPeriodEnd]
  )
  const callConvRate = callsBookedCurrent > 0 ? (callsWonCurrent / callsBookedCurrent) * 100 : null
  const callConvRatePrev = callsBookedPrev > 0 ? (callsWonPrev / callsBookedPrev) * 100 : null
  const callConvDelta = callConvRate !== null && callConvRatePrev !== null
    ? deltaPct(callConvRate, callConvRatePrev) : null

  /* ── Sparkline series (one per active tile) ── */
  const registrationsSeries = useMemo(
    () => bucketByDay(customerRows, 'customer_entered_at', periodStart, periodEnd,
      (rows) => rows.length),
    [customerRows, periodStart, periodEnd]
  )
  const grossRevenueSeries = useMemo(
    () => bucketByDay(stripe, 'created', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.amount_paid), 0) / 100),
    [stripe, periodStart, periodEnd]
  )
  const epiDashSeries = useMemo(
    () => bucketByDay(customerRows, 'epigenetics_dashboard_unlocked_date', periodStart, periodEnd,
      (rows) => rows.filter(r => r.epigenetics_dashboard_unlocked === true).length),
    [customerRows, periodStart, periodEnd]
  )
  const churnSeries = useMemo(
    () => bucketByDay(customerRows, 'churn_date', periodStart, periodEnd,
      (rows) => rows.length),
    [customerRows, periodStart, periodEnd]
  )
  const costPerLeadSeries = useMemo(
    () => bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => {
        const spend = rows.reduce((s, r) => s + num(r.spend), 0)
        const leads = rows.reduce((s, r) => s + (num(r.conversions_leads) || num(r.landing_page_views)), 0)
        return leads > 0 ? spend / leads : 0
      }),
    [meta_ads, periodStart, periodEnd]
  )
  const costPerCallSeries = useMemo(
    () => bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => {
        const spend = rows.reduce((s, r) => s + num(r.spend), 0)
        // Per-day call count from GHL on the same date
        const day = rows[0]?.date as string | undefined
        if (!day) return 0
        const calls = ghl_opportunities.filter(o =>
          CALL_STAGES.has(String(o.stage ?? ''))
          && String(o.created_on ?? '').slice(0, 10) === day
        ).length
        return calls > 0 ? spend / calls : 0
      }),
    [meta_ads, ghl_opportunities, periodStart, periodEnd]
  )
  const callConvSeries = useMemo(
    () => bucketByDay(ghl_opportunities, 'created_on', periodStart, periodEnd,
      (rows) => {
        const calls = rows.filter(r => CALL_STAGES.has(String(r.stage ?? ''))).length
        const won = rows.filter(r => String(r.status ?? '').toLowerCase() === 'won').length
        return calls > 0 ? (won / calls) * 100 : 0
      }),
    [ghl_opportunities, periodStart, periodEnd]
  )

  /* ── Status helpers ── */
  const statusPctVsTarget = (actual: number, target: number, direction: 'higher-better' | 'lower-better' = 'higher-better'): Status => {
    if (!target) return 'grey'
    const ratio = actual / target
    if (direction === 'higher-better') {
      if (ratio >= 0.95) return 'green'
      if (ratio >= 0.75) return 'amber'
      return 'red'
    }
    if (ratio <= 1) return 'green'
    if (ratio <= 1.25) return 'amber'
    return 'red'
  }

  /* ── Alerts ── */
  const alerts = useMemo(() => {
    const out: Array<{ severity: 'high' | 'medium' | 'low'; title: string; href: string }> = []
    if (monthlyChurnRate > 5) {
      out.push({
        severity: 'high',
        title: `Monthly churn at ${monthlyChurnRate.toFixed(1)}% exceeds 5% guardrail.`,
        href: '/retention',
      })
    }
    if (costPerLead !== null && costPerLead > 80) {
      out.push({
        severity: 'medium',
        title: `Cost per Lead at ${fmtCurrency(costPerLead)} exceeds $80 ceiling.`,
        href: '/marketing',
      })
    }
    if (costPerCall !== null && costPerCall > 300) {
      out.push({
        severity: 'medium',
        title: `Cost per Call at ${fmtCurrency(costPerCall)} exceeds $300 ceiling.`,
        href: '/marketing',
      })
    }
    return out
  }, [monthlyChurnRate, costPerLead, costPerCall])

  /* ── Source freshness footer — iterate the NEW source keys ── */
  const sourceFreshness = (['hubspot_contacts', 'stripe', 'ghl_opportunities', 'meta_ads', 'operational_data'] as const).map(source => {
    const ts = lastRefresh[source]
    const days = ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 86_400_000) : null
    const label = ts ? new Date(ts).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }) : 'Never'
    const status: Status = days === null ? 'red' : days > 14 ? 'red' : days > 7 ? 'amber' : 'green'
    return { source, label, days, status }
  })

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Breadcrumb items={[{ label: 'Dashboard' }]} />
        <DateRangePicker value={pickerValue} onChange={setPickerValue} />
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-status-red/30 bg-status-red/5 px-4 py-3">
          <p className="font-sans text-sm text-status-red">
            Could not load dashboard data: {error}
          </p>
          <button
            onClick={() => { refresh() }}
            className="ml-4 rounded border border-status-red/40 px-3 py-1 font-sans text-xs text-status-red hover:bg-status-red/10"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !error && (
        <div className="rounded-lg border border-dash-border bg-dash-bg/60 px-4 py-3">
          <p className="font-sans text-sm text-dash-text-muted">Loading latest data…</p>
        </div>
      )}

      {/* ────────────────── Section 1 — Want ────────────────── */}
      <NarrativeSection number={1} question="Do people want it?" subtitle="Headline Growth">
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
          <MetricTile
            label="Registrations"
            value={registrationsTarget
              ? `${registrationsCurrent} / ${registrationsTarget}`
              : String(registrationsCurrent)}
            target={registrationsTarget
              ? `target ${registrationsTarget} this month`
              : 'no target set'}
            status={registrationsTarget
              ? statusPctVsTarget(registrationsCurrent, registrationsTarget)
              : (registrationsCurrent > 0 ? 'green' : 'grey')}
            delta={registrationsDelta === null ? null : { value: Math.round(registrationsDelta), period: 'vs previous' }}
            href="/members"
            chart={<TileChart data={registrationsSeries} />}
          />
          <MetricTile
            label="Gross Revenue"
            value={grossRevenueCurrent > 0
              ? fmtCurrency(grossRevenueCurrent, { compact: true })
              : '—'}
            target={grossRevenueTarget
              ? `target ${fmtCurrency(grossRevenueTarget, { compact: true })}`
              : 'this month'}
            status={grossRevenueTarget
              ? statusPctVsTarget(grossRevenueCurrent, grossRevenueTarget)
              : (grossRevenueCurrent > 0 ? 'green' : 'grey')}
            delta={grossRevenueDelta === null ? null : { value: Math.round(grossRevenueDelta), period: 'vs previous' }}
            href="/financial"
            chart={<TileChart data={grossRevenueSeries} formatValue={(n) => fmtCurrency(n, { compact: true })} />}
          />
          <LockedTile
            label="Net Revenue"
            reason="Requires refund data — pending Stripe refunds export"
          />
          <LockedTile
            label="MRR"
            reason="Pending MRR derivation from billing_reason='subscription_cycle' invoices"
          />
        </div>
      </NarrativeSection>

      {/* ────────────────── Section 2 — Scale ────────────────── */}
      <NarrativeSection number={2} question="Can we scale it?" subtitle="Clinical & Operational Throughput">
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-3 md:gap-4">
          <Column heading="Discovery">
            <MetricTile
              label="eScript Sent · Lifetime"
              value={String(escriptCount)}
              target={totalCustomers > 0
                ? `${escriptCount} of ${totalCustomers} (${Math.round((escriptCount / totalCustomers) * 100)}%)`
                : 'Lifetime count'}
              status="grey"
              delta={null}
            />
            <LockedTile
              label="Time HS → Pods"
              reason="Pending — CP Order Date vs CP Shipped Date clarification from Dan"
            />
          </Column>
          <Column heading="Diagnostic">
            <MetricTile
              label="Blood Dashboards · Lifetime"
              value={String(bloodDashboardCount)}
              target={totalCustomers > 0
                ? `${bloodDashboardCount} of ${totalCustomers} (${Math.round((bloodDashboardCount / totalCustomers) * 100)}%)`
                : 'Lifetime count'}
              status="grey"
              delta={null}
            />
            <LockedTile
              label="Time Blood Results → Dashboard"
              reason="Pending — no usable date pair in HubSpot fields. Awaiting Dan."
            />
          </Column>
          <Column heading="Integrative">
            <MetricTile
              label="Epi Dashboards Released"
              value={String(epiDashCurrent)}
              target="period total"
              status="grey"
              delta={epiDashDelta === null ? null : { value: Math.round(epiDashDelta), period: 'vs previous' }}
              chart={<TileChart data={epiDashSeries} />}
            />
            <MetricTile
              label="Time TruDiag → Epi"
              value={avgDaysTruDiagToEpi ? `${avgDaysTruDiagToEpi.avg}d` : '—'}
              target={avgDaysTruDiagToEpi ? `Across ${avgDaysTruDiagToEpi.n} customers` : 'Need both dates populated'}
              status="grey"
              direction="lower-better"
              delta={in2Delta === null ? null : { value: Math.round(in2Delta), period: 'vs last month' }}
            />
          </Column>
        </div>
      </NarrativeSection>

      {/* ────────────────── Section 3 — Stay ────────────────── */}
      <NarrativeSection number={3} question="Can we prove people stay?" subtitle="Retention & Sentiment">
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
          <MetricTile
            label="Monthly Churn Rate"
            value={totalCustomers === 0 ? '—' : `${monthlyChurnRate.toFixed(1)}%`}
            target="target <5%"
            status={
              totalCustomers === 0 ? 'grey'
              : monthlyChurnRate <= 5 ? 'green'
              : monthlyChurnRate <= 8 ? 'amber' : 'red'
            }
            direction="lower-better"
            delta={churnDelta === null ? null : { value: Math.round(churnDelta), period: 'vs previous' }}
            href="/retention"
            chart={<TileChart data={churnSeries} variant="line" />}
          />
          <LockedTile
            label="90-Day Retention"
            reason="Insufficient cohort data — oldest customer is ~60 days old. First eligible cohort: late June 2026."
          />
          <LockedTile
            label="NPS"
            reason="Requires survey source"
          />
          <LockedTile
            label="CSAT"
            reason="Requires support tool integration"
          />
        </div>
      </NarrativeSection>

      {/* ────────────────── Section 4 — Economics ────────────────── */}
      <NarrativeSection number={4} question="Are the economics right?" subtitle="Acquisition & Unit Economics">
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-5">
          <MetricTile
            label="Cost per Lead"
            value={costPerLead === null ? '—' : fmtCurrency(costPerLead)}
            target="target <$50"
            status={
              costPerLead === null ? 'grey'
              : costPerLead <= 50 ? 'green'
              : costPerLead <= 80 ? 'amber' : 'red'
            }
            direction="lower-better"
            delta={costPerLeadDelta === null ? null : { value: Math.round(costPerLeadDelta), period: 'vs previous' }}
            href="/marketing"
            chart={<TileChart data={costPerLeadSeries} variant="line" formatValue={(n) => fmtCurrency(n)} />}
          />
          <MetricTile
            label="Cost per Call"
            value={costPerCall === null ? '—' : fmtCurrency(costPerCall)}
            target="target <$200"
            status={
              costPerCall === null ? 'grey'
              : costPerCall <= 200 ? 'green'
              : costPerCall <= 300 ? 'amber' : 'red'
            }
            direction="lower-better"
            delta={costPerCallDelta === null ? null : { value: Math.round(costPerCallDelta), period: 'vs previous' }}
            href="/marketing"
            chart={<TileChart data={costPerCallSeries} variant="line" formatValue={(n) => fmtCurrency(n)} />}
          />
          <MetricTile
            label="Call Conversion Rate"
            value={callConvRate === null ? '—' : `${callConvRate.toFixed(1)}%`}
            target="period total"
            status="grey"
            delta={callConvDelta === null ? null : { value: Math.round(callConvDelta), period: 'vs previous' }}
            href="/marketing"
            chart={<TileChart data={callConvSeries} variant="line" formatValue={(n) => `${n.toFixed(1)}%`} />}
          />
          <LockedTile
            label="Cost per Conversion"
            reason="Pending Dan — same as Cost per Lead under Meta's definition. Awaiting redefinition as CAC."
          />
          <LockedTile
            label="Facebook Followers"
            reason="Awaiting social_followers in /api/data/latest"
          />
        </div>
      </NarrativeSection>

      {/* ────────────────── Section 5 — Works ────────────────── */}
      <NarrativeSection number={5} question="Can we prove it works?" subtitle="Health Improvement">
        <div className="grid grid-cols-1 gap-2 md:gap-3 lg:grid-cols-3">
          <LockedTile
            label="Omic Age Improvement"
            target="target -2yr at 12mo"
            reason="Locked — Oracle data source pending"
          />
          <LockedTile
            label="TMRW Score Improvement"
            target="target +15 pts at 12mo"
            reason="Locked — Oracle data source pending"
          />
          <LockedTile
            label="Pace of Aging Improvement"
            target="target <0.95"
            reason="Locked — Oracle data source pending"
          />
        </div>
      </NarrativeSection>

      {/* ────────────────── Critical Alerts ────────────────── */}
      {alerts.length > 0 && (
        <section>
          <SectionHeading number={6} title="Critical Alerts — Action This Week" />
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <AlertCard key={i} severity={a.severity} title={a.title} link={{ label: 'View', href: a.href }} />
            ))}
          </div>
        </section>
      )}

      {/* ────────────────── Last Data Refresh ────────────────── */}
      <section>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dash-text-muted">
          <span className="font-medium uppercase tracking-wider text-[10px]">Last refresh:</span>
          {sourceFreshness.map(s => (
            <span key={s.source} className="flex items-center gap-1.5">
              <StatusDot status={s.status} size="sm" />
              <span className="capitalize">{s.source.replace(/_/g, ' ')}:</span>
              <span className={cn(
                s.status === 'red' ? 'text-status-red' : s.status === 'amber' ? 'text-status-amber' : ''
              )}>
                {s.label}{s.days !== null && ` (${s.days}d ago)`}
              </span>
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}

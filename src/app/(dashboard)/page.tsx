'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { AlertCard } from '@/components/dashboard/alert-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { StatusDot } from '@/components/dashboard/status-dot'
import { TrendIndicator } from '@/components/dashboard/trend-indicator'
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
}

function MetricTile({ label, value, target, delta, status, direction = 'higher-better', href }: TileProps) {
  const tileClass = cn(
    'flex h-full flex-col rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4 transition-all duration-150',
    href && 'hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px'
  )
  const inner = (
    <div className={tileClass}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary md:text-[11px]">
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
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-muted md:text-[11px]">
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
        <p className="ml-9 -mt-2 font-sans text-[11px] uppercase tracking-[0.08em] text-dash-text-muted md:text-xs">
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  )
}

/* ─── Formatters ──────────────────────────────────────────────────── */

const fmtCurrency = (n: number, opts: { compact?: boolean } = {}) =>
  opts.compact && Math.abs(n) >= 1000
    ? `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`
    : `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`

const fmtPct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`

const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return isNaN(n) ? 0 : n
}

/* ─── Page ────────────────────────────────────────────────────────── */

const Q1_TARGET_NEW_MEMBERS = 183

export default function DashboardPage() {
  const {
    meta,
    stripe,
    hubspot,
    pelagonia,
    zendesk,
    lastRefresh,
    dataMode,
    loading,
    error,
    refresh,
  } = useDashboardData()

  /* ── Section 1: Headline Growth ── */
  // Active Members: hubspot rows whose case_status is not closed/inactive.
  const activeMembersCount = useMemo(
    () => hubspot.filter(r => {
      const s = String(r.case_status ?? '').toLowerCase()
      return s !== 'closed' && s !== 'inactive'
    }).length,
    [hubspot]
  )
  const newMembersThisPeriod = activeMembersCount
  const newMembersPct = Q1_TARGET_NEW_MEMBERS > 0 ? newMembersThisPeriod / Q1_TARGET_NEW_MEMBERS : 0

  // TODO(canonical): MRR has no canonical column. Foundations membership is a
  // recurring Stripe charge but classification (subscription vs one-off) lived
  // in the old client-side processor and isn't preserved on Stripe rows.
  // Leaving as null until a recurring-revenue signal is added to the schema.
  const totalMRR: number | null = null

  // Total Revenue: sum succeeded Stripe charges. Stripe CSV exports `Amount`
  // in major units (dollars), not cents — store and sum as-is.
  const totalRevenue = useMemo(
    () => stripe
      .filter(r => String(r.status ?? '').toLowerCase() === 'succeeded')
      .reduce((s, r) => s + num(r.amount), 0),
    [stripe]
  )

  /* ── Section 2: Scale ── */
  const totalMembers = hubspot.length

  // Health Story Completion: hubspot.health_story_complete is the boolean.
  const healthStoryComplete = useMemo(
    () => hubspot.filter(r => r.health_story_complete === true).length,
    [hubspot]
  )
  const healthStoryRate = totalMembers > 0 ? healthStoryComplete / totalMembers : 0

  // Dashboard Unlock Rate: hubspot.dashboard_unlocked boolean.
  const dashboardUnlocked = useMemo(
    () => hubspot.filter(r => r.dashboard_unlocked === true).length,
    [hubspot]
  )
  const dashboardUnlockRate = totalMembers > 0 ? dashboardUnlocked / totalMembers : 0

  // TODO(canonical): "Stalled" required journey-stage classification
  // (awaiting-results AND not unlocked). journey-stage was a derived field on
  // the old Member type. Proxy below: has a lab_batch_tracking_number but
  // dashboard not unlocked. Surface as TODO — proxy may over- or under-count.
  const stalledMembers = useMemo(
    () => hubspot.filter(r =>
      r.dashboard_unlocked !== true
      && !!r.lab_batch_tracking_number
    ).length,
    [hubspot]
  )

  // TODO(canonical): Insights Calls Completed required the derived journey
  // stages 'insights-call-complete' or 'active-plan'. No canonical column
  // captures this — kept at null until a source column is identified.
  const insightsCalls: number | null = null

  // Avg Days to Dashboard: hubspot_created_at → dashboard_unlocked_at, days.
  const avgDaysToDashboard = useMemo(() => {
    const unlocked = hubspot.filter(r => r.dashboard_unlocked_at && r.hubspot_created_at)
    if (unlocked.length === 0) return null
    const total = unlocked.reduce((s, r) => {
      const a = new Date(String(r.hubspot_created_at)).getTime()
      const b = new Date(String(r.dashboard_unlocked_at)).getTime()
      if (isNaN(a) || isNaN(b)) return s
      return s + (b - a) / 86_400_000
    }, 0)
    return Math.round(total / unlocked.length)
  }, [hubspot])

  /* ── Section 4: Retention ── */
  // 90-Day Retention: rows registered ≥90 days ago, whose case_status is not closed.
  const ninetyDayRetention = useMemo(() => {
    const now = Date.now()
    const eligible = hubspot.filter(r => {
      const t = new Date(String(r.hubspot_created_at ?? '')).getTime()
      return !isNaN(t) && (now - t) / 86_400_000 >= 90
    })
    if (eligible.length === 0) return null
    const retained = eligible.filter(r => String(r.case_status ?? '').toLowerCase() !== 'closed').length
    return retained / eligible.length
  }, [hubspot])

  // TODO(canonical): "Churned" was derived (journey-stage === 'churned').
  // Using case_status === 'closed' as a proxy — semantically broader; flagged.
  const churnedCount = useMemo(
    () => hubspot.filter(r => String(r.case_status ?? '').toLowerCase() === 'closed').length,
    [hubspot]
  )
  const monthlyChurnRate = totalMembers > 0 ? churnedCount / totalMembers : 0

  // CSAT: average of zendesk.satisfaction_score where present.
  const avgCSAT = useMemo(() => {
    const scored = zendesk.filter(r => r.satisfaction_score !== null && r.satisfaction_score !== undefined)
    if (scored.length === 0) return null
    return scored.reduce((s, r) => s + num(r.satisfaction_score), 0) / scored.length
  }, [zendesk])

  /* ── Section 5: Economics ── */
  // Total Ad Spend: sum meta.spend_aud.
  const totalMetaSpend = useMemo(
    () => meta.reduce((s, r) => s + num(r.spend_aud), 0),
    [meta]
  )

  // Cost per Lead: spend / sum(results || landing_page_views).
  const totalLeads = useMemo(
    () => meta.reduce((s, r) => s + (num(r.results) || num(r.landing_page_views)), 0),
    [meta]
  )
  const costPerLead = totalLeads > 0 ? totalMetaSpend / totalLeads : null

  // Blended CAC: spend / count of hubspot rows whose record_type is "Customer".
  const newCustomers = useMemo(
    () => hubspot.filter(r => {
      const t = String(r.record_type ?? '').toLowerCase()
      return t === 'customer'
    }).length,
    [hubspot]
  )
  const derivedCAC = totalMetaSpend > 0 && newCustomers > 0 ? Math.round(totalMetaSpend / newCustomers) : null

  // Calls Booked: pelagonia rows that look like appointments (record_type
  // 'appointment' or have appointment_date). Falls back to row count.
  const callsBooked = useMemo(() => {
    const appts = pelagonia.filter(r =>
      String(r.record_type ?? '').toLowerCase() === 'appointment'
      || !!r.appointment_date
    ).length
    return appts > 0 ? appts : pelagonia.length
  }, [pelagonia])

  const costPerBookedCall = callsBooked > 0 && totalMetaSpend > 0 ? totalMetaSpend / callsBooked : null

  /* ── Alerts (recomputed live) ── */
  const alerts = useMemo(() => {
    const out: Array<{ severity: 'high' | 'medium' | 'low'; title: string; href: string }> = []
    if (stalledMembers > 20) {
      out.push({
        severity: 'high',
        title: `${stalledMembers} members stuck awaiting results. Queue is the Pit of Despair — clear it before it grows.`,
        href: '/clinical',
      })
    }
    if (avgDaysToDashboard !== null && avgDaysToDashboard > 60) {
      out.push({
        severity: 'medium',
        title: `Average ${avgDaysToDashboard} days from registration to dashboard. Target is <45.`,
        href: '/clinical',
      })
    }
    if (derivedCAC !== null && derivedCAC > 150) {
      out.push({
        severity: 'medium',
        title: `Blended CAC at ${fmtCurrency(derivedCAC)} exceeds $150 ceiling.`,
        href: '/marketing',
      })
    }
    if (monthlyChurnRate > 0.05) {
      out.push({
        severity: 'medium',
        title: `Monthly churn at ${fmtPct(monthlyChurnRate, 1)} exceeds 5% guardrail.`,
        href: '/retention',
      })
    }
    return out
  }, [stalledMembers, avgDaysToDashboard, derivedCAC, monthlyChurnRate])

  /* ── Source freshness footer ── */
  const sourceFreshness = Object.entries(lastRefresh).map(([source, ts]) => {
    const days = ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 86_400_000) : null
    const label = ts ? new Date(ts).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }) : 'Never'
    const status: Status = days === null ? 'red' : days > 14 ? 'red' : days > 7 ? 'amber' : 'green'
    return { source, label, days, status }
  })

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

  const isEmpty = (n: number | null | undefined) => n === null || n === undefined || n === 0

  return (
    <div className="space-y-6 md:space-y-10">
      <Breadcrumb items={[{ label: 'Dashboard' }]} />

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

      {dataMode === 'demo' && (
        <div className="rounded-lg border border-status-amber/30 bg-status-amber/5 px-4 py-3">
          <p className="font-sans text-sm text-status-amber">
            Showing demo data —{' '}
            <Link href="/admin/upload" className="font-medium underline">upload real data</Link>{' '}
            or switch to Actual mode in Settings.
          </p>
        </div>
      )}

      {/* ────────────────── Section 1 ────────────────── */}
      <NarrativeSection number={1} question="Do people want it?" subtitle="Headline Growth">
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
          <MetricTile
            label="New Members vs Plan"
            value={`${newMembersThisPeriod} / ${Q1_TARGET_NEW_MEMBERS}`}
            target={`target ${Q1_TARGET_NEW_MEMBERS} by Q1`}
            status={statusPctVsTarget(newMembersThisPeriod, Q1_TARGET_NEW_MEMBERS)}
            delta={{ value: Math.round((newMembersPct - 1) * 100), period: 'vs plan' }}
          />
          <MetricTile
            label="MRR"
            value={totalMRR === null ? '—' : fmtCurrency(totalMRR, { compact: true })}
            target="target $50K"
            status={totalMRR === null ? 'grey' : statusPctVsTarget(totalMRR, 50_000)}
            delta={null}
          />
          <MetricTile
            label="Total Revenue"
            value={isEmpty(totalRevenue) ? '—' : fmtCurrency(totalRevenue, { compact: true })}
            target="cumulative this period"
            status={totalRevenue > 0 ? 'green' : 'grey'}
            delta={null}
          />
          <MetricTile
            label="Active Members"
            value={String(activeMembersCount)}
            target={`target ${Q1_TARGET_NEW_MEMBERS}`}
            status={statusPctVsTarget(activeMembersCount, Q1_TARGET_NEW_MEMBERS)}
            delta={null}
          />
        </div>
      </NarrativeSection>

      {/* ────────────────── Section 2 ────────────────── */}
      <NarrativeSection number={2} question="Can we scale it?" subtitle="Clinical & Operational Throughput">
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-5">
          <MetricTile
            label="Health Story Completion"
            value={totalMembers === 0 ? '—' : fmtPct(healthStoryRate)}
            target="target >85%"
            status={healthStoryRate >= 0.85 ? 'green' : healthStoryRate >= 0.7 ? 'amber' : totalMembers > 0 ? 'red' : 'grey'}
            delta={null}
          />
          <MetricTile
            label="Dashboard Unlock Rate"
            value={totalMembers === 0 ? '—' : fmtPct(dashboardUnlockRate)}
            target="target >70%"
            status={dashboardUnlockRate >= 0.7 ? 'green' : dashboardUnlockRate >= 0.5 ? 'amber' : totalMembers > 0 ? 'red' : 'grey'}
            delta={null}
          />
          <MetricTile
            label="Stalled (Pit of Despair)"
            value={String(stalledMembers)}
            target="target <10"
            status={stalledMembers <= 10 ? 'green' : stalledMembers <= 25 ? 'amber' : 'red'}
            direction="lower-better"
            delta={null}
          />
          <MetricTile
            label="Insights Calls Completed"
            value={insightsCalls === null ? '—' : String(insightsCalls)}
            target="cumulative"
            status={insightsCalls === null ? 'grey' : insightsCalls > 0 ? 'green' : 'grey'}
            delta={null}
          />
          <MetricTile
            label="Avg Days to Dashboard"
            value={avgDaysToDashboard === null ? '—' : `${avgDaysToDashboard}d`}
            target="target <45d"
            status={
              avgDaysToDashboard === null ? 'grey'
              : avgDaysToDashboard <= 45 ? 'green'
              : avgDaysToDashboard <= 75 ? 'amber' : 'red'
            }
            direction="lower-better"
            delta={null}
          />
        </div>
      </NarrativeSection>

      {/* ────────────────── Section 3 ────────────────── */}
      <NarrativeSection number={3} question="Can we prove it works?" subtitle="Health Improvement">
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
          <LockedTile label="Omic Age Improvement" target="target -2yr at 12mo" reason="Coming soon — source pending" />
          <LockedTile label="TMRW Score Improvement" target="target +15 pts at 12mo" reason="Coming soon — source pending" />
          <LockedTile label="Pace of Aging Improvement" target="target <0.95" reason="Coming soon — source pending" />
          <LockedTile label="Biomarker Improvement Rate" target="target >60%" reason="Requires Oracle Clinical export" />
        </div>
      </NarrativeSection>

      {/* ────────────────── Section 4 ────────────────── */}
      <NarrativeSection number={4} question="Can we prove people stay?" subtitle="Retention & Sentiment">
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
          <MetricTile
            label="90-Day Retention"
            value={ninetyDayRetention === null ? '—' : fmtPct(ninetyDayRetention)}
            target="target >85%"
            status={
              ninetyDayRetention === null ? 'grey'
              : ninetyDayRetention >= 0.85 ? 'green'
              : ninetyDayRetention >= 0.7 ? 'amber' : 'red'
            }
            delta={null}
          />
          <MetricTile
            label="Monthly Churn Rate"
            value={totalMembers === 0 ? '—' : fmtPct(monthlyChurnRate, 1)}
            target="target <5%"
            status={
              totalMembers === 0 ? 'grey'
              : monthlyChurnRate <= 0.05 ? 'green'
              : monthlyChurnRate <= 0.08 ? 'amber' : 'red'
            }
            direction="lower-better"
            delta={null}
          />
          <LockedTile label="NPS Score" target="target >40" reason="Coming soon — source pending" />
          <MetricTile
            label="CSAT Score"
            value={avgCSAT === null ? '—' : avgCSAT.toFixed(1)}
            target="target >4.5"
            status={
              avgCSAT === null ? 'grey'
              : avgCSAT >= 4.5 ? 'green'
              : avgCSAT >= 4 ? 'amber' : 'red'
            }
            delta={null}
          />
        </div>
      </NarrativeSection>

      {/* ────────────────── Section 5 ────────────────── */}
      <NarrativeSection number={5} question="Are the economics right?" subtitle="Acquisition & Unit Economics">
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-5">
          <MetricTile
            label="Total Ad Spend (Meta)"
            value={isEmpty(totalMetaSpend) ? '—' : fmtCurrency(totalMetaSpend, { compact: true })}
            target="period to date"
            status={totalMetaSpend > 0 ? 'green' : 'grey'}
            delta={null}
          />
          <MetricTile
            label="Blended CAC"
            value={derivedCAC === null ? '—' : fmtCurrency(derivedCAC)}
            target="target <$150"
            status={
              derivedCAC === null ? 'grey'
              : derivedCAC <= 150 ? 'green'
              : derivedCAC <= 200 ? 'amber' : 'red'
            }
            direction="lower-better"
            delta={null}
          />
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
            delta={null}
          />
          <MetricTile
            label="Calls Booked"
            value={String(callsBooked)}
            target="period to date"
            status={callsBooked > 0 ? 'green' : 'grey'}
            delta={null}
          />
          <MetricTile
            label="Cost per Booked Call"
            value={costPerBookedCall === null ? '—' : fmtCurrency(costPerBookedCall)}
            target="target <$200"
            status={
              costPerBookedCall === null ? 'grey'
              : costPerBookedCall <= 200 ? 'green'
              : costPerBookedCall <= 300 ? 'amber' : 'red'
            }
            direction="lower-better"
            delta={null}
          />
        </div>
      </NarrativeSection>

      {/* ────────────────── Critical Alerts (below narrative) ────────────────── */}
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

      {/* ────────────────── Runway strip ────────────────── */}
      <section>
        <div className="rounded-md border border-dashed border-dash-border bg-dash-surface/40 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2 text-dash-text-muted">
            <Lock size={11} />
            <span className="font-medium uppercase tracking-wider text-[10px]">Runway</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-dash-text-muted">Cash Position:</span>
            <span className="font-mono text-dash-text-muted">—</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-dash-text-muted">Months of Runway:</span>
            <span className="font-mono text-dash-text-muted">—</span>
          </div>
          <Link href="/admin/manual" className="ml-auto text-[11px] text-dash-text-muted italic hover:text-dash-red hover:underline">
            Pending manual entry →
          </Link>
        </div>
      </section>

      {/* ────────────────── Last Data Refresh ────────────────── */}
      <section>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dash-text-muted">
          <span className="font-medium uppercase tracking-wider text-[10px]">Last refresh:</span>
          {sourceFreshness.map(s => (
            <span key={s.source} className="flex items-center gap-1.5">
              <StatusDot status={s.status} size="sm" />
              <span className="capitalize">{s.source}:</span>
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

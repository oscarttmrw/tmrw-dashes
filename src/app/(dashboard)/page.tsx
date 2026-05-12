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
  const inner = (
    <div className="flex h-full flex-col rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4 transition-all duration-150 hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px">
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

/* ─── Page ────────────────────────────────────────────────────────── */

const Q1_TARGET_NEW_MEMBERS = 183

export default function DashboardPage() {
  const {
    members,
    transactions,
    tickets,
    metaAds,
    pelagoniaOpportunities,
    derivedCAC,
    lastRefreshed,
    dataMode,
  } = useDashboardData()

  /* ── Section 1: Headline Growth ── */
  const activeMembers = useMemo(
    () => members.filter(m => m.caseStatus !== 'Closed' && m.journeyStage !== 'churned' && m.journeyStage !== 'inactive'),
    [members]
  )
  const newMembersThisPeriod = activeMembers.length
  const newMembersPct = Q1_TARGET_NEW_MEMBERS > 0 ? newMembersThisPeriod / Q1_TARGET_NEW_MEMBERS : 0
  const totalMRR = useMemo(() => members.reduce((s, m) => s + (m.mrr || 0), 0), [members])
  const totalRevenue = useMemo(
    () => transactions.reduce((s, t) => s + (Number((t as { amount?: number }).amount) || 0), 0),
    [transactions]
  )

  /* ── Section 2: Scale ── */
  const totalMembers = members.length
  const healthStoryComplete = useMemo(
    () => members.filter(m => m.journeyStage !== 'registered').length,
    [members]
  )
  const healthStoryRate = totalMembers > 0 ? healthStoryComplete / totalMembers : 0
  const dashboardUnlocked = useMemo(() => members.filter(m => m.dashboardUnlocked).length, [members])
  const dashboardUnlockRate = totalMembers > 0 ? dashboardUnlocked / totalMembers : 0
  const stalledMembers = useMemo(
    () => members.filter(m => m.journeyStage === 'awaiting-results' && !m.dashboardUnlocked).length,
    [members]
  )
  const insightsCalls = useMemo(
    () => members.filter(m => m.journeyStage === 'insights-call-complete' || m.journeyStage === 'active-plan').length,
    [members]
  )
  const avgDaysToDashboard = useMemo(() => {
    const unlocked = members.filter(m => m.dashboardUnlockedAt && m.createdAt)
    if (unlocked.length === 0) return null
    const total = unlocked.reduce((s, m) => {
      const days = (new Date(m.dashboardUnlockedAt!).getTime() - new Date(m.createdAt).getTime()) / 86_400_000
      return s + days
    }, 0)
    return Math.round(total / unlocked.length)
  }, [members])

  /* ── Section 4: Retention ── */
  const churnedCount = useMemo(() => members.filter(m => m.journeyStage === 'churned').length, [members])
  const monthlyChurnRate = totalMembers > 0 ? churnedCount / totalMembers : 0
  const avgCSAT = useMemo(() => {
    const withCsat = members.filter(m => m.csat !== null && m.csat !== undefined) as Array<{ csat: number }>
    if (withCsat.length === 0) {
      const ticketCsats = (tickets as Array<{ csat?: number | null }>).filter(t => t.csat != null) as Array<{ csat: number }>
      if (ticketCsats.length === 0) return null
      return ticketCsats.reduce((s, t) => s + t.csat, 0) / ticketCsats.length
    }
    return withCsat.reduce((s, m) => s + m.csat, 0) / withCsat.length
  }, [members, tickets])
  const ninetyDayRetention = useMemo(() => {
    const eligible = members.filter(m => m.daysSinceRegistration >= 90)
    if (eligible.length === 0) return null
    const retained = eligible.filter(m => m.journeyStage !== 'churned' && m.caseStatus !== 'Closed').length
    return retained / eligible.length
  }, [members])

  /* ── Section 5: Economics ── */
  const totalMetaSpend = useMemo(() => metaAds.reduce((s, a) => s + (a.spend || 0), 0), [metaAds])
  const totalLeads = useMemo(
    () => metaAds.reduce((s, a) => s + (a.conversions || a.landingPageViews || 0), 0),
    [metaAds]
  )
  const costPerLead = totalLeads > 0 ? totalMetaSpend / totalLeads : null
  const callsBooked = useMemo(
    () => pelagoniaOpportunities.reduce((s, o) => s + (o.callsBooked || 0), 0) || pelagoniaOpportunities.length,
    [pelagoniaOpportunities]
  )
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
  const sourceFreshness = Object.entries(lastRefreshed).map(([source, ts]) => {
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
            href="/members"
          />
          <MetricTile
            label="MRR"
            value={isEmpty(totalMRR) ? '—' : fmtCurrency(totalMRR, { compact: true })}
            target="target $50K"
            status={statusPctVsTarget(totalMRR, 50_000)}
            delta={null}
            href="/financial"
          />
          <MetricTile
            label="Total Revenue"
            value={isEmpty(totalRevenue) ? '—' : fmtCurrency(totalRevenue, { compact: true })}
            target="cumulative this period"
            status={totalRevenue > 0 ? 'green' : 'grey'}
            delta={null}
            href="/financial"
          />
          <MetricTile
            label="Active Members"
            value={String(activeMembers.length)}
            target={`target ${Q1_TARGET_NEW_MEMBERS}`}
            status={statusPctVsTarget(activeMembers.length, Q1_TARGET_NEW_MEMBERS)}
            delta={null}
            href="/members"
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
            href="/clinical"
          />
          <MetricTile
            label="Dashboard Unlock Rate"
            value={totalMembers === 0 ? '—' : fmtPct(dashboardUnlockRate)}
            target="target >70%"
            status={dashboardUnlockRate >= 0.7 ? 'green' : dashboardUnlockRate >= 0.5 ? 'amber' : totalMembers > 0 ? 'red' : 'grey'}
            delta={null}
            href="/clinical"
          />
          <MetricTile
            label="Stalled (Pit of Despair)"
            value={String(stalledMembers)}
            target="target <10"
            status={stalledMembers <= 10 ? 'green' : stalledMembers <= 25 ? 'amber' : 'red'}
            direction="lower-better"
            delta={null}
            href="/clinical"
          />
          <MetricTile
            label="Insights Calls Completed"
            value={String(insightsCalls)}
            target="cumulative"
            status={insightsCalls > 0 ? 'green' : 'grey'}
            delta={null}
            href="/clinical"
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
            href="/clinical"
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
            href="/retention"
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
            href="/retention"
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
            href="/support"
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
            href="/marketing"
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
            href="/marketing"
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
            href="/marketing"
          />
          <MetricTile
            label="Calls Booked"
            value={String(callsBooked)}
            target="period to date"
            status={callsBooked > 0 ? 'green' : 'grey'}
            delta={null}
            href="/marketing"
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
            href="/marketing"
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

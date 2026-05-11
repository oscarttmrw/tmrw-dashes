'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { QuestionTile } from '@/components/dashboard/question-tile'
import { AlertCard } from '@/components/dashboard/alert-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { StatusDot } from '@/components/dashboard/status-dot'
import { TrendIndicator } from '@/components/dashboard/trend-indicator'
import { Sparkline } from '@/components/dashboard/sparkline'
import { MemberDetailPanel } from '@/components/panels/member-detail-panel'
import { useDashboardData } from '@/lib/context/data-context'
import {
  ResponsiveContainer,
  LineChart as RechartLineChart,
  AreaChart as RechartAreaChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridStyle, tooltipStyle, legendStyle, lineDot, TMRW_COLORS } from '@/lib/utils/chart-styles'
import type { Member, Status } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Pulse Card                                                        */
/* ------------------------------------------------------------------ */
function PulseCard({
  label, value, prev, trend, href,
}: {
  label: string; value: string; prev: string; trend: number; href: string
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4 transition-all duration-150 hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px"
    >
      <span className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary md:text-[11px]">
        {label}
      </span>
      <div className="mt-0.5 flex items-baseline gap-1.5 md:mt-1 md:gap-2">
        <span className="font-mono text-base font-semibold text-dash-text md:text-xl">{value}</span>
        <TrendIndicator value={trend} />
      </div>
      <span className="font-sans text-[10px] text-dash-text-muted md:text-[11px]">from {prev}</span>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Mini Trend Card                                                   */
/* ------------------------------------------------------------------ */
function MiniTrendCard({
  label, value, trend, sparkData, href, status,
}: {
  label: string; value: string; trend: number; sparkData: number[]; href: string; status: Status
}) {
  return (
    <Link href={href} className="rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4 transition-all duration-150 hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px">
      <div className="flex items-center justify-between">
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary md:text-[11px]">
          {label}
        </span>
        <StatusDot status={status} />
      </div>
      <div className="mt-0.5 flex items-baseline gap-2 md:mt-1">
        <span className="font-mono text-base font-bold text-dash-text md:text-lg">{value}</span>
        <TrendIndicator value={trend} />
      </div>
      <div className="mt-1.5 md:mt-2">
        <Sparkline data={sparkData} height={24} width={200} color={status === 'red' ? '#DC2626' : status === 'amber' ? '#D97706' : '#16A34A'} />
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  const { members, rocks, lastRefreshed, dataMode } = useDashboardData()
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const activeMembers = useMemo(
    () => members.filter(m => m.caseStatus !== 'Closed' && m.journeyStage !== 'churned' && m.journeyStage !== 'inactive'),
    [members]
  )

  const healthDistribution = useMemo(() => {
    const dist = { healthy: 0, attention: 0, 'at-risk': 0, unknown: 0 }
    for (const m of activeMembers) dist[m.healthScore]++
    return dist
  }, [activeMembers])

  const totalActive = activeMembers.length
  const healthyPct = totalActive ? Math.round((healthDistribution.healthy / totalActive) * 100) : 0
  const attentionPct = totalActive ? Math.round((healthDistribution.attention / totalActive) * 100) : 0
  const atRiskPct = totalActive ? Math.round((healthDistribution['at-risk'] / totalActive) * 100) : 0
  const unknownPct = totalActive ? Math.round((healthDistribution.unknown / totalActive) * 100) : 0

  const stuckMembers = useMemo(
    () => members
      .filter(m => m.journeyStage === 'awaiting-results' && !m.dashboardUnlocked)
      .sort((a, b) => b.daysSinceRegistration - a.daysSinceRegistration),
    [members]
  )

  const offTrackCount = rocks.filter(r => r.status === 'off-track' || r.status === 'building').length

  const sourceFreshness = Object.entries(lastRefreshed).map(([source, ts]) => {
    const days = ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 86400000) : null
    const label = ts ? new Date(ts).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }) : 'Never'
    const status: Status = days === null ? 'red' : days > 14 ? 'red' : days > 7 ? 'amber' : 'green'
    return { source, label, days, status }
  })

  // ── Health trend (8 weeks) ──
  const healthTrendData = [
    { week: 'W1', Healthy: 180, Attention: 30, 'At-Risk': 10 },
    { week: 'W2', Healthy: 182, Attention: 31, 'At-Risk': 11 },
    { week: 'W3', Healthy: 185, Attention: 32, 'At-Risk': 13 },
    { week: 'W4', Healthy: 188, Attention: 34, 'At-Risk': 15 },
    { week: 'W5', Healthy: 192, Attention: 36, 'At-Risk': 17 },
    { week: 'W6', Healthy: 198, Attention: 38, 'At-Risk': 19 },
    { week: 'W7', Healthy: 202, Attention: 40, 'At-Risk': 21 },
    { week: 'W8', Healthy: 205, Attention: 42, 'At-Risk': 23 },
  ]

  // ── Active Members vs Plan ──
  const planWaypoints = [
    { month: 'Sep 2025', plan: 43 },
    { month: 'Oct 2025', plan: 55 },
    { month: 'Nov 2025', plan: 70 },
    { month: 'Dec 2025', plan: 89 },
    { month: 'Jan 2026', plan: 113 },
    { month: 'Feb 2026', plan: 144 },
    { month: 'Mar 2026', plan: 183 },
  ]

  const membersByMonth = useMemo(() => {
    const months: Record<string, number> = {}
    let cumulative = 0
    const sorted = [...members]
      .filter(m => m.caseStatus !== 'Closed' && m.journeyStage !== 'churned')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    for (const m of sorted) {
      const d = new Date(m.createdAt)
      const key = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`
      cumulative++
      months[key] = cumulative
    }
    return months
  }, [members])

  const memberVsPlanData = planWaypoints.map(wp => ({
    month: wp.month,
    Plan: wp.plan,
    Actual: membersByMonth[wp.month] || null,
  }))

  const latestPlan = planWaypoints[planWaypoints.length - 1]?.plan || 1
  const gapPct = Math.round(((activeMembers.length - latestPlan) / latestPlan) * 100)

  // ── Mini trend data ──
  const queueHistory = [45, 48, 52, 55, 59, 63, 65, stuckMembers.length]
  const churnHistory = [3.2, 3.4, 3.3, 3.6, 3.5, 3.8, 3.6, 3.8]
  const revenueHistory = [4200, 4800, 5100, 5500, 5800, 6100, 5800, 5800]
  const queueTrend = stuckMembers.length > 65 ? 3 : -2

  const questions = [
    {
      number: 1, question: 'Can we prove it works?', status: 'grey' as const,
      primaryMetrics: [{ label: 'Biomarker Improvement', value: 'TBC', target: '60%+' }, { label: 'Bio Age Delta', value: 'TBC', target: 'TBC' }],
      activeCount: 2, totalCount: 6, redCount: 0, amberCount: 0,
      functionalLinks: [{ label: 'Delivery', href: '/clinical' }],
    },
    {
      number: 2, question: 'Do customers love it?', status: 'amber' as const,
      primaryMetrics: [{ label: '90-Day Retention', value: '78%', target: '>85%' }, { label: 'Monthly Churn', value: '3.8%', target: '<5%' }],
      activeCount: 4, totalCount: 8, redCount: 0, amberCount: 1,
      functionalLinks: [{ label: 'Retention', href: '/retention' }, { label: 'Support', href: '/support' }],
    },
    {
      number: 3, question: 'Are we building a defensible moat?', status: 'red' as const,
      primaryMetrics: [{ label: 'Channel Partners', value: '0', target: '2' }, { label: 'Referral Rate', value: '10%', target: '20%' }],
      activeCount: 2, totalCount: 6, redCount: 2, amberCount: 0,
      functionalLinks: [{ label: 'Acquisition', href: '/members' }, { label: 'Strategy', href: '/strategy' }],
    },
    {
      number: 4, question: 'Can we deliver value reliably?', status: 'red' as const,
      primaryMetrics: [{ label: 'Reg→Dashboard', value: '98d', target: '45d' }, { label: 'Queue Size', value: `${stuckMembers.length} waiting`, target: '' }],
      activeCount: 3, totalCount: 5, redCount: 1, amberCount: 1,
      functionalLinks: [{ label: 'Delivery', href: '/clinical' }],
    },
    {
      number: 5, question: 'Are the economics right?', status: 'amber' as const,
      primaryMetrics: [{ label: 'Blended CAC', value: '$95', target: '<$100' }, { label: 'NRR', value: '94%', target: '>100%' }],
      activeCount: 4, totalCount: 6, redCount: 0, amberCount: 2,
      functionalLinks: [{ label: 'Financial', href: '/financial' }, { label: 'Retention', href: '/retention' }],
    },
  ]

  return (
    <div className="space-y-4 md:space-y-10">
      <Breadcrumb items={[{ label: 'Home' }]} />

      {dataMode === 'demo' && (
        <div className="rounded-lg border border-status-amber/30 bg-status-amber/5 px-4 py-3">
          <p className="font-sans text-sm text-status-amber">
            Showing demo data &mdash; upload real data in{' '}
            <Link href="/admin/upload" className="font-medium underline">Admin</Link>{' '}
            or switch to Actual mode
          </p>
        </div>
      )}

      {dataMode === 'actual' && (
        <div className="rounded-lg border border-dash-border bg-dash-surface px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-dash-text-secondary">
            Showing real data &mdash; last updated:{' '}
            {Object.entries(lastRefreshed)
              .filter(([, ts]) => ts)
              .map(([src, ts]) => `${src}: ${new Date(ts!).toLocaleDateString('en-AU')}`)
              .join(' · ') || 'no uploads yet'}
          </p>
          {(!lastRefreshed.stripe || !lastRefreshed.zendesk) && (
            <Link href="/admin/upload" className="text-xs font-medium text-dash-red hover:underline">
              Upload missing sources →
            </Link>
          )}
        </div>
      )}

      {/* ── 1. Weekly Pulse Strip ────────────────────────────────── */}
      <section>
        <SectionHeading number={1} title="Weekly Pulse" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <PulseCard label="New Registrations" value="12" prev="18" trend={-33} href="/members" />
          <PulseCard label="Dashboards Published" value="8" prev="5" trend={60} href="/clinical" />
          <PulseCard label="Churn" value="3.8%" prev="3.6%" trend={5.5} href="/retention" />
          <PulseCard label="Revenue" value="$5.8K" prev="$6.1K" trend={-5} href="/financial" />
          <PulseCard label="SLA Breaches" value="2" prev="0" trend={100} href="/support" />
          <PulseCard label="At-Risk Members" value={String(healthDistribution['at-risk'])} prev="18" trend={28} href="/retention" />
        </div>
      </section>

      {/* ── 2. Active Members vs Plan ────────────────────────────── */}
      <section>
        <SectionHeading number={2} title="Active Members vs Plan" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <ResponsiveContainer width="100%" height={256} className="h-48 md:h-64">
            <RechartLineChart data={memberVsPlanData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} tickLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} tickLine={axisLineStyle} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Line type="monotone" dataKey="Actual" stroke={TMRW_COLORS.red} strokeWidth={3} dot={lineDot(TMRW_COLORS.red)} activeDot={{ r: 7, fill: TMRW_COLORS.red, stroke: '#fff', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="Plan" stroke={TMRW_COLORS.grey} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: TMRW_COLORS.grey, stroke: '#fff', strokeWidth: 1 }} />
            </RechartLineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-dash-text-secondary">
              Current: <span className="font-mono font-bold text-dash-text">{activeMembers.length}</span> active members
            </span>
            <span className={gapPct <= -10 ? 'font-medium text-status-red' : gapPct <= -5 ? 'text-status-amber' : 'text-status-green'}>
              {gapPct > 0 ? '+' : ''}{gapPct}% vs plan
            </span>
          </div>
        </div>
      </section>

      {/* ── 3. Key Trends — 8 Weeks ──────────────────────────────── */}
      <section>
        <SectionHeading number={3} title="Key Trends — 8 Weeks" />
        <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-3">
          <MiniTrendCard
            label="Pipeline Queue"
            value={String(stuckMembers.length)}
            trend={queueTrend}
            sparkData={queueHistory}
            href="/clinical"
            status={stuckMembers.length > 50 ? 'red' : stuckMembers.length > 30 ? 'amber' : 'green'}
          />
          <MiniTrendCard
            label="Monthly Churn"
            value="3.8%"
            trend={5.5}
            sparkData={churnHistory}
            href="/retention"
            status="green"
          />
          <MiniTrendCard
            label="Weekly Revenue"
            value="$5.8K"
            trend={-5}
            sparkData={revenueHistory}
            href="/financial"
            status="amber"
          />
        </div>
      </section>

      {/* ── 4. Critical Alerts Banner ────────────────────────────── */}
      <section>
        <SectionHeading number={4} title="Critical Alerts — Action This Week" />
        <div className="mb-3 rounded-lg border-l-[3px] border-status-red bg-dash-surface p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-dash-text">
                {stuckMembers.length} members waiting for dashboard. Queue growing +3/week.
              </p>
              <p className="mt-1 text-xs text-dash-text-muted">
                At current rate, {stuckMembers.length + 24} by May. Capacity breach imminent.
              </p>
            </div>
            <Sparkline data={[45, 48, 52, 55, 59, 63, 65, stuckMembers.length]} color="#DC2626" width={100} height={28} />
          </div>
        </div>
        <div className="space-y-2">
          <AlertCard severity="medium" title="Kit QC failure rate rose to 14% in February (from 11% in January). Impact: ~8 additional journey restarts." link={{ label: 'Delivery', href: '/clinical' }} />
          <AlertCard severity="medium" title="Dead zone engagement: 38% of members in lab processing have zero touchpoints in last 14 days." link={{ label: 'Marketing', href: '/marketing' }} />
          <AlertCard severity="low" title="February cohort activating 18% faster than November cohort. Delivery improvements translating." link={{ label: 'Delivery', href: '/clinical' }} positive />
        </div>
      </section>

      {/* ── 5. Member Health — 8 Week Trend ──────────────────────── */}
      <section>
        <SectionHeading number={5} title="Member Health — 8 Week Trend" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <ResponsiveContainer width="100%" height={176} className="h-36 md:h-44">
            <RechartAreaChart data={healthTrendData}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="week" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Area type="monotone" dataKey="Healthy" stackId="1" stroke={TMRW_COLORS.green} fill={TMRW_COLORS.green} fillOpacity={0.5} strokeWidth={0} />
              <Area type="monotone" dataKey="Attention" stackId="1" stroke={TMRW_COLORS.amber} fill={TMRW_COLORS.amber} fillOpacity={0.5} strokeWidth={0} />
              <Area type="monotone" dataKey="At-Risk" stackId="1" stroke="#DC2626" fill="#DC2626" fillOpacity={0.5} strokeWidth={0} />
            </RechartAreaChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium">
            <span>Current: <span className="font-mono">{healthDistribution.healthy}</span> healthy, <span className="font-mono">{healthDistribution.attention}</span> attention, <span className="font-mono">{healthDistribution['at-risk']}</span> at-risk</span>
            <Link href="/retention" className="ml-auto text-dash-red hover:underline">View details →</Link>
          </div>
        </div>
      </section>

      {/* ── 6. Strategic Questions ───────────────────────────────── */}
      <section>
        <SectionHeading number={6} title="Five Strategic Questions" />
        <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {questions.map(q => (
            <div key={q.number} className="flex flex-col">
              <QuestionTile {...q} />
              {q.number === 4 && (
                <div className="mt-1 rounded-b-md border border-t-0 border-dash-border bg-dash-surface/60 px-4 py-2">
                  <p className="font-sans text-[11px] italic text-dash-text-muted">Feb cohort tracking 72d, improving · Queue growing +3/wk</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. Rocks Strip ───────────────────────────────────────── */}
      <section>
        <SectionHeading number={7} title="Q1 2026 Rocks" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-dash-text-secondary">47 days left in Q1 &middot; {offTrackCount} need attention</span>
            <Link href="/eos" className="text-[11px] font-medium text-dash-red hover:underline">View L10 &rarr;</Link>
          </div>
          <div className="space-y-2">
            {rocks.map(rock => (
              <Link
                key={rock.id}
                href="/eos"
                className="flex items-center gap-3 rounded-md bg-dash-bg px-3 py-2 transition-colors hover:bg-dash-border/30"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dash-red font-mono text-[10px] font-bold text-white">
                  R{rock.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-dash-text">{rock.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  rock.status === 'on-track' ? 'bg-status-green/10 text-status-green'
                  : rock.status === 'off-track' ? 'bg-status-red/10 text-status-red'
                  : rock.status === 'at-risk' ? 'bg-status-amber/10 text-status-amber'
                  : rock.status === 'complete' ? 'bg-status-green/10 text-status-green'
                  : 'bg-dash-surface text-dash-text-muted'
                }`}>
                  {rock.status.replace('-', ' ')}
                </span>
                <div className="hidden sm:flex items-center gap-1">
                  {rock.metrics.map(m => (
                    <StatusDot key={m.label} status={m.status} size="sm" />
                  ))}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-dash-text-muted">
            <span className="font-semibold text-dash-text">Next L10: Monday 10 March.</span>
          </div>
        </div>
      </section>

      {/* ── 8. Last Data Refresh ─────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dash-text-muted">
          {sourceFreshness.map(s => (
            <span key={s.source} className="flex items-center gap-1.5">
              <StatusDot status={s.status} size="sm" />
              <span className="capitalize">{s.source}:</span>
              <span className={s.status === 'red' ? 'text-status-red' : s.status === 'amber' ? 'text-status-amber' : ''}>
                {s.label}{s.days !== null && ` (${s.days}d ago)`}
              </span>
            </span>
          ))}
        </div>
      </section>

      <MemberDetailPanel member={selectedMember} open={selectedMember !== null} onOpenChange={open => { if (!open) setSelectedMember(null) }} />
    </div>
  )
}

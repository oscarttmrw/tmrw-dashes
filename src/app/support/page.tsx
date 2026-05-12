'use client'

import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { AlertCard } from '@/components/dashboard/alert-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { StatusDot } from '@/components/dashboard/status-dot'
import { TicketDetailPanel } from '@/components/panels/ticket-detail-panel'
import { ChartPeriodToggle } from '@/components/dashboard/chart-period-toggle'
import { TmrwLineChart } from '@/components/dashboard/tmrw-line-chart'
import { TmrwAreaChart } from '@/components/dashboard/tmrw-area-chart'
import {
  ResponsiveContainer,
  BarChart as RechartBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridProps, tooltipStyle, TMRW_COLORS } from '@/lib/utils/chart-styles'
import { useDashboardData } from '@/lib/context/data-context'
import type { Ticket, Status } from '@/lib/types'

function ticketStatusDot(status: Ticket['status']): Status {
  if (status === 'Open') return 'red'
  if (status === 'Pending') return 'amber'
  return 'green'
}

// ---------------------------------------------------------------------------
// 01. Support as Business Signal
// ---------------------------------------------------------------------------
const categoryTrendDataMonthly = [
  { month: 'Sep 2025', billing: 5, 'kit-issue': 3, 'results-query': 2, scheduling: 6, 'supplement-question': 3 },
  { month: 'Oct 2025', billing: 6, 'kit-issue': 4, 'results-query': 3, scheduling: 5, 'supplement-question': 4 },
  { month: 'Nov 2025', billing: 5, 'kit-issue': 5, 'results-query': 4, scheduling: 4, 'supplement-question': 3 },
  { month: 'Dec 2025', billing: 6, 'kit-issue': 6, 'results-query': 5, scheduling: 3, 'supplement-question': 4 },
  { month: 'Jan 2026', billing: 5, 'kit-issue': 7, 'results-query': 7, scheduling: 3, 'supplement-question': 3 },
  { month: 'Feb 2026', billing: 6, 'kit-issue': 8, 'results-query': 8, scheduling: 2, 'supplement-question': 4 },
]

const categoryTrendDataWeekly = [
  { month: 'W1 Feb', billing: 1, 'kit-issue': 2, 'results-query': 2, scheduling: 1, 'supplement-question': 1 },
  { month: 'W2 Feb', billing: 2, 'kit-issue': 3, 'results-query': 1, scheduling: 0, 'supplement-question': 1 },
  { month: 'W3 Feb', billing: 1, 'kit-issue': 1, 'results-query': 3, scheduling: 1, 'supplement-question': 1 },
  { month: 'W4 Feb', billing: 2, 'kit-issue': 2, 'results-query': 2, scheduling: 0, 'supplement-question': 1 },
]

const categoryTrendDataQuarterly = [
  { month: 'Q3 2025', billing: 16, 'kit-issue': 12, 'results-query': 9, scheduling: 15, 'supplement-question': 10 },
  { month: 'Q4 2025', billing: 17, 'kit-issue': 15, 'results-query': 12, scheduling: 12, 'supplement-question': 11 },
  { month: 'Q1 2026', billing: 11, 'kit-issue': 15, 'results-query': 15, scheduling: 5, 'supplement-question': 7 },
]

// ---------------------------------------------------------------------------
// 02. Support Cost Model
// ---------------------------------------------------------------------------
const ticketsPerMemberTrend = [
  { month: 'Sep 2025', 'tickets/member': 0.08 },
  { month: 'Oct 2025', 'tickets/member': 0.09 },
  { month: 'Nov 2025', 'tickets/member': 0.10 },
  { month: 'Dec 2025', 'tickets/member': 0.11 },
  { month: 'Jan 2026', 'tickets/member': 0.12 },
  { month: 'Feb 2026', 'tickets/member': 0.13 },
]

// ---------------------------------------------------------------------------
// 04. Operational Health
// ---------------------------------------------------------------------------
const slaTrendDataThisMonth = [
  { month: 'Sep 2025', 'First Reply SLA %': 92, 'Resolution SLA %': 85 },
  { month: 'Oct 2025', 'First Reply SLA %': 90, 'Resolution SLA %': 83 },
  { month: 'Nov 2025', 'First Reply SLA %': 88, 'Resolution SLA %': 80 },
  { month: 'Dec 2025', 'First Reply SLA %': 86, 'Resolution SLA %': 78 },
  { month: 'Jan 2026', 'First Reply SLA %': 84, 'Resolution SLA %': 75 },
  { month: 'Feb 2026', 'First Reply SLA %': 82, 'Resolution SLA %': 72 },
]

const slaTrendDataThisWeek = [
  { month: 'Mon', 'First Reply SLA %': 80, 'Resolution SLA %': 68 },
  { month: 'Tue', 'First Reply SLA %': 78, 'Resolution SLA %': 70 },
  { month: 'Wed', 'First Reply SLA %': 84, 'Resolution SLA %': 74 },
  { month: 'Thu', 'First Reply SLA %': 82, 'Resolution SLA %': 71 },
  { month: 'Fri', 'First Reply SLA %': 85, 'Resolution SLA %': 73 },
]

const slaTrendDataQuarter = [
  { month: 'Dec 2025', 'First Reply SLA %': 86, 'Resolution SLA %': 78 },
  { month: 'Jan 2026', 'First Reply SLA %': 84, 'Resolution SLA %': 75 },
  { month: 'Feb 2026', 'First Reply SLA %': 82, 'Resolution SLA %': 72 },
]

const slaTrendData6mo = [
  { month: 'Sep 2025', 'First Reply SLA %': 92, 'Resolution SLA %': 85 },
  { month: 'Oct 2025', 'First Reply SLA %': 90, 'Resolution SLA %': 83 },
  { month: 'Nov 2025', 'First Reply SLA %': 88, 'Resolution SLA %': 80 },
  { month: 'Dec 2025', 'First Reply SLA %': 86, 'Resolution SLA %': 78 },
  { month: 'Jan 2026', 'First Reply SLA %': 84, 'Resolution SLA %': 75 },
  { month: 'Feb 2026', 'First Reply SLA %': 82, 'Resolution SLA %': 72 },
]

const csatVolumeTrendMonthly = [
  { month: 'Sep 2025', 'CSAT %': 88, 'Ticket Volume': 20 },
  { month: 'Oct 2025', 'CSAT %': 86, 'Ticket Volume': 25 },
  { month: 'Nov 2025', 'CSAT %': 85, 'Ticket Volume': 30 },
  { month: 'Dec 2025', 'CSAT %': 84, 'Ticket Volume': 35 },
  { month: 'Jan 2026', 'CSAT %': 83, 'Ticket Volume': 40 },
  { month: 'Feb 2026', 'CSAT %': 82, 'Ticket Volume': 50 },
]

const csatVolumeTrendQuarterly = [
  { month: 'Q3 2025', 'CSAT %': 87, 'Ticket Volume': 65 },
  { month: 'Q4 2025', 'CSAT %': 85, 'Ticket Volume': 95 },
  { month: 'Q1 2026', 'CSAT %': 82, 'Ticket Volume': 130 },
]

const csatVolumeTrendRolling90d = [
  { month: 'Dec 2025', 'CSAT %': 85, 'Ticket Volume': 30 },
  { month: 'Jan 2026', 'CSAT %': 84, 'Ticket Volume': 40 },
  { month: 'Feb 2026', 'CSAT %': 82, 'Ticket Volume': 50 },
]

const agents = [
  { name: 'Nina Gibbias', tickets: 80, avgFirstReply: '2.2h', avgResolution: '16h', csat: '85%', fcr: '72%' },
  { name: 'Tom Watts', tickets: 60, avgFirstReply: '2.8h', avgResolution: '19h', csat: '80%', fcr: '65%' },
  { name: 'Sarah Chen', tickets: 40, avgFirstReply: '2.4h', avgResolution: '17h', csat: '84%', fcr: '70%' },
  { name: 'Alex Park', tickets: 20, avgFirstReply: '3.1h', avgResolution: '22h', csat: '78%', fcr: '58%' },
]

const backlogTrend = [
  { month: 'Sep 2025', 'Open Tickets': 12 },
  { month: 'Oct 2025', 'Open Tickets': 15 },
  { month: 'Nov 2025', 'Open Tickets': 18 },
  { month: 'Dec 2025', 'Open Tickets': 23 },
  { month: 'Jan 2026', 'Open Tickets': 30 },
  { month: 'Feb 2026', 'Open Tickets': 42 },
]

// ---------------------------------------------------------------------------
// Channel Trend (stacked area)
// ---------------------------------------------------------------------------
const channelTrend = [
  { month: 'Sep 2025', Email: 14, Web: 4, Chat: 1, Phone: 1 },
  { month: 'Oct 2025', Email: 17, Web: 5, Chat: 2, Phone: 1 },
  { month: 'Nov 2025', Email: 20, Web: 6, Chat: 3, Phone: 1 },
  { month: 'Dec 2025', Email: 22, Web: 7, Chat: 4, Phone: 2 },
  { month: 'Jan 2026', Email: 24, Web: 9, Chat: 5, Phone: 2 },
  { month: 'Feb 2026', Email: 30, Web: 12, Chat: 5, Phone: 3 },
]

// ---------------------------------------------------------------------------
// Tag Frequency Trend
// ---------------------------------------------------------------------------
const tagTrendData = [
  { month: 'Oct 2025', billing: 8, 'kit-issue': 6, 'results-query': 5, supplement: 4, scheduling: 3 },
  { month: 'Nov 2025', billing: 10, 'kit-issue': 8, 'results-query': 6, supplement: 5, scheduling: 4 },
  { month: 'Dec 2025', billing: 12, 'kit-issue': 10, 'results-query': 8, supplement: 6, scheduling: 5 },
  { month: 'Jan 2026', billing: 16, 'kit-issue': 12, 'results-query': 10, supplement: 8, scheduling: 7 },
  { month: 'Feb 2026', billing: 32, 'kit-issue': 28, 'results-query': 24, supplement: 20, scheduling: 18 },
]

// ---------------------------------------------------------------------------
// 05. Upstream Root Causes
// ---------------------------------------------------------------------------
const rootCauses = [
  { cause: 'Results query', tickets: 24, upstream: 'Dead zone communication gap', owner: 'Marketing' },
  { cause: 'Kit issue', tickets: 28, upstream: 'QC failure rate / instruction clarity', owner: 'Clinical' },
  { cause: 'Billing', tickets: 32, upstream: 'Pricing confusion at checkout', owner: 'Product' },
  { cause: 'Supplement question', tickets: 20, upstream: 'Protocol clarity in dashboard', owner: 'Clinical' },
  { cause: 'Scheduling', tickets: 18, upstream: 'Consultation booking friction', owner: 'Product' },
]

// ---------------------------------------------------------------------------
// Chart period options
// ---------------------------------------------------------------------------
const ticketVolumeOptions = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
]

const responseTimeOptions = [
  { label: 'This Week', value: 'this-week' },
  { label: 'This Month', value: 'this-month' },
  { label: 'Quarter', value: 'quarter' },
  { label: '6mo', value: '6mo' },
]

const csatOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Rolling 90d', value: 'rolling-90d' },
]

const tagsOptions = [
  { label: 'MTD', value: 'mtd' },
  { label: 'QTD', value: 'qtd' },
  { label: 'YTD', value: 'ytd' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SupportPage() {
  const { tickets, members } = useDashboardData()
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const recentTickets = tickets.slice(0, 10)

  // Chart period state
  const [ticketVolumePeriod, setTicketVolumePeriod] = useState('monthly')
  const [responseTimePeriod, setResponseTimePeriod] = useState('this-month')
  const [csatPeriod, setCsatPeriod] = useState('monthly')
  const [tagsPeriod, setTagsPeriod] = useState('mtd')

  // Derived chart data based on toggle state
  const categoryTrendData = ticketVolumePeriod === 'weekly'
    ? categoryTrendDataWeekly
    : ticketVolumePeriod === 'quarterly'
      ? categoryTrendDataQuarterly
      : categoryTrendDataMonthly

  const slaTrendData = responseTimePeriod === 'this-week'
    ? slaTrendDataThisWeek
    : responseTimePeriod === 'quarter'
      ? slaTrendDataQuarter
      : responseTimePeriod === '6mo'
        ? slaTrendData6mo
        : slaTrendDataThisMonth

  const csatVolumeTrend = csatPeriod === 'quarterly'
    ? csatVolumeTrendQuarterly
    : csatPeriod === 'rolling-90d'
      ? csatVolumeTrendRolling90d
      : csatVolumeTrendMonthly

  // Build member lookup map
  const memberMap = useMemo(() => {
    const map = new Map<string, (typeof members)[number]>()
    for (const m of members) {
      map.set(m.id, m)
    }
    return map
  }, [members])

  // 03: Tickets by Journey Stage data
  const journeyStageData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of tickets) {
      const member = t.memberId ? memberMap.get(t.memberId) : undefined
      const stage = member?.journeyStage ?? 'Unknown'
      counts[stage] = (counts[stage] || 0) + 1
    }
    // Scale counts based on selected period
    const scale = tagsPeriod === 'qtd' ? 2.8 : tagsPeriod === 'ytd' ? 8.5 : 1
    return Object.entries(counts)
      .map(([stage, count]) => ({ stage, Tickets: Math.round(count * scale) }))
      .sort((a, b) => b.Tickets - a.Tickets)
  }, [tickets, memberMap, tagsPeriod])

  // Helper: look up journey stage for a ticket
  function getJourneyStage(memberId?: string | null): string {
    if (!memberId) return 'Unlinked'
    const member = memberMap.get(memberId)
    return member?.journeyStage ?? 'Unlinked'
  }

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Support' }]} />
        <div className="flex items-center gap-2">
          <DataSourceBadge source="zendesk" />
          <DataSourceBadge source="manual" />
          <DataSourceBadge source="tableau" />
        </div>
      </div>

      {/* ================================================================= */}
      {/* 01 — Support as Business Signal                                   */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={1} title="Support as Business Signal" />

        {/* Support Headlines */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 mb-6">
          <MetricCard label="Cost per Ticket" value="$18.50" status="red" target="<$15" />
          <MetricCard label="CX Minutes per Patient" value="14 min" status="amber" target="10 min" />
          <MetricCard label="Churn w/ Open Ticket" value="42%" status="red" target="<20%" direction="lower-better" />
        </div>

        {/* Ticket category trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mb-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Ticket Category Trend (6 months)
            </h3>
            <ChartPeriodToggle
              options={ticketVolumeOptions}
              selected={ticketVolumePeriod}
              onChange={setTicketVolumePeriod}
            />
          </div>
          <TmrwLineChart
            data={categoryTrendData}
            index="month"
            series={[
              { dataKey: 'billing', color: TMRW_COLORS.blue },
              { dataKey: 'kit-issue', color: TMRW_COLORS.red },
              { dataKey: 'results-query', color: TMRW_COLORS.amber },
              { dataKey: 'scheduling', color: TMRW_COLORS.green },
              { dataKey: 'supplement-question', color: TMRW_COLORS.purple },
            ]}
            yAxisWidth={30}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Support-triggered churn */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Support-Triggered Churn
            </h3>
            <p className="text-sm leading-relaxed text-dash-text">
              Of <span className="font-mono font-semibold">54</span> churned members,{' '}
              <span className="font-mono font-semibold text-status-red">31 (57%)</span> had open support
              tickets. Most common:{' '}
              <span className="font-medium">results-query (14)</span>,{' '}
              <span className="font-medium">kit-issue (9)</span>,{' '}
              <span className="font-medium">billing (8)</span>.
            </p>
          </div>

          {/* First-contact resolution impact */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              First-Contact Resolution Impact
            </h3>
            <p className="text-sm leading-relaxed text-dash-text">
              FCR members retain at <span className="font-mono font-semibold text-status-green">88%</span> vs{' '}
              <span className="font-mono font-semibold text-status-red">71%</span> for multi-contact.
              Investing in agent training has{' '}
              <span className="font-mono font-semibold">17pp</span> retention ROI.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 02 — Support Cost Model                                           */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={2} title="Support Cost Model" />

        {/* Tickets per member trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mb-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Tickets per Member (Trend)
          </h3>
          <TmrwLineChart
            data={ticketsPerMemberTrend}
            index="month"
            series={[
              { dataKey: 'tickets/member', color: TMRW_COLORS.red },
            ]}
            yAxisWidth={40}
            showLegend={false}
            valueFormatter={(v) => v.toFixed(2)}
          />
          <AlertCard
            severity="medium"
            title="Tickets per member rising steadily (0.08 to 0.13). If trend continues, support costs will outpace revenue growth."
          />
        </div>

        {/* Support capacity model */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Support Capacity Model
          </h3>
          <p className="text-sm leading-relaxed text-dash-text mb-4">
            At current <span className="font-mono font-semibold">0.13</span> tickets/member:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border">
                  <th className="px-4 py-2 font-medium text-dash-text-secondary">Members</th>
                  <th className="px-4 py-2 font-medium text-dash-text-secondary">Tickets/Week</th>
                  <th className="px-4 py-2 font-medium text-dash-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                <tr>
                  <td className="px-4 py-2 font-mono text-dash-text">500</td>
                  <td className="px-4 py-2 font-mono text-dash-text">65</td>
                  <td className="px-4 py-2 text-status-green font-medium">Within capacity</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-dash-text">1,000</td>
                  <td className="px-4 py-2 font-mono text-dash-text">130</td>
                  <td className="px-4 py-2 text-status-red font-medium">Exceeds capacity</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-dash-text">2,000</td>
                  <td className="px-4 py-2 font-mono text-dash-text">260</td>
                  <td className="px-4 py-2 text-status-red font-medium">Exceeds capacity</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-dash-text-muted">
            Current team capacity: ~80 tickets/week. Exceeds at ~615 members.
          </p>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 03 — Tickets by Journey Stage (NEW)                               */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={3} title="Tickets by Journey Stage" />

        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mb-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Ticket Count by Member Journey Stage
            </h3>
            <ChartPeriodToggle
              options={tagsOptions}
              selected={tagsPeriod}
              onChange={setTagsPeriod}
            />
          </div>
          <ResponsiveContainer width="100%" height={224} className="h-44 md:h-56">
            <RechartBarChart data={journeyStageData as object[]}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="stage" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="Tickets" fill={TMRW_COLORS.red} radius={[4, 4, 0, 0]} />
            </RechartBarChart>
          </ResponsiveContainer>
          <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            42% of tickets come from members in &lsquo;Awaiting Results&rsquo; stage.
          </p>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 04 — Operational Health                                           */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={4} title="Operational Health" />

        {/* Operational KPI cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 mb-6">
          <MetricCard label="Open Tickets" value="50" status="red" sparkline={[35, 38, 40, 42, 45, 48, 49, 50]} />
          <MetricCard label="Avg First Reply" value="2.5h" status="amber" target="<2h" sparkline={[3.2, 3.0, 2.8, 2.6, 2.5, 2.5]} />
          <MetricCard label="Avg Resolution" value="18h" status="amber" target="<12h" sparkline={[24, 22, 20, 19, 18, 18]} />
          <MetricCard label="CSAT Score" value="82%" status="amber" target=">85%" sparkline={[78, 79, 80, 80, 81, 82]} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 mb-6">
          <MetricCard label="Tickets/Week" value="8.3" status="red" sparkline={[5.5, 6.0, 6.5, 7.0, 7.8, 8.3]} />
          <MetricCard label="SLA % First Reply <4h" value="85%" status="amber" target=">90%" sparkline={[92, 90, 88, 87, 86, 85]} />
          <MetricCard label="SLA % Resolved <24h" value="72%" status="red" target=">80%" sparkline={[80, 78, 76, 74, 73, 72]} />
        </div>

        {/* SLA compliance trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mb-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              SLA Compliance Trend
            </h3>
            <ChartPeriodToggle
              options={responseTimeOptions}
              selected={responseTimePeriod}
              onChange={setResponseTimePeriod}
            />
          </div>
          <TmrwLineChart
            data={slaTrendData}
            index="month"
            series={[
              { dataKey: 'First Reply SLA %', color: TMRW_COLORS.blue },
              { dataKey: 'Resolution SLA %', color: TMRW_COLORS.amber },
            ]}
            yAxisWidth={40}
            valueFormatter={(v) => `${v}%`}
          />
        </div>

        {/* CSAT trend with volume overlay */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mb-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              CSAT Trend with Ticket Volume
            </h3>
            <ChartPeriodToggle
              options={csatOptions}
              selected={csatPeriod}
              onChange={setCsatPeriod}
            />
          </div>
          <TmrwLineChart
            data={csatVolumeTrend}
            index="month"
            series={[
              { dataKey: 'CSAT %', color: TMRW_COLORS.green },
              { dataKey: 'Ticket Volume', color: TMRW_COLORS.grey },
            ]}
            yAxisWidth={40}
          />
        </div>

        {/* Agent performance table */}
        <div className="mb-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Agent Performance
          </h3>
          <div className="overflow-x-auto rounded-lg border border-dash-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface">
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Name</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Tickets</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">First Reply</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Resolution Time</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">CSAT</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">FCR Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {agents.map(a => (
                  <tr key={a.name} className="bg-dash-surface/50">
                    <td className="px-4 py-2 font-medium text-dash-text">{a.name}</td>
                    <td className="px-4 py-2 font-mono text-dash-text">{a.tickets}</td>
                    <td className="px-4 py-2 font-mono text-dash-text">{a.avgFirstReply}</td>
                    <td className="px-4 py-2 font-mono text-dash-text">{a.avgResolution}</td>
                    <td className="px-4 py-2 font-mono text-dash-text">{a.csat}</td>
                    <td className="px-4 py-2 font-mono text-dash-text">{a.fcr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Tickets (with detail panel) */}
        <div className="mb-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Recent Tickets
          </h3>
          <div className="overflow-x-auto rounded-lg border border-dash-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface">
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">ID</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Status</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Priority</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Assignee</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Channel</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Journey Stage</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {recentTickets.map(t => (
                  <tr
                    key={t.id}
                    className="cursor-pointer bg-dash-surface/50 transition-colors hover:bg-dash-surface"
                    onClick={() => setSelectedTicket(t)}
                  >
                    <td className="px-4 py-2 font-mono text-dash-text">{t.id}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={ticketStatusDot(t.status)} size="sm" />
                        <span className="text-dash-text">{t.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-dash-text">{t.priority}</td>
                    <td className="px-4 py-2 text-dash-text">{t.assignee}</td>
                    <td className="px-4 py-2 text-dash-text">{t.channel}</td>
                    <td className="px-4 py-2 text-dash-text">{getJourneyStage(t.memberId)}</td>
                    <td className="px-4 py-2 font-mono text-dash-text-secondary">
                      {new Date(t.createdAt).toLocaleDateString('en-AU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Backlog trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Backlog Trend
          </h3>
          <TmrwLineChart
            data={backlogTrend}
            index="month"
            series={[
              { dataKey: 'Open Tickets', color: TMRW_COLORS.red },
            ]}
            yAxisWidth={30}
            showLegend={false}
          />
          <AlertCard
            severity="high"
            title="Open ticket backlog growing 3.5x over 6 months (12 to 42). Current trajectory is unsustainable."
          />
        </div>

        {/* Channel breakdown — stacked area trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mt-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Channel Volume Trend
          </h3>
          <TmrwAreaChart
            data={channelTrend}
            index="month"
            series={[
              { dataKey: 'Email', color: TMRW_COLORS.red },
              { dataKey: 'Web', color: TMRW_COLORS.blue },
              { dataKey: 'Chat', color: TMRW_COLORS.amber },
              { dataKey: 'Phone', color: TMRW_COLORS.green },
            ]}
            height={224}
            className="h-56 md:h-72"
            yAxisWidth={40}
          />
        </div>
      </section>

      {/* ================================================================= */}
      {/* 05 — Upstream Root Causes                                         */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={5} title="Upstream Root Causes" />

        {/* Root causes table */}
        <div className="overflow-x-auto rounded-lg border border-dash-border mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Root Cause</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Tickets (period)</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Upstream Cause</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {rootCauses.map(rc => (
                <tr key={rc.cause} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{rc.cause}</td>
                  <td className="px-4 py-2 font-mono text-dash-text">{rc.tickets}</td>
                  <td className="px-4 py-2 text-dash-text">{rc.upstream}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        rc.owner === 'Clinical'
                          ? 'bg-amber-100 text-amber-800'
                          : rc.owner === 'Product'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {rc.owner}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tag frequency trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mb-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Tag Frequency Trend
          </h3>
          <TmrwLineChart
            data={tagTrendData}
            index="month"
            series={[
              { dataKey: 'billing', color: TMRW_COLORS.red },
              { dataKey: 'kit-issue', color: TMRW_COLORS.blue },
              { dataKey: 'results-query', color: TMRW_COLORS.green },
              { dataKey: 'supplement', color: TMRW_COLORS.amber },
              { dataKey: 'scheduling', color: TMRW_COLORS.purple },
            ]}
            yAxisWidth={40}
          />
          <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            All tag categories spiking in Feb — correlates with member growth acceleration.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <MetricCard label="Repeat Contact Rate" value="18%" status="red" target="<10%" />
        </div>

        <AlertCard
          severity="high"
          title="3 of 5 root causes trace to Clinical operations — kit-issue, results-query, and supplement-question all originate upstream."
          link={{ label: 'View Clinical', href: '/clinical' }}
        />
      </section>

      {/* Ticket Detail Panel */}
      <TicketDetailPanel
        ticket={selectedTicket}
        open={selectedTicket !== null}
        onOpenChange={(open) => { if (!open) setSelectedTicket(null) }}
      />
    </div>
  )
}

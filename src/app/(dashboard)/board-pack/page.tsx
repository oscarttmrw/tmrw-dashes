'use client'

import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { StatusDot } from '@/components/dashboard/status-dot'
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
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridProps, tooltipStyle, legendStyle, TMRW_COLORS } from '@/lib/utils/chart-styles'
import { useDashboardData } from '@/lib/context/data-context'

// ---------------------------------------------------------------------------
// Static data for board pack charts
// ---------------------------------------------------------------------------
const MONTHS = ['Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026']

const memberGrowthData = [
  { month: 'Sep 2025', Actual: 25, Forecast: 43 },
  { month: 'Oct 2025', Actual: 55, Forecast: 98 },
  { month: 'Nov 2025', Actual: 95, Forecast: 168 },
  { month: 'Dec 2025', Actual: 140, Forecast: 257 },
  { month: 'Jan 2026', Actual: 210, Forecast: 370 },
  { month: 'Feb 2026', Actual: 269, Forecast: 514 },
]

const revenueActualVsForecast = [
  { month: 'Sep 2025', Actual: 6800, Forecast: 8000 },
  { month: 'Oct 2025', Actual: 8900, Forecast: 10500 },
  { month: 'Nov 2025', Actual: 10500, Forecast: 13000 },
  { month: 'Dec 2025', Actual: 12100, Forecast: 16000 },
  { month: 'Jan 2026', Actual: 19500, Forecast: 22000 },
  { month: 'Feb 2026', Actual: 23499, Forecast: 28000 },
]

const revenueComposition = MONTHS.map((month, i) => ({
  month,
  'Joining Fee': [2500, 3100, 3800, 4200, 5500, 5400][i],
  Subscription: [3200, 4100, 4800, 5600, 9800, 12500][i],
  Supplement: [800, 1200, 1400, 1700, 3000, 4200][i],
  Other: [300, 500, 500, 600, 1200, 1399][i],
}))

const cohortRetention = [
  { month: 'Month 0', 'Sep 2025': 100, 'Oct 2025': 100, 'Nov 2025': 100, 'Dec 2025': 100, 'Jan 2026': 100, 'Feb 2026': 100 },
  { month: 'Month 1', 'Sep 2025': 92, 'Oct 2025': 90, 'Nov 2025': 88, 'Dec 2025': 90, 'Jan 2026': 92, 'Feb 2026': 92 },
  { month: 'Month 2', 'Sep 2025': 85, 'Oct 2025': 86, 'Nov 2025': 82, 'Dec 2025': 85, 'Jan 2026': 85 },
  { month: 'Month 3', 'Sep 2025': 82, 'Oct 2025': 84, 'Nov 2025': 75, 'Dec 2025': 80 },
  { month: 'Month 4', 'Sep 2025': 80, 'Oct 2025': 82 },
  { month: 'Month 5', 'Sep 2025': 78 },
]

const pipelineQueueTrend = MONTHS.map((month, i) => ({
  month,
  'Queue Size': [35, 40, 45, 52, 60, 67][i],
}))

const deliverySpeedByCohort = MONTHS.map((month, i) => ({
  month,
  'Days to Dashboard': [120, 115, 108, 102, 95, 85][i],
  Target: 30,
}))

const capacityForecast = [
  { month: 'Jan 2026', Demand: 480, Capacity: 554 },
  { month: 'Feb 2026', Demand: 510, Capacity: 554 },
  { month: 'Mar 2026', Demand: 530, Capacity: 554 },
  { month: 'Apr 2026', Demand: 545, Capacity: 664 },
  { month: 'May 2026', Demand: 570, Capacity: 664 },
  { month: 'Jun 2026', Demand: 600, Capacity: 664 },
]

const cmPerMemberTrend = MONTHS.map((month, i) => ({
  month,
  'CM/Member': [35, 40, 42, 48, 52, 56][i],
  Target: 80,
}))

// Strategic question summaries
const strategicHealth = [
  { q: 'Prove it works', status: 'grey' as const, metric: 'TBC' },
  { q: 'Customers love it', status: 'amber' as const, metric: '78% ret' },
  { q: 'Defensible moat', status: 'red' as const, metric: '0 partners' },
  { q: 'Deliver reliably', status: 'red' as const, metric: '98d avg' },
  { q: 'Economics right', status: 'amber' as const, metric: '94% NRR' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BoardPackPage() {
  const [growthPeriod, setGrowthPeriod] = useState('monthly')
  const [revenuePeriod, setRevenuePeriod] = useState('monthly')
  const [compPeriod, setCompPeriod] = useState('monthly')

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Board Pack' }]} />
          <h1 className="mt-2 font-sans text-xl font-bold text-dash-text">
            BOARD PACK — March 2026
          </h1>
        </div>
      </div>

      {/* ── 01 Strategic Health ──────────────────────────────────── */}
      <section>
        <SectionHeading number={1} title="Strategic Health" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {strategicHealth.map((q, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-dash-border bg-dash-surface px-4 py-3">
              <StatusDot status={q.status} />
              <div>
                <p className="text-xs font-medium text-dash-text">{q.q}</p>
                <p className="font-mono text-sm text-dash-text-secondary">{q.metric}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 02 Member Growth ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <SectionHeading number={2} title="Member Growth" />
          <ChartPeriodToggle
            options={[{ label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' }, { label: 'YTD', value: 'ytd' }]}
            selected={growthPeriod}
            onChange={setGrowthPeriod}
          />
        </div>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <TmrwLineChart
            data={memberGrowthData}
            index="month"
            series={[
              { dataKey: 'Actual', color: TMRW_COLORS.red },
              { dataKey: 'Forecast', color: TMRW_COLORS.grey, dashed: true },
            ]}
            height={288}
            className="h-56 md:h-72"
            yAxisWidth={40}
          />
        </div>
      </section>

      {/* ── 03 Revenue ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <SectionHeading number={3} title="Revenue" />
          <ChartPeriodToggle
            options={[{ label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' }, { label: 'YTD', value: 'ytd' }]}
            selected={revenuePeriod}
            onChange={setRevenuePeriod}
          />
        </div>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <ResponsiveContainer width="100%" height={288} className="h-56 md:h-72">
            <RechartBarChart data={revenueActualVsForecast as object[]}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={48} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${(Number(v) / 1000).toFixed(1)}K`} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="Actual" fill={TMRW_COLORS.red} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Forecast" fill={TMRW_COLORS.grey} radius={[4, 4, 0, 0]} />
            </RechartBarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── 04 Revenue Composition ───────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <SectionHeading number={4} title="Revenue Composition" />
          <ChartPeriodToggle
            options={[{ label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' }]}
            selected={compPeriod}
            onChange={setCompPeriod}
          />
        </div>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <TmrwAreaChart
            data={revenueComposition}
            index="month"
            series={[
              { dataKey: 'Joining Fee', color: TMRW_COLORS.red },
              { dataKey: 'Subscription', color: TMRW_COLORS.blue },
              { dataKey: 'Supplement', color: TMRW_COLORS.green },
              { dataKey: 'Other', color: TMRW_COLORS.amber },
            ]}
            height={288}
            className="h-56 md:h-72"
            yAxisWidth={48}
            valueFormatter={(v) => `$${(v / 1000).toFixed(1)}K`}
          />
        </div>
      </section>

      {/* ── 05 Retention ─────────────────────────────────────────── */}
      <section>
        <SectionHeading number={5} title="Retention" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Cohort Retention Curves — Last 6 Monthly Cohorts
          </h3>
          <TmrwLineChart
            data={cohortRetention}
            index="month"
            series={[
              { dataKey: 'Sep 2025', color: '#8B0000' },
              { dataKey: 'Oct 2025', color: '#D97706' },
              { dataKey: 'Nov 2025', color: '#EAB308' },
              { dataKey: 'Dec 2025', color: '#16A34A' },
              { dataKey: 'Jan 2026', color: '#0891B2' },
              { dataKey: 'Feb 2026', color: '#7C3AED' },
            ]}
            height={288}
            className="h-56 md:h-72"
            yAxisWidth={40}
            valueFormatter={(v) => `${v}%`}
            connectNulls={false}
          />
        </div>
      </section>

      {/* ── 06 Operational Delivery ──────────────────────────────── */}
      <section>
        <SectionHeading number={6} title="Operational Delivery" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">Pipeline Queue Trend</h3>
            <TmrwLineChart
              data={pipelineQueueTrend}
              index="month"
              series={[
                { dataKey: 'Queue Size', color: TMRW_COLORS.red },
              ]}
              height={224}
              className="h-44 md:h-56"
              yAxisWidth={30}
              showLegend={false}
            />
          </div>
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">Delivery Speed by Cohort</h3>
            <TmrwLineChart
              data={deliverySpeedByCohort}
              index="month"
              series={[
                { dataKey: 'Days to Dashboard', color: TMRW_COLORS.red },
                { dataKey: 'Target', color: TMRW_COLORS.grey, dashed: true },
              ]}
              height={224}
              className="h-44 md:h-56"
              yAxisWidth={30}
              valueFormatter={(v) => `${v}d`}
            />
          </div>
        </div>
      </section>

      {/* ── 07 Clinical Capacity ─────────────────────────────────── */}
      <section>
        <SectionHeading number={7} title="Clinical Capacity" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Demand vs Capacity (+1 Clinician in April Scenario)
          </h3>
          <TmrwLineChart
            data={capacityForecast}
            index="month"
            series={[
              { dataKey: 'Demand', color: TMRW_COLORS.red },
              { dataKey: 'Capacity', color: TMRW_COLORS.green },
            ]}
            height={256}
            className="h-48 md:h-64"
            yAxisWidth={48}
          />
        </div>
      </section>

      {/* ── 08 Unit Economics ────────────────────────────────────── */}
      <section>
        <SectionHeading number={8} title="Unit Economics" />
        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <MetricCard label="CM/Member (Current)" value="$56" status="amber" target=">$80" sparkline={[35, 40, 42, 48, 52, 56]} />
          <MetricCard label="LTV:CAC Ratio" value="3.2:1" status="green" target=">3:1" sparkline={[2.1, 2.4, 2.7, 2.9, 3.0, 3.2]} />
        </div>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">CM/Member Monthly with Target</h3>
          <TmrwLineChart
            data={cmPerMemberTrend}
            index="month"
            series={[
              { dataKey: 'CM/Member', color: TMRW_COLORS.red },
              { dataKey: 'Target', color: TMRW_COLORS.grey, dashed: true },
            ]}
            height={224}
            className="h-44 md:h-56"
            yAxisWidth={40}
            valueFormatter={(v) => `$${v}`}
          />
        </div>
      </section>
    </div>
  )
}

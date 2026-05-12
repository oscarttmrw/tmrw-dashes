'use client'

import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { AlertCard } from '@/components/dashboard/alert-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { Sparkline } from '@/components/dashboard/sparkline'
import { ChartPeriodToggle } from '@/components/dashboard/chart-period-toggle'
import { useDashboardData } from '@/lib/context/data-context'
import {
  ResponsiveContainer,
  LineChart as RechartLineChart,
  AreaChart as RechartAreaChart,
  BarChart as RechartBarChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridStyle, gridProps, tooltipStyle, legendStyle, TMRW_COLORS } from '@/lib/utils/chart-styles'

// ---------------------------------------------------------------------------
// 01 Cohort Retention Curves
// ---------------------------------------------------------------------------
const cohortRetentionMonthly = [
  { month: 'Month 0', 'Sep 2025': 100, 'Oct 2025': 100, 'Nov 2025': 100, 'Dec 2025': 100, 'Jan 2026': 100, 'Feb 2026': 100 },
  { month: 'Month 1', 'Sep 2025': 92, 'Oct 2025': 90, 'Nov 2025': 88, 'Dec 2025': 90, 'Jan 2026': 92, 'Feb 2026': 92 },
  { month: 'Month 2', 'Sep 2025': 85, 'Oct 2025': 86, 'Nov 2025': 82, 'Dec 2025': 85, 'Jan 2026': 85 },
  { month: 'Month 3', 'Sep 2025': 82, 'Oct 2025': 84, 'Nov 2025': 75, 'Dec 2025': 80 },
  { month: 'Month 4', 'Sep 2025': 80, 'Oct 2025': 82 },
  { month: 'Month 5', 'Sep 2025': 78 },
]

const cohortRetentionQuarterly = [
  { month: 'Month 0', 'Q3 2025': 100, 'Q4 2025': 100, 'Q1 2026': 100 },
  { month: 'Month 1', 'Q3 2025': 91, 'Q4 2025': 89, 'Q1 2026': 92 },
  { month: 'Month 2', 'Q3 2025': 85, 'Q4 2025': 84, 'Q1 2026': 85 },
  { month: 'Month 3', 'Q3 2025': 83, 'Q4 2025': 78 },
  { month: 'Month 4', 'Q3 2025': 81 },
  { month: 'Month 5', 'Q3 2025': 78 },
]

const cohortMonthlyCategories = ['Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026']
const cohortQuarterlyCategories = ['Q3 2025', 'Q4 2025', 'Q1 2026']

const cohortLineColors: Record<string, string> = {
  'Sep 2025': '#8B0000',
  'Oct 2025': '#EA580C',
  'Nov 2025': '#D97706',
  'Dec 2025': '#16A34A',
  'Jan 2026': '#0891B2',
  'Feb 2026': '#7C3AED',
  'Q3 2025': '#8B0000',
  'Q4 2025': '#16A34A',
  'Q1 2026': '#0891B2',
}

const churnByMonthOfLifeAll = [
  { month: 'Month 1', 'Churn %': 9 },
  { month: 'Month 2', 'Churn %': 7 },
  { month: 'Month 3', 'Churn %': 8 },
  { month: 'Month 4', 'Churn %': 3 },
  { month: 'Month 5', 'Churn %': 3 },
  { month: 'Month 6', 'Churn %': 2 },
]

const churnByMonthOfLifeLast3 = [
  { month: 'Month 1', 'Churn %': 10 },
  { month: 'Month 2', 'Churn %': 6 },
  { month: 'Month 3', 'Churn %': 7 },
  { month: 'Month 4', 'Churn %': 3 },
  { month: 'Month 5', 'Churn %': 2 },
  { month: 'Month 6', 'Churn %': 2 },
]

// ---------------------------------------------------------------------------
// 02 Retention by Journey Completeness
// ---------------------------------------------------------------------------
const journeyRetention = [
  { stage: 'Registered only', retention: '42%', n: 34 },
  { stage: 'Kit dispatched', retention: '55%', n: 28 },
  { stage: 'Results delivered', retention: '68%', n: 45 },
  { stage: 'Dashboard published', retention: '82%', n: 61 },
  { stage: 'Insights call', retention: '???%', n: 1 },
  { stage: 'Active plan', retention: '91%', n: 46 },
]

// ---------------------------------------------------------------------------
// 03 Churn Prediction & At-Risk Members
// ---------------------------------------------------------------------------
const riskSignals = [
  { signal: 'Days since activity > 30', severity: 'High' as const },
  { signal: 'Stalled > 45 days', severity: 'High' as const },
  { signal: 'Kit QC failure', severity: 'Medium' as const },
  { signal: 'No add-on adoption', severity: 'Medium' as const },
  { signal: 'Open ticket > 7 days', severity: 'Medium' as const },
  { signal: 'Payment failure', severity: 'High' as const },
  { signal: 'Dead zone > 4 wk no engagement', severity: 'High' as const },
  { signal: 'Overdue retest > 30 days', severity: 'Medium' as const },
]

const riskDistributionWeekly = [
  { period: 'W1 Jan', Healthy: 198, Attention: 39, 'At-Risk': 19 },
  { period: 'W2 Jan', Healthy: 199, Attention: 40, 'At-Risk': 19 },
  { period: 'W3 Jan', Healthy: 200, Attention: 40, 'At-Risk': 20 },
  { period: 'W4 Jan', Healthy: 201, Attention: 41, 'At-Risk': 20 },
  { period: 'W1 Feb', Healthy: 202, Attention: 41, 'At-Risk': 21 },
  { period: 'W2 Feb', Healthy: 203, Attention: 42, 'At-Risk': 22 },
  { period: 'W3 Feb', Healthy: 204, Attention: 42, 'At-Risk': 22 },
  { period: 'W4 Feb', Healthy: 205, Attention: 42, 'At-Risk': 23 },
]

const riskDistributionMonthly = [
  { period: 'Sep 2025', Healthy: 180, Attention: 30, 'At-Risk': 10 },
  { period: 'Oct 2025', Healthy: 185, Attention: 32, 'At-Risk': 12 },
  { period: 'Nov 2025', Healthy: 190, Attention: 35, 'At-Risk': 15 },
  { period: 'Dec 2025', Healthy: 195, Attention: 38, 'At-Risk': 18 },
  { period: 'Jan 2026', Healthy: 200, Attention: 40, 'At-Risk': 20 },
  { period: 'Feb 2026', Healthy: 205, Attention: 42, 'At-Risk': 23 },
]

// ---------------------------------------------------------------------------
// 04 Retest Conversion
// ---------------------------------------------------------------------------
const retestFunnel = [
  { stage: 'Eligible', count: 45 },
  { stage: 'Notified', count: 38 },
  { stage: 'Scheduled', count: 12 },
  { stage: 'Completed', count: 8 },
]

// ---------------------------------------------------------------------------
// 05 Revenue Retention (NRR)
// ---------------------------------------------------------------------------
const revenueByTenureMonthly = [
  { tenure: 'Month 1', 'Revenue per Member': 149 },
  { tenure: 'Month 3', 'Revenue per Member': 152 },
  { tenure: 'Month 6', 'Revenue per Member': 155 },
  { tenure: 'Month 9', 'Revenue per Member': 158 },
  { tenure: 'Month 12', 'Revenue per Member': 160 },
]

const revenueByTenureQuarterly = [
  { tenure: 'Q1', 'Revenue per Member': 150 },
  { tenure: 'Q2', 'Revenue per Member': 154 },
  { tenure: 'Q3', 'Revenue per Member': 158 },
  { tenure: 'Q4', 'Revenue per Member': 160 },
]

const revenueByTenureTrailing12 = [
  { tenure: 'Mar 2025', 'Revenue per Member': 145 },
  { tenure: 'Jun 2025', 'Revenue per Member': 148 },
  { tenure: 'Sep 2025', 'Revenue per Member': 152 },
  { tenure: 'Dec 2025', 'Revenue per Member': 156 },
  { tenure: 'Mar 2026', 'Revenue per Member': 160 },
]

// ---------------------------------------------------------------------------
// 06 Retention Levers
// ---------------------------------------------------------------------------
const retentionLevers = [
  {
    lever: 'Reduce Reg→Dashboard from 98d to 45d',
    retentionImpact: '+8pp',
    revenueImpact: '+$142K',
    basis: 'Dashboard Published = 82% retention vs Awaiting = 68%',
  },
  {
    lever: 'Achieve 50% insights call completion',
    retentionImpact: '+5pp',
    revenueImpact: '+$89K',
    basis: 'Projected from Active Plan retention of 91%. n=1 current.',
  },
  {
    lever: 'Reduce payment failure rate 3%→1%',
    retentionImpact: '+2pp',
    revenueImpact: '+$36K',
    basis: 'Payment failure = High severity churn signal.',
  },
  {
    lever: 'Eliminate dead-zone disengagement',
    retentionImpact: '+4pp',
    revenueImpact: '+$71K',
    basis: '38% of dead-zone members have zero touchpoints in 14d.',
  },
]

// ---------------------------------------------------------------------------
// Risk Signal Frequency — 8 Week Trend
// ---------------------------------------------------------------------------
const riskSignalTrends = [
  { signal: 'Stalled >45d', current: 48, data: [30, 33, 36, 38, 40, 42, 45, 48], severity: 'High' },
  { signal: 'Dead zone >4wk', current: 38, data: [22, 24, 27, 29, 31, 33, 35, 38], severity: 'High' },
  { signal: 'Days inactive >30', current: 31, data: [18, 20, 22, 24, 26, 28, 29, 31], severity: 'High' },
  { signal: 'No add-on adoption', current: 34, data: [28, 29, 30, 31, 32, 33, 33, 34], severity: 'Medium' },
  { signal: 'Open ticket >7d', current: 12, data: [18, 16, 15, 14, 14, 13, 12, 12], severity: 'Medium' },
  { signal: 'Kit QC failure', current: 11, data: [6, 7, 7, 8, 8, 9, 10, 11], severity: 'Medium' },
  { signal: 'Payment failure', current: 6, data: [10, 9, 8, 8, 7, 7, 6, 6], severity: 'High' },
  { signal: 'Overdue retest >30d', current: 5, data: [3, 3, 4, 4, 4, 5, 5, 5], severity: 'Medium' },
]

// ---------------------------------------------------------------------------
// Cohort detail mock helper
// ---------------------------------------------------------------------------
interface CohortDetail {
  cohortName: string
  totalMembers: number
  activeCount: number
  churnedCount: number
  topChurnReasons: string[]
}

const cohortDetails: Record<string, CohortDetail> = {
  'Sep 2025': { cohortName: 'Sep 2025', totalMembers: 42, activeCount: 33, churnedCount: 9, topChurnReasons: ['Dead zone inactivity', 'Payment failure', 'No dashboard unlock'] },
  'Oct 2025': { cohortName: 'Oct 2025', totalMembers: 38, activeCount: 31, churnedCount: 7, topChurnReasons: ['Stalled journey', 'Dead zone inactivity', 'Kit QC failure'] },
  'Nov 2025': { cohortName: 'Nov 2025', totalMembers: 45, activeCount: 34, churnedCount: 11, topChurnReasons: ['Dead zone inactivity', 'No add-on adoption', 'Support escalation'] },
  'Dec 2025': { cohortName: 'Dec 2025', totalMembers: 40, activeCount: 32, churnedCount: 8, topChurnReasons: ['Payment failure', 'Stalled journey', 'Dead zone inactivity'] },
  'Jan 2026': { cohortName: 'Jan 2026', totalMembers: 48, activeCount: 41, churnedCount: 7, topChurnReasons: ['Stalled journey', 'Overdue retest', 'Dead zone inactivity'] },
  'Feb 2026': { cohortName: 'Feb 2026', totalMembers: 52, activeCount: 48, churnedCount: 4, topChurnReasons: ['Dead zone inactivity', 'Payment failure'] },
  'Q3 2025': { cohortName: 'Q3 2025', totalMembers: 42, activeCount: 33, churnedCount: 9, topChurnReasons: ['Dead zone inactivity', 'Payment failure', 'No dashboard unlock'] },
  'Q4 2025': { cohortName: 'Q4 2025', totalMembers: 123, activeCount: 97, churnedCount: 26, topChurnReasons: ['Dead zone inactivity', 'Stalled journey', 'Payment failure'] },
  'Q1 2026': { cohortName: 'Q1 2026', totalMembers: 100, activeCount: 89, churnedCount: 11, topChurnReasons: ['Stalled journey', 'Overdue retest', 'Dead zone inactivity'] },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function RetentionPage() {
  const { members } = useDashboardData()

  // --- Toggle states for ChartPeriodToggle ---
  const [cohortPeriod, setCohortPeriod] = useState('monthly')
  const [churnPeriod, setChurnPeriod] = useState('all')
  const [riskPeriod, setRiskPeriod] = useState('monthly')
  const [revenuePeriod, setRevenuePeriod] = useState('monthly')

  // --- Cohort chart click state ---
  const [selectedCohort, setSelectedCohort] = useState<CohortDetail | null>(null)

  // --- Derive cohort chart data from toggle ---
  const cohortData = cohortPeriod === 'monthly' ? cohortRetentionMonthly : cohortRetentionQuarterly
  const cohortCategories = cohortPeriod === 'monthly' ? cohortMonthlyCategories : cohortQuarterlyCategories
  const cohortColors = cohortPeriod === 'monthly'
    ? ['rose', 'amber', 'yellow', 'emerald', 'cyan', 'violet']
    : ['rose', 'emerald', 'cyan']

  // --- Churn by month-of-life data from toggle ---
  const churnData = churnPeriod === 'all' ? churnByMonthOfLifeAll : churnByMonthOfLifeLast3

  // --- Risk distribution data from toggle ---
  const riskData = riskPeriod === 'weekly' ? riskDistributionWeekly : riskDistributionMonthly

  // --- Revenue data from toggle ---
  const revenueData = revenuePeriod === 'monthly'
    ? revenueByTenureMonthly
    : revenuePeriod === 'quarterly'
      ? revenueByTenureQuarterly
      : revenueByTenureTrailing12

  // --- Section 07: Recovery Tracker ---
  const recoveredMembers = useMemo(() => {
    return members.filter(
      (m) =>
        m.healthScore === 'healthy' &&
        m.riskFlags.some((f) => f.type === 'churn-risk' || f.type === 'stalled-journey')
    )
  }, [members])

  // --- Cohort click handler ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleCohortValueChange(value: any) {
    if (!value) {
      setSelectedCohort(null)
      return
    }
    const detail = cohortDetails[value.categoryClicked]
    setSelectedCohort(detail ?? null)
  }

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Retention' }]} />
        <div className="flex items-center gap-2">
          <DataSourceBadge source="tableau" />
          <DataSourceBadge source="hubspot" />
          <DataSourceBadge source="stripe" />
        </div>
      </div>

      {/* Headline Metrics */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <MetricCard
          label="90-Day Retention"
          value="78%"
          target=">85%"
          status="amber"
          sparkline={[72, 74, 75, 76, 77, 78]}
        />
        <MetricCard
          label="Monthly Churn"
          value="3.8%"
          target="<5%"
          status="green"
          sparkline={[4.2, 4.0, 3.8, 3.6, 3.5, 3.8]}
        />
        <MetricCard
          label="NRR"
          value="94%"
          target=">100%"
          status="amber"
          sparkline={[88, 89, 90, 91, 93, 94]}
        />
        <MetricCard
          label="At-Risk Count"
          value="23"
          status="red"
          sparkline={[10, 12, 15, 18, 20, 23]}
        />
      </div>

      {/* ================================================================= */}
      {/* 01 Cohort Retention Curves */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={1} title="Cohort Retention Curves" />

        <div className="space-y-3 md:space-y-6">
          {/* Multi-line cohort chart */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                  % Still Active by Signup Cohort
                </h3>
                <p className="text-xs text-dash-text-muted">X-axis: months since registration. Y-axis: % still active. Click a line for details.</p>
              </div>
              <ChartPeriodToggle
                options={[
                  { label: 'Monthly Cohorts', value: 'monthly' },
                  { label: 'Quarterly Cohorts', value: 'quarterly' },
                ]}
                selected={cohortPeriod}
                onChange={setCohortPeriod}
              />
            </div>
            <ResponsiveContainer width="100%" height={288} className="h-56 md:h-72">
              <RechartLineChart data={cohortData as object[]}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ ...legendStyle, fontSize: 12 }} />
                {cohortCategories.map(cat => (
                  <Line
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stroke={cohortLineColors[cat] || '#737373'}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: cohortLineColors[cat] || '#737373', stroke: '#fff', strokeWidth: 1.5 }}
                    connectNulls={false}
                  />
                ))}
              </RechartLineChart>
            </ResponsiveContainer>
          </div>

          {/* Cohort detail card (shown on click) */}
          {selectedCohort && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-dash-text">
                  Cohort: {selectedCohort.cohortName}
                </h4>
                <button
                  onClick={() => setSelectedCohort(null)}
                  className="text-xs text-dash-text-muted hover:text-dash-text"
                >
                  Dismiss
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-dash-text-muted">Total Members</p>
                  <p className="font-mono font-semibold text-dash-text">{selectedCohort.totalMembers}</p>
                </div>
                <div>
                  <p className="text-xs text-dash-text-muted">Active</p>
                  <p className="font-mono font-semibold text-emerald-500">{selectedCohort.activeCount}</p>
                </div>
                <div>
                  <p className="text-xs text-dash-text-muted">Churned</p>
                  <p className="font-mono font-semibold text-rose-500">{selectedCohort.churnedCount}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-dash-text-muted">Top Churn Reasons</p>
                <ul className="mt-1 list-inside list-disc text-sm text-dash-text">
                  {selectedCohort.topChurnReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Cohort comparison callout */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <p className="text-sm font-medium text-dash-text">
              November cohort retaining 7 points better at month 3 than September.
            </p>
          </div>

          {/* Churn rate by month-of-life */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                  Churn Rate by Month-of-Life
                </h3>
                <p className="text-xs text-dash-text-muted">Highest churn at month 2-3 (the &quot;dead zone&quot;).</p>
              </div>
              <ChartPeriodToggle
                options={[
                  { label: 'All Cohorts', value: 'all' },
                  { label: 'Last 3 Cohorts', value: 'last3' },
                ]}
                selected={churnPeriod}
                onChange={setChurnPeriod}
              />
            </div>
            <ResponsiveContainer width="100%" height={224} className="h-44 md:h-56">
              <RechartBarChart data={churnData as object[]}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Bar dataKey="Churn %" fill={TMRW_COLORS.red} radius={[4, 4, 0, 0]} />
              </RechartBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 02 Retention by Journey Completeness */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={2} title="Retention by Journey Completeness" />

        <div className="space-y-3 md:space-y-6">
          <div className="overflow-x-auto rounded-lg border border-dash-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface">
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Furthest Stage Reached</th>
                  <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Retention Rate</th>
                  <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">n=</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {journeyRetention.map((row) => (
                  <tr key={row.stage} className="bg-dash-surface/50">
                    <td className="px-4 py-2 font-medium text-dash-text">{row.stage}</td>
                    <td className="px-4 py-2 text-right font-mono text-dash-text">{row.retention}</td>
                    <td className="px-4 py-2 text-right font-mono text-dash-text-muted">{row.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
            <p className="text-sm font-medium text-dash-text">
              The biggest retention jump happens at Dashboard Published (+14pp). Every operational dollar should accelerate time-to-dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 03 Churn Prediction & At-Risk Members */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={3} title="Churn Prediction & At-Risk Members" />

        <div className="space-y-3 md:space-y-6">
          {/* Risk signal table */}
          <div className="overflow-x-auto rounded-lg border border-dash-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface">
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Risk Signal</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {riskSignals.map((row) => (
                  <tr key={row.signal} className="bg-dash-surface/50">
                    <td className="px-4 py-2 text-dash-text">{row.signal}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.severity === 'High'
                            ? 'bg-status-red-light text-status-red'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                        }`}
                      >
                        {row.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* At-risk member summary */}
          <AlertCard
            severity="high"
            title="Currently 23 members scored at-risk. 12 in dead zone, 6 overdue for retest, 5 with payment issues."
          />

          {/* Risk distribution over time */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                  Risk Distribution Over Time
                </h3>
                <p className="text-xs text-dash-text-muted">Stacked: healthy / attention / at-risk members.</p>
              </div>
              <ChartPeriodToggle
                options={[
                  { label: 'Weekly', value: 'weekly' },
                  { label: 'Monthly', value: 'monthly' },
                ]}
                selected={riskPeriod}
                onChange={setRiskPeriod}
              />
            </div>
            <ResponsiveContainer width="100%" height={256} className="h-48 md:h-64">
              <RechartAreaChart data={riskData}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="period" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={legendStyle} />
                <Area type="monotone" dataKey="Healthy" stackId="1" stroke={TMRW_COLORS.green} fill={TMRW_COLORS.green} fillOpacity={0.5} strokeWidth={0} />
                <Area type="monotone" dataKey="Attention" stackId="1" stroke={TMRW_COLORS.amber} fill={TMRW_COLORS.amber} fillOpacity={0.5} strokeWidth={0} />
                <Area type="monotone" dataKey="At-Risk" stackId="1" stroke="#DC2626" fill="#DC2626" fillOpacity={0.5} strokeWidth={0} />
              </RechartAreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Risk Signal Frequency — 8 Week Trend */}
      {/* ================================================================= */}
      <section>
        <div className="mb-4">
          <h2 className="font-sans text-base font-semibold tracking-[-0.01em] text-dash-text">
            Risk Signal Frequency — 8 Week Trend
          </h2>
        </div>

        <div className="space-y-3 md:space-y-6">
          {/* Mobile: card layout */}
          <div className="space-y-3 md:hidden">
            {riskSignalTrends.map((row) => {
              const delta = row.data[row.data.length - 1] - row.data[0]
              const sparkColor = delta > 0 ? '#DC2626' : delta < 0 ? '#16A34A' : '#737373'
              return (
                <div key={row.signal} className="rounded-lg border border-dash-border bg-dash-surface p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-dash-text">{row.signal}</span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.severity === 'High'
                          ? 'bg-status-red/10 text-status-red'
                          : 'bg-status-amber/10 text-status-amber'
                      }`}
                    >
                      {row.severity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Sparkline data={row.data} color={sparkColor} width={100} height={28} />
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-dash-text">{row.current}</span>
                      <span className={`font-mono text-sm font-bold ${delta > 0 ? 'text-status-red' : delta < 0 ? 'text-status-green' : 'text-dash-text-muted'}`}>
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Desktop: table layout */}
          <div className="hidden overflow-x-auto rounded-lg border border-dash-border md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface">
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Risk Signal</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Severity</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">8wk Trend</th>
                  <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Current</th>
                  <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Δ 8wk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {riskSignalTrends.map((row) => {
                  const delta = row.data[row.data.length - 1] - row.data[0]
                  const sparkColor = delta > 0 ? '#DC2626' : delta < 0 ? '#16A34A' : '#737373'
                  return (
                    <tr key={row.signal} className="bg-dash-surface/50">
                      <td className="px-4 py-2 font-medium text-dash-text">{row.signal}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.severity === 'High'
                              ? 'bg-status-red/10 text-status-red'
                              : 'bg-status-amber/10 text-status-amber'
                          }`}
                        >
                          {row.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Sparkline data={row.data} color={sparkColor} width={100} height={28} />
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-dash-text">{row.current}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold">
                        <span className={delta > 0 ? 'text-status-red' : delta < 0 ? 'text-status-green' : 'text-dash-text-muted'}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <p className="text-sm text-dash-text-muted">
              Sorted by current count. Top 3 signals (stalled, dead zone, inactive) are all growing — these are pipeline-speed driven.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 04 Retest Conversion */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={4} title="Retest Conversion" />

        <div className="space-y-3 md:space-y-6">
          {/* Retest funnel */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Retest Funnel
            </h3>
            {/* Mobile: vertical funnel */}
            <div className="flex flex-col gap-2 md:hidden">
              {retestFunnel.map((step, i) => {
                const widthPct = Math.max(20, (step.count / retestFunnel[0].count) * 100)
                const convRate =
                  i > 0
                    ? ((step.count / retestFunnel[i - 1].count) * 100).toFixed(0)
                    : null
                return (
                  <div key={step.stage}>
                    {convRate && (
                      <div className="flex justify-center py-1">
                        <span className="text-xs text-dash-text-muted">&darr; {convRate}% conv.</span>
                      </div>
                    )}
                    <div
                      className="flex items-center justify-between rounded-md bg-status-red-light px-4 py-3"
                      style={{ width: `${widthPct}%` }}
                    >
                      <span className="text-xs font-medium text-dash-text-secondary">{step.stage}</span>
                      <span className="text-lg font-bold text-dash-text">{step.count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Desktop: horizontal funnel */}
            <div className="hidden items-center gap-1 overflow-x-auto pb-4 md:flex">
              {retestFunnel.map((step, i) => {
                const widthPct = Math.max(20, (step.count / retestFunnel[0].count) * 100)
                const convRate =
                  i > 0
                    ? ((step.count / retestFunnel[i - 1].count) * 100).toFixed(0)
                    : null
                return (
                  <div key={step.stage} className="flex items-center">
                    <div
                      className="flex flex-col items-center justify-center rounded-md bg-status-red-light px-4 py-3 text-center"
                      style={{ minWidth: `${widthPct * 1.6}px`, width: `${widthPct * 1.6}px` }}
                    >
                      <span className="text-xs font-medium text-dash-text-secondary">{step.stage}</span>
                      <span className="text-lg font-bold text-dash-text">{step.count}</span>
                      {convRate && (
                        <span className="text-xs text-dash-text-muted">{convRate}% conv.</span>
                      )}
                    </div>
                    {i < retestFunnel.length - 1 && (
                      <span className="mx-1 text-dash-text-muted">&rarr;</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Time-to-retest & pipeline */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                Time-to-Retest
              </h3>
              <p className="text-2xl font-bold text-dash-text">5.2 months</p>
              <p className="mt-1 text-xs text-dash-text-muted">Median (target: 4 months)</p>
            </div>
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                Retest Pipeline
              </h3>
              <ul className="space-y-1 text-sm text-dash-text">
                <li><span className="font-mono font-semibold">28</span> members become retest-eligible in April</li>
                <li><span className="font-mono font-semibold">43</span> in May</li>
                <li><span className="font-mono font-semibold">67</span> in June</li>
              </ul>
            </div>
          </div>

          {/* Retest vs no-retest placeholder */}
          <div className="rounded-lg border border-dashed border-dash-border bg-dash-surface p-5">
            <p className="text-sm italic text-dash-text-muted">
              Retest vs no-retest retention: Insufficient data -- requires 2+ completed retest cycles.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 05 Revenue Retention (NRR) */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={5} title="Revenue Retention (NRR)" />

        <div className="space-y-3 md:space-y-6">
          {/* NRR metrics */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
            <MetricCard
              label="Net Revenue Retention (NRR)"
              value="94%"
              target=">100%"
              status="amber"
            />
            <MetricCard
              label="Treatment Journey Attach Rate"
              value="15%"
              target="40%"
              status="red"
            />
            <MetricCard
              label="Supplement Attach Rate"
              value="15%"
              status="amber"
            />
          </div>

          {/* Revenue per member by tenure */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                  Revenue per Member by Tenure
                </h3>
                <p className="text-xs text-dash-text-muted">Average monthly revenue ($) by member tenure.</p>
              </div>
              <ChartPeriodToggle
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Quarterly', value: 'quarterly' },
                  { label: 'Trailing 12mo', value: 'trailing12' },
                ]}
                selected={revenuePeriod}
                onChange={setRevenuePeriod}
              />
            </div>
            <ResponsiveContainer width="100%" height={224} className="h-44 md:h-56">
              <RechartBarChart data={revenueData as object[]}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="tenure" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={48} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${v}`} />
                <Bar dataKey="Revenue per Member" fill={TMRW_COLORS.cyan} radius={[4, 4, 0, 0]} />
              </RechartBarChart>
            </ResponsiveContainer>
          </div>

          {/* NRR alert */}
          <AlertCard
            severity="high"
            title="NRR below 100% — leaky bucket. Treatment journey attach rate at 15% vs 40% target is the primary gap."
          />
        </div>
      </section>

      {/* ================================================================= */}
      {/* 06 Retention Levers */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={6} title="Retention Levers — Quantified Impact" />

        {/* Mobile: card layout */}
        <div className="space-y-3 md:hidden">
          {retentionLevers.map((row) => (
            <div key={row.lever} className="rounded-lg border border-dash-border bg-dash-surface p-4">
              <p className="mb-2 text-sm font-medium text-dash-text">{row.lever}</p>
              <div className="mb-2 flex items-center gap-4">
                <div>
                  <p className="text-xs text-dash-text-muted">Retention</p>
                  <p className="font-mono text-sm font-bold text-status-green">{row.retentionImpact}</p>
                </div>
                <div>
                  <p className="text-xs text-dash-text-muted">Revenue</p>
                  <p className="font-mono text-sm font-bold text-status-green">{row.revenueImpact}</p>
                </div>
              </div>
              <p className="text-xs text-dash-text-muted">{row.basis}</p>
            </div>
          ))}
          <div className="rounded-lg border-2 border-dash-border bg-dash-surface-alt p-4">
            <p className="mb-1 text-sm font-bold text-dash-text">Combined potential</p>
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm font-bold text-dash-red">+19pp</span>
              <span className="font-mono text-sm font-bold text-dash-red">+$338K/year</span>
            </div>
            <p className="mt-1 text-xs text-dash-text-muted">Based on {members.filter(m => m.caseStatus === 'Open').length} active members × $249 ARPU</p>
          </div>
        </div>
        {/* Desktop: table layout */}
        <div className="hidden overflow-x-auto rounded-lg border border-dash-border md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Lever</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Retention Impact</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Revenue Impact (Annual)</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {retentionLevers.map((row) => (
                <tr key={row.lever} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{row.lever}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-status-green">{row.retentionImpact}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-status-green">{row.revenueImpact}</td>
                  <td className="px-4 py-2 text-xs text-dash-text-muted">{row.basis}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-dash-border bg-dash-surface-alt">
                <td className="px-4 py-3 font-bold text-dash-text">Combined potential</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-dash-red">+19pp</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-dash-red">+$338K/year</td>
                <td className="px-4 py-3 text-xs text-dash-text-muted">Based on {members.filter(m => m.caseStatus === 'Open').length} active members × $249 ARPU</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 07 Recovery Tracker */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={7} title="Recovery Tracker" />

        {recoveredMembers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-dash-border bg-dash-surface p-5">
            <p className="text-sm italic text-dash-text-muted">No recoveries tracked yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dash-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface">
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Member</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Previous Risk</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Recovery Date</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {recoveredMembers.map((m) => {
                  const relevantFlag = m.riskFlags.find(
                    (f) => f.type === 'churn-risk' || f.type === 'stalled-journey'
                  )
                  return (
                    <tr key={m.id} className="bg-dash-surface/50">
                      <td className="px-4 py-2 font-medium text-dash-text">{m.displayName}</td>
                      <td className="px-4 py-2 text-dash-text">
                        <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                          {relevantFlag?.type === 'churn-risk' ? 'Churn Risk' : 'Stalled Journey'}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-dash-text-muted">
                        {relevantFlag?.detectedAt
                          ? new Date(relevantFlag.detectedAt).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                          Healthy
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

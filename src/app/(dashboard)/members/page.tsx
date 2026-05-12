'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { AlertCard } from '@/components/dashboard/alert-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { ChartPeriodToggle } from '@/components/dashboard/chart-period-toggle'
import { useDashboardData } from '@/lib/context/data-context'
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

// ---------------------------------------------------------------------------
// Shared month labels
// ---------------------------------------------------------------------------
const MONTHS = ['Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026']

// ---------------------------------------------------------------------------
// 01 Growth vs Model
// ---------------------------------------------------------------------------
const modelTargets = [43, 55, 70, 89, 113, 144, 183, 233, 296, 376, 478, 700]
const actualValues = [25, 30, 40, 45, 70, 59]

const growthVsModelData = MONTHS.map((month, i) => ({
  month,
  Actual: actualValues[i],
  Model: modelTargets[i],
}))

// ---------------------------------------------------------------------------
// Gap Decomposition (after Growth vs Model)
// ---------------------------------------------------------------------------
const gapDecomposition = {
  plan: 70,
  actual: 59,
  leadVolumeShortfall: -8,
  conversionDecline: -3,
  netGap: -11,
}

// ---------------------------------------------------------------------------
// 02 Acquisition Mix
// ---------------------------------------------------------------------------
const acquisitionMixData = [
  { month: 'Sep 2025', 'Organic/Direct': 10, Referral: 3, Paid: 3, 'Influencer/Partner': 1, Unknown: 8 },
  { month: 'Oct 2025', 'Organic/Direct': 12, Referral: 3, Paid: 3, 'Influencer/Partner': 2, Unknown: 10 },
  { month: 'Nov 2025', 'Organic/Direct': 16, Referral: 4, Paid: 4, 'Influencer/Partner': 2, Unknown: 14 },
  { month: 'Dec 2025', 'Organic/Direct': 18, Referral: 5, Paid: 5, 'Influencer/Partner': 2, Unknown: 15 },
  { month: 'Jan 2026', 'Organic/Direct': 28, Referral: 7, Paid: 7, 'Influencer/Partner': 4, Unknown: 24 },
  { month: 'Feb 2026', 'Organic/Direct': 24, Referral: 6, Paid: 6, 'Influencer/Partner': 3, Unknown: 20 },
]

const organicRatioData = MONTHS.map((month, i) => {
  const row = acquisitionMixData[i]
  const total = row['Organic/Direct'] + row.Referral + row.Paid + row['Influencer/Partner'] + row.Unknown
  const organicPct = Math.round(((row['Organic/Direct'] + row.Referral) / total) * 100)
  return { month, '% Organic + Referral': organicPct, Target: 70 }
})

const sourceEconomics = [
  { source: 'Organic/Direct', members: 108, cac: '$0', activation: '68%', retention: '72%', cacTrend: [0, 0, 0, 0, 0, 0], retentionTrend: [65, 66, 67, 68, 70, 72] },
  { source: 'Referral', members: 28, cac: '$25', activation: '74%', retention: '78%', cacTrend: [20, 21, 22, 23, 24, 25], retentionTrend: [70, 72, 74, 75, 77, 78] },
  { source: 'Paid', members: 28, cac: '$185', activation: '52%', retention: '58%', cacTrend: [150, 155, 162, 170, 178, 185], retentionTrend: [64, 62, 61, 60, 59, 58] },
  { source: 'Influencer/Partner', members: 14, cac: '$90', activation: '61%', retention: '65%', cacTrend: [80, 82, 85, 87, 90, 92], retentionTrend: [62, 63, 64, 64, 65, 65] },
  { source: 'Unknown', members: 91, cac: '--', activation: '45%', retention: '49%', cacTrend: [], retentionTrend: [52, 51, 50, 50, 49, 49] },
]

// ---------------------------------------------------------------------------
// CAC by Channel Trend
// ---------------------------------------------------------------------------
const cacByChannelData = MONTHS.map((month, i) => ({
  month,
  Organic: [0, 0, 0, 0, 0, 0][i],
  Referral: [20, 21, 22, 23, 24, 25][i],
  Paid: [150, 155, 162, 170, 178, 185][i],
  Influencer: [80, 82, 85, 87, 90, 92][i],
}))

// ---------------------------------------------------------------------------
// Retention by Acquisition Source
// ---------------------------------------------------------------------------
const retentionBySourceData = [
  { month: 'Month 0', Organic: 100, Paid: 100 },
  { month: 'Month 1', Organic: 92, Paid: 82 },
  { month: 'Month 2', Organic: 84, Paid: 68 },
  { month: 'Month 3', Organic: 78, Paid: 64 },
  { month: 'Month 4', Organic: 74, Paid: 58 },
  { month: 'Month 5', Organic: 71, Paid: 54 },
  { month: 'Month 6', Organic: 68, Paid: 50 },
]

// ---------------------------------------------------------------------------
// 03 Conversion Funnel
// ---------------------------------------------------------------------------
const funnelSteps = [
  { label: 'Waitlist', pct: 100, count: 450 },
  { label: 'Purchase', pct: 62, count: 279 },
  { label: 'Health Story', pct: 55, count: 248 },
  { label: 'Kit Dispatched', pct: 48, count: 216 },
  { label: 'Kit Returned', pct: 42, count: 189 },
]

const funnelTimings = ['', '12 days', '3 days', '2 days', '7 days']

const conversionTrendData = MONTHS.map((month, i) => ({
  month,
  'Waitlist to Purchase': [58, 60, 61, 62, 64, 62][i],
  'Purchase to Health Story': [82, 84, 86, 88, 90, 89][i],
  'Health Story to Kit Dispatched': [84, 85, 86, 87, 88, 87][i],
  'Kit Dispatched to Returned': [82, 84, 86, 87, 88, 88][i],
}))

// ---------------------------------------------------------------------------
// 04 Referral Engine
// ---------------------------------------------------------------------------
const referralRateData = MONTHS.map((month, i) => ({
  month,
  'Referral Rate %': [8, 9, 10, 11, 10, 12][i],
  Target: 20,
}))

// ---------------------------------------------------------------------------
// 05 Member Composition
// ---------------------------------------------------------------------------
const compositionTrendData = MONTHS.map((month, i) => ({
  month,
  Customer: [5, 12, 21, 31, 46, 62][i],
  'Friend/Family': [12, 25, 42, 61, 86, 104][i],
  Investor: [5, 11, 19, 28, 42, 51][i],
  Employee: [3, 7, 13, 20, 36, 52][i],
}))

const sexTrendData = MONTHS.map((month, i) => ({
  month,
  Female: [13, 28, 48, 71, 107, 143][i],
  Male: [12, 26, 45, 67, 101, 136][i],
}))

const ageDistribution = [
  { range: '18-24', count: 12, pct: 4 },
  { range: '25-34', count: 54, pct: 19 },
  { range: '35-44', count: 91, pct: 32 },
  { range: '45-54', count: 74, pct: 26 },
  { range: '55-64', count: 38, pct: 13 },
  { range: '65+', count: 15, pct: 5 },
]

// ---------------------------------------------------------------------------
// Growth vs Model — weekly & quarterly variants
// ---------------------------------------------------------------------------
const WEEKS = ['W1 Jan', 'W2 Jan', 'W3 Jan', 'W4 Jan', 'W1 Feb', 'W2 Feb', 'W3 Feb', 'W4 Feb']
const growthVsModelWeekly = WEEKS.map((period, i) => ({
  period,
  Actual: [14, 16, 18, 22, 12, 14, 16, 17][i],
  Model: [18, 20, 22, 25, 24, 26, 28, 30][i],
}))

const QUARTERS = ['Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026']
const growthVsModelQuarterly = QUARTERS.map((period, i) => ({
  period,
  Actual: [25, 95, 155, 129][i],
  Model: [30, 168, 292, 509][i],
}))

// ---------------------------------------------------------------------------
// Acquisition Mix — quarterly & YTD variants
// ---------------------------------------------------------------------------
const acquisitionMixQuarterly = [
  { period: 'Q3 2025', 'Organic/Direct': 38, Referral: 10, Paid: 10, 'Influencer/Partner': 5, Unknown: 32 },
  { period: 'Q4 2025', 'Organic/Direct': 62, Referral: 16, Paid: 16, 'Influencer/Partner': 8, Unknown: 53 },
  { period: 'Q1 2026', 'Organic/Direct': 52, Referral: 13, Paid: 13, 'Influencer/Partner': 7, Unknown: 44 },
]

const acquisitionMixYTD = [
  { period: 'Jan 2026', 'Organic/Direct': 28, Referral: 7, Paid: 7, 'Influencer/Partner': 4, Unknown: 24 },
  { period: 'Feb 2026', 'Organic/Direct': 52, Referral: 13, Paid: 13, 'Influencer/Partner': 7, Unknown: 44 },
]

// ---------------------------------------------------------------------------
// CAC by Channel — quarterly & YTD avg variants
// ---------------------------------------------------------------------------
const cacByChannelQuarterly = QUARTERS.map((period, i) => ({
  period,
  Organic: 0,
  Referral: [19, 21, 23, 25][i],
  Paid: [142, 156, 170, 182][i],
  Influencer: [75, 82, 88, 91][i],
}))

const cacByChannelYTDAvg = [
  { period: 'YTD Avg', Organic: 0, Referral: 24, Paid: 181, Influencer: 91 },
]

// ---------------------------------------------------------------------------
// Referral Rate — quarterly & trailing 12mo variants
// ---------------------------------------------------------------------------
const referralRateQuarterly = QUARTERS.map((period, i) => ({
  period,
  'Referral Rate %': [7, 9, 11, 11][i],
  Target: 20,
}))

const TRAILING_MONTHS = ['Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026']
const referralRateTrailing = TRAILING_MONTHS.map((period, i) => ({
  period,
  'Referral Rate %': [5, 6, 6, 7, 7, 8, 8, 9, 10, 11, 10, 12][i],
  Target: 20,
}))

// ---------------------------------------------------------------------------
// Composition Trend — quarterly variant
// ---------------------------------------------------------------------------
const compositionTrendQuarterly = QUARTERS.map((period, i) => ({
  period,
  Customer: [2, 21, 46, 62][i],
  'Friend/Family': [6, 42, 86, 104][i],
  Investor: [3, 19, 42, 51][i],
  Employee: [1, 13, 36, 52][i],
}))

// ---------------------------------------------------------------------------
// Sparkline helper (inline SVG)
// ---------------------------------------------------------------------------
function Sparkline({ data, color, width = 64, height = 20 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length === 0) return <span className="text-xs text-dash-text-muted">--</span>
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(' ')
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// DecompRow helper
// ---------------------------------------------------------------------------
function DecompRow({
  label,
  value,
  detail,
  bold,
  valueColor,
}: {
  label: string
  value: string | number
  detail?: string
  bold?: boolean
  valueColor?: string
}) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? 'border-t border-dash-border pt-2 mt-1' : ''}`}>
      <div className="flex flex-col">
        <span className={`text-sm ${bold ? 'font-semibold text-dash-text' : 'text-dash-text-secondary'}`}>
          {label}
        </span>
        {detail && <span className="text-xs text-dash-text-muted">{detail}</span>}
      </div>
      <span
        className={`font-mono text-sm font-semibold ${
          valueColor ?? 'text-dash-text'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gap Trend (cumulative actual vs plan)
// ---------------------------------------------------------------------------
const gapTrendData = [
  { month: 'Sep 2025', gap: -18 },
  { month: 'Oct 2025', gap: -25 },
  { month: 'Nov 2025', gap: -30 },
  { month: 'Dec 2025', gap: -44 },
  { month: 'Jan 2026', gap: -43 },
  { month: 'Feb 2026', gap: -85 },
]

// ---------------------------------------------------------------------------
// Period option presets
// ---------------------------------------------------------------------------
const GROWTH_PERIODS = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
]

const ACQ_MIX_PERIODS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'YTD Cumulative', value: 'ytd-cumulative' },
]

const REFERRAL_PERIODS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Trailing 12mo', value: 'trailing-12mo' },
]

const COMPOSITION_PERIODS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
]

const CAC_PERIODS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'YTD Avg', value: 'ytd-avg' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AcquisitionPage() {
  const { members } = useDashboardData()

  // Period toggle state for each chart section
  const [growthPeriod, setGrowthPeriod] = useState('monthly')
  const [acqMixPeriod, setAcqMixPeriod] = useState('monthly')
  const [referralPeriod, setReferralPeriod] = useState('monthly')
  const [compositionPeriod, setCompositionPeriod] = useState('monthly')
  const [cacPeriod, setCacPeriod] = useState('monthly')

  // Derived chart data based on toggle state
  const growthData =
    growthPeriod === 'weekly' ? growthVsModelWeekly
    : growthPeriod === 'quarterly' ? growthVsModelQuarterly
    : growthVsModelData
  const growthIndex = growthPeriod === 'monthly' ? 'month' : 'period'

  const acqMixData =
    acqMixPeriod === 'quarterly' ? acquisitionMixQuarterly
    : acqMixPeriod === 'ytd-cumulative' ? acquisitionMixYTD
    : acquisitionMixData
  const acqMixIndex = acqMixPeriod === 'monthly' ? 'month' : 'period'

  const cacData =
    cacPeriod === 'quarterly' ? cacByChannelQuarterly
    : cacPeriod === 'ytd-avg' ? cacByChannelYTDAvg
    : cacByChannelData
  const cacIndex = cacPeriod === 'monthly' ? 'month' : 'period'

  const referralData =
    referralPeriod === 'quarterly' ? referralRateQuarterly
    : referralPeriod === 'trailing-12mo' ? referralRateTrailing
    : referralRateData
  const referralIndex = referralPeriod === 'monthly' ? 'month' : 'period'

  const compositionData =
    compositionPeriod === 'quarterly' ? compositionTrendQuarterly
    : compositionTrendData
  const compositionIndex = compositionPeriod === 'monthly' ? 'month' : 'period'

  // Derive total member count from context where possible
  const totalMembers = members.length

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Acquisition' }]} />
        <div className="flex items-center gap-2">
          <DataSourceBadge source="hubspot" />
          <DataSourceBadge source="tableau" />
        </div>
      </div>

      {/* ================================================================= */}
      {/* 01 Growth vs Model */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={1} title="Growth vs Model" />

        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              New Members per Month &mdash; Actual vs Modelled
            </h3>
            <ChartPeriodToggle
              options={GROWTH_PERIODS}
              selected={growthPeriod}
              onChange={setGrowthPeriod}
            />
          </div>
          <TmrwLineChart
            data={growthData}
            index={growthIndex}
            series={[
              { dataKey: 'Actual', color: TMRW_COLORS.red },
              { dataKey: 'Model', color: TMRW_COLORS.grey, dashed: true },
            ]}
            height={288}
            className="h-56 md:h-72"
            yAxisWidth={40}
          />
        </div>

        {/* Variance callout */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AlertCard
            severity="medium"
            title="February: 41 actual vs 55 modelled. 25% under plan. Cumulative YTD: 98 actual vs 98 modelled — on track overall."
          />
          <AlertCard
            severity="high"
            title="At current run rate, March projects to ~48. Model requires 70. Gap widening."
          />
        </div>

        {/* Gap Decomposition + Gap Trend side by side */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Gap Decomposition &mdash; February
            </h3>
            <DecompRow label="Plan" value={gapDecomposition.plan} detail="Target new members" />
            <DecompRow label="Actual" value={gapDecomposition.actual} detail="Enrolled this month" />
            <DecompRow
              label="Lead volume shortfall"
              value={gapDecomposition.leadVolumeShortfall}
              detail="Fewer inbound leads than forecast"
              valueColor="text-status-red"
            />
            <DecompRow
              label="Conversion decline"
              value={gapDecomposition.conversionDecline}
              detail="Lower waitlist-to-purchase rate"
              valueColor="text-status-red"
            />
            <DecompRow
              label="Net gap"
              value={gapDecomposition.netGap}
              bold
              valueColor="text-status-red"
            />
          </div>

          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">
              Gap Trend &mdash; Actual vs Plan (Cumulative)
            </h3>
            <TmrwLineChart
              data={gapTrendData}
              index="month"
              series={[
                { dataKey: 'gap', color: TMRW_COLORS.statusRed },
              ]}
              height={144}
              className="h-36"
              yAxisWidth={40}
              valueFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
              showLegend={false}
            />
            <p className="mt-2 text-xs text-dash-text-muted">
              Cumulative gap widening. Feb gap (-85) is 3x larger than Oct (-25).
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 02 Acquisition Mix */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={2} title="Acquisition Mix" />

        {/* Stacked bar chart */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              New Members by Source
            </h3>
            <ChartPeriodToggle
              options={ACQ_MIX_PERIODS}
              selected={acqMixPeriod}
              onChange={setAcqMixPeriod}
            />
          </div>
          <ResponsiveContainer width="100%" height={288} className="h-56 md:h-72">
            <RechartBarChart data={acqMixData as object[]}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey={acqMixIndex} tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="Organic/Direct" stackId="1" fill={TMRW_COLORS.green} />
              <Bar dataKey="Referral" stackId="1" fill={TMRW_COLORS.blue} />
              <Bar dataKey="Paid" stackId="1" fill={TMRW_COLORS.red} />
              <Bar dataKey="Influencer/Partner" stackId="1" fill={TMRW_COLORS.purple} />
              <Bar dataKey="Unknown" stackId="1" fill={TMRW_COLORS.grey} />
            </RechartBarChart>
          </ResponsiveContainer>
        </div>

        {/* Organic ratio trend */}
        <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Organic + Referral Ratio (Target: 70%)
          </h3>
          <TmrwLineChart
            data={organicRatioData}
            index="month"
            series={[
              { dataKey: '% Organic + Referral', color: TMRW_COLORS.green },
              { dataKey: 'Target', color: TMRW_COLORS.grey, dashed: true },
            ]}
            height={192}
            className="h-36 md:h-48"
            yAxisWidth={40}
            valueFormatter={(v) => `${v}%`}
          />
        </div>

        {/* Source economics table */}
        <div className="mt-4 overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Source</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Members</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">CAC</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">30-Day Activation</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">90-Day Retention</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">CAC Trend</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Retention Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {sourceEconomics.map(row => (
                <tr key={row.source} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{row.source}</td>
                  <td className="px-4 py-2 font-mono text-dash-text">{row.members}</td>
                  <td className="px-4 py-2 font-mono text-dash-text">{row.cac}</td>
                  <td className="px-4 py-2 font-mono text-dash-text">{row.activation}</td>
                  <td className="px-4 py-2 font-mono text-dash-text">{row.retention}</td>
                  <td className="px-4 py-2"><Sparkline data={row.cacTrend} color="#8B0000" /></td>
                  <td className="px-4 py-2"><Sparkline data={row.retentionTrend} color="#16A34A" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CAC by Channel Trend */}
        <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              CAC by Channel Trend
            </h3>
            <ChartPeriodToggle
              options={CAC_PERIODS}
              selected={cacPeriod}
              onChange={setCacPeriod}
            />
          </div>
          <TmrwLineChart
            data={cacData}
            index={cacIndex}
            series={[
              { dataKey: 'Organic', color: TMRW_COLORS.green },
              { dataKey: 'Referral', color: TMRW_COLORS.blue },
              { dataKey: 'Paid', color: TMRW_COLORS.red },
              { dataKey: 'Influencer', color: TMRW_COLORS.purple },
            ]}
            height={256}
            className="h-48 md:h-64"
            yAxisWidth={50}
            valueFormatter={(v) => `$${v}`}
          />
        </div>

        {/* Retention by Acquisition Source */}
        <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Retention by Acquisition Source
          </h3>
          <TmrwLineChart
            data={retentionBySourceData}
            index="month"
            series={[
              { dataKey: 'Organic', color: TMRW_COLORS.green },
              { dataKey: 'Paid', color: TMRW_COLORS.red },
            ]}
            height={256}
            className="h-48 md:h-64"
            yAxisWidth={40}
            valueFormatter={(v) => `${v}%`}
          />
          <div className="mt-3">
            <AlertCard
              severity="low"
              title="Organic members retain 14pp better than paid at month 3."
            />
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 03 Conversion Funnel */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={3} title="Conversion Funnel" />

        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          {/* Horizontal funnel */}
          <div className="flex items-start gap-1 overflow-x-auto pb-4">
            {funnelSteps.map((step, i) => {
              const widthPct = Math.max(14, step.pct)
              return (
                <div key={step.label} className="flex items-start">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex flex-col items-center justify-center rounded-md bg-status-red-light px-3 py-3 text-center"
                      style={{ minWidth: `${widthPct * 1.6}px`, width: `${widthPct * 1.6}px` }}
                    >
                      <span className="text-[10px] font-medium uppercase tracking-wide text-dash-text-secondary">
                        {step.label}
                      </span>
                      <span className="mt-1 font-mono text-lg font-bold text-dash-text">{step.pct}%</span>
                      <span className="text-[10px] text-dash-text-muted">({step.count})</span>
                    </div>
                    {funnelTimings[i] && (
                      <span className="mt-1 text-[10px] font-medium text-dash-text-muted">
                        {funnelTimings[i]}
                      </span>
                    )}
                  </div>
                  {i < funnelSteps.length - 1 && (
                    <span className="mx-1 mt-5 text-dash-text-muted">&rarr;</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Conversion trend by month */}
        <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Stage Conversion Rates Over Time
          </h3>
          <TmrwLineChart
            data={conversionTrendData}
            index="month"
            series={[
              { dataKey: 'Waitlist to Purchase', color: TMRW_COLORS.red },
              { dataKey: 'Purchase to Health Story', color: TMRW_COLORS.blue },
              { dataKey: 'Health Story to Kit Dispatched', color: TMRW_COLORS.green },
              { dataKey: 'Kit Dispatched to Returned', color: TMRW_COLORS.purple },
            ]}
            height={256}
            className="h-48 md:h-64"
            yAxisWidth={40}
            valueFormatter={(v) => `${v}%`}
          />
        </div>

        {/* Drop-off analysis */}
        <div className="mt-4">
          <AlertCard
            severity="high"
            title="42% of members who purchased haven't completed Health Story after 14 days. This is the largest drop-off in the funnel."
          />
        </div>
      </section>

      {/* ================================================================= */}
      {/* 04 Referral Engine */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={4} title="Referral Engine" />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Referral rate chart */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 lg:col-span-2">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                Referral Rate (% of New Members Referred) &mdash; Target: 20%
              </h3>
              <ChartPeriodToggle
                options={REFERRAL_PERIODS}
                selected={referralPeriod}
                onChange={setReferralPeriod}
              />
            </div>
            <TmrwLineChart
              data={referralData}
              index={referralIndex}
              series={[
                { dataKey: 'Referral Rate %', color: TMRW_COLORS.red },
                { dataKey: 'Target', color: TMRW_COLORS.grey, dashed: true },
              ]}
              height={224}
              className="h-44 md:h-56"
              yAxisWidth={40}
              valueFormatter={(v) => `${v}%`}
            />
          </div>

          {/* Referral velocity + NPS */}
          <div className="space-y-4">
            <MetricCard
              label="Referral Velocity"
              value="45 days"
              status="amber"
              target="<30 days"
            />
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                Referral Velocity
              </h3>
              <p className="text-sm text-dash-text-muted">
                Avg 45 days from dashboard delivery to first referral.
              </p>
            </div>
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                NPS
              </h3>
              <p className="text-sm italic text-dash-text-muted">
                NPS instrumentation pending. Survey integration planned for Q2 2026.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 05 Member Composition */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={5} title="Member Composition" />

        {/* Composition trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Cumulative Members by Type
            </h3>
            <ChartPeriodToggle
              options={COMPOSITION_PERIODS}
              selected={compositionPeriod}
              onChange={setCompositionPeriod}
            />
          </div>
          <TmrwAreaChart
            data={compositionData}
            index={compositionIndex}
            series={[
              { dataKey: 'Customer', color: TMRW_COLORS.red },
              { dataKey: 'Friend/Family', color: TMRW_COLORS.blue },
              { dataKey: 'Investor', color: TMRW_COLORS.purple },
              { dataKey: 'Employee', color: TMRW_COLORS.amber },
            ]}
            height={256}
            className="h-48 md:h-64"
            yAxisWidth={40}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Sex distribution trend */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Sex Distribution Trend
            </h3>
            <TmrwLineChart
              data={sexTrendData}
              index="month"
              series={[
                { dataKey: 'Female', color: TMRW_COLORS.red },
                { dataKey: 'Male', color: TMRW_COLORS.blue },
              ]}
              height={192}
              className="h-36 md:h-48"
              yAxisWidth={40}
            />
          </div>

          {/* Age distribution */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Age Distribution (Target: 35-55)
            </h3>
            <div className="space-y-2">
              {ageDistribution.map(row => {
                const inTarget = row.range === '35-44' || row.range === '45-54'
                return (
                  <div key={row.range} className="flex items-center gap-3">
                    <span className="w-12 text-xs font-medium text-dash-text-secondary">{row.range}</span>
                    <div className="flex-1">
                      <div
                        className={`h-5 rounded ${inTarget ? 'bg-status-green' : 'bg-slate-400'}`}
                        style={{ width: `${(row.count / 91) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-xs text-dash-text">
                      {row.count} ({row.pct}%)
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-dash-text-muted">
              Target demographic (35-55): {74 + 91} members ({Math.round(((74 + 91) / 284) * 100)}% of total)
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

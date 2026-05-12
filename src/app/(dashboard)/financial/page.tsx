'use client'

import { useMemo, useState } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { ChartPeriodToggle } from '@/components/dashboard/chart-period-toggle'
import {
  ResponsiveContainer,
  LineChart as RechartLineChart,
  BarChart as RechartBarChart,
  PieChart,
  Pie,
  Cell,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridStyle, gridProps, tooltipStyle, legendStyle, lineDot, TMRW_COLORS } from '@/lib/utils/chart-styles'
import { useDashboardData } from '@/lib/context/data-context'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function formatMonthKey(key: string) {
  const [year, month] = key.split('-')
  return `${MONTH_LABELS[parseInt(month, 10) - 1]} ${year}`
}

function txTypeLabel(type: string): string {
  switch (type) {
    case 'foundations-membership': return 'Foundations'
    case 'advanced-testing': return 'Advanced Testing'
    case 'supplements': return 'Supplements'
    case 'medication': return 'Medication'
    case 'treatment-journey': return 'Treatment Journeys'
    default: return 'Other'
  }
}

function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function weekKeyFromDate(d: Date): string {
  const startOfYear = new Date(d.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000)
  const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
  return `W${String(weekNum).padStart(2, '0')} ${d.getFullYear()}`
}

function quarterKeyFromDate(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1
  return `Q${q} ${d.getFullYear()}`
}

// ---------------------------------------------------------------------------
// Forecast data (hardcoded per spec)
// ---------------------------------------------------------------------------

const forecastData = [
  { month: 'Sep 2025', forecast: 8000 },
  { month: 'Oct 2025', forecast: 10500 },
  { month: 'Nov 2025', forecast: 13000 },
  { month: 'Dec 2025', forecast: 16000 },
  { month: 'Jan 2026', forecast: 22000 },
  { month: 'Feb 2026', forecast: 28000 },
]

const failureReasonTrend = [
  { month: 'Oct 2025', 'Insufficient Funds': 2, 'Card Expired': 1, 'Do Not Honor': 1, 'Other': 0 },
  { month: 'Nov 2025', 'Insufficient Funds': 3, 'Card Expired': 1, 'Do Not Honor': 0, 'Other': 1 },
  { month: 'Dec 2025', 'Insufficient Funds': 2, 'Card Expired': 2, 'Do Not Honor': 1, 'Other': 0 },
  { month: 'Jan 2026', 'Insufficient Funds': 4, 'Card Expired': 1, 'Do Not Honor': 2, 'Other': 1 },
  { month: 'Feb 2026', 'Insufficient Funds': 7, 'Card Expired': 4, 'Do Not Honor': 3, 'Other': 1 },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FinancialPage() {
  const { transactions, manualMetrics, members } = useDashboardData()
  const { unitEconomics } = manualMetrics

  // Period toggle state
  const [revenueByMonthPeriod, setRevenueByMonthPeriod] = useState('month')
  const [waterfallPeriod, setWaterfallPeriod] = useState('monthly')
  const [forecastPeriod] = useState('monthly')

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const authorizedTx = useMemo(
    () => transactions.filter((tx) => tx.outcome === 'authorized'),
    [transactions]
  )

  const totalRevenue = useMemo(
    () => authorizedTx.reduce((sum, tx) => sum + tx.amount, 0),
    [authorizedTx]
  )

  const avgTransactionValue = useMemo(
    () => (authorizedTx.length > 0 ? totalRevenue / authorizedTx.length : 0),
    [authorizedTx, totalRevenue]
  )

  const declinedTx = useMemo(
    () => transactions.filter((tx) => tx.outcome === 'declined' || tx.outcome === 'blocked'),
    [transactions]
  )

  const declinedRate = useMemo(
    () => (transactions.length > 0 ? (declinedTx.length / transactions.length) * 100 : 0),
    [declinedTx, transactions]
  )

  // Revenue by type
  const revenueByType = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const tx of authorizedTx) {
      const key = txTypeLabel(tx.type)
      acc[key] = (acc[key] || 0) + tx.amount
    }
    return acc
  }, [authorizedTx])

  const revenueTypeRows = useMemo(() => {
    const entries = Object.entries(revenueByType)
    const total = entries.reduce((s, [, v]) => s + v, 0)
    return entries
      .map(([label, amount]) => ({
        label,
        amount: Math.round(amount),
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [revenueByType])


  // Revenue by period (for the bar chart in Section 2b)
  const revenueByPeriod = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {}
    for (const tx of authorizedTx) {
      const d = new Date(tx.createdAt)
      let key: string
      switch (revenueByMonthPeriod) {
        case 'week':
          key = weekKeyFromDate(d)
          break
        case 'quarter':
          key = quarterKeyFromDate(d)
          break
        case 'ytd': {
          const year = d.getFullYear().toString()
          key = year
          break
        }
        default:
          key = formatMonthKey(monthKeyFromDate(d))
      }
      if (!grouped[key]) grouped[key] = { 'Foundations': 0, 'Advanced Testing': 0, 'Supplements': 0, 'Medication': 0, 'Treatment Journeys': 0 }
      grouped[key][txTypeLabel(tx.type)] += tx.amount
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, vals]) => ({
        period,
        ...Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, Math.round(v)])),
      }))
  }, [authorizedTx, revenueByMonthPeriod])


  // MRR Waterfall — derive from monthly subscription transactions
  const mrrWaterfall = useMemo(() => {
    // Group subscription revenue by member by month
    const memberMonthly: Record<string, Record<string, number>> = {}
    for (const tx of authorizedTx) {
      if (tx.type !== 'foundations-membership' || !tx.memberId) continue
      const d = new Date(tx.createdAt)
      const mKey = monthKeyFromDate(d)
      if (!memberMonthly[tx.memberId]) memberMonthly[tx.memberId] = {}
      memberMonthly[tx.memberId][mKey] = (memberMonthly[tx.memberId][mKey] || 0) + tx.amount
    }

    const allMonths = Array.from(
      new Set(Object.values(memberMonthly).flatMap((m) => Object.keys(m)))
    ).sort()

    if (allMonths.length < 2) return []

    const rows = []
    for (let i = 1; i < allMonths.length; i++) {
      const prev = allMonths[i - 1]
      const curr = allMonths[i]
      let newMrr = 0
      let expansion = 0
      let contraction = 0
      let churned = 0
      let starting = 0

      for (const mid of Object.keys(memberMonthly)) {
        const prevVal = memberMonthly[mid][prev] || 0
        const currVal = memberMonthly[mid][curr] || 0
        starting += prevVal

        if (prevVal === 0 && currVal > 0) {
          newMrr += currVal
        } else if (prevVal > 0 && currVal === 0) {
          churned -= prevVal
        } else if (currVal > prevVal) {
          expansion += currVal - prevVal
        } else if (currVal < prevVal) {
          contraction -= prevVal - currVal
        }
      }

      const ending = starting + newMrr + expansion + contraction + churned
      rows.push({
        month: formatMonthKey(curr),
        starting: Math.round(starting),
        new: Math.round(newMrr),
        expansion: Math.round(expansion),
        contraction: Math.round(contraction),
        churned: Math.round(churned),
        ending: Math.round(ending),
      })
    }
    return rows
  }, [authorizedTx])

  // MRR Waterfall filtered by waterfallPeriod (monthly vs quarterly)
  const filteredMrrWaterfall = useMemo(() => {
    if (waterfallPeriod === 'monthly') return mrrWaterfall
    // Quarterly: group every 3 consecutive months and sum the values
    if (mrrWaterfall.length === 0) return []
    const quarters: typeof mrrWaterfall = []
    for (let i = 0; i < mrrWaterfall.length; i += 3) {
      const chunk = mrrWaterfall.slice(i, i + 3)
      const starting = chunk[0].starting
      const ending = chunk[chunk.length - 1].ending
      const newMrr = chunk.reduce((s, r) => s + r.new, 0)
      const expansion = chunk.reduce((s, r) => s + r.expansion, 0)
      const contraction = chunk.reduce((s, r) => s + r.contraction, 0)
      const churned = chunk.reduce((s, r) => s + r.churned, 0)
      // Derive quarter label from the last month in the chunk
      const lastLabel = chunk[chunk.length - 1].month
      const parts = lastLabel.split(' ')
      const mIdx = MONTH_LABELS.indexOf(parts[0])
      const qNum = Math.floor(mIdx / 3) + 1
      const qLabel = `Q${qNum} ${parts[1]}`
      quarters.push({
        month: qLabel,
        starting: Math.round(starting),
        new: Math.round(newMrr),
        expansion: Math.round(expansion),
        contraction: Math.round(contraction),
        churned: Math.round(churned),
        ending: Math.round(ending),
      })
    }
    return quarters
  }, [mrrWaterfall, waterfallPeriod])

  // Net MRR Change (for bar chart above waterfall table)
  const netMrrChange = useMemo(
    () =>
      filteredMrrWaterfall.map((row) => ({
        month: row.month,
        'Net Change': row.new + row.expansion + row.contraction + row.churned,
      })),
    [filteredMrrWaterfall]
  )

  // MRR sparkline for MRR card
  const mrrSparkline = useMemo(
    () => mrrWaterfall.map((r) => r.ending),
    [mrrWaterfall]
  )

  const currentMrr = mrrWaterfall.length > 0 ? mrrWaterfall[mrrWaterfall.length - 1].ending : 0

  // Cohort Revenue
  const cohortRevenue = useMemo(() => {
    // Group members by their first transaction month (cohort)
    const memberFirstMonth: Record<string, string> = {}
    for (const tx of authorizedTx) {
      if (!tx.memberId) continue
      const d = new Date(tx.createdAt)
      const mKey = monthKeyFromDate(d)
      if (!memberFirstMonth[tx.memberId] || mKey < memberFirstMonth[tx.memberId]) {
        memberFirstMonth[tx.memberId] = mKey
      }
    }

    // Group revenue by cohort and month offset
    const cohortData: Record<string, Record<number, number>> = {}
    for (const tx of authorizedTx) {
      if (!tx.memberId) continue
      const cohort = memberFirstMonth[tx.memberId]
      if (!cohort) continue
      const d = new Date(tx.createdAt)
      const txMonth = monthKeyFromDate(d)
      const [cY, cM] = cohort.split('-').map(Number)
      const [tY, tM] = txMonth.split('-').map(Number)
      const offset = (tY - cY) * 12 + (tM - cM)
      if (!cohortData[cohort]) cohortData[cohort] = {}
      cohortData[cohort][offset] = (cohortData[cohort][offset] || 0) + tx.amount
    }

    const cohorts = Object.keys(cohortData).sort()
    const maxOffset = 5

    return cohorts.map((cohort) => {
      const row: Record<string, number | string | null> = { cohort: formatMonthKey(cohort) }
      for (let i = 0; i <= maxOffset; i++) {
        const val = cohortData[cohort][i]
        row[`m${i}`] = val != null ? Math.round(val) : null
      }
      return row
    })
  }, [authorizedTx])

  // Cohort heatmap max
  const cohortMax = useMemo(() => {
    let max = 0
    for (const row of cohortRevenue) {
      for (let i = 0; i <= 5; i++) {
        const val = row[`m${i}`]
        if (typeof val === 'number' && val > max) max = val
      }
    }
    return max
  }, [cohortRevenue])

  // Failure reasons
  const failureReasons = useMemo(() => {
    const reasons: Record<string, number> = {}
    for (const tx of declinedTx) {
      const reason = tx.outcome === 'declined' ? 'Declined' : 'Blocked'
      reasons[reason] = (reasons[reason] || 0) + 1
    }
    const total = Object.values(reasons).reduce((s, v) => s + v, 0)
    return Object.entries(reasons)
      .map(([reason, count]) => ({
        reason,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [declinedTx])

  // Active members count
  const activeMembers = useMemo(
    () => members.filter((m) => ('status' in m ? (m as Record<string, unknown>).status === 'active' : true)).length,
    [members]
  )

  // Unit economics derived values
  const revenuePerMember = useMemo(
    () => (activeMembers > 0 ? totalRevenue / activeMembers : 0),
    [totalRevenue, activeMembers]
  )

  // Actual vs Forecast
  const actualVsForecast = useMemo(() => {
    const monthlyActual: Record<string, number> = {}
    for (const tx of authorizedTx) {
      const d = new Date(tx.createdAt)
      const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`
      monthlyActual[label] = (monthlyActual[label] || 0) + tx.amount
    }

    return forecastData.map((f) => ({
      month: f.month,
      Actual: Math.round(monthlyActual[f.month] || 0),
      Forecast: f.forecast,
    }))
  }, [authorizedTx])

  const latestVariance = useMemo(() => {
    const last = actualVsForecast[actualVsForecast.length - 1]
    if (!last) return { amount: 0, pct: 0 }
    const diff = last.Actual - last.Forecast
    return {
      amount: diff,
      pct: last.Forecast > 0 ? Math.round((diff / last.Forecast) * 100) : 0,
    }
  }, [actualVsForecast])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb + Data Sources */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Financial' }]} />
        <div className="flex items-center gap-2">
          <DataSourceBadge source="stripe" />
          <DataSourceBadge source="manual" />
        </div>
      </div>

      {/* Section 1: Revenue Headlines */}
      <section>
        <SectionHeading number={1} title="Revenue Headlines" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <MetricCard
            label="MRR"
            value={`$${currentMrr.toLocaleString()}`}
            status="green"
            target="$15K"
            sparkline={mrrSparkline}
          />
          <MetricCard
            label="Total Revenue (Period)"
            value={`$${totalRevenue.toLocaleString()}`}
            status="amber"
            target="$100K"
            sparkline={[6800, 8900, 10500, 12100, 19500, 23499]}
          />
          <MetricCard
            label="Avg Transaction Value"
            value={`$${Math.round(avgTransactionValue).toLocaleString()}`}
            status="green"
            sparkline={[148, 152, 155, 158, 160, 162]}
          />
          <MetricCard
            label="Declined Payments"
            value={`${declinedRate.toFixed(1)}%`}
            status="green"
            target="<5%"
            direction="lower-better"
            sparkline={[4.2, 3.8, 3.5, 3.2, 3.0, 3.0]}
          />
        </div>
      </section>

      {/* Section 1b: Unit Economics Ratios */}
      <section>
        <SectionHeading number={1} title="Unit Economics Ratios" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <MetricCard
            label="LTV:CAC Ratio"
            value={`${unitEconomics.ltvCacRatio}:1`}
            status="green"
            target=">3:1"
            sparkline={[2.4, 2.6, 2.8, 2.9, 3.0, 3.2]}
          />
          <MetricCard
            label="Months to Payback"
            value={String(unitEconomics.cacPaybackMonths)}
            status="green"
            target="<6"
            direction="lower-better"
            sparkline={[6.2, 5.8, 5.5, 5.2, 5.0, 4.8]}
          />
          <MetricCard
            label="Revenue per Member"
            value={`$${Math.round(revenuePerMember).toLocaleString()}`}
            status="amber"
            sparkline={[240, 252, 260, 268, 278, 286]}
          />
          <MetricCard
            label="Gross-to-Net Margin"
            value="20%"
            status="amber"
            sparkline={[15, 16, 17, 18, 19, 20]}
          />
        </div>
      </section>

      {/* Section 2: Revenue by Month */}
      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading number={2} title="Revenue by Month" />
          <ChartPeriodToggle
            options={[
              { label: 'Week', value: 'week' },
              { label: 'Month', value: 'month' },
              { label: 'Quarter', value: 'quarter' },
              { label: 'YTD', value: 'ytd' },
            ]}
            selected={revenueByMonthPeriod}
            onChange={setRevenueByMonthPeriod}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 lg:col-span-2">
            <ResponsiveContainer width="100%" height={256} className="h-48 md:h-64">
              <RechartBarChart data={revenueByPeriod as object[]}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="period" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={50} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `$${(Number(v) / 1000).toFixed(1)}K`} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="Foundations" stackId="revenue" fill={TMRW_COLORS.red} />
                <Bar dataKey="Advanced Testing" stackId="revenue" fill={TMRW_COLORS.amber} />
                <Bar dataKey="Supplements" stackId="revenue" fill={TMRW_COLORS.green} />
                <Bar dataKey="Medication" stackId="revenue" fill={TMRW_COLORS.blue} />
                <Bar dataKey="Treatment Journeys" stackId="revenue" fill={TMRW_COLORS.purple} radius={[4, 4, 0, 0]} />
              </RechartBarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Type donut */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              By Type
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={revenueTypeRows}
                  dataKey="amount"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {revenueTypeRows.map((_, i) => (
                    <Cell key={i} fill={[TMRW_COLORS.red, TMRW_COLORS.amber, TMRW_COLORS.green, TMRW_COLORS.blue, TMRW_COLORS.purple][i % 5]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `$${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={legendStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Section 3: MRR Waterfall */}
      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading number={3} title="MRR Waterfall" />
          <ChartPeriodToggle
            options={[
              { label: 'Monthly', value: 'monthly' },
              { label: 'Quarterly', value: 'quarterly' },
            ]}
            selected={waterfallPeriod}
            onChange={setWaterfallPeriod}
          />
        </div>
        <div className="mb-4">
          <ResponsiveContainer width="100%" height={192} className="h-48">
            <RechartBarChart data={netMrrChange as object[]}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={50} tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `${Number(v) >= 0 ? '+' : ''}$${Number(v).toLocaleString()}`} />
              <Bar dataKey="Net Change" fill={TMRW_COLORS.green} radius={[4, 4, 0, 0]} />
            </RechartBarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">{waterfallPeriod === 'quarterly' ? 'Quarter' : 'Month'}</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Starting</th>
                <th className="px-4 py-3 text-right font-medium text-status-green">+ New</th>
                <th className="px-4 py-3 text-right font-medium text-status-green">+ Expansion</th>
                <th className="px-4 py-3 text-right font-medium text-status-amber">- Contraction</th>
                <th className="px-4 py-3 text-right font-medium text-status-red">- Churned</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Ending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {filteredMrrWaterfall.map((row) => (
                <tr key={row.month} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{row.month}</td>
                  <td className="px-4 py-2 text-right font-mono text-dash-text">
                    ${row.starting.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-status-green">
                    +${row.new.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-status-green">
                    +${row.expansion.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-status-amber">
                    -${Math.abs(row.contraction).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-status-red">
                    -${Math.abs(row.churned).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-dash-text">
                    ${row.ending.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4: Cohort Revenue (Heatmap) */}
      <section>
        <SectionHeading number={4} title="Cohort Revenue" />
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Cohort</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">M0</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">M1</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">M2</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">M3</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">M4</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">M5</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {cohortRevenue.map((row) => (
                <tr key={row.cohort as string} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{row.cohort as string}</td>
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const val = row[`m${i}`] as number | null
                    const intensity = val != null && cohortMax > 0 ? (val as number) / cohortMax : 0
                    return (
                      <td
                        key={i}
                        className="px-4 py-2 text-right font-mono text-dash-text"
                        style={
                          val != null
                            ? { backgroundColor: `rgba(37, 99, 235, ${0.08 + intensity * 0.35})` }
                            : undefined
                        }
                      >
                        {val != null ? `$${(val as number).toLocaleString()}` : (
                          <span className="text-dash-text-muted">&mdash;</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5: Actual vs Forecast */}
      <section>
        <SectionHeading number={5} title="Actual vs Forecast" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <ResponsiveContainer width="100%" height={288} className="h-56 md:h-72">
            <RechartLineChart data={actualVsForecast as object[]} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} tickLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} tickLine={axisLineStyle} width={60} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${(Number(v) / 1000).toFixed(1)}K`} />
              <Legend wrapperStyle={legendStyle} />
              <Line type="monotone" dataKey="Actual" stroke={TMRW_COLORS.blue} strokeWidth={3} dot={lineDot(TMRW_COLORS.blue)} activeDot={{ r: 7, fill: TMRW_COLORS.blue, stroke: '#fff', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="Forecast" stroke={TMRW_COLORS.grey} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: TMRW_COLORS.grey, stroke: '#fff', strokeWidth: 1 }} />
            </RechartLineChart>
          </ResponsiveContainer>
          <div className="mt-4 rounded-md border border-dash-border bg-dash-surface p-3">
            <p className="text-sm text-dash-text-secondary">
              <span className="font-medium text-dash-text">Latest Month Variance:</span>{' '}
              <span
                className={
                  latestVariance.amount >= 0 ? 'text-status-green' : 'text-status-red'
                }
              >
                {latestVariance.amount >= 0 ? '+' : ''}${latestVariance.amount.toLocaleString()}{' '}
                ({latestVariance.pct >= 0 ? '+' : ''}{latestVariance.pct}%)
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: Refunds & Failures */}
      <section>
        <SectionHeading number={6} title="Refunds & Failures" />
        <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-2">
          <MetricCard
            label="Declined Rate"
            value={`${declinedRate.toFixed(1)}%`}
            status="green"
            target="<5%"
            direction="lower-better"
          />
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Failure Reason</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Count</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {failureReasons.map((row) => (
                <tr key={row.reason} className="bg-dash-surface/50">
                  <td className="px-4 py-2 text-dash-text">{row.reason}</td>
                  <td className="px-4 py-2 text-right font-mono text-dash-text">{row.count}</td>
                  <td className="px-4 py-2 text-right font-mono text-dash-text-secondary">{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Failure Reason Trend
          </h3>
          <ResponsiveContainer width="100%" height={256} className="h-48 md:h-64">
            <RechartBarChart data={failureReasonTrend as object[]}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="Insufficient Funds" stackId="1" fill={TMRW_COLORS.red} />
              <Bar dataKey="Card Expired" stackId="1" fill={TMRW_COLORS.amber} />
              <Bar dataKey="Do Not Honor" stackId="1" fill={TMRW_COLORS.purple} />
              <Bar dataKey="Other" stackId="1" fill={TMRW_COLORS.grey} />
            </RechartBarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Section 7: Unit Economics */}
      <section>
        <SectionHeading number={7} title="Unit Economics" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <MetricCard
            label="Blended CAC"
            value={`$${unitEconomics.blendedCAC}`}
            status="green"
            target="<$100"
            direction="lower-better"
          />
          <MetricCard
            label="CM/Member"
            value={`$${unitEconomics.contributionMarginPerMember}`}
            status="amber"
            target=">$80"
          />
          <MetricCard
            label="LTV:CAC"
            value={String(unitEconomics.ltvCacRatio)}
            status="green"
            target=">3"
          />
          <MetricCard
            label="CAC Payback"
            value={`${unitEconomics.cacPaybackMonths} months`}
            status="amber"
            target="<6 months"
            direction="lower-better"
          />
        </div>
      </section>

    </div>
  )
}

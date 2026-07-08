'use client'

import { useMemo } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { MetricCard } from '@/components/dashboard/metric-card'
import { LockedState } from '@/components/dashboard/locked-state'
import { TmrwLineChart, type ChartSeries } from '@/components/dashboard/tmrw-line-chart'
import { useDashboardData } from '@/lib/context/data-context'
import { useDateFilter } from '@/lib/context/filter-context'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { axisTickStyle, gridProps, tooltipStyle } from '@/lib/utils/chart-styles'

/* ─── Helpers ─────────────────────────────────────────────────────── */

const RED = '#E61317'
const GREYS = ['#CFCBC3', '#B8B5AE', '#9C988F', '#807C73', '#65615A', '#4A4640']
const BAR_COLORS = ['#1A1A1A', '#7A1F22', '#3676C9', '#16A34A', '#E5A04A', '#7C3AED', '#737373', '#A3A3A3']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const fmtNum = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })
const num = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n }

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? null : d
}
function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_SHORT[m - 1]} '${String(y).slice(2)}`
}
function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}
function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function MembersPage() {
  const { hubspot_contacts, operational_data, zendesk, loading, error, refresh } = useDashboardData()

  // Aggregate CSAT from Zendesk satisfaction scores (% satisfied of rated) +
  // rated-ticket count. Null until CSAT is actually captured.
  const csat = useMemo(() => {
    const rated = zendesk
      .map(r => (r.satisfaction_score === null || r.satisfaction_score === undefined ? null : Number(r.satisfaction_score)))
      .filter((n): n is number => n !== null && !isNaN(n))
    if (rated.length === 0) return null
    return { pct: Math.round((rated.filter(s => s >= 4).length / rated.length) * 100), n: rated.length }
  }, [zendesk])
  const { value: pickerValue, setValue: setPickerValue } = useDateFilter()

  const realNow = useMemo(() => new Date(), [])
  // Anchor "current month" on the selected period's end (so "Last month"
  // re-anchors), falling back to the real now when it's the live month.
  const anchor = useMemo(() => {
    const end = pickerValue.period.end
    const isCurrent = end.getFullYear() === realNow.getFullYear() && end.getMonth() === realNow.getMonth()
    return isCurrent ? realNow : end
  }, [pickerValue.period.end, realNow])
  const anchorDay = anchor.getDate()
  const anchorMonthKey = monthKeyOf(anchor)
  const prevMonthKey = monthKeyOf(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))

  /* ── Operational data (registrations, casebook, churn) ── */
  const ops = useMemo(() =>
    operational_data
      .map(r => ({
        d: parseDate(r.date),
        reg: num(r.customers_registered),
        casebook: num(r.total_casebook),
        churn: num(r.churned_members),
      }))
      .filter((r): r is { d: Date; reg: number; casebook: number; churn: number } => r.d !== null)
  , [operational_data])

  // Total casebook — per Dan, counted from HubSpot: each contact that is an
  // actual member (a customer lifecycle stage, or a membership start date, or a
  // customer type set) counts once. Falls back to the latest reported
  // operational_data figure when no HubSpot contacts are loaded.
  // NOTE (confirm with Dan): this counts all member contacts cumulatively. If
  // "casebook" should mean only currently-active (un-churned) members, switch
  // the predicate to also require no churn_date.
  const totalCasebook = useMemo(() => {
    const isMember = (r: Record<string, unknown>) => {
      const stage = typeof r.lifecycle_stage === 'string' ? r.lifecycle_stage.toLowerCase() : ''
      return (
        stage.includes('customer') ||
        (typeof r.membership_start_date === 'string' && r.membership_start_date.trim() !== '') ||
        (typeof r.customer_type === 'string' && r.customer_type.trim() !== '')
      )
    }
    const fromHubspot = hubspot_contacts.reduce((n, r) => n + (isMember(r) ? 1 : 0), 0)
    if (hubspot_contacts.length > 0) return fromHubspot

    let latest: { d: Date; casebook: number } | null = null
    for (const r of ops) if (!latest || r.d > latest.d) latest = r
    return latest?.casebook ?? 0
  }, [hubspot_contacts, ops])

  /* ── §01 New members — cumulative per-month overlay ── */
  const { overlayData, overlayMonths } = useMemo(() => {
    const byMonth = new Map<string, number[]>()
    for (const r of ops) {
      const key = monthKeyOf(r.d)
      const dim = daysInMonth(r.d)
      const arr = byMonth.get(key) ?? new Array(dim).fill(0)
      arr[r.d.getDate() - 1] += r.reg
      byMonth.set(key, arr)
    }
    const recent = Array.from(byMonth.keys()).sort().slice(-6)
    const maxDay = Math.max(0, ...recent.map(k => byMonth.get(k)!.length))
    const data: Record<string, number | null>[] = []
    for (let day = 1; day <= maxDay; day++) {
      const row: Record<string, number | null> = { day }
      for (const k of recent) {
        const arr = byMonth.get(k)!
        const cap = k === anchorMonthKey ? anchorDay : arr.length
        if (day > cap) { row[k] = null; continue }
        let cum = 0
        for (let i = 0; i < day && i < arr.length; i++) cum += arr[i] ?? 0
        row[k] = cum
      }
      data.push(row)
    }
    return { overlayData: data, overlayMonths: recent }
  }, [ops, anchorMonthKey, anchorDay])

  const overlaySeries: ChartSeries[] = overlayMonths.map((k, i) => ({
    dataKey: k,
    name: monthLabel(k),
    color: k === anchorMonthKey ? RED : (GREYS[Math.max(0, GREYS.length - (overlayMonths.length - i))] ?? '#B8B5AE'),
  }))

  // New members MTD + "vs same day last month" + run-rate projection.
  const newMembers = useMemo(() => {
    const sumUpTo = (monthKey: string, dayCap: number) =>
      ops.filter(r => monthKeyOf(r.d) === monthKey && r.d.getDate() <= dayCap)
        .reduce((s, r) => s + r.reg, 0)
    const mtd = sumUpTo(anchorMonthKey, anchorDay)
    const sameDayLast = sumUpTo(prevMonthKey, anchorDay)
    const dim = daysInMonth(anchor)
    const projected = anchorDay > 0 ? Math.round((mtd / anchorDay) * dim) : 0
    const deltaVsLast = sameDayLast > 0 ? Math.round(((mtd - sameDayLast) / sameDayLast) * 100) : null
    return { mtd, sameDayLast, projected, deltaVsLast }
  }, [ops, anchor, anchorMonthKey, prevMonthKey, anchorDay])

  /* ── §03 Casebook composition (customer type + membership status) ── */
  const customerTypeData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of hubspot_contacts) {
      const t = typeof r.customer_type === 'string' && r.customer_type.trim() ? r.customer_type.trim() : 'Unspecified'
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return Array.from(counts, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
  }, [hubspot_contacts])

  const membershipStatusData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of hubspot_contacts) {
      const s = typeof r.membership_status === 'string' && r.membership_status.trim() ? r.membership_status.trim() : 'Unspecified'
      counts.set(s, (counts.get(s) ?? 0) + 1)
    }
    return Array.from(counts, ([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count)
  }, [hubspot_contacts])

  const hasCasebook = customerTypeData.length > 0

  /* ── §06 Monthly churn ── */
  const churnData = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const r of ops) byMonth.set(monthKeyOf(r.d), (byMonth.get(monthKeyOf(r.d)) ?? 0) + r.churn)
    return Array.from(byMonth.keys()).sort().map(k => ({ month: monthLabel(k), churned: byMonth.get(k)! }))
  }, [ops])
  const hasChurn = churnData.some(d => d.churned > 0)

  /* ── §07 Retention cohorts + 90-day ── */
  const cohort = useMemo(() => {
    const members = hubspot_contacts
      .map(r => {
        const start = parseDate(r.membership_start_date)
        if (!start) return null
        return { start, churn: parseDate(r.churn_date) }
      })
      .filter((m): m is { start: Date; churn: Date | null } => m !== null)

    if (members.length === 0) return { data: [] as Record<string, number | null>[], series: [] as ChartSeries[], retention90: null as number | null, count: 0 }

    const cohorts = new Map<string, { start: Date; members: { start: Date; churn: Date | null }[] }>()
    for (const m of members) {
      const key = monthKeyOf(m.start)
      const c = cohorts.get(key) ?? { start: new Date(m.start.getFullYear(), m.start.getMonth(), 1), members: [] }
      c.members.push(m)
      cohorts.set(key, c)
    }
    const nowM = new Date(realNow.getFullYear(), realNow.getMonth(), 1)
    const keys = Array.from(cohorts.keys()).sort().slice(-6)

    const retainedAt = (c: { start: Date; members: { start: Date; churn: Date | null }[] }, t: number) =>
      c.members.filter(m => {
        if (!m.churn) return true
        return monthsBetween(c.start, new Date(m.churn.getFullYear(), m.churn.getMonth(), 1)) > t
      }).length

    const maxLife = Math.min(12, Math.max(0, ...keys.map(k => monthsBetween(cohorts.get(k)!.start, nowM))))
    const data: Record<string, number | null>[] = []
    for (let t = 0; t <= maxLife; t++) {
      const row: Record<string, number | null> = { t }
      for (const k of keys) {
        const c = cohorts.get(k)!
        const age = monthsBetween(c.start, nowM)
        row[k] = t > age || c.members.length === 0 ? null : (retainedAt(c, t) / c.members.length) * 100
      }
      data.push(row)
    }

    // 90-day ≈ retention at month 3, averaged over cohorts at least 3 months old.
    let sum = 0, n = 0
    for (const k of keys) {
      const c = cohorts.get(k)!
      if (monthsBetween(c.start, nowM) < 3 || c.members.length === 0) continue
      sum += (retainedAt(c, 3) / c.members.length) * 100
      n++
    }
    const series: ChartSeries[] = keys.map((k, i) => ({
      dataKey: k,
      name: monthLabel(k),
      color: GREYS[Math.max(0, GREYS.length - (keys.length - i))] ?? '#B8B5AE',
    }))
    if (series.length) series[series.length - 1].color = RED

    return { data, series, retention90: n > 0 ? Math.round(sum / n) : null, count: keys.length }
  }, [hubspot_contacts, realNow])

  const noData = hubspot_contacts.length === 0 && operational_data.length === 0

  return (
    <div className="space-y-6 md:space-y-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Members' }]} />
        <div className="flex items-center gap-2">
          <DataSourceBadge source="hubspot_contacts" />
          <DataSourceBadge source="operational_data" />
          <DateRangePicker value={pickerValue} onChange={setPickerValue} />
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-status-red/30 bg-status-red/5 px-4 py-3">
          <p className="font-sans text-sm text-status-red">Could not load member data: {error}</p>
          <button onClick={() => refresh()} className="ml-4 rounded border border-status-red/40 px-3 py-1 font-sans text-xs text-status-red hover:bg-status-red/10">Retry</button>
        </div>
      )}
      {loading && !error && (
        <div className="rounded-lg border border-dash-border bg-dash-bg/60 px-4 py-3">
          <p className="font-sans text-sm text-dash-text-muted">Loading latest data…</p>
        </div>
      )}
      {noData && !loading && !error && (
        <div className="rounded-lg border border-dash-border bg-dash-bg/60 px-4 py-3">
          <p className="font-sans text-sm text-dash-text-muted">No member data ingested yet — upload HubSpot Contacts + Operational Data to populate this page.</p>
        </div>
      )}

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        <MetricCard label="Total Casebook" value={totalCasebook > 0 ? fmtNum(totalCasebook) : '—'} status="grey" />
        <MetricCard
          label="New Members · MTD"
          value={fmtNum(newMembers.mtd)}
          target={`vs ${fmtNum(newMembers.sameDayLast)} same day last month`}
          trend={newMembers.deltaVsLast}
          status={newMembers.deltaVsLast === null ? 'grey' : newMembers.deltaVsLast >= 0 ? 'green' : 'red'}
        />
        <MetricCard label="Projected Month-End" value={newMembers.projected > 0 ? fmtNum(newMembers.projected) : '—'} target="run-rate to month end" status="grey" />
        <MetricCard label="90-Day Retention" value={cohort.retention90 !== null ? `${cohort.retention90}%` : null} building={cohort.retention90 === null} status="grey" />
      </div>

      {/* ── 01 Acquisition — New Members ── */}
      <section>
        <SectionHeading number={1} title="Acquisition — New Members" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
          <p className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
            Cumulative new members by month · current month in red
          </p>
          {overlayData.length > 0 ? (
            <TmrwLineChart data={overlayData} index="day" series={overlaySeries} height={300} valueFormatter={fmtNum} connectNulls={false} />
          ) : (
            <p className="py-10 text-center font-sans text-sm text-dash-text-muted">No registration data yet.</p>
          )}
        </div>
      </section>

      {/* ── 02 Acquisition Mix ── */}
      <section>
        <SectionHeading number={2} title="Acquisition Mix" />
        <LockedState reason="Awaiting an acquisition-channel field (Paid / Organic / Influencer / Digital) on the HubSpot export." />
      </section>

      {/* ── 03 Casebook composition ── */}
      <section>
        <SectionHeading number={3} title="Casebook — Composition" />
        {hasCasebook ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
              <p className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">By customer type</p>
              <div className="h-[260px]">
                <ResponsiveContainer>
                  <BarChart data={customerTypeData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid {...gridProps} horizontal={false} />
                    <XAxis type="number" tick={axisTickStyle} />
                    <YAxis type="category" dataKey="type" tick={axisTickStyle} width={110} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => fmtNum(Number(v) || 0)} />
                    <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                      {customerTypeData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
              <p className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">By membership status</p>
              <div className="h-[260px]">
                <ResponsiveContainer>
                  <BarChart data={membershipStatusData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid {...gridProps} horizontal={false} />
                    <XAxis type="number" tick={axisTickStyle} />
                    <YAxis type="category" dataKey="status" tick={axisTickStyle} width={110} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => fmtNum(Number(v) || 0)} />
                    <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                      {membershipStatusData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dash-border bg-dash-surface p-6 text-center font-sans text-sm text-dash-text-muted">No HubSpot contact data yet.</p>
        )}
      </section>

      {/* ── 04 Demographics ── */}
      <section>
        <SectionHeading number={4} title="Casebook — Demographics" />
        <LockedState reason="Tornado breakdowns by age, gender and location (state/city vs rural) — pending age / sex / location fields on the completed HubSpot export." />
      </section>

      {/* ── 05 Product attach ── */}
      <section>
        <SectionHeading number={5} title="Casebook — Product Attach Rate" />
        <LockedState reason="Members attached to 1 / 2 / 3 / 4+ products — pending the full per-member product set on the HubSpot export." />
      </section>

      {/* ── 06 Retention — Monthly Churn ── */}
      <section>
        <SectionHeading number={6} title="Retention — Monthly Churn" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
          {hasChurn ? (
            <div className="h-[280px]">
              <TmrwLineChart
                data={churnData}
                index="month"
                series={[{ dataKey: 'churned', name: 'Churned members', color: RED }]}
                height={280}
                valueFormatter={fmtNum}
                showLegend={false}
              />
            </div>
          ) : (
            <p className="py-10 text-center font-sans text-sm text-dash-text-muted">No churn recorded in the operational data yet.</p>
          )}
        </div>
      </section>

      {/* ── 07 Retention — Cohort Curves ── */}
      <section>
        <SectionHeading number={7} title="Retention — Cohort Curves" />
        {cohort.count > 0 ? (
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <p className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
              % of each signup-month cohort still active · by months since joining · most recent in red
            </p>
            <TmrwLineChart data={cohort.data} index="t" series={cohort.series} height={300} valueFormatter={(v) => `${Math.round(v)}%`} connectNulls={false} />
          </div>
        ) : (
          <LockedState reason="Cohort retention needs membership start + churn dates — pending the backdated HubSpot membership history." />
        )}
      </section>

      {/* ── 08 Voice of customer ── */}
      <section>
        <SectionHeading number={8} title="Voice of Customer — NPS & CSAT" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <LockedState reason="NPS — awaiting survey responses (0–10). Locked until a survey source is connected." />
          {csat === null ? (
            <LockedState reason="CSAT — awaiting satisfaction ratings in the Zendesk feed." />
          ) : (
            <MetricCard
              label="CSAT"
              value={`${csat.pct}%`}
              target={`Satisfied of ${fmtNum(csat.n)} rated tickets · Zendesk`}
              status={csat.pct >= 90 ? 'green' : csat.pct >= 75 ? 'amber' : 'red'}
            />
          )}
        </div>
      </section>
    </div>
  )
}

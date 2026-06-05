'use client'

import { useMemo } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { MetricCard } from '@/components/dashboard/metric-card'
import { LockedState } from '@/components/dashboard/locked-state'
import { TmrwLineChart } from '@/components/dashboard/tmrw-line-chart'
import { useDashboardData } from '@/lib/context/data-context'
import { useDateFilter } from '@/lib/context/filter-context'
import { Lock } from 'lucide-react'

/* ─── Helpers ─────────────────────────────────────────────────────── */

const RED = '#E61317'
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

/* Small tile-sized locked placeholder (LockedState is a full-width box). */
function LockedTile({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-dashed border-dash-border bg-dash-surface/40 p-3 opacity-80 md:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-muted md:text-[11px]">{label}</span>
        <Lock size={11} className="text-dash-text-muted" />
      </div>
      <span className="mt-2 font-mono text-lg text-dash-text-muted md:text-2xl">—</span>
      <p className="mt-auto pt-2 font-sans text-[10px] italic text-dash-text-muted md:text-[11px]">{reason}</p>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function DeliveryPage() {
  const { hubspot_contacts, loading, error, refresh } = useDashboardData()
  const { value: pickerValue, setValue: setPickerValue } = useDateFilter()

  const realNow = useMemo(() => new Date(), [])
  const anchor = useMemo(() => {
    const end = pickerValue.period.end
    const isCurrent = end.getFullYear() === realNow.getFullYear() && end.getMonth() === realNow.getMonth()
    return isCurrent ? realNow : end
  }, [pickerValue.period.end, realNow])
  const anchorDay = anchor.getDate()
  const anchorMonthKey = monthKeyOf(anchor)
  const prevMonthKey = monthKeyOf(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))

  const hasData = hubspot_contacts.length > 0

  // Count of a milestone this month vs the same day last month.
  const vsLastMonth = useMemo(() => (field: string) => {
    let mtd = 0, prev = 0
    for (const r of hubspot_contacts) {
      const d = parseDate(r[field])
      if (!d) continue
      const mk = monthKeyOf(d)
      if (mk === anchorMonthKey && d.getDate() <= anchorDay) mtd++
      else if (mk === prevMonthKey && d.getDate() <= anchorDay) prev++
    }
    const delta = prev > 0 ? Math.round(((mtd - prev) / prev) * 100) : null
    return { mtd, prev, delta }
  }, [hubspot_contacts, anchorMonthKey, prevMonthKey, anchorDay])

  // Avg days between two milestone dates, by completion month (the trend line).
  const velocity = useMemo(() => (startField: string, endField: string) => {
    const byMonth = new Map<string, { sum: number; n: number }>()
    let totSum = 0, totN = 0
    for (const r of hubspot_contacts) {
      const s = parseDate(r[startField])
      const e = parseDate(r[endField])
      if (!s || !e) continue
      const days = (e.getTime() - s.getTime()) / 86_400_000
      if (days < 0) continue
      const k = monthKeyOf(e)
      const cur = byMonth.get(k) ?? { sum: 0, n: 0 }
      cur.sum += days; cur.n++
      byMonth.set(k, cur)
      totSum += days; totN++
    }
    const months = Array.from(byMonth.keys()).sort().slice(-12)
    const data = months.map(k => {
      const b = byMonth.get(k)!
      return { month: monthLabel(k), days: Math.round((b.sum / b.n) * 10) / 10 }
    })
    return { data, avg: totN > 0 ? Math.round((totSum / totN) * 10) / 10 : null, n: totN }
  }, [hubspot_contacts])

  const hsPublished = vsLastMonth('health_story_completed_date')
  const cpShipped = vsLastMonth('cp_shipped_date')
  const epiReleased = vsLastMonth('epigenetics_dashboard_unlocked_date')
  const hsToCp = velocity('health_story_completed_date', 'cp_shipped_date')
  const truToEpi = velocity('results_available_date', 'epigenetics_dashboard_unlocked_date')

  const countTile = (label: string, d: { mtd: number; prev: number; delta: number | null }) => (
    <MetricCard
      label={label}
      value={hasData ? d.mtd : null}
      building={!hasData}
      target={`vs ${d.prev} same day last month`}
      trend={d.delta}
      status={d.delta === null ? 'grey' : d.delta >= 0 ? 'green' : 'red'}
    />
  )

  const velocityChart = (v: { data: { month: string; days: number }[]; avg: number | null }, caption: string) =>
    v.data.length > 0 ? (
      <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
        <p className="mb-1 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">{caption}</p>
        <p className="mb-3 font-mono text-sm text-dash-text-secondary">{v.avg}d avg</p>
        <TmrwLineChart
          data={v.data}
          index="month"
          series={[{ dataKey: 'days', name: 'Avg days', color: RED }]}
          height={240}
          valueFormatter={(n) => `${n}d`}
          showLegend={false}
        />
      </div>
    ) : (
      <LockedState reason={`${caption} — both milestone dates need to be populated on HubSpot before the trend can be drawn.`} />
    )

  return (
    <div className="space-y-6 md:space-y-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Delivery' }]} />
        <div className="flex items-center gap-2">
          <DataSourceBadge source="hubspot_contacts" />
          <DateRangePicker value={pickerValue} onChange={setPickerValue} />
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-status-red/30 bg-status-red/5 px-4 py-3">
          <p className="font-sans text-sm text-status-red">Could not load delivery data: {error}</p>
          <button onClick={() => refresh()} className="ml-4 rounded border border-status-red/40 px-3 py-1 font-sans text-xs text-status-red hover:bg-status-red/10">Retry</button>
        </div>
      )}
      {loading && !error && (
        <div className="rounded-lg border border-dash-border bg-dash-bg/60 px-4 py-3">
          <p className="font-sans text-sm text-dash-text-muted">Loading latest data…</p>
        </div>
      )}

      {/* ── Critical Alerts — pit of despair ── */}
      <section>
        <SectionHeading number={0} title="Critical Alerts" />
        <LockedState reason="“Pit of despair” — count of members who are stuck / at risk. Locked pending an agreed definition (e.g. stalled at a stage for N days, or no activity in N days)." />
      </section>

      {/* ── 01 Discovery ── */}
      <section>
        <SectionHeading number={1} title="Discovery" />
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-3">
          {countTile('Health Stories Published', hsPublished)}
          {countTile('Customised Pods Shipped', cpShipped)}
          <LockedTile label="eScripts Sent" reason="No eScript-sent date on HubSpot (boolean only) — add a date field to unlock this count." />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:mt-4 md:grid-cols-2 md:gap-4">
          {velocityChart(hsToCp, 'Time: Health Story → Customised Pods')}
          <LockedState reason="Time: Health Story → eScript — needs an eScript-sent date on HubSpot." />
        </div>
      </section>

      {/* ── 02 Diagnostic ── */}
      <section>
        <SectionHeading number={2} title="Diagnostic" />
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-2">
          <LockedTile label="Blood Dashboards Released" reason="No blood-dashboard-published date on HubSpot (boolean only) — add a date field to unlock." />
          <LockedTile label="Personalised Pods Shipped" reason="No personalised-pods-shipped date on HubSpot (boolean only) — add a date field to unlock." />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:mt-4 md:grid-cols-2 md:gap-4">
          <LockedState reason="Time: Bloods in → Blood Dashboard — needs a blood-dashboard-published date (we have blood draw date already)." />
          <LockedState reason="Time: Bloods in → Personalised Pods — needs a personalised-pods-shipped date." />
        </div>
      </section>

      {/* ── 03 Integrative ── */}
      <section>
        <SectionHeading number={3} title="Integrative" />
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-2">
          {countTile('Epi Dashboards Released', epiReleased)}
          <LockedTile label="Precision Pods Shipped" reason="“Precision pods” isn’t in the schema (only customised + personalised exist) — confirm the product/term to unlock." />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:mt-4 md:grid-cols-2 md:gap-4">
          {velocityChart(truToEpi, 'Time: Tru Results → Epi Dashboard')}
          <LockedState reason="Time: Tru Results → Precision Pods — pending the “precision pods” definition + a shipped date." />
        </div>
      </section>
    </div>
  )
}

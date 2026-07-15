'use client'

import { useMemo } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { MetricCard } from '@/components/dashboard/metric-card'
import { LockedState } from '@/components/dashboard/locked-state'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { TmrwLineChart, type ChartSeries } from '@/components/dashboard/tmrw-line-chart'
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { axisTickStyle, gridProps, tooltipStyle, TMRW_COLORS } from '@/lib/utils/chart-styles'
import { useDashboardData } from '@/lib/context/data-context'
import { getChannelSla, evaluateChannelSla, channelSlas } from '@/lib/config/channel-sla'
import type { Status } from '@/lib/types'

/* ─── Helpers ─────────────────────────────────────────────────────── */

const RED = '#E61317'
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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
function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}
function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}
function fmtMins(m: number | null): string {
  if (m === null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  const h = m / 60
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)}h`
  return `${Math.round(h / 24)}d`
}

// Monday-indexed day of week (0=Mon … 6=Sun).
const dowIndex = (d: Date) => (d.getDay() + 6) % 7

const CHANNEL_META: Record<string, { label: string; color: string }> = {
  email:  { label: 'Email',  color: TMRW_COLORS.blue },
  chat:   { label: 'Chat',   color: TMRW_COLORS.green },
  phone:  { label: 'Phone',  color: TMRW_COLORS.amber },
  web:    { label: 'Web',    color: TMRW_COLORS.purple },
  social: { label: 'Social', color: TMRW_COLORS.cyan },
  api:    { label: 'API',    color: TMRW_COLORS.grey },
}
const channelMeta = (c: string) => CHANNEL_META[c] ?? { label: c ? c[0].toUpperCase() + c.slice(1) : 'Unknown', color: TMRW_COLORS.darkGrey }

interface T {
  id: string
  created: Date | null
  solved: Date | null
  status: string | null
  channel: string
  frt: number | null
  res: number | null
  reopens: number | null
  inbound: number | null
  csat: number | null
  reason: string | null
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function SupportPage() {
  const { zendesk, twilio_messages, operational_data, loading, error, refresh } = useDashboardData()

  const tickets = useMemo<T[]>(() =>
    zendesk.map(r => ({
      id: String(r.zendesk_ticket_id ?? ''),
      created: parseDate(r.zendesk_created_at),
      solved: parseDate(r.solved_at),
      status: typeof r.status === 'string' ? r.status : null,
      channel: typeof r.channel === 'string' && r.channel.trim() ? r.channel.trim().toLowerCase() : 'unknown',
      frt: r.first_reply_time_minutes === null || r.first_reply_time_minutes === undefined ? null : num(r.first_reply_time_minutes),
      res: r.full_resolution_time_minutes === null || r.full_resolution_time_minutes === undefined ? null : num(r.full_resolution_time_minutes),
      reopens: r.reopens === null || r.reopens === undefined ? null : num(r.reopens),
      inbound: r.inbound_messages === null || r.inbound_messages === undefined ? null : num(r.inbound_messages),
      csat: r.satisfaction_score === null || r.satisfaction_score === undefined ? null : num(r.satisfaction_score),
      reason: typeof r.ticket_reason === 'string' && r.ticket_reason.trim() ? r.ticket_reason.trim() : null,
    })),
  [zendesk])

  const realNow = useMemo(() => new Date(), [])
  const monthKey = monthKeyOf(realNow)
  const prevMonthKey = monthKeyOf(new Date(realNow.getFullYear(), realNow.getMonth() - 1, 1))
  const dayOfMonth = realNow.getDate()

  // Channels present, ordered by volume.
  const channels = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of tickets) counts.set(t.channel, (counts.get(t.channel) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [tickets])

  /* ── Header KPIs ── */
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'pending' || t.status === 'new' || t.status === 'hold').length
  const medFrt = median(tickets.map(t => t.frt).filter((n): n is number => n !== null))
  const medRes = median(tickets.map(t => t.res).filter((n): n is number => n !== null))
  const csatSummary = useMemo(() => {
    const rated = tickets.map(t => t.csat).filter((n): n is number => n !== null)
    if (rated.length === 0) return null
    const good = rated.filter(s => s >= 4).length
    return Math.round((good / rated.length) * 100)
  }, [tickets])

  /* ── §01 Tickets created per day — this month vs same day last month, + channel split ── */
  const volume = useMemo(() => {
    const dimCur = daysInMonth(realNow)
    const cur = new Array(dimCur).fill(0) as number[]
    const prev = new Array(31).fill(0) as number[]
    // per-day-of-month stacked by channel (current month)
    const byChannel: Record<string, number[]> = {}
    for (const c of channels) byChannel[c] = new Array(dimCur).fill(0)
    let mtd = 0, sameDayLast = 0
    for (const t of tickets) {
      if (!t.created) continue
      const k = monthKeyOf(t.created)
      const day = t.created.getDate()
      if (k === monthKey) {
        cur[day - 1] += 1
        if (byChannel[t.channel]) byChannel[t.channel][day - 1] += 1
        if (day <= dayOfMonth) mtd += 1
      } else if (k === prevMonthKey) {
        prev[day - 1] += 1
        if (day <= dayOfMonth) sameDayLast += 1
      }
    }
    // cumulative overlay
    const maxDay = Math.max(dimCur, 31)
    let cc = 0, pc = 0
    const overlay: Record<string, number | null>[] = []
    for (let d = 1; d <= maxDay; d++) {
      cc += cur[d - 1] ?? 0
      pc += prev[d - 1] ?? 0
      overlay.push({
        day: d,
        'This month': d <= dimCur && d <= dayOfMonth ? cc : null,
        'Last month': d <= 31 ? pc : null,
      })
    }
    // stacked-by-channel per day
    const stacked: Record<string, number | string>[] = []
    for (let d = 1; d <= dimCur; d++) {
      const row: Record<string, number | string> = { day: d }
      for (const c of channels) row[c] = byChannel[c][d - 1]
      stacked.push(row)
    }
    const delta = sameDayLast > 0 ? Math.round(((mtd - sameDayLast) / sameDayLast) * 100) : null
    return { overlay, stacked, mtd, sameDayLast, delta }
  }, [tickets, channels, realNow, monthKey, prevMonthKey, dayOfMonth])

  /* ── §02 Inbound messages by channel (Twilio — separate from tickets) ── */
  const inboundByChannel = useMemo(() => {
    if (twilio_messages.length === 0) return null
    const map = new Map<string, { inbound: number; outbound: number }>()
    for (const m of twilio_messages) {
      const ch = typeof m.channel === 'string' && m.channel.trim() ? m.channel.trim().toLowerCase() : 'unknown'
      const dir = typeof m.direction === 'string' ? m.direction.toLowerCase() : ''
      const e = map.get(ch) ?? { inbound: 0, outbound: 0 }
      if (dir === 'inbound') e.inbound += 1
      else if (dir === 'outbound') e.outbound += 1
      map.set(ch, e)
    }
    const rows = Array.from(map.entries())
      .map(([ch, v]) => ({ channel: ch.charAt(0).toUpperCase() + ch.slice(1), Inbound: v.inbound, Outbound: v.outbound, key: ch }))
      .sort((a, b) => (b.Inbound + b.Outbound) - (a.Inbound + a.Outbound))
    const totalInbound = rows.reduce((s, r) => s + r.Inbound, 0)
    return { rows, totalInbound }
  }, [twilio_messages])

  /* ── §03 Contact rate — tickets per 1,000 active members, monthly ── */
  const contactRate = useMemo(() => {
    // active members per month from operational_data.total_casebook (latest in month)
    const casebookByMonth = new Map<string, number>()
    for (const r of operational_data) {
      const d = parseDate(r.date)
      if (!d) continue
      casebookByMonth.set(monthKeyOf(d), num(r.total_casebook))
    }
    const ticketsByMonth = new Map<string, number>()
    for (const t of tickets) if (t.created) ticketsByMonth.set(monthKeyOf(t.created), (ticketsByMonth.get(monthKeyOf(t.created)) ?? 0) + 1)
    if (ticketsByMonth.size === 0) return null
    const latestCasebook = Array.from(casebookByMonth.values()).pop() ?? 0
    const keys = Array.from(ticketsByMonth.keys()).sort().slice(-6)
    const data = keys.map(k => {
      const cb = casebookByMonth.get(k) ?? latestCasebook
      const rate = cb > 0 ? (ticketsByMonth.get(k)! / cb) * 1000 : null
      return { month: monthLabel(k), 'Tickets / 1k members': rate === null ? null : Math.round(rate) }
    })
    const hasDenominator = casebookByMonth.size > 0
    return { data, hasDenominator }
  }, [tickets, operational_data])

  /* ── §04/§05 Reply + resolution time by channel vs SLA ── */
  const byChannelSla = useMemo(() =>
    channels.map(c => {
      const rows = tickets.filter(t => t.channel === c)
      const frt = median(rows.map(t => t.frt).filter((n): n is number => n !== null))
      const res = median(rows.map(t => t.res).filter((n): n is number => n !== null))
      const sla = getChannelSla(c)
      return {
        key: c,
        label: channelMeta(c).label,
        count: rows.length,
        frt, res,
        frtStatus: (frt === null ? 'grey' : evaluateChannelSla(c, 'firstReply', frt)) as Status,
        resStatus: (res === null ? 'grey' : evaluateChannelSla(c, 'resolution', res)) as Status,
        frtTarget: sla.firstReply.green,
        resTarget: sla.resolution.green,
      }
    }),
  [tickets, channels])

  /* ── §06 Created vs solved per day + cumulative net ── */
  const createdVsSolved = useMemo(() => {
    const created = new Map<string, number>()
    const solved = new Map<string, number>()
    const dayKey = (d: Date) => d.toISOString().slice(0, 10)
    for (const t of tickets) {
      if (t.created) created.set(dayKey(t.created), (created.get(dayKey(t.created)) ?? 0) + 1)
      if (t.solved) solved.set(dayKey(t.solved), (solved.get(dayKey(t.solved)) ?? 0) + 1)
    }
    const days = Array.from(new Set(Array.from(created.keys()).concat(Array.from(solved.keys())))).sort().slice(-30)
    let net = 0
    return days.map(d => {
      const c = created.get(d) ?? 0
      const s = solved.get(d) ?? 0
      net += c - s
      return { day: d.slice(5), Created: c, Solved: s, 'Cumulative net': net }
    })
  }, [tickets])

  /* ── §07 Reopen rate ── */
  const reopen = useMemo(() => {
    const hasData = tickets.some(t => t.reopens !== null)
    if (!hasData) return null
    const solvedish = tickets.filter(t => t.solved || t.status === 'solved' || t.status === 'closed')
    const base = solvedish.length || tickets.length
    const reopened = tickets.filter(t => (t.reopens ?? 0) > 0).length
    const byMonth = new Map<string, { solved: number; reopened: number }>()
    for (const t of tickets) {
      if (!t.created) continue
      const k = monthKeyOf(t.created)
      const e = byMonth.get(k) ?? { solved: 0, reopened: 0 }
      e.solved += 1
      if ((t.reopens ?? 0) > 0) e.reopened += 1
      byMonth.set(k, e)
    }
    const trend = Array.from(byMonth.keys()).sort().slice(-6).map(k => {
      const e = byMonth.get(k)!
      return { month: monthLabel(k), 'Reopen %': e.solved > 0 ? Math.round((e.reopened / e.solved) * 100) : 0 }
    })
    return { rate: base > 0 ? Math.round((reopened / base) * 100) : 0, trend }
  }, [tickets])

  /* ── §08 Volume heatmap (hour × day-of-week) ── */
  const heatmap = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0) as number[])
    let max = 0
    for (const t of tickets) {
      if (!t.created) continue
      const dw = dowIndex(t.created)
      const hr = t.created.getHours()
      grid[dw][hr] += 1
      if (grid[dw][hr] > max) max = grid[dw][hr]
    }
    return { grid, max }
  }, [tickets])

  /* ── §09 Volume by reason/tag, month over month ── */
  const byReason = useMemo(() => {
    const hasData = tickets.some(t => t.reason !== null)
    if (!hasData) return null
    const totals = new Map<string, number>()
    for (const t of tickets) if (t.reason) totals.set(t.reason, (totals.get(t.reason) ?? 0) + 1)
    const top = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([r]) => r)
    const byMonth = new Map<string, Record<string, number>>()
    for (const t of tickets) {
      if (!t.created || !t.reason) continue
      const k = monthKeyOf(t.created)
      const e = byMonth.get(k) ?? {}
      const bucket = top.includes(t.reason) ? t.reason : 'Other'
      e[bucket] = (e[bucket] ?? 0) + 1
      byMonth.set(k, e)
    }
    const keys = Array.from(byMonth.keys()).sort().slice(-6)
    const data = keys.map(k => ({ month: monthLabel(k), ...byMonth.get(k)! }))
    return { data, reasons: [...top, 'Other'] }
  }, [tickets])

  const noData = tickets.length === 0
  const PALETTE = [TMRW_COLORS.red, TMRW_COLORS.blue, TMRW_COLORS.amber, TMRW_COLORS.green, TMRW_COLORS.purple, TMRW_COLORS.cyan, TMRW_COLORS.grey]

  return (
    <div className="space-y-6 md:space-y-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Support' }]} />
        <DataSourceBadge source="zendesk" />
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-status-red/30 bg-status-red/5 px-4 py-3">
          <p className="font-sans text-sm text-status-red">Could not load support data: {error}</p>
          <button onClick={() => refresh()} className="ml-4 rounded border border-status-red/40 px-3 py-1 font-sans text-xs text-status-red hover:bg-status-red/10">Retry</button>
        </div>
      )}
      {loading && !error && (
        <div className="rounded-lg border border-dash-border bg-dash-bg/60 px-4 py-3">
          <p className="font-sans text-sm text-dash-text-muted">Loading latest data…</p>
        </div>
      )}
      {noData && !loading && (
        <div className="rounded-lg border border-dashed border-dash-border bg-dash-surface/40 px-6 py-10 text-center">
          <p className="font-sans text-sm font-medium text-dash-text">No Zendesk data ingested yet</p>
          <p className="mt-1 font-sans text-xs text-dash-text-muted">Upload a Zendesk export on Admin → Data Upload to populate these metrics.</p>
        </div>
      )}

      {/* ── Header KPIs ── */}
      <section className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        <MetricCard label="Open Tickets" value={noData ? '—' : fmtNum(openTickets)} status={openTickets > 15 ? 'amber' : 'green'} direction="lower-better" />
        <MetricCard label="Median First Reply" value={fmtMins(medFrt)} status="grey" direction="lower-better" />
        <MetricCard label="Median Resolution" value={fmtMins(medRes)} status="grey" direction="lower-better" />
        <MetricCard label="CSAT" value={csatSummary === null ? '—' : `${csatSummary}%`} target={csatSummary === null ? 'Not captured yet' : 'Satisfied of rated'} status={csatSummary === null ? 'grey' : csatSummary >= 90 ? 'green' : csatSummary >= 75 ? 'amber' : 'red'} />
      </section>

      {/* ── 01 Ticket Volume ── */}
      <section>
        <SectionHeading number={1} title="Ticket Volume — this month vs last, by channel" />
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
          <MetricCard label="Tickets MTD" value={noData ? '—' : fmtNum(volume.mtd)} status="grey" />
          <MetricCard label="Same day last month" value={noData ? '—' : fmtNum(volume.sameDayLast)} target={volume.delta === null ? undefined : `${volume.delta > 0 ? '+' : ''}${volume.delta}% MoM`} status={volume.delta === null ? 'grey' : volume.delta <= 0 ? 'green' : 'amber'} trend={volume.delta} direction="lower-better" />
        </div>
        {!noData && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
              <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">Cumulative tickets — this month vs last</div>
              <TmrwLineChart
                data={volume.overlay}
                index="day"
                height={240}
                series={[
                  { dataKey: 'This month', color: RED },
                  { dataKey: 'Last month', color: '#9C988F', dashed: true },
                ]}
                connectNulls
              />
            </div>
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
              <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">Tickets by day, split by channel (this month)</div>
              <div className="h-[240px]">
                <ResponsiveContainer>
                  <BarChart data={volume.stacked} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid {...gridProps} vertical={false} />
                    <XAxis dataKey="day" tick={axisTickStyle} />
                    <YAxis tick={axisTickStyle} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    {channels.map(c => (
                      <Bar key={c} dataKey={c} stackId="ch" fill={channelMeta(c).color} name={channelMeta(c).label} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-ui text-[10px] uppercase tracking-wide text-dash-text-muted">
                {channels.map(c => (
                  <span key={c} className="flex items-center gap-1.5"><span className="inline-block h-2 w-2" style={{ background: channelMeta(c).color }} />{channelMeta(c).label}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 02 Inbound Messages by Channel (Twilio) ── */}
      <section>
        <SectionHeading number={2} title="Messages by Channel — Twilio" />
        {inboundByChannel ? (
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">Twilio message volume by channel · separate from ticket count</div>
              <DataSourceBadge source="twilio" />
            </div>
            <p className="mb-3 font-sans text-[11px] text-dash-text-secondary">{fmtNum(inboundByChannel.totalInbound)} inbound messages across all channels.</p>
            <div className="h-[240px]">
              <ResponsiveContainer>
                <BarChart data={inboundByChannel.rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="channel" tick={axisTickStyle} />
                  <YAxis tick={axisTickStyle} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="Inbound" fill={RED} />
                  <Bar dataKey="Outbound" fill="#9C988F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-ui text-[10px] uppercase tracking-wide text-dash-text-muted">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2" style={{ background: RED }} />Inbound</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2" style={{ background: '#9C988F' }} />Outbound</span>
            </div>
          </div>
        ) : (
          <LockedState reason="Inbound messages come from a separate Twilio export. Upload it on Admin → Data Upload to unlock." />
        )}
      </section>

      {/* ── 03 Contact Rate ── */}
      <section>
        <SectionHeading number={3} title="Contact Rate — tickets per 1,000 members" />
        {contactRate && contactRate.hasDenominator ? (
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">Support tickets per 1,000 active members · trended</div>
            <TmrwLineChart
              data={contactRate.data}
              index="month"
              height={240}
              series={[{ dataKey: 'Tickets / 1k members', color: RED }]}
              connectNulls
            />
          </div>
        ) : (
          <LockedState reason="Needs active-member counts (operational_data.total_casebook) alongside tickets to compute a rate." />
        )}
      </section>

      {/* ── 04 First Response Time by Channel vs SLA ── */}
      <section>
        <SectionHeading number={4} title="First Response Time by Channel vs SLA" />
        {noData ? <LockedState reason="Awaiting Zendesk data." /> : (
          <ChannelSlaTable rows={byChannelSla} kind="frt" />
        )}
      </section>

      {/* ── 05 Full Resolution Time by Channel vs SLA ── */}
      <section>
        <SectionHeading number={5} title="Full Resolution Time by Channel vs SLA" />
        {noData ? <LockedState reason="Awaiting Zendesk data." /> : (
          <ChannelSlaTable rows={byChannelSla} kind="res" />
        )}
      </section>

      {/* ── 06 Created vs Solved ── */}
      <section>
        <SectionHeading number={6} title="Created vs Solved — with cumulative net" />
        {createdVsSolved.length > 0 ? (
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">Daily created vs solved · cumulative net backlog underneath</div>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <ComposedChart data={createdVsSolved} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="day" tick={axisTickStyle} />
                  <YAxis tick={axisTickStyle} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Created" fill={TMRW_COLORS.blue} />
                  <Bar dataKey="Solved" fill={TMRW_COLORS.green} />
                  <Line type="monotone" dataKey="Cumulative net" stroke={RED} strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 font-sans text-[11px] italic text-dash-text-muted">Cumulative net = running (created − solved). Rising = backlog growing.</p>
          </div>
        ) : <LockedState reason="Awaiting Zendesk data." />}
      </section>

      {/* ── 07 Reopen Rate ── */}
      <section>
        <SectionHeading number={7} title="Reopen Rate — solved tickets that come back" />
        {reopen ? (
          <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
            <MetricCard label="Reopen Rate" value={`${reopen.rate}%`} target="Of solved tickets" status={reopen.rate <= 5 ? 'green' : reopen.rate <= 10 ? 'amber' : 'red'} direction="lower-better" />
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4 lg:col-span-2">
              <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">Reopen % · trended</div>
              <TmrwLineChart data={reopen.trend} index="month" height={200} series={[{ dataKey: 'Reopen %', color: RED }]} />
            </div>
          </div>
        ) : (
          <LockedState reason="No reopen counts in the current export. Add a 'Reopens' column to the Zendesk export to unlock." />
        )}
      </section>

      {/* ── 08 Volume Heatmap ── */}
      <section>
        <SectionHeading number={8} title="Volume Heatmap — hour of day × day of week" />
        {noData ? <LockedState reason="Awaiting Zendesk data." /> : (
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">Ticket creation volume · darker = busier</div>
              <span className="rounded-full bg-status-amber/10 px-3 py-1 font-ui text-[10px] uppercase tracking-wider text-status-amber">Staffing overlay pending roster data</span>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="flex">
                  <div className="w-10 shrink-0" />
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="flex-1 text-center font-mono text-[9px] text-dash-text-muted">{h}</div>
                  ))}
                </div>
                {heatmap.grid.map((row, dw) => (
                  <div key={dw} className="flex items-center">
                    <div className="w-10 shrink-0 font-ui text-[10px] uppercase text-dash-text-muted">{DOW[dw]}</div>
                    {row.map((v, h) => (
                      <div
                        key={h}
                        className="m-px flex-1 rounded-sm"
                        style={{ aspectRatio: '1 / 1', background: v === 0 ? '#F1EFEA' : `rgba(139,0,0,${0.15 + 0.85 * (v / (heatmap.max || 1))})` }}
                        title={`${DOW[dw]} ${h}:00 — ${v} ticket${v === 1 ? '' : 's'}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 09 Volume by Reason / Tag ── */}
      <section>
        <SectionHeading number={9} title="Volume by Ticket Reason / Tag — month over month" />
        {byReason ? (
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">Top ticket reasons · trended</div>
            <div className="h-[280px]">
              <ResponsiveContainer>
                <BarChart data={byReason.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="month" tick={axisTickStyle} />
                  <YAxis tick={axisTickStyle} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  {byReason.reasons.map((r, i) => (
                    <Bar key={r} dataKey={r} stackId="reason" fill={PALETTE[i % PALETTE.length]} name={r} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-ui text-[10px] uppercase tracking-wide text-dash-text-muted">
              {byReason.reasons.map((r, i) => (
                <span key={r} className="flex items-center gap-1.5"><span className="inline-block h-2 w-2" style={{ background: PALETTE[i % PALETTE.length] }} />{r}</span>
              ))}
            </div>
          </div>
        ) : (
          <LockedState reason="No ticket reason/tag data in the current export. Add a 'Tags' or 'About' column to unlock." />
        )}
      </section>
    </div>
  )
}

/* ─── Per-channel SLA table (first reply / resolution) ────────────── */

function ChannelSlaTable({
  rows,
  kind,
}: {
  rows: {
    key: string; label: string; count: number
    frt: number | null; res: number | null
    frtStatus: Status; resStatus: Status
    frtTarget: number; resTarget: number
  }[]
  kind: 'frt' | 'res'
}) {
  const dotColor: Record<Status, string> = {
    green: 'bg-status-green', amber: 'bg-status-amber', red: 'bg-status-red', grey: 'bg-dash-border-strong',
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-dash-border bg-dash-surface">
      <table className="w-full font-mono text-[12px]">
        <thead>
          <tr className="bg-dash-surface-alt text-dash-text-secondary">
            {['Channel', 'Tickets', kind === 'frt' ? 'Median First Reply' : 'Median Resolution', 'SLA Target', 'Status'].map((h, i) => (
              <th key={h} className={`px-3 py-2.5 font-ui text-[10px] uppercase tracking-wider font-medium ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const val = kind === 'frt' ? r.frt : r.res
            const target = kind === 'frt' ? r.frtTarget : r.resTarget
            const status = kind === 'frt' ? r.frtStatus : r.resStatus
            return (
              <tr key={r.key} className="border-b border-dash-border last:border-b-0">
                <td className="px-3 py-2.5 text-left text-dash-text">{r.label}</td>
                <td className="px-3 py-2.5 text-center text-dash-text-secondary">{r.count}</td>
                <td className="px-3 py-2.5 text-center text-dash-text">{fmtMins(val)}</td>
                <td className="px-3 py-2.5 text-center text-dash-text-muted">≤ {fmtMins(target)}</td>
                <td className="px-3 py-2.5 text-center"><span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor[status]}`} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="px-3 py-2 font-sans text-[11px] italic text-dash-text-muted">
        Targets from the per-channel SLA config ({channelSlas.length} channels defined). Live channels (chat/phone) are held to tighter targets than async ones.
      </p>
    </div>
  )
}

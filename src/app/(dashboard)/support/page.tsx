'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricTile, LockedTile, LockedCard } from '@/components/dashboard/metric-tile'
import { NarrativeSection } from '@/components/dashboard/narrative-section'
import { TmrwBarChart } from '@/components/dashboard/tmrw-bar-chart'
import {
  DateRangePicker,
  defaultDateRangePickerSPLM,
  presetToRange,
  type DateRangePickerValue,
} from '@/components/dashboard/date-range-picker'
import { useDashboardData } from '@/lib/context/data-context'
import { cn } from '@/lib/utils'
import { deltaPct, previousWeekSameSpan, samePeriodLastMonth, fullMonth } from '@/lib/utils/period'
import {
  channelComparison,
  CHANNEL_GROUP_LABELS,
  dailyVolume,
  fmtHours,
  latestTicketAt,
  monthlyVolume,
  openBacklogByAge,
  responseComparison,
  windowMetrics,
} from '@/lib/analytics/support-metrics'

/* ─── Helpers ─────────────────────────────────────────────────────────── */

const fmtNum = (n: number): string => n.toLocaleString('en-AU', { maximumFractionDigits: 0 })
const fmtPct = (n: number | null, digits = 0): string => (n === null ? '—' : `${(n * 100).toFixed(digits)}%`)

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  sms: '#3676C9',
  native_messaging: '#7C3AED',
  instagram_dm: '#E4405F',
  sunshine_conversations_facebook_messenger: '#1877F2',
  email: '#E61317',
  web: '#E5A04A',
  phone: '#0891B2',
  api: '#9CA3AF',
}
const channelColor = (c: string) => CHANNEL_COLORS[c] ?? '#737373'

/** Short day label for the volume chart: "3 Aug". */
function dayLabel(isoDay: string): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  if (!y || !m || !d) return isoDay
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={cn(
        'pb-2 font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-muted',
        align === 'right' ? 'pl-3 text-right' : 'pr-3 text-left'
      )}
    >
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('py-2 pl-3 text-right font-mono text-[12px] text-dash-text', className)}>{children}</td>
  )
}

function DeltaCell({ value }: { value: number | null }) {
  if (value === null) {
    return <Td className="text-dash-text-muted">—</Td>
  }
  const up = value > 0
  return (
    <Td className={up ? 'text-status-amber' : value < 0 ? 'text-status-green' : 'text-dash-text-muted'}>
      {up ? '+' : ''}
      {value.toFixed(0)}%
    </Td>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function SupportPage() {
  const { zendesk_tickets, lastRefresh, loading, error, refresh } = useDashboardData()

  // Defaults to comparing against the same period last month — the comparison
  // Dan called out as the important one for this report.
  const [pickerValue, setPickerValue] = useState<DateRangePickerValue>(() =>
    defaultDateRangePickerSPLM(presetToRange('this-month'))
  )
  const period = pickerValue.period
  const comparison = pickerValue.comparison

  const hasTickets = zendesk_tickets.length > 0

  const current = useMemo(() => windowMetrics(zendesk_tickets, period), [zendesk_tickets, period])
  const prior = useMemo(() => windowMetrics(zendesk_tickets, comparison), [zendesk_tickets, comparison])

  // A third reading: the same span one week back. Volume moves week to week, and
  // the report quotes a prior-week per-day figure alongside the monthly one.
  const priorWeek = useMemo(
    () => windowMetrics(zendesk_tickets, previousWeekSameSpan(period)),
    [zendesk_tickets, period]
  )

  const splmRange = useMemo(() => samePeriodLastMonth(period), [period])
  const splmLabel = useMemo(
    () => `vs ${fmtRangeShort(splmRange.start, splmRange.end)}`,
    [splmRange]
  )
  const comparisonLabel = useMemo(
    () => `vs ${fmtRangeShort(comparison.start, comparison.end)}`,
    [comparison]
  )

  // When the picker is already set to same-period-last-month, the primary delta
  // *is* that comparison — don't print it twice.
  const showSecondary = pickerValue.comparisonMode !== 'same-period-last-month'
  const splm = useMemo(
    () => (showSecondary ? windowMetrics(zendesk_tickets, splmRange) : prior),
    [showSecondary, zendesk_tickets, splmRange, prior]
  )

  const daily = useMemo(() => dailyVolume(zendesk_tickets, period), [zendesk_tickets, period])
  const monthly = useMemo(() => monthlyVolume(zendesk_tickets), [zendesk_tickets])

  const chCmp = useMemo(() => channelComparison(current, prior), [current, prior])
  const respCmp = useMemo(() => responseComparison(current, prior), [current, prior])

  const asOf = useMemo(() => latestTicketAt(zendesk_tickets), [zendesk_tickets])
  const backlog = useMemo(
    () => (asOf ? openBacklogByAge(zendesk_tickets, asOf) : []),
    [zendesk_tickets, asOf]
  )

  // Full prior months for the volume strip, so the daily chart has context.
  const thisMonth = useMemo(() => windowMetrics(zendesk_tickets, fullMonth(period.end)), [zendesk_tickets, period.end])
  const lastMonth = useMemo(() => {
    const d = new Date(period.end.getFullYear(), period.end.getMonth() - 1, 1)
    return windowMetrics(zendesk_tickets, fullMonth(d))
  }, [zendesk_tickets, period.end])

  const volumeDelta = deltaPct(current.total, prior.total)
  const perDayDelta = deltaPct(current.perDay, priorWeek.perDay)

  // Channel-share chart: one stacked column per day, normalised to 100%.
  const channelShareData = useMemo(() => {
    const channels = current.byChannel.map(c => c.channel)
    if (channels.length === 0) return []
    return monthly.slice(-8).map(m => {
      const inMonth = windowMetrics(zendesk_tickets, {
        start: new Date(Number(m.month.slice(0, 4)), Number(m.month.slice(5, 7)) - 1, 1),
        end: new Date(Number(m.month.slice(0, 4)), Number(m.month.slice(5, 7)), 0, 23, 59, 59, 999),
      })
      const row: Record<string, unknown> = { m: m.label }
      for (const ch of channels) {
        row[ch] = inMonth.byChannel.find(c => c.channel === ch)?.count ?? 0
      }
      return row
    })
  }, [monthly, zendesk_tickets, current.byChannel])

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Breadcrumb items={[{ label: 'Support' }]} />
          <p className="mt-1 font-sans text-[12px] text-dash-text-muted">
            Zendesk inbound tickets · Sydney time
            {asOf && ` · latest ticket ${asOf.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' })} AEST`}
            {lastRefresh?.zendesk_tickets && ` · uploaded ${new Date(lastRefresh.zendesk_tickets).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/support/report"
            className="inline-flex items-center gap-1.5 rounded-full border border-dash-border bg-dash-surface px-4 py-2 font-ui text-[11px] uppercase tracking-[0.05em] text-dash-text-secondary transition-colors hover:border-dash-text-muted hover:text-dash-text"
          >
            <FileText size={13} />
            Report view
          </Link>
          <DateRangePicker value={pickerValue} onChange={setPickerValue} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-status-red bg-status-red-light px-4 py-3">
          <p className="font-sans text-[13px] text-status-red">
            Couldn&apos;t load data: {error}{' '}
            <button onClick={() => refresh()} className="underline">Retry</button>
          </p>
        </div>
      )}
      {loading && !hasTickets && (
        <p className="font-sans text-[13px] text-dash-text-muted">Loading tickets…</p>
      )}

      {!hasTickets && !loading ? (
        <LockedCard
          title="Support"
          reason="No Zendesk ticket data yet. Upload the Zendesk inbound-ticket extract (Admin → Data Upload → Zendesk Tickets) to unlock volume, channel mix, response times and backlog."
        />
      ) : (
        <>
          {/* ────────────── 01 VOLUME ────────────── */}
          <NarrativeSection
            number={1}
            question="How Much Is Coming In?"
            subtitle={`${fmtRangeShort(period.start, period.end)} · inbound tickets by creation date`}
          >
            <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
              <MetricTile
                prominent
                label="Inbound Tickets"
                value={fmtNum(current.total)}
                target={`${fmtRangeShort(period.start, period.end)}`}
                status={volumeDelta === null ? 'grey' : volumeDelta > 50 ? 'red' : volumeDelta > 0 ? 'amber' : 'green'}
                direction="lower-better"
                delta={volumeDelta === null ? null : { value: volumeDelta, period: comparisonLabel }}
                secondaryDelta={
                  showSecondary && splm.total > 0
                    ? { value: deltaPct(current.total, splm.total), period: splmLabel }
                    : null
                }
              />
              <MetricTile
                label="Tickets Per Day"
                value={current.perDay.toFixed(0)}
                target={`over ${current.dayCount} day${current.dayCount === 1 ? '' : 's'}`}
                status="grey"
                direction="lower-better"
                delta={perDayDelta === null ? null : { value: perDayDelta, period: 'vs prior week' }}
              />
              <MetricTile
                label="Still Open"
                value={fmtNum(current.stillOpen)}
                target={current.total > 0 ? `${fmtPct(current.stillOpen / current.total)} of the window` : '—'}
                status={current.total > 0 && current.stillOpen / current.total > 0.25 ? 'amber' : 'green'}
                direction="lower-better"
                delta={null}
              />
              <MetricTile
                label="Median Resolution"
                value={fmtHours(current.response.medianResolutionHours)}
                target={`p90 ${fmtHours(current.response.p90ResolutionHours)} · ${current.response.resolved} resolved`}
                status={
                  current.response.medianResolutionHours === null ? 'grey'
                    : current.response.medianResolutionHours <= 12 ? 'green'
                    : current.response.medianResolutionHours <= 24 ? 'amber'
                    : 'red'
                }
                direction="lower-better"
                delta={
                  current.response.medianResolutionHours !== null && prior.response.medianResolutionHours !== null
                    ? { value: deltaPct(current.response.medianResolutionHours, prior.response.medianResolutionHours), period: comparisonLabel }
                    : null
                }
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-dash-border bg-dash-surface p-4 lg:col-span-2">
                <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                  Tickets per day
                </div>
                <TmrwBarChart
                  data={daily.map(d => ({ d: dayLabel(d.date), value: d.value })) as Record<string, unknown>[]}
                  index="d"
                  series={[{ dataKey: 'value', name: 'Tickets', color: '#E61317' }]}
                  height={240}
                  yAxisWidth={36}
                  showLegend={false}
                  valueFormatter={fmtNum}
                />
              </div>
              <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
                <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                  Full months
                </div>
                <div className="space-y-1.5">
                  {monthly.slice(-8).map(m => {
                    const max = Math.max(...monthly.slice(-8).map(x => x.value), 1)
                    return (
                      <div key={m.month} className="flex items-center gap-2">
                        <span className="w-14 shrink-0 font-ui text-[10px] uppercase tracking-[0.05em] text-dash-text-muted">
                          {m.label}
                        </span>
                        <div className="h-4 flex-1 rounded-sm bg-dash-surface-alt">
                          <div
                            className="h-full rounded-sm bg-dash-red"
                            style={{ width: `${(m.value / max) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right font-mono text-[11px] text-dash-text">
                          {fmtNum(m.value)}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 font-sans text-[11px] text-dash-text-muted">
                  {thisMonth.total > 0 && lastMonth.total > 0
                    ? `${fmtNum(thisMonth.total)} so far this month against ${fmtNum(lastMonth.total)} last month.`
                    : 'Whole-month totals, for context against the window above.'}
                </p>
              </div>
            </div>
          </NarrativeSection>

          {/* ────────────── 02 CHANNEL ────────────── */}
          <NarrativeSection
            number={2}
            question="Where Is It Coming From?"
            subtitle="Channel mix · messaging vs email vs web"
          >
            <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
              {(['messaging', 'email', 'web_other'] as const).map(g => (
                <MetricTile
                  key={g}
                  label={CHANNEL_GROUP_LABELS[g]}
                  value={fmtNum(current.byGroup[g])}
                  target={current.total > 0 ? `${fmtPct(current.byGroup[g] / current.total)} of inbound` : '—'}
                  status="grey"
                  delta={
                    prior.byGroup[g] > 0
                      ? { value: deltaPct(current.byGroup[g], prior.byGroup[g]), period: comparisonLabel }
                      : null
                  }
                />
              ))}
              <MetricTile
                label="Messaging Share"
                value={fmtPct(current.messagingShare)}
                target="WhatsApp · SMS · native · IG · Messenger"
                status="grey"
                delta={
                  current.messagingShare !== null && prior.messagingShare !== null && prior.messagingShare > 0
                    ? { value: deltaPct(current.messagingShare, prior.messagingShare), period: comparisonLabel }
                    : null
                }
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
                <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                  Share of inbound by month
                </div>
                <TmrwBarChart
                  data={channelShareData}
                  index="m"
                  percentStacked
                  series={current.byChannel.map(c => ({
                    dataKey: c.channel,
                    name: c.label,
                    color: channelColor(c.channel),
                  }))}
                  height={260}
                  yAxisWidth={40}
                />
              </div>
              <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
                <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                  Channel vs {fmtRangeShort(comparison.start, comparison.end)}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left">
                    <thead>
                      <tr className="border-b border-dash-border">
                        <Th>Channel</Th>
                        <Th align="right">Current</Th>
                        <Th align="right">Prior</Th>
                        <Th align="right">Δ</Th>
                        <Th align="right">Share</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {chCmp.map(c => (
                        <tr key={c.channel} className="border-b border-dash-border/60 last:border-0">
                          <td className="py-2 pr-3 font-sans text-[12px] text-dash-text">
                            <span
                              className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                              style={{ backgroundColor: channelColor(c.channel) }}
                            />
                            {c.label}
                          </td>
                          <Td>{fmtNum(c.current)}</Td>
                          <Td className="text-dash-text-muted">{fmtNum(c.comparison)}</Td>
                          <DeltaCell value={c.deltaPct} />
                          <Td>{current.total > 0 ? fmtPct(c.current / current.total, 1) : '—'}</Td>
                        </tr>
                      ))}
                      <tr className="border-t border-dash-border-strong">
                        <td className="py-2 pr-3 font-sans text-[12px] font-medium text-dash-text">All inbound</td>
                        <Td className="font-medium">{fmtNum(current.total)}</Td>
                        <Td className="text-dash-text-muted">{fmtNum(prior.total)}</Td>
                        <DeltaCell value={volumeDelta} />
                        <Td>100%</Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </NarrativeSection>

          {/* ────────────── 03 RESPONSE TIME ────────────── */}
          <NarrativeSection
            number={3}
            question="How Fast Do We Answer?"
            subtitle="Median + p90 hours to resolve, by channel"
          >
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-dash-border">
                      <Th>Channel</Th>
                      <Th align="right">Tickets</Th>
                      <Th align="right">Median</Th>
                      <Th align="right">Prior median</Th>
                      <Th align="right">p90</Th>
                      <Th align="right">Resolved</Th>
                      <Th align="right">Still open</Th>
                      <Th align="right">Median 1st reply</Th>
                      <Th align="right">1st reply n</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {respCmp.map(r => {
                      const improved =
                        r.current.medianResolutionHours !== null
                        && r.comparison.medianResolutionHours !== null
                        && r.current.medianResolutionHours < r.comparison.medianResolutionHours
                      return (
                        <tr key={r.channel} className="border-b border-dash-border/60 last:border-0">
                          <td className="py-2 pr-3 font-sans text-[12px] text-dash-text">
                            <span
                              className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                              style={{ backgroundColor: channelColor(r.channel) }}
                            />
                            {r.label}
                          </td>
                          <Td>{fmtNum(r.current.tickets)}</Td>
                          <Td className={improved ? 'text-status-green' : undefined}>
                            {fmtHours(r.current.medianResolutionHours)}
                          </Td>
                          <Td className="text-dash-text-muted">{fmtHours(r.comparison.medianResolutionHours)}</Td>
                          <Td>{fmtHours(r.current.p90ResolutionHours)}</Td>
                          <Td>{fmtNum(r.current.resolved)}</Td>
                          <Td className={r.current.stillOpen > 0 ? 'text-status-amber' : undefined}>
                            {fmtNum(r.current.stillOpen)}
                          </Td>
                          <Td>{fmtHours(r.current.medianFirstResponseHours)}</Td>
                          <Td className="text-dash-text-muted">{fmtNum(r.current.firstResponseCount)}</Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 font-sans text-[11px] text-dash-text-muted">
                Medians are computed on resolved tickets only. First-response time is recorded on just{' '}
                {fmtPct(current.response.firstResponseCoverage, 1)} of tickets in this window
                ({current.response.firstResponseCount} of {current.response.tickets}), so treat the
                first-reply columns as indicative rather than representative.
              </p>
            </div>
          </NarrativeSection>

          {/* ────────────── 04 QUEUE ────────────── */}
          <NarrativeSection
            number={4}
            question="Who Is Carrying It?"
            subtitle="Volume and resolution speed by Zendesk group"
          >
            <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
                <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                  By group
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left">
                    <thead>
                      <tr className="border-b border-dash-border">
                        <Th>Group</Th>
                        <Th align="right">Tickets</Th>
                        <Th align="right">Share</Th>
                        <Th align="right">Median</Th>
                        <Th align="right">Still open</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.byQueue.map(q => (
                        <tr key={q.queue} className="border-b border-dash-border/60 last:border-0">
                          <td className="py-2 pr-3 font-sans text-[12px] text-dash-text">{q.queue}</td>
                          <Td>{fmtNum(q.count)}</Td>
                          <Td>{fmtPct(q.share, 1)}</Td>
                          <Td>{fmtHours(q.medianResolutionHours)}</Td>
                          <Td className={q.stillOpen > 0 ? 'text-status-amber' : undefined}>{fmtNum(q.stillOpen)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <span className="font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                    Open backlog by age
                  </span>
                  <span className="font-sans text-[11px] text-dash-text-muted">whole export, not just this window</span>
                </div>
                {backlog.length === 0 ? (
                  <p className="font-sans text-sm text-dash-text-muted">No open tickets.</p>
                ) : (
                  <>
                    <TmrwBarChart
                      data={backlog.map(b => ({ b: b.label, value: b.count })) as Record<string, unknown>[]}
                      index="b"
                      series={[{ dataKey: 'value', name: 'Open tickets', color: '#F5A623' }]}
                      height={220}
                      yAxisWidth={36}
                      showLegend={false}
                      valueFormatter={fmtNum}
                    />
                    <p className="mt-2 font-sans text-[11px] text-dash-text-muted">
                      {fmtNum(backlog.reduce((s, b) => s + b.count, 0))} open in total
                      {backlog[backlog.length - 1].count > 0
                        && `, of which ${fmtNum(backlog[backlog.length - 1].count)} have been open more than two weeks`}
                      .
                    </p>
                  </>
                )}
              </div>
            </div>
          </NarrativeSection>

          {/* ────────────── 05 NOT IN THIS EXPORT ────────────── */}
          <NarrativeSection
            number={5}
            question="What We Still Can't See"
            subtitle="Needs columns the current Zendesk extract doesn't carry"
          >
            <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
              <LockedTile
                label="CSAT"
                reason="No satisfaction score in this extract. Add SATISFACTION_SCORE to unlock."
              />
              <LockedTile
                label="Per-Agent Load"
                reason="No assignee column. Add ASSIGNEE_NAME to unlock."
              />
              <LockedTile
                label="Ticket Tags / Topics"
                reason="No tags or subject. Add TAGS to see what people are actually asking about."
              />
              <LockedTile
                label="Reopens & Replies"
                reason="No reopen or reply counts in this extract."
              />
            </div>
            <p className="mt-3 font-sans text-[12px] text-dash-text-muted">
              These four are the difference between knowing how much support costs and knowing why.
              Each needs one extra column on the existing extract — no new integration.
            </p>
          </NarrativeSection>
        </>
      )}
    </div>
  )
}

/** "1 – 5 Aug 2026" / "28 Jul – 5 Aug 2026". */
function fmtRangeShort(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const s = sameMonth
    ? start.toLocaleDateString('en-AU', { day: 'numeric' })
    : start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  const e = end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${s} – ${e}`
}

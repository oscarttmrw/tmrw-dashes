'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { TmrwBarChart } from '@/components/dashboard/tmrw-bar-chart'
import {
  DateRangePicker,
  defaultDateRangePickerSPLM,
  presetToRange,
  type DateRangePickerValue,
} from '@/components/dashboard/date-range-picker'
import { useDashboardData } from '@/lib/context/data-context'
import { cn } from '@/lib/utils'
import { deltaPct, fullMonth, localDayKey } from '@/lib/utils/period'
import {
  channelComparison,
  CHANNEL_GROUP_LABELS,
  dailyVolume,
  fmtHours,
  latestTicketAt,
  monthlyVolume,
  responseComparison,
  windowMetrics,
} from '@/lib/analytics/support-metrics'

/**
 * Print/PDF layout of the support report — the four pages of Dan's designed
 * deck, driven live off the same support-metrics functions the /support page
 * uses, so the two can never disagree.
 *
 * Every figure here is computed, never typed in. Changing the date range
 * re-renders the whole report for the new window.
 */

const fmtNum = (n: number): string => n.toLocaleString('en-AU', { maximumFractionDigits: 0 })
const fmtPct = (n: number | null, digits = 0): string => (n === null ? '—' : `${(n * 100).toFixed(digits)}%`)
const fmtDelta = (n: number | null): string => (n === null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(0)}%`)

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

function fmtRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const s = sameMonth
    ? start.toLocaleDateString('en-AU', { day: 'numeric' })
    : start.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })
  const e = end.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${s}–${e}`
}

function dayLabel(isoDay: string): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  if (!y || !m || !d) return isoDay
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

/* ─── Layout primitives ───────────────────────────────────────────────── */

function Page({ n, eyebrow, headline, children }: {
  n: string
  eyebrow: string
  headline?: string
  children: React.ReactNode
}) {
  return (
    <section className="report-page relative flex min-h-[860px] flex-col rounded-lg border border-dash-border bg-dash-surface p-8 md:p-12">
      <p className="font-ui text-[11px] uppercase tracking-[0.3em] text-dash-red">{eyebrow}</p>
      {headline && (
        <h2 className="mt-4 max-w-3xl font-display text-2xl leading-tight text-dash-text md:text-3xl">
          {headline}
        </h2>
      )}
      <div className="mt-8 flex-1">{children}</div>
      <div className="mt-8 flex items-baseline justify-between border-t border-dash-border pt-4">
        <span className="font-ui text-[10px] uppercase tracking-[0.2em] text-dash-text-muted">
          TMRW Health · Support Ticket Report
        </span>
        <span className="font-mono text-[11px] text-dash-text-muted">{n}</span>
      </div>
    </section>
  )
}

function BigStat({ value, label, tone }: { value: string; label: string; tone?: 'red' | 'muted' }) {
  return (
    <div>
      <div
        className={cn(
          'font-mono text-4xl font-bold leading-none tracking-[-0.02em] md:text-5xl',
          tone === 'red' ? 'text-dash-red' : tone === 'muted' ? 'text-dash-text-muted' : 'text-dash-text'
        )}
      >
        {value}
      </div>
      <div className="mt-2 font-ui text-[10px] uppercase tracking-[0.15em] text-dash-text-muted">{label}</div>
    </div>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={cn(
        'pb-2 font-ui text-[10px] font-medium uppercase tracking-[0.08em] text-dash-text-muted',
        align === 'right' ? 'pl-3 text-right' : 'pr-3 text-left'
      )}
    >
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('py-2 pl-3 text-right font-mono text-[12px] text-dash-text', className)}>{children}</td>
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 font-ui text-[10px] uppercase leading-relaxed tracking-[0.08em] text-dash-text-muted">
      {children}
    </p>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function SupportReportPage() {
  const { zendesk_tickets, loading } = useDashboardData()
  const [pickerValue, setPickerValue] = useState<DateRangePickerValue>(() =>
    defaultDateRangePickerSPLM(presetToRange('this-month'))
  )
  const [exporting, setExporting] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const period = pickerValue.period
  const comparison = pickerValue.comparison
  const hasTickets = zendesk_tickets.length > 0

  const current = useMemo(() => windowMetrics(zendesk_tickets, period), [zendesk_tickets, period])
  const prior = useMemo(() => windowMetrics(zendesk_tickets, comparison), [zendesk_tickets, comparison])
  const daily = useMemo(() => dailyVolume(zendesk_tickets, period), [zendesk_tickets, period])
  const monthly = useMemo(() => monthlyVolume(zendesk_tickets), [zendesk_tickets])
  const chCmp = useMemo(() => channelComparison(current, prior), [current, prior])
  const asOf = useMemo(() => latestTicketAt(zendesk_tickets), [zendesk_tickets])

  // The two channels the report leads on are simply the busiest messaging
  // channels in the window, so the narrative follows the data rather than being
  // hardcoded to WhatsApp and SMS.
  const focusChannels = useMemo(
    () =>
      current.byChannel
        .filter(c => c.group === 'messaging')
        .sort((a, b) => b.count - a.count)
        .slice(0, 2)
        .map(c => c.channel),
    [current.byChannel]
  )
  const respCmp = useMemo(
    () => responseComparison(current, prior, focusChannels),
    [current, prior, focusChannels]
  )

  const volumeDelta = deltaPct(current.total, prior.total)
  const thisMonthFull = useMemo(() => windowMetrics(zendesk_tickets, fullMonth(period.end)), [zendesk_tickets, period.end])
  const lastMonthFull = useMemo(
    () => windowMetrics(zendesk_tickets, fullMonth(new Date(period.end.getFullYear(), period.end.getMonth() - 1, 1))),
    [zendesk_tickets, period.end]
  )

  // Volume trend with the report window highlighted — six weeks of daily context.
  const trendRange = useMemo(() => {
    const start = new Date(period.start)
    start.setDate(start.getDate() - 42)
    return { start, end: period.end }
  }, [period])
  const trend = useMemo(() => dailyVolume(zendesk_tickets, trendRange), [zendesk_tickets, trendRange])
  const windowDayLabels = useMemo(() => daily.map(d => dayLabel(d.date)), [daily])

  const topGrower = useMemo(
    () => chCmp.filter(c => c.deltaPct !== null).sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0))[0] ?? null,
    [chCmp]
  )

  async function exportPdf() {
    if (!reportRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const pages = Array.from(reportRef.current.querySelectorAll<HTMLElement>('.report-page'))
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' })
        const imgW = pageW - 48
        const imgH = (canvas.height / canvas.width) * imgW
        if (i > 0) pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 24, Math.max(24, (pageH - imgH) / 2), imgW, imgH)
      }
      pdf.save(`tmrw-support-report-${localDayKey(period.end)}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  if (!hasTickets) {
    return (
      <div className="space-y-4">
        <Link href="/support" className="inline-flex items-center gap-1.5 font-ui text-[11px] uppercase tracking-[0.05em] text-dash-text-secondary hover:text-dash-text">
          <ArrowLeft size={13} /> Back to Support
        </Link>
        <div className="rounded-lg border border-dashed border-dash-border bg-dash-surface/40 p-10 text-center">
          <p className="font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">Support Report</p>
          <p className="mt-2 font-sans text-[13px] italic text-dash-text-muted">
            {loading ? 'Loading tickets…' : 'No Zendesk ticket data yet. Upload the inbound-ticket extract to generate the report.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls — excluded from the PDF. */}
      <div className="flex flex-col gap-3 print:hidden md:flex-row md:items-center md:justify-between">
        <Link
          href="/support"
          className="inline-flex items-center gap-1.5 font-ui text-[11px] uppercase tracking-[0.05em] text-dash-text-secondary transition-colors hover:text-dash-text"
        >
          <ArrowLeft size={13} /> Back to Support
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportPdf}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-full bg-dash-text px-4 py-2 font-ui text-[11px] uppercase tracking-[0.05em] text-white transition-colors hover:bg-dash-text/90 disabled:opacity-50"
          >
            <Download size={13} />
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
          <DateRangePicker value={pickerValue} onChange={setPickerValue} />
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* ══════════ PAGE 1 — COVER ══════════ */}
        <section className="report-page relative flex min-h-[860px] flex-col justify-between rounded-lg border border-dash-border bg-dash-surface p-8 md:p-12">
          <p className="font-ui text-[11px] uppercase tracking-[0.3em] text-dash-red">
            Member Support Operations
          </p>
          <div>
            <h1 className="font-display text-5xl uppercase leading-[0.9] tracking-tight text-dash-text md:text-7xl">
              Support
              <br />
              Ticket
              <br />
              Report
            </h1>
            <p className="mt-8 font-ui text-[12px] uppercase tracking-[0.2em] text-dash-text-secondary">
              {fmtRange(period.start, period.end)} vs {fmtRange(comparison.start, comparison.end)}
            </p>
          </div>
          <p className="font-ui text-[10px] uppercase leading-relaxed tracking-[0.15em] text-dash-text-muted">
            Zendesk export{asOf && ` ${asOf.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' })}`}
            {' · '}{fmtNum(zendesk_tickets.length)} inbound tickets · Sydney time · Internal
          </p>
        </section>

        {/* ══════════ PAGE 2 — VOLUME ══════════ */}
        <Page
          n="02"
          eyebrow="Volume"
          headline={
            volumeDelta === null
              ? `Inbound tickets reached ${fmtNum(current.total)} in ${fmtRange(period.start, period.end)}`
              : `Inbound tickets reached ${fmtNum(current.total)} in ${fmtRange(period.start, period.end)}, ${fmtDelta(volumeDelta).replace('+', '')} ${volumeDelta >= 0 ? 'above' : 'below'} the same days of ${comparison.start.toLocaleDateString('en-AU', { month: 'long' })}`
          }
        >
          <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
            <BigStat value={fmtNum(current.total)} label={`Tickets, ${fmtRange(period.start, period.end)}`} tone="red" />
            <BigStat value={fmtNum(prior.total)} label={`Tickets, prior window`} tone="muted" />
            <BigStat value={fmtDelta(volumeDelta)} label="Change" />
            <BigStat value={current.perDay.toFixed(0)} label="Tickets per day" />
            <BigStat
              value={fmtNum(thisMonthFull.total)}
              label={`${period.end.toLocaleDateString('en-AU', { month: 'short' })} month to date, vs ${fmtNum(lastMonthFull.total)} prior`}
            />
          </div>

          <div className="mt-10">
            <p className="mb-3 font-ui text-[10px] uppercase tracking-[0.15em] text-dash-text-muted">
              Tickets per day
            </p>
            <TmrwBarChart
              data={trend.map(d => ({ d: dayLabel(d.date), value: d.value })) as Record<string, unknown>[]}
              index="d"
              series={[{ dataKey: 'value', name: 'Tickets', color: '#E61317' }]}
              height={280}
              yAxisWidth={40}
              showLegend={false}
              valueFormatter={fmtNum}
              highlightIndexes={windowDayLabels}
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            {monthly.slice(-7).map(m => (
              <div key={m.month}>
                <div className="font-ui text-[10px] uppercase tracking-[0.15em] text-dash-text-muted">{m.label}</div>
                <div className="mt-1 font-mono text-lg text-dash-text">{fmtNum(m.value)}</div>
              </div>
            ))}
          </div>

          <Caption>
            Zendesk inbound tickets by creation date, Sydney time. The solid bars are the report window;
            the faded bars are the six weeks before it.
          </Caption>
        </Page>

        {/* ══════════ PAGE 3 — CHANNEL ══════════ */}
        <Page
          n="03"
          eyebrow="Channel"
          headline={
            topGrower && topGrower.deltaPct !== null
              ? `${topGrower.label} grew ${fmtDelta(topGrower.deltaPct)} against the prior window, now ${fmtPct(current.total > 0 ? topGrower.current / current.total : null)} of total tickets`
              : 'Channel mix across the report window'
          }
        >
          <div className="grid grid-cols-3 gap-6">
            {(['messaging', 'email', 'web_other'] as const).map(g => (
              <BigStat
                key={g}
                value={fmtPct(current.total > 0 ? current.byGroup[g] / current.total : null)}
                label={`${CHANNEL_GROUP_LABELS[g]} — ${fmtNum(current.byGroup[g])} tickets`}
                tone={g === 'messaging' ? 'red' : undefined}
              />
            ))}
          </div>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-dash-border-strong">
                  <Th>Channel</Th>
                  <Th align="right">{fmtRange(period.start, period.end)}</Th>
                  <Th align="right">{fmtRange(comparison.start, comparison.end)}</Th>
                  <Th align="right">Δ</Th>
                  <Th align="right">Share</Th>
                </tr>
              </thead>
              <tbody>
                {chCmp.map(c => (
                  <tr key={c.channel} className="border-b border-dash-border/60">
                    <td className="py-2 pr-3 font-sans text-[12px] text-dash-text">
                      <span
                        className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                        style={{ backgroundColor: channelColor(c.channel) }}
                      />
                      {c.label}
                    </td>
                    <Td>{fmtNum(c.current)}</Td>
                    <Td className="text-dash-text-muted">{fmtNum(c.comparison)}</Td>
                    <Td className={(c.deltaPct ?? 0) > 0 ? 'text-status-amber' : 'text-status-green'}>
                      {fmtDelta(c.deltaPct)}
                    </Td>
                    <Td>{fmtPct(current.total > 0 ? c.current / current.total : null, 1)}</Td>
                  </tr>
                ))}
                <tr className="border-t border-dash-border-strong">
                  <td className="py-2 pr-3 font-sans text-[12px] font-medium text-dash-text">All inbound</td>
                  <Td className="font-medium">{fmtNum(current.total)}</Td>
                  <Td className="text-dash-text-muted">{fmtNum(prior.total)}</Td>
                  <Td>{fmtDelta(volumeDelta)}</Td>
                  <Td>100%</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <Caption>
            Messaging share of inbound: {fmtPct(current.messagingShare)} this window,{' '}
            {fmtPct(prior.messagingShare)} the prior window,{' '}
            {fmtPct(thisMonthFull.messagingShare)} {period.end.toLocaleDateString('en-AU', { month: 'long' })} full month,{' '}
            {fmtPct(lastMonthFull.messagingShare)} the month before. Messaging = WhatsApp, SMS, native
            messaging, Instagram DM, Messenger. Web &amp; other = web form, phone, API.
          </Caption>
        </Page>

        {/* ══════════ PAGE 4 — RESPONSE TIME ══════════ */}
        <Page
          n="04"
          eyebrow="Response Time"
          headline={buildResponseHeadline(respCmp)}
        >
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <BigStat value={fmtHours(current.response.medianResolutionHours)} label="Median hours to resolve" tone="red" />
            <BigStat value={fmtHours(prior.response.medianResolutionHours)} label="Prior window" tone="muted" />
            <BigStat value={fmtHours(current.response.p90ResolutionHours)} label="p90 hours to resolve" />
            <BigStat value={fmtNum(current.stillOpen)} label="Still open from this window" />
          </div>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="border-b border-dash-border-strong">
                  <Th>Metric</Th>
                  {respCmp.map(r => (
                    <Th key={r.channel} align="right">{r.label}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([
                  ['Tickets', (s: (typeof respCmp)[number]['current']) => fmtNum(s.tickets)],
                  ['Median resolution, hrs', (s: (typeof respCmp)[number]['current']) => fmtHours(s.medianResolutionHours)],
                  ['p90 resolution, hrs', (s: (typeof respCmp)[number]['current']) => fmtHours(s.p90ResolutionHours)],
                  ['Resolved, n', (s: (typeof respCmp)[number]['current']) => fmtNum(s.resolved)],
                  ['Still open', (s: (typeof respCmp)[number]['current']) => fmtNum(s.stillOpen)],
                  ['Median first response', (s: (typeof respCmp)[number]['current']) => fmtHours(s.medianFirstResponseHours)],
                  ['First response, n', (s: (typeof respCmp)[number]['current']) => fmtNum(s.firstResponseCount)],
                ] as const).map(([label, get]) => (
                  <tr key={label} className="border-b border-dash-border/60">
                    <td className="py-2 pr-3 font-sans text-[12px] text-dash-text">{label}</td>
                    {respCmp.map(r => (
                      <Td key={r.channel}>
                        {get(r.current)}
                        <span className="ml-2 text-dash-text-muted">{get(r.comparison)}</span>
                      </Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 font-ui text-[10px] uppercase tracking-[0.08em] text-dash-text-muted">
              Each cell shows the report window, then the prior window in grey.
            </p>
          </div>

          <Caption>
            Medians computed on resolved tickets only. First response is recorded on just{' '}
            {fmtPct(current.response.firstResponseCoverage, 1)} of tickets in this window
            ({current.response.firstResponseCount} of {current.response.tickets}), so the first-response
            rows are indicative rather than representative.
          </Caption>
        </Page>
      </div>
    </div>
  )
}

/**
 * Headline for the response-time page, phrased from whichever focus channels
 * actually moved. Falls back to a neutral sentence when there's nothing to
 * compare, rather than asserting a change that didn't happen.
 */
function buildResponseHeadline(rows: ReturnType<typeof responseComparison>): string {
  const moved = rows.filter(
    r => r.current.medianResolutionHours !== null && r.comparison.medianResolutionHours !== null
  )
  if (moved.length === 0) return 'Resolution times across the report window'

  const parts = moved.map(r => {
    const now = r.current.medianResolutionHours!
    const before = r.comparison.medianResolutionHours!
    const verb = now < before ? 'fell' : 'rose'
    return `${r.label} resolution ${verb} to ${now.toFixed(1)} hours from ${before.toFixed(1)}`
  })
  return parts.join('; ')
}

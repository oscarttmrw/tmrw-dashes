/**
 * Acceptance checks for the Zendesk support pipeline.
 *
 * Reproduces the figures in Dan's "Support Ticket Report, 1–5 August 2026 vs
 * 1–5 July 2026" from the raw export, through the real processor and analytics.
 * If any of these drift, the page is lying.
 *
 *   npx tsx scripts/verify-support-pipeline.ts --dir <folder-with-the-export>
 *   npx tsx scripts/verify-support-pipeline.ts --dir <folder> --no-assert
 */
import * as fs from 'fs'
import * as path from 'path'
import Papa from 'papaparse'
import { processZendeskTicketsToCanonical } from '../src/lib/processors/zendesk-tickets-processor'
import {
  windowMetrics,
  channelComparison,
  responseComparison,
  monthlyVolume,
  dailyVolume,
  openBacklogByAge,
  latestTicketAt,
  fmtHours,
} from '../src/lib/analytics/support-metrics'
import { atDayEnd, atDayStart, samePeriodLastMonth, type DateRange } from '../src/lib/utils/period'

const args = process.argv.slice(2)
const dirFlag = args.indexOf('--dir')
const DIR = dirFlag >= 0 ? args[dirFlag + 1] : '.'
const ASSERT = !args.includes('--no-assert')

let failures = 0
function check(label: string, actual: unknown, expected: unknown, tol = 0.05) {
  if (!ASSERT) return
  const ok = typeof actual === 'number' && typeof expected === 'number'
    ? Math.abs(actual - expected) <= tol
    : actual === expected
  if (!ok) failures++
  const fmt = (v: unknown) => typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(v)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(50)} ${fmt(actual)}${ok ? '' : `   expected ${fmt(expected)}`}`)
}

const csvName = fs.readdirSync(DIR).find(f => /ZENDESK.*\.csv$/i.test(f))
if (!csvName) {
  console.error(`No ZENDESK*.csv found in ${DIR}`)
  process.exit(1)
}
const csvPath = path.join(DIR, csvName)

const raw = Papa.parse(fs.readFileSync(csvPath, 'utf-8'), { header: true, skipEmptyLines: true })
  .data as Record<string, unknown>[]
const res = processZendeskTicketsToCanonical(raw)
console.log(`\n${csvName}`)
console.log(`   ${res.validRows.length} rows processed from ${raw.length}, ${res.errors.length} errors`)
for (const e of res.errors.slice(0, 5)) console.log(`      row ${e.rowIndex}: ${e.reason}`)
check('rows processed', res.validRows.length, 3309)

const rows = res.validRows
const asOf = latestTicketAt(rows)
console.log(`   latest ticket: ${asOf?.toISOString()}`)

/* ─── The report's two windows ─────────────────────────────────────────── */

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d)
const augWindow: DateRange = { start: atDayStart(day(2026, 8, 1)), end: atDayEnd(day(2026, 8, 5)) }
const julWindow = samePeriodLastMonth(augWindow)

console.log(`\nWINDOWS`)
console.log(`   current:    ${augWindow.start.toDateString()} → ${augWindow.end.toDateString()}`)
console.log(`   same period last month: ${julWindow.start.toDateString()} → ${julWindow.end.toDateString()}`)
// samePeriodLastMonth must land on 1–5 Jul, not "the 5 days before 1 Aug".
check('SPLM start day', julWindow.start.getDate(), 1)
check('SPLM end day', julWindow.end.getDate(), 5)
check('SPLM month', julWindow.start.getMonth() + 1, 7)

const aug = windowMetrics(rows, augWindow)
const jul = windowMetrics(rows, julWindow)

/* ─── Page 2: volume ──────────────────────────────────────────────────── */

console.log('\nVOLUME')
console.log(`   1–5 Aug ${aug.total}   1–5 Jul ${jul.total}   change ${(((aug.total - jul.total) / jul.total) * 100).toFixed(0)}%`)
console.log(`   per day: Aug ${aug.perDay.toFixed(0)}  Jul ${jul.perDay.toFixed(0)}`)
check('tickets 1–5 Aug (Sydney)', aug.total, 260)
check('tickets 1–5 Jul (Sydney)', jul.total, 100)
check('volume change %', ((aug.total - jul.total) / jul.total) * 100, 160, 0.5)
check('tickets per day, Aug', Math.round(aug.perDay), 52)

const monthly = monthlyVolume(rows)
console.log('   monthly:', monthly.map(m => `${m.label} ${m.value}`).join('  '))
const byMonth = new Map(monthly.map(m => [m.month, m.value]))
check('Jul 2026 full month', byMonth.get('2026-07'), 1098)
check('Jun 2026 full month', byMonth.get('2026-06'), 452)
check('May 2026 full month', byMonth.get('2026-05'), 751)
check('Apr 2026 full month', byMonth.get('2026-04'), 496)
check('Mar 2026 full month', byMonth.get('2026-03'), 190)
check('Feb 2026 full month', byMonth.get('2026-02'), 62)

const daily = dailyVolume(rows, augWindow)
console.log('   daily in window:', daily.map(d => `${d.date.slice(8)}:${d.value}`).join(' '))
check('daily buckets sum to window total', daily.reduce((s, d) => s + d.value, 0), aug.total)

/* ─── Page 3: channel ─────────────────────────────────────────────────── */

console.log('\nCHANNEL')
const chCmp = channelComparison(aug, jul)
console.log('   channel                current  prior   delta')
for (const c of chCmp) {
  console.log(`   ${c.label.padEnd(20)} ${String(c.current).padStart(7)} ${String(c.comparison).padStart(6)}   ${c.deltaPct === null ? '—' : (c.deltaPct > 0 ? '+' : '') + c.deltaPct.toFixed(0) + '%'}`)
}
const wa = chCmp.find(c => c.channel === 'whatsapp')!
const sms = chCmp.find(c => c.channel === 'sms')!
const email = chCmp.find(c => c.channel === 'email')!
check('WhatsApp, Aug window', wa.current, 82)
check('WhatsApp, Jul window', wa.comparison, 14)
check('WhatsApp delta %', wa.deltaPct!, 486, 0.6)
check('SMS, Aug window', sms.current, 27)
check('SMS delta %', sms.deltaPct!, 108, 0.6)
check('Email, Aug window', email.current, 90)
check('Email delta %', email.deltaPct!, 84, 0.6)
check('WhatsApp share of Aug window', (wa.current / aug.total) * 100, 31.5, 0.6)

console.log(`   messaging share: Aug ${((aug.messagingShare ?? 0) * 100).toFixed(0)}%  Jul ${((jul.messagingShare ?? 0) * 100).toFixed(0)}%`)
check('messaging share, Aug window', (aug.messagingShare ?? 0) * 100, 55, 0.6)
check('messaging share, Jul window', (jul.messagingShare ?? 0) * 100, 42, 0.6)

/* ─── Page 4: response time ───────────────────────────────────────────── */

console.log('\nRESPONSE TIME')
const respCmp = responseComparison(aug, jul, ['whatsapp', 'sms'])
for (const r of respCmp) {
  console.log(`   ${r.label}`)
  console.log(`      current:  ${r.current.tickets} tickets, median ${fmtHours(r.current.medianResolutionHours)}, p90 ${fmtHours(r.current.p90ResolutionHours)}, resolved ${r.current.resolved}, open ${r.current.stillOpen}, median 1st reply ${fmtHours(r.current.medianFirstResponseHours)} (n=${r.current.firstResponseCount})`)
  console.log(`      prior:    ${r.comparison.tickets} tickets, median ${fmtHours(r.comparison.medianResolutionHours)}, p90 ${fmtHours(r.comparison.p90ResolutionHours)}, resolved ${r.comparison.resolved}, open ${r.comparison.stillOpen}, median 1st reply ${fmtHours(r.comparison.medianFirstResponseHours)} (n=${r.comparison.firstResponseCount})`)
}
const waR = respCmp.find(r => r.channel === 'whatsapp')!
const smsR = respCmp.find(r => r.channel === 'sms')!
check('WhatsApp median resolution, Aug', waR.current.medianResolutionHours!, 16.6, 0.06)
check('WhatsApp median resolution, Jul', waR.comparison.medianResolutionHours!, 76.8, 0.06)
check('WhatsApp p90 resolution, Aug', waR.current.p90ResolutionHours!, 46.2, 0.3)
check('WhatsApp p90 resolution, Jul', waR.comparison.p90ResolutionHours!, 149.3, 0.5)
check('WhatsApp resolved, Aug', waR.current.resolved, 58)
check('WhatsApp still open, Aug', waR.current.stillOpen, 24)
check('WhatsApp first-response n, Aug', waR.current.firstResponseCount, 2)
check('SMS median resolution, Aug', smsR.current.medianResolutionHours!, 33.5, 0.06)
check('SMS median resolution, Jul', smsR.comparison.medianResolutionHours!, 94.1, 0.15)
check('SMS p90 resolution, Aug', smsR.current.p90ResolutionHours!, 50.7, 0.3)
check('SMS resolved, Aug', smsR.current.resolved, 18)
check('SMS still open, Aug', smsR.current.stillOpen, 9)

// The report footnotes first-response coverage at 6% of WhatsApp and 5% of SMS
// across the whole export — the reason the page must show coverage, not just a median.
const allTime: DateRange = { start: atDayStart(day(2026, 1, 1)), end: atDayEnd(day(2026, 12, 31)) }
const all = windowMetrics(rows, allTime)
const waAll = all.byChannel.find(c => c.channel === 'whatsapp')!
const smsAll = all.byChannel.find(c => c.channel === 'sms')!
console.log(`   first-response coverage across the export: WhatsApp ${((waAll.response.firstResponseCoverage ?? 0) * 100).toFixed(0)}%, SMS ${((smsAll.response.firstResponseCoverage ?? 0) * 100).toFixed(0)}%`)
check('WhatsApp first-response coverage', (waAll.response.firstResponseCoverage ?? 0) * 100, 6, 0.6)
check('SMS first-response coverage', (smsAll.response.firstResponseCoverage ?? 0) * 100, 5, 0.6)

// July full month, per the report's footnote.
const julFull: DateRange = { start: atDayStart(day(2026, 7, 1)), end: atDayEnd(day(2026, 7, 31)) }
const julM = windowMetrics(rows, julFull)
const waJul = julM.byChannel.find(c => c.channel === 'whatsapp')!
const smsJul = julM.byChannel.find(c => c.channel === 'sms')!
console.log(`   July full month: WhatsApp median ${fmtHours(waJul.response.medianResolutionHours)} over ${waJul.response.resolved} resolved; SMS ${fmtHours(smsJul.response.medianResolutionHours)} over ${smsJul.response.resolved}`)
check('WhatsApp Jul median resolution', waJul.response.medianResolutionHours!, 20.4, 0.06)
check('WhatsApp Jul resolved count', waJul.response.resolved, 319)
check('SMS Jul median resolution', smsJul.response.medianResolutionHours!, 14.5, 0.06)
check('SMS Jul resolved count', smsJul.response.resolved, 179)
check('messaging share Jul full month', (julM.messagingShare ?? 0) * 100, 61, 0.6)
check('messaging share Jun full month', (windowMetrics(rows, { start: atDayStart(day(2026, 6, 1)), end: atDayEnd(day(2026, 6, 30)) }).messagingShare ?? 0) * 100, 23, 0.6)

/* ─── Queues + backlog (beyond the report) ────────────────────────────── */

console.log('\nQUEUES (whole export)')
for (const q of all.byQueue) {
  console.log(`   ${q.queue.padEnd(32)} ${String(q.count).padStart(5)}  median ${fmtHours(q.medianResolutionHours).padStart(8)}  open ${q.stillOpen}`)
}

if (asOf) {
  console.log('\nOPEN BACKLOG BY AGE')
  for (const b of openBacklogByAge(rows, asOf)) {
    console.log(`   ${b.label.padEnd(12)} ${b.count}`)
  }
}

if (ASSERT) console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`)
process.exit(failures === 0 ? 0 : 1)

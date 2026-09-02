/**
 * Acceptance checks for the Meta / marketing pipeline.
 *
 * Reproduces the monthly figures in Dan's weekly marketing summary from the raw
 * warehouse extract, through the real processor and analytics.
 *
 *   npx tsx scripts/verify-marketing-pipeline.ts --dir <folder-with-the-export>
 *   npx tsx scripts/verify-marketing-pipeline.ts --dir <folder> --no-assert
 */
import * as fs from 'fs'
import * as path from 'path'
import Papa from 'papaparse'
import { processMetaAdsToCanonical } from '../src/lib/processors/meta-processor'
import { processMarketingDailyToCanonical } from '../src/lib/processors/marketing-daily-processor'
import { campaignBreakdown, marketingWindow, monthlyMarketing } from '../src/lib/analytics/marketing-metrics'
import { atDayEnd, atDayStart, previousWeekSameSpan, samePeriodLastMonth, weekToDate, type DateRange } from '../src/lib/utils/period'

const args = process.argv.slice(2)
const dirFlag = args.indexOf('--dir')
const DIR = dirFlag >= 0 ? args[dirFlag + 1] : '.'
const ASSERT = !args.includes('--no-assert')

let failures = 0
function check(label: string, actual: unknown, expected: unknown, tol = 0.51) {
  if (!ASSERT) return
  const ok = typeof actual === 'number' && typeof expected === 'number'
    ? Math.abs(actual - expected) <= tol
    : actual === expected
  if (!ok) failures++
  const fmt = (v: unknown) => typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(v)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(48)} ${fmt(actual)}${ok ? '' : `   expected ${fmt(expected)}`}`)
}

const csvName = fs.readdirSync(DIR).find(f => /Meta_Ads.*\.csv$/i.test(f))
if (!csvName) {
  console.error(`No Meta_Ads*.csv found in ${DIR}`)
  process.exit(1)
}

const raw = Papa.parse(fs.readFileSync(path.join(DIR, csvName), 'utf-8'), { header: true, skipEmptyLines: true })
  .data as Record<string, unknown>[]
const res = processMetaAdsToCanonical(raw)
console.log(`\n${csvName}`)
console.log(`   ${res.validRows.length} rows processed from ${raw.length}, ${res.errors.length} errors`)
for (const e of res.errors.slice(0, 5)) console.log(`      ${e.reason}`)
check('rows processed', res.validRows.length, 1615)

const meta = res.validRows
const withCampaign = meta.filter(r => r.campaign_name).length
console.log(`   rows carrying CAMPAIGN_NAME: ${withCampaign} / ${meta.length}`)
check('all rows carry campaign name', withCampaign, meta.length)

const dates = meta.map(r => String(r.date)).sort()
console.log(`   date range: ${dates[0]} → ${dates[dates.length - 1]}`)
check('earliest date parsed correctly', dates[0], '2026-04-17')
check('latest date parsed correctly', dates[dates.length - 1], '2026-08-03')

/* ─── Optional marketing_daily sheet ──────────────────────────────────── */

let daily: Record<string, unknown>[] = []
const dailyName = fs.readdirSync(DIR).find(f => /marketing_daily.*\.csv$/i.test(f))
if (dailyName) {
  const dRaw = Papa.parse(fs.readFileSync(path.join(DIR, dailyName), 'utf-8'), { header: true, skipEmptyLines: true })
    .data as Record<string, unknown>[]
  const dRes = processMarketingDailyToCanonical(dRaw)
  daily = dRes.validRows
  console.log(`\n${dailyName}: ${daily.length} rows, ${dRes.errors.length} errors`)
} else {
  console.log('\n(no marketing_daily*.csv — call/funnel metrics will read as not instrumented, which is the point of the check)')
}

/* ─── Monthly detail, against Dan's table ─────────────────────────────── */

const monthly = monthlyMarketing(meta, daily, [])
console.log('\nMONTHLY')
console.log('   month      spend  impressions   clicks   leads      CPL   linkCTR')
for (const m of monthly) {
  const w = m.window
  console.log(
    `   ${m.month} ${w.spend.toFixed(0).padStart(10)} ${w.impressions.toFixed(0).padStart(12)} ${w.clicks.toFixed(0).padStart(8)} ${w.leads.toFixed(0).padStart(7)} ${(w.costPerLead === null ? '—' : w.costPerLead.toFixed(2)).padStart(8)} ${(w.linkCtr === null ? '—' : w.linkCtr.toFixed(2) + '%').padStart(9)}`
  )
}

const byMonth = new Map(monthly.map(m => [m.month, m.window]))
const jun = byMonth.get('2026-06')!
const jul = byMonth.get('2026-07')!

check('Jun 2026 spend', jun.spend, 30058, 1)
check('Jun 2026 impressions', jun.impressions, 521799)
check('Jun 2026 leads', jun.leads, 1019)
check('Jul 2026 spend', jul.spend, 35166, 1)
check('Jul 2026 impressions', jul.impressions, 470662)
check('Jul 2026 leads', jul.leads, 779)

// Dan's table quotes CPL of A$29.50 for Jun and A$45.14 for Jul.
check('Jun 2026 cost per lead', jun.costPerLead!, 29.50, 0.02)
check('Jul 2026 cost per lead', jul.costPerLead!, 45.14, 0.02)
// And link CTR of 2.84% / 2.00%.
check('Jun 2026 link CTR', jun.linkCtr!, 2.84, 0.01)
check('Jul 2026 link CTR', jul.linkCtr!, 2.00, 0.01)

/* ─── Not-instrumented behaviour ──────────────────────────────────────── */

console.log('\nMISSING-DATA BEHAVIOUR (no marketing_daily uploaded)')
if (daily.length === 0) {
  console.log(`   calls booked:        ${describe(jul.callsBooked)}`)
  console.log(`   calls held:          ${describe(jul.callsHeld)}`)
  console.log(`   cart starts:         ${describe(jul.cartStarts)}`)
  console.log(`   cost per call booked: ${jul.costPerCallBooked === null ? 'null (not a 0)' : jul.costPerCallBooked.toFixed(2)}`)
  // Meta's pixel conversions still stand in for calls booked, and must be
  // labelled as Meta rather than silently passed off as the Slack figure.
  check('calls booked falls back to Meta pixel', jul.callsBooked.source, 'meta')
  check('calls booked value, Jul', jul.callsBooked.value!, 393)
  check('calls held stays null', jul.callsHeld.value, null)
  check('cart starts stays null', jul.cartStarts.value, null)
  check('close rate stays null', jul.closeRateOfHeld, null)
  check('blended cost per conversion stays null', jul.blendedCostPerConversion, null)
}

/* ─── Week comparisons ────────────────────────────────────────────────── */

// Anchored to the export's last day so the check is stable over time.
const anchor = new Date(2026, 7, 3)
const wtd = weekToDate(anchor)
const lastWeek = previousWeekSameSpan(wtd)
const splm = samePeriodLastMonth(wtd)

console.log('\nWEEK WINDOWS (anchored 3 Aug 2026)')
const label = (r: DateRange) => `${r.start.toDateString().slice(4, 10)} → ${r.end.toDateString().slice(4, 10)}`
console.log(`   week to date:            ${label(wtd)}`)
console.log(`   prior week, same span:   ${label(lastWeek)}`)
console.log(`   same period last month:  ${label(splm)}`)
// 3 Aug 2026 is a Monday, so WTD is a single day and the prior week's same span
// must be the previous Monday — not "the seven days before today".
check('WTD starts on the Monday', wtd.start.getDay(), 1)
check('prior week same span is also a Monday', lastWeek.start.getDay(), 1)
check('prior week is 7 days back', Math.round((wtd.start.getTime() - lastWeek.start.getTime()) / 86_400_000), 7)
check('SPLM lands in July', splm.start.getMonth() + 1, 7)
check('SPLM keeps the day of month', splm.start.getDate(), wtd.start.getDate())

for (const [name, r] of [['WTD', wtd], ['last week', lastWeek], ['same period last month', splm]] as const) {
  const w = marketingWindow(meta, daily, [], r)
  console.log(`   ${name.padEnd(24)} spend ${w.spend.toFixed(0).padStart(7)}  leads ${String(w.leads).padStart(4)}  CPL ${w.costPerLead === null ? '—' : w.costPerLead.toFixed(2)}`)
}

/* ─── Campaigns ───────────────────────────────────────────────────────── */

const julRange: DateRange = { start: atDayStart(new Date(2026, 6, 1)), end: atDayEnd(new Date(2026, 6, 31)) }
const campaigns = campaignBreakdown(meta, julRange)
console.log('\nJUL 2026 BY CAMPAIGN')
for (const c of campaigns) {
  console.log(`   ${c.spend.toFixed(0).padStart(8)}  ${(c.shareOfSpend !== null ? (c.shareOfSpend * 100).toFixed(0) + '%' : '—').padStart(4)}  leads ${String(c.leads).padStart(4)}  CPL ${(c.costPerLead === null ? '—' : c.costPerLead.toFixed(2)).padStart(7)}  ${c.campaign}`)
}
check('Jul campaign spend sums to month spend', campaigns.reduce((s, c) => s + c.spend, 0), jul.spend, 1)
check('Jul campaign count', campaigns.length, 6)

function describe(s: { value: number | null; source: string | null }): string {
  return s.value === null ? 'not instrumented (null)' : `${s.value} from ${s.source}`
}

if (ASSERT) console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`)
process.exit(failures === 0 ? 0 : 1)

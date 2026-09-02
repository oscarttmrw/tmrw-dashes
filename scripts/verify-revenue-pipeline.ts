/**
 * Acceptance checks for the Stripe revenue pipeline.
 *
 * Runs the real processors and analytics over an actual export and prints the
 * numbers the dashboard will show, so a new extract can be sanity-checked before
 * anyone trusts a tile. Expected values are the figures established from the
 * 6 Aug 2026 export; pass --no-assert when checking a newer file, where the
 * totals will legitimately differ.
 *
 *   npx tsx scripts/verify-revenue-pipeline.ts --dir <folder-with-the-exports>
 *   npx tsx scripts/verify-revenue-pipeline.ts --dir <folder> --no-assert
 *
 * The folder needs the Stripe workbook (*.xlsx with a Mapping tab) and, if you
 * want the 8-column path checked too, a STRIPE_INTEGRATED*.csv.
 */
import * as fs from 'fs'
import * as path from 'path'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { processStripeRevenueToCanonical } from '../src/lib/processors/stripe-revenue-processor'
import { processProductCategoryMapToCanonical } from '../src/lib/processors/product-category-map-processor'
import {
  buildCategoryLookup,
  ladderFor,
  rollupByMonth,
  rollupByCategory,
  unmappedProducts,
} from '../src/lib/analytics/revenue-metrics'

const args = process.argv.slice(2)
const dirFlag = args.indexOf('--dir')
const DIR = dirFlag >= 0 ? args[dirFlag + 1] : '.'
const ASSERT = !args.includes('--no-assert')

function findFile(pattern: RegExp): string | null {
  const hit = fs.readdirSync(DIR).find(f => pattern.test(f))
  return hit ? path.join(DIR, hit) : null
}

let failures = 0
function check(label: string, actual: unknown, expected: unknown, tol = 0.01) {
  if (!ASSERT) return
  const ok = typeof actual === 'number' && typeof expected === 'number'
    ? Math.abs(actual - expected) <= tol
    : actual === expected
  if (!ok) failures++
  const fmt = (v: unknown) => typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(v)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(50)} ${fmt(actual)}${ok ? '' : `   expected ${fmt(expected)}`}`)
}

const workbookPath = findFile(/stripe.*line_items.*\.xlsx$/i) ?? findFile(/\.xlsx$/i)
if (!workbookPath) {
  console.error(`No .xlsx workbook found in ${DIR}`)
  process.exit(1)
}

// ─── Mapping tab ─────────────────────────────────────────────────────────────
// Read the way the browser does — cached formula values, not formula text.
const wb = XLSX.readFile(workbookPath)
if (!wb.Sheets['Mapping']) {
  console.error(`${workbookPath} has no "Mapping" sheet`)
  process.exit(1)
}
const mapRes = processProductCategoryMapToCanonical(
  XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Mapping'], { defval: null })
)
console.log(`\nMAPPING TAB  ${mapRes.validRows.length} rows kept, ${mapRes.errors.length} rejected`)
for (const e of mapRes.errors.slice(0, 10)) console.log(`   row ${e.rowIndex}: ${e.reason}`)

const lookup = buildCategoryLookup(mapRes.validRows)
console.log(`   lookup keys: ${lookup.byId.size} by product id, ${lookup.byName.size} by name`)
const cats = new Set(mapRes.validRows.map(r => String(r.category)))
console.log(`   categories (${cats.size}): ${Array.from(cats).sort().join(' | ')}`)

/* ─── Shared reporting ──────────────────────────────────────────────────── */

function report(label: string, rows: Record<string, unknown>[]) {
  const ladder = ladderFor(rows)
  console.log(`\n${label}`)
  console.log(`   lines ${ladder.lineCount}`)
  console.log(`   gross      ${ladder.gross.toFixed(2).padStart(12)}`)
  console.log(`   discount   ${ladder.discount.toFixed(2).padStart(12)}`)
  console.log(`   CHARGED    ${ladder.charged.toFixed(2).padStart(12)}   <- the Net tile`)
  console.log(`   stripe fee ${ladder.fee.toFixed(2).padStart(12)}`)
  console.log(`   net        ${ladder.net.toFixed(2).padStart(12)}`)
  console.log(`   GST        ${ladder.gst.toFixed(2).padStart(12)}`)
  console.log(`   ex-GST net ${ladder.exGstNet.toFixed(2).padStart(12)}`)
  console.log(`   capture    ${ladder.captureRate === null ? '—' : (ladder.captureRate * 100).toFixed(2) + '%'}`)
  console.log(`   refunds    ${ladder.refundCount} lines worth ${ladder.refundValue.toFixed(2)}`)
  return ladder
}

function reportUnmapped(rows: Record<string, unknown>[], totalGross: number) {
  const un = unmappedProducts(rows, lookup)
  const gross = un.reduce((s, p) => s + p.gross, 0)
  const lines = un.reduce((s, p) => s + p.lineCount, 0)
  console.log(`   unmapped: ${un.length} names, ${lines} lines, ${gross.toFixed(2)} gross (${((gross / totalGross) * 100).toFixed(2)}%)`)
  for (const p of un.slice(0, 8)) {
    console.log(`      ${p.gross.toFixed(2).padStart(10)}  ${String(p.lineCount).padStart(3)} lines  ${p.productName}`)
  }
  return { un, gross, lines }
}

function reportMonths(rows: Record<string, unknown>[]) {
  const monthly = rollupByMonth(rows, lookup)
  console.log('\n   month      gross   recurring   one-off  unmapped  recur%')
  for (const m of monthly) {
    console.log(
      `   ${m.month} ${m.ladder.gross.toFixed(0).padStart(9)} ${m.recurring.toFixed(0).padStart(11)} ${m.oneOff.toFixed(0).padStart(9)} ${m.unmapped.toFixed(0).padStart(9)}   ${m.recurringPct === null ? '—' : m.recurringPct.toFixed(1) + '%'}`
    )
  }
  return monthly
}

/* ─── 8-column integrated CSV ───────────────────────────────────────────── */

const csvPath = findFile(/STRIPE_INTEGRATED.*\.csv$/i)
if (csvPath) {
  const raw = Papa.parse(fs.readFileSync(csvPath, 'utf-8'), { header: true, skipEmptyLines: true })
    .data as Record<string, unknown>[]
  const res = processStripeRevenueToCanonical(raw)
  console.log(`\n${'='.repeat(72)}`)
  console.log(`8-COLUMN EXPORT  ${path.basename(csvPath)}`)
  console.log(`   ${res.validRows.length} rows processed from ${raw.length}, ${res.errors.length} errors`)
  for (const e of res.errors.slice(0, 5)) console.log(`      row ${e.rowIndex}: ${e.reason}`)

  const ladder = report('   LADDER (name-based category mapping)', res.validRows)
  check('8-col line count', res.validRows.length, 3636)
  check('8-col total gross', ladder.gross, 670206.86)

  const { un, gross: unGross, lines: unLines } = reportUnmapped(res.validRows, ladder.gross)
  check('8-col unmapped names', un.length, 19)
  check('8-col unmapped lines', unLines, 88)
  check('8-col unmapped gross', unGross, 13533.61)
  check('8-col unmapped % of gross', (unGross / ladder.gross) * 100, 2.02, 0.005)

  const monthly = reportMonths(res.validRows)
  const jun = monthly.find(m => m.month === '2026-06')
  const jul = monthly.find(m => m.month === '2026-07')
  // Recurring % is of TOTAL gross, so unmapped revenue cannot flatter it. Jun has
  // nothing unmapped, so both denominators agree; Jul has A$10,593 unmapped, which
  // is why of-total (89.29%) sits below of-classified (95.24%).
  if (jun) check('recurring % of total, Jun 2026', jun.recurringPct!, 93.47, 0.02)
  if (jul) check('recurring % of total, Jul 2026', jul.recurringPct!, 89.29, 0.02)
  if (jul) check('recurring % of classified, Jul 2026', jul.recurringPctOfClassified!, 95.24, 0.02)

  const latestMonth = monthly[monthly.length - 1]
  if (latestMonth) {
    console.log(`\n   ${latestMonth.month} by category:`)
    const inMonth = res.validRows.filter(r => String(r.transaction_date).startsWith(latestMonth.month))
    for (const c of rollupByCategory(inMonth, lookup)) {
      console.log(`      ${c.ladder.gross.toFixed(0).padStart(9)} ${((c.shareOfGross ?? 0) * 100).toFixed(1).padStart(6)}%  ${c.revenueClass.padEnd(9)} ${c.category}`)
    }
  }
} else {
  console.log('\n(no STRIPE_INTEGRATED*.csv in the folder — skipping the 8-column path)')
}

/* ─── 57-column Line Items export ───────────────────────────────────────── */

if (wb.Sheets['Line Items']) {
  const res = processStripeRevenueToCanonical(
    XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Line Items'], { defval: null })
  )
  console.log(`\n${'='.repeat(72)}`)
  console.log('57-COLUMN LINE ITEMS EXPORT (product-id category mapping)')
  console.log(`   ${res.validRows.length} rows processed, ${res.errors.length} errors`)
  for (const e of res.errors.slice(0, 5)) console.log(`      row ${e.rowIndex}: ${e.reason}`)
  const withId = res.validRows.filter(r => r.product_id).length
  console.log(`   rows carrying PRODUCT_ID: ${withId} / ${res.validRows.length}`)

  const ladder = report('   LADDER', res.validRows)
  reportUnmapped(res.validRows, ladder.gross)
  reportMonths(res.validRows)
}

if (ASSERT) {
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`)
}
process.exit(failures === 0 ? 0 : 1)

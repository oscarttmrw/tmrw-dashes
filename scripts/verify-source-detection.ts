/**
 * Acceptance check for SOURCE SELECTION — which schema an uploaded file routes to.
 *
 * This covers a gap every other check leaves. verify:revenue / :support /
 * :marketing call the processors directly, and verify:render feeds the context
 * directly, so none of them ever exercise the step where a file is matched to a
 * source. That is exactly where a real upload failed: right file, wrong schema,
 * producing a wall of "missing required columns" that reads like a bug.
 *
 * Two things are asserted per input:
 *   1. it validates cleanly against the source it is meant to be, and
 *   2. it validates against NOTHING ELSE — because detectSourceByHeaders returns
 *      null on two matches, silently demoting the user to a manual pick.
 *
 *   npx tsx scripts/verify-source-detection.ts --dir <folder-with-the-exports>
 */
import * as fs from 'fs'
import * as path from 'path'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { dataSourceConfigs, dataSourceSchemas, validateRequiredColumns } from '../src/lib/config/data-sources'

const args = process.argv.slice(2)
const dirFlag = args.indexOf('--dir')
const DIR = dirFlag >= 0 ? args[dirFlag + 1] : '.'

function find(re: RegExp): string | null {
  const hit = fs.readdirSync(DIR).find(f => re.test(f))
  return hit ? path.join(DIR, hit) : null
}

function csvHeaders(p: string): string[] {
  return Papa.parse(fs.readFileSync(p, 'utf-8'), { header: true, preview: 1 }).meta.fields ?? []
}

function sheetHeaders(p: string, sheet: string): string[] {
  const wb = XLSX.readFile(p)
  if (!wb.Sheets[sheet]) return []
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheet], { defval: null })
  return Object.keys(rows[0] ?? {})
}

/** Every source whose required columns these headers fully satisfy. */
function matches(headers: string[]): string[] {
  return Object.keys(dataSourceSchemas)
    .filter(k => validateRequiredColumns(dataSourceSchemas[k], headers).length === 0)
}

const label = (k: string) => dataSourceConfigs[k]?.name ?? k

const workbook = find(/stripe.*\.xlsx$/i)
const cases: { label: string; headers: string[]; want: string }[] = []

const integrated = find(/STRIPE_INTEGRATED.*\.csv$/i)
if (integrated) cases.push({ label: path.basename(integrated), headers: csvHeaders(integrated), want: 'stripe_revenue' })

const zendesk = find(/ZENDESK.*\.csv$/i)
if (zendesk) cases.push({ label: path.basename(zendesk), headers: csvHeaders(zendesk), want: 'zendesk_tickets' })

const meta = find(/Meta_Ads.*\.csv$/i)
if (meta) cases.push({ label: path.basename(meta), headers: csvHeaders(meta), want: 'meta_ads' })

if (workbook) {
  // Both sheets carry PRODUCT_ID + PRODUCT_NAME, so they are the pair most at
  // risk of colliding with each other.
  const map = sheetHeaders(workbook, 'Mapping')
  if (map.length) cases.push({ label: 'workbook → Mapping tab', headers: map, want: 'product_category_map' })
  const lines = sheetHeaders(workbook, 'Line Items')
  if (lines.length) cases.push({ label: 'workbook → Line Items tab', headers: lines, want: 'stripe_revenue' })
}

if (cases.length === 0) {
  console.error(`No recognisable exports found in ${DIR}`)
  process.exit(1)
}

let failures = 0
console.log()
for (const c of cases) {
  const hits = matches(c.headers)
  const unique = hits.length === 1 && hits[0] === c.want
  if (!unique) failures++
  const detail = hits.length === 0
    ? 'matched no source at all'
    : hits.length === 1
      ? `→ ${label(hits[0])}`
      : `AMBIGUOUS → ${hits.map(label).join(' + ')} (auto-detect gives up)`
  console.log(`${unique ? 'PASS' : 'FAIL'}  ${c.label.padEnd(44)} ${detail}`)
  if (!unique) console.log(`      expected only ${label(c.want)}`)
}

console.log(`\n${failures === 0 ? 'ALL DETECTION CHECKS PASSED' : `${failures} DETECTION CHECK(S) FAILED`}`)
process.exit(failures === 0 ? 0 : 1)

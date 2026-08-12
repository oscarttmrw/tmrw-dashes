/**
 * Server-renders each live page with REAL uploaded data behind a mocked data
 * context, and asserts that recognisable content actually appears in the HTML.
 *
 * This catches a class of problem nothing else here does: `tsc` proves the types
 * line up, and `next build` prerenders every page but only ever with EMPTY data,
 * so a crash that only happens once rows are present (a null deref in a chart, a
 * bad reduce over a populated array) slips through both.
 *
 *   npx tsx --tsconfig tsconfig.smoke.json scripts/smoke-render-pages.tsx --dir <folder>
 *
 * The separate tsconfig is what redirects `@/lib/context/data-context` to
 * scripts/__mocks__/data-context.tsx.
 */
import * as fs from 'fs'
import * as path from 'path'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { renderToString } from 'react-dom/server'
import * as React from 'react'

import { __inject } from './__mocks__/data-context'
import { processStripeRevenueToCanonical } from '@/lib/processors/stripe-revenue-processor'
import { processProductCategoryMapToCanonical } from '@/lib/processors/product-category-map-processor'
import { processZendeskTicketsToCanonical } from '@/lib/processors/zendesk-tickets-processor'
import { processMetaAdsToCanonical } from '@/lib/processors/meta-processor'
import { processMarketingDailyToCanonical } from '@/lib/processors/marketing-daily-processor'

const args = process.argv.slice(2)
const dirFlag = args.indexOf('--dir')
const DIR = dirFlag >= 0 ? args[dirFlag + 1] : '.'

type Row = Record<string, unknown>

function find(re: RegExp): string | null {
  const hit = fs.readdirSync(DIR).find(f => re.test(f))
  return hit ? path.join(DIR, hit) : null
}

function csv(p: string): Row[] {
  return Papa.parse(fs.readFileSync(p, 'utf-8'), { header: true, skipEmptyLines: true }).data as Row[]
}

/* ─── Load whatever the folder has ────────────────────────────────────── */

let mapRows: Row[] = []
let lineItemRows: Row[] = []
const workbook = find(/stripe.*\.xlsx$/i)
if (workbook) {
  const wb = XLSX.readFile(workbook)
  if (wb.Sheets['Mapping']) {
    mapRows = processProductCategoryMapToCanonical(
      XLSX.utils.sheet_to_json<Row>(wb.Sheets['Mapping'], { defval: null })
    ).validRows
  }
  if (wb.Sheets['Line Items']) {
    lineItemRows = processStripeRevenueToCanonical(
      XLSX.utils.sheet_to_json<Row>(wb.Sheets['Line Items'], { defval: null })
    ).validRows
  }
}

const integrated = find(/STRIPE_INTEGRATED.*\.csv$/i)
const stripeRows = integrated ? processStripeRevenueToCanonical(csv(integrated)).validRows : lineItemRows

const zendeskCsv = find(/ZENDESK.*\.csv$/i)
const ticketRows = zendeskCsv ? processZendeskTicketsToCanonical(csv(zendeskCsv)).validRows : []

const metaCsv = find(/Meta_Ads.*\.csv$/i)
const metaRows = metaCsv ? processMetaAdsToCanonical(csv(metaCsv)).validRows : []

const dailyCsv = find(/marketing_daily.*\.csv$/i)
const dailyRows = dailyCsv ? processMarketingDailyToCanonical(csv(dailyCsv)).validRows : []

console.log(
  `loaded: ${stripeRows.length} revenue lines · ${mapRows.length} map rows · `
  + `${ticketRows.length} tickets · ${metaRows.length} meta rows · ${dailyRows.length} marketing-daily rows\n`
)

/* ─── Render + assert ─────────────────────────────────────────────────── */

let failures = 0

async function renderPage(
  label: string,
  importer: () => Promise<{ default: React.ComponentType }>,
  expect: (string | RegExp)[],
) {
  let html = ''
  try {
    const mod = await importer()
    html = renderToString(React.createElement(mod.default))
  } catch (e) {
    failures++
    console.log(`FAIL  ${label} — threw during render`)
    console.log(`      ${e instanceof Error ? e.message : String(e)}`)
    if (e instanceof Error && e.stack) {
      console.log('      ' + e.stack.split('\n').slice(1, 4).join('\n      '))
    }
    return
  }
  console.log(`RENDER ${label}  ${html.length.toLocaleString()} chars`)
  for (const needle of expect) {
    const ok = typeof needle === 'string' ? html.includes(needle) : needle.test(html)
    if (!ok) failures++
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${needle}`)
  }
}

async function main() {
  // ── Financial: the Stripe-driven sections, plus the unmapped panel naming
  //    Foundation (the largest unmapped product in the current export).
  __inject({
    stripe_revenue: stripeRows,
    product_category_map: mapRows,
    financial_revenue: [],
    stripe: [],
    plan_targets: [],
  })
  await renderPage('/financial', () => import('@/app/(dashboard)/financial/page'), [
    'The Revenue Ladder',
    'Net (charged)',
    'Recurring vs One-Off',
    'Attach Products',
    'Does It Tie Out?',
    'Unmapped products',
    'Foundation',
  ])

  // ── Support: all five sections, real channel names, real backlog.
  __inject({ zendesk_tickets: ticketRows })
  await renderPage('/support', () => import('@/app/(dashboard)/support/page'), [
    'How Much Is Coming In?',
    'Where Is It Coming From?',
    'How Fast Do We Answer?',
    'WhatsApp',
    'Messaging',
    'Open backlog by age',
  ])

  __inject({ zendesk_tickets: ticketRows })
  await renderPage('/support/report', () => import('@/app/(dashboard)/support/report/page'), [
    'Member Support Operations',
    'Volume',
    'Channel',
    'Response Time',
  ])

  // ── Marketing: deliberately WITHOUT marketing_daily, so the not-instrumented
  //    paths are the ones exercised. Both markers must actually appear —
  //    otherwise a missing metric is silently rendering as a zero somewhere.
  __inject({
    meta_ads: metaRows,
    marketing_daily: dailyRows,
    ghl_opportunities: [],
    social_followers: [],
    social_views: [],
    operational_data: [],
    plan_targets: [],
  })
  await renderPage('/marketing', () => import('@/app/(dashboard)/marketing/page'), [
    'This Week',
    'Cost per Lead',
    'Cost per Call Booked',
    'The Monthly Detail',
    'By campaign',
    ...(dailyRows.length === 0 ? ['not instr.', 'Not instrumented'] : []),
  ])

  // ── Empty-data pass: every page must degrade to its locked state rather than
  //    throwing. This is the state a fresh environment is actually in.
  __inject({})
  await renderPage('/financial (no data)', () => import('@/app/(dashboard)/financial/page'), ['Revenue Ladder'])
  __inject({})
  await renderPage('/support (no data)', () => import('@/app/(dashboard)/support/page'), ['No Zendesk ticket data yet'])
  __inject({})
  await renderPage('/support/report (no data)', () => import('@/app/(dashboard)/support/report/page'), ['Support Report'])
  __inject({})
  await renderPage('/marketing (no data)', () => import('@/app/(dashboard)/marketing/page'), ['This Week'])

  console.log(`\n${failures === 0 ? 'ALL RENDER CHECKS PASSED' : `${failures} RENDER CHECK(S) FAILED`}`)
  process.exit(failures === 0 ? 0 : 1)
}

main()

/**
 * Revenue adapter — turns raw stripe_line_items + product_category_map into the
 * same daily, per-category, net/gross row shape the Financial page already
 * consumes from financial_revenue. This lets the new Snowflake line-item source
 * power the existing visualisations unchanged, while also exposing the new
 * Appointments category and a true recurring / non-recurring split.
 *
 * Money modelling per line (see the Stripe Integrated export):
 *   GROSS_LINE_AMOUNT    = list price (RRP)
 *   DISCOUNT_LINE_AMOUNT = discount applied
 *   CHARGED_LINE_AMOUNT  = gross - discount  (what the customer paid)
 *   ALLOCATED_STRIPE_FEE = processing fee
 *   NET_LINE_AMOUNT      = charged - fee     (what TMRW nets)
 *
 * "gross" rows use GROSS_LINE_AMOUNT. "net" rows use CHARGED_LINE_AMOUNT so the
 * gross-vs-net gap on the Financial page stays "discount leakage" (its current
 * meaning). Stripe fees / true net are kept available below for a future view.
 * Flip NET_COLUMN to 'net_line_amount' if "net" should mean net-of-fees.
 */

export type RevenueCategory =
  | 'subscription'
  | 'joining_fee'
  | 'supplements'
  | 'peptides'
  | 'tmrw_stacks'
  | 'advanced_tests'
  | 'appointments'

/** Maps a revenue category to its financial_revenue-shaped column. */
export const CATEGORY_COLUMN: Record<RevenueCategory, string> = {
  subscription: 'membership',
  joining_fee: 'joining_fees',
  tmrw_stacks: 'tmrw_stacks',
  supplements: 'supplements',
  peptides: 'peptides',
  advanced_tests: 'advanced_tests',
  appointments: 'appointments',
}

/** Categories that represent recurring revenue (per the product mapping). */
export const RECURRING_CATEGORIES: ReadonlySet<RevenueCategory> = new Set<RevenueCategory>([
  'subscription',
  'supplements',
  'peptides',
  'tmrw_stacks',
])

/** Column the "net" rows are built from (see header note). */
const NET_COLUMN = 'charged_line_amount' as const

type Row = Record<string, unknown>

const n = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const x = typeof v === 'number' ? v : Number(v)
  return isNaN(x) ? 0 : x
}

const dateKey = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  // transaction_date is stored as YYYY-MM-DD; take the date portion of anything.
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null
}

export interface DerivedRevenue {
  /** financial_revenue-shaped rows: one per (date, revenue_type). */
  rows: Row[]
  /** Distinct product names present in the line items but absent from the map. */
  unmappedProducts: string[]
}

/**
 * Build financial_revenue-shaped rows from line items. Each date yields a
 * 'gross' row (list price) and a 'net' row (post-discount), each with a column
 * per category plus a derived total. Unmapped products are counted into the
 * total but not into any category column, and surfaced for admin follow-up.
 */
export function deriveRevenueRows(
  lineItems: Row[],
  categoryMap: Row[]
): DerivedRevenue {
  const productToCategory = new Map<string, RevenueCategory>()
  for (const m of categoryMap) {
    const name = String(m.product_name ?? '').trim().toLowerCase()
    const cat = String(m.category ?? '').trim() as RevenueCategory
    if (name && cat) productToCategory.set(name, cat)
  }

  const blank = (): Record<string, number> => ({
    membership: 0, joining_fees: 0, tmrw_stacks: 0,
    supplements: 0, peptides: 0, advanced_tests: 0, appointments: 0,
  })
  const net = new Map<string, Record<string, number>>()
  const gross = new Map<string, Record<string, number>>()
  const netTotal = new Map<string, number>()
  const grossTotal = new Map<string, number>()
  const unmapped = new Set<string>()

  for (const li of lineItems) {
    const date = dateKey(li.transaction_date)
    if (!date) continue
    const product = String(li.product_name ?? '').trim()
    const category = productToCategory.get(product.toLowerCase())
    const grossAmt = n(li.gross_line_amount)
    const netAmt = n(li[NET_COLUMN])

    if (!gross.has(date)) { gross.set(date, blank()); grossTotal.set(date, 0) }
    if (!net.has(date)) { net.set(date, blank()); netTotal.set(date, 0) }
    grossTotal.set(date, grossTotal.get(date)! + grossAmt)
    netTotal.set(date, netTotal.get(date)! + netAmt)

    if (!category) {
      if (product) unmapped.add(product)
      continue
    }
    const col = CATEGORY_COLUMN[category]
    gross.get(date)![col] += grossAmt
    net.get(date)![col] += netAmt
  }

  const rows: Row[] = []
  Array.from(gross.entries()).forEach(([date, cols]) => {
    rows.push({ date, revenue_type: 'gross', ...cols, total: grossTotal.get(date) ?? 0 })
  })
  Array.from(net.entries()).forEach(([date, cols]) => {
    rows.push({ date, revenue_type: 'net', ...cols, total: netTotal.get(date) ?? 0 })
  })

  return { rows, unmappedProducts: Array.from(unmapped).sort() }
}

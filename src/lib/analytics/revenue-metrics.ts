import { sydneyMonthKey, type DateRange } from '@/lib/utils/period'

/**
 * Revenue analytics over `stripe_revenue_lines`, categorised by
 * `product_category_map`.
 *
 * The category join happens here rather than at upload time so that re-uploading
 * the workbook's Mapping tab re-categorises all history immediately, and so that
 * products which have fallen out of the map surface as Unmapped instead of being
 * frozen into whatever the map said on the day they were ingested.
 *
 * The ladder, mirroring the CH Summary workbook:
 *
 *   gross      list price before discounts (RRP)
 *   discount   coupons / comped value
 *   charged    gross - discount  ← what the workbook calls "Net", and what the
 *                                  dashboard's Net tile shows
 *   fee        allocated Stripe processing fee
 *   net        charged - fee (the export's NET_LINE_AMOUNT)
 *   exGstNet   charged / 1.1, matching the workbook's "Tax = Net / 11" convention
 */

type Row = Record<string, unknown>

export const UNMAPPED_CATEGORY = 'Unmapped'

export type RevenueClass = 'recurring' | 'one_off'

/** The seven categories from the workbook's Mapping tab, in report order. */
export const CATEGORY_ORDER = [
  'Subscription Revenue',
  'Joining Fee Revenue',
  'Attach products - TMRW product stacks',
  'Attach products - Peptides',
  'Attach products - Advanced tests',
  'Attach products - Off-the-shelf supplements',
  'Attach products - Appointments',
] as const

/** Attach-product categories only — the "breakdown of attach products" view. */
export const ATTACH_CATEGORIES = CATEGORY_ORDER.filter(c => c.startsWith('Attach products'))

/** Short labels for charts, where the full category name is far too long. */
export const CATEGORY_LABELS: Record<string, string> = {
  'Subscription Revenue': 'Subscription',
  'Joining Fee Revenue': 'Joining fee',
  'Attach products - TMRW product stacks': 'TMRW stacks',
  'Attach products - Peptides': 'Peptides',
  'Attach products - Advanced tests': 'Advanced tests',
  'Attach products - Off-the-shelf supplements': 'Supplements',
  'Attach products - Appointments': 'Appointments',
  [UNMAPPED_CATEGORY]: 'Unmapped',
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

/* ─── Category lookup ─────────────────────────────────────────────────── */

interface MapEntry {
  category: string
  revenueClass: RevenueClass
}

export interface CategoryLookup {
  byId: Map<string, MapEntry>
  byName: Map<string, MapEntry>
  /** True when no map has been uploaded yet — lets callers prompt rather than show everything as Unmapped. */
  isEmpty: boolean
}

export function buildCategoryLookup(mapRows: Row[]): CategoryLookup {
  const byId = new Map<string, MapEntry>()
  const byName = new Map<string, MapEntry>()

  for (const r of mapRows) {
    const category = str(r.category)
    if (!category) continue
    const entry: MapEntry = {
      category,
      revenueClass: r.revenue_class === 'one_off' ? 'one_off' : 'recurring',
    }
    const id = str(r.product_id)
    if (id) byId.set(id, entry)
    const nameKey = str(r.product_name_key) || str(r.product_name).toLowerCase()
    if (nameKey) byName.set(nameKey, entry)
  }

  return { byId, byName, isEmpty: byId.size === 0 && byName.size === 0 }
}

/**
 * Resolve a line's category. PRODUCT_ID wins when the export carries it — that
 * is the exact join the workbook uses. Otherwise fall back to the lower/trimmed
 * product name, which is all the 8-column export offers.
 */
export function categorise(line: Row, lookup: CategoryLookup): MapEntry {
  const id = str(line.product_id)
  if (id) {
    const byId = lookup.byId.get(id)
    if (byId) return byId
  }
  const name = str(line.product_name).toLowerCase()
  if (name) {
    const byName = lookup.byName.get(name)
    if (byName) return byName
  }
  return { category: UNMAPPED_CATEGORY, revenueClass: 'recurring' }
}

/* ─── The ladder ──────────────────────────────────────────────────────── */

export interface RevenueLadder {
  gross: number
  discount: number
  charged: number
  fee: number
  net: number
  exGstNet: number
  gst: number
  /** charged / gross — how much of list price was actually collected. */
  captureRate: number | null
  lineCount: number
  refundCount: number
  refundValue: number
}

export function emptyLadder(): RevenueLadder {
  return {
    gross: 0, discount: 0, charged: 0, fee: 0, net: 0,
    exGstNet: 0, gst: 0, captureRate: null,
    lineCount: 0, refundCount: 0, refundValue: 0,
  }
}

export function ladderFor(lines: Row[]): RevenueLadder {
  const l = emptyLadder()
  for (const r of lines) {
    l.gross += n(r.gross_amount)
    l.discount += n(r.discount_amount)
    l.charged += n(r.charged_amount)
    l.fee += n(r.stripe_fee)
    l.net += n(r.net_after_fee)
    l.lineCount += 1
    if (r.is_refund === true) {
      l.refundCount += 1
      l.refundValue += n(r.gross_amount)
    }
  }
  // GST on the collected amount, per the workbook's Net / 11.
  l.gst = l.charged / 11
  l.exGstNet = l.charged - l.gst
  l.captureRate = l.gross !== 0 ? l.charged / l.gross : null
  return l
}

/* ─── Filtering ───────────────────────────────────────────────────────── */

/**
 * Lines whose transaction_date falls in the range. transaction_date is a plain
 * date (no time), so this compares day strings and never shifts a line into the
 * wrong day via timezone conversion.
 */
export function linesInRange(lines: Row[], range: DateRange): Row[] {
  const from = dayKey(range.start)
  const to = dayKey(range.end)
  return lines.filter(r => {
    const d = str(r.transaction_date).slice(0, 10)
    return d !== '' && d >= from && d <= to
  })
}

/* ─── Rollups ─────────────────────────────────────────────────────────── */

export interface CategoryRollup {
  category: string
  label: string
  revenueClass: RevenueClass
  ladder: RevenueLadder
  /** Share of the period's total gross. */
  shareOfGross: number | null
}

export function rollupByCategory(lines: Row[], lookup: CategoryLookup): CategoryRollup[] {
  const groups = new Map<string, { entry: MapEntry; rows: Row[] }>()
  for (const r of lines) {
    const entry = categorise(r, lookup)
    const g = groups.get(entry.category)
    if (g) g.rows.push(r)
    else groups.set(entry.category, { entry, rows: [r] })
  }

  const totalGross = lines.reduce((s, r) => s + n(r.gross_amount), 0)

  const out: CategoryRollup[] = []
  for (const [category, g] of groups) {
    const ladder = ladderFor(g.rows)
    out.push({
      category,
      label: categoryLabel(category),
      revenueClass: g.entry.revenueClass,
      ladder,
      shareOfGross: totalGross !== 0 ? ladder.gross / totalGross : null,
    })
  }

  // Report order first, then anything unrecognised, then Unmapped last so it
  // reads as the residual it is.
  const rank = (c: string) => {
    if (c === UNMAPPED_CATEGORY) return 999
    const i = (CATEGORY_ORDER as readonly string[]).indexOf(c)
    return i === -1 ? 500 : i
  }
  return out.sort((a, b) => rank(a.category) - rank(b.category))
}

export interface MonthRollup {
  /** 'YYYY-MM' */
  month: string
  /** 'Jul 26' */
  label: string
  ladder: RevenueLadder
  recurring: number
  oneOff: number
  unmapped: number
  /**
   * recurring as a share of TOTAL gross. Uncategorised revenue stays in the
   * denominator, so recurring + oneOff + unmapped always sums to 100% and the
   * figure can never be flattered by a product falling out of the map.
   */
  recurringPct: number | null
  /**
   * recurring as a share of *classified* gross only. Reads higher whenever
   * anything is unmapped — shown as a secondary so the gap is visible rather
   * than being the headline.
   */
  recurringPctOfClassified: number | null
  /** Gross per category, keyed by full category name. */
  byCategory: Record<string, number>
}

export function rollupByMonth(lines: Row[], lookup: CategoryLookup): MonthRollup[] {
  const groups = new Map<string, Row[]>()
  for (const r of lines) {
    // transaction_date is date-only; slicing avoids a timezone shift that would
    // move the 1st of a month into the previous one.
    const month = str(r.transaction_date).slice(0, 7) || sydneyMonthKey(String(r.transaction_date))
    if (!month) continue
    const g = groups.get(month)
    if (g) g.push(r)
    else groups.set(month, [r])
  }

  const out: MonthRollup[] = []
  for (const [month, rows] of groups) {
    let recurring = 0
    let oneOff = 0
    let unmapped = 0
    const byCategory: Record<string, number> = {}
    for (const r of rows) {
      const entry = categorise(r, lookup)
      const gross = n(r.gross_amount)
      byCategory[entry.category] = (byCategory[entry.category] ?? 0) + gross
      if (entry.category === UNMAPPED_CATEGORY) unmapped += gross
      else if (entry.revenueClass === 'recurring') recurring += gross
      else oneOff += gross
    }
    const classified = recurring + oneOff
    const total = classified + unmapped
    out.push({
      month,
      label: monthLabel(month),
      ladder: ladderFor(rows),
      recurring,
      oneOff,
      unmapped,
      recurringPct: total !== 0 ? (recurring / total) * 100 : null,
      recurringPctOfClassified: classified !== 0 ? (recurring / classified) * 100 : null,
      byCategory,
    })
  }

  return out.sort((a, b) => a.month.localeCompare(b.month))
}

export interface UnmappedProduct {
  productName: string
  productId: string | null
  lineCount: number
  gross: number
  shareOfGross: number | null
}

/**
 * Products with no category. Surfaced on the page rather than folded into a
 * total: the workbook's own README calls this the trap that hid $18k, and on the
 * current export it is 19 names worth about 2% of gross.
 */
export function unmappedProducts(lines: Row[], lookup: CategoryLookup): UnmappedProduct[] {
  const totalGross = lines.reduce((s, r) => s + n(r.gross_amount), 0)
  const groups = new Map<string, UnmappedProduct>()

  for (const r of lines) {
    if (categorise(r, lookup).category !== UNMAPPED_CATEGORY) continue
    const name = str(r.product_name) || '(no product name)'
    const existing = groups.get(name)
    if (existing) {
      existing.lineCount += 1
      existing.gross += n(r.gross_amount)
    } else {
      groups.set(name, {
        productName: name,
        productId: str(r.product_id) || null,
        lineCount: 1,
        gross: n(r.gross_amount),
        shareOfGross: null,
      })
    }
  }

  const out = [...groups.values()]
  for (const p of out) {
    p.shareOfGross = totalGross !== 0 ? p.gross / totalGross : null
  }
  return out.sort((a, b) => b.gross - a.gross)
}

/* ─── Reconciliation against the manual workbook ──────────────────────── */

export interface ReconciliationRow {
  month: string
  label: string
  /** Gross from stripe_revenue_lines. */
  stripeGross: number
  /** Gross from the manually-uploaded financial_revenue 'gross' rows. */
  manualGross: number
  grossVariance: number
  /** charged (the workbook's "Net") from stripe_revenue_lines. */
  stripeNet: number
  /** Total from the manually-uploaded financial_revenue 'net' rows. */
  manualNet: number
  netVariance: number
  reconciled: boolean
}

/**
 * Month-by-month comparison of the Stripe line-item feed against the
 * hand-maintained Net/Gross workbook. Mirrors the workbook's own Reconciliation
 * tab: a variance rounding to zero is RECONCILED, anything else needs a look.
 */
export function reconcileAgainstManual(
  monthly: MonthRollup[],
  financialRevenue: Row[],
): ReconciliationRow[] {
  const manualNet = new Map<string, number>()
  const manualGross = new Map<string, number>()

  for (const r of financialRevenue) {
    const month = str(r.date).slice(0, 7)
    if (!month) continue
    const target = r.revenue_type === 'gross' ? manualGross : manualNet
    target.set(month, (target.get(month) ?? 0) + n(r.total))
  }

  const months = new Set<string>([
    ...monthly.map(m => m.month),
    ...manualNet.keys(),
    ...manualGross.keys(),
  ])

  const byMonth = new Map(monthly.map(m => [m.month, m]))

  return [...months].sort().map(month => {
    const roll = byMonth.get(month)
    const stripeGross = roll?.ladder.gross ?? 0
    const stripeNet = roll?.ladder.charged ?? 0
    const mGross = manualGross.get(month) ?? 0
    const mNet = manualNet.get(month) ?? 0
    const grossVariance = stripeGross - mGross
    const netVariance = stripeNet - mNet
    return {
      month,
      label: monthLabel(month),
      stripeGross,
      manualGross: mGross,
      grossVariance,
      stripeNet,
      manualNet: mNet,
      netVariance,
      // Only claim reconciled when both sides actually have data; a month the
      // workbook never covered is not a match, it's a gap.
      reconciled:
        mGross !== 0 && mNet !== 0
        && Math.round(grossVariance * 100) === 0
        && Math.round(netVariance * 100) === 0,
    }
  })
}

/* ─── Small helpers ───────────────────────────────────────────────────── */

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  const idx = parseInt(m, 10) - 1
  if (!y || isNaN(idx) || idx < 0 || idx > 11) return month
  return `${MONTH_ABBR[idx]} ${y.slice(2)}`
}

function n(v: unknown): number {
  if (v === null || v === undefined) return 0
  const x = typeof v === 'number' ? v : Number(v)
  return isFinite(x) ? x : 0
}

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

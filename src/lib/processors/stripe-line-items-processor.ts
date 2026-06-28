import { num, txt, type ProcessorResult } from './_canonical-helpers'
import { parseAusDate } from './_date-helpers'

/**
 * Stripe invoice line-items processor. Reads the Snowflake "Stripe Integrated"
 * export — one row per invoice line — into canonical stripe_line_items rows.
 *
 * Each line carries both GROSS (RRP) and NET amounts, so the gross/net split,
 * the product-category breakdown (via product_category_map), and the
 * recurring/non-recurring split are all derived downstream from these rows —
 * no per-sheet revenue_type as the old financial_revenue upload needed.
 *
 * Amounts are in dollars. Dates are Australian (DD/M/YYYY) from the CSV export,
 * or Excel serials if the file is re-saved as .xlsx — both are handled.
 */

/** Excel date serial (days since 1899-12-30) → "YYYY-MM-DD". */
function fromExcelSerial(serial: number): string | null {
  if (!isFinite(serial) || serial < 20_000 || serial > 80_000) return null
  const d = new Date(Math.floor(serial - 25_569) * 86_400_000)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/** Parse the transaction date cell into "YYYY-MM-DD" (null = skip the row). */
function parseTransactionDate(v: unknown): string | null {
  if (v === null || v === undefined) return null
  // xlsx may deliver date cells as numeric Excel serials.
  if (typeof v === 'number') return fromExcelSerial(v)
  const s = String(v).trim()
  if (s === '') return null
  // Plain-number string → Excel serial. Must run before parseAusDate so
  // "45992" isn't misread as a year by the native Date fallback.
  if (/^\d+(\.\d+)?$/.test(s)) return fromExcelSerial(Number(s))
  // DD/M/YYYY (Australian) or ISO, via the shared parser.
  return parseAusDate(s)
}

export function processStripeLineItemsToCanonical(
  data: Record<string, unknown>[]
): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    const transactionDate = parseTransactionDate(lc['transaction_date'])
    const productName = txt(lc['product_name'])

    if (!transactionDate) {
      errors.push({ rowIndex: i, reason: 'Missing or unparseable TRANSACTION_DATE' })
      return
    }
    if (!productName) {
      errors.push({ rowIndex: i, reason: 'Missing PRODUCT_NAME' })
      return
    }

    validRows.push({
      transaction_date: transactionDate,
      product_name: productName,
      gross_line_amount: num(lc['gross_line_amount']),
      discount_line_amount: num(lc['discount_line_amount']),
      charged_line_amount: num(lc['charged_line_amount']),
      allocated_stripe_fee: num(lc['allocated_stripe_fee']),
      net_line_amount: num(lc['net_line_amount']),
      coupon_name: txt(lc['coupon_name']),
    })
  })

  return { validRows, errors }
}

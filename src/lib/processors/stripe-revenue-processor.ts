import { num, txt, bool, type ProcessorResult } from './_canonical-helpers'
import { parseSpreadsheetDate } from './_date-helpers'

/**
 * Stripe revenue line-item processor.
 *
 * Accepts either shape of the warehouse export:
 *
 *   - the 8-column "integrated" CSV — TRANSACTION_DATE, PRODUCT_NAME,
 *     GROSS_LINE_AMOUNT, DISCOUNT_LINE_AMOUNT, CHARGED_LINE_AMOUNT,
 *     ALLOCATED_STRIPE_FEE, NET_LINE_AMOUNT, COUPON_NAME
 *   - the 57-column "Line Items" export, which additionally carries PRODUCT_ID,
 *     refund/subscription flags, member email and subscription status
 *
 * The revenue ladder stored per line, mirroring the CH Summary workbook:
 *
 *   gross_amount      list price before discounts (the workbook's "RRP" gross)
 *   discount_amount   coupons / comped value
 *   charged_amount    gross - discount. This is what the workbook calls "Net"
 *                     and what the dashboard's Net tile shows.
 *   stripe_fee        allocated Stripe processing fee
 *   net_after_fee     charged - fee (the export's own NET_LINE_AMOUNT)
 *
 * Deliberately NOT resolved here: the product's category and recurring/one-off
 * class. Those come from product_category_map and are joined at read time, so
 * re-uploading the Mapping tab re-categorises all history with no backfill and
 * newly-unmapped products surface immediately rather than being frozen into
 * whatever the map said on upload day.
 */

/** Header aliases per canonical field, in preference order. */
function pick(lc: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = lc[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return null
}

export function processStripeRevenueToCanonical(
  data: Record<string, unknown>[]
): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    const transactionDate = parseSpreadsheetDate(pick(lc, ['transaction_date', 'transaction date']))
    if (!transactionDate) {
      // A blank date is a spacer / grand-total row (the workbook keeps a manual
      // total in the row below the data) — skip it silently. A present but
      // unparseable date is a real problem and gets reported.
      const raw = pick(lc, ['transaction_date', 'transaction date'])
      if (raw !== null) {
        errors.push({ rowIndex: i, reason: `unparseable TRANSACTION_DATE: ${String(raw)}` })
      }
      return
    }

    const productName = txt(pick(lc, ['product_name', 'product name']))
    if (!productName) {
      errors.push({ rowIndex: i, reason: 'missing PRODUCT_NAME' })
      return
    }

    const gross = num(pick(lc, ['gross_line_amount', 'gross line amount'])) ?? 0
    const discount = num(pick(lc, ['discount_line_amount', 'discount line amount'])) ?? 0
    const fee = num(pick(lc, ['allocated_stripe_fee', 'allocated stripe fee'])) ?? 0

    // Derive the middle rungs when the export omits them, so both shapes produce
    // a complete ladder.
    const chargedRaw = num(pick(lc, ['charged_line_amount', 'charged line amount']))
    const charged = chargedRaw ?? gross - discount
    const netRaw = num(pick(lc, ['net_line_amount', 'net line amount']))
    const netAfterFee = netRaw ?? charged - fee

    validRows.push({
      transaction_date: transactionDate,
      product_id: txt(pick(lc, ['product_id', 'product id'])),
      product_name: productName,
      gross_amount: gross,
      discount_amount: discount,
      charged_amount: charged,
      stripe_fee: fee,
      net_after_fee: netAfterFee,
      coupon_name: txt(pick(lc, ['coupon_name', 'coupon name'])),
      // Line Items export only — null on the 8-column CSV.
      line_id: txt(pick(lc, ['revenue_product_line_id', 'revenue product line id'])),
      transaction_id: txt(pick(lc, ['transaction_id', 'transaction id'])),
      record_type: txt(pick(lc, ['record_type', 'record type'])),
      is_refund: refundFlag(lc),
      is_subscription_charge: bool(pick(lc, ['is_subscription_charge', 'is subscription charge'])),
      billing_reason: txt(pick(lc, ['billing_reason', 'billing reason'])),
      quantity: num(pick(lc, ['quantity'])),
      currency: txt(pick(lc, ['currency'])),
      member_email: txt(pick(lc, ['member_email', 'member email'])),
      subscription_id: txt(pick(lc, ['subscription_id', 'subscription id'])),
      subscription_status: txt(pick(lc, ['subscription_status', 'subscription status'])),
    })
  })

  return { validRows, errors }
}

/**
 * Refunds carry a negative gross and, on the Line Items export, RECORD_TYPE
 * 'refund'. The 8-column CSV has neither flag, so fall back to the sign — the
 * workbook README is explicit that negative gross with a blank invoice status is
 * a correct, settled refund that should net revenue down.
 */
function refundFlag(lc: Record<string, unknown>): boolean {
  const explicit = bool(lc['is_refund'] ?? lc['is refund'])
  if (explicit !== null) return explicit
  const recordType = txt(lc['record_type'] ?? lc['record type'])
  if (recordType && recordType.toLowerCase() === 'refund') return true
  return (num(lc['gross_line_amount'] ?? lc['gross line amount']) ?? 0) < 0
}

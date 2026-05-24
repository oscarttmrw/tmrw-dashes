import { num, txt, type ProcessorResult } from './_canonical-helpers'

function parseStripeTimestamp(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s || s === '-' || s.toLowerCase() === 'n/a') return null
  // Stripe Invoice exports ship CREATED / EFFECTIVE_AT / PERIOD_START etc. as
  // either ISO-8601 strings or Unix epoch seconds. Try both.
  const numeric = Number(s)
  if (isFinite(numeric) && numeric > 1_000_000_000 && numeric < 1_000_000_000_000) {
    // Looks like seconds since epoch.
    return new Date(numeric * 1000).toISOString()
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * Stripe Invoices processor. Reads the Stripe Invoice CSV export and maps to
 * the new stripe_data schema (stripe_invoice_id keyed). Upsert-by-id upload
 * mode means re-uploading the same export is idempotent.
 */
export function processStripeCSV(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    const invoiceId = txt(lc['id'])
    if (!invoiceId) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing invoice id (column 'ID')` })
      return
    }

    const created = parseStripeTimestamp(lc['created'])
    if (!created) {
      const raw = lc['created'] ?? ''
      errors.push({ rowIndex: i, reason: `Row ${i}: CREATED '${String(raw)}' could not be parsed.` })
      return
    }

    validRows.push({
      stripe_invoice_id: invoiceId,
      created,
      effective_at: parseStripeTimestamp(lc['effective_at']),
      period_start: parseStripeTimestamp(lc['period_start']),
      period_end: parseStripeTimestamp(lc['period_end']),
      product: txt(lc['product']),
      amount_due: num(lc['amount_due']),
      amount_paid: num(lc['amount_paid']),
      amount_remaining: num(lc['amount_remaining']),
      total: num(lc['total']),
      total_excluding_tax: num(lc['total_excluding_tax']),
      subtotal: num(lc['subtotal']),
      subtotal_excluding_tax: num(lc['subtotal_excluding_tax']),
      subscription_id: txt(lc['subscription_id']),
      billing_reason: txt(lc['billing_reason']),
      receipt_number: txt(lc['receipt_number']),
    })
  })

  return { validRows, errors }
}

export { processStripeCSV as processStripeToCanonical }

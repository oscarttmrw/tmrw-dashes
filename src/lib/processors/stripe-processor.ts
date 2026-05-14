import { num, txt, bool, type ProcessorResult } from './_canonical-helpers'
import { parseAusDateTime } from './_date-helpers'

function normalizeStripeStatus(raw: unknown): string | null {
  const s = String(raw ?? '').trim().toLowerCase()
  if (!s) return null
  if (s === 'paid' || s === 'succeeded') return 'succeeded'
  if (s === 'refunded') return 'refunded'
  if (s === 'failed') return 'failed'
  if (s === 'disputed') return 'disputed'
  if (s === 'pending') return 'pending'
  return s
}

function upperTxt(v: unknown): string | null {
  const t = txt(v)
  return t === null ? null : t.toUpperCase()
}

/**
 * Canonical Stripe processor. Reads case-insensitively, parses Stripe's
 * "Created date (UTC)" / "Refunded date (UTC)" Australian datetime format,
 * stores Amount in major units (dollars) — Stripe's CSV exports `Amount`
 * already in major units (not cents). Currency is upper-cased; Captured is
 * parsed as a real boolean.
 */
export function processStripeCSV(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )
    const chargeId = txt(lc['id'])
    if (!chargeId) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing charge id (column 'id')` })
      return
    }
    const createdAt = parseAusDateTime(lc['created date (utc)'])
    if (!createdAt) {
      const raw = lc['created date (utc)'] ?? ''
      errors.push({ rowIndex: i, reason: `Row ${i}: created date '${String(raw)}' could not be parsed.` })
      return
    }
    validRows.push({
      stripe_charge_id: chargeId,
      created_at: createdAt,
      amount: num(lc['amount']),
      amount_refunded: num(lc['amount refunded'] ?? lc['amount_refunded']),
      currency: upperTxt(lc['currency']),
      captured: bool(lc['captured']),
      converted_amount: num(lc['converted amount'] ?? lc['converted_amount']),
      converted_currency: upperTxt(lc['converted currency'] ?? lc['converted_currency']),
      decline_reason: txt(lc['decline reason'] ?? lc['failure_message'] ?? lc['decline_reason']),
      fee: num(lc['fee']),
      refunded_date: parseAusDateTime(lc['refunded date (utc)'] ?? lc['refunded_date']),
      status: normalizeStripeStatus(lc['status']),
      invoice_id: txt(lc['invoice id'] ?? lc['invoice_id']),
    })
  })

  return { validRows, errors }
}

export { processStripeCSV as processStripeToCanonical }

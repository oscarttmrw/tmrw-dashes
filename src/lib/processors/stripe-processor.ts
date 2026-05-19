import { num, txt, bool, type ProcessorResult } from './_canonical-helpers'

function parseISODateTime(v: unknown): string | null {
  if (!v) return null
  const s = String(v).trim()
  if (s === '') return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function upperTxt(v: unknown): string | null {
  const t = txt(v)
  return t === null ? null : t.toUpperCase()
}

function parseJsonb(v: unknown): unknown {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'object') return v
  const s = String(v).trim()
  if (s === '') return null
  try {
    return JSON.parse(s)
  } catch {
    // If it isn't valid JSON, store as null rather than corrupt jsonb.
    return null
  }
}

/**
 * Stripe processor (Fivetran-export shape). Verbatim mirror — column headers
 * map 1:1 to Supabase columns. NOTE: AMOUNT is in cents (Fivetran/API
 * representation, e.g. 8950 = $89.50). Downstream metric code must divide by 100.
 *
 * No charge ID column — dedup relies on the date-range-replace strategy
 * configured in the upload route, keyed on `created`.
 */
export function processStripeFivetran(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    const created = parseISODateTime(lc['created'])
    if (!created) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing or invalid CREATED` })
      return
    }

    const amount = num(lc['amount'])
    if (amount === null) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing AMOUNT` })
      return
    }

    validRows.push({
      amount,
      amount_refunded: num(lc['amount_refunded']),
      application: txt(lc['application']),
      application_fee_amount: num(lc['application_fee_amount']),
      calculated_statement_descriptor: txt(lc['calculated_statement_descriptor']),
      captured: bool(lc['captured']),
      created,
      currency: upperTxt(lc['currency']),
      description: txt(lc['description']),
      failure_code: txt(lc['failure_code']),
      fraud_details_user_report: txt(lc['fraud_details_user_report']),
      fraud_details_stripe_report: txt(lc['fraud_details_stripe_report']),
      livemode: bool(lc['livemode']),
      metadata: parseJsonb(lc['metadata']),
      outcome_network_status: txt(lc['outcome_network_status']),
      outcome_risk_level: txt(lc['outcome_risk_level']),
      outcome_seller_message: txt(lc['outcome_seller_message']),
      outcome_type: txt(lc['outcome_type']),
      paid: bool(lc['paid']),
      refunded: bool(lc['refunded']),
      status: txt(lc['status']),
      invoice_id: txt(lc['invoice_id']),
      fivetran_synced: parseISODateTime(lc['_fivetran_synced']),
      outcome_network_decline_code: txt(lc['outcome_network_decline_code']),
      failure_balance_transaction_id: txt(lc['failure_balance_transaction_id']),
      amount_captured: num(lc['amount_captured']),
    })
  })

  return { validRows, errors }
}

export { processStripeFivetran as processStripeToCanonical }

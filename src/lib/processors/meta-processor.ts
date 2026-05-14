import { num, int, txt, type ProcessorResult } from './_canonical-helpers'
import { parseAusDate } from './_date-helpers'

// Re-exported for callers that imported it from this module before the helper
// was extracted.
export { parseAusDate }

/**
 * Canonical Meta processor. Reads case-insensitively, tolerates whitespace,
 * empty fields, the literal "Ongoing" in Ends-style columns, and Meta's
 * Australian date format.
 */
export function processMetaCSV(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    const dayRaw = lc['day']
    const dayRawStr = dayRaw === null || dayRaw === undefined ? '' : String(dayRaw).trim()
    if (dayRawStr === '') {
      errors.push({
        rowIndex: i,
        reason: `Row ${i}: Day field empty. Re-export with 'Breakdown by Day' enabled in Meta Ads Manager.`,
      })
      return
    }
    const day = parseAusDate(dayRawStr)
    if (!day) {
      errors.push({
        rowIndex: i,
        reason: `Row ${i}: Day '${dayRawStr}' could not be parsed as a date.`,
      })
      return
    }

    const adSet = txt(lc['ad set name'])
    if (!adSet) {
      errors.push({ rowIndex: i, reason: `Row ${i}: Ad Set Name required` })
      return
    }

    const spend = num(
      lc['amount spent (aud)']
      ?? lc['amount spent']
      ?? lc['amount_spent_(aud)']
      ?? lc['amount_spent']
    )

    validRows.push({
      date: day,
      ad_set_name: adSet,
      spend_aud: spend,
      impressions: int(lc['impressions']),
      clicks: int(lc['clicks (all)'] ?? lc['clicks_(all)'] ?? lc['clicks']),
      ctr: num(lc['ctr (all)'] ?? lc['ctr_(all)'] ?? lc['ctr']),
      reach: int(lc['reach']),
      frequency: num(lc['frequency']),
      result_type: txt(lc['result type']),
      results: int(lc['results']),
      cost_per_result: num(lc['cost per result (aud)'] ?? lc['cost per result']),
      landing_page_views: int(lc['landing page views']),
      cost_per_landing_page_view: num(
        lc['cost per landing page view (aud)']
        ?? lc['cost per landing page view']
      ),
      delivery_status: txt(lc['delivery status']),
    })
  })

  return { validRows, errors }
}

export { processMetaCSV as processMetaToCanonical }

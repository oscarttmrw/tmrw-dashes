import { num, int, txt, type ProcessorResult } from './_canonical-helpers'

/**
 * Parse Meta-style Australian dates. Meta exports `Day`, `Starts`, `Ends`,
 * `Reporting Starts`, `Reporting Ends` in DD/M/YYYY or DD/MM/YYYY. The native
 * Date constructor parses these inconsistently (US MM/DD/YYYY assumed by V8),
 * so we parse the parts ourselves. Returns an ISO date (YYYY-MM-DD) or null
 * for empty / unparseable / sentinel values like "Ongoing".
 */
export function parseAusDate(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'ongoing') {
    return null
  }
  // DD/M/YYYY or DD/MM/YYYY, optional time suffix.
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T].*)?$/)
  if (m) {
    const day = parseInt(m[1], 10)
    const month = parseInt(m[2], 10)
    const year = parseInt(m[3], 10)
    if (
      year >= 1970 && year < 2100
      && month >= 1 && month <= 12
      && day >= 1 && day <= 31
    ) {
      const mm = String(month).padStart(2, '0')
      const dd = String(day).padStart(2, '0')
      return `${year}-${mm}-${dd}`
    }
    return null
  }
  // ISO date or anything Date can parse (YYYY-MM-DD, ISO timestamps).
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

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

    // Day is the canonical `date` column (NOT NULL in Supabase). Reject the
    // row only if Day is missing OR un-parseable — and say which.
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

    // Spend column has three observed export variants. All compare case-
    // insensitively but the lc keys preserve the original casing's lowercase.
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

// Backwards-compatible alias for the API route imported during PR 1.
// Legacy `processMetaCSV(MetaAdRow[])` was removed in this hotfix — its only
// caller (the upload page's client-side processor path) was removed in PR 2.2.
export { processMetaCSV as processMetaToCanonical }

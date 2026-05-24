import { txt, num, type ProcessorResult } from './_canonical-helpers'

function parseDaysCount(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s) return null
  // strip " Days" / " days" / "Day" suffix
  const stripped = s.replace(/\s*days?\s*$/i, '').trim()
  const n = parseInt(stripped, 10)
  return isNaN(n) ? null : n
}

function normalizeSource(v: unknown): string | null {
  const t = txt(v)
  if (!t) return null
  // "Facebook" and "Facebook Ads" both map to "meta" for consistent attribution
  if (/^facebook/i.test(t)) return 'meta'
  return t.toLowerCase()
}

function normalizeStatus(v: unknown): string | null {
  const t = txt(v)
  if (!t) return null
  return t.toLowerCase()
}

function parseIsoTs(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s || s === '-' || s.toLowerCase() === 'n/a') return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * GoHighLevel (GHL) Opportunities processor. Reads the standard Opportunity
 * export and dedups by Opportunity ID. Source field is normalized: any value
 * starting with "Facebook" collapses to "meta" so attribution lines up.
 */
export function processGhlOpportunitiesCSV(
  data: Record<string, unknown>[]
): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    const opportunityId = txt(lc['opportunity id'])
    if (!opportunityId) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Opportunity ID` })
      return
    }

    validRows.push({
      opportunity_id: opportunityId,
      contact_id: txt(lc['contact id']),
      pipeline: txt(lc['pipeline']),
      pipeline_id: txt(lc['pipeline id']),
      stage: txt(lc['stage']),
      pipeline_stage_id: txt(lc['pipeline stage id']),
      status: normalizeStatus(lc['status']),
      source: normalizeSource(lc['source']),
      lead_value: num(lc['lead value']),
      assigned: txt(lc['assigned']),
      created_on: parseIsoTs(lc['created on']),
      updated_on: parseIsoTs(lc['updated on']),
      lost_reason_id: txt(lc['lost reason id']),
      lost_reason_name: txt(lc['lost reason name']),
      days_since_last_stage_change: parseDaysCount(lc['days since last stage change']),
      days_since_last_status_change: parseDaysCount(lc['days since last status change']),
      days_since_last_update: parseDaysCount(lc['days since last update']),
    })
  })

  return { validRows, errors }
}

export { processGhlOpportunitiesCSV as processGhlToCanonical }

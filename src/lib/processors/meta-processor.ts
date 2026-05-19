import { num, type ProcessorResult } from './_canonical-helpers'

function parseIntFlexible(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const s = String(v).replace(/,/g, '').trim()
  if (s === '') return null
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

function parseDateOnly(v: unknown): string | null {
  if (!v) return null
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/**
 * Meta Ads processor. Daily aggregate paid Meta performance.
 * Verbatim mirror — TMRW_MARKETING_DATA "Meta Ads" sheet → meta_ads table.
 * Numeric strings with comma separators are handled (e.g. "3,662" → 3662).
 */
export function processMetaAds(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    const date = parseDateOnly(lc['date'])
    if (!date) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing or invalid Date` })
      return
    }

    const spend = num(lc['spend ($)'] ?? lc['spend'])
    if (spend === null) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Spend` })
      return
    }

    validRows.push({
      date,
      spend,
      impressions: parseIntFlexible(lc['impressions']),
      ctr: num(lc['ctr (%)'] ?? lc['ctr']),
      clicks: parseIntFlexible(lc['clicks']),
      landing_page_views: parseIntFlexible(lc['landing page views']),
      cost_per_lpv: num(lc['cost per lpv ($)'] ?? lc['cost per lpv']),
      conversions_leads: parseIntFlexible(lc['conversions (leads)'] ?? lc['conversions']),
      cost_per_conversion: num(lc['cost per conversion ($)'] ?? lc['cost per conversion']),
      video_views: parseIntFlexible(lc['video views']),
      post_engagements: parseIntFlexible(lc['post engagements']),
    })
  })

  return { validRows, errors }
}

// Alias kept for compatibility with the SOURCE_PROCESSOR map naming convention.
export { processMetaAds as processMetaAdsToCanonical }

import { num, txt, type ProcessorResult } from './_canonical-helpers'
import { parseAusDate } from './_date-helpers'

function parseIntFlexible(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const s = String(v).replace(/,/g, '').trim()
  if (s === '') return null
  // The warehouse extract emits counts as decimals ("4.000000"), so parseInt
  // alone would be fine, but rounding keeps fractional attribution honest.
  const n = Number(s)
  return isNaN(n) ? null : Math.round(n)
}

/** Header aliases per canonical field, in preference order. */
function pick(lc: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = lc[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return null
}

/**
 * Meta Ads processor. Handles both export shapes:
 *
 *   - the Ads-Manager-style sheet — Date, Spend ($), Impressions, CTR (%),
 *     Clicks, Landing Page Views, Cost per LPV ($), Conversions (Leads), ...
 *     one row per day
 *   - the warehouse extract — DATE_DAY, SPEND, IMPRESSIONS, INLINE_LINK_CLICKS,
 *     LEADS, LANDING_PAGE_VIEWS, CAMPAIGN_NAME, AD_SET_NAME, AD_NAME, ...
 *     one row per ad per day
 *
 * Both land in the same canonical columns, so every existing Marketing tile that
 * sums over meta_ads keeps working. The warehouse extract additionally fills the
 * campaign/ad-set/ad columns, which unlock per-campaign reporting.
 *
 * Cost-per-LPV and cost-per-conversion are derived when the export omits them
 * (the warehouse extract does), so the columns are populated either way.
 */
export function processMetaAds(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    // parseAusDate, not a bare `new Date()`: V8 leans toward US MM/DD/YYYY, so a
    // DD/MM/YYYY sheet was silently transposing day and month here.
    const date = parseAusDate(pick(lc, ['date_day', 'date', 'date day']))
    if (!date) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing or invalid Date` })
      return
    }

    const spend = num(pick(lc, ['spend ($)', 'spend']))
    if (spend === null) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Spend` })
      return
    }

    // Warehouse extract uses INLINE_LINK_CLICKS for what the Ads Manager sheet
    // calls Clicks, and LEADS for Conversions (Leads).
    const clicks = parseIntFlexible(pick(lc, ['inline_link_clicks', 'clicks', 'inline link clicks']))
    const landingPageViews = parseIntFlexible(pick(lc, ['landing_page_views', 'landing page views']))
    const leads = parseIntFlexible(pick(lc, ['leads', 'conversions (leads)', 'conversions']))

    const costPerLpvRaw = num(pick(lc, ['cost per lpv ($)', 'cost per lpv', 'cost_per_lpv']))
    const costPerConvRaw = num(pick(lc, ['cost per conversion ($)', 'cost per conversion', 'cost_per_conversion']))

    validRows.push({
      date,
      spend,
      impressions: parseIntFlexible(pick(lc, ['impressions'])),
      ctr: num(pick(lc, ['ctr (%)', 'ctr'])),
      clicks,
      landing_page_views: landingPageViews,
      cost_per_lpv: costPerLpvRaw ?? (landingPageViews && landingPageViews > 0 ? spend / landingPageViews : null),
      conversions_leads: leads,
      cost_per_conversion: costPerConvRaw ?? (leads && leads > 0 ? spend / leads : null),
      video_views: parseIntFlexible(pick(lc, ['video_views', 'video views'])),
      post_engagements: parseIntFlexible(pick(lc, ['post_engagements', 'post engagements'])),

      // Warehouse extract only — null on the Ads Manager sheet.
      ad_id: txt(pick(lc, ['ad_id', 'ad id'])),
      campaign_name: txt(pick(lc, ['campaign_name', 'campaign name'])),
      ad_set_name: txt(pick(lc, ['ad_set_name', 'ad set name'])),
      ad_name: txt(pick(lc, ['ad_name', 'ad name'])),
      campaign_objective: txt(pick(lc, ['campaign_objective', 'campaign objective'])),
      reach: parseIntFlexible(pick(lc, ['reach'])),
      pixel_custom_conversions: parseIntFlexible(pick(lc, ['pixel_custom_conversions', 'pixel custom conversions'])),
      frequency: num(pick(lc, ['frequency'])),
      inline_link_click_ctr: num(pick(lc, ['inline_link_click_ctr', 'inline link click ctr'])),
    })
  })

  return { validRows, errors }
}

// Alias kept for compatibility with the SOURCE_PROCESSOR map naming convention.
export { processMetaAds as processMetaAdsToCanonical }

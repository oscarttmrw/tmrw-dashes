import { int, type ProcessorResult } from './_canonical-helpers'
import { parseSpreadsheetDate } from './_date-helpers'

/**
 * Integrated marketing daily metrics — the numbers Meta cannot supply.
 *
 * Meta reports spend, impressions, clicks and leads. It does not know how many
 * discovery calls a clinician actually logged, how many were held, or how many
 * closed; those come off Slack notifications. Nor does it know landing/checkout
 * page views or checkout abandonments; those come from PostHog. This source is
 * where those land, one row per day.
 *
 * Only `date` is required. Every metric is nullable and stays null when absent,
 * so the Marketing page can render "not instrumented" rather than a zero that
 * reads as a real measurement. That matters for cart starts in particular, which
 * Dan's own report flags as [NOT INSTRUMENTED].
 */

const METRIC_COLUMNS = [
  'calls_booked_meta',
  'calls_booked_slack',
  'calls_held',
  'closes',
  'signups',
  'signups_expected',
  'landing_checkout_views',
  'checkout_cart_views',
  'cart_starts',
  'checkout_abandonments',
  'conversions',
] as const

/** Accepts snake_case, spaced, and Title Case spellings of each metric. */
function readMetric(lc: Record<string, unknown>, key: string): number | null {
  const spaced = key.replace(/_/g, ' ')
  const v = lc[key] ?? lc[spaced]
  if (v === undefined) return null
  return int(v)
}

export function processMarketingDailyToCanonical(
  data: Record<string, unknown>[]
): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    const date = parseSpreadsheetDate(lc['date'])
    if (!date) {
      // Blank date = spacer or total row from a hand-maintained sheet; skip it
      // silently. A present-but-unparseable date is reported.
      const raw = lc['date']
      if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        errors.push({ rowIndex: i, reason: `unparseable date: ${String(raw)}` })
      }
      return
    }

    const out: Record<string, unknown> = { date }
    let anyMetric = false
    for (const key of METRIC_COLUMNS) {
      const value = readMetric(lc, key)
      out[key] = value
      if (value !== null) anyMetric = true
    }

    // A date with no metrics at all carries no information and would only
    // overwrite a previously-uploaded good row via the upsert. Skip it.
    if (!anyMetric) return

    validRows.push(out)
  })

  return { validRows, errors }
}

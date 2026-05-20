import { num, txt, type ProcessorResult } from './_canonical-helpers'

function parseDateOnly(v: unknown): string | null {
  if (!v) return null
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function todaysDate(): string {
  return new Date().toISOString().slice(0, 10)
}

// Normalise a column name to a key that survives spacing / casing /
// punctuation differences ('Page Views', 'page_views', 'Page-Views' all
// collapse to 'pageviews'). Matches the validator's normalisation.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Social Organic processor. Accepts EITHER:
 *   - Followers shape: Platform | Followers | Notes   (no date — uses today as snapshot)
 *   - Views shape:     Date | Page Views | Video Views | Post Engagements
 *                      (Platform optional — defaults to 'all' when absent)
 *
 * Emits long-format rows: { date, platform, metric_name, metric_value, notes }.
 * For the Views shape, each input row produces up to 3 output rows.
 */
export function processSocialOrganic(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  if (data.length === 0) return { validRows, errors }

  const headerKeys = Object.keys(data[0]).map(norm)
  const hasFollowers = headerKeys.includes('followers')
  const hasViews =
    headerKeys.includes('pageviews') ||
    headerKeys.includes('videoviews') ||
    headerKeys.includes('postengagements')

  if (!hasFollowers && !hasViews) {
    errors.push({
      rowIndex: 0,
      reason: 'Sheet does not match Followers (Platform/Followers/Notes) or Views (Date/Page Views/Video Views/Post Engagements) shape.',
    })
    return { validRows, errors }
  }

  const snapshotDate = todaysDate()

  data.forEach((row, i) => {
    // Lookup table keyed by normalised header → original value.
    const nk = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [norm(k), v])
    )

    if (hasFollowers) {
      const platform = txt(nk['platform'])
      const followers = num(nk['followers'])
      if (!platform) {
        errors.push({ rowIndex: i, reason: `Row ${i}: missing Platform` })
        return
      }
      if (followers === null) {
        errors.push({ rowIndex: i, reason: `Row ${i}: missing Followers value` })
        return
      }
      validRows.push({
        date: snapshotDate,
        platform,
        metric_name: 'followers',
        metric_value: followers,
        notes: txt(nk['notes']),
      })
      return
    }

    // Views shape — Platform is optional; defaults to 'all' when absent.
    const date = parseDateOnly(nk['date'])
    if (!date) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Date` })
      return
    }
    const platform = txt(nk['platform']) ?? 'all'

    const metrics: [string, unknown][] = [
      ['page_views', nk['pageviews']],
      ['video_views', nk['videoviews']],
      ['post_engagements', nk['postengagements']],
    ]

    for (const [metricName, rawValue] of metrics) {
      const value = num(rawValue)
      if (value !== null) {
        validRows.push({
          date,
          platform,
          metric_name: metricName,
          metric_value: value,
          notes: null,
        })
      }
    }
  })

  return { validRows, errors }
}

export { processSocialOrganic as processSocialOrganicToCanonical }

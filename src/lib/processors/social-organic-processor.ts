import { num, txt, type ProcessorResult } from './_canonical-helpers'

function parseDateOnly(v: unknown): string | null {
  if (!v) return null
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function todaysDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Social Organic processor. Accepts EITHER:
 *   - Followers shape: Platform | Followers | Notes   (no date — uses today as snapshot)
 *   - Views shape:     Date | Platform | Page Views | Video Views | Post Engagements
 *
 * Detects shape by column signature, then emits long-format rows
 * shaped { date, platform, metric_name, metric_value, notes }.
 *
 * For the Views shape, each row in produces up to 3 output rows
 * (one per metric column that has a non-null value).
 */
export function processSocialOrganic(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  if (data.length === 0) return { validRows, errors }

  const headers = Object.keys(data[0]).map(h => h.toLowerCase().trim())
  const hasFollowers = headers.includes('followers')
  const hasViews = headers.includes('page views') || headers.includes('video views') || headers.includes('post engagements')

  if (!hasFollowers && !hasViews) {
    errors.push({
      rowIndex: 0,
      reason: 'Sheet does not match Followers (Platform/Followers/Notes) or Views (Date/Platform/Page Views/...) shape.',
    })
    return { validRows, errors }
  }

  const snapshotDate = todaysDate()

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    if (hasFollowers) {
      const platform = txt(lc['platform'])
      const followers = num(lc['followers'])
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
        notes: txt(lc['notes']),
      })
      return
    }

    // Views shape
    const date = parseDateOnly(lc['date'])
    const platform = txt(lc['platform'])
    if (!date) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Date` })
      return
    }
    if (!platform) {
      errors.push({
        rowIndex: i,
        reason: `Row ${i}: missing Platform — column must be added to the Social Media Views sheet.`,
      })
      return
    }

    const metrics: [string, unknown][] = [
      ['page_views', lc['page views']],
      ['video_views', lc['video views']],
      ['post_engagements', lc['post engagements']],
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

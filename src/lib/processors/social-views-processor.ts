import { num, txt, type ProcessorResult } from './_canonical-helpers'

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function parseDateOnly(v: unknown): string | null {
  if (!v) return null
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/**
 * Social Views processor. Daily per-platform engagement counts.
 * One row per (platform, day) in → one row out. The Platform column was added
 * so the dashboard can split views across Facebook / Instagram / LinkedIn.
 */
export function processSocialViews(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const nk = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [norm(k), v])
    )
    const platform = txt(nk['platform'])
    if (!platform) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Platform` })
      return
    }
    const date = parseDateOnly(nk['date'])
    if (!date) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing or invalid Date` })
      return
    }
    validRows.push({
      platform,
      date,
      page_views: num(nk['pageviews']),
      video_views: num(nk['videoviews']),
      post_engagements: num(nk['postengagements']),
    })
  })

  return { validRows, errors }
}

export { processSocialViews as processSocialViewsToCanonical }

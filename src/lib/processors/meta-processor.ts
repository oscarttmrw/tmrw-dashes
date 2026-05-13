import type { MetaAdRow } from '@/lib/types/meta'

function toStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function parseNum(value: unknown): number {
  const s = toStr(value).trim()
  if (s === '' || s === '-') return 0
  return parseFloat(s.replace(/[,$%]/g, '')) || 0
}

function parseDateOrNull(value: unknown): string | null {
  const s = toStr(value).trim()
  if (s === '') return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function lcRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]))
}

export function processMetaCSV(data: Record<string, unknown>[]): MetaAdRow[] {
  if (data.length > 0) {
    // Debug aid for future column-mismatch issues
    console.log('[meta-processor] first-row keys:', Object.keys(data[0]))
  }

  return data
    .map((row): MetaAdRow | null => {
      const lc = lcRow(row)
      const adSetName = toStr(lc['ad set name']).trim()
      if (!adSetName) return null

      return {
        date: parseDateOrNull(lc['day']),
        adSetName,
        campaignName: toStr(lc['campaign name']).trim(),
        spend: parseNum(lc['amount spent']),
        impressions: parseNum(lc['impressions']),
        clicks: parseNum(lc['clicks (all)']),
        landingPageViews: parseNum(lc['landing page views']),
        costPerLandingPageView: parseNum(lc['cost per landing page view']),
        conversions: parseNum(lc['results']),
        costPerResult: parseNum(lc['cost per result']),
        ctr: parseNum(lc['ctr (all)']),
      }
    })
    .filter((r): r is MetaAdRow => r !== null)
}

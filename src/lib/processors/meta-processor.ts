import type { MetaAdRow } from '@/lib/types/meta'

function parseNum(value: string | undefined): number {
  if (!value || value.trim() === '' || value.trim() === '-') return 0
  return parseFloat(value.replace(/[,$]/g, '').trim()) || 0
}

function parseNumOrNull(value: string | undefined): number | null {
  if (!value || value.trim() === '' || value.trim() === '-') return null
  const n = parseFloat(value.replace(/[,$]/g, '').trim())
  return isNaN(n) ? null : n
}

function parseDateOrNull(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null
  const d = new Date(value.trim())
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export function processMetaCSV(data: Record<string, string>[]): MetaAdRow[] {
  return data
    .filter((row) => row['Ad Set Name']?.trim())
    .map((row): MetaAdRow => ({
      adSetName: row['Ad Set Name']?.trim() ?? '',
      campaignName: row['Campaign Name']?.trim() ?? '',
      spend: parseNum(row['Amount Spent (AUD)']),
      impressions: parseNum(row['Impressions']),
      clicks: parseNum(row['Clicks (All)']),
      landingPageViews: parseNum(row['Landing Page Views']),
      conversions: parseNum(row['Results']),
      costPerResult: parseNumOrNull(row['Cost per Result (AUD)']),
      costPerLPV: parseNumOrNull(row['Cost per Landing Page View (AUD)']),
      ctr: parseNumOrNull(row['CTR (All)']),
      dateStart: parseDateOrNull(row['Reporting Starts']),
      dateStop: parseDateOrNull(row['Reporting Ends']),
    }))
}

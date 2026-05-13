import type { MetaAdRow } from '@/lib/types/meta'
import { num, int, dateOnly, txt, type ProcessorResult } from './_canonical-helpers'

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

export function processMetaToCanonical(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )
    const day = dateOnly(lc['day'])
    if (!day) {
      errors.push({
        rowIndex: i,
        reason: `Row ${i}: Day field empty. Re-export with 'Breakdown by Day' enabled in Meta Ads Manager.`,
      })
      return
    }
    const adSet = txt(lc['ad set name'])
    if (!adSet) {
      errors.push({ rowIndex: i, reason: `Row ${i}: Ad Set Name required` })
      return
    }
    validRows.push({
      date: day,
      ad_set_name: adSet,
      spend_aud: num(lc['amount spent (aud)']),
      impressions: int(lc['impressions']),
      clicks: int(lc['clicks (all)']),
      ctr: num(lc['ctr (all)']),
      reach: int(lc['reach']),
      frequency: num(lc['frequency']),
      result_type: txt(lc['result type']),
      results: int(lc['results']),
      cost_per_result: num(lc['cost per result (aud)']),
      landing_page_views: int(lc['landing page views']),
      cost_per_landing_page_view: num(lc['cost per landing page view (aud)']),
      delivery_status: txt(lc['delivery status']),
    })
  })

  return { validRows, errors }
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

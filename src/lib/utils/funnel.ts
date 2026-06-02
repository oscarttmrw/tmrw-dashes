import { num } from '@/lib/processors/_canonical-helpers'

/**
 * Aggregated GHL funnel totals over a date range, summed from the monthly
 * `funnel_metrics` rows whose calendar month overlaps the range. Rates are
 * recomputed from the summed counts (the sheet defines Win % = won ÷ held and
 * Call Conversion Rate = held ÷ booked) so multi-month ranges stay correct.
 */
export interface FunnelTotals {
  leads: number
  bookedCalls: number
  heldCalls: number
  won: number
  wonValue: number
  showed: number
  noShow: number
  upcoming: number
  /** won ÷ held, as a percentage (null when held = 0). */
  winPct: number | null
  /** held ÷ booked, as a percentage (null when booked = 0). */
  callConversionRate: number | null
  /** false when no funnel row overlaps the range — lets callers show "—". */
  hasData: boolean
}

type Row = Record<string, unknown>

function monthBounds(monthVal: unknown): { start: number; end: number } | null {
  const t = new Date(String(monthVal ?? '')).getTime()
  if (isNaN(t)) return null
  const d = new Date(t)
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
  return { start, end }
}

export function aggregateFunnel(rows: Row[], start: Date, end: Date): FunnelTotals {
  const s = start.getTime()
  const e = end.getTime()
  let leads = 0, bookedCalls = 0, heldCalls = 0, won = 0, wonValue = 0
  let showed = 0, noShow = 0, upcoming = 0
  let hasData = false

  for (const r of rows) {
    const b = monthBounds(r.month)
    if (!b) continue
    // include the month if it overlaps the selected range
    if (b.start > e || b.end < s) continue
    hasData = true
    leads += num(r.total_leads) ?? 0
    bookedCalls += num(r.booked_calls) ?? 0
    heldCalls += num(r.held_calls) ?? 0
    won += num(r.won_opportunities) ?? 0
    wonValue += num(r.won_value) ?? 0
    showed += num(r.showed_appointments) ?? 0
    noShow += num(r.no_show_appointments) ?? 0
    upcoming += num(r.upcoming_appointments) ?? 0
  }

  return {
    leads, bookedCalls, heldCalls, won, wonValue, showed, noShow, upcoming,
    winPct: heldCalls > 0 ? (won / heldCalls) * 100 : null,
    callConversionRate: bookedCalls > 0 ? (heldCalls / bookedCalls) * 100 : null,
    hasData,
  }
}

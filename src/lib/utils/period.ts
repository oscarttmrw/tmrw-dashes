import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, subMonths, subWeeks, isAfter, isBefore } from '@/lib/utils/date'

export type Granularity = 'day' | 'week' | 'month' | 'quarter'
export type TimeWindow = 'this-week' | 'this-month' | 'quarter' | '6mo' | 'ytd' | 'all' | 'mtd' | 'qtd' | 'trailing-4w' | 'trailing-12w'

/**
 * A concrete start/end window. Canonical home for the type — the DateRangePicker
 * re-exports it so existing `import { DateRange } from '.../date-range-picker'`
 * call sites keep working, while server-safe utils can use it without pulling a
 * client component into their module graph.
 */
export interface DateRange {
  start: Date
  end: Date
}

/* ─── Timezone-safe day keys ───────────────────────────────────────────
 *
 * Every warehouse extract lands in UTC (`2026-08-05 08:14:45.000 Z`), but the
 * business reports in Sydney time. Bucketing UTC timestamps by their UTC date
 * silently under-counts: Dan's ticket report reads 260 for 1–5 Aug in Sydney and
 * 253 in UTC, and 1,098 for July vs 1,095. Always key days through
 * `sydneyDayKey` when the underlying value carries a time component.
 */

export const SYDNEY_TZ = 'Australia/Sydney'

const sydneyDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SYDNEY_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** `YYYY-MM-DD` for the Sydney calendar day a timestamp falls on. */
export function sydneyDayKey(value: string | Date | number): string {
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  const parts = sydneyDayFormatter.formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** `YYYY-MM` for the Sydney calendar month a timestamp falls in. */
export function sydneyMonthKey(value: string | Date | number): string {
  return sydneyDayKey(value).slice(0, 7)
}

/* ─── Day boundaries ──────────────────────────────────────────────────── */

export function atDayStart(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function atDayEnd(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/** Inclusive day count across a range. */
export function dayCount(r: DateRange): number {
  const ms = atDayStart(r.end).getTime() - atDayStart(r.start).getTime()
  return Math.round(ms / 86_400_000) + 1
}

/** Every calendar day in a range, as day-start Dates. */
export function eachDay(r: DateRange): Date[] {
  const out: Date[] = []
  const cursor = atDayStart(r.start)
  const last = atDayStart(r.end).getTime()
  while (cursor.getTime() <= last) {
    out.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

/* ─── Comparison windows ──────────────────────────────────────────────── */

/** Monday 00:00 → now. The "This wk WTD" column in Dan's weekly table. */
export function weekToDate(ref: Date = new Date()): DateRange {
  return { start: startOfWeek(ref), end: atDayEnd(ref) }
}

/** The full Monday–Sunday week containing `ref`. */
export function fullWeek(ref: Date = new Date()): DateRange {
  const start = startOfWeek(ref)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end: atDayEnd(end) }
}

/**
 * The same weekdays, one week earlier — Mon–Wed WTD compares against last
 * Mon–Wed. `previousPeriod()` would give last Fri–Sun instead, because it only
 * shifts by range length.
 */
export function previousWeekSameSpan(r: DateRange): DateRange {
  return { start: atDayStart(subWeeks(r.start, 1)), end: atDayEnd(subWeeks(r.end, 1)) }
}

/**
 * The same day-of-month span, one calendar month earlier: Aug 1–12 → Jul 1–12.
 * Days past the end of the shorter month clamp to its last day (Mar 29–31 → Feb
 * 28–28). This is the comparison Dan called out as most important, and the one
 * `previousPeriod()` cannot express — on a partial month it shifts by length and
 * returns Jul 20–31 for an Aug 1–12 window.
 */
export function samePeriodLastMonth(r: DateRange): DateRange {
  return {
    start: atDayStart(shiftMonths(r.start, -1)),
    end: atDayEnd(shiftMonths(r.end, -1)),
  }
}

/** The same day-of-month span, one year earlier. */
export function samePeriodLastYear(r: DateRange): DateRange {
  return {
    start: atDayStart(shiftMonths(r.start, -12)),
    end: atDayEnd(shiftMonths(r.end, -12)),
  }
}

/**
 * Shift by whole calendar months, clamping the day to the target month's length.
 * Plain `setMonth` overflows instead — 31 Mar minus one month lands on 3 Mar.
 */
function shiftMonths(d: Date, months: number): Date {
  const y = d.getFullYear()
  const m = d.getMonth() + months
  const daysInTarget = new Date(y, m + 1, 0).getDate()
  return new Date(y, m, Math.min(d.getDate(), daysInTarget), 12, 0, 0, 0)
}

/** The full calendar month containing `ref`. */
export function fullMonth(ref: Date = new Date()): DateRange {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
  return { start: atDayStart(start), end: atDayEnd(end) }
}

/** The N full calendar months ending with the month containing `ref`, oldest first. */
export function trailingMonths(count: number, ref: Date = new Date()): DateRange[] {
  const out: DateRange[] = []
  for (let i = count - 1; i >= 0; i--) {
    out.push(fullMonth(new Date(ref.getFullYear(), ref.getMonth() - i, 1)))
  }
  return out
}

/* ─── Deltas ──────────────────────────────────────────────────────────── */

/**
 * Percentage change, or null when there is no baseline to compare against.
 * Shared so Home / Financial / Marketing / Support all agree — this was
 * previously reimplemented per page.
 */
export function deltaPct(current: number, previous: number): number | null {
  if (!isFinite(current) || !isFinite(previous)) return null
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

/** True when a timestamp falls inside a range (inclusive). */
export function inRange(value: unknown, r: DateRange): boolean {
  if (value == null || value === '') return false
  const t = new Date(String(value)).getTime()
  if (isNaN(t)) return false
  return t >= r.start.getTime() && t <= r.end.getTime()
}

/**
 * Like `inRange`, but compares Sydney calendar days rather than instants. Use
 * for UTC timestamps that need to land in the Sydney day the business booked
 * them on.
 */
export function inRangeSydney(value: unknown, r: DateRange): boolean {
  if (value == null || value === '') return false
  const key = sydneyDayKey(String(value))
  if (!key) return false
  return key >= localDayKey(r.start) && key <= localDayKey(r.end)
}

/** `YYYY-MM-DD` from a Date's own calendar fields (no timezone shifting). */
export function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/* ─── Windowing / grouping (pre-existing) ─────────────────────────────── */

/**
 * Filter an array of items with a date field to a specific time window.
 */
export function filterByWindow<T>(
  items: T[],
  dateAccessor: (item: T) => string | Date,
  window: TimeWindow,
  referenceDate: Date = new Date()
): T[] {
  let start: Date

  switch (window) {
    case 'this-week':
      start = startOfWeek(referenceDate)
      break
    case 'this-month':
    case 'mtd':
      start = startOfMonth(referenceDate)
      break
    case 'quarter':
    case 'qtd':
      start = startOfQuarter(referenceDate)
      break
    case '6mo':
      start = subMonths(referenceDate, 6)
      break
    case 'ytd':
      start = startOfYear(referenceDate)
      break
    case 'trailing-4w':
      start = subWeeks(referenceDate, 4)
      break
    case 'trailing-12w':
      start = subWeeks(referenceDate, 12)
      break
    case 'all':
      return items
    default:
      return items
  }

  return items.filter(item => {
    const d = new Date(dateAccessor(item))
    return isAfter(d, start) && isBefore(d, referenceDate)
  })
}

/**
 * Group items by time bucket based on granularity.
 */
export function groupByPeriod<T>(
  items: T[],
  dateAccessor: (item: T) => string | Date,
  granularity: Granularity
): Map<string, T[]> {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const d = new Date(dateAccessor(item))
    let key: string

    switch (granularity) {
      case 'day':
        key = d.toISOString().slice(0, 10)
        break
      case 'week': {
        const ws = startOfWeek(d)
        key = `W${ws.toISOString().slice(0, 10)}`
        break
      }
      case 'month':
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        break
      case 'quarter': {
        const q = Math.floor(d.getMonth() / 3) + 1
        key = `${d.getFullYear()} Q${q}`
        break
      }
    }

    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  return groups
}

/**
 * Determine the appropriate granularity for a time window.
 */
export function granularityForWindow(window: TimeWindow): Granularity {
  switch (window) {
    case 'this-week': return 'day'
    case 'this-month':
    case 'mtd':
    case 'trailing-4w': return 'week'
    case 'quarter':
    case 'qtd':
    case 'trailing-12w': return 'week'
    case '6mo':
    case 'ytd': return 'month'
    case 'all': return 'month'
    default: return 'month'
  }
}

import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, subMonths, subWeeks, isAfter, isBefore } from '@/lib/utils/date'

export type Granularity = 'day' | 'week' | 'month' | 'quarter'
export type TimeWindow = 'this-week' | 'this-month' | 'quarter' | '6mo' | 'ytd' | 'all' | 'mtd' | 'qtd' | 'trailing-4w' | 'trailing-12w'

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

/**
 * Date / datetime parsers for CSV exports.
 *
 * Most TMRW data sources export dates in Australian format (DD/M/YYYY or
 * DD/MM/YYYY), some with a trailing time. JavaScript's native Date constructor
 * parses these inconsistently (V8 leans toward US MM/DD/YYYY), so we parse the
 * parts ourselves and fall back to native Date for ISO inputs.
 */

const SENTINEL = new Set(['', '-', 'n/a', 'ongoing'])

function preflight(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  if (SENTINEL.has(s.toLowerCase())) return null
  return s
}

interface ParsedAusParts {
  year: number
  month: number  // 1-12
  day: number    // 1-31
  hour: number
  minute: number
  second: number
}

function parseAusParts(s: string): ParsedAusParts | null {
  // DD/M/YYYY or DD/MM/YYYY, optional trailing " HH:MM" or " HH:MM:SS"
  // or ISO "T" separator. The native Date is used for the time portion when
  // the date portion is ISO-shaped instead.
  const m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  )
  if (!m) return null
  const day = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  const year = parseInt(m[3], 10)
  const hour = m[4] ? parseInt(m[4], 10) : 0
  const minute = m[5] ? parseInt(m[5], 10) : 0
  const second = m[6] ? parseInt(m[6], 10) : 0
  if (
    year < 1970 || year >= 2100
    || month < 1 || month > 12
    || day < 1 || day > 31
    || hour < 0 || hour > 23
    || minute < 0 || minute > 59
    || second < 0 || second > 59
  ) return null
  return { year, month, day, hour, minute, second }
}

/**
 * Parse an Australian date or ISO date into "YYYY-MM-DD". Any trailing time
 * component is discarded. Returns null for empty / sentinel / unparseable.
 */
export function parseAusDate(value: unknown): string | null {
  const s = preflight(value)
  if (s === null) return null
  const parts = parseAusParts(s)
  if (parts) {
    const mm = String(parts.month).padStart(2, '0')
    const dd = String(parts.day).padStart(2, '0')
    return `${parts.year}-${mm}-${dd}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

/**
 * Parse an Australian datetime (DD/M/YYYY HH:MM[:SS]) or ISO timestamp into a
 * full ISO-8601 string. The Australian datetime is interpreted as UTC — Meta
 * and Stripe both export their "(UTC)" columns as UTC wall-clock. Returns
 * null for empty / sentinel / unparseable.
 */
export function parseAusDateTime(value: unknown): string | null {
  const s = preflight(value)
  if (s === null) return null
  const parts = parseAusParts(s)
  if (parts) {
    const mm = String(parts.month).padStart(2, '0')
    const dd = String(parts.day).padStart(2, '0')
    const hh = String(parts.hour).padStart(2, '0')
    const mi = String(parts.minute).padStart(2, '0')
    const ss = String(parts.second).padStart(2, '0')
    return `${parts.year}-${mm}-${dd}T${hh}:${mi}:${ss}.000Z`
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

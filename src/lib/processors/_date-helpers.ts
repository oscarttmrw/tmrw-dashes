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

const MONTH_ABBR: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/**
 * Convert an Excel date serial (days since 1899-12-30) to "YYYY-MM-DD".
 * Guarded to a sane range so stray numbers aren't read as dates.
 */
export function fromExcelSerial(serial: number): string | null {
  if (!isFinite(serial) || serial < 20_000 || serial > 80_000) return null
  const d = new Date(Math.floor(serial - 25_569) * 86_400_000)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/**
 * Parse a date cell that came out of a spreadsheet, into "YYYY-MM-DD".
 *
 * Handles, in order: a numeric Excel serial; the displayed "30-Dec-2025" /
 * "30-Dec-25" form; a plain-number *string* serial; then ISO / native-parseable.
 *
 * The plain-number-string branch must run before the native fallback: the upload
 * page re-serialises every sheet through Papa.unparse, so Excel date cells reach
 * processors as serial strings like "45992", and `new Date("45992")` reads 45992
 * as a year. Returns null for anything that isn't a real date — which is how
 * subtotal labels, blanks and grand-total rows get skipped.
 */
export function parseSpreadsheetDate(v: unknown): string | null {
  if (v === null || v === undefined) return null

  if (typeof v === 'number') return fromExcelSerial(v)

  const s = String(v).trim()
  if (s === '') return null

  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})[A-Za-z]*-(\d{2,4})$/)
  if (m) {
    const day = parseInt(m[1], 10)
    const mon = MONTH_ABBR[m[2].toLowerCase()]
    let year = parseInt(m[3], 10)
    if (year < 100) year += 2000
    if (mon && day >= 1 && day <= 31) {
      return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    return null
  }

  if (/^\d+(\.\d+)?$/.test(s)) {
    return fromExcelSerial(Number(s))
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
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

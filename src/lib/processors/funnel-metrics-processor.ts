import { type ProcessorResult, num, int } from './_canonical-helpers'

/**
 * GHL funnel metrics — monthly summary.
 *
 * The GoHighLevel funnel data arrives as a *pivoted* sheet: one row per metric
 * (Total Leads, Booked Calls, …) and one column per month (April, May, …),
 * sitting under a few title rows. Header-row detection upstream is unreliable
 * for this layout (title rows + blank-row compaction shift the index), so the
 * real header row — the one reading "Metric | April | May | …" — can arrive as
 * an ordinary data row with opaque keys (e.g. "__EMPTY_1" for May).
 *
 * This processor is robust to that: it locates the embedded header row by
 * value, learns which key maps to which month, then un-pivots the metric rows
 * that follow into one canonical row per populated month. If the keys already
 * are month names (a clean export), it falls back to using them directly.
 *
 * NOTE: the sheet carries month names with no year, so we assume the current
 * calendar year. Empty (future) months are skipped, so only populated months —
 * necessarily in/at the current year — get rows.
 */

const MONTHS: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
}

type Kind = 'int' | 'num'

// Normalised metric label → canonical column + numeric kind.
const METRIC_MAP: Record<string, { key: string; kind: Kind }> = {
  'total leads': { key: 'total_leads', kind: 'int' },
  'total booked calls': { key: 'booked_calls', kind: 'int' },
  'total held calls': { key: 'held_calls', kind: 'int' },
  'won opportunities': { key: 'won_opportunities', kind: 'int' },
  'won opportunities value': { key: 'won_value', kind: 'num' },
  'win percentage': { key: 'win_pct', kind: 'num' },
  'call conversion rate': { key: 'call_conversion_rate', kind: 'num' },
  'showed appointments (count / rate)': { key: 'showed_appointments', kind: 'int' },
  'no show appointments (count / rate)': { key: 'no_show_appointments', kind: 'int' },
  'upcoming appointments': { key: 'upcoming_appointments', kind: 'int' },
}

const ALL_KEYS = [
  'total_leads', 'booked_calls', 'held_calls', 'won_opportunities', 'won_value',
  'win_pct', 'call_conversion_rate', 'showed_appointments', 'no_show_appointments',
  'upcoming_appointments',
]

const norm = (v: unknown) => String(v ?? '').toLowerCase().trim()

interface Layout {
  metricKey: string
  monthByKey: Record<string, number>
  startIdx: number // index in `data` where metric rows begin
}

/** Find the header layout, whether it's the object keys or an embedded row. */
function detectLayout(data: Record<string, unknown>[]): Layout | null {
  // 1. Embedded header row: a row whose cells spell "Metric … April … May …".
  for (let i = 0; i < data.length; i++) {
    const entries = Object.entries(data[i])
    const metricEntry = entries.find(([, v]) => norm(v) === 'metric')
    if (!metricEntry) continue
    const monthByKey: Record<string, number> = {}
    for (const [k, v] of entries) {
      const m = MONTHS[norm(v)]
      if (m) monthByKey[k] = m
    }
    if (Object.keys(monthByKey).length > 0) {
      return { metricKey: metricEntry[0], monthByKey, startIdx: i + 1 }
    }
  }

  // 2. Clean export: month names are the object keys themselves.
  const keys = Object.keys(data[0] ?? {})
  const monthByKey: Record<string, number> = {}
  for (const k of keys) {
    const m = MONTHS[norm(k)]
    if (m) monthByKey[k] = m
  }
  if (Object.keys(monthByKey).length > 0) {
    const metricKey =
      keys.find(k => norm(k) === 'metric') ??
      keys.find(k => !MONTHS[norm(k)]) ??
      keys[0]
    return { metricKey, monthByKey, startIdx: 0 }
  }

  return null
}

export function processFunnelMetricsToCanonical(
  data: Record<string, unknown>[],
  year: number = new Date().getFullYear(),
): ProcessorResult {
  const errors: { rowIndex: number; reason: string }[] = []
  if (data.length === 0) {
    return { validRows: [], errors: [{ rowIndex: 0, reason: 'File contains no rows' }] }
  }

  const layout = detectLayout(data)
  if (!layout) {
    return { validRows: [], errors: [{ rowIndex: 0, reason: 'Could not find month columns (expected April, May, …)' }] }
  }

  // Accumulate values per month number.
  const perMonth = new Map<number, Record<string, number | null>>()
  for (const m of Object.values(layout.monthByKey)) perMonth.set(m, {})

  for (let i = layout.startIdx; i < data.length; i++) {
    const row = data[i]
    const mapped = METRIC_MAP[norm(row[layout.metricKey])]
    if (!mapped) continue // informational / unrecognised rows skipped silently
    for (const [key, month] of Object.entries(layout.monthByKey)) {
      const v = mapped.kind === 'int' ? int(row[key]) : num(row[key])
      if (v !== null) perMonth.get(month)![mapped.key] = v
    }
  }

  const validRows: Record<string, unknown>[] = []
  for (const month of Array.from(perMonth.keys()).sort((a, b) => a - b)) {
    const bucket = perMonth.get(month)!
    const hasAny = ALL_KEYS.some(k => bucket[k] !== undefined && bucket[k] !== null)
    if (!hasAny) continue
    const out: Record<string, unknown> = {
      month: `${year}-${String(month).padStart(2, '0')}-01`,
    }
    for (const k of ALL_KEYS) out[k] = bucket[k] ?? null
    validRows.push(out)
  }

  if (validRows.length === 0) {
    errors.push({ rowIndex: 0, reason: 'No populated months found' })
  }
  return { validRows, errors }
}

import { num, txt, type ProcessorResult } from './_canonical-helpers'

/**
 * Zendesk inbound-ticket processor for the warehouse extract:
 *
 *   CHANNEL, STATUS, DIRECTION, GROUP_NAME, CREATED_AT, UPDATED_AT,
 *   FIRST_REPLY_AT, FIRST_RESPONSE_HOURS, SOLVED_AT, RESOLUTION_HOURS
 *
 * Distinct from the legacy `zendesk` source, which is the Explore report export
 * keyed on Ticket ID with satisfaction scores and reply times in minutes. This
 * extract has no ticket ID at all, which is why the write strategy replaces a
 * date window rather than upserting.
 *
 * Timestamps arrive as `2026-08-05 08:14:45.000 Z` — UTC wall-clock with a
 * trailing Z. Stored as UTC and converted to Australia/Sydney only at display
 * time: the business reports in Sydney, and bucketing by UTC date under-counts
 * (1–5 Aug reads 260 tickets in Sydney and 253 in UTC).
 */

/**
 * Parse the export's `YYYY-MM-DD HH:MM:SS.mmm Z` form to a real ISO timestamp.
 * Also accepts plain ISO, in case the extract format changes.
 */
function parseWarehouseTimestamp(v: unknown): string | null {
  const s = txt(v)
  if (!s) return null

  // '2026-08-05 08:14:45.000 Z' → '2026-08-05T08:14:45.000Z'
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?\s*(Z|[+-]\d{2}:?\d{2})?$/)
  if (m) {
    const millis = (m[3] ?? '0').padEnd(3, '0')
    const zone = m[4] ? (m[4] === 'Z' ? 'Z' : m[4]) : 'Z'
    const iso = `${m[1]}T${m[2]}.${millis}${zone}`
    const d = new Date(iso)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export function processZendeskTicketsToCanonical(
  data: Record<string, unknown>[]
): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    // created_at is the only field the whole report keys off — a row without one
    // cannot be placed in any window, so it is an error rather than a skip.
    const createdAt = parseWarehouseTimestamp(lc['created_at'] ?? lc['created at'])
    if (!createdAt) {
      const raw = lc['created_at'] ?? lc['created at']
      if (raw === undefined || raw === null || String(raw).trim() === '') return
      errors.push({ rowIndex: i, reason: `unparseable CREATED_AT: ${String(raw)}` })
      return
    }

    const channel = txt(lc['channel'])
    if (!channel) {
      errors.push({ rowIndex: i, reason: 'missing CHANNEL' })
      return
    }

    validRows.push({
      channel: channel.toLowerCase(),
      status: (txt(lc['status']) ?? '').toLowerCase() || null,
      direction: (txt(lc['direction']) ?? '').toLowerCase() || null,
      // GROUP_NAME is blank on 28 rows in the current export; keep the null so
      // the queue breakdown can show an explicit "unassigned" rather than
      // inventing a bucket.
      group_name: txt(lc['group_name'] ?? lc['group name']),
      created_at: createdAt,
      updated_at: parseWarehouseTimestamp(lc['updated_at'] ?? lc['updated at']),
      first_reply_at: parseWarehouseTimestamp(lc['first_reply_at'] ?? lc['first reply at']),
      first_response_hours: num(lc['first_response_hours'] ?? lc['first response hours']),
      solved_at: parseWarehouseTimestamp(lc['solved_at'] ?? lc['solved at']),
      resolution_hours: num(lc['resolution_hours'] ?? lc['resolution hours']),
    })
  })

  return { validRows, errors }
}

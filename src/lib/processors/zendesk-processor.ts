import { txt, type ProcessorResult } from './_canonical-helpers'
import { parseAusDateTime } from './_date-helpers'

const STATUS_ENUM = new Set(['open', 'pending', 'hold', 'solved', 'closed', 'new'])
const PRIORITY_ENUM = new Set(['low', 'normal', 'high', 'urgent'])

function normalizeEnum(v: unknown, allowed: Set<string>): string | null {
  const t = txt(v)
  if (t === null) return null
  const lc = t.toLowerCase()
  return allowed.has(lc) ? lc : lc // keep value even if outside enum so we don't silently drop signal
}

/**
 * Parse Zendesk time fields. The CSV exports these as either pure-number
 * minutes ("123"), or "Xh Ym" / "Yh" / "Xm", or empty. Returns minutes.
 */
function parseMinutes(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'n/a') return null
  // Pure numeric
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s)
    return isNaN(n) ? null : Math.round(n)
  }
  // "Xh Ym" / "Xh" / "Ym"
  const m = s.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i)
  if (m && (m[1] || m[2])) {
    const h = m[1] ? parseInt(m[1], 10) : 0
    const mi = m[2] ? parseInt(m[2], 10) : 0
    return h * 60 + mi
  }
  return null
}

/**
 * Map Zendesk satisfaction values. Numeric 1-5 → integer. Text "Good"/"Bad"
 * → 5/1. "Offered" / "Not Offered" / unrecognised → null.
 */
function parseSatisfaction(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '' || s === '-') return null
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s)
    if (isNaN(n)) return null
    return Math.round(n)
  }
  const lc = s.toLowerCase()
  if (lc.startsWith('good')) return 5
  if (lc.startsWith('bad')) return 1
  return null
}

/**
 * Canonical Zendesk processor. Uses parseAusDateTime for created_at, lowercases
 * status / priority, and handles the two minute-field encodings Zendesk exports.
 */
export function processZendeskCSV(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )
    const ticketId = txt(lc['id'])
    if (!ticketId) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing ticket ID` })
      return
    }
    validRows.push({
      zendesk_ticket_id: ticketId,
      zendesk_created_at: parseAusDateTime(lc['created at']),
      status: normalizeEnum(lc['status'], STATUS_ENUM),
      priority: normalizeEnum(lc['priority'], PRIORITY_ENUM),
      assignee: txt(lc['assignee']),
      group_name: txt(lc['group']),
      subject: txt(lc['subject']),
      first_reply_time_minutes: parseMinutes(
        lc['first reply time in minutes']
        ?? lc['first reply time (in minutes)']
        ?? lc['first reply time (min)']
        ?? lc['first reply time']
      ),
      full_resolution_time_minutes: parseMinutes(
        lc['full resolution time in minutes within business hours']
        ?? lc['full resolution time in minutes']
        ?? lc['full resolution time (in minutes)']
        ?? lc['full resolution time (min)']
        ?? lc['full resolution time']
      ),
      satisfaction_score: parseSatisfaction(lc['satisfaction score'] ?? lc['satisfaction']),
    })
  })

  return { validRows, errors }
}

export { processZendeskCSV as processZendeskToCanonical }

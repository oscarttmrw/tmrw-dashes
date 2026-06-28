import { txt, int, type ProcessorResult } from './_canonical-helpers'
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
 * Normalise Zendesk's "Via" / channel labels into stable buckets so per-channel
 * metrics group cleanly. Unknown channels pass through lowercased.
 */
function normalizeChannel(v: unknown): string | null {
  const t = txt(v)
  if (t === null) return null
  const lc = t.toLowerCase()
  if (lc.includes('mail')) return 'email'
  if (lc.includes('chat') || lc.includes('messag')) return 'chat'
  if (lc.includes('voice') || lc.includes('phone') || lc.includes('call')) return 'phone'
  if (lc.includes('web') || lc.includes('form') || lc.includes('help center') || lc.includes('portal')) return 'web'
  if (lc.includes('social') || lc.includes('facebook') || lc.includes('twitter') || lc.includes('instagram') || lc.includes('whatsapp')) return 'social'
  if (lc.includes('api')) return 'api'
  return lc
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

// Pick the first present value from a list of candidate header keys.
function pick(lc: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (lc[k] !== undefined && lc[k] !== null && String(lc[k]).trim() !== '') return lc[k]
  }
  return null
}

/** Derive a coarse ticket reason from the tag list (first tag) when no
 *  dedicated "about" column is present. */
function firstTag(tags: string | null): string | null {
  if (!tags) return null
  const first = tags.split(/[,\s|]+/).map(t => t.trim()).filter(Boolean)[0]
  return first ?? null
}

/**
 * Canonical Zendesk processor. Populates the typed support schema: channel,
 * solved/updated timestamps, reply / inbound-message / reopen counts, tags and
 * ticket reason, alongside the original reply/resolution times and CSAT.
 */
export function processZendeskCSV(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )
    const ticketId = txt(pick(lc, 'id', 'ticket id', 'zendesk ticket id'))
    if (!ticketId) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing ticket ID` })
      return
    }

    const tags = txt(lc['tags'])

    validRows.push({
      zendesk_ticket_id: ticketId,
      zendesk_created_at: parseAusDateTime(pick(lc, 'created at', 'created')),
      solved_at: parseAusDateTime(pick(lc, 'solved at', 'solved')),
      updated_at: parseAusDateTime(pick(lc, 'updated at', 'updated')),
      status: normalizeEnum(lc['status'], STATUS_ENUM),
      priority: normalizeEnum(lc['priority'], PRIORITY_ENUM),
      channel: normalizeChannel(pick(lc, 'via', 'channel', 'source')),
      ticket_type: txt(pick(lc, 'ticket type', 'type')),
      ticket_reason: txt(pick(lc, 'about', 'reason', 'category')) ?? firstTag(tags),
      tags,
      assignee: txt(lc['assignee']),
      group_name: txt(pick(lc, 'group', 'group name')),
      subject: txt(lc['subject']),
      first_reply_time_minutes: parseMinutes(pick(
        lc,
        'first reply time in minutes',
        'first reply time (in minutes)',
        'first reply time (min)',
        'first reply time',
      )),
      full_resolution_time_minutes: parseMinutes(pick(
        lc,
        'full resolution time in minutes within business hours',
        'full resolution time in minutes',
        'full resolution time (in minutes)',
        'full resolution time (min)',
        'full resolution time',
      )),
      requester_wait_time_minutes: parseMinutes(pick(
        lc,
        'requester wait time in minutes within business hours',
        'requester wait time in minutes',
        'requester wait time',
      )),
      replies: int(pick(lc, 'replies', 'agent replies', 'public replies')),
      inbound_messages: int(pick(lc, 'inbound messages', 'inbound message count', 'customer messages', 'messages')),
      reopens: int(pick(lc, 'reopens', 'reopen count', 'number of reopens')),
      satisfaction_score: parseSatisfaction(pick(lc, 'satisfaction score', 'satisfaction')),
    })
  })

  return { validRows, errors }
}

export { processZendeskCSV as processZendeskToCanonical }

import { finiteValues, median, percentile } from '@/lib/utils/stats'
import { eachDay, localDayKey, sydneyDayKey, type DateRange } from '@/lib/utils/period'

/**
 * Support analytics over `zendesk_tickets`.
 *
 * Pure functions, so the live /support page and the printable /support/report
 * compute from exactly the same code and cannot drift apart.
 *
 * Every day bucket is keyed in Australia/Sydney. This is load-bearing, not
 * cosmetic: the export timestamps are UTC, and bucketing by UTC date reads 253
 * tickets for 1–5 Aug where the business counts 260, and 1,095 for July where
 * the business counts 1,098.
 *
 * Medians and percentiles are computed over tickets that actually carry the
 * measurement. Zendesk records a resolution time on 3,118 of 3,309 tickets and a
 * first-response time on only 628, so zero-filling the gaps would report a
 * near-zero median first response on almost every window.
 */

type Row = Record<string, unknown>

/* ─── Channels ────────────────────────────────────────────────────────── */

export type ChannelGroup = 'messaging' | 'email' | 'web_other'

/** Channels the business counts as messaging, per the report's own footnote. */
const MESSAGING_CHANNELS = new Set([
  'whatsapp',
  'sms',
  'native_messaging',
  'instagram_dm',
  'sunshine_conversations_facebook_messenger',
])

export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  native_messaging: 'Native messaging',
  instagram_dm: 'Instagram DM',
  sunshine_conversations_facebook_messenger: 'Messenger',
  email: 'Email',
  web: 'Web form',
  phone: 'Phone',
  api: 'API',
}

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel
}

export function channelGroup(channel: string): ChannelGroup {
  if (MESSAGING_CHANNELS.has(channel)) return 'messaging'
  if (channel === 'email') return 'email'
  return 'web_other'
}

export const CHANNEL_GROUP_LABELS: Record<ChannelGroup, string> = {
  messaging: 'Messaging',
  email: 'Email',
  web_other: 'Web & other',
}

/**
 * Display order for channel breakdowns — messaging channels first (that's where
 * the volume shift is), then email, then the rest.
 */
export const CHANNEL_ORDER = [
  'whatsapp',
  'sms',
  'native_messaging',
  'instagram_dm',
  'sunshine_conversations_facebook_messenger',
  'email',
  'web',
  'phone',
  'api',
]

/* ─── Status ──────────────────────────────────────────────────────────── */

/** Statuses that mean the ticket is still with the team. */
const OPEN_STATUSES = new Set(['open', 'pending', 'new', 'hold'])

export function isStillOpen(row: Row): boolean {
  return OPEN_STATUSES.has(String(row.status ?? '').toLowerCase())
}

/* ─── Filtering ───────────────────────────────────────────────────────── */

/**
 * Tickets created inside a range, compared on Sydney calendar days. The range's
 * own endpoints are read from their local calendar fields — they came from the
 * date picker as whole days, so no conversion applies to them.
 */
export function ticketsInRange(rows: Row[], range: DateRange): Row[] {
  const from = localDayKey(range.start)
  const to = localDayKey(range.end)
  return rows.filter(r => {
    const key = sydneyDayKey(String(r.created_at ?? ''))
    return key !== '' && key >= from && key <= to
  })
}

/* ─── Response-time statistics ────────────────────────────────────────── */

export interface ResponseStat {
  tickets: number
  resolved: number
  stillOpen: number
  medianResolutionHours: number | null
  p90ResolutionHours: number | null
  medianFirstResponseHours: number | null
  /** How many of these tickets carry a first-response time at all. */
  firstResponseCount: number
  /** firstResponseCount / tickets — the report footnotes this at ~6%. */
  firstResponseCoverage: number | null
}

export function responseStat(rows: Row[]): ResponseStat {
  const resolutionHours = finiteValues(rows.map(r => r.resolution_hours))
  const firstResponseHours = finiteValues(rows.map(r => r.first_response_hours))
  return {
    tickets: rows.length,
    resolved: resolutionHours.length,
    stillOpen: rows.filter(isStillOpen).length,
    medianResolutionHours: median(resolutionHours),
    p90ResolutionHours: percentile(resolutionHours, 90),
    medianFirstResponseHours: median(firstResponseHours),
    firstResponseCount: firstResponseHours.length,
    firstResponseCoverage: rows.length > 0 ? firstResponseHours.length / rows.length : null,
  }
}

/* ─── Window summary ──────────────────────────────────────────────────── */

export interface ChannelStat {
  channel: string
  label: string
  group: ChannelGroup
  count: number
  /** Share of the window's total tickets. */
  share: number | null
  response: ResponseStat
}

export interface QueueStat {
  queue: string
  count: number
  share: number | null
  medianResolutionHours: number | null
  stillOpen: number
}

export interface WindowMetrics {
  range: DateRange
  total: number
  dayCount: number
  perDay: number
  byChannel: ChannelStat[]
  byGroup: Record<ChannelGroup, number>
  /** Messaging as a share of all inbound. */
  messagingShare: number | null
  byQueue: QueueStat[]
  stillOpen: number
  response: ResponseStat
}

export function windowMetrics(allRows: Row[], range: DateRange): WindowMetrics {
  const rows = ticketsInRange(allRows, range)
  const days = eachDay(range).length

  // Channels
  const byChannelMap = new Map<string, Row[]>()
  for (const r of rows) {
    const ch = String(r.channel ?? 'unknown').toLowerCase()
    const g = byChannelMap.get(ch)
    if (g) g.push(r)
    else byChannelMap.set(ch, [r])
  }

  const byChannel: ChannelStat[] = Array.from(byChannelMap.entries()).map(([channel, chRows]) => ({
    channel,
    label: channelLabel(channel),
    group: channelGroup(channel),
    count: chRows.length,
    share: rows.length > 0 ? chRows.length / rows.length : null,
    response: responseStat(chRows),
  }))

  const rank = (c: string) => {
    const i = CHANNEL_ORDER.indexOf(c)
    return i === -1 ? CHANNEL_ORDER.length : i
  }
  byChannel.sort((a, b) => rank(a.channel) - rank(b.channel))

  const byGroup: Record<ChannelGroup, number> = { messaging: 0, email: 0, web_other: 0 }
  for (const c of byChannel) byGroup[c.group] += c.count

  // Queues
  const byQueueMap = new Map<string, Row[]>()
  for (const r of rows) {
    // Blank group_name is a real state in the export (28 rows), not an error.
    const q = String(r.group_name ?? '').trim() || 'Unassigned'
    const g = byQueueMap.get(q)
    if (g) g.push(r)
    else byQueueMap.set(q, [r])
  }
  const byQueue: QueueStat[] = Array.from(byQueueMap.entries())
    .map(([queue, qRows]) => ({
      queue,
      count: qRows.length,
      share: rows.length > 0 ? qRows.length / rows.length : null,
      medianResolutionHours: median(finiteValues(qRows.map(r => r.resolution_hours))),
      stillOpen: qRows.filter(isStillOpen).length,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    range,
    total: rows.length,
    dayCount: days,
    perDay: days > 0 ? rows.length / days : 0,
    byChannel,
    byGroup,
    messagingShare: rows.length > 0 ? byGroup.messaging / rows.length : null,
    byQueue,
    stillOpen: rows.filter(isStillOpen).length,
    response: responseStat(rows),
  }
}

/* ─── Series ──────────────────────────────────────────────────────────── */

/** Tickets created per Sydney day across a range. Days with none produce 0. */
export function dailyVolume(allRows: Row[], range: DateRange): { date: string; value: number }[] {
  const counts = new Map<string, number>()
  for (const r of allRows) {
    const key = sydneyDayKey(String(r.created_at ?? ''))
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return eachDay(range).map(d => {
    const key = localDayKey(d)
    return { date: key, value: counts.get(key) ?? 0 }
  })
}

/**
 * Tickets created per Sydney month, across every month present in the data.
 * This is the Feb→Aug strip on page 2 of Dan's report.
 */
export function monthlyVolume(allRows: Row[]): { month: string; label: string; value: number }[] {
  const counts = new Map<string, number>()
  for (const r of allRows) {
    const key = sydneyDayKey(String(r.created_at ?? '')).slice(0, 7)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, value]) => ({ month, label: monthLabel(month), value }))
}

/* ─── Comparisons ─────────────────────────────────────────────────────── */

export interface ChannelComparison {
  channel: string
  label: string
  group: ChannelGroup
  current: number
  comparison: number
  /** Percentage change, null when the comparison window had none. */
  deltaPct: number | null
}

/**
 * Per-channel volume in the current window against a comparison window. Channels
 * present in either window appear, so a channel that has just appeared (or just
 * gone quiet) is still visible.
 */
export function channelComparison(current: WindowMetrics, comparison: WindowMetrics): ChannelComparison[] {
  const cur = new Map(current.byChannel.map(c => [c.channel, c.count]))
  const cmp = new Map(comparison.byChannel.map(c => [c.channel, c.count]))
  const channels = new Set<string>(Array.from(cur.keys()).concat(Array.from(cmp.keys())))

  const rank = (c: string) => {
    const i = CHANNEL_ORDER.indexOf(c)
    return i === -1 ? CHANNEL_ORDER.length : i
  }

  return Array.from(channels)
    .sort((a, b) => rank(a) - rank(b))
    .map(channel => {
      const c = cur.get(channel) ?? 0
      const p = cmp.get(channel) ?? 0
      return {
        channel,
        label: channelLabel(channel),
        group: channelGroup(channel),
        current: c,
        comparison: p,
        deltaPct: p === 0 ? null : ((c - p) / p) * 100,
      }
    })
}

/**
 * Per-channel response times for both windows side by side — the table on page 4
 * of Dan's report.
 */
export interface ResponseComparison {
  channel: string
  label: string
  current: ResponseStat
  comparison: ResponseStat
}

export function responseComparison(
  current: WindowMetrics,
  comparison: WindowMetrics,
  channels?: string[],
): ResponseComparison[] {
  const cur = new Map(current.byChannel.map(c => [c.channel, c.response]))
  const cmp = new Map(comparison.byChannel.map(c => [c.channel, c.response]))

  const wanted = channels ?? Array.from(
    new Set<string>(Array.from(cur.keys()).concat(Array.from(cmp.keys())))
  ).sort((a, b) => {
    const rank = (c: string) => {
      const i = CHANNEL_ORDER.indexOf(c)
      return i === -1 ? CHANNEL_ORDER.length : i
    }
    return rank(a) - rank(b)
  })

  const empty = responseStat([])
  return wanted.map(channel => ({
    channel,
    label: channelLabel(channel),
    current: cur.get(channel) ?? empty,
    comparison: cmp.get(channel) ?? empty,
  }))
}

/* ─── Backlog ─────────────────────────────────────────────────────────── */

export interface BacklogBucket {
  label: string
  count: number
}

/**
 * Still-open tickets by age, across the whole dataset rather than the selected
 * window — an old open ticket is a problem regardless of which window you are
 * looking at. `asOf` should be the export's latest timestamp, not now, so the
 * ages don't drift as the file gets stale.
 */
export function openBacklogByAge(allRows: Row[], asOf: Date): BacklogBucket[] {
  const buckets: BacklogBucket[] = [
    { label: '< 24h', count: 0 },
    { label: '1–3 days', count: 0 },
    { label: '4–7 days', count: 0 },
    { label: '1–2 weeks', count: 0 },
    { label: '> 2 weeks', count: 0 },
  ]
  for (const r of allRows) {
    if (!isStillOpen(r)) continue
    const t = new Date(String(r.created_at ?? '')).getTime()
    if (isNaN(t)) continue
    const hours = (asOf.getTime() - t) / 3_600_000
    if (hours < 24) buckets[0].count += 1
    else if (hours < 24 * 4) buckets[1].count += 1
    else if (hours < 24 * 8) buckets[2].count += 1
    else if (hours < 24 * 15) buckets[3].count += 1
    else buckets[4].count += 1
  }
  return buckets
}

/** Latest created_at in the dataset — the export's own "as of". */
export function latestTicketAt(allRows: Row[]): Date | null {
  let max = 0
  for (const r of allRows) {
    const t = new Date(String(r.created_at ?? '')).getTime()
    if (!isNaN(t) && t > max) max = t
  }
  return max > 0 ? new Date(max) : null
}

/* ─── Formatting ──────────────────────────────────────────────────────── */

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  const idx = parseInt(m, 10) - 1
  if (!y || isNaN(idx) || idx < 0 || idx > 11) return month
  return `${MONTH_ABBR[idx]} ${y.slice(2)}`
}

/** "16.6h" / "<0.1h" / "—". Hours, one decimal, matching the report. */
export function fmtHours(h: number | null): string {
  if (h === null) return '—'
  if (h > 0 && h < 0.1) return '<0.1h'
  return `${h.toFixed(1)}h`
}

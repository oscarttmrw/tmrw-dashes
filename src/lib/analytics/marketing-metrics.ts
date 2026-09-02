import { localDayKey, type DateRange } from '@/lib/utils/period'

/**
 * Paid-acquisition analytics across the three sources that describe one funnel:
 *
 *   meta_ads        spend, impressions, clicks, leads, landing-page views
 *   marketing_daily calls booked/held/closed off the Slack notifications, and
 *                   the landing/checkout funnel off PostHog
 *   ghl_opportunities  the CRM fallback for calls booked and held
 *
 * Meta knows what it spent and how many leads it bought. It does not know how
 * many discovery calls a clinician actually logged, held, or closed — so a metric
 * like cost per call booked needs both sides, and which side supplied the number
 * changes what it means. Every such figure therefore carries its source, and the
 * UI states it, because Meta's attributed bookings and Slack's logged calls count
 * different things.
 *
 * Missing stays null, never 0. A zero for cart starts would read as "nobody
 * started a checkout" when the truth is that it isn't instrumented.
 */

type Row = Record<string, unknown>

/* ─── Sourced values ──────────────────────────────────────────────────── */

export type MetricSource = 'slack' | 'meta' | 'ghl' | 'posthog'

export interface Sourced {
  value: number | null
  source: MetricSource | null
}

export const NOT_INSTRUMENTED: Sourced = { value: null, source: null }

export const SOURCE_LABELS: Record<MetricSource, string> = {
  slack: 'Slack',
  meta: 'Meta',
  ghl: 'GHL',
  posthog: 'PostHog',
}

/** First candidate with a real value wins. */
function preferred(...candidates: Sourced[]): Sourced {
  for (const c of candidates) {
    if (c.value !== null) return c
  }
  return NOT_INSTRUMENTED
}

/* ─── Call lifecycle stages (GHL fallback) ────────────────────────────── */

/** Booked = any record that reached a call stage at all. */
export const CALL_STAGES_BOOKED = new Set([
  'Call Booked', 'No Show', 'Call Attended', 'Won', 'Cancelled', 'Rescheduled',
])
/** Held = the stages that imply the call actually happened. */
export const CALL_STAGES_HELD = new Set(['Call Attended', 'Won'])

/* ─── Window aggregation ──────────────────────────────────────────────── */

export interface MarketingWindow {
  range: DateRange
  dayCount: number

  // Meta spend side
  spend: number
  impressions: number
  clicks: number
  ctr: number | null
  linkCtr: number | null
  leads: number
  costPerLead: number | null
  landingPageViews: number
  costPerLandingPageView: number | null

  // Calls — both readings kept, plus the preferred one and where it came from
  callsBookedMeta: Sourced
  callsBookedSlack: Sourced
  callsBooked: Sourced
  costPerCallBooked: number | null
  callsHeld: Sourced
  showRate: number | null
  closes: Sourced
  closeRateOfHeld: number | null
  costPerClose: number | null

  // Signups
  signups: Sourced
  signupsExpected: Sourced

  // PostHog funnel
  landingCheckoutViews: Sourced
  checkoutCartViews: Sourced
  costPerLandingCheckoutView: number | null
  cartStarts: Sourced
  checkoutAbandonments: Sourced
  conversions: Sourced
  blendedCostPerConversion: number | null
}

function inRangeDay(value: unknown, range: DateRange): boolean {
  const d = String(value ?? '').slice(0, 10)
  if (!d) return false
  return d >= localDayKey(range.start) && d <= localDayKey(range.end)
}

/** Sum a column across rows, returning null when no row carries a value. */
function sumOrNull(rows: Row[], key: string): number | null {
  let total = 0
  let seen = false
  for (const r of rows) {
    const v = r[key]
    if (v === null || v === undefined || v === '') continue
    const n = Number(v)
    if (!isFinite(n)) continue
    total += n
    seen = true
  }
  return seen ? total : null
}

function sum(rows: Row[], key: string): number {
  return sumOrNull(rows, key) ?? 0
}

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null
  return numerator / denominator
}

export function marketingWindow(
  metaRows: Row[],
  dailyRows: Row[],
  ghlRows: Row[],
  range: DateRange,
): MarketingWindow {
  const meta = metaRows.filter(r => inRangeDay(r.date, range))
  const daily = dailyRows.filter(r => inRangeDay(r.date, range))

  const spend = sum(meta, 'spend')
  const impressions = sum(meta, 'impressions')
  const clicks = sum(meta, 'clicks')
  const leads = sum(meta, 'conversions_leads')
  const landingPageViews = sum(meta, 'landing_page_views')

  // GHL fallback: count opportunities created in the window whose stage implies
  // a booked / held call.
  const ghlInRange = ghlRows.filter(r => {
    const t = new Date(String(r.created_on ?? '')).getTime()
    if (isNaN(t)) return false
    return t >= range.start.getTime() && t <= range.end.getTime()
  })
  const ghlBooked = ghlInRange.filter(r => CALL_STAGES_BOOKED.has(String(r.stage ?? ''))).length
  const ghlHeld = ghlInRange.filter(r => CALL_STAGES_HELD.has(String(r.stage ?? ''))).length

  const callsBookedSlack: Sourced = withSource(sumOrNull(daily, 'calls_booked_slack'), 'slack')
  const callsBookedMeta: Sourced = preferred(
    withSource(sumOrNull(daily, 'calls_booked_meta'), 'meta'),
    // Meta's custom conversion is the closest thing the ad platform reports.
    withSource(sumOrNull(meta, 'pixel_custom_conversions'), 'meta'),
  )

  // Slack first: it counts every call a clinician logged, which is the number
  // the team works from. Meta's attributed figure is the fallback, GHL last.
  const callsBooked = preferred(
    callsBookedSlack,
    callsBookedMeta,
    withSource(ghlInRange.length > 0 ? ghlBooked : null, 'ghl'),
  )

  const callsHeld = preferred(
    withSource(sumOrNull(daily, 'calls_held'), 'slack'),
    withSource(ghlInRange.length > 0 ? ghlHeld : null, 'ghl'),
  )

  const closes = preferred(
    withSource(sumOrNull(daily, 'closes'), 'slack'),
    withSource(
      ghlInRange.length > 0
        ? ghlInRange.filter(r => String(r.status ?? '').toLowerCase() === 'won').length
        : null,
      'ghl',
    ),
  )

  const landingCheckoutViews = withSource(sumOrNull(daily, 'landing_checkout_views'), 'posthog')
  const conversions = withSource(sumOrNull(daily, 'conversions'), 'posthog')

  return {
    range,
    dayCount: dayCountOf(range),

    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    // The warehouse extract's own CTR column is a weighted per-ad figure; recompute
    // across the window so it stays correct when rows are summed.
    linkCtr: impressions > 0 ? (clicks / impressions) * 100 : null,
    leads,
    costPerLead: leads > 0 ? spend / leads : null,
    landingPageViews,
    costPerLandingPageView: landingPageViews > 0 ? spend / landingPageViews : null,

    callsBookedMeta,
    callsBookedSlack,
    callsBooked,
    costPerCallBooked: ratio(spend, callsBooked.value),
    callsHeld,
    showRate: ratio(callsHeld.value, callsBooked.value),
    closes,
    closeRateOfHeld: ratio(closes.value, callsHeld.value),
    costPerClose: ratio(spend, closes.value),

    signups: withSource(sumOrNull(daily, 'signups'), 'slack'),
    signupsExpected: withSource(sumOrNull(daily, 'signups_expected'), 'slack'),

    landingCheckoutViews,
    checkoutCartViews: withSource(sumOrNull(daily, 'checkout_cart_views'), 'posthog'),
    costPerLandingCheckoutView: ratio(spend, landingCheckoutViews.value),
    cartStarts: withSource(sumOrNull(daily, 'cart_starts'), 'posthog'),
    checkoutAbandonments: withSource(sumOrNull(daily, 'checkout_abandonments'), 'posthog'),
    conversions,
    blendedCostPerConversion: ratio(spend, conversions.value),
  }
}

function withSource(value: number | null, source: MetricSource): Sourced {
  return value === null ? NOT_INSTRUMENTED : { value, source }
}

function dayCountOf(range: DateRange): number {
  const ms = new Date(range.end).setHours(0, 0, 0, 0) - new Date(range.start).setHours(0, 0, 0, 0)
  return Math.round(ms / 86_400_000) + 1
}

/* ─── Campaign breakdown ──────────────────────────────────────────────── */

export interface CampaignStat {
  campaign: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  costPerLead: number | null
  ctr: number | null
  shareOfSpend: number | null
}

/**
 * Per-campaign performance. Only possible with the warehouse extract — the
 * day-level sheet has no campaign column, in which case this returns an empty
 * list and the caller can say so.
 */
export function campaignBreakdown(metaRows: Row[], range: DateRange): CampaignStat[] {
  const inRange = metaRows.filter(r => inRangeDay(r.date, range) && r.campaign_name)
  if (inRange.length === 0) return []

  const groups = new Map<string, Row[]>()
  for (const r of inRange) {
    const name = String(r.campaign_name)
    const g = groups.get(name)
    if (g) g.push(r)
    else groups.set(name, [r])
  }

  const totalSpend = inRange.reduce((s, r) => s + Number(r.spend ?? 0), 0)

  return Array.from(groups.entries())
    .map(([campaign, rows]) => {
      const spend = sum(rows, 'spend')
      const impressions = sum(rows, 'impressions')
      const clicks = sum(rows, 'clicks')
      const leads = sum(rows, 'conversions_leads')
      return {
        campaign,
        spend,
        impressions,
        clicks,
        leads,
        costPerLead: leads > 0 ? spend / leads : null,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
        shareOfSpend: totalSpend > 0 ? spend / totalSpend : null,
      }
    })
    .sort((a, b) => b.spend - a.spend)
}

/* ─── Monthly detail ──────────────────────────────────────────────────── */

export interface MonthlyMarketingRow {
  month: string
  label: string
  window: MarketingWindow
}

/** One MarketingWindow per calendar month present in the Meta data. */
export function monthlyMarketing(
  metaRows: Row[],
  dailyRows: Row[],
  ghlRows: Row[],
): MonthlyMarketingRow[] {
  const months = new Set<string>()
  for (const r of metaRows) {
    const m = String(r.date ?? '').slice(0, 7)
    if (m) months.add(m)
  }
  for (const r of dailyRows) {
    const m = String(r.date ?? '').slice(0, 7)
    if (m) months.add(m)
  }

  return Array.from(months)
    .sort()
    .map(month => {
      const y = Number(month.slice(0, 4))
      const mm = Number(month.slice(5, 7))
      const range: DateRange = {
        start: new Date(y, mm - 1, 1, 0, 0, 0, 0),
        end: new Date(y, mm, 0, 23, 59, 59, 999),
      }
      return {
        month,
        label: monthLabel(month),
        window: marketingWindow(metaRows, dailyRows, ghlRows, range),
      }
    })
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  const idx = parseInt(m, 10) - 1
  if (!y || isNaN(idx) || idx < 0 || idx > 11) return month
  return `${MONTH_ABBR[idx]} ${y.slice(2)}`
}

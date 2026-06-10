/**
 * Pulse metrics engine.
 *
 * Pure functions that aggregate the canonical Supabase row arrays
 * (CanonicalRow = Record<string, unknown>) into typed, period-scoped
 * metric bundles. Every page in the Pulse experience computes from here
 * so the numbers always agree with each other.
 */

import type { CanonicalRow } from '@/lib/context/data-context'

export interface Period {
  start: Date
  end: Date
}

/* ─── Primitives ──────────────────────────────────────────────────── */

export function num(v: unknown): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,$%]/g, ''))
  return isNaN(n) ? 0 : n
}

export function inPeriod(value: unknown, p: Period): boolean {
  if (!value) return false
  const t = new Date(String(value)).getTime()
  if (isNaN(t)) return false
  return t >= p.start.getTime() && t <= p.end.getTime()
}

export function rowsIn(rows: CanonicalRow[], dateKey: string, p: Period): CanonicalRow[] {
  return rows.filter(r => inPeriod(r[dateKey], p))
}

export function deltaPct(current: number, previous: number): number | null {
  if (!isFinite(previous) || previous === 0) return null
  return ((current - previous) / previous) * 100
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

const dayMs = 86_400_000

export function daysBetween(a: unknown, b: unknown): number | null {
  if (!a || !b) return null
  const t0 = new Date(String(a)).getTime()
  const t1 = new Date(String(b)).getTime()
  if (isNaN(t0) || isNaN(t1)) return null
  const d = (t1 - t0) / dayMs
  return d < 0 ? null : d
}

export function periodDays(p: Period): number {
  return Math.max(1, Math.round((p.end.getTime() - p.start.getTime()) / dayMs))
}

/** Sum one or more numeric columns across rows grouped per day, gap-filled. */
export function dailySeries(
  rows: CanonicalRow[],
  dateKey: string,
  valueKeys: string[],
  p: Period
): Record<string, number | string>[] {
  const byDay = new Map<string, Record<string, number>>()
  for (const r of rows) {
    if (!inPeriod(r[dateKey], p)) continue
    const day = new Date(String(r[dateKey])).toISOString().slice(0, 10)
    const bucket = byDay.get(day) ?? {}
    for (const k of valueKeys) bucket[k] = (bucket[k] ?? 0) + num(r[k])
    byDay.set(day, bucket)
  }
  const out: Record<string, number | string>[] = []
  const cursor = new Date(p.start)
  while (cursor.getTime() <= p.end.getTime()) {
    const day = cursor.toISOString().slice(0, 10)
    const bucket = byDay.get(day) ?? {}
    const row: Record<string, number | string> = { date: day }
    for (const k of valueKeys) row[k] = bucket[k] ?? 0
    out.push(row)
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

/** Collapse a daily series into ≤ maxPoints buckets (for sparklines). */
export function sparkValues(
  series: Record<string, number | string>[],
  key: string,
  maxPoints = 30
): number[] {
  const vals = series.map(r => num(r[key]))
  if (vals.length <= maxPoints) return vals
  const bucketSize = Math.ceil(vals.length / maxPoints)
  const out: number[] = []
  for (let i = 0; i < vals.length; i += bucketSize) {
    out.push(vals.slice(i, i + bucketSize).reduce((s, v) => s + v, 0))
  }
  return out
}

/* ─── Meta Ads ────────────────────────────────────────────────────── */

export interface MetaAgg {
  spend: number
  impressions: number
  clicks: number
  lpv: number
  leads: number
  videoViews: number
  engagements: number
  ctr: number
  cpm: number
  cpl: number
  costPerLpv: number
  activeDays: number
}

export function aggMeta(rows: CanonicalRow[], p: Period): MetaAgg {
  let spend = 0, impressions = 0, clicks = 0, lpv = 0, leads = 0
  let videoViews = 0, engagements = 0, activeDays = 0
  for (const r of rows) {
    if (!inPeriod(r.date, p)) continue
    activeDays++
    spend += num(r.spend)
    impressions += num(r.impressions)
    clicks += num(r.clicks)
    lpv += num(r.landing_page_views)
    leads += num(r.conversions_leads)
    videoViews += num(r.video_views)
    engagements += num(r.post_engagements)
  }
  return {
    spend, impressions, clicks, lpv, leads, videoViews, engagements, activeDays,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpl: leads > 0 ? spend / leads : 0,
    costPerLpv: lpv > 0 ? spend / lpv : 0,
  }
}

/* ─── GHL calls (consult pipeline) ────────────────────────────────── */

const CALL_STAGES_BOOKED = new Set(['Call Booked', 'No Show', 'Call Attended', 'Won', 'Cancelled', 'Rescheduled'])
const CALL_STAGES_HELD = new Set(['Call Attended', 'Won'])

export interface CallsAgg {
  booked: number
  held: number
  won: number
  showRate: number
  closeRate: number
}

export function aggCalls(rows: CanonicalRow[], p: Period): CallsAgg {
  let booked = 0, held = 0, won = 0
  for (const r of rows) {
    if (!inPeriod(r.created_on, p)) continue
    const stage = String(r.stage ?? '')
    if (CALL_STAGES_BOOKED.has(stage)) booked++
    if (CALL_STAGES_HELD.has(stage)) held++
    if (String(r.status ?? '').toLowerCase() === 'won') won++
  }
  return {
    booked, held, won,
    showRate: booked > 0 ? (held / booked) * 100 : 0,
    closeRate: held > 0 ? (won / held) * 100 : 0,
  }
}

/* ─── Operational data ────────────────────────────────────────────── */

export interface OpsAgg {
  registered: number
  churned: number
  podsCreated: number
  podsDispatched: number
  /** Latest casebook total at or before period end (cumulative gauge). */
  casebook: number
  netGrowth: number
}

export function aggOps(rows: CanonicalRow[], p: Period): OpsAgg {
  let registered = 0, churned = 0, podsCreated = 0, podsDispatched = 0
  let casebook = 0
  let casebookDate = ''
  for (const r of rows) {
    if (inPeriod(r.date, p)) {
      registered += num(r.customers_registered)
      churned += num(r.churned_members)
      podsCreated += num(r.pod_created)
      podsDispatched += num(r.pod_dispatched)
    }
    // casebook is a cumulative snapshot — take the newest reading ≤ period end
    const d = r.date ? String(r.date).slice(0, 10) : ''
    if (d && new Date(d).getTime() <= p.end.getTime() && d > casebookDate && num(r.total_casebook) > 0) {
      casebookDate = d
      casebook = num(r.total_casebook)
    }
  }
  return { registered, churned, podsCreated, podsDispatched, casebook, netGrowth: registered - churned }
}

/* ─── Financial revenue (net / gross sheets) ──────────────────────── */

export const REVENUE_STREAMS = [
  { key: 'membership', label: 'Membership' },
  { key: 'joining_fees', label: 'Joining Fees' },
  { key: 'tmrw_stacks', label: 'TMRW Stacks' },
  { key: 'supplements', label: 'Supplements' },
  { key: 'peptides', label: 'Peptides' },
  { key: 'advanced_tests', label: 'Advanced Tests' },
] as const

export interface RevenueAgg {
  total: number
  byStream: { key: string; label: string; value: number; share: number }[]
  recurring: number       // membership
  nonRecurring: number    // everything else
  recurringShare: number
  activeDays: number
}

export function revenueRows(rows: CanonicalRow[], type: 'net' | 'gross'): CanonicalRow[] {
  return rows.filter(r => String(r.revenue_type ?? '') === type)
}

export function aggRevenue(rows: CanonicalRow[], p: Period, type: 'net' | 'gross' = 'net'): RevenueAgg {
  const scoped = revenueRows(rows, type)
  let total = 0
  let activeDays = 0
  const sums: Record<string, number> = {}
  for (const r of scoped) {
    if (!inPeriod(r.date, p)) continue
    activeDays++
    total += num(r.total)
    for (const s of REVENUE_STREAMS) sums[s.key] = (sums[s.key] ?? 0) + num(r[s.key])
  }
  const byStream = REVENUE_STREAMS.map(s => ({
    key: s.key,
    label: s.label,
    value: sums[s.key] ?? 0,
    share: total > 0 ? ((sums[s.key] ?? 0) / total) * 100 : 0,
  }))
  const recurring = sums.membership ?? 0
  return {
    total, byStream, recurring, activeDays,
    nonRecurring: total - recurring,
    recurringShare: total > 0 ? (recurring / total) * 100 : 0,
  }
}

/* ─── Stripe invoices ─────────────────────────────────────────────── */

export interface StripeAgg {
  paid: number
  invoices: number
  newBusiness: number     // billing_reason = subscription_create
  renewals: number        // billing_reason = subscription_cycle / subscription_update
  other: number
  renewalShare: number
  avgInvoice: number
}

export function aggStripe(rows: CanonicalRow[], p: Period): StripeAgg {
  let paid = 0, invoices = 0, newBusiness = 0, renewals = 0, other = 0
  for (const r of rows) {
    if (!inPeriod(r.created, p)) continue
    const amount = num(r.amount_paid)
    if (amount <= 0) continue
    invoices++
    paid += amount
    const reason = String(r.billing_reason ?? '').toLowerCase()
    if (reason === 'subscription_create') newBusiness += amount
    else if (reason.startsWith('subscription')) renewals += amount
    else other += amount
  }
  return {
    paid, invoices, newBusiness, renewals, other,
    renewalShare: paid > 0 ? (renewals / paid) * 100 : 0,
    avgInvoice: invoices > 0 ? paid / invoices : 0,
  }
}

/* ─── HubSpot contacts — member journey ───────────────────────────── */

export interface JourneyStageCount {
  key: string
  label: string
  /** Contacts that reached this stage within the period. */
  inPeriod: number
  /** Contacts that have ever reached this stage. */
  allTime: number
}

export interface JourneyAgg {
  stages: JourneyStageCount[]
  /** Median days from becoming a customer to dashboard unlocked (all-time, unlocked only). */
  medianDaysToUnlock: number | null
  /** Same but contacts whose unlock happened in the period. */
  medianDaysToUnlockInPeriod: number | null
  churnedInPeriod: number
  churnedAllTime: number
  activeMembers: number
  unlockRate: number
}

const JOURNEY_STAGES: { key: string; label: string; dateCol: string }[] = [
  { key: 'customer', label: 'Member joined', dateCol: 'customer_entered_at' },
  { key: 'health_story', label: 'Health story', dateCol: 'health_story_completed_date' },
  { key: 'blood_draw', label: 'Blood draw', dateCol: 'blood_draw_date' },
  { key: 'results', label: 'Results ready', dateCol: 'results_available_date' },
  { key: 'unlocked', label: 'Dashboard unlocked', dateCol: 'dashboard_unlocked_date' },
]

export function aggJourney(rows: CanonicalRow[], p: Period): JourneyAgg {
  const customers = rows.filter(r => r.customer_entered_at)
  const stages: JourneyStageCount[] = JOURNEY_STAGES.map(s => ({
    key: s.key,
    label: s.label,
    inPeriod: customers.filter(r => inPeriod(r[s.dateCol], p)).length,
    allTime: customers.filter(r => Boolean(r[s.dateCol])).length,
  }))

  const unlockDays: number[] = []
  const unlockDaysInPeriod: number[] = []
  for (const r of customers) {
    const d = daysBetween(r.customer_entered_at, r.dashboard_unlocked_date)
    if (d === null) continue
    unlockDays.push(d)
    if (inPeriod(r.dashboard_unlocked_date, p)) unlockDaysInPeriod.push(d)
  }

  const churnedAllTime = customers.filter(r => Boolean(r.churn_date)).length
  const unlocked = stages.find(s => s.key === 'unlocked')?.allTime ?? 0
  const joined = stages.find(s => s.key === 'customer')?.allTime ?? 0

  return {
    stages,
    medianDaysToUnlock: median(unlockDays),
    medianDaysToUnlockInPeriod: median(unlockDaysInPeriod),
    churnedInPeriod: customers.filter(r => inPeriod(r.churn_date, p)).length,
    churnedAllTime,
    activeMembers: joined - churnedAllTime,
    unlockRate: joined > 0 ? (unlocked / joined) * 100 : 0,
  }
}

/* ─── Zendesk — member care ───────────────────────────────────────── */

export interface CareAgg {
  created: number
  open: number
  medianFirstReplyMins: number | null
  medianResolutionMins: number | null
  csatGood: number
  csatBad: number
  csatScore: number | null
}

export function aggCare(rows: CanonicalRow[], p: Period): CareAgg {
  const scoped = rows.filter(r => inPeriod(r.zendesk_created_at, p))
  const firstReplies: number[] = []
  const resolutions: number[] = []
  let open = 0, csatGood = 0, csatBad = 0
  for (const r of scoped) {
    const status = String(r.status ?? '').toLowerCase()
    if (status === 'open' || status === 'pending' || status === 'new') open++
    const fr = num(r.first_reply_time_minutes)
    if (fr > 0) firstReplies.push(fr)
    const res = num(r.full_resolution_time_minutes)
    if (res > 0) resolutions.push(res)
    const sat = String(r.satisfaction_score ?? '').toLowerCase()
    if (sat === 'good') csatGood++
    else if (sat === 'bad') csatBad++
  }
  const rated = csatGood + csatBad
  return {
    created: scoped.length,
    open,
    medianFirstReplyMins: median(firstReplies),
    medianResolutionMins: median(resolutions),
    csatGood, csatBad,
    csatScore: rated > 0 ? (csatGood / rated) * 100 : null,
  }
}

/* ─── Social ──────────────────────────────────────────────────────── */

export interface SocialAgg {
  followers: { platform: string; count: number }[]
  totalFollowers: number
  views: number
}

const FOLLOWER_PLATFORMS: { label: string; aliases: string[] }[] = [
  { label: 'Instagram', aliases: ['instagram (tmrw)', 'instagram'] },
  { label: 'Facebook', aliases: ['facebook (tmrw)', 'facebook'] },
  { label: 'LinkedIn', aliases: ['linkedin (tmrw)', 'linkedin'] },
]

export function aggSocial(followerRows: CanonicalRow[], viewRows: CanonicalRow[], p: Period): SocialAgg {
  // Followers are snapshots — take the latest reading per platform.
  const followers = FOLLOWER_PLATFORMS.map(({ label, aliases }) => {
    let latest = ''
    let count = 0
    for (const r of followerRows) {
      const platform = String(r.platform ?? '').toLowerCase().trim()
      if (!aliases.includes(platform)) continue
      const d = String(r.date ?? '')
      if (d >= latest) {
        latest = d
        count = num(r.followers)
      }
    }
    return { platform: label, count }
  })
  let views = 0
  for (const r of viewRows) {
    if (!inPeriod(r.date, p)) continue
    views += num(r.page_views) + num(r.video_views)
  }
  return {
    followers,
    totalFollowers: followers.reduce((s, f) => s + f.count, 0),
    views,
  }
}

/* ─── LTV (from plan targets, with fallback) ──────────────────────── */

export const LTV_FALLBACK = 3500

export function resolveLtv(planTargets: CanonicalRow[], p: Period): { ltv: number; fromSettings: boolean } {
  const endIso = p.end.toISOString().slice(0, 10)
  let best: { month: string; ltv: number } | null = null
  for (const r of planTargets) {
    const m = typeof r.month === 'string' ? r.month.slice(0, 10) : ''
    if (!m || m > endIso) continue
    const v = r.ltv_assumed
    if (v === null || v === undefined || v === '') continue
    const ltv = num(v)
    if (ltv <= 0) continue
    if (!best || m > best.month) best = { month: m, ltv }
  }
  return { ltv: best?.ltv ?? LTV_FALLBACK, fromSettings: best !== null }
}

/* ─── The whole business, one call ────────────────────────────────── */

export interface PulseSources {
  meta_ads: CanonicalRow[]
  ghl_opportunities: CanonicalRow[]
  operational_data: CanonicalRow[]
  financial_revenue: CanonicalRow[]
  stripe: CanonicalRow[]
  hubspot_contacts: CanonicalRow[]
  zendesk: CanonicalRow[]
  social_followers: CanonicalRow[]
  social_views: CanonicalRow[]
  plan_targets: CanonicalRow[]
}

export interface PulseSnapshot {
  meta: MetaAgg
  calls: CallsAgg
  ops: OpsAgg
  revenue: RevenueAgg
  revenueGross: RevenueAgg
  stripe: StripeAgg
  journey: JourneyAgg
  care: CareAgg
  social: SocialAgg
  ltv: number
  ltvFromSettings: boolean
  // Derived cross-source metrics
  cac: number              // meta spend / members registered
  ltvCacRatio: number | null
  mer: number | null       // marketing efficiency ratio = net revenue / spend
  revenuePerMember: number | null
  leadToMember: number | null // registered / leads %
  dailyRevenue: number
  dailySpend: number
}

export function buildSnapshot(src: PulseSources, p: Period): PulseSnapshot {
  const meta = aggMeta(src.meta_ads, p)
  const calls = aggCalls(src.ghl_opportunities, p)
  const ops = aggOps(src.operational_data, p)
  const revenue = aggRevenue(src.financial_revenue, p, 'net')
  const revenueGross = aggRevenue(src.financial_revenue, p, 'gross')
  const stripe = aggStripe(src.stripe, p)
  const journey = aggJourney(src.hubspot_contacts, p)
  const care = aggCare(src.zendesk, p)
  const social = aggSocial(src.social_followers, src.social_views, p)
  const { ltv, fromSettings } = resolveLtv(src.plan_targets, p)

  const cac = ops.registered > 0 ? meta.spend / ops.registered : 0
  const days = periodDays(p)

  return {
    meta, calls, ops, revenue, revenueGross, stripe, journey, care, social,
    ltv, ltvFromSettings: fromSettings,
    cac,
    ltvCacRatio: cac > 0 ? ltv / cac : null,
    mer: meta.spend > 0 ? revenue.total / meta.spend : null,
    revenuePerMember: ops.casebook > 0 ? revenue.total / ops.casebook : null,
    leadToMember: meta.leads > 0 ? (ops.registered / meta.leads) * 100 : null,
    dailyRevenue: revenue.total / days,
    dailySpend: meta.spend / days,
  }
}

/* ─── Pulse score — composite business health, 0–100 ─────────────── */

export interface PulseSubScore {
  key: string
  label: string
  score: number          // 0–100
  weight: number
  detail: string
}

export interface PulseScore {
  score: number
  subScores: PulseSubScore[]
}

/** Map a % delta to a 0–100 score centred on 50 (no change). */
function deltaScore(current: number, previous: number, invert = false): number {
  if (previous === 0) return current > 0 ? 75 : 50
  let d = ((current - previous) / previous) * 100
  if (invert) d = -d
  return Math.max(0, Math.min(100, 50 + d))
}

export function buildPulseScore(now: PulseSnapshot, prev: PulseSnapshot): PulseScore {
  const subScores: PulseSubScore[] = [
    {
      key: 'growth',
      label: 'Growth',
      weight: 0.3,
      score: deltaScore(now.ops.registered, prev.ops.registered),
      detail: `${now.ops.registered} members joined vs ${prev.ops.registered} previous period`,
    },
    {
      key: 'revenue',
      label: 'Revenue',
      weight: 0.3,
      score: deltaScore(now.revenue.total, prev.revenue.total),
      detail: `Net revenue vs previous period`,
    },
    {
      key: 'efficiency',
      label: 'Efficiency',
      weight: 0.2,
      score: now.cac === 0 || prev.cac === 0 ? 50 : deltaScore(now.cac, prev.cac, true),
      detail: `CAC trend — lower is better`,
    },
    {
      key: 'delivery',
      label: 'Delivery',
      weight: 0.1,
      score: deltaScore(now.journey.stages.find(s => s.key === 'unlocked')?.inPeriod ?? 0,
        prev.journey.stages.find(s => s.key === 'unlocked')?.inPeriod ?? 0),
      detail: `Dashboards unlocked vs previous period`,
    },
    {
      key: 'care',
      label: 'Member care',
      weight: 0.1,
      score: now.care.csatScore !== null ? now.care.csatScore
        : now.care.created === 0 ? 60
        : deltaScore(now.care.created, prev.care.created, true),
      detail: now.care.csatScore !== null ? `CSAT ${now.care.csatScore.toFixed(0)}%` : 'Ticket volume trend',
    },
  ]
  const score = subScores.reduce((s, x) => s + x.score * x.weight, 0)
  return { score: Math.round(score), subScores }
}

'use client'

import { useMemo, useState } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { TrendIndicator } from '@/components/dashboard/trend-indicator'
import { useDashboardData } from '@/lib/context/data-context'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridStyle, TMRW_COLORS } from '@/lib/utils/chart-styles'
import {
  DateRangePicker,
  defaultDateRangePicker,
  type DateRangePickerValue,
} from '@/components/dashboard/date-range-picker'
import { TileChart, bucketByDay } from '@/components/dashboard/tile-chart'
import { Lock } from 'lucide-react'

/* ─── Helpers ─────────────────────────────────────────────────────── */

const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return isNaN(n) ? 0 : n
}

const fmtNum = (n: number): string => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

const fmtCurrency = (n: number, opts: { compact?: boolean; digits?: number } = {}): string => {
  if (opts.compact && Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`
  }
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: opts.digits ?? 2, minimumFractionDigits: opts.digits ?? 2 })}`
}

const fmtPct = (n: number, digits = 2): string => `${n.toFixed(digits)}%`

function inPeriod(value: unknown, start: Date, end: Date): boolean {
  if (!value) return false
  const t = new Date(String(value)).getTime()
  if (isNaN(t)) return false
  return t >= start.getTime() && t <= end.getTime()
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

// Fallback LTV if no value has been entered in Settings → Plan Targets yet.
const LTV_FALLBACK = 3500

// Booked = any record with one of the call lifecycle stages set.
// Held   = the stages that imply the call actually happened.
// Closed = status='won'.
const CALL_STAGES_BOOKED = new Set(['Call Booked', 'No Show', 'Call Attended', 'Won', 'Cancelled', 'Rescheduled'])
const CALL_STAGES_HELD = new Set(['Call Attended', 'Won'])

// Follower tiles to render. Aliases support legacy data labelled without
// the "(TMRW)" suffix.
const FOLLOWER_PLATFORMS: { canonical: string; label: string; aliases: string[] }[] = [
  { canonical: 'Facebook (TMRW)',  label: 'Facebook',  aliases: ['Facebook (TMRW)', 'Facebook'] },
  { canonical: 'Instagram (TMRW)', label: 'Instagram', aliases: ['Instagram (TMRW)', 'Instagram'] },
  { canonical: 'LinkedIn (TMRW)',  label: 'LinkedIn',  aliases: ['LinkedIn (TMRW)', 'LinkedIn'] },
]

const PLATFORM_COLORS: Record<string, string> = {
  'Facebook (TMRW)':  '#1877F2',
  Facebook:           '#1877F2',
  'Instagram (TMRW)': '#E4405F',
  Instagram:          '#E4405F',
  'LinkedIn (TMRW)':  '#0A66C2',
  LinkedIn:           '#0A66C2',
}
const platformColor = (p: string) => PLATFORM_COLORS[p] ?? '#737373'

/* ─── Tiles ───────────────────────────────────────────────────────── */

interface KpiTileProps {
  label: string
  value: string
  sublabel?: string
  delta?: number | null
  direction?: 'higher-better' | 'lower-better'
  chart?: React.ReactNode
}

function KpiTile({ label, value, sublabel, delta, direction = 'higher-better', chart }: KpiTileProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-dash-border bg-dash-surface p-4">
      <p className="font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-mono text-2xl font-bold text-dash-text">{value}</p>
        {delta !== null && delta !== undefined && (
          <TrendIndicator value={Math.round(delta)} direction={direction} />
        )}
      </div>
      {chart && <div className="mt-3 mb-2">{chart}</div>}
      <div className="mt-auto pt-3 flex items-center justify-between text-[11px] text-dash-text-muted">
        {sublabel ? <span>{sublabel}</span> : <span />}
        {delta !== null && delta !== undefined && <span className="font-sans">vs previous</span>}
      </div>
    </div>
  )
}

function LockedKpiTile({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-dashed border-dash-border bg-dash-surface/40 p-4 opacity-80">
      <div className="flex items-start justify-between gap-2">
        <p className="font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">{label}</p>
        <Lock size={11} className="text-dash-text-muted" />
      </div>
      <div className="mt-2">
        <p className="font-mono text-2xl font-bold text-dash-text-muted">—</p>
      </div>
      <p className="mt-auto pt-3 font-sans text-[11px] italic text-dash-text-muted">{reason}</p>
    </div>
  )
}

/* ─── Funnel ──────────────────────────────────────────────────────── */

type FunnelTone = 'dark' | 'mid' | 'light' | 'red'

function FunnelChart({ rows }: { rows: { label: string; value: number; tone: FunnelTone }[] }) {
  const top = rows[0]?.value ?? 0
  const palette: Record<FunnelTone, { bg: string; text: string }> = {
    dark:  { bg: '#1A1A1A', text: '#FFFFFF' },
    mid:   { bg: '#737373', text: '#FFFFFF' },
    light: { bg: '#B8B5AE', text: '#1A1A1A' },
    red:   { bg: '#E61317', text: '#FFFFFF' },
  }
  return (
    <div>
      {/* Legend strip — stage labels across the full width */}
      <div className="mb-4 grid grid-cols-2 gap-x-3 gap-y-2 border-b border-dash-border pb-3 sm:grid-cols-4 sm:gap-3">
        {rows.map((r, i) => {
          const swatch = palette[r.tone]
          return (
            <span key={i} className="flex items-center gap-2 font-ui text-[11px] font-medium uppercase tracking-[0.06em] text-dash-text-secondary">
              <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: swatch.bg }} />
              {r.label}
            </span>
          )
        })}
      </div>

      {/* Bars — count only, centred on a vertical axis */}
      <div className="space-y-2">
        {rows.map((r, i) => {
          const pct = top > 0 ? (r.value / top) * 100 : 0
          const swatch = palette[r.tone]
          const pctLabel = top === 0 ? '—' : pct < 10 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="relative h-9 flex-1">
                <div
                  className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-sm px-3"
                  style={{ width: `${Math.max(pct, 0.5)}%`, minWidth: '3rem', background: swatch.bg }}
                >
                  <span
                    className="whitespace-nowrap font-mono text-[13px] font-bold"
                    style={{ color: swatch.text }}
                  >
                    {fmtNum(r.value)}
                  </span>
                </div>
              </div>
              <span className="w-14 text-right font-mono text-[11px] text-dash-text-secondary">
                {pctLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Section heading (mirrors Home + Financial tabs) ─────────────── */

function NarrativeSection({
  number, question, subtitle, right, children,
}: {
  number: number
  question: string
  subtitle: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-5 md:mb-7 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-start gap-4 md:gap-6">
            <span className="font-display text-4xl leading-none text-dash-text md:text-6xl">
              {String(number).padStart(2, '0')}
            </span>
            <h2 className="font-display uppercase tracking-tight text-dash-text text-2xl leading-none pt-[0.2rem] md:text-4xl md:pt-[0.4rem]">
              {question}
            </h2>
          </div>
          <p className="mt-2 ml-[3.5rem] md:ml-[5.5rem] font-ui text-[11px] uppercase tracking-[0.12em] text-dash-text-muted md:text-xs">
            {subtitle}
          </p>
        </div>
        {right && <div>{right}</div>}
      </div>
      {children}
    </section>
  )
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function MarketingPage() {
  const { meta_ads, social_followers, social_views, operational_data, ghl_opportunities, plan_targets } = useDashboardData()

  const [pickerValue, setPickerValue] = useState<DateRangePickerValue>(() => defaultDateRangePicker())
  const periodStart = pickerValue.period.start
  const periodEnd = pickerValue.period.end
  const prevStart = pickerValue.comparison.start
  const prevEnd = pickerValue.comparison.end

  /* ── Meta ads — period aggregates ── */
  const metaInPeriod = useMemo(
    () => meta_ads.filter(r => inPeriod(r.date, periodStart, periodEnd)),
    [meta_ads, periodStart, periodEnd]
  )
  const metaInPrev = useMemo(
    () => meta_ads.filter(r => inPeriod(r.date, prevStart, prevEnd)),
    [meta_ads, prevStart, prevEnd]
  )

  const aggregateMeta = (rows: typeof meta_ads) => {
    let spend = 0, impressions = 0, clicks = 0, lpv = 0
    let conversions = 0, videoViews = 0, postEngagements = 0
    for (const r of rows) {
      spend += num(r.spend)
      impressions += num(r.impressions)
      clicks += num(r.clicks)
      lpv += num(r.landing_page_views)
      conversions += num(r.conversions_leads)
      videoViews += num(r.video_views)
      postEngagements += num(r.post_engagements)
    }
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const costPerLpv = lpv > 0 ? spend / lpv : 0
    const costPerLead = conversions > 0 ? spend / conversions : 0
    return { spend, impressions, clicks, ctr, lpv, costPerLpv, conversions, costPerLead, videoViews, postEngagements }
  }
  const metaAgg = useMemo(() => aggregateMeta(metaInPeriod), [metaInPeriod])
  const metaPrev = useMemo(() => aggregateMeta(metaInPrev), [metaInPrev])

  /* ── Members acquired (operational_data.customers_registered) ── */
  const membersAcquired = useMemo(
    () => operational_data.filter(r => inPeriod(r.date, periodStart, periodEnd))
      .reduce((s, r) => s + num(r.customers_registered), 0),
    [operational_data, periodStart, periodEnd]
  )
  const membersAcquiredPrev = useMemo(
    () => operational_data.filter(r => inPeriod(r.date, prevStart, prevEnd))
      .reduce((s, r) => s + num(r.customers_registered), 0),
    [operational_data, prevStart, prevEnd]
  )

  /* ── GHL: booked / held / closed counts (data currently flaky) ── */
  const callsBooked = useMemo(
    () => ghl_opportunities.filter(r =>
      CALL_STAGES_BOOKED.has(String(r.stage ?? ''))
      && inPeriod(r.created_on, periodStart, periodEnd)
    ).length,
    [ghl_opportunities, periodStart, periodEnd]
  )
  const callsBookedPrev = useMemo(
    () => ghl_opportunities.filter(r =>
      CALL_STAGES_BOOKED.has(String(r.stage ?? ''))
      && inPeriod(r.created_on, prevStart, prevEnd)
    ).length,
    [ghl_opportunities, prevStart, prevEnd]
  )
  const callsHeld = useMemo(
    () => ghl_opportunities.filter(r =>
      CALL_STAGES_HELD.has(String(r.stage ?? ''))
      && inPeriod(r.created_on, periodStart, periodEnd)
    ).length,
    [ghl_opportunities, periodStart, periodEnd]
  )
  const callsClosed = useMemo(
    () => ghl_opportunities.filter(r =>
      String(r.status ?? '').toLowerCase() === 'won'
      && inPeriod(r.created_on, periodStart, periodEnd)
    ).length,
    [ghl_opportunities, periodStart, periodEnd]
  )
  const callsClosedPrev = useMemo(
    () => ghl_opportunities.filter(r =>
      String(r.status ?? '').toLowerCase() === 'won'
      && inPeriod(r.created_on, prevStart, prevEnd)
    ).length,
    [ghl_opportunities, prevStart, prevEnd]
  )

  /* ── LTV in effect for this period — most recent plan_targets row at or
        before periodEnd that actually carries an ltv_assumed value. ── */
  const ltvAssumed = useMemo(() => {
    const endIso = periodEnd.toISOString().slice(0, 10)
    let best: { month: string; ltv: number } | null = null
    for (const r of plan_targets) {
      const m = typeof r.month === 'string' ? r.month.slice(0, 10) : ''
      const v = r.ltv_assumed
      if (!m || m > endIso) continue
      if (v === null || v === undefined) continue
      const ltv = typeof v === 'number' ? v : Number(v)
      if (isNaN(ltv)) continue
      if (!best || m > best.month) best = { month: m, ltv }
    }
    return best?.ltv ?? LTV_FALLBACK
  }, [plan_targets, periodEnd])
  const ltvFromSettings = useMemo(() => plan_targets.some(r =>
    r.ltv_assumed !== null && r.ltv_assumed !== undefined && r.ltv_assumed !== ''
  ), [plan_targets])

  /* ── Derived Spend-section metrics ── */
  const costPerLead = metaAgg.costPerLead
  const costPerLeadPrev = metaPrev.costPerLead
  const costPerCall = callsBooked > 0 ? metaAgg.spend / callsBooked : 0
  const costPerCallPrev = callsBookedPrev > 0 ? metaPrev.spend / callsBookedPrev : 0
  const cac = membersAcquired > 0 ? metaAgg.spend / membersAcquired : 0
  const cacPrev = membersAcquiredPrev > 0 ? metaPrev.spend / membersAcquiredPrev : 0
  // LTV per registration (paid) = assumed LTV × closed members (paid-attributable
  // registrations). Closed comes from GHL won — currently provisional.
  const ltvFromPaid = ltvAssumed * callsClosed
  const ltvFromPaidPrev = ltvAssumed * callsClosedPrev
  const roiPaid = metaAgg.spend > 0 ? ((ltvFromPaid - metaAgg.spend) / metaAgg.spend) * 100 : 0
  const roiPaidPrev = metaPrev.spend > 0 ? ((ltvFromPaidPrev - metaPrev.spend) / metaPrev.spend) * 100 : 0

  /* ── Spend-section sparklines ── */
  const sparkSpend = useMemo(
    () => bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.spend), 0)),
    [meta_ads, periodStart, periodEnd]
  )
  const sparkCostPerLpv = useMemo(
    () => bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => {
        const spend = rows.reduce((s, r) => s + num(r.spend), 0)
        const v = rows.reduce((s, r) => s + num(r.landing_page_views), 0)
        return v > 0 ? spend / v : 0
      }),
    [meta_ads, periodStart, periodEnd]
  )
  const sparkCostPerLead = useMemo(
    () => bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => {
        const spend = rows.reduce((s, r) => s + num(r.spend), 0)
        const leads = rows.reduce((s, r) => s + num(r.conversions_leads), 0)
        return leads > 0 ? spend / leads : 0
      }),
    [meta_ads, periodStart, periodEnd]
  )
  const sparkCostPerCall = useMemo(() => {
    const spend = bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.spend), 0))
    return spend.map(d => {
      const day = d.date
      const calls = ghl_opportunities.filter(o =>
        CALL_STAGES_BOOKED.has(String(o.stage ?? ''))
        && String(o.created_on ?? '').slice(0, 10) === day
      ).length
      return { date: day, value: calls > 0 ? d.value / calls : 0 }
    })
  }, [meta_ads, ghl_opportunities, periodStart, periodEnd])
  const sparkCac = useMemo(() => {
    const spend = bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.spend), 0))
    const regs = bucketByDay(operational_data, 'date', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.customers_registered), 0))
    return spend.map((d, i) => ({
      date: d.date,
      value: regs[i] && regs[i].value > 0 ? d.value / regs[i].value : 0,
    }))
  }, [meta_ads, operational_data, periodStart, periodEnd])

  /* ── Paid Ads tile sparklines ── */
  const sparkImpressions = useMemo(
    () => bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.impressions), 0)),
    [meta_ads, periodStart, periodEnd]
  )
  const sparkClicks = useMemo(
    () => bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.clicks), 0)),
    [meta_ads, periodStart, periodEnd]
  )
  const sparkCtr = useMemo(
    () => bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => {
        const imp = rows.reduce((s, r) => s + num(r.impressions), 0)
        const clk = rows.reduce((s, r) => s + num(r.clicks), 0)
        return imp > 0 ? (clk / imp) * 100 : 0
      }),
    [meta_ads, periodStart, periodEnd]
  )
  const sparkLpv = useMemo(
    () => bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.landing_page_views), 0)),
    [meta_ads, periodStart, periodEnd]
  )
  const sparkVideoViewsMeta = useMemo(
    () => bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.video_views), 0)),
    [meta_ads, periodStart, periodEnd]
  )
  const sparkPostEngMeta = useMemo(
    () => bucketByDay(meta_ads, 'date', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.post_engagements), 0)),
    [meta_ads, periodStart, periodEnd]
  )

  /* ── Followers — latest snapshot per platform ── */
  const followersByPlatform = useMemo(() => {
    const latest = new Map<string, { date: string; value: number; notes: string | null }>()
    for (const row of social_followers) {
      const platform = String(row.platform ?? '')
      const date = String(row.date ?? '')
      const value = num(row.followers)
      const notes = row.notes ? String(row.notes) : null
      const existing = latest.get(platform)
      if (!existing || date > existing.date) {
        latest.set(platform, { date, value, notes })
      }
    }
    return latest
  }, [social_followers])
  const lookupFollowers = (aliases: string[]) => {
    for (const a of aliases) {
      const hit = followersByPlatform.get(a)
      if (hit) return hit
    }
    return null
  }

  /* ── Social Views — totals + per-platform daily series ── */
  const viewsInPeriod = useMemo(
    () => social_views.filter(r => inPeriod(r.date, periodStart, periodEnd)),
    [social_views, periodStart, periodEnd]
  )
  const viewsInPrev = useMemo(
    () => social_views.filter(r => inPeriod(r.date, prevStart, prevEnd)),
    [social_views, prevStart, prevEnd]
  )
  const aggregateViews = (rows: typeof social_views) => {
    let pageViews = 0, videoViews = 0, postEngagements = 0
    for (const r of rows) {
      pageViews += num(r.page_views)
      videoViews += num(r.video_views)
      postEngagements += num(r.post_engagements)
    }
    return { pageViews, videoViews, postEngagements }
  }
  const viewsAgg = useMemo(() => aggregateViews(viewsInPeriod), [viewsInPeriod])
  const viewsPrev = useMemo(() => aggregateViews(viewsInPrev), [viewsInPrev])

  // Distinct platforms present in the social_views data for this period.
  const viewsPlatforms = useMemo(() => {
    const set = new Set<string>()
    for (const r of viewsInPeriod) {
      const p = String(r.platform ?? '').trim()
      if (p) set.add(p)
    }
    return Array.from(set).sort()
  }, [viewsInPeriod])

  // Build a chart row per day with one column per platform for a given metric.
  const buildPerPlatformDaily = (rows: typeof social_views, metric: 'page_views' | 'video_views' | 'post_engagements') => {
    const days = new Map<string, Record<string, number | string>>()
    for (const r of rows) {
      const day = String(r.date ?? '').slice(0, 10)
      const platform = String(r.platform ?? '').trim()
      if (!day || !platform) continue
      const row = days.get(day) ?? { date: day }
      row[platform] = num((r as Record<string, unknown>)[metric])
      days.set(day, row)
    }
    return Array.from(days.values())
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }
  const dailyPageViewsByPlatform = useMemo(
    () => buildPerPlatformDaily(viewsInPeriod, 'page_views'),
    [viewsInPeriod]
  )
  const dailyVideoViewsByPlatform = useMemo(
    () => buildPerPlatformDaily(viewsInPeriod, 'video_views'),
    [viewsInPeriod]
  )
  const dailyPostEngByPlatform = useMemo(
    () => buildPerPlatformDaily(viewsInPeriod, 'post_engagements'),
    [viewsInPeriod]
  )

  /* ── Aggregated engagement trend (all platforms combined) ── */
  const trendData = useMemo(() => {
    const byDay = new Map<string, { page_views: number; video_views: number; post_engagements: number }>()
    for (const r of viewsInPeriod) {
      const day = String(r.date ?? '').slice(0, 10)
      if (!day) continue
      const entry = byDay.get(day) ?? { page_views: 0, video_views: 0, post_engagements: 0 }
      entry.page_views += num(r.page_views)
      entry.video_views += num(r.video_views)
      entry.post_engagements += num(r.post_engagements)
      byDay.set(day, entry)
    }
    return Array.from(byDay.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [viewsInPeriod])

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Marketing' }]} />
        <DateRangePicker value={pickerValue} onChange={setPickerValue} />
      </div>

      {/* ── Section 1 — Spend ── */}
      <NarrativeSection number={1} question="Spend" subtitle="Every dollar · every outcome">
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
          <KpiTile
            label="Total Meta Ad Spend"
            value={fmtCurrency(metaAgg.spend, { compact: true, digits: 0 })}
            delta={deltaPct(metaAgg.spend, metaPrev.spend)}
            direction="lower-better"
            chart={<TileChart data={sparkSpend} formatValue={(n) => fmtCurrency(n, { compact: true })} />}
          />
          <KpiTile
            label="Cost per Landing Page View"
            value={metaAgg.lpv === 0 ? '—' : fmtCurrency(metaAgg.costPerLpv)}
            sublabel="spend ÷ LPV"
            delta={deltaPct(metaAgg.costPerLpv, metaPrev.costPerLpv)}
            direction="lower-better"
            chart={<TileChart data={sparkCostPerLpv} variant="line" formatValue={(n) => fmtCurrency(n)} />}
          />
          <KpiTile
            label="Cost per Lead"
            value={metaAgg.conversions === 0 ? '—' : fmtCurrency(costPerLead)}
            sublabel="spend ÷ Meta leads"
            delta={deltaPct(costPerLead, costPerLeadPrev)}
            direction="lower-better"
            chart={<TileChart data={sparkCostPerLead} variant="line" formatValue={(n) => fmtCurrency(n)} />}
          />
          <KpiTile
            label="Cost per Call"
            value={callsBooked === 0 ? '—' : fmtCurrency(costPerCall)}
            sublabel="spend ÷ calls booked (GHL)"
            delta={deltaPct(costPerCall, costPerCallPrev)}
            direction="lower-better"
            chart={<TileChart data={sparkCostPerCall} variant="line" formatValue={(n) => fmtCurrency(n)} />}
          />
          <KpiTile
            label="Customer Acquisition Cost"
            value={membersAcquired === 0 ? '—' : fmtCurrency(cac)}
            sublabel="spend ÷ members acquired"
            delta={deltaPct(cac, cacPrev)}
            direction="lower-better"
            chart={<TileChart data={sparkCac} variant="line" formatValue={(n) => fmtCurrency(n)} />}
          />
          <KpiTile
            label="LTV per Registration (Paid)"
            value={callsClosed === 0 ? '—' : fmtCurrency(ltvFromPaid, { compact: true, digits: 0 })}
            sublabel={`closed × $${ltvAssumed.toLocaleString()} LTV${ltvFromSettings ? '' : ' · fallback'}`}
            delta={deltaPct(ltvFromPaid, ltvFromPaidPrev)}
          />
          <KpiTile
            label="ROI on Paid Marketing"
            value={metaAgg.spend === 0 || callsClosed === 0 ? '—' : `${roiPaid.toFixed(0)}%`}
            sublabel="(LTV-from-paid − spend) ÷ spend"
            delta={deltaPct(roiPaid, roiPaidPrev)}
          />
        </div>
        <p className="mt-3 font-sans text-[11px] italic text-dash-text-muted">
          LTV-per-Registration uses ${ltvAssumed.toLocaleString()} per closed member ({ltvFromSettings ? <>from <a href="/admin/settings" className="underline">Settings → Plan Targets</a></> : 'fallback — no value set in Settings yet'}); &ldquo;closed&rdquo; comes from GHL <code>status=won</code>, which is currently flaky. Both LTV per Registration and ROI update automatically once the LTV is set and the cleaned GHL feed lands.
        </p>
      </NarrativeSection>

      {/* ── Section 2 — Paid — Meta Ads (funnel + tiles) ── */}
      <NarrativeSection number={2} question="Paid — Meta Ads" subtitle="From impression to closed member">
        <div className="mb-3 rounded-lg border border-dash-border bg-dash-surface p-4 md:mb-4">
          <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
            The Funnel · period selected
          </div>
          <FunnelChart
            rows={[
              { label: 'Total Leads', value: metaAgg.conversions, tone: 'dark'  },
              { label: 'Booked',      value: callsBooked,         tone: 'mid'   },
              { label: 'Held',        value: callsHeld,           tone: 'light' },
              { label: 'Closed',      value: callsClosed,         tone: 'red'   },
            ]}
          />
          <p className="mt-3 font-sans text-[11px] italic text-dash-text-muted">
            Leads from Meta Ads · Booked / Held / Closed from GHL (feed currently unreliable — Marko is fixing).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-3">
          <KpiTile
            label="Impressions"
            value={fmtNum(metaAgg.impressions)}
            delta={deltaPct(metaAgg.impressions, metaPrev.impressions)}
            chart={<TileChart data={sparkImpressions} />}
          />
          <KpiTile
            label="Clicks"
            value={fmtNum(metaAgg.clicks)}
            delta={deltaPct(metaAgg.clicks, metaPrev.clicks)}
            chart={<TileChart data={sparkClicks} />}
          />
          <KpiTile
            label="CTR"
            value={metaAgg.impressions === 0 ? '—' : fmtPct(metaAgg.ctr)}
            sublabel="clicks ÷ impressions"
            delta={deltaPct(metaAgg.ctr, metaPrev.ctr)}
            chart={<TileChart data={sparkCtr} variant="line" formatValue={(n) => fmtPct(n)} />}
          />
          <KpiTile
            label="Landing Page Views"
            value={fmtNum(metaAgg.lpv)}
            delta={deltaPct(metaAgg.lpv, metaPrev.lpv)}
            chart={<TileChart data={sparkLpv} />}
          />
          <KpiTile
            label="Video Views"
            value={fmtNum(metaAgg.videoViews)}
            delta={deltaPct(metaAgg.videoViews, metaPrev.videoViews)}
            chart={<TileChart data={sparkVideoViewsMeta} />}
          />
          <KpiTile
            label="Post Engagements"
            value={fmtNum(metaAgg.postEngagements)}
            delta={deltaPct(metaAgg.postEngagements, metaPrev.postEngagements)}
            chart={<TileChart data={sparkPostEngMeta} />}
          />
        </div>
      </NarrativeSection>

      {/* ── Section 3 — CAC trend ── */}
      <NarrativeSection number={3} question="Customer Acquisition Cost" subtitle="Spend per member acquired · day by day">
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={sparkCac} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="date" tick={axisTickStyle} axisLine={axisLineStyle} tickLine={false} minTickGap={32} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} tickLine={false} tickFormatter={(v) => fmtCurrency(Number(v) || 0, { digits: 0 })} />
              <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v) || 0, { digits: 2 })} />
              <Line type="monotone" dataKey="value" stroke={TMRW_COLORS.red} strokeWidth={2} dot={false} name="CAC" />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-3 font-sans text-[11px] italic text-dash-text-muted">
            Daily Meta spend ÷ daily members acquired. Spikes happen on low-acquisition days; smooth via the trend rather than reading single days.
          </p>
        </div>
      </NarrativeSection>

      {/* ── Section 4 — Organic Followers ── */}
      <NarrativeSection number={4} question="Organic — Followers" subtitle="Audience size by platform">
        <div className="grid grid-cols-1 gap-2 md:gap-3 lg:grid-cols-3">
          {FOLLOWER_PLATFORMS.map(p => {
            const hit = lookupFollowers(p.aliases)
            return hit
              ? (
                <KpiTile
                  key={p.canonical}
                  label={`${p.label} Followers`}
                  value={fmtNum(hit.value)}
                  sublabel={`as of ${hit.date}`}
                />
              ) : (
                <LockedKpiTile
                  key={p.canonical}
                  label={`${p.label} Followers`}
                  reason={`Awaiting upload — expecting platform = "${p.canonical}".`}
                />
              )
          })}
        </div>
      </NarrativeSection>

      {/* ── Section 5 — Social Views by Platform ── */}
      <NarrativeSection number={5} question="Organic — Social Views" subtitle="Eyeballs by platform">
        <div className="grid grid-cols-1 gap-2 md:gap-3 lg:grid-cols-3">
          <KpiTile
            label="Page Views (total)"
            value={fmtNum(viewsAgg.pageViews)}
            delta={deltaPct(viewsAgg.pageViews, viewsPrev.pageViews)}
          />
          <KpiTile
            label="Video Views (total)"
            value={fmtNum(viewsAgg.videoViews)}
            delta={deltaPct(viewsAgg.videoViews, viewsPrev.videoViews)}
          />
          <KpiTile
            label="Post Engagements (total)"
            value={fmtNum(viewsAgg.postEngagements)}
            delta={deltaPct(viewsAgg.postEngagements, viewsPrev.postEngagements)}
          />
        </div>

        {viewsPlatforms.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-dash-border bg-dash-surface/40 p-6 text-center font-sans text-[12px] italic text-dash-text-muted">
            Awaiting per-platform Social Views data. The upload schema now expects a <code>Platform</code> column.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {[
              { title: 'Page Views by Platform',       data: dailyPageViewsByPlatform },
              { title: 'Video Views by Platform',      data: dailyVideoViewsByPlatform },
              { title: 'Post Engagements by Platform', data: dailyPostEngByPlatform },
            ].map(({ title, data }) => (
              <div key={title} className="rounded-lg border border-dash-border bg-dash-surface p-4">
                <div className="mb-3 font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">
                  {title}
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey="date" tick={axisTickStyle} axisLine={axisLineStyle} tickLine={false} minTickGap={32} />
                    <YAxis tick={axisTickStyle} axisLine={axisLineStyle} tickLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {viewsPlatforms.map(p => (
                      <Line key={p} type="monotone" dataKey={p} stroke={platformColor(p)} strokeWidth={2} dot={false} name={p} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}
      </NarrativeSection>

      {/* ── Section 6 — Engagement Trend (all platforms combined) ── */}
      <NarrativeSection number={6} question="Engagement Trend" subtitle="All platforms combined · page views · post engagements · video views">
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
          {trendData.length === 0 ? (
            <p className="py-12 text-center text-sm italic text-dash-text-muted">
              No social_views data in this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="date" tick={axisTickStyle} axisLine={axisLineStyle} tickLine={false} minTickGap={32} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="page_views" stroke={TMRW_COLORS.blue} strokeWidth={2} dot={false} name="Page Views" />
                <Line type="monotone" dataKey="post_engagements" stroke={TMRW_COLORS.red} strokeWidth={2} dot={false} name="Post Engagements" />
                <Line type="monotone" dataKey="video_views" stroke={TMRW_COLORS.green} strokeWidth={2} dot={false} name="Video Views" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </NarrativeSection>
    </div>
  )
}

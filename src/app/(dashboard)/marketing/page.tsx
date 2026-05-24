'use client'

import { useMemo, useState } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { SectionHeading } from '@/components/dashboard/section-heading'
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

/* ─── Tile ────────────────────────────────────────────────────────── */

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
      {chart && <div className="mt-2">{chart}</div>}
      <div className="mt-auto pt-1.5 flex items-center justify-between text-[11px] text-dash-text-muted">
        {sublabel ? <span>{sublabel}</span> : <span />}
        {delta !== null && delta !== undefined && <span className="font-sans">vs previous</span>}
      </div>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function MarketingPage() {
  const { meta_ads, social_followers, social_views } = useDashboardData()

  // User-controlled date range picker. Independent state per page.
  const [pickerValue, setPickerValue] = useState<DateRangePickerValue>(() => defaultDateRangePicker())
  const periodStart = pickerValue.period.start
  const periodEnd = pickerValue.period.end
  const prevStart = pickerValue.comparison.start
  const prevEnd = pickerValue.comparison.end

  /* ── Paid — Meta Ads ── */
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
    const costPerConversion = conversions > 0 ? spend / conversions : 0
    return { spend, impressions, clicks, ctr, lpv, costPerLpv, conversions, costPerConversion, videoViews, postEngagements }
  }

  const metaAgg = useMemo(() => aggregateMeta(metaInPeriod), [metaInPeriod])
  const metaPrev = useMemo(() => aggregateMeta(metaInPrev), [metaInPrev])

  /* ── Daily series per Meta tile ── */
  const sparkMeta = (field: keyof typeof metaAgg) => bucketByDay(
    meta_ads, 'date', periodStart, periodEnd,
    (rows) => {
      // For ratio tiles, recompute the ratio on the day's rows.
      if (field === 'ctr') {
        const imp = rows.reduce((s, r) => s + num(r.impressions), 0)
        const clk = rows.reduce((s, r) => s + num(r.clicks), 0)
        return imp > 0 ? (clk / imp) * 100 : 0
      }
      if (field === 'costPerLpv') {
        const sp = rows.reduce((s, r) => s + num(r.spend), 0)
        const v = rows.reduce((s, r) => s + num(r.landing_page_views), 0)
        return v > 0 ? sp / v : 0
      }
      if (field === 'costPerConversion') {
        const sp = rows.reduce((s, r) => s + num(r.spend), 0)
        const v = rows.reduce((s, r) => s + num(r.conversions_leads), 0)
        return v > 0 ? sp / v : 0
      }
      // Sum tiles map cleanly to column names
      const colByField: Record<string, string> = {
        spend: 'spend',
        impressions: 'impressions',
        clicks: 'clicks',
        lpv: 'landing_page_views',
        conversions: 'conversions_leads',
        videoViews: 'video_views',
        postEngagements: 'post_engagements',
      }
      const col = colByField[field as string]
      return col ? rows.reduce((s, r) => s + num((r as Record<string, unknown>)[col]), 0) : 0
    }
  )

  const sparkSpend           = useMemo(() => sparkMeta('spend'),             [meta_ads, periodStart, periodEnd])  // eslint-disable-line react-hooks/exhaustive-deps
  const sparkImpressions     = useMemo(() => sparkMeta('impressions'),       [meta_ads, periodStart, periodEnd])  // eslint-disable-line react-hooks/exhaustive-deps
  const sparkClicks          = useMemo(() => sparkMeta('clicks'),            [meta_ads, periodStart, periodEnd])  // eslint-disable-line react-hooks/exhaustive-deps
  const sparkCtr             = useMemo(() => sparkMeta('ctr'),               [meta_ads, periodStart, periodEnd])  // eslint-disable-line react-hooks/exhaustive-deps
  const sparkLpv             = useMemo(() => sparkMeta('lpv'),               [meta_ads, periodStart, periodEnd])  // eslint-disable-line react-hooks/exhaustive-deps
  const sparkCostPerLpv      = useMemo(() => sparkMeta('costPerLpv'),        [meta_ads, periodStart, periodEnd])  // eslint-disable-line react-hooks/exhaustive-deps
  const sparkConversions     = useMemo(() => sparkMeta('conversions'),       [meta_ads, periodStart, periodEnd])  // eslint-disable-line react-hooks/exhaustive-deps
  const sparkCostPerConv     = useMemo(() => sparkMeta('costPerConversion'), [meta_ads, periodStart, periodEnd])  // eslint-disable-line react-hooks/exhaustive-deps
  const sparkVideoViewsMeta  = useMemo(() => sparkMeta('videoViews'),        [meta_ads, periodStart, periodEnd])  // eslint-disable-line react-hooks/exhaustive-deps
  const sparkPostEngMeta     = useMemo(() => sparkMeta('postEngagements'),   [meta_ads, periodStart, periodEnd])  // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Organic — Social Followers (latest snapshot per platform) ── */
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

  const facebook = followersByPlatform.get('Facebook (TMRW)')
    ?? followersByPlatform.get('Facebook')
    ?? null

  /* ── Organic — Social Views (aggregated over period) ── */
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

  const sparkPageViews = useMemo(
    () => bucketByDay(social_views, 'date', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.page_views), 0)),
    [social_views, periodStart, periodEnd]
  )
  const sparkVideoViewsSocial = useMemo(
    () => bucketByDay(social_views, 'date', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.video_views), 0)),
    [social_views, periodStart, periodEnd]
  )
  const sparkPostEngSocial = useMemo(
    () => bucketByDay(social_views, 'date', periodStart, periodEnd,
      (rows) => rows.reduce((s, r) => s + num(r.post_engagements), 0)),
    [social_views, periodStart, periodEnd]
  )

  /* ── Engagement trend chart — daily series ── */
  const trendData = useMemo(() => {
    return [...viewsInPeriod]
      .map(r => ({
        date: String(r.date),
        page_views: num(r.page_views),
        post_engagements: num(r.post_engagements),
        video_views: num(r.video_views),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [viewsInPeriod])

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Marketing' }]} />
        <DateRangePicker value={pickerValue} onChange={setPickerValue} />
      </div>

      {/* ── Section 1 — Paid — Meta Ads ── */}
      <section>
        <SectionHeading number={1} title="Paid — Meta Ads" />
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-5">
          <KpiTile
            label="Spend"
            value={fmtCurrency(metaAgg.spend, { compact: true, digits: 0 })}
            delta={deltaPct(metaAgg.spend, metaPrev.spend)}
            direction="lower-better"
            chart={<TileChart data={sparkSpend} formatValue={(n) => fmtCurrency(n, { compact: true })} />}
          />
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
            label="Cost per LPV"
            value={metaAgg.lpv === 0 ? '—' : fmtCurrency(metaAgg.costPerLpv)}
            delta={deltaPct(metaAgg.costPerLpv, metaPrev.costPerLpv)}
            direction="lower-better"
            chart={<TileChart data={sparkCostPerLpv} variant="line" formatValue={(n) => fmtCurrency(n)} />}
          />
          <KpiTile
            label="Conversions (Leads)"
            value={fmtNum(metaAgg.conversions)}
            delta={deltaPct(metaAgg.conversions, metaPrev.conversions)}
            chart={<TileChart data={sparkConversions} />}
          />
          <KpiTile
            label="Cost per Conversion"
            value={metaAgg.conversions === 0 ? '—' : fmtCurrency(metaAgg.costPerConversion)}
            delta={deltaPct(metaAgg.costPerConversion, metaPrev.costPerConversion)}
            direction="lower-better"
            chart={<TileChart data={sparkCostPerConv} variant="line" formatValue={(n) => fmtCurrency(n)} />}
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
      </section>

      {/* ── Section 2 — Organic — Followers ── */}
      <section>
        <SectionHeading number={2} title="Organic — Followers" />
        <div className="grid grid-cols-1 gap-2 md:gap-3 lg:grid-cols-3">
          <KpiTile
            label="Facebook Followers"
            value={facebook ? fmtNum(facebook.value) : '—'}
            sublabel={facebook ? `as of ${facebook.date}` : 'no snapshot yet'}
          />
        </div>
      </section>

      {/* ── Section 3 — Organic — Social Views ── */}
      <section>
        <SectionHeading number={3} title="Organic — Social Views" />
        <div className="grid grid-cols-1 gap-2 md:gap-3 lg:grid-cols-3">
          <KpiTile
            label="Page Views"
            value={fmtNum(viewsAgg.pageViews)}
            delta={deltaPct(viewsAgg.pageViews, viewsPrev.pageViews)}
            chart={<TileChart data={sparkPageViews} />}
          />
          <KpiTile
            label="Video Views"
            value={fmtNum(viewsAgg.videoViews)}
            delta={deltaPct(viewsAgg.videoViews, viewsPrev.videoViews)}
            chart={<TileChart data={sparkVideoViewsSocial} />}
          />
          <KpiTile
            label="Post Engagements"
            value={fmtNum(viewsAgg.postEngagements)}
            delta={deltaPct(viewsAgg.postEngagements, viewsPrev.postEngagements)}
            chart={<TileChart data={sparkPostEngSocial} />}
          />
        </div>
      </section>

      {/* ── Section 4 — Engagement Trend ── */}
      <section>
        <SectionHeading number={4} title="Engagement Trend" />
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
      </section>
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { useDashboardData } from '@/lib/context/data-context'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridStyle, TMRW_COLORS } from '@/lib/utils/chart-styles'

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

/* ─── Tile ────────────────────────────────────────────────────────── */

interface KpiTileProps {
  label: string
  value: string
  sublabel?: string
}

function KpiTile({ label, value, sublabel }: KpiTileProps) {
  return (
    <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
      <p className="font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold text-dash-text">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-dash-text-secondary">{sublabel}</p>}
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function MarketingPage() {
  const { meta_ads, social_followers, social_views } = useDashboardData()

  // Date filter — hardcoded for PR B. PR C wires the user-controlled range picker.
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    return {
      periodStart: start,
      periodEnd: now,
      periodLabel: `${fmt(start)} – ${fmt(now)}, ${now.getFullYear()}`,
    }
  }, [])

  /* ── Paid — Meta Ads (aggregated over period) ── */
  const metaInPeriod = useMemo(
    () => meta_ads.filter(r => inPeriod(r.date, periodStart, periodEnd)),
    [meta_ads, periodStart, periodEnd]
  )

  const metaAgg = useMemo(() => {
    let spend = 0
    let impressions = 0
    let clicks = 0
    let lpv = 0
    let conversions = 0
    let videoViews = 0
    let postEngagements = 0
    for (const r of metaInPeriod) {
      spend += num(r.spend)
      impressions += num(r.impressions)
      clicks += num(r.clicks)
      lpv += num(r.landing_page_views)
      conversions += num(r.conversions_leads)
      videoViews += num(r.video_views)
      postEngagements += num(r.post_engagements)
    }
    // Weighted ratios — more accurate than averaging daily ratios.
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : null
    const costPerLpv = lpv > 0 ? spend / lpv : null
    const costPerConversion = conversions > 0 ? spend / conversions : null
    return { spend, impressions, clicks, ctr, lpv, costPerLpv, conversions, costPerConversion, videoViews, postEngagements }
  }, [metaInPeriod])

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

  const viewsAgg = useMemo(() => {
    let pageViews = 0
    let videoViews = 0
    let postEngagements = 0
    for (const r of viewsInPeriod) {
      pageViews += num(r.page_views)
      videoViews += num(r.video_views)
      postEngagements += num(r.post_engagements)
    }
    return { pageViews, videoViews, postEngagements }
  }, [viewsInPeriod])

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
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Marketing' }]} />

      {/* Date-filter placeholder strip — PR C wires the picker UI. */}
      <div className="flex items-center justify-between rounded-md border border-dashed border-dash-border bg-dash-surface/40 px-4 py-2">
        <span className="font-ui text-[10px] uppercase tracking-[0.05em] text-dash-text-muted">
          Period (placeholder — PR C wires a picker)
        </span>
        <span className="font-mono text-xs text-dash-text">{periodLabel}</span>
      </div>

      {/* ── Section 1 — Paid — Meta Ads ── */}
      <section>
        <SectionHeading number={1} title="Paid — Meta Ads" />
        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-5">
          <KpiTile label="Spend" value={fmtCurrency(metaAgg.spend, { compact: true, digits: 0 })} />
          <KpiTile label="Impressions" value={fmtNum(metaAgg.impressions)} />
          <KpiTile label="Clicks" value={fmtNum(metaAgg.clicks)} />
          <KpiTile label="CTR" value={metaAgg.ctr === null ? '—' : fmtPct(metaAgg.ctr)} sublabel="clicks ÷ impressions" />
          <KpiTile label="Landing Page Views" value={fmtNum(metaAgg.lpv)} />
          <KpiTile label="Cost per LPV" value={metaAgg.costPerLpv === null ? '—' : fmtCurrency(metaAgg.costPerLpv)} />
          <KpiTile label="Conversions (Leads)" value={fmtNum(metaAgg.conversions)} />
          <KpiTile label="Cost per Conversion" value={metaAgg.costPerConversion === null ? '—' : fmtCurrency(metaAgg.costPerConversion)} />
          <KpiTile label="Video Views" value={fmtNum(metaAgg.videoViews)} />
          <KpiTile label="Post Engagements" value={fmtNum(metaAgg.postEngagements)} />
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
          <KpiTile label="Page Views" value={fmtNum(viewsAgg.pageViews)} />
          <KpiTile label="Video Views" value={fmtNum(viewsAgg.videoViews)} />
          <KpiTile label="Post Engagements" value={fmtNum(viewsAgg.postEngagements)} />
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

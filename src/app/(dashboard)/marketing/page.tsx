'use client'

import { useMemo } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { useDashboardData } from '@/lib/context/data-context'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridStyle, TMRW_COLORS } from '@/lib/utils/chart-styles'

const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return isNaN(n) ? 0 : n
}

interface KpiTileProps {
  label: string
  value: string | number
  sublabel?: string
}

function KpiTile({ label, value, sublabel }: KpiTileProps) {
  return (
    <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
      <p className="font-mono text-xs uppercase tracking-wide text-dash-text-muted">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold text-dash-text">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-dash-text-secondary">{sublabel}</p>}
    </div>
  )
}

export default function MarketingPage() {
  const { metaAds, socialFollowers, socialViews } = useDashboardData()

  // ── Social Followers: latest snapshot per platform ──
  const followersByPlatform = useMemo(() => {
    const latest = new Map<string, { date: string; value: number }>()
    for (const row of socialFollowers) {
      const platform = String(row.platform ?? '')
      const date = String(row.date ?? '')
      const value = num(row.followers)
      const existing = latest.get(platform)
      if (!existing || date > existing.date) {
        latest.set(platform, { date, value })
      }
    }
    return Array.from(latest.entries()).map(([platform, { date, value }]) => ({
      platform,
      followers: value,
      date,
    })).sort((a, b) => b.followers - a.followers)
  }, [socialFollowers])

  const totalFollowers = useMemo(
    () => followersByPlatform.reduce((s, p) => s + p.followers, 0),
    [followersByPlatform]
  )

  // ── Social Views: last 7 days totals ──
  const weeklyEngagement = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10)
    const recent = socialViews.filter(r => String(r.date ?? '') >= cutoff)
    const acc = { page_views: 0, video_views: 0, post_engagements: 0 }
    for (const r of recent) {
      acc.page_views += num(r.page_views)
      acc.video_views += num(r.video_views)
      acc.post_engagements += num(r.post_engagements)
    }
    return acc
  }, [socialViews])

  // ── Social Views: daily trend, last 30 days ──
  const engagementTrend = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString().slice(0, 10)
    return socialViews
      .filter(r => String(r.date ?? '') >= cutoff)
      .map(r => ({
        date: String(r.date ?? ''),
        page_views: num(r.page_views),
        video_views: num(r.video_views),
        post_engagements: num(r.post_engagements),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [socialViews])

  // ── Meta Ads: all 10 tiles in upload-column order ──
  const meta = useMemo(() => {
    const totals = { spend: 0, impressions: 0, clicks: 0, landing_page_views: 0, conversions_leads: 0, video_views: 0, post_engagements: 0 }
    for (const r of metaAds) {
      totals.spend += num(r.spend)
      totals.impressions += num(r.impressions)
      totals.clicks += num(r.clicks)
      totals.landing_page_views += num(r.landing_page_views)
      totals.conversions_leads += num(r.conversions_leads)
      totals.video_views += num(r.video_views)
      totals.post_engagements += num(r.post_engagements)
    }
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null
    const costPerLpv = totals.landing_page_views > 0 ? totals.spend / totals.landing_page_views : null
    const costPerConversion = totals.conversions_leads > 0 ? totals.spend / totals.conversions_leads : null
    return { ...totals, ctr, costPerLpv, costPerConversion }
  }, [metaAds])

  const fmtNumber = (n: number) => n.toLocaleString('en-AU')
  const fmtCurrency = (n: number) => `$${n.toLocaleString('en-AU', { maximumFractionDigits: 2 })}`
  const fmtPercent = (n: number | null) => n === null ? '—' : `${n.toFixed(2)}%`
  const fmtCurrencyOrDash = (n: number | null) => n === null ? '—' : fmtCurrency(n)

  return (
    <div className="space-y-4 md:space-y-10">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Marketing' }]} />

      <section>
        <SectionHeading number={1} title="Paid — Meta Ads" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <KpiTile label="Spend" value={fmtCurrency(meta.spend)} />
          <KpiTile label="Impressions" value={fmtNumber(meta.impressions)} />
          <KpiTile label="Clicks" value={fmtNumber(meta.clicks)} />
          <KpiTile label="CTR" value={fmtPercent(meta.ctr)} />
          <KpiTile label="Landing Page Views" value={fmtNumber(meta.landing_page_views)} />
          <KpiTile label="Cost per LPV" value={fmtCurrencyOrDash(meta.costPerLpv)} />
          <KpiTile label="Conversions (Leads)" value={fmtNumber(meta.conversions_leads)} />
          <KpiTile label="Cost per Conversion" value={fmtCurrencyOrDash(meta.costPerConversion)} />
          <KpiTile label="Video Views" value={fmtNumber(meta.video_views)} />
          <KpiTile label="Post Engagements" value={fmtNumber(meta.post_engagements)} />
        </div>
      </section>

      <section>
        <SectionHeading number={2} title="Organic — Followers" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiTile label="Total Followers" value={fmtNumber(totalFollowers)} sublabel="across all platforms (latest)" />
          {followersByPlatform.slice(0, 3).map(p => (
            <KpiTile
              key={p.platform}
              label={p.platform}
              value={fmtNumber(p.followers)}
              sublabel={`as of ${p.date}`}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading number={3} title="Organic — Last 7 Days" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <KpiTile label="Page Views" value={fmtNumber(weeklyEngagement.page_views)} />
          <KpiTile label="Video Views" value={fmtNumber(weeklyEngagement.video_views)} />
          <KpiTile label="Post Engagements" value={fmtNumber(weeklyEngagement.post_engagements)} />
        </div>

        {engagementTrend.length > 0 && (
          <div className="mt-6 rounded-lg border border-dash-border bg-dash-surface p-4">
            <h3 className="mb-3 font-sans text-sm font-semibold text-dash-text">Engagement Trend — Last 30 Days</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={engagementTrend}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="date" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="page_views" stroke={TMRW_COLORS.blue} name="Page Views" dot={false} />
                <Line type="monotone" dataKey="video_views" stroke={TMRW_COLORS.green} name="Video Views" dot={false} />
                <Line type="monotone" dataKey="post_engagements" stroke={TMRW_COLORS.statusRed} name="Post Engagements" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {followersByPlatform.length > 0 && (
        <section>
          <SectionHeading number={4} title="Followers — All Platforms" />
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={followersByPlatform} layout="vertical">
                <CartesianGrid {...gridStyle} />
                <XAxis type="number" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis type="category" dataKey="platform" tick={axisTickStyle} axisLine={axisLineStyle} width={120} />
                <Tooltip />
                <Bar dataKey="followers" fill={TMRW_COLORS.blue} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}

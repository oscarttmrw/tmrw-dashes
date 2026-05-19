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
  const { metaAds, socialOrganic } = useDashboardData()

  // ── Social Organic: Total Followers (latest snapshot per platform) ──
  const followersByPlatform = useMemo(() => {
    const followersRows = socialOrganic.filter(r => r.metric_name === 'followers')
    const latest = new Map<string, { date: string; value: number }>()
    for (const row of followersRows) {
      const platform = String(row.platform ?? '')
      const date = String(row.date ?? '')
      const value = num(row.metric_value)
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
  }, [socialOrganic])

  const totalFollowers = useMemo(
    () => followersByPlatform.reduce((s, p) => s + p.followers, 0),
    [followersByPlatform]
  )

  // ── Social Organic: Weekly engagement metrics ──
  const weeklyEngagement = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10)
    const recent = socialOrganic.filter(r =>
      String(r.metric_name) !== 'followers' &&
      String(r.date ?? '') >= cutoff
    )
    const sums = { page_views: 0, video_views: 0, post_engagements: 0 }
    for (const row of recent) {
      const name = String(row.metric_name) as keyof typeof sums
      if (name in sums) {
        sums[name] += num(row.metric_value)
      }
    }
    return sums
  }, [socialOrganic])

  // ── Social Organic: Daily engagement trend (last 30 days) ──
  const engagementTrend = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString().slice(0, 10)
    const byDate = new Map<string, { date: string; page_views: number; video_views: number; post_engagements: number }>()
    for (const row of socialOrganic) {
      const date = String(row.date ?? '')
      const metric = String(row.metric_name)
      if (date < cutoff || metric === 'followers') continue
      if (!byDate.has(date)) {
        byDate.set(date, { date, page_views: 0, video_views: 0, post_engagements: 0 })
      }
      const bucket = byDate.get(date)!
      if (metric === 'page_views' || metric === 'video_views' || metric === 'post_engagements') {
        bucket[metric] += num(row.metric_value)
      }
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [socialOrganic])

  // ── Meta Ads: Headline numbers ──
  const totalMetaSpend = useMemo(
    () => metaAds.reduce((s, r) => s + num(r.spend), 0),
    [metaAds]
  )
  const totalImpressions = useMemo(
    () => metaAds.reduce((s, r) => s + num(r.impressions), 0),
    [metaAds]
  )
  const totalClicks = useMemo(
    () => metaAds.reduce((s, r) => s + num(r.clicks), 0),
    [metaAds]
  )
  const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null
  const totalConversions = useMemo(
    () => metaAds.reduce((s, r) => s + num(r.conversions_leads), 0),
    [metaAds]
  )
  const costPerConversion = totalConversions > 0 ? totalMetaSpend / totalConversions : null

  const fmtNumber = (n: number) => n.toLocaleString('en-AU')
  const fmtCurrency = (n: number) => `$${n.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
  const fmtPercent = (n: number | null) => n === null ? '—' : `${n.toFixed(2)}%`

  return (
    <div className="space-y-4 md:space-y-10">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Marketing' }]} />

      <section>
        <SectionHeading number={1} title="Paid — Meta Ads" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <KpiTile label="Total Spend" value={fmtCurrency(totalMetaSpend)} />
          <KpiTile label="Impressions" value={fmtNumber(totalImpressions)} />
          <KpiTile label="Clicks" value={fmtNumber(totalClicks)} />
          <KpiTile label="CTR" value={fmtPercent(overallCtr)} />
          <KpiTile
            label="Cost / Lead"
            value={costPerConversion === null ? '—' : fmtCurrency(costPerConversion)}
          />
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

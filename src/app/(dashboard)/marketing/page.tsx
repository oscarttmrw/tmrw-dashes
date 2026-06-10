'use client'

import { useMemo, useState } from 'react'
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import { useDashboardData } from '@/lib/context/data-context'
import {
  DateRangePicker,
  defaultDateRangePicker,
  type DateRangePickerValue,
} from '@/components/dashboard/date-range-picker'
import { axisTickStyle, gridStyle, tooltipStyle, legendStyle } from '@/lib/utils/chart-styles'
import {
  aggMeta, aggCalls, aggOps, aggRevenue, aggSocial, resolveLtv,
  dailySeries, deltaPct,
} from '@/lib/pulse/metrics'
import { fmtMoney, fmtNum, fmtPct, fmtDateShort } from '@/components/pulse/format'
import { KpiTile, MiniStat, DeltaChip } from '@/components/pulse/kpi'
import { FunnelFlow } from '@/components/pulse/funnel-flow'
import { PulseSection, CardTitle } from '@/components/pulse/section'
import { Reveal, Stagger, StaggerItem, LiftCard } from '@/components/pulse/motion'
import { CountUp } from '@/components/pulse/count-up'

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E4405F',
  Facebook: '#1877F2',
  LinkedIn: '#0A66C2',
}

export default function GrowthPage() {
  const { meta_ads, ghl_opportunities, operational_data, financial_revenue, social_followers, social_views, plan_targets } =
    useDashboardData()
  const [picker, setPicker] = useState<DateRangePickerValue>(() => defaultDateRangePicker())
  const period = picker.period
  const comparison = picker.comparison

  const meta = useMemo(() => aggMeta(meta_ads, period), [meta_ads, period])
  const metaPrev = useMemo(() => aggMeta(meta_ads, comparison), [meta_ads, comparison])
  const calls = useMemo(() => aggCalls(ghl_opportunities, period), [ghl_opportunities, period])
  const callsPrev = useMemo(() => aggCalls(ghl_opportunities, comparison), [ghl_opportunities, comparison])
  const ops = useMemo(() => aggOps(operational_data, period), [operational_data, period])
  const opsPrev = useMemo(() => aggOps(operational_data, comparison), [operational_data, comparison])
  const revenue = useMemo(() => aggRevenue(financial_revenue, period, 'net'), [financial_revenue, period])
  const social = useMemo(() => aggSocial(social_followers, social_views, period), [social_followers, social_views, period])
  const socialPrev = useMemo(() => aggSocial(social_followers, social_views, comparison), [social_followers, social_views, comparison])
  const { ltv, fromSettings } = useMemo(() => resolveLtv(plan_targets, period), [plan_targets, period])

  const cac = ops.registered > 0 ? meta.spend / ops.registered : 0
  const cacPrev = opsPrev.registered > 0 ? metaPrev.spend / opsPrev.registered : 0
  const ltvCac = cac > 0 ? ltv / cac : null
  const mer = meta.spend > 0 ? revenue.total / meta.spend : null
  const costPerCall = calls.booked > 0 ? meta.spend / calls.booked : 0
  const costPerCallPrev = callsPrev.booked > 0 ? metaPrev.spend / callsPrev.booked : 0

  const spendDaily = useMemo(
    () => dailySeries(meta_ads, 'date', ['spend', 'conversions_leads', 'clicks', 'landing_page_views', 'impressions'], period),
    [meta_ads, period]
  )
  const spendChart = useMemo(
    () =>
      spendDaily.map(r => ({
        ...r,
        label: fmtDateShort(String(r.date)),
        cpl: Number(r.conversions_leads) > 0 ? Number(r.spend) / Number(r.conversions_leads) : null,
      })),
    [spendDaily]
  )

  return (
    <div className="space-y-12 md:space-y-16">
      <header>
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-ui text-[11px] uppercase tracking-[0.16em] text-dash-text-muted">
                Acquisition · Funnel · Audience
              </p>
              <h1 className="mt-2 font-display text-5xl uppercase leading-[0.9] tracking-tight text-dash-text md:text-7xl">
                Growth
              </h1>
            </div>
            <DateRangePicker value={picker} onChange={setPicker} />
          </div>
        </Reveal>
      </header>

      {/* ─── 01 · Is the engine efficient? ─────────────────────────── */}
      <PulseSection
        number={1}
        title="Is the engine efficient?"
        subtitle="Unit economics first — everything else is detail"
      >
        <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4" gap={0.06}>
          <StaggerItem className="h-full">
            <KpiTile
              label="CAC"
              value={cac}
              format={v => fmtMoney(v)}
              direction="lower-better"
              delta={cac > 0 && cacPrev > 0 ? deltaPct(cac, cacPrev) : null}
              sublabel={`${fmtMoney(meta.spend, { compact: true })} spend ÷ ${ops.registered} members`}
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <KpiTile
              label="LTV : CAC"
              value={ltvCac ?? 0}
              format={v => `${v.toFixed(1)}x`}
              sublabel={`LTV ${fmtMoney(ltv)} ${fromSettings ? 'from plan targets' : '(fallback assumption)'} — 3x+ is healthy`}
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <KpiTile
              label="Marketing efficiency"
              value={mer ?? 0}
              format={v => `${v.toFixed(1)}x`}
              sublabel="Net revenue per $1 of ad spend (MER) — blended, all channels"
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <KpiTile
              label="Lead → member"
              value={meta.leads > 0 ? (ops.registered / meta.leads) * 100 : 0}
              format={v => fmtPct(v, 1)}
              delta={
                meta.leads > 0 && metaPrev.leads > 0 && opsPrev.registered > 0
                  ? deltaPct(ops.registered / meta.leads, opsPrev.registered / metaPrev.leads)
                  : null
              }
              sublabel={`${ops.registered} members from ${fmtNum(meta.leads)} leads this period`}
            />
          </StaggerItem>
        </Stagger>
      </PulseSection>

      {/* ─── 02 · The full funnel ──────────────────────────────────── */}
      <PulseSection
        number={2}
        title="Where does the funnel leak?"
        subtitle="Every paid impression, followed all the way to a signed member"
      >
        <div className="grid gap-4 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <LiftCard className="h-full p-5">
              <CardTitle title="Impression → member" hint="Stage-to-stage conversion shown between bars" />
              <FunnelFlow
                stages={[
                  { label: 'Impressions', value: meta.impressions, note: `${fmtMoney(meta.cpm, { digits: 2 })} CPM` },
                  { label: 'Clicks', value: meta.clicks, note: `${meta.ctr.toFixed(2)}% CTR` },
                  { label: 'Landing views', value: meta.lpv, note: meta.lpv > 0 ? `${fmtMoney(meta.costPerLpv, { digits: 2 })} each` : undefined },
                  { label: 'Leads', value: meta.leads, note: meta.leads > 0 ? `${fmtMoney(meta.cpl)} CPL` : undefined },
                  { label: 'Calls booked', value: calls.booked, note: calls.booked > 0 ? `${fmtMoney(costPerCall)} per call` : undefined },
                  { label: 'Calls held', value: calls.held },
                  { label: 'Members joined', value: ops.registered, note: cac > 0 ? `${fmtMoney(cac)} CAC` : undefined },
                ]}
              />
            </LiftCard>
          </Reveal>

          <div className="flex flex-col gap-4 lg:col-span-2">
            <Reveal delay={0.08}>
              <LiftCard accent className="p-5">
                <CardTitle title="Call performance" />
                <div className="grid grid-cols-3 gap-4">
                  <MiniStat label="Show rate" value={fmtPct(calls.showRate)} hint="Held ÷ booked" />
                  <MiniStat label="Close rate" value={fmtPct(calls.closeRate)} hint="Won ÷ held" />
                  <MiniStat label="Won" value={fmtNum(calls.won)} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-dash-border-subtle pt-3">
                  <span className="text-[11px] text-dash-text-muted">Cost per booked call</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-dash-text">{fmtMoney(costPerCall)}</span>
                    <DeltaChip
                      delta={costPerCall > 0 && costPerCallPrev > 0 ? deltaPct(costPerCall, costPerCallPrev) : null}
                      direction="lower-better"
                    />
                  </span>
                </div>
              </LiftCard>
            </Reveal>
            <Reveal delay={0.16}>
              <LiftCard accent className="p-5">
                <CardTitle title="Demand signals" hint="Upper-funnel attention this period" />
                <div className="grid grid-cols-3 gap-4">
                  <MiniStat label="Video views" value={fmtNum(meta.videoViews)} />
                  <MiniStat label="Engagements" value={fmtNum(meta.engagements)} />
                  <MiniStat label="Social views" value={fmtNum(social.views)} />
                </div>
              </LiftCard>
            </Reveal>
            <Reveal delay={0.24}>
              <LiftCard accent className="p-5">
                <CardTitle title="Audience" hint="Latest follower readings" />
                <div className="grid grid-cols-3 gap-4">
                  {social.followers.map(f => {
                    const prevF = socialPrev.followers.find(x => x.platform === f.platform)
                    return (
                      <div key={f.platform}>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_COLORS[f.platform] }} />
                          <span className="font-ui text-[10px] uppercase tracking-[0.08em] text-dash-text-muted">{f.platform}</span>
                        </div>
                        <p className="mt-1 font-mono text-lg font-bold tabular-nums text-dash-text">
                          <CountUp value={f.count} format={fmtNum} />
                        </p>
                        {prevF && prevF.count > 0 && f.count !== prevF.count && (
                          <p className="text-[10px] text-dash-text-muted">
                            {f.count > prevF.count ? '+' : ''}{fmtNum(f.count - prevF.count)} vs prev
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </LiftCard>
            </Reveal>
          </div>
        </div>
      </PulseSection>

      {/* ─── 03 · Spend over time ──────────────────────────────────── */}
      <PulseSection
        number={3}
        title="Is spend buying cheaper leads?"
        subtitle="Daily spend (bars) against cost per lead (line) — divergence is the story"
      >
        <Reveal>
          <LiftCard className="p-5">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={spendChart as object[]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} axisLine={false} minTickGap={36} />
                  <YAxis yAxisId="spend" tick={axisTickStyle} tickLine={false} axisLine={false} width={50} tickFormatter={(v: number) => fmtMoney(v, { compact: true })} />
                  <YAxis yAxisId="cpl" orientation="right" tick={axisTickStyle} tickLine={false} axisLine={false} width={50} tickFormatter={(v: number) => fmtMoney(v)} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) => {
                      const n = Number(v ?? 0)
                      if (name === 'Spend') return [fmtMoney(n), 'Spend']
                      if (name === 'Cost per lead') return [fmtMoney(n, { digits: 2 }), 'Cost per lead']
                      return [fmtNum(n), String(name)]
                    }}
                  />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar yAxisId="spend" dataKey="spend" name="Spend" fill="#1A1A1A" fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={26} />
                  <Line yAxisId="cpl" type="monotone" dataKey="cpl" name="Cost per lead" stroke="#E61317" strokeWidth={2.5} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-dash-border-subtle pt-4 md:grid-cols-5">
              <MiniStat label="Spend" value={fmtMoney(meta.spend, { compact: true })} />
              <MiniStat label="Leads" value={fmtNum(meta.leads)} />
              <MiniStat label="Avg CPL" value={meta.leads > 0 ? fmtMoney(meta.cpl, { digits: 2 }) : '—'} />
              <MiniStat label="CTR" value={`${meta.ctr.toFixed(2)}%`} />
              <MiniStat label="CPM" value={fmtMoney(meta.cpm, { digits: 2 })} />
            </div>
          </LiftCard>
        </Reveal>
      </PulseSection>
    </div>
  )
}

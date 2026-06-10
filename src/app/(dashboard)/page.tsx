'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useDashboardData } from '@/lib/context/data-context'
import {
  DateRangePicker,
  defaultDateRangePicker,
  type DateRangePickerValue,
} from '@/components/dashboard/date-range-picker'
import { axisTickStyle, gridStyle, tooltipStyle } from '@/lib/utils/chart-styles'
import {
  buildSnapshot, buildPulseScore, dailySeries, sparkValues, deltaPct, revenueRows,
  type PulseSources,
} from '@/lib/pulse/metrics'
import { buildInsights } from '@/lib/pulse/insights'
import { fmtMoney, fmtNum, fmtDateShort, fmtDays } from '@/components/pulse/format'
import { HeroKpi, MiniStat } from '@/components/pulse/kpi'
import { HealthRing, SubScoreBar } from '@/components/pulse/health-ring'
import { InsightFeed } from '@/components/pulse/insight-card'
import { FunnelFlow } from '@/components/pulse/funnel-flow'
import { PulseLine } from '@/components/pulse/pulse-line'
import { PulseSection, CardTitle } from '@/components/pulse/section'
import { Reveal, Stagger, StaggerItem, LiftCard } from '@/components/pulse/motion'

export default function PulseHomePage() {
  const data = useDashboardData()
  const [picker, setPicker] = useState<DateRangePickerValue>(() => defaultDateRangePicker())

  const sources: PulseSources = data
  const period = picker.period
  const comparison = picker.comparison

  const now = useMemo(() => buildSnapshot(sources, period), [sources, period])
  const prev = useMemo(() => buildSnapshot(sources, comparison), [sources, comparison])
  const pulse = useMemo(() => buildPulseScore(now, prev), [now, prev])
  const insights = useMemo(() => buildInsights(now, prev), [now, prev])

  /* Daily series for hero sparks + revenue chart */
  const revenueDaily = useMemo(
    () => dailySeries(revenueRows(sources.financial_revenue, 'net'), 'date', ['total'], period),
    [sources.financial_revenue, period]
  )
  const spendDaily = useMemo(
    () => dailySeries(sources.meta_ads, 'date', ['spend', 'conversions_leads'], period),
    [sources.meta_ads, period]
  )
  const membersDaily = useMemo(
    () => dailySeries(sources.operational_data, 'date', ['customers_registered'], period),
    [sources.operational_data, period]
  )

  const revenueChart = useMemo(
    () => revenueDaily.map(r => ({ ...r, label: fmtDateShort(String(r.date)) })),
    [revenueDaily]
  )

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="space-y-12 md:space-y-16">
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <header className="relative">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-ui text-[11px] uppercase tracking-[0.16em] text-dash-text-muted">
                {today} — the state of TMRW
              </p>
              <div className="mt-2 flex items-end gap-5">
                <h1 className="font-display text-5xl uppercase leading-[0.9] tracking-tight text-dash-text md:text-7xl">
                  Pulse
                </h1>
                <PulseLine className="mb-1 h-9 w-40 md:mb-2 md:h-11 md:w-56" />
              </div>
            </div>
            <DateRangePicker value={picker} onChange={setPicker} />
          </div>
        </Reveal>

        {/* Hero KPIs */}
        <Stagger className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-dash-border py-7 md:grid-cols-3 xl:grid-cols-5" gap={0.07}>
          <StaggerItem>
            <HeroKpi
              label="Net revenue"
              value={now.revenue.total}
              format={v => fmtMoney(v, { compact: true })}
              delta={deltaPct(now.revenue.total, prev.revenue.total)}
              spark={sparkValues(revenueDaily, 'total')}
              sparkColor="#8B0000"
            />
          </StaggerItem>
          <StaggerItem>
            <HeroKpi
              label="Members joined"
              value={now.ops.registered}
              format={v => fmtNum(v)}
              delta={deltaPct(now.ops.registered, prev.ops.registered)}
              spark={sparkValues(membersDaily, 'customers_registered')}
              sparkColor="#1A1A1A"
            />
          </StaggerItem>
          <StaggerItem>
            <HeroKpi
              label="Ad spend"
              value={now.meta.spend}
              format={v => fmtMoney(v, { compact: true })}
              direction="lower-better"
              delta={deltaPct(now.meta.spend, prev.meta.spend)}
              spark={sparkValues(spendDaily, 'spend')}
              sparkColor="#737373"
            />
          </StaggerItem>
          <StaggerItem>
            <HeroKpi
              label="CAC"
              value={now.cac}
              format={v => fmtMoney(v)}
              direction="lower-better"
              delta={now.cac > 0 && prev.cac > 0 ? deltaPct(now.cac, prev.cac) : null}
            />
          </StaggerItem>
          <StaggerItem>
            <HeroKpi
              label="LTV : CAC"
              value={now.ltvCacRatio ?? 0}
              format={v => `${v.toFixed(1)}x`}
              delta={
                now.ltvCacRatio !== null && prev.ltvCacRatio !== null
                  ? deltaPct(now.ltvCacRatio, prev.ltvCacRatio)
                  : null
              }
            />
          </StaggerItem>
        </Stagger>
      </header>

      {/* ─── 01 · How healthy is the business? ────────────────────── */}
      <PulseSection
        number={1}
        title="How healthy is the business?"
        subtitle="One score, five vital signs — each compares this period to the last"
      >
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Reveal>
            <LiftCard className="flex h-full flex-col items-center justify-center gap-4 p-6">
              <HealthRing score={pulse.score} />
              <p className="max-w-[220px] text-center text-[11px] leading-relaxed text-dash-text-muted">
                Weighted blend of growth, revenue, acquisition efficiency, delivery speed and member care.
              </p>
            </LiftCard>
          </Reveal>
          <Reveal delay={0.1}>
            <LiftCard className="grid h-full content-center gap-5 p-6 sm:grid-cols-2 lg:gap-x-10">
              {pulse.subScores.map(s => (
                <SubScoreBar key={s.key} label={s.label} score={s.score} detail={s.detail} />
              ))}
              <div className="flex items-end">
                <p className="text-[11px] leading-relaxed text-dash-text-muted">
                  50 = no change vs previous period. Hover a bar for what&apos;s behind it.
                </p>
              </div>
            </LiftCard>
          </Reveal>
        </div>
      </PulseSection>

      {/* ─── 02 · What changed? ───────────────────────────────────── */}
      <PulseSection
        number={2}
        title="What changed?"
        subtitle="Auto-generated findings, ranked by how much they should change your week"
      >
        <InsightFeed insights={insights} />
      </PulseSection>

      {/* ─── 03 · Where is the money flowing? ─────────────────────── */}
      <PulseSection
        number={3}
        title="Where is the money flowing?"
        subtitle="Daily net revenue against the acquisition engine feeding it"
      >
        <div className="grid gap-4 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <LiftCard className="h-full p-5">
              <CardTitle
                title="Net revenue by day"
                hint={`${fmtMoney(now.dailyRevenue)} / day average this period`}
                right={
                  <Link href="/financial" className="flex items-center gap-1 font-ui text-[10px] uppercase tracking-[0.1em] text-dash-text-secondary hover:text-dash-red">
                    Revenue <ArrowRight size={11} />
                  </Link>
                }
              />
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChart as object[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="pulse-rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B0000" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#8B0000" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...gridStyle} vertical={false} />
                    <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} axisLine={false} minTickGap={36} />
                    <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => fmtMoney(v, { compact: true })} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v) => [fmtMoney(Number(v ?? 0)), 'Net revenue']}
                    />
                    <Area type="monotone" dataKey="total" stroke="#8B0000" fill="url(#pulse-rev)" strokeWidth={2.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </LiftCard>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-2">
            <LiftCard className="h-full p-5">
              <CardTitle
                title="Acquisition engine"
                hint="From paid lead to signed member, this period"
                right={
                  <Link href="/marketing" className="flex items-center gap-1 font-ui text-[10px] uppercase tracking-[0.1em] text-dash-text-secondary hover:text-dash-red">
                    Growth <ArrowRight size={11} />
                  </Link>
                }
              />
              <FunnelFlow
                stages={[
                  { label: 'Leads', value: now.meta.leads, note: now.meta.leads > 0 ? `${fmtMoney(now.meta.cpl)} each` : undefined },
                  { label: 'Calls booked', value: now.calls.booked },
                  { label: 'Calls held', value: now.calls.held, note: now.calls.booked > 0 ? `${now.calls.showRate.toFixed(0)}% show rate` : undefined },
                  { label: 'Members joined', value: now.ops.registered, note: now.cac > 0 ? `${fmtMoney(now.cac)} CAC` : undefined },
                ]}
              />
            </LiftCard>
          </Reveal>
        </div>
      </PulseSection>

      {/* ─── 04 · The wider picture ───────────────────────────────── */}
      <PulseSection
        number={4}
        title="The wider picture"
        subtitle="Delivery, care and audience — the slow-moving signals"
      >
        <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6" gap={0.05}>
          <StaggerItem className="h-full">
            <LiftCard accent className="h-full p-4">
              <MiniStat label="Casebook size" value={fmtNum(now.ops.casebook)} hint="Latest total casebook reading" />
              <p className="mt-2 text-[10px] text-dash-text-muted">
                {now.ops.netGrowth >= 0 ? '+' : ''}{now.ops.netGrowth} net this period
              </p>
            </LiftCard>
          </StaggerItem>
          <StaggerItem className="h-full">
            <LiftCard accent className="h-full p-4">
              <MiniStat label="Time to insight" value={fmtDays(now.journey.medianDaysToUnlockInPeriod ?? now.journey.medianDaysToUnlock)} hint="Median days, joined → dashboard unlocked" />
              <p className="mt-2 text-[10px] text-dash-text-muted">joined → dashboard unlocked</p>
            </LiftCard>
          </StaggerItem>
          <StaggerItem className="h-full">
            <LiftCard accent className="h-full p-4">
              <MiniStat label="Dashboards unlocked" value={fmtNum(now.journey.stages.find(s => s.key === 'unlocked')?.inPeriod ?? 0)} />
              <p className="mt-2 text-[10px] text-dash-text-muted">{now.journey.unlockRate.toFixed(0)}% of members all-time</p>
            </LiftCard>
          </StaggerItem>
          <StaggerItem className="h-full">
            <LiftCard accent className="h-full p-4">
              <MiniStat label="Support tickets" value={fmtNum(now.care.created)} />
              <p className="mt-2 text-[10px] text-dash-text-muted">
                {now.care.csatScore !== null ? `${now.care.csatScore.toFixed(0)}% CSAT` : 'No CSAT responses'}
              </p>
            </LiftCard>
          </StaggerItem>
          <StaggerItem className="h-full">
            <LiftCard accent className="h-full p-4">
              <MiniStat label="Social audience" value={fmtNum(now.social.totalFollowers)} />
              <p className="mt-2 text-[10px] text-dash-text-muted">across IG · FB · LinkedIn</p>
            </LiftCard>
          </StaggerItem>
          <StaggerItem className="h-full">
            <LiftCard accent className="h-full p-4">
              <MiniStat
                label="Revenue / member"
                value={now.revenuePerMember !== null ? fmtMoney(now.revenuePerMember) : '—'}
                hint="Period net revenue ÷ casebook size"
              />
              <p className="mt-2 text-[10px] text-dash-text-muted">this period, per casebook member</p>
            </LiftCard>
          </StaggerItem>
        </Stagger>
      </PulseSection>
    </div>
  )
}

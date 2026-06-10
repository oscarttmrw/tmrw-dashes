'use client'

import { useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useDashboardData } from '@/lib/context/data-context'
import {
  DateRangePicker,
  defaultDateRangePicker,
  type DateRangePickerValue,
} from '@/components/dashboard/date-range-picker'
import { axisTickStyle, gridStyle, tooltipStyle, legendStyle } from '@/lib/utils/chart-styles'
import {
  aggJourney, aggOps, aggCare, dailySeries, sparkValues, deltaPct, num, inPeriod,
} from '@/lib/pulse/metrics'
import { fmtNum, fmtPct, fmtDateShort, fmtDays, fmtMins } from '@/components/pulse/format'
import { KpiTile, MiniStat } from '@/components/pulse/kpi'
import { FunnelFlow } from '@/components/pulse/funnel-flow'
import { PulseSection, CardTitle } from '@/components/pulse/section'
import { Reveal, Stagger, StaggerItem, LiftCard } from '@/components/pulse/motion'

export default function MembersPage() {
  const { hubspot_contacts, operational_data, zendesk } = useDashboardData()
  const [picker, setPicker] = useState<DateRangePickerValue>(() => defaultDateRangePicker())
  const period = picker.period
  const comparison = picker.comparison

  const journey = useMemo(() => aggJourney(hubspot_contacts, period), [hubspot_contacts, period])
  const journeyPrev = useMemo(() => aggJourney(hubspot_contacts, comparison), [hubspot_contacts, comparison])
  const ops = useMemo(() => aggOps(operational_data, period), [operational_data, period])
  const opsPrev = useMemo(() => aggOps(operational_data, comparison), [operational_data, comparison])
  const care = useMemo(() => aggCare(zendesk, period), [zendesk, period])
  const carePrev = useMemo(() => aggCare(zendesk, comparison), [zendesk, comparison])

  const joinedDaily = useMemo(
    () => dailySeries(operational_data, 'date', ['customers_registered', 'churned_members'], period),
    [operational_data, period]
  )
  const joinedChart = useMemo(
    () => joinedDaily.map(r => ({
      ...r,
      label: fmtDateShort(String(r.date)),
      churned_neg: -num(r.churned_members),
    })),
    [joinedDaily]
  )

  /* Casebook is a cumulative snapshot — plot the raw readings in period. */
  const casebookChart = useMemo(() => {
    return operational_data
      .filter(r => inPeriod(r.date, period) && num(r.total_casebook) > 0)
      .map(r => ({
        date: String(r.date).slice(0, 10),
        casebook: num(r.total_casebook),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(r => ({ ...r, label: fmtDateShort(r.date) }))
  }, [operational_data, period])

  const stageInPeriod = (key: string) => journey.stages.find(s => s.key === key)?.inPeriod ?? 0
  const timeToInsight = journey.medianDaysToUnlockInPeriod ?? journey.medianDaysToUnlock

  return (
    <div className="space-y-12 md:space-y-16">
      <header>
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-ui text-[11px] uppercase tracking-[0.16em] text-dash-text-muted">
                Journey · Retention · Care
              </p>
              <h1 className="mt-2 font-display text-5xl uppercase leading-[0.9] tracking-tight text-dash-text md:text-7xl">
                Members
              </h1>
            </div>
            <DateRangePicker value={picker} onChange={setPicker} />
          </div>
        </Reveal>
      </header>

      {/* ─── 01 · The base ─────────────────────────────────────────── */}
      <PulseSection
        number={1}
        title="Is the base growing?"
        subtitle="Joins, churn and the casebook — the only numbers that compound"
      >
        <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4" gap={0.06}>
          <StaggerItem className="h-full">
            <KpiTile
              label="Members joined"
              value={ops.registered}
              format={fmtNum}
              delta={deltaPct(ops.registered, opsPrev.registered)}
              spark={sparkValues(joinedDaily, 'customers_registered')}
              sparkColor="#1A1A1A"
              sublabel="customers registered this period"
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <KpiTile
              label="Churned"
              value={ops.churned}
              format={fmtNum}
              direction="lower-better"
              delta={opsPrev.churned > 0 ? deltaPct(ops.churned, opsPrev.churned) : null}
              sublabel={`net growth ${ops.netGrowth >= 0 ? '+' : ''}${ops.netGrowth} this period`}
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <KpiTile
              label="Casebook size"
              value={ops.casebook}
              format={fmtNum}
              sublabel="latest cumulative reading"
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <KpiTile
              label="Time to insight"
              value={timeToInsight ?? 0}
              format={v => fmtDays(v)}
              direction="lower-better"
              delta={
                journey.medianDaysToUnlockInPeriod !== null && journeyPrev.medianDaysToUnlockInPeriod !== null && journeyPrev.medianDaysToUnlockInPeriod > 0
                  ? deltaPct(journey.medianDaysToUnlockInPeriod, journeyPrev.medianDaysToUnlockInPeriod)
                  : null
              }
              sublabel="median days from joining to dashboard unlocked"
            />
          </StaggerItem>
        </Stagger>

        <Reveal delay={0.1} className="mt-4">
          <LiftCard className="p-5">
            <CardTitle title="Joins vs churn by day" hint="Churn plotted below the line — the gap is net growth" />
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={joinedChart as object[]} stackOffset="sign" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} axisLine={false} minTickGap={36} />
                  <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) => [fmtNum(Math.abs(Number(v ?? 0))), String(name)]}
                  />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="customers_registered" name="Joined" stackId="net" fill="#1A1A1A" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="churned_neg" name="Churned" stackId="net" fill="#E61317" radius={[0, 0, 3, 3]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </LiftCard>
        </Reveal>
      </PulseSection>

      {/* ─── 02 · The journey ──────────────────────────────────────── */}
      <PulseSection
        number={2}
        title="How fast do members reach value?"
        subtitle="The path from joining to an unlocked health dashboard"
      >
        <div className="grid gap-4 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <LiftCard className="h-full p-5">
              <CardTitle
                title="Journey funnel — this period"
                hint="Members reaching each milestone within the selected dates"
              />
              <FunnelFlow
                stages={journey.stages.map(s => ({
                  label: s.label,
                  value: s.inPeriod,
                  note: `${fmtNum(s.allTime)} all-time`,
                }))}
              />
            </LiftCard>
          </Reveal>
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Reveal delay={0.08}>
              <LiftCard accent className="p-5">
                <CardTitle title="All-time picture" />
                <div className="grid grid-cols-3 gap-4">
                  <MiniStat label="Active members" value={fmtNum(journey.activeMembers)} hint="Joined minus churned, all-time" />
                  <MiniStat label="Unlock rate" value={fmtPct(journey.unlockRate)} hint="Members who reached an unlocked dashboard" />
                  <MiniStat label="Churned" value={fmtNum(journey.churnedAllTime)} />
                </div>
              </LiftCard>
            </Reveal>
            <Reveal delay={0.16}>
              <LiftCard accent className="p-5">
                <CardTitle title="Delivery throughput" hint="Pods this period" />
                <div className="grid grid-cols-2 gap-4">
                  <MiniStat label="Pods created" value={fmtNum(ops.podsCreated)} />
                  <MiniStat label="Pods dispatched" value={fmtNum(ops.podsDispatched)} />
                </div>
              </LiftCard>
            </Reveal>
            <Reveal delay={0.24}>
              <LiftCard accent className="flex-1 p-5">
                <CardTitle title="Casebook trend" hint="Cumulative members on the books" />
                {casebookChart.length >= 2 ? (
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={casebookChart as object[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="casebook-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8B0000" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#8B0000" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} axisLine={false} minTickGap={48} />
                        <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtNum(Number(v ?? 0)), 'Casebook']} />
                        <Area type="monotone" dataKey="casebook" stroke="#8B0000" strokeWidth={2.5} fill="url(#casebook-fill)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-[11px] text-dash-text-muted">Not enough casebook readings in this period.</p>
                )}
              </LiftCard>
            </Reveal>
          </div>
        </div>
      </PulseSection>

      {/* ─── 03 · Care ─────────────────────────────────────────────── */}
      <PulseSection
        number={3}
        title="Are members well looked after?"
        subtitle="Support volume, speed and sentiment for the period"
      >
        <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4" gap={0.06}>
          <StaggerItem className="h-full">
            <KpiTile
              label="Tickets created"
              value={care.created}
              format={fmtNum}
              direction="lower-better"
              delta={carePrev.created > 0 ? deltaPct(care.created, carePrev.created) : null}
              sublabel={`${fmtNum(care.open)} still open or pending`}
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <KpiTile
              label="First reply (median)"
              value={care.medianFirstReplyMins ?? 0}
              format={v => fmtMins(v)}
              direction="lower-better"
              delta={
                care.medianFirstReplyMins !== null && carePrev.medianFirstReplyMins !== null && carePrev.medianFirstReplyMins > 0
                  ? deltaPct(care.medianFirstReplyMins, carePrev.medianFirstReplyMins)
                  : null
              }
              sublabel="time to first human response"
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <KpiTile
              label="Resolution (median)"
              value={care.medianResolutionMins ?? 0}
              format={v => fmtMins(v)}
              direction="lower-better"
              delta={
                care.medianResolutionMins !== null && carePrev.medianResolutionMins !== null && carePrev.medianResolutionMins > 0
                  ? deltaPct(care.medianResolutionMins, carePrev.medianResolutionMins)
                  : null
              }
              sublabel="full resolution, business hours"
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <KpiTile
              label="CSAT"
              value={care.csatScore ?? 0}
              format={v => (care.csatScore === null ? '—' : fmtPct(v))}
              sublabel={
                care.csatScore === null
                  ? 'no rated tickets this period'
                  : `${care.csatGood} good · ${care.csatBad} bad`
              }
            />
          </StaggerItem>
        </Stagger>
      </PulseSection>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useDashboardData } from '@/lib/context/data-context'
import {
  DateRangePicker,
  defaultDateRangePicker,
  type DateRangePickerValue,
} from '@/components/dashboard/date-range-picker'
import { axisTickStyle, gridStyle, tooltipStyle, legendStyle } from '@/lib/utils/chart-styles'
import {
  aggRevenue, aggStripe, aggOps, dailySeries, deltaPct, revenueRows, sparkValues,
  REVENUE_STREAMS,
} from '@/lib/pulse/metrics'
import { fmtMoney, fmtNum, fmtPct, fmtDateShort } from '@/components/pulse/format'
import { KpiTile, MiniStat } from '@/components/pulse/kpi'
import { PulseSection, CardTitle } from '@/components/pulse/section'
import { Reveal, Stagger, StaggerItem, LiftCard } from '@/components/pulse/motion'
import { CountUp } from '@/components/pulse/count-up'

/** Warm-to-dark editorial palette for the six revenue streams. */
const STREAM_COLORS: Record<string, string> = {
  membership: '#8B0000',
  joining_fees: '#E61317',
  tmrw_stacks: '#1A1A1A',
  supplements: '#D97706',
  peptides: '#7C3AED',
  advanced_tests: '#2563EB',
}

export default function RevenuePage() {
  const { financial_revenue, stripe, operational_data } = useDashboardData()
  const [picker, setPicker] = useState<DateRangePickerValue>(() => defaultDateRangePicker())
  const [view, setView] = useState<'net' | 'gross'>('net')
  const period = picker.period
  const comparison = picker.comparison

  const rev = useMemo(() => aggRevenue(financial_revenue, period, view), [financial_revenue, period, view])
  const revPrev = useMemo(() => aggRevenue(financial_revenue, comparison, view), [financial_revenue, comparison, view])
  const net = useMemo(() => aggRevenue(financial_revenue, period, 'net'), [financial_revenue, period])
  const gross = useMemo(() => aggRevenue(financial_revenue, period, 'gross'), [financial_revenue, period])
  const stripeAgg = useMemo(() => aggStripe(stripe, period), [stripe, period])
  const stripePrev = useMemo(() => aggStripe(stripe, comparison), [stripe, comparison])
  const ops = useMemo(() => aggOps(operational_data, period), [operational_data, period])

  const streamKeys = REVENUE_STREAMS.map(s => s.key)
  const daily = useMemo(
    () => dailySeries(revenueRows(financial_revenue, view), 'date', [...streamKeys, 'total'], period),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [financial_revenue, period, view]
  )
  const chart = useMemo(() => daily.map(r => ({ ...r, label: fmtDateShort(String(r.date)) })), [daily])

  const margin = gross.total > 0 ? (net.total / gross.total) * 100 : null
  const sortedStreams = [...rev.byStream].sort((a, b) => b.value - a.value)
  const maxStream = sortedStreams[0]?.value ?? 0

  return (
    <div className="space-y-12 md:space-y-16">
      <header>
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-ui text-[11px] uppercase tracking-[0.16em] text-dash-text-muted">
                Streams · Quality · Run rate
              </p>
              <h1 className="mt-2 font-display text-5xl uppercase leading-[0.9] tracking-tight text-dash-text md:text-7xl">
                Revenue
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Net / Gross toggle */}
              <div className="relative flex rounded-lg border border-dash-border bg-dash-surface p-0.5">
                {(['net', 'gross'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`relative z-10 rounded-md px-3 py-1.5 font-ui text-[11px] font-medium uppercase tracking-[0.08em] transition-colors ${
                      view === v ? 'text-white' : 'text-dash-text-secondary hover:text-dash-text'
                    }`}
                  >
                    {view === v && (
                      <motion.span
                        layoutId="rev-toggle"
                        className="absolute inset-0 -z-10 rounded-md bg-dash-black"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    {v}
                  </button>
                ))}
              </div>
              <DateRangePicker value={picker} onChange={setPicker} />
            </div>
          </div>
        </Reveal>
      </header>

      {/* ─── 01 · The headline ─────────────────────────────────────── */}
      <PulseSection
        number={1}
        title="What did we make?"
        subtitle={`${view === 'net' ? 'Net' : 'Gross (RRP)'} revenue this period, and the shape of it`}
      >
        <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4" gap={0.06}>
          <StaggerItem className="h-full">
            <KpiTile
              label={`${view} revenue`}
              value={rev.total}
              format={v => fmtMoney(v, { compact: true })}
              delta={deltaPct(rev.total, revPrev.total)}
              spark={sparkValues(daily, 'total')}
              sublabel={`${fmtMoney(rev.total / Math.max(1, rev.activeDays))} per trading day`}
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <KpiTile
              label="Recurring share"
              value={rev.recurringShare}
              format={v => fmtPct(v)}
              delta={revPrev.total > 0 ? rev.recurringShare - revPrev.recurringShare : null}
              sublabel={`${fmtMoney(rev.recurring, { compact: true })} membership of ${fmtMoney(rev.total, { compact: true })} total`}
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <KpiTile
              label="Net : gross margin"
              value={margin ?? 0}
              format={v => fmtPct(v)}
              sublabel={
                margin !== null
                  ? `${fmtMoney(gross.total - net.total, { compact: true })} between RRP and net this period`
                  : 'Needs both net and gross sheets uploaded'
              }
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <KpiTile
              label="Revenue / member"
              value={ops.casebook > 0 ? rev.total / ops.casebook : 0}
              format={v => fmtMoney(v)}
              sublabel={`across ${fmtNum(ops.casebook)} casebook members`}
            />
          </StaggerItem>
        </Stagger>
      </PulseSection>

      {/* ─── 02 · Streams over time ────────────────────────────────── */}
      <PulseSection
        number={2}
        title="Which streams carry it?"
        subtitle="Daily revenue stacked by product line — watch the layers trade places"
      >
        <div className="grid gap-4 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <LiftCard className="h-full p-5">
              <CardTitle title={`${view} revenue by stream`} />
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart as object[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid {...gridStyle} vertical={false} />
                    <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} axisLine={false} minTickGap={36} />
                    <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => fmtMoney(v, { compact: true })} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v, name) => [fmtMoney(Number(v ?? 0)), String(name)]}
                    />
                    <Legend wrapperStyle={legendStyle} />
                    {REVENUE_STREAMS.map(s => (
                      <Area
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.label}
                        stackId="rev"
                        stroke={STREAM_COLORS[s.key]}
                        fill={STREAM_COLORS[s.key]}
                        fillOpacity={0.55}
                        strokeWidth={1}
                        dot={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </LiftCard>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-2">
            <LiftCard className="h-full p-5">
              <CardTitle title="Stream league table" hint="Share of period revenue, largest first" />
              <div className="space-y-4">
                {sortedStreams.map((s, i) => {
                  const prevS = revPrev.byStream.find(x => x.key === s.key)
                  const d = prevS && prevS.value > 0 ? deltaPct(s.value, prevS.value) : null
                  return (
                    <div key={s.key}>
                      <div className="flex items-baseline justify-between">
                        <span className="flex items-center gap-2 font-ui text-[11px] uppercase tracking-[0.06em] text-dash-text">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STREAM_COLORS[s.key] }} />
                          {s.label}
                        </span>
                        <span className="font-mono text-[12px] tabular-nums text-dash-text">
                          <CountUp value={s.value} format={v => fmtMoney(v, { compact: true })} className="font-bold" />
                          <span className="ml-2 text-dash-text-muted">{s.share.toFixed(0)}%</span>
                          {d !== null && (
                            <span className={`ml-2 ${d >= 0 ? 'text-status-green' : 'text-status-red'}`}>
                              {d >= 0 ? '▲' : '▼'}{Math.abs(d).toFixed(0)}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-dash-surface-alt">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: STREAM_COLORS[s.key] }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${maxStream > 0 ? (s.value / maxStream) * 100 : 0}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </LiftCard>
          </Reveal>
        </div>
      </PulseSection>

      {/* ─── 03 · Quality of revenue ───────────────────────────────── */}
      <PulseSection
        number={3}
        title="How durable is it?"
        subtitle="Stripe invoices split into new business vs renewals — the compounding test"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Reveal>
            <LiftCard accent className="h-full p-5">
              <CardTitle title="Invoices collected" />
              <p className="font-mono text-3xl font-bold tabular-nums text-dash-text">
                <CountUp value={stripeAgg.paid} format={v => fmtMoney(v, { compact: true })} />
              </p>
              <p className="mt-1 text-[11px] text-dash-text-muted">
                {fmtNum(stripeAgg.invoices)} paid invoices · avg {fmtMoney(stripeAgg.avgInvoice)}
              </p>
            </LiftCard>
          </Reveal>
          <Reveal delay={0.08}>
            <LiftCard accent className="h-full p-5">
              <CardTitle title="New vs renewal mix" hint="By Stripe billing reason" />
              <div className="mt-1 flex h-3.5 w-full overflow-hidden rounded-full bg-dash-surface-alt">
                {stripeAgg.paid > 0 && (
                  <>
                    <motion.div
                      className="h-full bg-tmrw-syringe"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(stripeAgg.newBusiness / stripeAgg.paid) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <motion.div
                      className="h-full bg-dash-black"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(stripeAgg.renewals / stripeAgg.paid) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniStat label="New" value={fmtMoney(stripeAgg.newBusiness, { compact: true })} />
                <MiniStat label="Renewals" value={fmtMoney(stripeAgg.renewals, { compact: true })} />
                <MiniStat label="Other" value={fmtMoney(stripeAgg.other, { compact: true })} />
              </div>
            </LiftCard>
          </Reveal>
          <Reveal delay={0.16}>
            <LiftCard accent className="h-full p-5">
              <CardTitle title="Renewal share" hint="Higher = more of the period was already earned" />
              <p className="font-mono text-3xl font-bold tabular-nums text-dash-text">
                <CountUp value={stripeAgg.renewalShare} format={v => fmtPct(v)} />
              </p>
              <p className="mt-1 text-[11px] text-dash-text-muted">
                was {fmtPct(stripePrev.renewalShare)} previous period
              </p>
            </LiftCard>
          </Reveal>
        </div>
      </PulseSection>
    </div>
  )
}

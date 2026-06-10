'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Area, Bar, Cell, ComposedChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import { useDashboardData } from '@/lib/context/data-context'
import { axisTickStyle, gridStyle, tooltipStyle, legendStyle } from '@/lib/utils/chart-styles'
import { revenueRows, num, inPeriod } from '@/lib/pulse/metrics'
import {
  trailingDaily, trimZeroEdges, movingAverage, linearRegression, holtForecast,
  controlSeries, lagCorrelation, correlationStrength, logFit, logFitPredict,
  marginalCostAt, weekdayProfile, cohortSurvival, revenueBridge, mean,
  type ControlPoint,
} from '@/lib/pulse/stats'
import { fmtMoney, fmtNum, fmtDateShort } from '@/components/pulse/format'
import { MiniStat } from '@/components/pulse/kpi'
import { PulseSection, CardTitle } from '@/components/pulse/section'
import { Reveal, LiftCard } from '@/components/pulse/motion'
import { CalendarHeatmap } from '@/components/pulse/heatmap'
import { CountUp } from '@/components/pulse/count-up'

/* ─── Local helpers ───────────────────────────────────────────────── */

type DailyPoint = { date: string; value: number }

/** Count matching rows per day over the trailing window. */
function countDaily(
  rows: Record<string, unknown>[],
  dateKey: string,
  days: number,
  match: (r: Record<string, unknown>) => boolean = () => true
): DailyPoint[] {
  const end = new Date(); end.setHours(23, 59, 59, 999)
  const start = new Date(end); start.setDate(start.getDate() - (days - 1)); start.setHours(0, 0, 0, 0)
  const byDay = new Map<string, number>()
  for (const r of rows) {
    if (!match(r) || !r[dateKey]) continue
    const t = new Date(String(r[dateKey]))
    if (isNaN(t.getTime()) || t < start || t > end) continue
    const day = t.toISOString().slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }
  const out: DailyPoint[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const day = cursor.toISOString().slice(0, 10)
    out.push({ date: day, value: byDay.get(day) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

/** Slice both series to the span where each has at least one nonzero value. */
function alignPair(a: DailyPoint[], b: DailyPoint[]): { a: number[]; b: number[] } {
  const first = (s: DailyPoint[]) => s.findIndex(p => p.value > 0)
  const last = (s: DailyPoint[]) => s.length - 1 - [...s].reverse().findIndex(p => p.value > 0)
  const fa = first(a), fb = first(b)
  if (fa === -1 || fb === -1) return { a: [], b: [] }
  const start = Math.max(fa, fb)
  const end = Math.min(last(a), last(b))
  if (end - start < 13) return { a: [], b: [] }
  return { a: a.slice(start, end + 1).map(p => p.value), b: b.slice(start, end + 1).map(p => p.value) }
}

function NeedsData({ what }: { what: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-dash-border">
      <p className="font-ui text-[11px] uppercase tracking-[0.1em] text-dash-text-muted">Needs more data</p>
      <p className="max-w-sm text-center text-[11px] text-dash-text-muted">{what}</p>
    </div>
  )
}

const ANOMALY_METRICS = [
  { key: 'revenue', label: 'Net revenue', money: true },
  { key: 'spend', label: 'Ad spend', money: true },
  { key: 'leads', label: 'Leads', money: false },
  { key: 'members', label: 'Members joined', money: false },
] as const
type AnomalyMetricKey = (typeof ANOMALY_METRICS)[number]['key']

const WINDOWS = [90, 180, 365] as const

const COHORT_COLORS = ['#8B0000', '#E61317', '#1A1A1A', '#D97706', '#2563EB', '#7C3AED', '#0891B2', '#737373']

/* ─── Page ────────────────────────────────────────────────────────── */

export default function LabPage() {
  const { financial_revenue, meta_ads, operational_data, ghl_opportunities, hubspot_contacts } = useDashboardData()
  const [windowDays, setWindowDays] = useState<(typeof WINDOWS)[number]>(90)
  const [anomalyMetric, setAnomalyMetric] = useState<AnomalyMetricKey>('revenue')

  /* ── Daily series over the analysis window ── */
  const netRows = useMemo(() => revenueRows(financial_revenue, 'net'), [financial_revenue])
  const revDaily = useMemo(() => trailingDaily(netRows, 'date', 'total', windowDays), [netRows, windowDays])
  const spendDaily = useMemo(() => trailingDaily(meta_ads, 'date', 'spend', windowDays), [meta_ads, windowDays])
  const leadsDaily = useMemo(() => trailingDaily(meta_ads, 'date', 'conversions_leads', windowDays), [meta_ads, windowDays])
  const joinsDaily = useMemo(() => trailingDaily(operational_data, 'date', 'customers_registered', windowDays), [operational_data, windowDays])
  const callsDaily = useMemo(
    () => countDaily(ghl_opportunities, 'created_on', windowDays,
      r => ['Call Booked', 'No Show', 'Call Attended', 'Won', 'Cancelled', 'Rescheduled'].includes(String(r.stage ?? ''))),
    [ghl_opportunities, windowDays]
  )

  /* ── 01 Forecast ── */
  const revTrimmed = useMemo(() => trimZeroEdges(revDaily), [revDaily])
  const forecast = useMemo(() => holtForecast(revTrimmed.map(p => p.value), 21), [revTrimmed])
  const trend = useMemo(() => linearRegression(revTrimmed.map(p => p.value)), [revTrimmed])
  const ma7 = useMemo(() => movingAverage(revTrimmed.map(p => p.value), 7), [revTrimmed])

  const forecastChart = useMemo(() => {
    if (revTrimmed.length === 0) return []
    const hist = revTrimmed.map((p, i) => ({
      label: fmtDateShort(p.date),
      actual: p.value,
      ma: ma7[i],
      forecast: null as number | null,
      band: null as [number, number] | null,
    }))
    if (!forecast.ok) return hist
    const lastDate = new Date(revTrimmed[revTrimmed.length - 1].date + 'T00:00:00Z')
    // Anchor the forecast line to the last actual so it reads as a continuation.
    if (hist.length > 0) hist[hist.length - 1].forecast = revTrimmed[revTrimmed.length - 1].value
    const fut = forecast.points.map((v, h) => {
      const d = new Date(lastDate); d.setUTCDate(d.getUTCDate() + h + 1)
      return {
        label: fmtDateShort(d.toISOString().slice(0, 10)),
        actual: null as number | null,
        ma: null as number | null,
        forecast: v,
        band: [Math.max(0, v - forecast.half[h]), v + forecast.half[h]] as [number, number],
      }
    })
    return [...hist, ...fut]
  }, [revTrimmed, ma7, forecast])

  const next30 = useMemo(() => {
    if (!forecast.ok) return null
    const f30 = holtForecast(revTrimmed.map(p => p.value), 30)
    if (!f30.ok) return null
    const total = f30.points.reduce((s, v) => s + v, 0)
    const half = Math.sqrt(f30.half.reduce((s, h) => s + (h / 1.96) ** 2, 0)) * 1.96
    return { total, half }
  }, [forecast.ok, revTrimmed])

  /* ── 02 Anomalies ── */
  const anomalySeries = useMemo(() => {
    const src = anomalyMetric === 'revenue' ? revDaily
      : anomalyMetric === 'spend' ? spendDaily
      : anomalyMetric === 'leads' ? leadsDaily
      : joinsDaily
    return trimZeroEdges(src)
  }, [anomalyMetric, revDaily, spendDaily, leadsDaily, joinsDaily])

  const control = useMemo(() => controlSeries(anomalySeries.map(p => p.value)), [anomalySeries])
  const anomalies = useMemo(
    () => control.filter(c => c.anomaly).map(c => ({ ...c, date: anomalySeries[c.index].date })).reverse().slice(0, 6),
    [control, anomalySeries]
  )
  const controlChart = useMemo(
    () => control.map((c, i) => ({
      label: fmtDateShort(anomalySeries[i].date),
      value: c.value,
      center: c.center,
      band: c.upper !== null && c.lower !== null ? [c.lower, c.upper] : null,
      anomalyDot: c.anomaly ? c.value : null,
    })),
    [control, anomalySeries]
  )
  const anomalyIsMoney = ANOMALY_METRICS.find(m => m.key === anomalyMetric)?.money ?? false
  const fmtAnomaly = (v: number) => (anomalyIsMoney ? fmtMoney(v) : fmtNum(v))

  /* ── 03 Lead–lag relationships ── */
  const relationships = useMemo(() => {
    const defs = [
      { id: 'spend-leads', a: 'Ad spend', b: 'Leads', pair: alignPair(spendDaily, leadsDaily) },
      { id: 'spend-calls', a: 'Ad spend', b: 'Calls booked', pair: alignPair(spendDaily, callsDaily) },
      { id: 'leads-joins', a: 'Leads', b: 'Members joined', pair: alignPair(leadsDaily, joinsDaily) },
      { id: 'spend-rev', a: 'Ad spend', b: 'Net revenue', pair: alignPair(spendDaily, revDaily) },
    ]
    return defs.map(d => ({ ...d, result: lagCorrelation(d.pair.a, d.pair.b) }))
  }, [spendDaily, leadsDaily, callsDaily, joinsDaily, revDaily])

  /* ── 04 Diminishing returns ── */
  const spendLeadPairs = useMemo(() => {
    const n = Math.min(spendDaily.length, leadsDaily.length)
    const pairs: { spend: number; leads: number }[] = []
    for (let i = 0; i < n; i++) {
      if (spendDaily[i].value > 0) pairs.push({ spend: spendDaily[i].value, leads: leadsDaily[i].value })
    }
    return pairs
  }, [spendDaily, leadsDaily])

  const returnsFit = useMemo(
    () => logFit(spendLeadPairs.map(p => p.spend), spendLeadPairs.map(p => p.leads)),
    [spendLeadPairs]
  )
  const returnsCurve = useMemo(() => {
    if (!returnsFit.ok) return []
    const max = Math.max(...spendLeadPairs.map(p => p.spend))
    const pts: { spend: number; fitted: number }[] = []
    for (let i = 1; i <= 40; i++) {
      const x = (max * 1.15 * i) / 40
      pts.push({ spend: x, fitted: logFitPredict(returnsFit, x) })
    }
    return pts
  }, [returnsFit, spendLeadPairs])
  const typicalSpend = useMemo(() => mean(spendLeadPairs.map(p => p.spend)), [spendLeadPairs])
  const marginalCpl = useMemo(() => marginalCostAt(returnsFit, typicalSpend), [returnsFit, typicalSpend])
  const avgCpl = useMemo(() => {
    const s = spendLeadPairs.reduce((acc, p) => acc + p.spend, 0)
    const l = spendLeadPairs.reduce((acc, p) => acc + p.leads, 0)
    return l > 0 ? s / l : null
  }, [spendLeadPairs])

  /* ── 05 Seasonality ── */
  const revProfile = useMemo(() => weekdayProfile(trimZeroEdges(revDaily)), [revDaily])
  const leadProfile = useMemo(() => weekdayProfile(trimZeroEdges(leadsDaily)), [leadsDaily])

  /* ── 06 Cohorts ── */
  const cohorts = useMemo(() => cohortSurvival(hubspot_contacts), [hubspot_contacts])
  const cohortChart = useMemo(() => {
    const maxLen = Math.max(0, ...cohorts.map(c => c.survival.length))
    return Array.from({ length: maxLen }, (_, m) => {
      const row: Record<string, number | string | null> = { month: `M${m}` }
      for (const c of cohorts) row[c.label] = c.survival[m] ?? null
      return row
    })
  }, [cohorts])

  /* ── 07 Revenue bridge (trailing 30d vs prior 30d) ── */
  const bridge = useMemo(() => {
    const end = new Date(); end.setHours(23, 59, 59, 999)
    const start = new Date(end); start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0)
    const prevEnd = new Date(start.getTime() - 1)
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 29); prevStart.setHours(0, 0, 0, 0)
    const sum = (p: { start: Date; end: Date }, key: string) =>
      netRows.filter(r => inPeriod(r.date, p)).reduce((s, r) => s + num(r[key]), 0)
    const nowP = { start, end }
    const prevP = { start: prevStart, end: prevEnd }
    const streams = [
      { label: 'Membership', key: 'membership' },
      { label: 'Joining fees', key: 'joining_fees' },
      { label: 'Stacks', key: 'tmrw_stacks' },
      { label: 'Supplements', key: 'supplements' },
      { label: 'Peptides', key: 'peptides' },
      { label: 'Adv. tests', key: 'advanced_tests' },
    ].map(s => ({ label: s.label, now: sum(nowP, s.key), prev: sum(prevP, s.key) }))
    return revenueBridge(sum(prevP, 'total'), streams, sum(nowP, 'total'))
  }, [netRows])

  const bridgeChart = useMemo(
    () => bridge.map(s => ({
      label: s.label,
      range: [s.base, s.base + Math.abs(s.delta)] as [number, number],
      kind: s.kind,
      delta: s.delta,
      total: s.total,
    })),
    [bridge]
  )
  const bridgeColor = (kind: string) =>
    kind === 'start' || kind === 'end' ? '#1A1A1A' : kind === 'up' ? '#16A34A' : '#DC2626'

  const hasBridge = bridge.length > 2 && bridge[0].total > 0

  /* ── Render ── */
  return (
    <div className="space-y-12 md:space-y-16">
      <header>
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-ui text-[11px] uppercase tracking-[0.16em] text-dash-text-muted">
                Forecasts · Anomalies · Causality · Seasonality · Cohorts
              </p>
              <h1 className="mt-2 font-display text-5xl uppercase leading-[0.9] tracking-tight text-dash-text md:text-7xl">
                The Lab
              </h1>
              <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-dash-text-secondary">
                Statistical deep-dives over the trailing window. Everything here is computed
                live from the uploaded data — no assumptions beyond the ones printed next to each chart.
              </p>
            </div>
            <div className="flex rounded-lg border border-dash-border bg-dash-surface p-0.5">
              {WINDOWS.map(w => (
                <button
                  key={w}
                  onClick={() => setWindowDays(w)}
                  className={`relative z-10 rounded-md px-3 py-1.5 font-ui text-[11px] font-medium uppercase tracking-[0.08em] transition-colors ${
                    windowDays === w ? 'text-white' : 'text-dash-text-secondary hover:text-dash-text'
                  }`}
                >
                  {windowDays === w && (
                    <motion.span
                      layoutId="lab-window"
                      className="absolute inset-0 -z-10 rounded-md bg-dash-black"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  {w}d
                </button>
              ))}
            </div>
          </div>
        </Reveal>
      </header>

      {/* ─── 01 · Forecast ─────────────────────────────────────────── */}
      <PulseSection
        number={1}
        title="Where is revenue heading?"
        subtitle="Holt double-exponential smoothing, 21-day projection, 95% confidence band"
      >
        <Reveal>
          <LiftCard className="p-5">
            {revTrimmed.length < 10 ? (
              <NeedsData what="At least 10 days of net revenue are needed before a forecast is statistically defensible." />
            ) : (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecastChart as object[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid {...gridStyle} vertical={false} />
                      <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} axisLine={false} minTickGap={44} />
                      <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => fmtMoney(v, { compact: true })} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v, name) => {
                          if (name === '95% band' && Array.isArray(v)) {
                            return [`${fmtMoney(Number(v[0]))} – ${fmtMoney(Number(v[1]))}`, '95% band']
                          }
                          return [fmtMoney(Number(v ?? 0)), String(name)]
                        }}
                      />
                      <Legend wrapperStyle={legendStyle} />
                      <Area dataKey="band" name="95% band" stroke="none" fill="#E61317" fillOpacity={0.1} connectNulls={false} />
                      <Line type="monotone" dataKey="actual" name="Actual" stroke="#B8B5AE" strokeWidth={1.5} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="ma" name="7-day average" stroke="#8B0000" strokeWidth={2.5} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#E61317" strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-dash-border-subtle pt-4 md:grid-cols-4">
                  <div>
                    <p className="font-mono text-lg font-bold tabular-nums text-dash-text">
                      {next30 ? <CountUp value={next30.total} format={v => fmtMoney(v, { compact: true })} /> : '—'}
                    </p>
                    <p className="mt-0.5 font-ui text-[10px] uppercase tracking-[0.08em] text-dash-text-muted">Next 30 days, projected</p>
                  </div>
                  <MiniStat label="± at 95%" value={next30 ? fmtMoney(next30.half, { compact: true }) : '—'} />
                  <MiniStat
                    label="Trend / day"
                    value={`${trend.slope >= 0 ? '+' : '−'}${fmtMoney(Math.abs(trend.slope))}`}
                    hint="OLS slope of daily net revenue"
                  />
                  <MiniStat label="Trend fit R²" value={trend.r2.toFixed(2)} hint="0 = noise, 1 = perfect line" />
                </div>
              </>
            )}
          </LiftCard>
        </Reveal>
      </PulseSection>

      {/* ─── 02 · Anomalies ────────────────────────────────────────── */}
      <PulseSection
        number={2}
        title="What broke the pattern?"
        subtitle="Rolling 14-day control limits — any day outside ±2σ of its own recent history is flagged"
        right={
          <div className="flex flex-wrap gap-1.5">
            {ANOMALY_METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => setAnomalyMetric(m.key)}
                className={`rounded-full border px-3 py-1 font-ui text-[10px] font-medium uppercase tracking-[0.08em] transition-colors ${
                  anomalyMetric === m.key
                    ? 'border-dash-black bg-dash-black text-white'
                    : 'border-dash-border bg-dash-surface text-dash-text-secondary hover:border-dash-border-strong'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <LiftCard className="h-full p-5">
              {anomalySeries.length < 14 ? (
                <NeedsData what="Control limits need at least two weeks of history for this metric." />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={controlChart as object[]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid {...gridStyle} vertical={false} />
                      <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} axisLine={false} minTickGap={44} />
                      <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => (anomalyIsMoney ? fmtMoney(v, { compact: true }) : fmtNum(v))} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v, name) => {
                          if (name === 'Expected range' && Array.isArray(v)) {
                            return [`${fmtAnomaly(Number(v[0]))} – ${fmtAnomaly(Number(v[1]))}`, 'Expected range']
                          }
                          return [fmtAnomaly(Number(v ?? 0)), String(name)]
                        }}
                      />
                      <Legend wrapperStyle={legendStyle} />
                      <Area dataKey="band" name="Expected range" stroke="none" fill="#1A1A1A" fillOpacity={0.07} connectNulls={false} />
                      <Line type="monotone" dataKey="center" name="Rolling mean" stroke="#737373" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="value" name="Actual" stroke="#8B0000" strokeWidth={2} dot={false} />
                      <Scatter dataKey="anomalyDot" name="Anomaly" fill="#E61317" shape="circle" />
                      <ZAxis range={[70, 70]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </LiftCard>
          </Reveal>
          <Reveal delay={0.1}>
            <LiftCard className="h-full p-5">
              <CardTitle title="Flagged days" hint="Most recent first, with how far outside the pattern they were" />
              {anomalies.length === 0 ? (
                <p className="text-[12px] leading-relaxed text-dash-text-muted">
                  No days outside ±2σ in this window. The metric is behaving — which is exactly what
                  a control chart is for: knowing silence is real.
                </p>
              ) : (
                <ul className="space-y-3">
                  {anomalies.map(a => (
                    <li key={a.date} className="flex items-start justify-between gap-3 border-b border-dash-border-subtle pb-2.5 last:border-0">
                      <div>
                        <p className="font-mono text-[12px] font-semibold text-dash-text">{fmtDateShort(a.date)}</p>
                        <p className="text-[11px] text-dash-text-muted">
                          {fmtAnomaly(a.value)} vs expected ~{a.center !== null ? fmtAnomaly(a.center) : '—'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${(a.z ?? 0) > 0 ? 'bg-status-green-light text-status-green' : 'bg-status-red-light text-status-red'}`}>
                        {(a.z ?? 0) > 0 ? '+' : ''}{(a.z ?? 0).toFixed(1)}σ
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </LiftCard>
          </Reveal>
        </div>
      </PulseSection>

      {/* ─── 03 · Lead–lag ─────────────────────────────────────────── */}
      <PulseSection
        number={3}
        title="What drives what — and how fast?"
        subtitle="Lagged cross-correlation: shift one series forward in time until it best explains the other"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {relationships.map((rel, i) => (
            <Reveal key={rel.id} delay={i * 0.07}>
              <LiftCard accent className="flex h-full flex-col p-5">
                <p className="font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-dash-text-secondary">
                  {rel.a} <span className="text-tmrw-syringe">→</span> {rel.b}
                </p>
                {!rel.result.ok ? (
                  <p className="mt-3 text-[11px] leading-relaxed text-dash-text-muted">
                    Not enough overlapping history yet — needs ~2 weeks where both series have data.
                  </p>
                ) : (
                  <>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-mono text-3xl font-bold tabular-nums text-dash-text">
                        {rel.result.lag === 0 ? 'same day' : `${rel.result.lag}d`}
                      </span>
                      {rel.result.lag > 0 && <span className="text-[11px] text-dash-text-muted">later</span>}
                    </div>
                    <p className="mt-1 font-mono text-[12px] tabular-nums text-dash-text-secondary">
                      r = {rel.result.r.toFixed(2)} <span className="text-dash-text-muted">({correlationStrength(rel.result.r)})</span>
                    </p>
                    {/* r-by-lag strip */}
                    <div className="mt-3 flex h-9 items-end gap-[2px]">
                      {rel.result.byLag.map(x => (
                        <motion.div
                          key={x.lag}
                          title={`lag ${x.lag}d · r=${x.r.toFixed(2)}`}
                          className="flex-1 rounded-t-sm"
                          style={{ background: x.lag === rel.result.lag ? '#E61317' : '#D4D2CB' }}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${Math.max(6, Math.abs(x.r) * 100)}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: x.lag * 0.025 }}
                        />
                      ))}
                    </div>
                    <p className="mt-3 border-t border-dash-border-subtle pt-2.5 text-[11px] leading-relaxed text-dash-text-muted">
                      {Math.abs(rel.result.r) < 0.3
                        ? `No meaningful link found in this window — treat ${rel.b.toLowerCase()} as driven by something else.`
                        : rel.result.lag === 0
                          ? `Movements in ${rel.a.toLowerCase()} show up in ${rel.b.toLowerCase()} on the same day.`
                          : `A change in ${rel.a.toLowerCase()} takes roughly ${rel.result.lag} day${rel.result.lag === 1 ? '' : 's'} to appear in ${rel.b.toLowerCase()}.`}
                    </p>
                  </>
                )}
              </LiftCard>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <p className="mt-3 text-[11px] italic text-dash-text-muted">
            Correlation, not causation — but a stable lag structure is the strongest hint observational data can give.
          </p>
        </Reveal>
      </PulseSection>

      {/* ─── 04 · Diminishing returns ──────────────────────────────── */}
      <PulseSection
        number={4}
        title="Is the next ad dollar still worth it?"
        subtitle="Each dot is one day. The curve is leads = a + b·ln(spend) — the classic saturation shape"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <LiftCard className="h-full p-5">
              {!returnsFit.ok ? (
                <NeedsData what="Needs at least 10 days with non-zero ad spend to fit a saturation curve." />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                      <CartesianGrid {...gridStyle} />
                      <XAxis
                        dataKey="spend" type="number" name="Spend"
                        tick={axisTickStyle} tickLine={false} axisLine={false}
                        tickFormatter={(v: number) => fmtMoney(v, { compact: true })}
                        domain={[0, 'dataMax']}
                      />
                      <YAxis dataKey="leads" type="number" tick={axisTickStyle} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v, name) => (name === 'Spend' ? [fmtMoney(Number(v)), 'Spend'] : [fmtNum(Number(v ?? 0)), String(name)])}
                      />
                      <Scatter data={spendLeadPairs as object[]} dataKey="leads" name="Day" fill="#1A1A1A" fillOpacity={0.45} />
                      <Line data={returnsCurve as object[]} dataKey="fitted" name="Fitted curve" stroke="#E61317" strokeWidth={2.5} dot={false} type="monotone" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </LiftCard>
          </Reveal>
          <Reveal delay={0.1}>
            <LiftCard className="h-full p-5">
              <CardTitle title="The marginal read" />
              {!returnsFit.ok || marginalCpl === null || avgCpl === null ? (
                <p className="text-[12px] text-dash-text-muted">Waiting on enough spend history.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="font-mono text-2xl font-bold tabular-nums text-dash-text">
                      <CountUp value={marginalCpl} format={v => fmtMoney(v)} />
                    </p>
                    <p className="mt-0.5 font-ui text-[10px] uppercase tracking-[0.08em] text-dash-text-muted">
                      Marginal cost per lead at typical daily spend ({fmtMoney(typicalSpend)})
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-bold tabular-nums text-dash-text">{fmtMoney(avgCpl)}</p>
                    <p className="mt-0.5 font-ui text-[10px] uppercase tracking-[0.08em] text-dash-text-muted">Average cost per lead</p>
                  </div>
                  <p className="border-t border-dash-border-subtle pt-3 text-[11.5px] leading-relaxed text-dash-text-secondary">
                    {marginalCpl > avgCpl * 1.5
                      ? `The next lead costs ~${(marginalCpl / avgCpl).toFixed(1)}x the average — the curve is flattening. Scaling spend buys leads at a real premium; creative or channel diversification may be cheaper.`
                      : `Marginal and average cost are still close (${(marginalCpl / avgCpl).toFixed(1)}x) — the channel isn't saturated at current spend. There's likely headroom.`}
                  </p>
                  <p className="font-mono text-[10px] text-dash-text-muted">fit R² = {returnsFit.r2.toFixed(2)} · n = {returnsFit.n} days</p>
                </div>
              )}
            </LiftCard>
          </Reveal>
        </div>
      </PulseSection>

      {/* ─── 05 · Seasonality ──────────────────────────────────────── */}
      <PulseSection
        number={5}
        title="Does the week have a shape?"
        subtitle="Weekday indices (100 = average day) and the raw daily texture"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { title: 'Net revenue by weekday', profile: revProfile, color: '#8B0000', heat: revDaily, money: true },
            { title: 'Leads by weekday', profile: leadProfile, color: '#1A1A1A', heat: leadsDaily, money: false },
          ].map((cfg, idx) => (
            <Reveal key={cfg.title} delay={idx * 0.08}>
              <LiftCard className="h-full p-5">
                <CardTitle
                  title={cfg.title}
                  hint={cfg.profile.ok ? `Best: ${cfg.profile.best} · Quietest: ${cfg.profile.worst}` : undefined}
                />
                {!cfg.profile.ok ? (
                  <NeedsData what="Needs a few weeks of daily data to separate weekday effects from noise." />
                ) : (
                  <>
                    <div className="flex h-28 items-end gap-2">
                      {cfg.profile.days.map((d, i) => (
                        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                          <span className="font-mono text-[9.5px] tabular-nums text-dash-text-secondary">{Math.round(d.index)}</span>
                          <motion.div
                            className="w-full rounded-t-md"
                            style={{ background: d.label === cfg.profile.best ? '#E61317' : cfg.color, opacity: d.label === cfg.profile.best ? 1 : 0.55 }}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${Math.max(4, (d.index / 160) * 100)}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                          />
                          <span className="font-mono text-[9px] uppercase text-dash-text-muted">{d.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 border-t border-dash-border-subtle pt-4">
                      <CalendarHeatmap
                        data={cfg.heat}
                        weeks={16}
                        color={cfg.color}
                        format={v => (cfg.money ? fmtMoney(v) : fmtNum(v))}
                      />
                    </div>
                  </>
                )}
              </LiftCard>
            </Reveal>
          ))}
        </div>
      </PulseSection>

      {/* ─── 06 · Cohorts ──────────────────────────────────────────── */}
      <PulseSection
        number={6}
        title="Do members stay?"
        subtitle="Monthly join cohorts from HubSpot — % still active after each month, only fully-observed months shown"
      >
        <Reveal>
          <LiftCard className="p-5">
            {cohorts.length < 2 ? (
              <NeedsData what="Cohort curves need at least two complete monthly cohorts with join dates in HubSpot." />
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="h-72 lg:col-span-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cohortChart as object[]} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid {...gridStyle} vertical={false} />
                      <XAxis dataKey="month" tick={axisTickStyle} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={axisTickStyle} tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`${Number(v).toFixed(0)}%`, String(name)]} />
                      <Legend wrapperStyle={legendStyle} />
                      {cohorts.map((c, i) => (
                        <Line
                          key={c.monthKey}
                          type="monotone"
                          dataKey={c.label}
                          stroke={COHORT_COLORS[i % COHORT_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <CardTitle title="Cohort sizes" />
                  <ul className="space-y-2">
                    {cohorts.map((c, i) => (
                      <li key={c.monthKey} className="flex items-center justify-between border-b border-dash-border-subtle pb-1.5 last:border-0">
                        <span className="flex items-center gap-2 text-[12px] text-dash-text">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COHORT_COLORS[i % COHORT_COLORS.length] }} />
                          {c.label}
                        </span>
                        <span className="font-mono text-[12px] tabular-nums text-dash-text-secondary">
                          {c.size} joined · {c.survival[c.survival.length - 1].toFixed(0)}% retained
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </LiftCard>
        </Reveal>
      </PulseSection>

      {/* ─── 07 · Revenue bridge ───────────────────────────────────── */}
      <PulseSection
        number={7}
        title="What explains the last 30 days?"
        subtitle="Waterfall from the prior 30 days to now, stream by stream, biggest movers first"
      >
        <Reveal>
          <LiftCard className="p-5">
            {!hasBridge ? (
              <NeedsData what="Needs net revenue across both of the last two 30-day windows." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={bridgeChart as object[]} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid {...gridStyle} vertical={false} />
                    <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} axisLine={false} interval={0} angle={-14} textAnchor="end" height={46} />
                    <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => fmtMoney(v, { compact: true })} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(_v, _name, entry) => {
                        const p = entry?.payload as { kind: string; delta: number; total: number } | undefined
                        if (!p) return ['', '']
                        if (p.kind === 'start' || p.kind === 'end') return [fmtMoney(p.total), 'Total']
                        return [`${p.delta >= 0 ? '+' : '−'}${fmtMoney(Math.abs(p.delta))}`, 'Change']
                      }}
                    />
                    <Bar dataKey="range" radius={[4, 4, 4, 4]} maxBarSize={56} isAnimationActive>
                      {bridgeChart.map((s, i) => (
                        <Cell key={i} fill={bridgeColor(s.kind)} fillOpacity={s.kind === 'start' ? 0.55 : 1} />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </LiftCard>
        </Reveal>
      </PulseSection>
    </div>
  )
}

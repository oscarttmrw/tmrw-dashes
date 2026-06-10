/**
 * Pulse statistical toolkit.
 *
 * Pure, dependency-free implementations of the analyst techniques used in
 * the Lab: regression, smoothing, control limits, anomaly detection,
 * Holt forecasting, lagged cross-correlation, log-fit diminishing returns,
 * weekday seasonality and cohort survival.
 *
 * Everything degrades gracefully on small samples — callers check the
 * `ok` / null markers rather than trusting magic numbers from n=3.
 */

import type { CanonicalRow } from '@/lib/context/data-context'
import { num, daysBetween } from './metrics'

/* ─── Basics ──────────────────────────────────────────────────────── */

export function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length
}

export function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}

export interface LinReg {
  slope: number
  intercept: number
  r2: number
  n: number
}

/** Ordinary least squares of ys against 0..n-1. */
export function linearRegression(ys: number[]): LinReg {
  const n = ys.length
  if (n < 3) return { slope: 0, intercept: ys[0] ?? 0, r2: 0, n }
  const xs = ys.map((_, i) => i)
  const mx = mean(xs)
  const my = mean(ys)
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) ** 2
    syy += (ys[i] - my) ** 2
  }
  const slope = sxx === 0 ? 0 : sxy / sxx
  const intercept = my - slope * mx
  const r2 = sxx === 0 || syy === 0 ? 0 : (sxy * sxy) / (sxx * syy)
  return { slope, intercept, r2, n }
}

export function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length)
  if (n < 8) return null
  const ma = mean(a.slice(0, n))
  const mb = mean(b.slice(0, n))
  let sab = 0, saa = 0, sbb = 0
  for (let i = 0; i < n; i++) {
    sab += (a[i] - ma) * (b[i] - mb)
    saa += (a[i] - ma) ** 2
    sbb += (b[i] - mb) ** 2
  }
  if (saa === 0 || sbb === 0) return null
  return sab / Math.sqrt(saa * sbb)
}

export function movingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null
    return mean(values.slice(i - window + 1, i + 1))
  })
}

/* ─── Control chart / anomaly detection ───────────────────────────── */

export interface ControlPoint {
  index: number
  value: number
  center: number | null   // rolling mean
  upper: number | null    // +2σ
  lower: number | null    // −2σ
  z: number | null
  anomaly: boolean
}

/**
 * Rolling-window control chart. Each point is judged against the mean/σ of
 * the `window` points *before* it (so an anomaly doesn't dampen its own
 * limits).
 */
export function controlSeries(values: number[], window = 14, threshold = 2): ControlPoint[] {
  return values.map((value, index) => {
    const past = values.slice(Math.max(0, index - window), index)
    if (past.length < Math.min(7, window)) {
      return { index, value, center: null, upper: null, lower: null, z: null, anomaly: false }
    }
    const m = mean(past)
    const sd = stdDev(past)
    const z = sd === 0 ? 0 : (value - m) / sd
    return {
      index,
      value,
      center: m,
      upper: m + threshold * sd,
      lower: Math.max(0, m - threshold * sd),
      z,
      anomaly: sd > 0 && Math.abs(z) >= threshold,
    }
  })
}

/* ─── Holt double-exponential forecast ───────────────────────────── */

export interface Forecast {
  ok: boolean
  /** point forecasts for h = 1..horizon */
  points: number[]
  /** symmetric 95% band half-widths per step */
  half: number[]
  /** one-step residual σ */
  sigma: number
}

export function holtForecast(values: number[], horizon: number, alpha = 0.35, beta = 0.1): Forecast {
  if (values.length < 10) return { ok: false, points: [], half: [], sigma: 0 }
  let level = values[0]
  let trend = values[1] - values[0]
  const residuals: number[] = []
  for (let i = 1; i < values.length; i++) {
    const pred = level + trend
    residuals.push(values[i] - pred)
    const prevLevel = level
    level = alpha * values[i] + (1 - alpha) * (level + trend)
    trend = beta * (level - prevLevel) + (1 - beta) * trend
  }
  const sigma = stdDev(residuals)
  const points: number[] = []
  const half: number[] = []
  for (let h = 1; h <= horizon; h++) {
    points.push(Math.max(0, level + trend * h))
    half.push(1.96 * sigma * Math.sqrt(h))
  }
  return { ok: true, points, half, sigma }
}

/* ─── Lagged cross-correlation ────────────────────────────────────── */

export interface LagResult {
  ok: boolean
  /** Best lag in days: a[t] correlates with b[t + lag]. */
  lag: number
  r: number
  byLag: { lag: number; r: number }[]
}

/**
 * Find the lag (0..maxLag days) at which series `a` best predicts series
 * `b`. Positive result: movements in `a` show up in `b` `lag` days later.
 */
export function lagCorrelation(a: number[], b: number[], maxLag = 14): LagResult {
  const byLag: { lag: number; r: number }[] = []
  for (let lag = 0; lag <= maxLag; lag++) {
    const n = Math.min(a.length, b.length) - lag
    if (n < 14) continue
    const r = pearson(a.slice(0, n), b.slice(lag, lag + n))
    if (r !== null) byLag.push({ lag, r })
  }
  if (byLag.length === 0) return { ok: false, lag: 0, r: 0, byLag }
  const best = byLag.reduce((acc, x) => (Math.abs(x.r) > Math.abs(acc.r) ? x : acc))
  return { ok: true, lag: best.lag, r: best.r, byLag }
}

export function correlationStrength(r: number): string {
  const a = Math.abs(r)
  if (a >= 0.7) return 'strong'
  if (a >= 0.5) return 'moderate'
  if (a >= 0.3) return 'weak'
  return 'negligible'
}

/* ─── Diminishing returns (log fit) ───────────────────────────────── */

export interface LogFit {
  ok: boolean
  /** y = a + b·ln(x) */
  a: number
  b: number
  r2: number
  n: number
}

/** Fit leads = a + b·ln(spend) on days where spend > 0. */
export function logFit(xs: number[], ys: number[]): LogFit {
  const pairs = xs
    .map((x, i) => ({ x, y: ys[i] }))
    .filter(p => p.x > 0 && p.y !== undefined)
  if (pairs.length < 10) return { ok: false, a: 0, b: 0, r2: 0, n: pairs.length }
  const lx = pairs.map(p => Math.log(p.x))
  const ly = pairs.map(p => p.y)
  const mx = mean(lx)
  const my = mean(ly)
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < pairs.length; i++) {
    sxy += (lx[i] - mx) * (ly[i] - my)
    sxx += (lx[i] - mx) ** 2
    syy += (ly[i] - my) ** 2
  }
  if (sxx === 0 || syy === 0) return { ok: false, a: 0, b: 0, r2: 0, n: pairs.length }
  const b = sxy / sxx
  const a = my - b * mx
  return { ok: true, a, b, r2: (sxy * sxy) / (sxx * syy), n: pairs.length }
}

/** Predicted leads at spend x under the fitted curve. */
export function logFitPredict(fit: LogFit, x: number): number {
  return x <= 0 ? 0 : Math.max(0, fit.a + fit.b * Math.log(x))
}

/** Marginal cost of one extra lead at spend level x: dx/dy = x / b. */
export function marginalCostAt(fit: LogFit, x: number): number | null {
  if (!fit.ok || fit.b <= 0 || x <= 0) return null
  return x / fit.b
}

/* ─── Weekday seasonality ─────────────────────────────────────────── */

export interface WeekdayProfile {
  ok: boolean
  /** Monday-first. index = avg for that weekday ÷ overall avg × 100. */
  days: { label: string; avg: number; index: number; n: number }[]
  best: string
  worst: string
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function weekdayProfile(series: { date: string; value: number }[]): WeekdayProfile {
  const buckets: number[][] = Array.from({ length: 7 }, () => [])
  for (const p of series) {
    const d = new Date(p.date + 'T00:00:00Z')
    if (isNaN(d.getTime())) continue
    const idx = (d.getUTCDay() + 6) % 7 // Monday-first
    buckets[idx].push(p.value)
  }
  const overall = mean(series.map(p => p.value))
  const days = WEEKDAY_LABELS.map((label, i) => ({
    label,
    avg: mean(buckets[i]),
    index: overall > 0 ? (mean(buckets[i]) / overall) * 100 : 0,
    n: buckets[i].length,
  }))
  const withData = days.filter(d => d.n >= 2)
  if (withData.length < 5 || overall === 0) {
    return { ok: false, days, best: '', worst: '' }
  }
  const best = withData.reduce((a, b) => (b.avg > a.avg ? b : a)).label
  const worst = withData.reduce((a, b) => (b.avg < a.avg ? b : a)).label
  return { ok: true, days, best, worst }
}

/* ─── Cohort survival (HubSpot contacts) ──────────────────────────── */

export interface Cohort {
  label: string      // e.g. "Jan 26"
  monthKey: string   // "2026-01"
  size: number
  /** Retention % at month offsets 0..k — only offsets fully observed. */
  survival: number[]
}

export function cohortSurvival(contacts: CanonicalRow[], maxCohorts = 8, maxOffset = 6): Cohort[] {
  const nowKey = new Date().toISOString().slice(0, 7)
  const byMonth = new Map<string, { joined: string; churn: string | null }[]>()
  for (const r of contacts) {
    const joined = r.customer_entered_at ? String(r.customer_entered_at).slice(0, 10) : null
    if (!joined) continue
    const key = joined.slice(0, 7)
    if (key >= nowKey) continue // current partial month excluded
    const list = byMonth.get(key) ?? []
    list.push({ joined, churn: r.churn_date ? String(r.churn_date).slice(0, 10) : null })
    byMonth.set(key, list)
  }

  const monthsBetween = (a: string, b: string) =>
    (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)))

  const keys = Array.from(byMonth.keys()).sort().slice(-maxCohorts)
  return keys
    .map(key => {
      const members = byMonth.get(key)!
      const observed = Math.min(maxOffset, monthsBetween(key, nowKey) - 1)
      const survival: number[] = []
      for (let m = 0; m <= Math.max(0, observed); m++) {
        const alive = members.filter(x => {
          if (!x.churn) return true
          const churnOffset = monthsBetween(key, x.churn.slice(0, 7))
          return churnOffset > m
        }).length
        survival.push((alive / members.length) * 100)
      }
      const d = new Date(key + '-01T00:00:00Z')
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
        monthKey: key,
        size: members.length,
        survival,
      }
    })
    .filter(c => c.size >= 2 && c.survival.length >= 2)
}

/* ─── Revenue bridge (waterfall) ──────────────────────────────────── */

export interface BridgeStep {
  label: string
  delta: number
  /** Bar occupies [base, base + |delta|] on the y axis. */
  base: number
  kind: 'start' | 'up' | 'down' | 'end'
  total: number
}

export function revenueBridge(
  prevTotal: number,
  streams: { label: string; now: number; prev: number }[],
  nowTotal: number
): BridgeStep[] {
  const steps: BridgeStep[] = [
    { label: 'Previous', delta: prevTotal, base: 0, kind: 'start', total: prevTotal },
  ]
  let running = prevTotal
  const sorted = [...streams].sort((a, b) => Math.abs(b.now - b.prev) - Math.abs(a.now - a.prev))
  for (const s of sorted) {
    const delta = s.now - s.prev
    if (Math.abs(delta) < 0.005) continue
    steps.push({
      label: s.label,
      delta,
      base: delta >= 0 ? running : running + delta,
      kind: delta >= 0 ? 'up' : 'down',
      total: running + delta,
    })
    running += delta
  }
  steps.push({ label: 'This period', delta: nowTotal, base: 0, kind: 'end', total: nowTotal })
  return steps
}

/* ─── Daily helpers for stats inputs ─────────────────────────────── */

/** Sum a column per day over the trailing `days` window ending today. */
export function trailingDaily(
  rows: CanonicalRow[],
  dateKey: string,
  valueKey: string,
  days: number
): { date: string; value: number }[] {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

  const byDay = new Map<string, number>()
  for (const r of rows) {
    const raw = r[dateKey]
    if (!raw) continue
    const t = new Date(String(raw))
    if (isNaN(t.getTime()) || t < start || t > end) continue
    const day = t.toISOString().slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + num(r[valueKey]))
  }
  const out: { date: string; value: number }[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const day = cursor.toISOString().slice(0, 10)
    out.push({ date: day, value: byDay.get(day) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

/** Trim leading/trailing all-zero stretches (no data uploaded yet). */
export function trimZeroEdges(series: { date: string; value: number }[]): { date: string; value: number }[] {
  let start = 0
  let end = series.length - 1
  while (start < end && series[start].value === 0) start++
  while (end > start && series[end].value === 0) end--
  if (end - start < 2) return []
  return series.slice(start, end + 1)
}

export { daysBetween }

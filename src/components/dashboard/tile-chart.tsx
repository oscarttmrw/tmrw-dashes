'use client'

import { useMemo } from 'react'
import {
  Area, AreaChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip,
} from 'recharts'

type Variant = 'line' | 'area'

interface TileChartProps {
  /** Pre-bucketed daily points. Each item is one day in the period. */
  data: { date: string; value: number }[]
  /** Render shape — line for ratios, area for absolute counts/$. */
  variant?: Variant
  /** Tooltip value formatter — defaults to compact integer. */
  formatValue?: (n: number) => string
  /** Px height. Default 48 — sized to sit inside a MetricTile. */
  height?: number
  /** Optional reference y-value (e.g. daily plan target). Hidden if undefined. */
  referenceLine?: number
}

/**
 * Sparkline for inline use in tiles. Single colour, no axes, no grid, no
 * legend. Tooltip on hover shows date + formatted value. Empty data renders
 * nothing — caller can decide whether to omit the chart row entirely.
 */
export function TileChart({
  data,
  variant = 'area',
  formatValue = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  height = 48,
  referenceLine,
}: TileChartProps) {
  const cleaned = useMemo(() => data.filter(d => isFinite(d.value)), [data])

  if (cleaned.length === 0) return null

  const refLine = typeof referenceLine === 'number' && isFinite(referenceLine)
    ? <ReferenceLine y={referenceLine} stroke="#D9D9D9" strokeDasharray="3 3" strokeWidth={1} />
    : null

  if (variant === 'line') {
    return (
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <LineChart data={cleaned} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Tooltip
              cursor={{ stroke: '#A3A3A3', strokeDasharray: '2 2' }}
              content={<SparkTooltip formatValue={formatValue} />}
            />
            {refLine}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#1A1A1A"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={cleaned} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="tileSparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A1A1A" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#1A1A1A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: '#A3A3A3', strokeDasharray: '2 2' }}
            content={<SparkTooltip formatValue={formatValue} />}
          />
          {refLine}
          <Area
            type="monotone"
            dataKey="value"
            stroke="#1A1A1A"
            strokeWidth={1.5}
            fill="url(#tileSparkFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface SparkTooltipProps {
  active?: boolean
  payload?: Array<{ value?: number | string; payload?: { date?: string } }>
  formatValue: (n: number) => string
}

function SparkTooltip({ active, payload, formatValue }: SparkTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const point = payload[0]
  const value = typeof point.value === 'number' ? point.value : Number(point.value ?? 0)
  const date = point.payload?.date ?? ''
  return (
    <div className="rounded-md border border-dash-border bg-dash-bg px-2 py-1 font-mono text-[11px] text-dash-text shadow-sm">
      <span className="text-dash-text-muted">{date}</span>{' '}
      <span className="font-medium">{formatValue(value)}</span>
    </div>
  )
}

/* ─── Bucketing helpers ────────────────────────────────────────────── */

/**
 * Build a daily series from a row set, summing a numeric field per day in
 * the given range. Days with no rows produce 0.
 */
export function bucketSumByDay<T extends Record<string, unknown>>(
  rows: T[],
  dateField: keyof T,
  valueField: keyof T,
  start: Date,
  end: Date,
): { date: string; value: number }[] {
  return bucketByDay(rows, dateField, start, end, (group) =>
    group.reduce((s, r) => s + numeric(r[valueField]), 0)
  )
}

/**
 * Build a daily series counting rows that fall on each day.
 */
export function bucketCountByDay<T extends Record<string, unknown>>(
  rows: T[],
  dateField: keyof T,
  start: Date,
  end: Date,
  predicate: (r: T) => boolean = () => true,
): { date: string; value: number }[] {
  return bucketByDay(rows, dateField, start, end, (group) => group.filter(predicate).length)
}

/** General-purpose: group rows by day in range, then apply a reducer. */
export function bucketByDay<T extends Record<string, unknown>>(
  rows: T[],
  dateField: keyof T,
  start: Date,
  end: Date,
  reducer: (rowsOnDay: T[]) => number,
): { date: string; value: number }[] {
  const byDay = new Map<string, T[]>()
  for (const r of rows) {
    const raw = r[dateField]
    if (!raw) continue
    const t = new Date(String(raw)).getTime()
    if (isNaN(t)) continue
    if (t < start.getTime() || t > end.getTime()) continue
    const key = isoDay(new Date(t))
    const arr = byDay.get(key)
    if (arr) arr.push(r)
    else byDay.set(key, [r])
  }

  const out: { date: string; value: number }[] = []
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)
  const endDay = new Date(end)
  endDay.setHours(0, 0, 0, 0)
  while (cursor.getTime() <= endDay.getTime()) {
    const key = isoDay(cursor)
    out.push({ date: key, value: reducer(byDay.get(key) ?? []) })
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

function numeric(v: unknown): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return isNaN(n) ? 0 : n
}

function isoDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

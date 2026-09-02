'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridProps, tooltipStyle, legendStyle } from '@/lib/utils/chart-styles'

export interface BarSeries {
  dataKey: string
  name?: string
  color: string
  /** Rounded top corners. Defaults to true on the topmost series of a stack. */
  radius?: [number, number, number, number]
}

interface TmrwBarChartProps {
  data: Record<string, unknown>[]
  index: string
  series: BarSeries[]
  height?: number
  className?: string
  yAxisWidth?: number
  valueFormatter?: (v: number) => string
  showLegend?: boolean
  /** Stack the series on a shared axis rather than grouping them side by side. */
  stacked?: boolean
  /**
   * Normalise each column to 100% of its own total. Implies `stacked`, and the
   * Y axis switches to percentages. Used for the channel-share chart.
   */
  percentStacked?: boolean
  /**
   * Highlight specific index values — e.g. shade the selected report window
   * inside a longer trend. Bars whose index is not listed render at reduced
   * opacity. Only applies to single-series charts.
   */
  highlightIndexes?: string[]
}

export function TmrwBarChart({
  data,
  index,
  series,
  height = 288,
  className = '',
  yAxisWidth = 40,
  valueFormatter,
  showLegend = true,
  stacked = false,
  percentStacked = false,
  highlightIndexes,
}: TmrwBarChartProps) {
  const isStacked = stacked || percentStacked

  // Percent-stacking is done on the data, not by recharts — it has no
  // stackOffset that also keeps the raw values available to the tooltip, and the
  // tooltip should show the real counts alongside the share.
  const plotted = percentStacked
    ? data.map(row => {
        const total = series.reduce((s, ser) => s + num(row[ser.dataKey]), 0)
        const out: Record<string, unknown> = { ...row }
        for (const ser of series) {
          out[ser.dataKey] = total > 0 ? (num(row[ser.dataKey]) / total) * 100 : 0
          out[`${ser.dataKey}__raw`] = num(row[ser.dataKey])
        }
        return out
      })
    : data

  const formatY = percentStacked
    ? (v: number) => `${Math.round(v)}%`
    : valueFormatter

  const formatTooltip = percentStacked
    ? (v: unknown, name: unknown, entry: unknown) => {
        const raw = (entry as { payload?: Record<string, unknown> } | undefined)?.payload
        const key = series.find(s => (s.name ?? s.dataKey) === String(name))?.dataKey
        const count = key && raw ? num(raw[`${key}__raw`]) : null
        const pct = `${Number(v).toFixed(1)}%`
        return count === null ? pct : `${pct} (${count.toLocaleString()})`
      }
    : valueFormatter
      ? (v: unknown) => valueFormatter(Number(v))
      : undefined

  const highlight = highlightIndexes ? new Set(highlightIndexes) : null

  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <BarChart data={plotted as object[]}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={index} tick={axisTickStyle} axisLine={axisLineStyle} />
        <YAxis
          tick={axisTickStyle}
          axisLine={axisLineStyle}
          width={yAxisWidth}
          tickFormatter={formatY}
          domain={percentStacked ? [0, 100] : undefined}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={formatTooltip as never} />
        {showLegend && <Legend wrapperStyle={legendStyle} />}
        {series.map((s, i) => {
          const isTop = i === series.length - 1
          const radius = s.radius ?? (!isStacked || isTop ? ([4, 4, 0, 0] as [number, number, number, number]) : undefined)
          return (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              fill={s.color}
              stackId={isStacked ? '1' : undefined}
              radius={radius}
            >
              {highlight && series.length === 1
                ? plotted.map((row, ri) => (
                    <Cell
                      key={ri}
                      fill={s.color}
                      fillOpacity={highlight.has(String(row[index])) ? 1 : 0.28}
                    />
                  ))
                : null}
            </Bar>
          )
        })}
      </BarChart>
    </ResponsiveContainer>
  )
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return isFinite(n) ? n : 0
}

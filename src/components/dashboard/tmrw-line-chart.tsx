'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridProps, tooltipStyle, legendStyle, solidLine, dashedLine } from '@/lib/utils/chart-styles'

export interface ChartSeries {
  dataKey: string
  name?: string
  color: string
  dashed?: boolean
  dot?: boolean | object
}

interface TmrwLineChartProps {
  data: Record<string, unknown>[]
  index: string
  series: ChartSeries[]
  height?: number
  className?: string
  yAxisWidth?: number
  valueFormatter?: (v: number) => string
  showLegend?: boolean
  connectNulls?: boolean
}

export function TmrwLineChart({
  data,
  index,
  series,
  height = 288,
  className = '',
  yAxisWidth = 40,
  valueFormatter,
  showLegend = true,
  connectNulls = true,
}: TmrwLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <LineChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={index} tick={axisTickStyle} axisLine={axisLineStyle} />
        <YAxis
          tick={axisTickStyle}
          axisLine={axisLineStyle}
          width={yAxisWidth}
          tickFormatter={valueFormatter}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={valueFormatter ? (v: unknown) => valueFormatter(Number(v)) : undefined}
        />
        {showLegend && <Legend wrapperStyle={legendStyle} />}
        {series.map((s) => {
          const lineProps = s.dashed ? dashedLine(s.color) : solidLine(s.color)
          return (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              connectNulls={connectNulls}
              {...lineProps}
              {...(s.dot !== undefined ? { dot: s.dot } : {})}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}

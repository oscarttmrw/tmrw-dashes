'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridProps, tooltipStyle, legendStyle, stackedArea } from '@/lib/utils/chart-styles'

export interface AreaSeries {
  dataKey: string
  name?: string
  color: string
}

interface TmrwAreaChartProps {
  data: Record<string, unknown>[]
  index: string
  series: AreaSeries[]
  height?: number
  className?: string
  yAxisWidth?: number
  valueFormatter?: (v: number) => string
  showLegend?: boolean
}

export function TmrwAreaChart({
  data,
  index,
  series,
  height = 288,
  className = '',
  yAxisWidth = 40,
  valueFormatter,
  showLegend = true,
}: TmrwAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <AreaChart data={data}>
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
        {series.map((s) => (
          <Area
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name || s.dataKey}
            stackId="1"
            {...stackedArea(s.color)}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

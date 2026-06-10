'use client'

import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface CalendarHeatmapProps {
  /** Daily points, ISO dates. Missing days render as empty cells. */
  data: { date: string; value: number }[]
  /** Number of trailing weeks to render. */
  weeks?: number
  /** Formats the tooltip value. */
  format?: (v: number) => string
  color?: string
}

const DOW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

/**
 * GitHub-style calendar heatmap — weeks as columns, Monday-first rows,
 * cells fading in column by column. Intensity is scaled against the p95
 * so one outlier day doesn't wash out the rest.
 */
export function CalendarHeatmap({ data, weeks = 16, format, color = '#8B0000' }: CalendarHeatmapProps) {
  const reduceMotion = useReducedMotion()
  const fmt = format ?? ((v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 }))

  const { grid, monthMarks } = useMemo(() => {
    const valueByDate = new Map(data.map(d => [d.date, d.value]))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // End on the current week's Sunday so the last column is the live week.
    const end = new Date(today)
    end.setDate(end.getDate() + ((7 - ((end.getDay() + 6) % 7)) % 7))
    const start = new Date(end)
    start.setDate(start.getDate() - weeks * 7 + 1)

    const sorted = data.map(d => d.value).filter(v => v > 0).sort((a, b) => a - b)
    const p95 = sorted.length > 0 ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0

    const grid: { date: string; value: number | null; intensity: number; future: boolean }[][] = []
    const monthMarks: { col: number; label: string }[] = []
    let lastMonth = -1
    const cursor = new Date(start)
    for (let w = 0; w < weeks; w++) {
      const col: { date: string; value: number | null; intensity: number; future: boolean }[] = []
      for (let d = 0; d < 7; d++) {
        const iso = cursor.toISOString().slice(0, 10)
        const future = cursor > today
        const value = future ? null : valueByDate.get(iso) ?? 0
        const intensity = value && p95 > 0 ? Math.min(1, value / p95) : 0
        if (d === 0 && cursor.getMonth() !== lastMonth) {
          lastMonth = cursor.getMonth()
          monthMarks.push({ col: w, label: cursor.toLocaleDateString('en-US', { month: 'short' }) })
        }
        col.push({ date: iso, value, intensity, future })
        cursor.setDate(cursor.getDate() + 1)
      }
      grid.push(col)
    }
    return { grid, monthMarks }
  }, [data, weeks])

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Month labels */}
        <div className="relative mb-1 ml-8 h-3.5" style={{ width: grid.length * 15 }}>
          {monthMarks.map(m => (
            <span
              key={`${m.label}-${m.col}`}
              className="absolute font-mono text-[9px] uppercase text-dash-text-muted"
              style={{ left: m.col * 15 }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {/* Weekday gutter */}
          <div className="mr-1 flex w-7 flex-col gap-[3px]">
            {DOW_LABELS.map((l, i) => (
              <span key={i} className="flex h-3 items-center font-mono text-[8px] uppercase text-dash-text-muted">
                {l}
              </span>
            ))}
          </div>
          {grid.map((col, w) => (
            <motion.div
              key={w}
              className="flex flex-col gap-[3px]"
              initial={reduceMotion ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: w * 0.018, duration: 0.3 }}
            >
              {col.map(cell => (
                <div
                  key={cell.date}
                  title={cell.value === null ? cell.date : `${cell.date} — ${fmt(cell.value)}`}
                  className="h-3 w-3 rounded-[3px]"
                  style={{
                    background: cell.future
                      ? 'transparent'
                      : cell.intensity === 0
                        ? '#EEECE6'
                        : color,
                    opacity: cell.future ? 0 : cell.intensity === 0 ? 1 : 0.25 + cell.intensity * 0.75,
                  }}
                />
              ))}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { CountUp } from './count-up'
import { fmtNum } from './format'

export interface FunnelStage {
  label: string
  value: number
  /** Optional note rendered under the stage label. */
  note?: string
}

/**
 * Vertical funnel with animated bars and explicit stage-to-stage
 * conversion connectors — the % between steps is where the insight lives,
 * so it gets its own visual slot rather than a tooltip.
 */
export function FunnelFlow({ stages, color = '#1A1A1A' }: { stages: FunnelStage[]; color?: string }) {
  const reduceMotion = useReducedMotion()
  const top = stages[0]?.value ?? 0

  return (
    <div>
      {stages.map((stage, i) => {
        const pct = top > 0 ? (stage.value / top) * 100 : 0
        const prev = i > 0 ? stages[i - 1].value : null
        const conv = prev && prev > 0 ? (stage.value / prev) * 100 : null
        const isLast = i === stages.length - 1
        // Last stage (the win) gets the brand red.
        const barColor = isLast ? '#E61317' : color
        const opacity = isLast ? 1 : 1 - i * (0.55 / Math.max(1, stages.length - 1))

        return (
          <div key={stage.label}>
            {/* connector with conversion % */}
            {i > 0 && (
              <div className="flex items-center gap-3 py-1 pl-[2px]">
                <span className="ml-[7px] h-5 w-px bg-dash-border" />
                <motion.span
                  initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.35 + i * 0.12, duration: 0.4 }}
                  className="font-mono text-[11px] font-medium tabular-nums text-dash-text-secondary"
                >
                  {conv === null ? '—' : `${conv < 10 ? conv.toFixed(1) : Math.round(conv)}% convert`}
                </motion.span>
              </div>
            )}

            <div className="grid grid-cols-[150px_1fr_70px] items-center gap-3 md:grid-cols-[190px_1fr_80px]">
              <div>
                <p className="font-ui text-[11px] font-medium uppercase tracking-[0.06em] text-dash-text">
                  {stage.label}
                </p>
                {stage.note && <p className="text-[10px] text-dash-text-muted">{stage.note}</p>}
              </div>
              <div className="relative h-8 overflow-hidden rounded-md bg-dash-surface-alt/60">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-md"
                  style={{ background: barColor, opacity }}
                  initial={reduceMotion ? { width: `${Math.max(pct, 0.75)}%` } : { width: 0 }}
                  whileInView={{ width: `${Math.max(pct, 0.75)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="text-right">
                <CountUp
                  value={stage.value}
                  format={fmtNum}
                  className="font-mono text-sm font-bold tabular-nums text-dash-text"
                />
                <span className="ml-1.5 font-mono text-[10px] text-dash-text-muted">
                  {top > 0 ? `${pct < 1 ? pct.toFixed(2) : pct < 10 ? pct.toFixed(1) : Math.round(pct)}%` : ''}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

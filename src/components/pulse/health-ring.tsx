'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { CountUp } from './count-up'

interface HealthRingProps {
  /** 0–100 */
  score: number
  size?: number
  label?: string
}

function scoreColor(score: number): string {
  if (score >= 60) return '#16A34A'
  if (score >= 45) return '#D97706'
  return '#DC2626'
}

/**
 * Animated radial gauge for the composite Pulse score.
 */
export function HealthRing({ score, size = 168, label = 'Pulse score' }: HealthRingProps) {
  const reduceMotion = useReducedMotion()
  const stroke = 11
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, score))
  const color = scoreColor(clamped)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EFEDE8" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduceMotion ? { strokeDashoffset: c * (1 - clamped / 100) } : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped / 100) }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp
          value={clamped}
          className="font-mono text-4xl font-bold tabular-nums"
          duration={1.4}
        />
        <span className="mt-1 font-ui text-[10px] uppercase tracking-[0.14em] text-dash-text-muted">
          {label}
        </span>
      </div>
    </div>
  )
}

/** Slim horizontal sub-score bar used beside the ring. */
export function SubScoreBar({ label, score, detail }: { label: string; score: number; detail: string }) {
  const reduceMotion = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, score))
  return (
    <div className="group" title={detail}>
      <div className="flex items-baseline justify-between">
        <span className="font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-secondary">{label}</span>
        <span className="font-mono text-[11px] font-medium tabular-nums text-dash-text">{Math.round(clamped)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#EFEDE8]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: scoreColor(clamped) }}
          initial={reduceMotion ? { width: `${clamped}%` } : { width: 0 }}
          whileInView={{ width: `${clamped}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
      </div>
    </div>
  )
}

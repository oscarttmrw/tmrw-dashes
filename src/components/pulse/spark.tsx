'use client'

import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface SparkProps {
  values: number[]
  width?: number
  height?: number
  color?: string
  /** Fill the area under the line. */
  area?: boolean
  className?: string
}

/**
 * Featherweight SVG sparkline with a draw-on animation. No axes, no
 * tooltips — it exists to give a number a shape.
 */
export function Spark({
  values,
  width = 120,
  height = 36,
  color = '#8B0000',
  area = true,
  className,
}: SparkProps) {
  const id = useId()
  const reduceMotion = useReducedMotion()

  if (values.length < 2) {
    return <div style={{ width, height }} className={className} />
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pad = 3
  const stepX = (width - pad * 2) / (values.length - 1)
  const pts = values.map((v, i) => ({
    x: pad + i * stepX,
    y: pad + (1 - (v - min) / range) * (height - pad * 2),
  }))

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${line} L${pts[pts.length - 1].x.toFixed(1)},${height} L${pts[0].x.toFixed(1)},${height} Z`
  const last = pts[pts.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && (
        <motion.path
          d={areaPath}
          fill={`url(#spark-${id})`}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        />
      )}
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.circle
        cx={last.x}
        cy={last.y}
        r={2.5}
        fill={color}
        initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 400, damping: 20 }}
      />
    </svg>
  )
}

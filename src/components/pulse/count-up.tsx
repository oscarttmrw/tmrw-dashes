'use client'

import { useEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

interface CountUpProps {
  value: number
  format?: (v: number) => string
  duration?: number
  className?: string
}

/**
 * Animated numeral. Counts from the previously shown value to the new one,
 * so changing the date range "rolls" the figure rather than swapping it.
 */
export function CountUp({ value, format, duration = 1.1, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const fromRef = useRef(0)
  const reduceMotion = useReducedMotion()
  const fmt = format ?? ((v: number) => Math.round(v).toLocaleString('en-US'))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduceMotion) {
      el.textContent = fmt(value)
      fromRef.current = value
      return
    }
    const controls = animate(fromRef.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => {
        el.textContent = fmt(v)
      },
    })
    fromRef.current = value
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reduceMotion])

  return (
    <span ref={ref} className={className}>
      {fmt(reduceMotion ? value : fromRef.current)}
    </span>
  )
}

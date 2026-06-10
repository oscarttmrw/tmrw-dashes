'use client'

import { motion, useReducedMotion } from 'framer-motion'

/**
 * The brand motif: a heartbeat trace that draws itself and quietly loops a
 * travelling highlight. Sits behind/beside the page hero.
 */
export function PulseLine({ className, color = '#E61317' }: { className?: string; color?: string }) {
  const reduceMotion = useReducedMotion()
  // One heartbeat: flat — small bump — sharp QRS spike — recovery — flat
  const d =
    'M0,20 H38 C42,20 43,16 46,16 C49,16 50,20 54,20 H66 L72,4 L78,34 L83,12 L86,20 H110 C114,20 115,24 118,24 C121,24 122,20 126,20 H180'

  return (
    <svg viewBox="0 0 180 40" fill="none" className={className} aria-hidden preserveAspectRatio="none">
      <path d={d} stroke={color} strokeOpacity={0.15} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <motion.path
        d={d}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? false : { pathLength: 0, pathOffset: 0 }}
        animate={
          reduceMotion
            ? { pathLength: 1 }
            : { pathLength: [0, 0.35, 0.35, 0], pathOffset: [0, 0, 0.65, 1] }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 3.2, times: [0, 0.42, 0.58, 1], repeat: Infinity, ease: 'linear', repeatDelay: 0.6 }
        }
      />
    </svg>
  )
}

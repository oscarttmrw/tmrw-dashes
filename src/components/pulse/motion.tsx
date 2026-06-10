'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Scroll-triggered reveal. Children rise and sharpen into place the first
 * time they enter the viewport.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Container that staggers its Reveal-like children. */
export function Stagger({
  children,
  className,
  gap = 0.06,
}: {
  children: ReactNode
  className?: string
  gap?: number
}) {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16, filter: 'blur(3px)' },
        show: {
          opacity: 1, y: 0, filter: 'blur(0px)',
          transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

/** Hover-lift card surface used across the Pulse pages. */
export function LiftCard({
  children,
  className = '',
  accent = false,
}: {
  children: ReactNode
  className?: string
  accent?: boolean
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`group relative overflow-hidden rounded-xl border border-dash-border bg-dash-surface shadow-[0_1px_2px_rgba(26,26,26,0.04)] transition-shadow duration-300 hover:shadow-[0_12px_32px_-12px_rgba(26,26,26,0.18)] ${className}`}
    >
      {accent && (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-tmrw-syringe transition-transform duration-300 ease-out group-hover:scale-x-100" />
      )}
      {children}
    </motion.div>
  )
}

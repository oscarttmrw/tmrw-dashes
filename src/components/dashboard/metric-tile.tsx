'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { StatusDot } from '@/components/dashboard/status-dot'
import { TrendIndicator } from '@/components/dashboard/trend-indicator'
import { cn } from '@/lib/utils'
import type { Status } from '@/lib/types'

/**
 * The narrative-page tile used across Home, Financial, Marketing and Support.
 * Previously duplicated verbatim in each page; kept here so a styling change
 * lands everywhere at once.
 */

export interface TileDelta {
  /** Percentage change. `null` renders nothing (no baseline to compare). */
  value: number | null
  /** Short label for what the delta is against, e.g. "vs Jul 1–12". */
  period?: string
}

interface MetricTileProps {
  label: string
  value: string
  target?: string
  delta?: TileDelta | null
  /**
   * A second comparison shown on its own line — the "vs same period last month"
   * reading that sits alongside "vs previous period".
   */
  secondaryDelta?: TileDelta | null
  status: Status
  direction?: 'higher-better' | 'lower-better'
  href?: string
  chart?: React.ReactNode
  prominent?: boolean
  /** Small note under the value, e.g. which source supplied the number. */
  footnote?: string
}

export function MetricTile({
  label,
  value,
  target,
  delta,
  secondaryDelta,
  status,
  direction = 'higher-better',
  href,
  chart,
  prominent,
  footnote,
}: MetricTileProps) {
  const tileClass = cn(
    'flex h-full flex-col rounded-lg border bg-dash-surface transition-all duration-150',
    prominent
      ? 'border-dash-border-strong p-4 md:p-5 shadow-sm'
      : 'border-dash-border p-3 md:p-4',
    href && 'hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px'
  )
  const inner = (
    <div className={tileClass}>
      <div className="flex items-start justify-between gap-2">
        <span className={cn(
          'font-ui font-medium uppercase tracking-[0.05em] text-dash-text-secondary',
          prominent ? 'text-[11px] md:text-[12px]' : 'text-[10px] md:text-[11px]'
        )}>
          {label}
        </span>
        <StatusDot status={status} />
      </div>
      <div className="mt-1 md:mt-2 flex items-baseline gap-2">
        <span className={cn(
          'font-mono font-bold tracking-[-0.01em] text-dash-text',
          prominent ? 'text-2xl md:text-3xl' : 'text-lg md:text-2xl'
        )}>
          {value}
        </span>
        {delta !== null && delta !== undefined && delta.value !== null && (
          <TrendIndicator value={delta.value} direction={direction} />
        )}
      </div>
      {secondaryDelta && secondaryDelta.value !== null && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <TrendIndicator value={secondaryDelta.value} direction={direction} />
          {secondaryDelta.period && (
            <span className="font-sans text-[10px] text-dash-text-muted md:text-[11px]">
              {secondaryDelta.period}
            </span>
          )}
        </div>
      )}
      {footnote && (
        <p className="mt-1.5 font-sans text-[10px] italic text-dash-text-muted md:text-[11px]">{footnote}</p>
      )}
      {chart && <div className="mt-3 mb-2">{chart}</div>}
      <div className="mt-auto pt-3 flex items-center justify-between text-[10px] text-dash-text-muted md:text-[11px]">
        {target ? <span>{target}</span> : <span />}
        {delta?.period && <span className="font-sans">{delta.period}</span>}
      </div>
    </div>
  )

  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner
}

/**
 * Placeholder for a metric the data cannot yet answer. `reason` must say what is
 * actually missing — an honest "not in the Zendesk export" beats a zero.
 */
export function LockedTile({ label, reason, target }: { label: string; reason: string; target?: string }) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-dashed border-dash-border bg-dash-surface/40 p-3 md:p-4 opacity-75">
      <div className="flex items-start justify-between gap-2">
        <span className="font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-muted md:text-[11px]">
          {label}
        </span>
        <Lock size={11} className="text-dash-text-muted" />
      </div>
      <div className="mt-1 md:mt-2">
        <span className="font-mono text-base text-dash-text-muted md:text-lg">—</span>
      </div>
      <p className="mt-auto pt-1.5 font-sans text-[10px] italic text-dash-text-muted md:text-[11px]">
        {reason}
      </p>
      {target && (
        <p className="font-sans text-[10px] text-dash-text-muted/80 md:text-[11px]">{target}</p>
      )}
    </div>
  )
}

/** Chart-sized equivalent of LockedTile. */
export function LockedCard({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-dash-border bg-dash-surface/40 p-6 text-center opacity-80">
      <Lock size={16} className="mb-2 text-dash-text-muted" />
      <p className="font-ui text-[11px] uppercase tracking-[0.08em] text-dash-text-muted">{title}</p>
      <p className="mt-1 max-w-md font-sans text-[11px] italic text-dash-text-muted">{reason}</p>
    </div>
  )
}

/** Sub-heading that groups a set of tiles inside a section. */
export function Column({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 md:space-y-3">
      <h3 className="font-ui text-[10px] font-medium uppercase tracking-[0.08em] text-dash-text-secondary">
        {heading}
      </h3>
      {children}
    </div>
  )
}

'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StatusDot } from './status-dot'
import type { Status } from '@/lib/types'

interface QuestionMetric {
  label: string
  value: string
  target: string
}

interface QuestionTileProps {
  number: number
  question: string
  status: Status
  primaryMetrics: QuestionMetric[]
  activeCount: number
  totalCount: number
  redCount: number
  amberCount: number
  functionalLinks: { label: string; href: string }[]
  className?: string
}

export function QuestionTile({
  number,
  question,
  status,
  primaryMetrics,
  activeCount,
  totalCount,
  redCount,
  amberCount,
  functionalLinks,
  className,
}: QuestionTileProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dash-border bg-dash-surface p-5 transition-all duration-150 hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <Link
          href={`/strategy#q${number}`}
          className="group"
        >
          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
            Q{number}
          </span>
          <h3 className="mt-0.5 font-sans text-sm font-medium text-dash-text group-hover:text-dash-red">
            {question}
          </h3>
        </Link>
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className={cn(
            'font-sans text-[11px] font-medium uppercase',
            status === 'green' && 'text-status-green',
            status === 'amber' && 'text-status-amber',
            status === 'red' && 'text-status-red',
            status === 'grey' && 'text-status-grey',
          )}>
            {status}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        {primaryMetrics.map((metric) => (
          <div key={metric.label}>
            <span className="font-sans text-[11px] text-dash-text-secondary">
              {metric.label}
            </span>
            <p className="font-mono text-lg font-medium text-dash-text">
              {metric.value}
            </p>
            <p className="font-sans text-[11px] text-dash-text-muted">
              Target: {metric.target}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-dash-border-subtle pt-3">
        <p className="font-sans text-[11px] text-dash-text-muted">
          {activeCount} of {totalCount} metrics active
          {redCount > 0 && <span className="text-status-red"> · {redCount} red</span>}
          {amberCount > 0 && <span className="text-status-amber"> · {amberCount} amber</span>}
        </p>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-[11px] text-dash-text-muted">&rarr;</span>
          {functionalLinks.map((link, i) => (
            <span key={link.href} className="text-[11px]">
              {i > 0 && <span className="text-dash-text-muted"> · </span>}
              <Link href={link.href} className="text-dash-red hover:underline">
                {link.label}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

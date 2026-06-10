'use client'

import Link from 'next/link'
import { ArrowRight, TrendingDown, TrendingUp, Eye, Info } from 'lucide-react'
import type { Insight, InsightTone } from '@/lib/pulse/insights'
import { Stagger, StaggerItem } from './motion'

const toneStyles: Record<InsightTone, { border: string; chip: string; icon: typeof TrendingUp }> = {
  good: { border: 'border-l-status-green', chip: 'bg-status-green-light text-status-green', icon: TrendingUp },
  bad: { border: 'border-l-status-red', chip: 'bg-status-red-light text-status-red', icon: TrendingDown },
  watch: { border: 'border-l-status-amber', chip: 'bg-status-amber-light text-status-amber', icon: Eye },
  info: { border: 'border-l-dash-border-strong', chip: 'bg-dash-surface-alt text-dash-text-secondary', icon: Info },
}

function InsightCard({ insight }: { insight: Insight }) {
  const tone = toneStyles[insight.tone]
  const Icon = tone.icon
  const body = (
    <div
      className={`group flex h-full flex-col rounded-r-xl rounded-l-sm border border-l-[3px] border-dash-border bg-dash-surface p-4 transition-shadow duration-300 hover:shadow-[0_10px_28px_-12px_rgba(26,26,26,0.16)] ${tone.border}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-ui text-[10px] font-medium uppercase tracking-[0.08em] ${tone.chip}`}>
          <Icon size={11} />
          {insight.area}
        </span>
        {insight.href && (
          <ArrowRight
            size={14}
            className="text-dash-text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-dash-text"
          />
        )}
      </div>
      <p className="mt-2.5 text-[14px] font-semibold leading-snug text-dash-text">{insight.headline}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-dash-text-secondary">{insight.detail}</p>
    </div>
  )

  if (insight.href) {
    return (
      <Link href={insight.href} className="block h-full">
        {body}
      </Link>
    )
  }
  return body
}

export function InsightFeed({ insights, limit = 6 }: { insights: Insight[]; limit?: number }) {
  const shown = insights.slice(0, limit)
  return (
    <Stagger className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" gap={0.08}>
      {shown.map(insight => (
        <StaggerItem key={insight.id} className="h-full">
          <InsightCard insight={insight} />
        </StaggerItem>
      ))}
    </Stagger>
  )
}

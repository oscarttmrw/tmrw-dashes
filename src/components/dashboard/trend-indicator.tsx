'use client'

import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendIndicatorProps {
  value: number | null
  direction?: 'higher-better' | 'lower-better'
}

export function TrendIndicator({ value, direction = 'higher-better' }: TrendIndicatorProps) {
  if (value === null || value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-dash-text-muted">
        <ArrowRight size={12} />
        <span className="font-mono">0%</span>
      </span>
    )
  }

  const isUp = value > 0
  const isPositive = direction === 'higher-better' ? isUp : !isUp

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs',
        isPositive ? 'text-status-green' : 'text-status-red'
      )}
    >
      {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      <span className="font-mono">{Math.abs(value).toFixed(1)}%</span>
    </span>
  )
}

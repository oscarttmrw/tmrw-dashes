'use client'

import { useMemo } from 'react'
import { useDashboardData } from '@/lib/context/data-context'
import { buildSnapshot, type PulseSources } from '@/lib/pulse/metrics'
import { fmtMoney, fmtNum } from '@/components/pulse/format'

/**
 * Stock-ticker strip under the header: trailing-30-day vitals scrolling on
 * a slow marquee. Pauses on hover. One glance, whole business.
 */
export function Ticker() {
  const data = useDashboardData()

  const items = useMemo(() => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date(end)
    start.setDate(start.getDate() - 29)
    start.setHours(0, 0, 0, 0)
    const prevEnd = new Date(start.getTime() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - 29)
    prevStart.setHours(0, 0, 0, 0)

    const now = buildSnapshot(data as PulseSources, { start, end })
    const prev = buildSnapshot(data as PulseSources, { start: prevStart, end: prevEnd })

    const arrow = (cur: number, before: number, invert = false) => {
      if (before === 0 || cur === before) return { glyph: '–', cls: 'text-dash-text-muted' }
      const up = cur > before
      const good = invert ? !up : up
      return { glyph: up ? '▲' : '▼', cls: good ? 'text-status-green' : 'text-status-red' }
    }

    return [
      { label: 'NET REV 30D', value: fmtMoney(now.revenue.total, { compact: true }), ...arrow(now.revenue.total, prev.revenue.total) },
      { label: 'MEMBERS 30D', value: fmtNum(now.ops.registered), ...arrow(now.ops.registered, prev.ops.registered) },
      { label: 'CAC', value: now.cac > 0 ? fmtMoney(now.cac) : '—', ...arrow(now.cac, prev.cac, true) },
      { label: 'LTV:CAC', value: now.ltvCacRatio !== null ? `${now.ltvCacRatio.toFixed(1)}x` : '—', ...arrow(now.ltvCacRatio ?? 0, prev.ltvCacRatio ?? 0) },
      { label: 'AD SPEND 30D', value: fmtMoney(now.meta.spend, { compact: true }), ...arrow(now.meta.spend, prev.meta.spend, true) },
      { label: 'LEADS 30D', value: fmtNum(now.meta.leads), ...arrow(now.meta.leads, prev.meta.leads) },
      { label: 'CALLS HELD', value: fmtNum(now.calls.held), ...arrow(now.calls.held, prev.calls.held) },
      { label: 'CASEBOOK', value: fmtNum(now.ops.casebook), ...arrow(now.ops.casebook, prev.ops.casebook) },
      { label: 'CHURNED 30D', value: fmtNum(now.ops.churned), ...arrow(now.ops.churned, prev.ops.churned, true) },
      { label: 'MER', value: now.mer !== null ? `${now.mer.toFixed(1)}x` : '—', ...arrow(now.mer ?? 0, prev.mer ?? 0) },
      { label: 'TICKETS 30D', value: fmtNum(now.care.created), ...arrow(now.care.created, prev.care.created, true) },
      { label: 'AUDIENCE', value: fmtNum(now.social.totalFollowers), ...arrow(now.social.totalFollowers, prev.social.totalFollowers) },
    ]
  }, [data])

  const strip = (ariaHidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center whitespace-nowrap px-5 font-mono text-[10.5px] tracking-wide">
          <span className="text-dash-text-muted">{item.label}</span>
          <span className="ml-2 font-semibold text-dash-text">{item.value}</span>
          <span className={`ml-1.5 text-[9px] ${item.cls}`}>{item.glyph}</span>
          <span className="ml-5 text-dash-border-strong">·</span>
        </span>
      ))}
    </div>
  )

  return (
    <div className="ticker-mask group relative overflow-hidden border-b border-dash-border bg-dash-surface/60">
      <div className="ticker-track flex w-max py-1.5 group-hover:[animation-play-state:paused]">
        {strip(false)}
        {strip(true)}
      </div>
    </div>
  )
}

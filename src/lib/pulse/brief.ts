/**
 * The Analyst's Brief — a machine-written morning memo.
 *
 * Takes the period snapshot, its comparison, and the revenue forecast and
 * composes the paragraph a good analyst would open the weekly meeting with.
 */

import type { PulseSnapshot } from './metrics'
import { deltaPct } from './metrics'
import type { Insight } from './insights'

const money = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K` : `$${n.toFixed(0)}`

function dir(d: number | null): string {
  if (d === null) return 'flat'
  if (Math.abs(d) < 2) return `flat (${d >= 0 ? '+' : ''}${d.toFixed(1)}%)`
  return `${d > 0 ? 'up' : 'down'} ${Math.abs(d).toFixed(0)}%`
}

export interface BriefInput {
  now: PulseSnapshot
  prev: PulseSnapshot
  /** Projected next-30-day net revenue with 95% half-width, if computable. */
  forecast30: { total: number; half: number } | null
  insights: Insight[]
}

export function buildBrief({ now, prev, forecast30, insights }: BriefInput): string[] {
  const paras: string[] = []

  /* Topline */
  if (now.revenue.total > 0) {
    const d = deltaPct(now.revenue.total, prev.revenue.total)
    const topStream = [...now.revenue.byStream].sort((a, b) => b.value - a.value)[0]
    let mover = ''
    if (topStream && prev.revenue.total > 0) {
      const movers = now.revenue.byStream
        .map(s => ({ ...s, d: s.value - (prev.revenue.byStream.find(x => x.key === s.key)?.value ?? 0) }))
        .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
      const m = movers[0]
      if (m && Math.abs(m.d) > now.revenue.total * 0.03) {
        mover = ` ${m.label} was the biggest mover (${m.d >= 0 ? '+' : '−'}${money(Math.abs(m.d))}).`
      }
    }
    paras.push(
      `Net revenue came in at ${money(now.revenue.total)}, ${dir(d)} on the prior period, with ` +
      `${topStream?.label ?? 'membership'} carrying ${topStream?.share.toFixed(0) ?? '—'}% of the mix.${mover}`
    )
  } else {
    paras.push('No net revenue recorded in this window yet — once the revenue sheets cover these dates the brief fills itself in.')
  }

  /* Acquisition */
  if (now.meta.spend > 0 || now.ops.registered > 0) {
    const cacLine = now.cac > 0
      ? `CAC stands at ${money(now.cac)}${prev.cac > 0 ? ` (${dir(deltaPct(now.cac, prev.cac))})` : ''}` +
        (now.ltvCacRatio !== null ? `, putting LTV:CAC at ${now.ltvCacRatio.toFixed(1)}x` : '')
      : 'CAC is not computable this period'
    const funnel = now.meta.leads > 0
      ? ` The funnel produced ${now.meta.leads.toLocaleString()} leads at ${money(now.meta.cpl)} each, ` +
        `${now.calls.booked} booked calls (${now.calls.showRate.toFixed(0)}% held) and ${now.ops.registered} new members.`
      : ` ${now.ops.registered} members joined this period.`
    paras.push(`${cacLine}.${funnel}`)
  }

  /* Forecast */
  if (forecast30) {
    paras.push(
      `On the current trajectory, the next 30 days project to roughly ${money(forecast30.total)} net revenue ` +
      `(±${money(forecast30.half)} at 95% confidence). Treat the band, not the point, as the plan.`
    )
  }

  /* Risk: highest-weighted bad/watch insight */
  const risk = insights.find(i => i.tone === 'bad' || i.tone === 'watch')
  if (risk) {
    paras.push(`Watch item: ${risk.headline.toLowerCase()} — ${risk.detail}`)
  }

  return paras
}

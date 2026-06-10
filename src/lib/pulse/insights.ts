/**
 * Pulse insight engine.
 *
 * Compares the current period snapshot against the comparison period and
 * emits ranked, plain-English findings. The goal: the dashboard tells you
 * what changed before you go looking for it.
 */

import type { PulseSnapshot } from './metrics'
import { deltaPct } from './metrics'

export type InsightTone = 'good' | 'bad' | 'watch' | 'info'

export interface Insight {
  id: string
  tone: InsightTone
  area: 'Growth' | 'Revenue' | 'Funnel' | 'Delivery' | 'Care' | 'Efficiency'
  headline: string
  detail: string
  /** Higher = surfaces first. */
  weight: number
  href?: string
}

const fmtMoney = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K` : `$${n.toFixed(0)}`

const fmtPctAbs = (d: number) => `${Math.abs(d).toFixed(0)}%`

export function buildInsights(now: PulseSnapshot, prev: PulseSnapshot): Insight[] {
  const out: Insight[] = []

  /* ── Efficiency: CAC ── */
  if (now.cac > 0 && prev.cac > 0) {
    const d = deltaPct(now.cac, prev.cac)
    if (d !== null && Math.abs(d) >= 10) {
      out.push({
        id: 'cac-move',
        tone: d < 0 ? 'good' : 'bad',
        area: 'Efficiency',
        headline: `CAC ${d < 0 ? 'down' : 'up'} ${fmtPctAbs(d)} to ${fmtMoney(now.cac)}`,
        detail: d < 0
          ? `Each new member cost ${fmtMoney(prev.cac - now.cac)} less to acquire than last period. Spend is converting more efficiently.`
          : `Acquiring a member now costs ${fmtMoney(now.cac - prev.cac)} more than last period. Worth checking creative fatigue and lead quality.`,
        weight: Math.min(100, Math.abs(d)) + 40,
        href: '/marketing',
      })
    }
  }

  /* ── LTV:CAC ratio ── */
  if (now.ltvCacRatio !== null && now.cac > 0) {
    if (now.ltvCacRatio < 3) {
      out.push({
        id: 'ltv-cac-low',
        tone: 'watch',
        area: 'Efficiency',
        headline: `LTV:CAC at ${now.ltvCacRatio.toFixed(1)}x — below the 3x healthy line`,
        detail: `With LTV assumed at ${fmtMoney(now.ltv)} and CAC at ${fmtMoney(now.cac)}, payback economics are tight this period.`,
        weight: 70,
        href: '/marketing',
      })
    } else if (now.ltvCacRatio >= 5) {
      out.push({
        id: 'ltv-cac-strong',
        tone: 'good',
        area: 'Efficiency',
        headline: `LTV:CAC at ${now.ltvCacRatio.toFixed(1)}x — room to push spend`,
        detail: `Unit economics are strong. If lead quality holds, there may be headroom to scale acquisition.`,
        weight: 55,
        href: '/marketing',
      })
    }
  }

  /* ── Revenue moves ── */
  const revDelta = deltaPct(now.revenue.total, prev.revenue.total)
  if (revDelta !== null && Math.abs(revDelta) >= 10 && prev.revenue.total > 0) {
    out.push({
      id: 'revenue-move',
      tone: revDelta > 0 ? 'good' : 'bad',
      area: 'Revenue',
      headline: `Net revenue ${revDelta > 0 ? 'up' : 'down'} ${fmtPctAbs(revDelta)} vs previous period`,
      detail: `${fmtMoney(now.revenue.total)} this period against ${fmtMoney(prev.revenue.total)} last. ${
        revDelta > 0 ? 'Momentum is real — see which streams drove it.' : 'See which streams gave it back.'
      }`,
      weight: Math.min(100, Math.abs(revDelta)) + 35,
      href: '/financial',
    })
  }

  /* ── Fastest-moving revenue stream ── */
  {
    let best: { label: string; d: number; value: number } | null = null
    for (const s of now.revenue.byStream) {
      const prevS = prev.revenue.byStream.find(x => x.key === s.key)
      if (!prevS || prevS.value < 100 || s.value < 100) continue
      const d = deltaPct(s.value, prevS.value)
      if (d === null) continue
      if (!best || Math.abs(d) > Math.abs(best.d)) best = { label: s.label, d, value: s.value }
    }
    if (best && Math.abs(best.d) >= 25) {
      out.push({
        id: 'stream-move',
        tone: best.d > 0 ? 'good' : 'watch',
        area: 'Revenue',
        headline: `${best.label} ${best.d > 0 ? 'jumped' : 'fell'} ${fmtPctAbs(best.d)}`,
        detail: `${best.label} did ${fmtMoney(best.value)} this period — the biggest mover across revenue streams.`,
        weight: 45,
        href: '/financial',
      })
    }
  }

  /* ── Recurring share ── */
  if (now.revenue.total > 1000 && prev.revenue.total > 1000) {
    const d = now.revenue.recurringShare - prev.revenue.recurringShare
    if (Math.abs(d) >= 5) {
      out.push({
        id: 'recurring-share',
        tone: d > 0 ? 'good' : 'watch',
        area: 'Revenue',
        headline: `Recurring revenue is now ${now.revenue.recurringShare.toFixed(0)}% of the mix`,
        detail: `Membership's share moved ${d > 0 ? 'up' : 'down'} ${Math.abs(d).toFixed(0)} points vs last period. ${
          d > 0 ? 'The base is compounding.' : 'One-off sales carried more of the load.'
        }`,
        weight: 40,
        href: '/financial',
      })
    }
  }

  /* ── Growth ── */
  const memDelta = deltaPct(now.ops.registered, prev.ops.registered)
  if (memDelta !== null && Math.abs(memDelta) >= 15 && prev.ops.registered >= 3) {
    out.push({
      id: 'members-move',
      tone: memDelta > 0 ? 'good' : 'bad',
      area: 'Growth',
      headline: `${now.ops.registered} members joined — ${memDelta > 0 ? 'up' : 'down'} ${fmtPctAbs(memDelta)}`,
      detail: `Previous period brought ${prev.ops.registered}. ${
        memDelta > 0 ? 'Acquisition is accelerating.' : 'Worth tracing back through the funnel.'
      }`,
      weight: Math.min(100, Math.abs(memDelta)) + 30,
      href: '/members',
    })
  }

  /* ── Churn ── */
  if (now.ops.churned > 0 && now.ops.churned >= now.ops.registered && now.ops.registered > 0) {
    out.push({
      id: 'churn-exceeds',
      tone: 'bad',
      area: 'Growth',
      headline: `Churn (${now.ops.churned}) matched or exceeded new members (${now.ops.registered})`,
      detail: `Net casebook growth was ${now.ops.netGrowth >= 0 ? '+' : ''}${now.ops.netGrowth} this period.`,
      weight: 90,
      href: '/members',
    })
  } else if (now.journey.churnedInPeriod > prev.journey.churnedInPeriod && now.journey.churnedInPeriod >= 2) {
    out.push({
      id: 'churn-up',
      tone: 'watch',
      area: 'Growth',
      headline: `${now.journey.churnedInPeriod} members churned, up from ${prev.journey.churnedInPeriod}`,
      detail: 'Churn ticked up vs the previous period — check churn reasons in HubSpot.',
      weight: 60,
      href: '/members',
    })
  }

  /* ── Funnel: show rate ── */
  if (now.calls.booked >= 5 && prev.calls.booked >= 5) {
    const d = now.calls.showRate - prev.calls.showRate
    if (Math.abs(d) >= 10) {
      out.push({
        id: 'show-rate',
        tone: d > 0 ? 'good' : 'bad',
        area: 'Funnel',
        headline: `Call show rate ${d > 0 ? 'improved' : 'slipped'} to ${now.calls.showRate.toFixed(0)}%`,
        detail: `${now.calls.held} of ${now.calls.booked} booked calls were held this period (was ${prev.calls.showRate.toFixed(0)}%).`,
        weight: 50,
        href: '/marketing',
      })
    }
  }

  /* ── Funnel: cost per lead ── */
  if (now.meta.leads >= 5 && prev.meta.leads >= 5) {
    const d = deltaPct(now.meta.cpl, prev.meta.cpl)
    if (d !== null && Math.abs(d) >= 15) {
      out.push({
        id: 'cpl-move',
        tone: d < 0 ? 'good' : 'watch',
        area: 'Funnel',
        headline: `Cost per lead ${d < 0 ? 'down' : 'up'} ${fmtPctAbs(d)} to ${fmtMoney(now.meta.cpl)}`,
        detail: `${now.meta.leads} leads on ${fmtMoney(now.meta.spend)} spend this period.`,
        weight: 48,
        href: '/marketing',
      })
    }
  }

  /* ── Delivery: time to first insight ── */
  if (now.journey.medianDaysToUnlockInPeriod !== null && prev.journey.medianDaysToUnlockInPeriod !== null) {
    const d = now.journey.medianDaysToUnlockInPeriod - prev.journey.medianDaysToUnlockInPeriod
    if (Math.abs(d) >= 5) {
      out.push({
        id: 'time-to-unlock',
        tone: d < 0 ? 'good' : 'watch',
        area: 'Delivery',
        headline: `Time to first insight ${d < 0 ? 'down' : 'up'} to ${Math.round(now.journey.medianDaysToUnlockInPeriod)} days`,
        detail: `Median days from joining to dashboard unlock moved ${Math.abs(Math.round(d))} days ${d < 0 ? 'faster' : 'slower'} for members unlocked this period.`,
        weight: 55,
        href: '/members',
      })
    }
  }

  /* ── Care ── */
  if (now.care.csatScore !== null && now.care.csatGood + now.care.csatBad >= 3 && now.care.csatScore < 80) {
    out.push({
      id: 'csat-low',
      tone: 'bad',
      area: 'Care',
      headline: `CSAT at ${now.care.csatScore.toFixed(0)}% this period`,
      detail: `${now.care.csatBad} negative rating${now.care.csatBad === 1 ? '' : 's'} out of ${now.care.csatGood + now.care.csatBad} responses.`,
      weight: 65,
    })
  }
  if (now.care.created > 0 && prev.care.created >= 3) {
    const d = deltaPct(now.care.created, prev.care.created)
    if (d !== null && d >= 40) {
      out.push({
        id: 'tickets-spike',
        tone: 'watch',
        area: 'Care',
        headline: `Support volume up ${fmtPctAbs(d)} — ${now.care.created} tickets`,
        detail: 'A spike in tickets often trails a delivery or comms issue by a few days.',
        weight: 52,
      })
    }
  }

  /* ── MER ── */
  if (now.mer !== null && prev.mer !== null && prev.mer > 0) {
    const d = deltaPct(now.mer, prev.mer)
    if (d !== null && Math.abs(d) >= 15) {
      out.push({
        id: 'mer-move',
        tone: d > 0 ? 'good' : 'watch',
        area: 'Efficiency',
        headline: `Marketing efficiency at ${now.mer.toFixed(1)}x revenue per ad dollar`,
        detail: `Every $1 of Meta spend coincided with $${now.mer.toFixed(2)} of net revenue (was $${prev.mer.toFixed(2)}).`,
        weight: 42,
        href: '/marketing',
      })
    }
  }

  /* ── Always have something to say ── */
  if (out.length === 0) {
    out.push({
      id: 'steady',
      tone: 'info',
      area: 'Growth',
      headline: 'Steady as she goes',
      detail: 'No metric moved more than its alert threshold vs the previous period. That itself is worth knowing.',
      weight: 1,
    })
  }

  return out.sort((a, b) => b.weight - a.weight)
}

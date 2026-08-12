/**
 * Small statistics helpers for the support / response-time reporting.
 *
 * Medians and percentiles are computed on the values actually present — never
 * on zero-filled gaps. Zendesk records a resolution time on 3,118 of 3,309
 * tickets and a first-response time on only 628, so treating missing as zero
 * would report a median first response near zero on almost every window.
 */

/** Coerce a loose cell value to a finite number, or null. */
export function toFinite(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[,$%]/g, ''))
  return isFinite(n) ? n : null
}

/** Every finite number in a list, missing values dropped. */
export function finiteValues(values: unknown[]): number[] {
  const out: number[] = []
  for (const v of values) {
    const n = toFinite(v)
    if (n !== null) out.push(n)
  }
  return out
}

/**
 * Linear-interpolated percentile, `p` in 0–100. Returns null on an empty list
 * so callers can render an em dash rather than a misleading 0.
 */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]
  const rank = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo)
}

/** Median (P50). Null on an empty list. */
export function median(values: number[]): number | null {
  return percentile(values, 50)
}

/** Mean. Null on an empty list. */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Sum, treating an empty list as 0. */
export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

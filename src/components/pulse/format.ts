/** Shared formatters for the Pulse experience. */

export const fmtNum = (n: number): string =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 })

export function fmtMoney(n: number, opts: { compact?: boolean; digits?: number } = {}): string {
  const { compact = false, digits } = opts
  if (compact && Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (compact && Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K`
  return `$${n.toLocaleString('en-US', {
    maximumFractionDigits: digits ?? 0,
    minimumFractionDigits: digits ?? 0,
  })}`
}

export const fmtPct = (n: number, digits = 0): string => `${n.toFixed(digits)}%`

export function fmtMins(mins: number | null): string {
  if (mins === null) return '—'
  if (mins < 60) return `${Math.round(mins)}m`
  if (mins < 60 * 24) return `${(mins / 60).toFixed(1)}h`
  return `${(mins / (60 * 24)).toFixed(1)}d`
}

export function fmtDays(days: number | null): string {
  if (days === null) return '—'
  return `${Math.round(days)}d`
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

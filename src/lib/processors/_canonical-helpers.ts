export interface ProcessorResult {
  validRows: Record<string, unknown>[]
  errors: { rowIndex: number; reason: string }[]
}

export function num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const s = String(v).replace(/[,$%]/g, '').trim()
  if (s === '' || s === '-') return null
  const n = Number(s)
  return isNaN(n) ? null : n
}

export function int(v: unknown): number | null {
  const n = num(v)
  return n === null ? null : Math.trunc(n)
}

export function dateOnly(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'n/a') return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

export function tsIso(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'n/a') return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export function txt(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' || s === '-' ? null : s
}

export function bool(v: unknown): boolean | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'boolean') return v
  const s = String(v).trim().toLowerCase()
  if (s === '' || s === '-' || s === 'n/a') return null
  if (s === 'true' || s === 'yes' || s === '1' || s === 't') return true
  if (s === 'false' || s === 'no' || s === '0' || s === 'f') return false
  return null
}

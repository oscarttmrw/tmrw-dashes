import type { PelagoniaRow } from '@/lib/types/pelagonia'

function toStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function parseNum(value: unknown): number {
  const s = toStr(value).trim()
  if (s === '' || s === '-') return 0
  return parseFloat(s.replace(/[,$%]/g, '')) || 0
}

function parseDateOrNull(value: unknown): string | null {
  const s = toStr(value).trim()
  if (s === '' || s.toLowerCase() === 'n/a') return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function lcRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]))
}

const WON_STAGES = ['won', 'closed won', 'closed - won', 'converted']

export function processPelagoniaCSV(data: Record<string, unknown>[]): PelagoniaRow[] {
  if (data.length > 0) {
    console.log('[pelagonia-processor] first-row keys:', Object.keys(data[0]))
  }

  return data
    .map((row): PelagoniaRow | null => {
      const lc = lcRow(row)
      const opportunityId = toStr(lc['opportunity id']).trim()
      const contactId = toStr(lc['contact id']).trim()
      if (!opportunityId && !contactId) return null

      const stage = toStr(lc['stage']).trim()
      const wonAtRaw = toStr(lc['won at']).trim()
      const isWon =
        WON_STAGES.includes(stage.toLowerCase()) ||
        Boolean(wonAtRaw && wonAtRaw.toLowerCase() !== 'n/a')

      return {
        opportunityId,
        stage,
        value: parseNum(lc['value']),
        contactId,
        createdAt: parseDateOrNull(lc['created at']),
        wonAt: parseDateOrNull(lc['won at']),
        callsBooked: parseNum(lc['calls booked']),
        appointmentStatus: toStr(lc['appointment status']).trim(),
        isWon,
      }
    })
    .filter((r): r is PelagoniaRow => r !== null)
}

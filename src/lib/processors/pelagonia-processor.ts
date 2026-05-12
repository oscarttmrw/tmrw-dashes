import type { PelagoniaRow } from '@/lib/types/pelagonia'

function parseNum(value: string | undefined): number {
  if (!value || value.trim() === '' || value.trim() === '-') return 0
  return parseFloat(value.replace(/[,$]/g, '').trim()) || 0
}

function parseDateOrNull(value: string | undefined): string | null {
  if (!value || value.trim() === '' || value.toLowerCase() === 'n/a') return null
  const d = new Date(value.trim())
  return isNaN(d.getTime()) ? null : d.toISOString()
}

const WON_STAGES = ['won', 'closed won', 'closed - won', 'converted']

export function processPelagoniaCSV(data: Record<string, string>[]): PelagoniaRow[] {
  return data
    .filter((row) => row['Opportunity ID']?.trim() || row['Contact ID']?.trim())
    .map((row): PelagoniaRow => {
      const stage = row['Stage']?.trim() ?? ''
      const isWon =
        WON_STAGES.includes(stage.toLowerCase()) ||
        Boolean(row['Won At']?.trim() && row['Won At']?.trim() !== 'n/a')

      return {
        opportunityId: row['Opportunity ID']?.trim() ?? '',
        stage,
        value: parseNum(row['Value']),
        contactId: row['Contact ID']?.trim() ?? '',
        createdAt: parseDateOrNull(row['Created At']),
        wonAt: parseDateOrNull(row['Won At']),
        callsBooked: parseNum(row['Calls Booked']),
        appointmentStatus: row['Appointment Status']?.trim() ?? '',
        isWon,
      }
    })
}

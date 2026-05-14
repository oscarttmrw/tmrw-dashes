import { txt, type ProcessorResult } from './_canonical-helpers'
import { parseAusDateTime } from './_date-helpers'

/**
 * Strip currency symbols / commas / whitespace before numeric parse.
 * Pelagonia (GoHighLevel) sometimes exports Value as "$1,250.00".
 */
function parseLooseNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const s = String(v).replace(/[^0-9.\-]/g, '').trim()
  if (s === '' || s === '-' || s === '.') return null
  const n = Number(s)
  return isNaN(n) ? null : n
}

/**
 * Canonical Pelagonia processor.
 *
 * record_type heuristic: a row is treated as an "appointment" if it has a
 * populated Appointment Date OR a Calendar field. Otherwise it's an
 * "opportunity" (pipeline row). Pelagonia/GHL exports the two record types
 * in the same flat CSV — the discriminator below mirrors which columns the
 * tool populates for each.
 */
export function processPelagoniaCSV(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    const opportunityId = txt(lc['opportunity id'])
    const appointmentId = txt(lc['appointment id'])
    const appointmentDate = parseAusDateTime(lc['appointment date'])
    const calendar = txt(lc['calendar'] ?? lc['calendar name'])
    const recordId = opportunityId ?? appointmentId ?? txt(lc['contact id'])

    if (!recordId) {
      errors.push({
        rowIndex: i,
        reason: `Row ${i}: missing record id (Opportunity ID / Appointment ID / Contact ID)`,
      })
      return
    }

    const isAppointment = !!appointmentDate || !!calendar || !!appointmentId
    const recordType = isAppointment ? 'appointment' : 'opportunity'

    const status = isAppointment
      ? txt(lc['appointment status'] ?? lc['status'] ?? lc['stage'])
      : txt(lc['stage'] ?? lc['pipeline stage'] ?? lc['status'])

    const stageRaw = txt(lc['stage'] ?? lc['pipeline stage'] ?? lc['pipeline'])

    validRows.push({
      pelagonia_record_id: recordId,
      record_type: recordType,
      pelagonia_created_at: parseAusDateTime(lc['created at']),
      appointment_date: appointmentDate,
      status: status === null ? null : status.toLowerCase(),
      pipeline_stage: stageRaw,
      calendar_name: calendar,
      source: txt(lc['source']),
      assigned_user: txt(lc['owner'] ?? lc['assigned user']),
      value: parseLooseNumber(lc['value']),
    })
  })

  return { validRows, errors }
}

export { processPelagoniaCSV as processPelagoniaToCanonical }

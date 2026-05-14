import { txt, type ProcessorResult } from './_canonical-helpers'
import { parseAusDateTime } from './_date-helpers'

/**
 * Canonical Tableau processor — one row per measure event. Tableau exports
 * date columns in mixed formats (DD/MM/YYYY locale + occasional ISO). The
 * shared parseAusDateTime tries the Australian shape first, then falls back
 * to native Date parsing. measure_value is intentionally kept as text per the
 * schema. All string fields are trimmed.
 */
export function processTableauCSV(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )
    const memberId = txt(lc['member id'])
    const measureName = txt(lc['measure names'] ?? lc['measure name'])
    if (!memberId) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Member Id` })
      return
    }
    if (!measureName) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Measure Names` })
      return
    }
    validRows.push({
      member_id: memberId,
      measure_name: measureName,
      measure_value: txt(lc['measure values'] ?? lc['measure value']),
      case_status: txt(lc['case_status'] ?? lc['case status']),
      person_type: txt(lc['person type']),
      event_date: parseAusDateTime(lc['created at'] ?? lc['event date']),
    })
  })

  return { validRows, errors }
}

export { processTableauCSV as processTableauToCanonical }

import { int, type ProcessorResult } from './_canonical-helpers'

/**
 * Convert an Excel serial number (1900 epoch, with Lotus 1900 leap-year bug)
 * to "YYYY-MM-DD". Returns null if the value isn't a usable serial.
 */
function excelSerialToDate(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  // Excel sometimes ships dates as strings if the cell was formatted as text.
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  if (!isFinite(n) || n <= 0) {
    // Maybe it's already a date string (ISO or AUS). Try Date constructor.
    const s = String(v).trim()
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  // Excel serial 25569 = 1970-01-01. 86400 sec/day.
  const ms = (n - 25569) * 86400 * 1000
  const d = new Date(ms)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

/**
 * Operational Data processor. Reads the TMRW_Operational_Data_Upload.xlsx
 * (Sheet2). Dates are Excel serial numbers. Trailing empty rows for future
 * dates are silently skipped.
 */
export function processOperationalDataXlsx(
  data: Record<string, unknown>[]
): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    const dateRaw = lc['date']
    const date = excelSerialToDate(dateRaw)
    if (!date) {
      // Trailing future-date rows ship with empty `date` cells. Skip silently
      // — only log an error if the cell was non-empty but unparseable.
      if (dateRaw !== null && dateRaw !== undefined && String(dateRaw).trim() !== '') {
        errors.push({ rowIndex: i, reason: `Row ${i}: unparseable date "${dateRaw}"` })
      }
      return
    }

    validRows.push({
      date,
      customers_registered: int(lc['customers_registered']) ?? 0,
      total_casebook: int(lc['total_casebook']) ?? 0,
      pod_created: int(lc['pod_created']) ?? 0,
      pod_dispatched: int(lc['pod_dispatched']) ?? 0,
      churned_members: int(lc['churned members']) ?? 0,
    })
  })

  return { validRows, errors }
}

export { processOperationalDataXlsx as processOperationalDataToCanonical }

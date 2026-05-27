import { num, type ProcessorResult } from './_canonical-helpers'

/**
 * Financial revenue processor. Reads one sheet of the Stripe revenue workbook
 * ("Net Revenue" or "Gross Revenue (RRP)") into canonical financial_revenue
 * rows. `revenueType` is fixed per sheet — each sheet ships as its own source.
 *
 * Only true daily rows are kept. The workbook interleaves monthly-subtotal
 * rows ("December Total"), blank spacer rows, and a final grand-total row —
 * none of those parse as a real date, so the date filter drops them and we
 * never persist a derived total.
 *
 * Values are in dollars. The TOTAL column is stored as-is from the sheet.
 */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/**
 * Convert an Excel date serial (days since 1899-12-30) to "YYYY-MM-DD".
 * Guarded to a sane range so stray numbers aren't read as dates.
 */
function fromExcelSerial(serial: number): string | null {
  if (!isFinite(serial) || serial < 20_000 || serial > 80_000) return null
  const d = new Date(Math.floor(serial - 25_569) * 86_400_000)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/**
 * Parse the workbook's date cell into "YYYY-MM-DD". Handles the displayed
 * "30-Dec-2025" form, a 2-digit-year variant, an Excel serial number (which
 * is how the client-side xlsx parser emits date cells — e.g. 45992), and a
 * native-parseable ISO date as fallbacks. Returns null for anything that
 * isn't a real date (subtotal labels, blanks) so non-daily rows are skipped.
 */
function parseRevenueDate(v: unknown): string | null {
  if (v === null || v === undefined) return null

  // Excel serial number (numeric cell)
  if (typeof v === 'number') return fromExcelSerial(v)

  const s = String(v).trim()
  if (s === '') return null

  // DD-Mon-YYYY (e.g. 30-Dec-2025) or DD-Mon-YY
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})[A-Za-z]*-(\d{2,4})$/)
  if (m) {
    const day = parseInt(m[1], 10)
    const mon = MONTHS[m[2].toLowerCase()]
    let year = parseInt(m[3], 10)
    if (year < 100) year += 2000
    if (mon && day >= 1 && day <= 31) {
      return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    return null
  }

  // Plain-number string → Excel serial. The client emits date cells as serials
  // (e.g. "45992"), so this must run BEFORE the native Date fallback —
  // otherwise new Date("45992") reads 45992 as a year.
  if (/^\d+(\.\d+)?$/.test(s)) {
    return fromExcelSerial(Number(s))
  }

  // ISO / native-parseable fallback. Non-date labels ("December Total",
  // "Grand Total") produce Invalid Date → null.
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function processFinancialRevenueSheet(
  data: Record<string, unknown>[],
  revenueType: 'net' | 'gross'
): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    const date = parseRevenueDate(lc['date'])
    // Skip subtotal / blank / grand-total rows — they have no real date.
    if (!date) return

    const membership = num(lc['membership']) ?? 0
    const joiningFees = num(lc['joining fees']) ?? 0
    const tmrwStacks = num(lc['tmrw stacks']) ?? 0
    const supplements = num(lc['supplements']) ?? 0
    const peptides = num(lc['peptides']) ?? 0
    const advancedTests = num(lc['advanced tests']) ?? 0

    // The sheet's TOTAL column is a formula; the workbook ships without cached
    // formula results, so it parses as empty. Compute it from the components
    // — they're the full product breakdown, so the sum equals the row total.
    const sourceTotal = num(lc['total'])
    const computedTotal = membership + joiningFees + tmrwStacks + supplements + peptides + advancedTests
    const total = sourceTotal && sourceTotal > 0 ? sourceTotal : computedTotal

    validRows.push({
      date,
      revenue_type: revenueType,
      membership,
      joining_fees: joiningFees,
      tmrw_stacks: tmrwStacks,
      supplements,
      peptides,
      advanced_tests: advancedTests,
      total,
    })
  })

  return { validRows, errors }
}

export function processFinancialRevenueNetToCanonical(
  data: Record<string, unknown>[]
): ProcessorResult {
  return processFinancialRevenueSheet(data, 'net')
}

export function processFinancialRevenueGrossToCanonical(
  data: Record<string, unknown>[]
): ProcessorResult {
  return processFinancialRevenueSheet(data, 'gross')
}

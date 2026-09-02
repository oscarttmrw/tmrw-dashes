import { num, type ProcessorResult } from './_canonical-helpers'
import { parseSpreadsheetDate } from './_date-helpers'

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

    const date = parseSpreadsheetDate(lc['date'])
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

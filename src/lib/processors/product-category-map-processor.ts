import { txt, type ProcessorResult } from './_canonical-helpers'

/**
 * Product → revenue-category map, read from the `Mapping` tab of the Stripe
 * revenue workbook. Dan maintains that tab by hand, so this is the one source
 * that stays owned by the finance model rather than the warehouse.
 *
 * Each row contributes up to two lookup keys:
 *   - product_id     — exact, used whenever the export carries PRODUCT_ID
 *   - product_name_key — lower/trimmed name, the fallback for the 8-column CSV
 *
 * Recurring/one-off is derived from the category unless the sheet supplies a
 * `Revenue Class` column, which lets the classification change without a code
 * change.
 */

/**
 * Dan's split: off-the-shelf supplements, joining fees and advanced tests are
 * one-off revenue; everything else is recurring.
 */
const ONE_OFF_CATEGORIES = new Set([
  'joining fee revenue',
  'attach products - off-the-shelf supplements',
  'attach products - advanced tests',
])

export type RevenueClass = 'recurring' | 'one_off'

export function defaultRevenueClass(category: string): RevenueClass {
  return ONE_OFF_CATEGORIES.has(category.trim().toLowerCase()) ? 'one_off' : 'recurring'
}

function parseRevenueClass(v: unknown, category: string): RevenueClass {
  const s = txt(v)
  if (!s) return defaultRevenueClass(category)
  const norm = s.toLowerCase().replace(/[\s-]/g, '_')
  if (norm === 'one_off' || norm === 'oneoff' || norm === 'once') return 'one_off'
  if (norm === 'recurring' || norm === 'recur') return 'recurring'
  return defaultRevenueClass(category)
}

export function processProductCategoryMapToCanonical(
  data: Record<string, unknown>[]
): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  // Dedupe: the Mapping tab repeats a product ID once per price point (TMRW
  // Monthly Fee appears nine times). Last write wins, which matches the
  // workbook's own INDEX/MATCH behaviour of taking the first hit for a given key.
  const seenId = new Set<string>()
  const seenName = new Set<string>()

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    // The workbook's column is headed "MAPPING " — with a trailing space that
    // the lc-normalise above already strips.
    const rawCategory = lc['mapping'] ?? lc['mapping_category'] ?? lc['mapping category']
    const category = txt(rawCategory)
    const productId = txt(lc['product id'] ?? lc['product_id'])
    const productName = txt(lc['product name'] ?? lc['product_name'])

    if (!category) {
      // Rows with a product but no category are exactly the leak the workbook's
      // RECON_FLAG hunts for. Report rather than skip silently.
      if (productId || productName) {
        errors.push({
          rowIndex: i,
          reason: `no MAPPING category for ${productName ?? productId}`,
        })
      }
      return
    }

    // Five rows in the current Mapping tab hold Excel cell references (=C58,
    // =C60) rather than literal category text. A browser xlsx read normally
    // returns the cached value, so these should arrive resolved — if one ever
    // doesn't, fail loudly instead of writing "=C58" as a category.
    if (category.startsWith('=')) {
      errors.push({
        rowIndex: i,
        reason: `MAPPING is an unresolved formula (${category}) for ${productName ?? productId} — open the workbook, replace the cell reference with the literal category text, and re-upload`,
      })
      return
    }

    if (!productId && !productName) {
      errors.push({ rowIndex: i, reason: 'row has neither Product ID nor Product Name' })
      return
    }

    const nameKey = productName ? productName.toLowerCase() : null

    // Skip exact duplicates so the table keeps one row per lookup key.
    if (productId && seenId.has(productId) && (!nameKey || seenName.has(nameKey))) return
    if (productId) seenId.add(productId)
    if (nameKey) seenName.add(nameKey)

    validRows.push({
      product_id: productId,
      product_name_key: nameKey,
      product_name: productName,
      category,
      revenue_class: parseRevenueClass(lc['revenue class'] ?? lc['revenue_class'], category),
    })
  })

  return { validRows, errors }
}

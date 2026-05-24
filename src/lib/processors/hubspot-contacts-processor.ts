import { txt, bool, type ProcessorResult } from './_canonical-helpers'
import { parseAusDateTime } from './_date-helpers'

const PII_LC = new Set([
  'name > first',
  'name > last',
  'first name',
  'last name',
  'primary email',
  'email',
  'email addresses',
  'phone',
  'phone number',
  'mobile phone number',
])

/**
 * HubSpot Contacts processor. Reads the full export (434 columns), maps
 * the ~31 columns we care about, ignores the rest. Snapshot-replace upload —
 * Record ID is not required. Rows are rejected only if Lifecycle Stage is
 * blank (those rows are unusable).
 */
export function processHubspotContactsCSV(
  data: Record<string, unknown>[]
): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lcAll = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )
    const lc: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(lcAll)) {
      if (!PII_LC.has(k)) lc[k] = v
    }

    const lifecycleStage = txt(lc['lifecycle stage'])
    if (!lifecycleStage) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Lifecycle Stage` })
      return
    }

    validRows.push({
      lifecycle_stage: lifecycleStage,
      customer_type: txt(lc['customer type']),
      customer_entered_at: parseAusDateTime(
        lc['date entered "customer (lifecycle stage pipeline)"']
        ?? lc['date entered customer (lifecycle stage pipeline)']
      ),
      close_date: parseAusDateTime(lc['close date']),
      create_date: parseAusDateTime(lc['create date']),
      membership_status: txt(lc['membership status']),
      membership_start_date: parseAusDateTime(lc['membership start date']),
      churn_date: parseAusDateTime(lc['churn date']),
      churn_reason: txt(lc['churn reason']),
      cancel_at_period_end: bool(lc['cancel at period end']),
      stripe_subscription_id: txt(lc['stripe subscription id']),
      subscription_type: txt(lc['subscription type']),
      subscription_renewal_date: parseAusDateTime(lc['subscription renewal date']),
      oracle_member_id: txt(lc['oracle member id']),
      escript_sent: bool(lc['escript sent to member']),
      health_story_status: txt(lc['health story status']),
      health_story_completed_date: parseAusDateTime(lc['health story completed date']),
      customised_pods_sent: bool(lc['customised pods sent']),
      cp_order_date: parseAusDateTime(lc['cp order date']),
      cp_shipped_date: parseAusDateTime(lc['cp shipped date']),
      personalised_pods_shipped: bool(lc['personalised pods shipped']),
      blood_results_received: bool(lc['blood results (full) received in bp']),
      blood_draw_date: parseAusDateTime(lc['blood draw date']),
      blood_dashboard_published: bool(lc['blood dashboard published']),
      clinician_review_ready_date: parseAusDateTime(lc['clinician review ready date']),
      results_available_date: parseAusDateTime(lc['results available date']),
      results_extracted_to_oracle: bool(lc['results extracted to oracle']),
      epigenetics_dashboard_unlocked: bool(lc['epigenetics dashboard unlocked']),
      epigenetics_dashboard_unlocked_date: parseAusDateTime(
        lc['epigenetics dashboard unlocked date']
      ),
      dashboard_unlocked: bool(lc['dashboard unlocked']),
      dashboard_unlocked_date: parseAusDateTime(lc['dashboard unlocked date']),
      last_activity_date: parseAusDateTime(lc['last activity date']),
      last_test_date: parseAusDateTime(lc['last test date']),
    })
  })

  return { validRows, errors }
}

export { processHubspotContactsCSV as processHubspotContactsToCanonical }

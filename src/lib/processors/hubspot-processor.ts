import { txt, bool, type ProcessorResult } from './_canonical-helpers'
import { parseAusDate, parseAusDateTime } from './_date-helpers'

const HUBSPOT_PII_LC = new Set([
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
 * Canonical HubSpot processor. Strips PII before reading any field. All
 * dates pass through parseAusDate/parseAusDateTime (HubSpot exports use
 * Australian locale on this account). Booleans are read explicitly so
 * "true"/"True"/"TRUE"/"Yes" all become real `true`. Empty optionals are
 * coerced to null — rows are rejected only on missing Record ID.
 */
export function processHubspotCSV(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lcAll = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )
    const lc: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(lcAll)) {
      if (!HUBSPOT_PII_LC.has(k)) lc[k] = v
    }

    const recordId = txt(lc['record id'])
    if (!recordId) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Record ID` })
      return
    }

    const unlockedAtRaw =
      lc['"dashboard unlocked" changed at']
      ?? lc['dashboard unlocked changed at']

    validRows.push({
      hubspot_record_id: recordId,
      record_type: txt(lc['type']),
      hubspot_created_at: parseAusDateTime(lc['created at']),
      case_status: txt(lc['case status']),
      primary_clinician: txt(lc['primary clinician']),
      assigned_doctor: txt(lc['assigned doctor']),
      dashboard_unlocked: bool(lc['dashboard unlocked']),
      dashboard_unlocked_at: parseAusDateTime(unlockedAtRaw),
      sex: txt(lc['sex']),
      age_range: txt(lc['age range']),
      add_ons: txt(lc['add-ons'] ?? lc['add ons']),
      last_test_date: parseAusDate(lc['last test date']),
      next_retest_date: parseAusDate(lc['next retest date']),
      email_sequence_triggered: txt(lc['email sequence triggered']),
      last_interaction_at: parseAusDateTime(
        lc['last interaction > when'] ?? lc['last interaction']
      ),
      little_prick_id: txt(lc['little prick id']),
      patient_id: txt(lc['patient id']),
      lead_status: txt(lc['lead'] ?? lc['lead status']),
      lab_batch_tracking_number: txt(lc['lab batch tracking number']),
      health_story_complete: bool(lc['health story complete']),
    })
  })

  return { validRows, errors }
}

export { processHubspotCSV as processHubspotToCanonical }

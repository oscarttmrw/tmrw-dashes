import type { Member, JourneyStage } from '@/lib/types';
import { tsIso, dateOnly, txt, bool, type ProcessorResult } from './_canonical-helpers';

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
]);

export function processHubspotToCanonical(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = [];
  const errors: { rowIndex: number; reason: string }[] = [];

  data.forEach((row, i) => {
    const lcAll = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    );
    // Strip PII — never read these into output
    const lc: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(lcAll)) {
      if (!HUBSPOT_PII_LC.has(k)) lc[k] = v;
    }

    const recordId = txt(lc['record id']);
    if (!recordId) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Record ID` });
      return;
    }

    const dashboardUnlocked = bool(lc['dashboard unlocked']);
    const unlockedAtRaw =
      lc['"dashboard unlocked" changed at']
      ?? lc['dashboard unlocked changed at'];

    validRows.push({
      hubspot_record_id: recordId,
      record_type: txt(lc['type']),
      hubspot_created_at: tsIso(lc['created at']),
      case_status: txt(lc['case status']),
      primary_clinician: txt(lc['primary clinician']),
      assigned_doctor: txt(lc['assigned doctor']),
      dashboard_unlocked: dashboardUnlocked,
      dashboard_unlocked_at: tsIso(unlockedAtRaw),
      sex: txt(lc['sex']),
      age_range: txt(lc['age range']),
      add_ons: txt(lc['add-ons'] ?? lc['add ons']),
      last_test_date: dateOnly(lc['last test date']),
      next_retest_date: dateOnly(lc['next retest date']),
      email_sequence_triggered: txt(lc['email sequence triggered']),
      last_interaction_at: tsIso(lc['last interaction > when'] ?? lc['last interaction']),
      little_prick_id: txt(lc['little prick id']),
      patient_id: txt(lc['patient id']),
      lead_status: txt(lc['lead'] ?? lc['lead status']),
      lab_batch_tracking_number: txt(lc['lab batch tracking number']),
      health_story_complete: bool(lc['health story complete']),
    });
  });

  return { validRows, errors };
}

const REQUIRED_COLUMNS = [
  'Record ID',
  'Type',
  'Created at',
  'Primary Email',
] as const;

const PII_COLUMNS = [
  'Name > First',
  'Name > Last',
  'Email',
  'Primary Email',
  'Patient ID',
] as const;

function parseDateOrNull(value: string | undefined): string | null {
  if (!value || value.trim() === '' || value === 'n/a') return null;
  const d = new Date(value.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseCaseStatus(raw: string): Member['caseStatus'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'open') return 'Open';
  if (normalized === 'closed') return 'Closed';
  return 'Inactive';
}

function parseSex(raw: string): Member['sex'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'female') return 'Female';
  if (normalized === 'male') return 'Male';
  if (normalized === 'n/a' || normalized === '') return 'n/a';
  return null;
}

function parseMemberType(raw: string): Member['type'] {
  const normalized = raw?.trim() ?? '';
  if (normalized === 'Friend-Family' || normalized === 'Friend/Family') return 'Friend-Family';
  if (normalized === 'Investor') return 'Investor';
  if (normalized === 'Employee') return 'Employee';
  if (normalized === 'Test') return 'Test';
  return 'Customer';
}

function parseAddOns(raw: string): string[] {
  if (!raw || raw.trim() === '' || raw.trim() === 'n/a') return [];
  return raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
}

function parseEmailSequences(raw: string): string[] {
  if (!raw || raw.trim() === '' || raw.trim() === 'n/a') return [];
  return raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
}

function deriveJourneyStage(row: Record<string, string>): JourneyStage {
  const caseStatus = row['Case Status']?.trim().toLowerCase();
  if (caseStatus === 'closed' || caseStatus === 'inactive') return 'churned';

  const dashboardUnlocked =
    row['Dashboard Unlocked']?.trim().toLowerCase() === 'true' ||
    row['Dashboard Unlocked']?.trim() === '1' ||
    row['Dashboard Unlocked']?.trim().toLowerCase() === 'yes';

  const nextRetest = row['Next Retest Date']?.trim();
  const lastTest = row['Last Test Date']?.trim();
  const labBatch = row['Lab Batch Tracking Number']?.trim();

  if (dashboardUnlocked && nextRetest && nextRetest !== 'n/a') return 'retest-due';
  if (dashboardUnlocked) return 'dashboard-unlocked';
  if (labBatch && labBatch !== '' && labBatch !== 'n/a') return 'awaiting-results';
  if (lastTest && lastTest !== '' && lastTest !== 'n/a') return 'kit-returned';

  return 'registered';
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

export function processHubspotCSV(data: Record<string, string>[]): Member[] {
  // Validate required columns on first row
  if (data.length > 0) {
    const cols = Object.keys(data[0]);
    const missing = REQUIRED_COLUMNS.filter((c) => !cols.includes(c));
    if (missing.length > 0) {
      console.warn(`HubSpot CSV missing columns: ${missing.join(', ')}`);
    }
  }

  const now = new Date().toISOString();

  return data
    .filter((row) => row['Record ID']?.trim())
    .map((row): Member => {
      const recordId = row['Record ID'].trim();
      const createdAt = parseDateOrNull(row['Created at']) ?? now;
      const dashboardUnlocked =
        row['Dashboard Unlocked']?.trim().toLowerCase() === 'true' ||
        row['Dashboard Unlocked']?.trim() === '1' ||
        row['Dashboard Unlocked']?.trim().toLowerCase() === 'yes';

      return {
        id: `hs-${recordId}`,
        hubspotRecordId: recordId,
        // PII fields - populated here, stripped later by pii-stripper
        firstName: row['Name > First']?.trim() ?? '',
        lastName: row['Name > Last']?.trim() ?? '',
        displayName: `${row['Name > First']?.trim() ?? ''} ${row['Name > Last']?.trim() ?? ''}`.trim() || `Member ${recordId}`,
        email: (row['Primary Email'] || row['Email addresses'] || row['Email'] || '').trim().toLowerCase(),
        sex: parseSex(row['Sex']),
        ageRange: row['Age Range']?.trim() || null,
        type: parseMemberType(row['Type']),
        caseStatus: parseCaseStatus(row['Case Status']),
        createdAt,
        primaryClinician: row['Primary Clinician']?.trim() || null,
        assignedDoctor: row['Assigned Doctor']?.trim() || null,
        dashboardUnlocked,
        dashboardUnlockedAt: dashboardUnlocked
          ? parseDateOrNull(
              row['"Dashboard Unlocked" Changed At']
              || row['Dashboard Unlocked Changed At']
              || row['\\"Dashboard Unlocked\\" Changed At']
            )
          : null,
        lastTestDate: parseDateOrNull(row['Last Test Date']),
        nextRetestDate: parseDateOrNull(row['Next Retest Date']),
        emailSequenceTriggered: parseEmailSequences(row['Email sequence triggered']),
        addOns: parseAddOns(row['Add-ons']),
        journeyStage: deriveJourneyStage(row),
        // Financial fields - populated later by entity linker
        totalRevenue: 0,
        transactionCount: 0,
        firstPaymentDate: null,
        lastPaymentDate: null,
        mrr: 0,
        // Support fields - populated later by entity linker
        ticketCount: 0,
        openTickets: 0,
        avgResolutionTime: null,
        lastTicketDate: null,
        csat: null,
        // Computed fields
        healthScore: 'unknown',
        riskFlags: [],
        daysSinceRegistration: daysBetween(createdAt, now),
        betterTomorrows: dashboardUnlocked
          ? daysBetween(
              parseDateOrNull(
                row['"Dashboard Unlocked" Changed At']
                || row['Dashboard Unlocked Changed At']
                || row['\\"Dashboard Unlocked\\" Changed At']
              ) ?? createdAt,
              now
            )
          : 0,
        isVIP: false,
      };
    });
}

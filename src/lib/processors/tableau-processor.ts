import type { JourneyStage } from '@/lib/types';
import { tsIso, txt, type ProcessorResult } from './_canonical-helpers';

export function processTableauToCanonical(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = [];
  const errors: { rowIndex: number; reason: string }[] = [];

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    );
    const memberId = txt(lc['member id']);
    const measureName = txt(lc['measure names'] ?? lc['measure name']);
    if (!memberId) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Member Id` });
      return;
    }
    if (!measureName) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Measure Names` });
      return;
    }
    validRows.push({
      member_id: memberId,
      measure_name: measureName,
      measure_value: txt(lc['measure values'] ?? lc['measure value']),
      case_status: txt(lc['case_status'] ?? lc['case status']),
      person_type: txt(lc['person type']),
      event_date: tsIso(lc['created at'] ?? lc['event date']),
    });
  });

  return { validRows, errors };
}

export interface TableauMemberRaw {
  memberId: string;
  email: string;
  createdAt: string | null;
  initialSubscriptionDate: string | null;
  firstPurchaseDate: string | null;
  dashboardPublishedAt: string | null;
  firstResultReadyAt: string | null;
  caseStatus: string;
  caseType: string;
  personType: string;
  journeyStage: JourneyStage;
  measures: Record<string, number | string | null>;
}

function parseAustralianDate(value: string): Date | null {
  // Handle DD/MM/YYYY or DD/MM/YYYY HH:MM:SS (Australian date format)
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?$/);
  if (match) {
    const [, day, month, year, hours, minutes, seconds] = match;
    return new Date(
      parseInt(year), parseInt(month) - 1, parseInt(day),
      parseInt(hours || '0'), parseInt(minutes || '0'), parseInt(seconds || '0')
    );
  }
  // Fallback to standard Date parsing for ISO formats
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function parseDateOrNull(value: string | undefined): string | null {
  if (!value || value.trim() === '' || value.trim().toLowerCase() === 'null') return null;
  const d = parseAustralianDate(value.trim());
  return d ? d.toISOString() : null;
}

function parseMeasureValue(value: string | undefined): number | string | null {
  if (!value || value.trim() === '' || value.trim().toLowerCase() === 'null') return null;
  const numeric = parseFloat(value.trim());
  return isNaN(numeric) ? value.trim() : numeric;
}

function deriveJourneyStage(row: {
  caseStatus: string;
  dashboardPublishedAt: string | null;
  firstResultReadyAt: string | null;
  firstPurchaseDate: string | null;
  initialSubscriptionDate: string | null;
}): JourneyStage {
  const status = row.caseStatus?.toLowerCase() ?? '';

  if (status === 'closed' || status === 'inactive') return 'churned';
  if (row.dashboardPublishedAt) return 'dashboard-unlocked';
  if (row.firstResultReadyAt) return 'awaiting-results';
  if (row.firstPurchaseDate) return 'kit-dispatched';
  if (row.initialSubscriptionDate) return 'health-story-complete';
  return 'registered';
}

/**
 * Process Tableau TSV content (UTF-16LE, unpivoted format with 12 rows per member).
 * Groups rows by Member Id and pivots Measure Names into fields.
 */
export function processTableauTSV(content: string): TableauMemberRaw[] {
  // Handle UTF-16LE BOM and convert - the content may already be decoded
  let text = content;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split('\t').map((h) => h.trim());
  const colIndex = (name: string): number =>
    headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const memberIdIdx = colIndex('Member Id');
  const emailIdx = colIndex('Email');
  const createdAtIdx = colIndex('Created At');
  const initialSubIdx = colIndex('Initial Subscription Date');
  const firstPurchaseIdx = colIndex('First Purchase Date');
  const dashPubIdx = colIndex('Dashboard Published At');
  const firstResultIdx = colIndex('First Result Ready At');
  const caseStatusIdx = colIndex('CASE_STATUS');
  const caseTypeIdx = colIndex('CASE_TYPE');
  const personTypeIdx = colIndex('Person Type');
  const measureNameIdx = colIndex('Measure Names');
  const measureValueIdx = colIndex('Measure Values');

  if (memberIdIdx === -1 || measureNameIdx === -1 || measureValueIdx === -1) {
    console.warn('Tableau TSV missing required columns: Member Id, Measure Names, or Measure Values');
    return [];
  }

  // Group rows by Member Id
  const groups = new Map<
    string,
    { row: string[]; measures: Record<string, number | string | null> }
  >();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const memberId = cols[memberIdIdx]?.trim();
    if (!memberId) continue;

    if (!groups.has(memberId)) {
      groups.set(memberId, { row: cols, measures: {} });
    }

    const measureName = cols[measureNameIdx]?.trim();
    const measureValue = cols[measureValueIdx]?.trim();
    if (measureName) {
      groups.get(memberId)!.measures[measureName] = parseMeasureValue(measureValue);
    }
  }

  // Convert groups to TableauMemberRaw[]
  const results: TableauMemberRaw[] = [];

  for (const [memberId, { row, measures }] of Array.from(groups)) {
    const getCol = (idx: number): string | undefined =>
      idx >= 0 && idx < row.length ? row[idx] : undefined;

    const createdAt = parseDateOrNull(getCol(createdAtIdx));
    const initialSubscriptionDate = parseDateOrNull(getCol(initialSubIdx));
    const firstPurchaseDate = parseDateOrNull(getCol(firstPurchaseIdx));
    const dashboardPublishedAt = parseDateOrNull(getCol(dashPubIdx));
    const firstResultReadyAt = parseDateOrNull(getCol(firstResultIdx));
    const caseStatus = getCol(caseStatusIdx)?.trim() ?? '';
    const caseType = getCol(caseTypeIdx)?.trim() ?? '';
    const personType = getCol(personTypeIdx)?.trim() ?? '';

    const member: TableauMemberRaw = {
      memberId,
      email: getCol(emailIdx)?.trim() ?? '',
      createdAt,
      initialSubscriptionDate,
      firstPurchaseDate,
      dashboardPublishedAt,
      firstResultReadyAt,
      caseStatus,
      caseType,
      personType,
      journeyStage: deriveJourneyStage({
        caseStatus,
        dashboardPublishedAt,
        firstResultReadyAt,
        firstPurchaseDate,
        initialSubscriptionDate,
      }),
      measures,
    };

    results.push(member);
  }

  return results;
}

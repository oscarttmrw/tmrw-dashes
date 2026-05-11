import type { Ticket } from '@/lib/types';

const PII_COLUMNS = [
  'Requester',
  'Requester email',
  'Requester external id',
  'Subject',
  'Organization',
] as const;

const TIME_FIELDS = [
  'First reply time (min)',
  'First resolution time (min)',
  'Full resolution time (min)',
  'Requester wait time (min)',
] as const;

function parseDateOrNull(value: string | undefined): string | null {
  if (!value || value.trim() === '' || value === '-') return null;
  const d = new Date(value.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseMinutes(value: string | undefined): number | null {
  if (!value || value.trim() === '' || value === '-') return null;
  const parsed = parseFloat(value.trim());
  return isNaN(parsed) ? null : parsed;
}

function parseStatus(raw: string): Ticket['status'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'open' || normalized === 'new') return 'Open';
  if (normalized === 'pending') return 'Pending';
  if (normalized === 'solved') return 'Solved';
  if (normalized === 'closed') return 'Closed';
  return 'Open';
}

function parsePriority(raw: string): Ticket['priority'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'low') return 'Low';
  if (normalized === 'high') return 'High';
  if (normalized === 'urgent') return 'Urgent';
  return 'Normal';
}

function parseTicketType(raw: string): Ticket['ticketType'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'question') return 'Question';
  if (normalized === 'incident') return 'Incident';
  if (normalized === 'problem') return 'Problem';
  if (normalized === 'task') return 'Task';
  return null;
}

function parseSatisfaction(raw: string): Ticket['satisfaction'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'good' || normalized === 'good, i\'m satisfied') return 'Good';
  if (normalized === 'bad' || normalized === 'bad, i\'m not satisfied') return 'Bad';
  if (normalized === 'offered') return 'Offered';
  return 'Not Offered';
}

function parseTags(raw: string): string[] {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return [];
  return raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
}

function parseIntOrZero(value: string | undefined): number {
  if (!value || value.trim() === '' || value === '-') return 0;
  const parsed = parseInt(value.trim(), 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function processZendeskCSV(data: Record<string, string>[]): Ticket[] {
  return data
    .filter((row) => row['ID']?.trim() || row['Id']?.trim())
    .map((row): Ticket => {
      const id = row['ID']?.trim() ?? row['Id']?.trim() ?? '';

      return {
        id: `zd-${id}`,
        memberId: null, // linked later via entity-linker
        status: parseStatus(row['Status']),
        priority: parsePriority(row['Priority']),
        channel: row['Via']?.trim() ?? row['Channel']?.trim() ?? 'unknown',
        ticketType: parseTicketType(row['Ticket type'] ?? row['Type']),
        tags: parseTags(row['Tags']),
        createdAt: parseDateOrNull(row['Created at']) ?? new Date().toISOString(),
        updatedAt: parseDateOrNull(row['Updated at']) ?? new Date().toISOString(),
        solvedAt: parseDateOrNull(row['Solved at']),
        assignee: row['Assignee']?.trim() ?? 'Unassigned',
        group: row['Group']?.trim() ?? '',
        firstReplyMinutes: parseMinutes(row['First reply time in minutes'] ?? row['First reply time (min)']),
        firstResolutionMinutes: parseMinutes(row['First resolution time in minutes'] ?? row['First resolution time (min)']),
        fullResolutionMinutes: parseMinutes(row['Full resolution time in minutes within business hours'] ?? row['Full resolution time (min)']),
        requesterWaitMinutes: parseMinutes(row['Requester wait time in minutes within business hours'] ?? row['Requester wait time (min)']),
        satisfaction: parseSatisfaction(row['Satisfaction Score'] ?? row['Satisfaction']),
        reopens: parseIntOrZero(row['Reopens']),
        replies: parseIntOrZero(row['Replies']),
        assigneeStations: parseIntOrZero(row['Assignee stations']),
        groupStations: parseIntOrZero(row['Group stations']),
      };
    });
}

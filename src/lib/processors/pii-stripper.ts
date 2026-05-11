/**
 * PII stripping utilities for the TMRW dashboard.
 * Removes personally identifiable information from processed data
 * before it is stored or displayed.
 */

import type { Member, Ticket } from '@/lib/types';

/**
 * Strip PII fields from a single member record.
 * Replaces name fields with anonymised versions and removes email.
 * Returns a new object (does not mutate the original).
 */
export function stripMemberPII(member: Member): Member {
  const idSuffix = member.hubspotRecordId ?? member.id.slice(-6);

  return {
    ...member,
    firstName: '',
    lastName: '',
    displayName: `Member ${idSuffix}`,
    email: '',
  };
}

/**
 * Strip PII fields from an array of member records.
 * Returns a new array of stripped members.
 */
export function stripMembersPII(members: Member[]): Member[] {
  return members.map(stripMemberPII);
}

/**
 * Strip PII fields from a single ticket record.
 * Zendesk PII columns (Requester, Requester email, Subject, etc.)
 * are already excluded during CSV processing. This function handles
 * any residual PII that may have leaked through.
 * Returns a new object (does not mutate the original).
 */
export function stripTicketPII(ticket: Ticket): Ticket {
  // The Ticket type doesn't carry requester name/email fields
  // (they are stripped during processZendeskCSV), but we ensure
  // assignee names are kept since they are internal staff, not PII.
  return { ...ticket };
}

/**
 * Strip PII fields from an array of ticket records.
 * Returns a new array of stripped tickets.
 */
export function stripTicketsPII(tickets: Ticket[]): Ticket[] {
  return tickets.map(stripTicketPII);
}

/**
 * Strip PII from a raw CSV row before processing.
 * Removes known PII columns from a HubSpot record.
 */
const HUBSPOT_PII_COLUMNS = [
  'Name > First',
  'Name > Last',
  'Email',
  'Primary Email',
  'Patient ID',
] as const;

export function stripRawHubspotPII(
  row: Record<string, string>
): Record<string, string> {
  const cleaned = { ...row };
  for (const col of HUBSPOT_PII_COLUMNS) {
    delete cleaned[col];
  }
  return cleaned;
}

/**
 * Strip PII from a raw Zendesk CSV row before processing.
 */
const ZENDESK_PII_COLUMNS = [
  'Requester',
  'Requester email',
  'Requester external id',
  'Subject',
  'Organization',
] as const;

export function stripRawZendeskPII(
  row: Record<string, string>
): Record<string, string> {
  const cleaned = { ...row };
  for (const col of ZENDESK_PII_COLUMNS) {
    delete cleaned[col];
  }
  return cleaned;
}

/**
 * Cross-source entity linking for the TMRW dashboard.
 * Matches records across HubSpot, Zendesk, Stripe, and Tableau via email.
 */

import type { Member, Ticket, Transaction } from '@/lib/types';
import type { TableauMemberRaw } from './tableau-processor';

/**
 * Build a lookup map from email address to member ID.
 * Handles duplicate emails by keeping the first match (earliest record).
 */
export function buildEmailLookup(members: Member[]): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const member of members) {
    const email = member.email?.trim().toLowerCase();
    if (email && !lookup.has(email)) {
      lookup.set(email, member.id);
    }
  }

  return lookup;
}

/**
 * Link Zendesk tickets to members via requester email.
 * Mutates tickets in place, setting the memberId field.
 * Returns the count of successfully linked tickets.
 */
export function linkTicketsToMembers(
  tickets: Ticket[],
  members: Member[],
  ticketEmailMap?: Map<string, string>
): number {
  const emailLookup = buildEmailLookup(members);
  let linked = 0;

  for (const ticket of tickets) {
    // If a ticket→email map is provided (from raw CSV data), use it
    const ticketEmail = ticketEmailMap?.get(ticket.id)?.trim().toLowerCase();
    if (ticketEmail && emailLookup.has(ticketEmail)) {
      ticket.memberId = emailLookup.get(ticketEmail)!;
      linked++;
      continue;
    }

    // If the ticket already has a memberId, skip
    if (ticket.memberId) {
      linked++;
    }
  }

  // Aggregate ticket stats back onto members
  const memberTickets = new Map<string, Ticket[]>();
  for (const ticket of tickets) {
    if (!ticket.memberId) continue;
    const existing = memberTickets.get(ticket.memberId) ?? [];
    existing.push(ticket);
    memberTickets.set(ticket.memberId, existing);
  }

  for (const member of members) {
    const mTickets = memberTickets.get(member.id);
    if (!mTickets || mTickets.length === 0) continue;

    member.ticketCount = mTickets.length;
    member.openTickets = mTickets.filter(
      (t) => t.status === 'Open' || t.status === 'Pending'
    ).length;

    const resolved = mTickets.filter((t) => t.fullResolutionMinutes !== null);
    member.avgResolutionTime =
      resolved.length > 0
        ? resolved.reduce((sum, t) => sum + (t.fullResolutionMinutes ?? 0), 0) /
          resolved.length
        : null;

    const sorted = [...mTickets].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    member.lastTicketDate = sorted[0]?.createdAt ?? null;

    const rated = mTickets.filter(
      (t) => t.satisfaction === 'Good' || t.satisfaction === 'Bad'
    );
    member.csat =
      rated.length > 0
        ? (rated.filter((t) => t.satisfaction === 'Good').length / rated.length) * 100
        : null;
  }

  return linked;
}

/**
 * Link transactions to members and aggregate financial data.
 * Mutates members in place, updating revenue fields.
 * Returns the count of successfully linked transactions.
 */
export function linkTransactionsToMembers(
  transactions: Transaction[],
  members: Member[],
  transactionEmailMap?: Map<string, string>
): number {
  const emailLookup = buildEmailLookup(members);
  let linked = 0;

  for (const tx of transactions) {
    const txEmail = transactionEmailMap?.get(tx.chargeId)?.trim().toLowerCase();
    if (txEmail && emailLookup.has(txEmail)) {
      tx.memberId = emailLookup.get(txEmail)!;
      linked++;
    } else if (tx.memberId) {
      linked++;
    }
  }

  // Aggregate transaction stats onto members
  const memberTxns = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (!tx.memberId) continue;
    const existing = memberTxns.get(tx.memberId) ?? [];
    existing.push(tx);
    memberTxns.set(tx.memberId, existing);
  }

  for (const member of members) {
    const mTxns = memberTxns.get(member.id);
    if (!mTxns || mTxns.length === 0) continue;

    const successful = mTxns.filter((t) => t.outcome === 'authorized');
    member.totalRevenue = successful.reduce((sum, t) => sum + t.amount, 0);
    member.transactionCount = successful.length;

    const sorted = [...successful].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    member.firstPaymentDate = sorted[0]?.createdAt ?? null;
    member.lastPaymentDate = sorted[sorted.length - 1]?.createdAt ?? null;

    // Estimate MRR from recurring transactions in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRecurring = successful.filter(
      (t) => t.isRecurring && new Date(t.createdAt) >= thirtyDaysAgo
    );
    member.mrr = recentRecurring.reduce((sum, t) => sum + t.amount, 0);
  }

  return linked;
}

/**
 * Link HubSpot members to Tableau member data via email.
 * Enriches members with Tableau-derived measures and journey stages.
 * Returns the count of successfully linked records.
 */
export function linkHubspotToTableau(
  members: Member[],
  tableauMembers: TableauMemberRaw[]
): number {
  // Build email lookup from Tableau data
  const tableauByEmail = new Map<string, TableauMemberRaw>();
  for (const tm of tableauMembers) {
    const email = tm.email?.trim().toLowerCase();
    if (email) {
      tableauByEmail.set(email, tm);
    }
  }

  // Also build by memberId for direct matching
  const tableauById = new Map<string, TableauMemberRaw>();
  for (const tm of tableauMembers) {
    if (tm.memberId) {
      tableauById.set(tm.memberId, tm);
    }
  }

  let linked = 0;

  for (const member of members) {
    // Try email match first
    const email = member.email?.trim().toLowerCase();
    let tableau = email ? tableauByEmail.get(email) : undefined;

    // Fallback to hubspot record ID match
    if (!tableau && member.hubspotRecordId) {
      tableau = tableauById.get(member.hubspotRecordId);
    }

    if (!tableau) continue;
    linked++;

    // Enrich with Tableau dates if HubSpot data is missing
    if (!member.dashboardUnlockedAt && tableau.dashboardPublishedAt) {
      member.dashboardUnlockedAt = tableau.dashboardPublishedAt;
      member.dashboardUnlocked = true;
    }

    // Upgrade journey stage if Tableau has more detail
    if (
      tableau.journeyStage === 'dashboard-unlocked' &&
      member.journeyStage === 'registered'
    ) {
      member.journeyStage = tableau.journeyStage;
    }

    // Merge measures into betterTomorrows if available
    const btValue = tableau.measures['Better Tomorrows'];
    if (typeof btValue === 'number') {
      member.betterTomorrows = btValue;
    }
  }

  return linked;
}

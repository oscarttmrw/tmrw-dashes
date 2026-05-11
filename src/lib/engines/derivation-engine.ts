/**
 * Derivation engine for the TMRW dashboard.
 * Computes derived metrics from raw processed data.
 */

import type { Member, Transaction, Ticket } from '@/lib/types';

// ── Financial Metrics ──────────────────────────────────────────────────

/**
 * Compute Monthly Recurring Revenue from transactions.
 * Sums recurring subscription amounts from the most recent 30-day window.
 */
export function computeMRR(transactions: Transaction[]): number {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return transactions
    .filter(
      (t) =>
        t.outcome === 'authorized' &&
        t.isRecurring &&
        new Date(t.createdAt) >= thirtyDaysAgo &&
        new Date(t.createdAt) <= now
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Compute revenue breakdown by transaction type.
 */
export function computeRevenueByType(
  transactions: Transaction[]
): Record<string, number> {
  const breakdown: Record<string, number> = {
    'foundations-membership': 0,
    'advanced-testing': 0,
    supplements: 0,
    medication: 0,
    'treatment-journey': 0,
  };

  for (const t of transactions) {
    if (t.outcome !== 'authorized') continue;
    breakdown[t.type] = (breakdown[t.type] ?? 0) + t.amount;
  }

  return breakdown;
}

/**
 * Compute monthly revenue totals.
 * Returns a map of YYYY-MM -> total revenue.
 */
export function computeRevenueByMonth(
  transactions: Transaction[]
): Record<string, number> {
  const monthly: Record<string, number> = {};

  for (const t of transactions) {
    if (t.outcome !== 'authorized') continue;
    const month = t.createdAt.slice(0, 7); // YYYY-MM
    monthly[month] = (monthly[month] ?? 0) + t.amount;
  }

  return monthly;
}

// ── Member Metrics ─────────────────────────────────────────────────────

/**
 * Compute monthly churn rate.
 * Churn = members who became inactive/churned during the period / total active at start.
 */
export function computeChurnRate(
  members: Member[],
  periodStart: string,
  periodEnd: string
): number {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  // Members who were active at the start of the period
  const activeAtStart = members.filter((m) => {
    const created = new Date(m.createdAt);
    return created < start && m.caseStatus !== 'Inactive';
  });

  if (activeAtStart.length === 0) return 0;

  // Members who churned during the period
  // We approximate by checking if case is now Inactive/Closed
  // and the member was created before the period
  const churned = activeAtStart.filter(
    (m) => m.journeyStage === 'churned' || m.caseStatus === 'Inactive'
  );

  return (churned.length / activeAtStart.length) * 100;
}

/**
 * Compute the percentage of members who have unlocked their dashboard.
 */
export function computeDashboardUnlockRate(members: Member[]): number {
  const eligible = members.filter(
    (m) => m.type === 'Customer' && m.caseStatus !== 'Inactive'
  );
  if (eligible.length === 0) return 0;

  const unlocked = eligible.filter((m) => m.dashboardUnlocked);
  return (unlocked.length / eligible.length) * 100;
}

/**
 * Compute average days from registration to dashboard unlock.
 */
export function computeAvgRegToDashboard(members: Member[]): number {
  const withDashboard = members.filter(
    (m) => m.dashboardUnlocked && m.dashboardUnlockedAt && m.createdAt
  );

  if (withDashboard.length === 0) return 0;

  const totalDays = withDashboard.reduce((sum, m) => {
    const created = new Date(m.createdAt).getTime();
    const unlocked = new Date(m.dashboardUnlockedAt!).getTime();
    const days = Math.max(0, (unlocked - created) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);

  return totalDays / withDashboard.length;
}

/**
 * Compute total Better Tomorrows: sum of active days since dashboard unlock
 * across all members with unlocked dashboards.
 */
export function computeBetterTomorrows(members: Member[]): number {
  return members.reduce((sum, m) => sum + m.betterTomorrows, 0);
}

/**
 * Compute count of members waiting for their dashboard (registered but not unlocked).
 */
export function computeMembersWaitingForDashboard(members: Member[]): number {
  return members.filter(
    (m) =>
      !m.dashboardUnlocked &&
      m.caseStatus === 'Open' &&
      m.type === 'Customer'
  ).length;
}

/**
 * Compute supplement attach rate: percentage of active customers with add-ons.
 */
export function computeSupplementAttachRate(members: Member[]): number {
  const active = members.filter(
    (m) => m.caseStatus === 'Open' && m.type === 'Customer'
  );
  if (active.length === 0) return 0;

  const withSupplements = active.filter((m) => m.addOns.length > 0);
  return (withSupplements.length / active.length) * 100;
}

/**
 * Compute pipeline timing segments.
 * Returns average days spent in each journey stage.
 */
export function computePipelineTimings(
  members: Member[]
): Record<string, number> {
  const stages = [
    'registered',
    'health-story-complete',
    'kit-dispatched',
    'kit-returned',
    'awaiting-results',
    'dashboard-unlocked',
    'insights-call-complete',
    'active-plan',
    'retest-due',
  ] as const;

  const timings: Record<string, number> = {};

  // Use average days since registration grouped by current stage
  for (const stage of stages) {
    const inStage = members.filter((m) => m.journeyStage === stage);
    if (inStage.length === 0) {
      timings[stage] = 0;
      continue;
    }
    timings[stage] =
      inStage.reduce((sum, m) => sum + m.daysSinceRegistration, 0) /
      inStage.length;
  }

  return timings;
}

// ── Support Metrics ────────────────────────────────────────────────────

/**
 * Compute CSAT score from tickets.
 * CSAT = (Good ratings / Total rated) * 100.
 */
export function computeCSATScore(tickets: Ticket[]): number {
  const rated = tickets.filter(
    (t) => t.satisfaction === 'Good' || t.satisfaction === 'Bad'
  );

  if (rated.length === 0) return 0;

  const good = rated.filter((t) => t.satisfaction === 'Good').length;
  return (good / rated.length) * 100;
}

/**
 * Compute average first reply time in hours.
 */
export function computeAvgFirstReply(tickets: Ticket[]): number {
  const withReply = tickets.filter((t) => t.firstReplyMinutes !== null);
  if (withReply.length === 0) return 0;

  const totalMinutes = withReply.reduce(
    (sum, t) => sum + (t.firstReplyMinutes ?? 0),
    0
  );
  return totalMinutes / withReply.length / 60; // Convert minutes to hours
}

/**
 * Compute ticket resolution rate for a period.
 * Resolution rate = tickets solved in period / tickets created in period.
 */
export function computeTicketResolutionRate(
  tickets: Ticket[],
  periodStart: string,
  periodEnd: string
): number {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  const createdInPeriod = tickets.filter((t) => {
    const created = new Date(t.createdAt);
    return created >= start && created <= end;
  });

  if (createdInPeriod.length === 0) return 0;

  const solvedInPeriod = createdInPeriod.filter(
    (t) => t.status === 'Solved' || t.status === 'Closed'
  );

  return (solvedInPeriod.length / createdInPeriod.length) * 100;
}

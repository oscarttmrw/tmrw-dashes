/**
 * Health score engine for the TMRW dashboard.
 * Computes individual member health scores based on journey progress,
 * payment status, support tickets, and activity recency.
 */

import type { Member, HealthScore } from '@/lib/types';

interface HealthFactors {
  journeyScore: number;   // 0-100
  paymentScore: number;   // 0-100
  supportScore: number;   // 0-100
  activityScore: number;  // 0-100
}

const WEIGHTS = {
  journey: 0.35,
  payment: 0.25,
  support: 0.20,
  activity: 0.20,
} as const;

const THRESHOLDS = {
  healthy: 70,
  attention: 40,
  // Below 40 = at-risk
} as const;

/**
 * Compute a health score for a single member.
 *
 * Factors:
 * - Journey progress: how far through the member journey
 * - Payment status: successful payments, no failures
 * - Support tickets: low ticket volume, good CSAT
 * - Activity recency: recent engagement
 *
 * Returns: 'healthy' | 'attention' | 'at-risk' | 'unknown'
 */
export function computeHealthScore(member: Member): HealthScore {
  // If the member has no meaningful data, return unknown
  if (!member.createdAt || member.caseStatus === 'Inactive') {
    return 'unknown';
  }

  // Churned members are at-risk by definition
  if (member.journeyStage === 'churned') {
    return 'at-risk';
  }

  const factors = computeFactors(member);
  const composite =
    factors.journeyScore * WEIGHTS.journey +
    factors.paymentScore * WEIGHTS.payment +
    factors.supportScore * WEIGHTS.support +
    factors.activityScore * WEIGHTS.activity;

  if (composite >= THRESHOLDS.healthy) return 'healthy';
  if (composite >= THRESHOLDS.attention) return 'attention';
  return 'at-risk';
}

function computeFactors(member: Member): HealthFactors {
  return {
    journeyScore: scoreJourney(member),
    paymentScore: scorePayment(member),
    supportScore: scoreSupport(member),
    activityScore: scoreActivity(member),
  };
}

/**
 * Score based on journey stage progression.
 * Later stages = higher score.
 */
function scoreJourney(member: Member): number {
  const stageScores: Record<string, number> = {
    registered: 20,
    'health-story-complete': 35,
    'kit-dispatched': 45,
    'kit-returned': 55,
    'awaiting-results': 60,
    'dashboard-unlocked': 75,
    'insights-call-complete': 85,
    'active-plan': 95,
    'retest-due': 90,
    churned: 0,
    inactive: 10,
  };

  const baseScore = stageScores[member.journeyStage] ?? 10;

  // Penalise if stalled (registered for a long time without progress)
  if (member.journeyStage === 'registered' && member.daysSinceRegistration > 30) {
    return Math.max(0, baseScore - 15);
  }

  return baseScore;
}

/**
 * Score based on payment history.
 * Successful payments and recurring = high score.
 * No payments or failures = low score.
 */
function scorePayment(member: Member): number {
  // No transactions yet - neutral (not penalised, but not positive)
  if (member.transactionCount === 0) return 50;

  let score = 60; // Base for having any payment

  // Bonus for MRR (active subscription)
  if (member.mrr > 0) score += 20;

  // Bonus for multiple successful transactions
  if (member.transactionCount >= 3) score += 10;

  // Bonus for recent payment
  if (member.lastPaymentDate) {
    const daysSincePayment = daysBetween(
      member.lastPaymentDate,
      new Date().toISOString()
    );
    if (daysSincePayment <= 30) score += 10;
    else if (daysSincePayment > 90) score -= 20;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Score based on support interaction quality.
 * Few tickets + good CSAT = high score.
 * Many open tickets or bad CSAT = low score.
 */
function scoreSupport(member: Member): number {
  // No support interaction - neutral
  if (member.ticketCount === 0) return 70;

  let score = 60;

  // Penalise for open tickets
  if (member.openTickets > 0) score -= member.openTickets * 10;

  // CSAT bonus/penalty
  if (member.csat !== null) {
    if (member.csat >= 90) score += 20;
    else if (member.csat >= 70) score += 10;
    else if (member.csat < 50) score -= 20;
  }

  // High ticket volume penalty
  if (member.ticketCount > 5) score -= 10;

  // Slow resolution penalty
  if (member.avgResolutionTime !== null && member.avgResolutionTime > 1440) {
    score -= 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Score based on activity recency.
 * Recent engagement = high score.
 * Long inactivity = low score.
 */
function scoreActivity(member: Member): number {
  const now = new Date();
  let score = 50;

  // Dashboard engagement
  if (member.dashboardUnlocked) {
    score += 20;

    if (member.dashboardUnlockedAt) {
      const daysSinceUnlock = daysBetween(
        member.dashboardUnlockedAt,
        now.toISOString()
      );
      // Recent unlock is very positive
      if (daysSinceUnlock <= 14) score += 15;
      else if (daysSinceUnlock <= 30) score += 10;
    }
  }

  // Retest engagement
  if (member.nextRetestDate) {
    const daysUntilRetest = daysBetween(
      now.toISOString(),
      member.nextRetestDate
    );
    if (daysUntilRetest > 0 && daysUntilRetest <= 30) {
      score += 10; // Retest coming up - engaged
    }
  }

  // Last test date recency
  if (member.lastTestDate) {
    const daysSinceTest = daysBetween(member.lastTestDate, now.toISOString());
    if (daysSinceTest <= 60) score += 10;
    else if (daysSinceTest > 180) score -= 15;
  }

  // Penalise very new members with no activity
  if (
    member.daysSinceRegistration > 14 &&
    !member.dashboardUnlocked &&
    member.transactionCount === 0
  ) {
    score -= 20;
  }

  return Math.min(100, Math.max(0, score));
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

/**
 * Batch-compute health scores for all members.
 * Mutates members in place, updating the healthScore field.
 * Returns the members array for convenience.
 */
export function computeAllHealthScores(members: Member[]): Member[] {
  for (const member of members) {
    member.healthScore = computeHealthScore(member);
  }
  return members;
}

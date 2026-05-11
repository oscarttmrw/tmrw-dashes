/**
 * Alert engine for the TMRW dashboard.
 * Generates alerts from current vs previous metric values and member/ticket state.
 */

import type {
  Alert,
  AlertType,
  AlertSeverity,
  Member,
  Ticket,
  Transaction,
  MetricValue,
  Status,
} from '@/lib/types';

let alertCounter = 0;

function nextAlertId(): string {
  alertCounter++;
  return `alert-${Date.now()}-${alertCounter}`;
}

interface AlertInput {
  currentMetrics: MetricValue[];
  previousMetrics: MetricValue[];
  members: Member[];
  tickets: Ticket[];
  transactions: Transaction[];
}

/**
 * Generate all alerts based on current data state.
 *
 * Rules:
 * - Metric status change (green->amber, amber->red) = medium/high severity
 * - Recovery (red->amber, amber->green) = low severity (positive)
 * - Stalled member (registered >30 days, no dashboard) = medium
 * - Payment failure spike >5% = high
 * - Support backlog >20 open tickets = medium
 * - Clinician overload >60 cases = high
 */
export function generateAlerts(input: AlertInput): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  // 1. Metric status changes
  alerts.push(...detectStatusChanges(input.currentMetrics, input.previousMetrics, now));

  // 2. Stalled members
  alerts.push(...detectStalledMembers(input.members, now));

  // 3. Payment failure spike
  alerts.push(...detectPaymentFailureSpike(input.transactions, now));

  // 4. Support backlog
  alerts.push(...detectSupportBacklog(input.tickets, now));

  // 5. Clinician overload
  alerts.push(...detectClinicianOverload(input.members, now));

  return alerts;
}

function detectStatusChanges(
  current: MetricValue[],
  previous: MetricValue[],
  now: string
): Alert[] {
  const alerts: Alert[] = [];
  const prevMap = new Map(previous.map((m) => [m.metricId, m]));

  for (const metric of current) {
    const prev = prevMap.get(metric.metricId);
    if (!prev) continue;

    const prevStatus = prev.status;
    const currStatus = metric.status;

    if (prevStatus === currStatus) continue;
    if (prevStatus === 'grey' || currStatus === 'grey') continue;

    // Deterioration
    if (isDeteriorating(prevStatus, currStatus)) {
      const severity = currStatus === 'red' ? 'high' : 'medium';
      alerts.push({
        id: nextAlertId(),
        type: 'status-change',
        severity,
        title: `${metric.metricId} moved from ${prevStatus} to ${currStatus}`,
        detail: `Metric "${metric.metricId}" deteriorated from ${prevStatus} to ${currStatus}. Current value: ${metric.current}, target: ${metric.target}.`,
        metricId: metric.metricId,
        functionalArea: inferFunctionalArea(metric.metricId),
        createdAt: now,
        acknowledged: false,
      });
    }

    // Recovery
    if (isRecovering(prevStatus, currStatus)) {
      alerts.push({
        id: nextAlertId(),
        type: 'metric-recovery',
        severity: 'low',
        title: `${metric.metricId} recovered from ${prevStatus} to ${currStatus}`,
        detail: `Metric "${metric.metricId}" improved from ${prevStatus} to ${currStatus}. Current value: ${metric.current}.`,
        metricId: metric.metricId,
        functionalArea: inferFunctionalArea(metric.metricId),
        createdAt: now,
        acknowledged: false,
      });
    }
  }

  return alerts;
}

function isDeteriorating(prev: Status, curr: Status): boolean {
  const order: Record<Status, number> = { green: 0, amber: 1, red: 2, grey: -1 };
  return order[curr] > order[prev];
}

function isRecovering(prev: Status, curr: Status): boolean {
  const order: Record<Status, number> = { green: 0, amber: 1, red: 2, grey: -1 };
  return order[curr] < order[prev] && order[prev] >= 0 && order[curr] >= 0;
}

function detectStalledMembers(members: Member[], now: string): Alert[] {
  const alerts: Alert[] = [];

  const stalled = members.filter(
    (m) =>
      m.journeyStage === 'registered' &&
      m.daysSinceRegistration > 30 &&
      !m.dashboardUnlocked &&
      m.caseStatus === 'Open'
  );

  if (stalled.length > 0) {
    alerts.push({
      id: nextAlertId(),
      type: 'stalled-member',
      severity: 'medium',
      title: `${stalled.length} member(s) stalled for 30+ days`,
      detail: `${stalled.length} member(s) registered over 30 days ago without reaching dashboard unlock. Earliest registration: ${stalled.reduce(
        (min, m) => (m.daysSinceRegistration > min ? m.daysSinceRegistration : min),
        0
      )} days ago.`,
      metricId: 'stalled-members',
      functionalArea: 'members',
      createdAt: now,
      acknowledged: false,
    });
  }

  return alerts;
}

function detectPaymentFailureSpike(
  transactions: Transaction[],
  now: string
): Alert[] {
  const alerts: Alert[] = [];

  if (transactions.length === 0) return alerts;

  const failed = transactions.filter(
    (t) => t.outcome === 'declined' || t.outcome === 'blocked'
  );
  const failureRate = (failed.length / transactions.length) * 100;

  if (failureRate > 5) {
    alerts.push({
      id: nextAlertId(),
      type: 'payment-spike',
      severity: 'high',
      title: `Payment failure rate at ${failureRate.toFixed(1)}%`,
      detail: `${failed.length} of ${transactions.length} transactions failed (${failureRate.toFixed(1)}%). This exceeds the 5% threshold.`,
      metricId: 'payment-success-rate',
      functionalArea: 'financial',
      createdAt: now,
      acknowledged: false,
    });
  }

  return alerts;
}

function detectSupportBacklog(tickets: Ticket[], now: string): Alert[] {
  const alerts: Alert[] = [];

  const openTickets = tickets.filter(
    (t) => t.status === 'Open' || t.status === 'Pending'
  );

  if (openTickets.length > 20) {
    alerts.push({
      id: nextAlertId(),
      type: 'support-backlog',
      severity: 'medium',
      title: `${openTickets.length} open support tickets`,
      detail: `Support backlog has ${openTickets.length} open/pending tickets, exceeding the 20-ticket threshold.`,
      metricId: 'open-tickets',
      functionalArea: 'support',
      createdAt: now,
      acknowledged: false,
    });
  }

  return alerts;
}

function detectClinicianOverload(members: Member[], now: string): Alert[] {
  const alerts: Alert[] = [];

  // Group active cases by clinician
  const casesByClinician = new Map<string, number>();
  for (const m of members) {
    if (m.caseStatus !== 'Open' || !m.primaryClinician) continue;
    const count = casesByClinician.get(m.primaryClinician) ?? 0;
    casesByClinician.set(m.primaryClinician, count + 1);
  }

  casesByClinician.forEach((count, clinician) => {
    if (count > 60) {
      alerts.push({
        id: nextAlertId(),
        type: 'clinician-overload',
        severity: 'high',
        title: `${clinician} has ${count} active cases`,
        detail: `Clinician "${clinician}" is managing ${count} active cases, exceeding the 60-case capacity threshold.`,
        metricId: null,
        functionalArea: 'clinical',
        createdAt: now,
        acknowledged: false,
      });
    }
  });

  return alerts;
}

function inferFunctionalArea(
  metricId: string
): Alert['functionalArea'] {
  if (
    metricId.includes('revenue') ||
    metricId.includes('mrr') ||
    metricId.includes('payment') ||
    metricId.includes('arpu') ||
    metricId.includes('ltv') ||
    metricId.includes('churn')
  ) {
    return 'financial';
  }
  if (
    metricId.includes('member') ||
    metricId.includes('dashboard') ||
    metricId.includes('journey') ||
    metricId.includes('health-story') ||
    metricId.includes('kit') ||
    metricId.includes('retest') ||
    metricId.includes('stalled')
  ) {
    return 'members';
  }
  if (
    metricId.includes('clinician') ||
    metricId.includes('insights') ||
    metricId.includes('plan') ||
    metricId.includes('better-tomorrow')
  ) {
    return 'clinical';
  }
  if (
    metricId.includes('ticket') ||
    metricId.includes('csat') ||
    metricId.includes('reply') ||
    metricId.includes('resolution') ||
    metricId.includes('reopen')
  ) {
    return 'support';
  }
  if (
    metricId.includes('lead') ||
    metricId.includes('cac') ||
    metricId.includes('email-sequence')
  ) {
    return 'marketing';
  }
  return 'strategy';
}

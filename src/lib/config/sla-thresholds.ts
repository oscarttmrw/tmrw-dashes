/**
 * Default SLA thresholds for the TMRW dashboard.
 * Each threshold defines green/amber/red boundaries.
 * Values use the same units as the related metric format.
 */

export interface SlaThreshold {
  metricId: string;
  label: string;
  unit: 'minutes' | 'hours' | 'days' | 'percentage' | 'count';
  /** Values at or better than this are green. */
  green: number;
  /** Values worse than green but at or better than this are amber. */
  amber: number;
  /** Values worse than amber are red. */
  // red is implicit: anything beyond amber
  direction: 'lower-better' | 'higher-better';
}

export const slaThresholds: SlaThreshold[] = [
  // ── Support SLAs ────────────────────────────────────────────────────
  {
    metricId: 'first-reply-time',
    label: 'First Reply Time',
    unit: 'minutes',
    green: 60,
    amber: 120,
    direction: 'lower-better',
  },
  {
    metricId: 'resolution-time',
    label: 'Full Resolution Time',
    unit: 'minutes',
    green: 480,
    amber: 1440,
    direction: 'lower-better',
  },
  {
    metricId: 'csat-score',
    label: 'CSAT Score',
    unit: 'percentage',
    green: 90,
    amber: 75,
    direction: 'higher-better',
  },
  {
    metricId: 'one-touch-resolution-rate',
    label: 'One-Touch Resolution Rate',
    unit: 'percentage',
    green: 50,
    amber: 30,
    direction: 'higher-better',
  },
  {
    metricId: 'ticket-backlog',
    label: 'Ticket Backlog',
    unit: 'count',
    green: 5,
    amber: 15,
    direction: 'lower-better',
  },
  {
    metricId: 'ticket-reopens',
    label: 'Ticket Reopens',
    unit: 'count',
    green: 2,
    amber: 5,
    direction: 'lower-better',
  },

  // ── Member Journey SLAs ─────────────────────────────────────────────
  {
    metricId: 'avg-days-to-dashboard',
    label: 'Avg Days to Dashboard Unlock',
    unit: 'days',
    green: 30,
    amber: 45,
    direction: 'lower-better',
  },
  {
    metricId: 'avg-days-to-insights-call',
    label: 'Avg Days to Insights Call',
    unit: 'days',
    green: 14,
    amber: 21,
    direction: 'lower-better',
  },
  {
    metricId: 'health-story-completion-rate',
    label: 'Health Story Completion',
    unit: 'percentage',
    green: 85,
    amber: 70,
    direction: 'higher-better',
  },
  {
    metricId: 'kit-return-rate',
    label: 'Kit Return Rate',
    unit: 'percentage',
    green: 90,
    amber: 75,
    direction: 'higher-better',
  },
  {
    metricId: 'dashboard-unlock-rate',
    label: 'Dashboard Unlock Rate',
    unit: 'percentage',
    green: 80,
    amber: 65,
    direction: 'higher-better',
  },
  {
    metricId: 'retest-rate',
    label: 'Retest Rate',
    unit: 'percentage',
    green: 70,
    amber: 50,
    direction: 'higher-better',
  },

  // ── Financial SLAs ──────────────────────────────────────────────────
  {
    metricId: 'payment-success-rate',
    label: 'Payment Success Rate',
    unit: 'percentage',
    green: 98,
    amber: 95,
    direction: 'higher-better',
  },
  {
    metricId: 'churn-rate',
    label: 'Churn Rate',
    unit: 'percentage',
    green: 5,
    amber: 8,
    direction: 'lower-better',
  },

  // ── Clinical SLAs ───────────────────────────────────────────────────
  {
    metricId: 'clinician-utilisation',
    label: 'Clinician Utilisation',
    unit: 'percentage',
    green: 80,
    amber: 60,
    direction: 'higher-better',
  },

  // ── Marketing SLAs ──────────────────────────────────────────────────
  {
    metricId: 'lead-conversion-rate',
    label: 'Lead Conversion Rate',
    unit: 'percentage',
    green: 15,
    amber: 10,
    direction: 'higher-better',
  },
];

/**
 * Evaluate a metric value against its SLA threshold.
 * Returns 'green', 'amber', or 'red'.
 */
export function evaluateSla(
  metricId: string,
  value: number
): 'green' | 'amber' | 'red' | null {
  const threshold = slaThresholds.find((t) => t.metricId === metricId);
  if (!threshold) return null;

  if (threshold.direction === 'lower-better') {
    if (value <= threshold.green) return 'green';
    if (value <= threshold.amber) return 'amber';
    return 'red';
  }

  // higher-better
  if (value >= threshold.green) return 'green';
  if (value >= threshold.amber) return 'amber';
  return 'red';
}

/**
 * Get the SLA threshold definition for a given metric.
 */
export function getSlaThreshold(metricId: string): SlaThreshold | undefined {
  return slaThresholds.find((t) => t.metricId === metricId);
}

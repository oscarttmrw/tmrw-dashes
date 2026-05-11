/**
 * Question engine for the TMRW dashboard.
 * Aggregates functional data into Q1-Q5 composite scores per the strategy spec.
 */

import type { Question, MetricValue, Status } from '@/lib/types';
import { computeQuestionStatus } from './status-engine';

/**
 * Metric IDs mapped to each strategic question.
 */
const QUESTION_METRIC_MAP: Record<
  string,
  { primary: string[]; secondary: string[] }
> = {
  Q1: {
    primary: [
      'better-tomorrows-avg',    // Biomarker improvement proxy
    ],
    secondary: [
      'retest-rate',             // Re-engagement signal
      'active-plans',            // Active health plans
    ],
  },
  Q2: {
    primary: [
      'csat-score',              // Customer satisfaction
      'churn-rate',              // Retention
    ],
    secondary: [
      'new-members',             // New member capacity
      'net-member-growth',       // Growth signal
      'dashboard-unlock-rate',   // Journey completion
    ],
  },
  Q3: {
    primary: [
      // Channel partners and corporate partners are manual-entry metrics
      // They will show as grey until manual data is entered
    ],
    secondary: [
      'lead-conversion-rate',    // Proxy for channel effectiveness
      'leads',                   // Pipeline health
    ],
  },
  Q4: {
    primary: [
      'avg-days-to-dashboard',   // Reg -> dashboard time
      'avg-days-to-insights-call', // Insight -> change time
      'clinician-utilisation',   // Members per clinical FTE
    ],
    secondary: [
      'first-reply-time',        // Operational responsiveness
      'resolution-time',         // Delivery speed
      'health-story-completion-rate',
      'kit-return-rate',
    ],
  },
  Q5: {
    primary: [
      'cac',                     // Blended CAC
      'arpu',                    // Revenue per member (proxy for CM/member)
      'mrr',                     // Revenue health
    ],
    secondary: [
      'payment-success-rate',    // Payment reliability
      'total-revenue',           // Top-line
      'ltv',                     // Lifetime value
    ],
  },
};

const QUESTION_DEFINITIONS: {
  id: string;
  number: number;
  text: string;
  framing: string;
  functionalAreas: string[];
  whatHasToBeTrueItems: string[];
}[] = [
  {
    id: 'Q1',
    number: 1,
    text: 'Does TMRW demonstrably improve health outcomes?',
    framing: 'Prove it works',
    functionalAreas: ['clinical', 'members'],
    whatHasToBeTrueItems: [
      'Biomarker data shows measurable improvement',
      'Biological age delta trends positive',
      'Members complete retests to validate progress',
      'Clinical protocols drive measurable change',
    ],
  },
  {
    id: 'Q2',
    number: 2,
    text: 'Do customers love us enough to stay and refer?',
    framing: 'Customer love',
    functionalAreas: ['support', 'members'],
    whatHasToBeTrueItems: [
      'CSAT consistently above 90%',
      'Churn rate below 5% monthly',
      'NPS supports organic referral growth',
      'New member pipeline remains healthy',
    ],
  },
  {
    id: 'Q3',
    number: 3,
    text: 'Are we building a defensible market position?',
    framing: 'Defensible moat',
    functionalAreas: ['marketing', 'strategy'],
    whatHasToBeTrueItems: [
      'Channel partnerships generate qualified leads',
      'Corporate partnerships provide recurring revenue',
      'Brand differentiation is clear and measurable',
      'Data moat deepens with each member',
    ],
  },
  {
    id: 'Q4',
    number: 4,
    text: 'Can we deliver reliably at increasing scale?',
    framing: 'Deliver reliably',
    functionalAreas: ['clinical', 'support', 'members'],
    whatHasToBeTrueItems: [
      'Registration to dashboard time under 30 days',
      'Insight-to-change time under 14 days',
      'Clinical FTE ratio supports growth',
      'Support response times within SLA',
    ],
  },
  {
    id: 'Q5',
    number: 5,
    text: 'Do the unit economics support sustainable growth?',
    framing: 'Economics right',
    functionalAreas: ['financial', 'marketing'],
    whatHasToBeTrueItems: [
      'Blended CAC recoverable within 6 months',
      'Contribution margin per member is positive',
      'MRR growth rate supports runway',
      'Payment success rate above 98%',
    ],
  },
];

/**
 * Compute composite question scores from available metric values.
 *
 * @param metricValues - All available MetricValue records
 * @returns Array of Question objects with computed statuses
 */
export function computeQuestionScores(metricValues: MetricValue[]): Question[] {
  const metricMap = new Map(metricValues.map((m) => [m.metricId, m]));

  return QUESTION_DEFINITIONS.map((def) => {
    const mapping = QUESTION_METRIC_MAP[def.id];
    if (!mapping) {
      return {
        ...def,
        primaryMetrics: [],
        secondaryMetrics: [],
        status: 'grey' as Status,
      };
    }

    const primaryMetrics = mapping.primary
      .map((id) => metricMap.get(id))
      .filter((m): m is MetricValue => m !== undefined);

    const secondaryMetrics = mapping.secondary
      .map((id) => metricMap.get(id))
      .filter((m): m is MetricValue => m !== undefined);

    const status = computeQuestionStatus(primaryMetrics, secondaryMetrics);

    return {
      ...def,
      primaryMetrics,
      secondaryMetrics,
      status,
    };
  });
}

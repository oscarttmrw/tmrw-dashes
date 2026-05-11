import type { Alert } from '@/lib/types/alerts';

export const mockAlerts: Alert[] = [
  {
    id: 'ALERT-001',
    type: 'payment-spike',
    severity: 'high',
    title: 'Payment failure rate spike',
    detail:
      'Declined transactions increased to 4.2% over the past 48 hours, above the 3% threshold. 6 members affected, primarily Visa cards in AU.',
    metricId: 'payment-failure-rate',
    functionalArea: 'financial',
    createdAt: '2026-03-05T09:15:00.000Z',
    acknowledged: false,
  },
  {
    id: 'ALERT-002',
    type: 'stalled-member',
    severity: 'medium',
    title: '12 members stalled at kit-dispatched',
    detail:
      'Twelve members have been in the kit-dispatched stage for more than 14 days without progressing. Consider sending a follow-up or checking courier tracking.',
    metricId: null,
    functionalArea: 'members',
    createdAt: '2026-03-04T14:30:00.000Z',
    acknowledged: false,
  },
  {
    id: 'ALERT-003',
    type: 'support-backlog',
    severity: 'medium',
    title: 'Support ticket backlog growing',
    detail:
      'Open ticket count reached 30, up 25% from last week. Average first reply time has increased to 3.1 hours. Consider reallocating support capacity.',
    metricId: 'open-tickets',
    functionalArea: 'support',
    createdAt: '2026-03-04T11:00:00.000Z',
    acknowledged: true,
  },
  {
    id: 'ALERT-004',
    type: 'clinician-overload',
    severity: 'low',
    title: 'Katie Kell approaching case capacity',
    detail:
      'Katie Kell currently has 38 active cases (capacity guideline: 40). Consider redistributing new cases to clinicians with lower loads.',
    metricId: null,
    functionalArea: 'clinical',
    createdAt: '2026-03-03T16:45:00.000Z',
    acknowledged: true,
  },
  {
    id: 'ALERT-005',
    type: 'zero-movement',
    severity: 'low',
    title: 'Channel partnerships metric unchanged',
    detail:
      'Channel partners count has remained at 0 for 8 weeks. This is a key growth metric for Q2 planning. Flag for leadership review.',
    metricId: 'channel-partners',
    functionalArea: 'strategy',
    createdAt: '2026-03-02T08:20:00.000Z',
    acknowledged: false,
  },
];

import type { Status } from '@/lib/types/metrics';

export interface ScorecardMetric {
  id: string;
  label: string;
  owner: string;
  target: string;
  weeks: ScorecardWeek[];
}

export interface ScorecardWeek {
  weekEnding: string;
  value: string | number;
  status: Status;
}

export const mockScorecard: ScorecardMetric[] = [
  {
    id: 'sc-active-members',
    label: 'Active Members',
    owner: 'Mark',
    target: '220+',
    weeks: [
      { weekEnding: '2026-02-15', value: 195, status: 'amber' },
      { weekEnding: '2026-02-22', value: 208, status: 'amber' },
      { weekEnding: '2026-03-01', value: 218, status: 'green' },
    ],
  },
  {
    id: 'sc-new-signups',
    label: 'New Signups (weekly)',
    owner: 'Mark',
    target: '20+',
    weeks: [
      { weekEnding: '2026-02-15', value: 18, status: 'amber' },
      { weekEnding: '2026-02-22', value: 22, status: 'green' },
      { weekEnding: '2026-03-01', value: 25, status: 'green' },
    ],
  },
  {
    id: 'sc-monthly-churn',
    label: 'Monthly Churn Rate',
    owner: 'Mark',
    target: '<5%',
    weeks: [
      { weekEnding: '2026-02-15', value: '4.1%', status: 'green' },
      { weekEnding: '2026-02-22', value: '3.9%', status: 'green' },
      { weekEnding: '2026-03-01', value: '3.8%', status: 'green' },
    ],
  },
  {
    id: 'sc-mrr',
    label: 'MRR',
    owner: 'Mark',
    target: '$30K+',
    weeks: [
      { weekEnding: '2026-02-15', value: '$26.4K', status: 'amber' },
      { weekEnding: '2026-02-22', value: '$28.1K', status: 'amber' },
      { weekEnding: '2026-03-01', value: '$29.7K', status: 'amber' },
    ],
  },
  {
    id: 'sc-dashboards-published',
    label: 'Dashboards Published (weekly)',
    owner: 'Isabelle',
    target: '15+',
    weeks: [
      { weekEnding: '2026-02-15', value: 12, status: 'amber' },
      { weekEnding: '2026-02-22', value: 16, status: 'green' },
      { weekEnding: '2026-03-01', value: 14, status: 'amber' },
    ],
  },
  {
    id: 'sc-avg-first-reply',
    label: 'Avg First Reply (hrs)',
    owner: 'Nina',
    target: '<2.5h',
    weeks: [
      { weekEnding: '2026-02-15', value: '2.8h', status: 'amber' },
      { weekEnding: '2026-02-22', value: '2.4h', status: 'green' },
      { weekEnding: '2026-03-01', value: '2.5h', status: 'green' },
    ],
  },
  {
    id: 'sc-csat',
    label: 'CSAT (Good %)',
    owner: 'Nina',
    target: '80%+',
    weeks: [
      { weekEnding: '2026-02-15', value: '79%', status: 'amber' },
      { weekEnding: '2026-02-22', value: '83%', status: 'green' },
      { weekEnding: '2026-03-01', value: '82%', status: 'green' },
    ],
  },
  {
    id: 'sc-gate2a-pass',
    label: 'Gate 2A Pass Rate',
    owner: 'Emma',
    target: '90%+',
    weeks: [
      { weekEnding: '2026-02-15', value: '91%', status: 'green' },
      { weekEnding: '2026-02-22', value: '93%', status: 'green' },
      { weekEnding: '2026-03-01', value: '92%', status: 'green' },
    ],
  },
];

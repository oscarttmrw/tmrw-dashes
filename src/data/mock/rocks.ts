import type { Rock } from '@/lib/types/rocks';

export const mockRocks: Rock[] = [
  {
    id: 'ROCK-001',
    number: 1,
    title: 'Deliver the journey, not just the service',
    description:
      'Transform the member experience from transactional health testing into a guided, personalised wellness journey with clear milestones and automated touchpoints.',
    owner: 'Mark',
    status: 'on-track',
    quarter: 'Q1 2026',
    metrics: [
      {
        label: 'Menopause journey',
        current: 'Live',
        target: 'Live by Mar',
        status: 'green',
      },
      {
        label: 'Avg signup-to-results',
        current: 'TBC',
        target: '<5 wks',
        status: 'grey',
      },
      {
        label: 'Manual touchpoints',
        current: 'TBC',
        target: '-50%',
        status: 'grey',
      },
    ],
  },
  {
    id: 'ROCK-002',
    number: 2,
    title: 'Prove people stay',
    description:
      'Demonstrate strong member retention beyond the initial testing cycle by tracking cohort behaviour, reducing churn, and driving retest engagement.',
    owner: 'Mark',
    status: 'on-track',
    quarter: 'Q1 2026',
    metrics: [
      {
        label: 'Cohort retention post-2nd',
        current: 'TBC',
        target: '75%+',
        status: 'grey',
      },
      {
        label: 'Monthly churn',
        current: '3.8%',
        target: '<5%',
        status: 'green',
      },
      {
        label: 'Retest bookings',
        current: 'TBC',
        target: '25+',
        status: 'grey',
      },
    ],
  },
  {
    id: 'ROCK-003',
    number: 3,
    title: 'Start proving it works',
    description:
      'Build the evidence base that TMRW Health interventions lead to measurable biomarker improvements and positive health outcomes for members.',
    owner: 'Emma',
    status: 'building',
    quarter: 'Q1 2026',
    metrics: [
      {
        label: 'Members with 2+ cycles',
        current: '0',
        target: '10+',
        status: 'red',
      },
      {
        label: 'Biomarker improvement',
        current: 'TBC',
        target: '60%+',
        status: 'grey',
      },
      {
        label: 'Research partnership',
        current: 'TBC',
        target: '1 signed',
        status: 'grey',
      },
    ],
  },
];

export type Status = 'green' | 'amber' | 'red' | 'grey';
export type MetricDirection = 'higher-better' | 'lower-better';
export type DataSource = 'hubspot' | 'stripe' | 'zendesk' | 'manual' | 'derived';

export interface MetricDefinition {
  id: string;
  label: string;
  description: string;
  source: DataSource;
  direction: MetricDirection;
  format: 'number' | 'currency' | 'percentage' | 'days' | 'hours' | 'text';
  target: string | number | null;
  category: string;
}

export interface MetricValue {
  metricId: string;
  current: number | string | null;
  previous: number | string | null;
  target: number | string | null;
  status: Status;
  trend: number | null;
  sparkline: number[];
  period: string;
}

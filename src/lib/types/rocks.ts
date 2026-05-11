import type { Status } from './metrics';

export type RockStatus = 'on-track' | 'off-track' | 'at-risk' | 'complete' | 'building';

export interface RockMetric {
  label: string;
  current: string;
  target: string;
  status: Status;
}

export interface Rock {
  id: string;
  number: number;
  title: string;
  description: string;
  owner: string;
  status: RockStatus;
  metrics: RockMetric[];
  quarter: string;
}

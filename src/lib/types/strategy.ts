import type { MetricValue, Status } from './metrics';

export interface Question {
  id: string;
  number: number;
  text: string;
  framing: string;
  primaryMetrics: MetricValue[];
  secondaryMetrics: MetricValue[];
  functionalAreas: string[];
  status: Status;
  whatHasToBeTrueItems: string[];
}

export interface StrategicBet {
  id: string;
  number: number;
  title: string;
  description: string;
  currentActions: { label: string; done: boolean }[];
  laterItems: string[];
  proofConditions: { label: string; met: boolean }[];
  connectedPillars: string[];
}

export interface PostureChoice {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
  position:
    | 'decided-left'
    | 'leaning-left'
    | 'open'
    | 'leaning-right'
    | 'decided-right';
  notes: string;
}

export interface DestinationRow {
  category: string;
  metric: string;
  now: string;
  jun: string;
  dec: string;
  status: Status;
  whatHasToBeTrue: string;
}

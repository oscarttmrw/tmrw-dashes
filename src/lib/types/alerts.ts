export type AlertSeverity = 'low' | 'medium' | 'high';
export type AlertType =
  | 'status-change'
  | 'metric-recovery'
  | 'stalled-member'
  | 'payment-spike'
  | 'support-backlog'
  | 'clinician-overload'
  | 'retest-overdue'
  | 'zero-movement';

export interface AlertRule {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  condition: string;
  enabled: boolean;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  metricId: string | null;
  functionalArea:
    | 'financial'
    | 'members'
    | 'clinical'
    | 'support'
    | 'marketing'
    | 'strategy';
  createdAt: string;
  acknowledged: boolean;
}

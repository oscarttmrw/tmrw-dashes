export type JourneyStage =
  | 'registered'
  | 'health-story-complete'
  | 'kit-dispatched'
  | 'kit-returned'
  | 'awaiting-results'
  | 'dashboard-unlocked'
  | 'insights-call-complete'
  | 'active-plan'
  | 'retest-due'
  | 'churned'
  | 'inactive';

export type HealthScore = 'healthy' | 'attention' | 'at-risk' | 'unknown';

export interface RiskFlag {
  type:
    | 'churn-risk'
    | 'stalled-journey'
    | 'support-escalation'
    | 'payment-failure'
    | 'overdue-retest';
  severity: 'low' | 'medium' | 'high';
  detail: string;
  detectedAt: string;
}

export interface Member {
  id: string;
  hubspotRecordId: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  sex: 'Female' | 'Male' | 'n/a' | null;
  ageRange: string | null;
  type: 'Customer' | 'Friend-Family' | 'Investor' | 'Employee' | 'Test';
  caseStatus: 'Open' | 'Closed' | 'Inactive';
  createdAt: string;
  primaryClinician: string | null;
  assignedDoctor: string | null;
  dashboardUnlocked: boolean;
  dashboardUnlockedAt: string | null;
  lastTestDate: string | null;
  nextRetestDate: string | null;
  emailSequenceTriggered: string[];
  addOns: string[];
  journeyStage: JourneyStage;
  totalRevenue: number;
  transactionCount: number;
  firstPaymentDate: string | null;
  lastPaymentDate: string | null;
  mrr: number;
  ticketCount: number;
  openTickets: number;
  avgResolutionTime: number | null;
  lastTicketDate: string | null;
  csat: number | null;
  healthScore: HealthScore;
  riskFlags: RiskFlag[];
  daysSinceRegistration: number;
  betterTomorrows: number;
  isVIP: boolean;
}

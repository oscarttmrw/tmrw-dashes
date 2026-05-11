/**
 * Schema for the daily Snowflake export.
 * Snowflake joins all sources, normalises, strips PII, and exports this shape.
 * The dashboard consumes this directly — no client-side processing needed.
 */

export interface SnowflakeExport {
  exportedAt: string                // ISO timestamp of export
  exportVersion: string             // Schema version (e.g., "1.0")

  members: SnowflakeMember[]
  transactions: SnowflakeTransaction[]
  tickets: SnowflakeTicket[]
  clinicians: SnowflakeClinician[]

  meta: {
    memberCount: number
    transactionCount: number
    ticketCount: number
    sourceFreshness: Record<string, string | null>  // source → last sync timestamp
  }
}

export interface SnowflakeMember {
  id: string                        // Canonical member ID (from Oracle/Tableau)
  type: 'Customer' | 'Friend-Family' | 'Investor' | 'Employee' | 'Test'
  caseStatus: 'Open' | 'Closed' | 'Inactive'
  journeyStage: string
  registeredAt: string

  // Clinical (from HubSpot)
  primaryClinician: string | null
  assignedDoctor: string | null
  dashboardUnlocked: boolean
  dashboardUnlockedAt: string | null
  lastTestDate: string | null
  nextRetestDate: string | null

  // Demographics (from HubSpot)
  sex: 'Female' | 'Male' | 'n/a' | null
  ageRange: string | null
  addOns: string[]

  // Financial (from Stripe, joined by email in Snowflake)
  totalRevenue: number
  mrr: number
  transactionCount: number
  firstPaymentDate: string | null
  lastPaymentDate: string | null

  // Support (from Zendesk, joined by email in Snowflake)
  ticketCount: number
  openTickets: number
  avgResolutionMinutes: number | null
  csat: number | null

  // Computed by Snowflake dbt
  healthScore: 'healthy' | 'attention' | 'at-risk' | 'unknown'
  riskFlags: string[]
  daysSinceRegistration: number
  betterTomorrows: number
}

export interface SnowflakeTransaction {
  id: string
  memberId: string | null
  createdAt: string
  amount: number                    // In dollars (not cents)
  currency: string
  type: 'joining-fee' | 'subscription' | 'supplement' | 'other'
  outcome: 'authorized' | 'declined' | 'blocked'
  failureReason: string | null
  cardCountry: string | null
  cardBrand: string | null
}

export interface SnowflakeTicket {
  id: string
  memberId: string | null
  createdAt: string
  solvedAt: string | null
  status: 'Open' | 'Pending' | 'Solved' | 'Closed'
  priority: 'Urgent' | 'High' | 'Normal' | 'Low' | null
  channel: string
  category: string | null
  tags: string[]
  firstReplyMinutes: number | null
  resolutionMinutes: number | null
  csatScore: string | null
  assignee: string | null
}

export interface SnowflakeClinician {
  id: string
  name: string
  role: string
  activeCases: number
  avgCaseDuration: number
  utilisation: number
}

import type { Member, JourneyStage, HealthScore } from '@/lib/types/member';

// Deterministic pseudo-random number generator (mulberry32)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seededRandom(42);

function pick<T>(items: T[], weights: number[]): T {
  const r = rand();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return items[i];
  }
  return items[items.length - 1];
}

function padId(n: number): string {
  return String(n).padStart(3, '0');
}

// Clinician assignment pool
const clinicians = [
  { name: 'Katie Kell', count: 53 },
  { name: 'Alia Chen', count: 51 },
  { name: 'Paula Martinez', count: 51 },
  { name: 'Isabelle Baissac', count: 48 },
  { name: 'Jaclyn Torres', count: 14 },
  { name: 'Marko Petrov', count: 9 },
  { name: 'Sanja Kumar', count: 8 },
  { name: 'Katrina Walsh', count: 1 },
];

// Build clinician assignment list (235 total assigned, rest null)
const clinicianAssignments: (string | null)[] = [];
for (const c of clinicians) {
  for (let i = 0; i < c.count; i++) {
    clinicianAssignments.push(c.name);
  }
}
// Pad to 300 with nulls (65 unassigned)
while (clinicianAssignments.length < 300) {
  clinicianAssignments.push(null);
}

// Shuffle deterministically
for (let i = clinicianAssignments.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [clinicianAssignments[i], clinicianAssignments[j]] = [clinicianAssignments[j], clinicianAssignments[i]];
}

// Registration dates: Sep 2025 to Feb 2026, with acceleration
// Monthly distribution: Sep: 25, Oct: 30, Nov: 40, Dec: 45, Jan: 70, Feb: 90
const monthlyDist = [
  { year: 2025, month: 8, count: 25 },  // Sep (0-indexed month)
  { year: 2025, month: 9, count: 30 },  // Oct
  { year: 2025, month: 10, count: 40 }, // Nov
  { year: 2025, month: 11, count: 45 }, // Dec
  { year: 2026, month: 0, count: 70 },  // Jan
  { year: 2026, month: 1, count: 90 },  // Feb
];

const registrationDates: string[] = [];
for (const m of monthlyDist) {
  const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
  for (let i = 0; i < m.count; i++) {
    const day = 1 + Math.floor((i / m.count) * daysInMonth);
    const hour = 8 + (i % 12);
    const minute = (i * 7) % 60;
    const d = new Date(m.year, m.month, day, hour, minute, 0);
    registrationDates.push(d.toISOString());
  }
}

// Type distribution: ~70 Customer, ~120 Friend-Family, ~60 Investor, ~40 Employee, ~10 Test
const typePool: Member['type'][] = [];
for (let i = 0; i < 70; i++) typePool.push('Customer');
for (let i = 0; i < 120; i++) typePool.push('Friend-Family');
for (let i = 0; i < 60; i++) typePool.push('Investor');
for (let i = 0; i < 40; i++) typePool.push('Employee');
for (let i = 0; i < 10; i++) typePool.push('Test');

// Shuffle types deterministically
for (let i = typePool.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [typePool[i], typePool[j]] = [typePool[j], typePool[i]];
}

// Journey stages for funnel distribution
const journeyStages: JourneyStage[] = [
  'registered',
  'health-story-complete',
  'kit-dispatched',
  'kit-returned',
  'awaiting-results',
  'dashboard-unlocked',
  'insights-call-complete',
  'active-plan',
  'retest-due',
  'churned',
  'inactive',
];
const journeyWeights = [0.12, 0.10, 0.08, 0.07, 0.08, 0.15, 0.12, 0.13, 0.05, 0.06, 0.04];

// Add-on options
const addOnOptions = ['Supplement Pack', 'DNA Test', 'Gut Microbiome', 'Food Sensitivity', 'Hormone Panel'];

// Email sequences
const emailSequences = ['welcome', 'onboarding', 'kit-reminder', 'results-ready', 'retest-reminder', 'winback'];

const tags = ['billing', 'kit-issue', 'results-query', 'supplement-question', 'scheduling', 'account-change', 'clinical-question', 'feedback'];

function generateMember(index: number): Member {
  const num = index + 1;
  const id = `MBR-${padId(num)}`;
  const displayName = `Member #${padId(num)}`;
  const memberType = typePool[index];
  const createdAt = registrationDates[index];
  const createdDate = new Date(createdAt);

  // Reference date for calculating days since registration
  const refDate = new Date('2026-03-01T00:00:00.000Z');
  const daysSinceRegistration = Math.floor((refDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  // Sex distribution: ~50% Female, ~48% Male, ~2% n/a
  const sex = pick<Member['sex']>(['Female', 'Male', 'n/a'], [0.50, 0.48, 0.02]);

  // Age ranges
  const ageRange = pick(
    ['25-34', '35-44', '45-54', '55-64', '65+'],
    [0.15, 0.30, 0.30, 0.18, 0.07]
  );

  // Case status: ~65% Open, ~20% Closed, ~15% Inactive
  const caseStatus = pick<Member['caseStatus']>(['Open', 'Closed', 'Inactive'], [0.65, 0.20, 0.15]);

  // Journey stage
  const journeyStage = pick(journeyStages, journeyWeights);

  // Clinician assignment
  const primaryClinician = clinicianAssignments[index];

  // Dashboard unlock: ~35% for Customers, lower for others
  const unlockRate = memberType === 'Customer' ? 0.35 : memberType === 'Employee' ? 0.25 : 0.10;
  const dashboardUnlocked = rand() < unlockRate;

  const dashboardUnlockedAt = dashboardUnlocked
    ? new Date(createdDate.getTime() + (14 + Math.floor(rand() * 21)) * 86400000).toISOString()
    : null;

  // Add-ons: ~15% have them
  const addOns: string[] = [];
  if (rand() < 0.15) {
    const numAddOns = 1 + Math.floor(rand() * 2);
    for (let a = 0; a < numAddOns; a++) {
      const addon = addOnOptions[Math.floor(rand() * addOnOptions.length)];
      if (!addOns.includes(addon)) addOns.push(addon);
    }
  }

  // Email sequences triggered
  const triggered: string[] = [];
  const seqCount = 1 + Math.floor(rand() * 3);
  for (let s = 0; s < seqCount; s++) {
    const seq = emailSequences[Math.floor(rand() * emailSequences.length)];
    if (!triggered.includes(seq)) triggered.push(seq);
  }

  // Test dates
  const hasTest = ['dashboard-unlocked', 'insights-call-complete', 'active-plan', 'retest-due'].includes(journeyStage);
  const lastTestDate = hasTest
    ? new Date(createdDate.getTime() + (21 + Math.floor(rand() * 30)) * 86400000).toISOString()
    : null;
  const nextRetestDate = journeyStage === 'retest-due'
    ? new Date(new Date(lastTestDate!).getTime() + 90 * 86400000).toISOString()
    : null;

  // Revenue and transactions
  const hasPaid = memberType === 'Customer' || (memberType === 'Friend-Family' && rand() < 0.3);
  const transactionCount = hasPaid ? 1 + Math.floor(rand() * 6) : 0;
  const totalRevenue = hasPaid ? 349 + transactionCount * (99 + Math.floor(rand() * 100)) : 0;
  const mrr = hasPaid ? pick([99, 174, 249], [0.50, 0.30, 0.20]) : 0;
  const firstPaymentDate = hasPaid ? createdAt : null;
  const lastPaymentDate = hasPaid
    ? new Date(createdDate.getTime() + Math.floor(rand() * daysSinceRegistration) * 86400000).toISOString()
    : null;

  // Support tickets
  const ticketCount = Math.floor(rand() * 4);
  const openTickets = ticketCount > 0 ? Math.floor(rand() * 2) : 0;
  const avgResolutionTime = ticketCount > 0 ? 600 + Math.floor(rand() * 1200) : null;
  const lastTicketDate = ticketCount > 0
    ? new Date(createdDate.getTime() + Math.floor(rand() * daysSinceRegistration) * 86400000).toISOString()
    : null;
  const csat = ticketCount > 0 ? (rand() < 0.7 ? 4 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 2)) : null;

  // Health score
  const healthScore: HealthScore = caseStatus === 'Inactive'
    ? 'at-risk'
    : pick<HealthScore>(['healthy', 'attention', 'at-risk', 'unknown'], [0.55, 0.25, 0.10, 0.10]);

  // Risk flags
  const riskFlags: Member['riskFlags'] = [];
  if (healthScore === 'at-risk') {
    riskFlags.push({
      type: pick(['churn-risk', 'stalled-journey', 'payment-failure'] as const, [0.5, 0.3, 0.2]),
      severity: 'high',
      detail: 'Automated risk detection triggered',
      detectedAt: new Date(refDate.getTime() - Math.floor(rand() * 14) * 86400000).toISOString(),
    });
  } else if (healthScore === 'attention') {
    if (rand() < 0.4) {
      riskFlags.push({
        type: 'stalled-journey',
        severity: 'medium',
        detail: 'No progress in journey for 14+ days',
        detectedAt: new Date(refDate.getTime() - Math.floor(rand() * 21) * 86400000).toISOString(),
      });
    }
  }

  // Better tomorrows (engagement score 0-100)
  const betterTomorrows = healthScore === 'healthy'
    ? 60 + Math.floor(rand() * 40)
    : healthScore === 'attention'
      ? 30 + Math.floor(rand() * 40)
      : Math.floor(rand() * 40);

  // Assigned doctor (only for those past dashboard-unlocked)
  const advancedStages: JourneyStage[] = ['dashboard-unlocked', 'insights-call-complete', 'active-plan', 'retest-due'];
  const assignedDoctor = advancedStages.includes(journeyStage) && rand() < 0.6
    ? pick(['Dr. Sarah Lin', 'Dr. James Park', 'Dr. Priya Nair'], [0.4, 0.35, 0.25])
    : null;

  return {
    id,
    hubspotRecordId: `HS-${100000 + num}`,
    firstName: 'Member',
    lastName: `#${padId(num)}`,
    displayName,
    email: `member${padId(num)}@example.com`,
    sex,
    ageRange,
    type: memberType,
    caseStatus,
    createdAt,
    primaryClinician,
    assignedDoctor,
    dashboardUnlocked,
    dashboardUnlockedAt,
    lastTestDate,
    nextRetestDate,
    emailSequenceTriggered: triggered,
    addOns,
    journeyStage,
    totalRevenue,
    transactionCount,
    firstPaymentDate,
    lastPaymentDate,
    mrr,
    ticketCount,
    openTickets,
    avgResolutionTime,
    lastTicketDate,
    csat,
    healthScore,
    riskFlags,
    daysSinceRegistration,
    betterTomorrows,
    isVIP: false,
  };
}

export const mockMembers: Member[] = Array.from({ length: 300 }, (_, i) => generateMember(i));

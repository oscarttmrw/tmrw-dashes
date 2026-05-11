import type { Ticket } from '@/lib/types/ticket';

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

const rand = seededRandom(777);

function pick<T>(items: T[], weights: number[]): T {
  const r = rand();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return items[i];
  }
  return items[items.length - 1];
}

// Tags pool
const allTags = [
  'billing',
  'kit-issue',
  'results-query',
  'supplement-question',
  'scheduling',
  'account-change',
  'clinical-question',
  'feedback',
];

// Assignee distribution: Nina 40%, Tom 30%, Sarah 20%, Alex 10%
const assignees = [
  { name: 'Nina Gibbias', weight: 0.40 },
  { name: 'Tom Watts', weight: 0.30 },
  { name: 'Sarah Chen', weight: 0.20 },
  { name: 'Alex Park', weight: 0.10 },
];

// Monthly ticket distribution (Sep 2025 - Feb 2026): 20, 25, 30, 35, 40, 50
const monthlyTicketDist = [
  { year: 2025, month: 8, count: 20 },
  { year: 2025, month: 9, count: 25 },
  { year: 2025, month: 10, count: 30 },
  { year: 2025, month: 11, count: 35 },
  { year: 2026, month: 0, count: 40 },
  { year: 2026, month: 1, count: 50 },
];

const ticketDates: string[] = [];
for (const m of monthlyTicketDist) {
  const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
  for (let i = 0; i < m.count; i++) {
    const day = 1 + Math.floor((i / m.count) * daysInMonth);
    const hour = 8 + (i % 10);
    const minute = (i * 13) % 60;
    ticketDates.push(new Date(m.year, m.month, day, hour, minute, 0).toISOString());
  }
}

function generateTicket(index: number): Ticket {
  const ticketId = String(1001 + index);
  const createdAt = ticketDates[index];
  const createdDate = new Date(createdAt);

  // Channel: 60% email, 25% web, 10% chat, 5% phone
  const channel = pick(
    ['email', 'web', 'chat', 'phone'],
    [0.60, 0.25, 0.10, 0.05]
  );

  // Priority: 5% urgent, 15% high, 50% normal, 30% low
  const priority = pick<Ticket['priority']>(
    ['Urgent', 'High', 'Normal', 'Low'],
    [0.05, 0.15, 0.50, 0.30]
  );

  // Status: 70% solved, 15% open, 10% pending, 5% closed
  const status = pick<Ticket['status']>(
    ['Solved', 'Open', 'Pending', 'Closed'],
    [0.70, 0.15, 0.10, 0.05]
  );

  // Type: 40% Question, 25% Incident, 20% Problem, 15% Task
  const ticketType = pick<Ticket['ticketType']>(
    ['Question', 'Incident', 'Problem', 'Task'],
    [0.40, 0.25, 0.20, 0.15]
  );

  // Assignee
  const assignee = pick(
    assignees.map((a) => a.name),
    assignees.map((a) => a.weight)
  );

  // Tags: 1-3 tags per ticket
  const tagCount = 1 + Math.floor(rand() * 3);
  const tags: string[] = [];
  for (let t = 0; t < tagCount; t++) {
    const tag = allTags[Math.floor(rand() * allTags.length)];
    if (!tags.includes(tag)) tags.push(tag);
  }

  // CSAT: ~60% Not Offered, ~15% Offered, ~20% Good, ~5% Bad
  const satisfaction = pick<Ticket['satisfaction']>(
    ['Not Offered', 'Offered', 'Good', 'Bad'],
    [0.60, 0.15, 0.20, 0.05]
  );

  // First reply time: avg ~150 min business hours, range 15-600
  const firstReplyMinutes =
    status === 'Open' && rand() < 0.3
      ? null
      : 15 + Math.floor(rand() * 300);

  // Resolution times (only for solved/closed)
  const isSolved = status === 'Solved' || status === 'Closed';
  const firstResolutionMinutes = isSolved
    ? 120 + Math.floor(rand() * 1920) // 2h to 34h
    : null;
  const fullResolutionMinutes = isSolved
    ? (firstResolutionMinutes ?? 0) + Math.floor(rand() * 360) // add up to 6h for reopens
    : null;

  // Requester wait time
  const requesterWaitMinutes = isSolved
    ? 30 + Math.floor(rand() * 600)
    : status === 'Open'
      ? 10 + Math.floor(rand() * 200)
      : 60 + Math.floor(rand() * 480);

  // Solved/updated dates
  const daysToResolve = isSolved ? 1 + Math.floor(rand() * 5) : Math.floor(rand() * 10);
  const updatedAt = new Date(
    createdDate.getTime() + daysToResolve * 86400000 + Math.floor(rand() * 43200000)
  ).toISOString();
  const solvedAt = isSolved ? updatedAt : null;

  // Reopens: 3% reopen rate
  const reopens = rand() < 0.03 ? 1 : 0;

  // Replies: 1-8
  const replies = 1 + Math.floor(rand() * 8);

  // Stations
  const assigneeStations = 1 + Math.floor(rand() * 3);
  const groupStations = 1 + Math.floor(rand() * 2);

  // Link ~60% of tickets to members
  const memberId =
    rand() < 0.60
      ? `MBR-${String(1 + Math.floor(rand() * 300)).padStart(3, '0')}`
      : null;

  return {
    id: ticketId,
    memberId,
    status,
    priority,
    channel,
    ticketType,
    tags,
    createdAt,
    updatedAt,
    solvedAt,
    assignee,
    group: 'Support',
    firstReplyMinutes,
    firstResolutionMinutes,
    fullResolutionMinutes,
    requesterWaitMinutes,
    satisfaction,
    reopens,
    replies,
    assigneeStations,
    groupStations,
  };
}

export const mockTickets: Ticket[] = Array.from({ length: 200 }, (_, i) =>
  generateTicket(i)
);

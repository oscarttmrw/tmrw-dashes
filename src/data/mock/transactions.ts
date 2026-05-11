import type { Transaction } from '@/lib/types/transaction';

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

const rand = seededRandom(123);

function pick<T>(items: T[], weights: number[]): T {
  const r = rand();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return items[i];
  }
  return items[items.length - 1];
}

// Alphanumeric chars for charge IDs
const alphaNum = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function generateChargeId(index: number): string {
  let id = 'ch_';
  // Use deterministic sequence based on index
  let seed = index * 31 + 7;
  for (let i = 0; i < 24; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    id += alphaNum[seed % alphaNum.length];
  }
  return id;
}

// Transaction type distribution: ~240 foundations, ~100 advanced-testing, ~80 supplements, ~40 medication, ~40 treatment-journey
const typePool: Transaction['type'][] = [];
for (let i = 0; i < 240; i++) typePool.push('foundations-membership');
for (let i = 0; i < 100; i++) typePool.push('advanced-testing');
for (let i = 0; i < 80; i++) typePool.push('supplements');
for (let i = 0; i < 40; i++) typePool.push('medication');
for (let i = 0; i < 40; i++) typePool.push('treatment-journey');

// Shuffle deterministically
for (let i = typePool.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [typePool[i], typePool[j]] = [typePool[j], typePool[i]];
}

// Monthly transaction distribution (growing): Sep: 45, Oct: 55, Nov: 65, Dec: 75, Jan: 110, Feb: 150
const monthlyTxDist = [
  { year: 2025, month: 8, count: 45 },
  { year: 2025, month: 9, count: 55 },
  { year: 2025, month: 10, count: 65 },
  { year: 2025, month: 11, count: 75 },
  { year: 2026, month: 0, count: 110 },
  { year: 2026, month: 1, count: 150 },
];

const txDates: string[] = [];
for (const m of monthlyTxDist) {
  const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
  for (let i = 0; i < m.count; i++) {
    const day = 1 + Math.floor((i / m.count) * daysInMonth);
    const hour = 6 + (i % 16);
    const minute = (i * 11) % 60;
    txDates.push(new Date(m.year, m.month, day, hour, minute, 0).toISOString());
  }
}

function getAmount(type: Transaction['type']): number {
  switch (type) {
    case 'foundations-membership':
      return pick([99, 174, 249], [0.50, 0.30, 0.20]);
    case 'advanced-testing':
      return 349;
    case 'supplements':
      return 20 + Math.floor(rand() * 51); // $20-$70
    case 'medication':
      return pick([49, 79, 129], [0.4, 0.4, 0.2]);
    case 'treatment-journey':
      return pick([199, 349, 499], [0.50, 0.30, 0.20]);
    default:
      return 99;
  }
}

function generateTransaction(index: number): Transaction {
  const type = typePool[index];
  const amount = getAmount(type);

  // Outcome: 97% authorized, 2% declined, 1% blocked
  const outcome = pick<Transaction['outcome']>(
    ['authorized', 'declined', 'blocked'],
    [0.97, 0.02, 0.01]
  );

  const failureReason = outcome === 'declined'
    ? pick(['insufficient_funds', 'card_expired', 'do_not_honor'], [0.5, 0.3, 0.2])
    : outcome === 'blocked'
      ? 'suspected_fraud'
      : null;

  // Card country: 90% AU, 4% NZ, 3% SG, 2% US, 1% CA
  const cardCountry = pick(
    ['AU', 'NZ', 'SG', 'US', 'CA'],
    [0.90, 0.04, 0.03, 0.02, 0.01]
  );

  // Card brand: 50% Visa, 35% Mastercard, 15% Amex
  const cardBrand = pick(
    ['Visa', 'Mastercard', 'Amex'],
    [0.50, 0.35, 0.15]
  );

  // Link ~80% of transactions to members
  const memberId = rand() < 0.80
    ? `MBR-${String(1 + Math.floor(rand() * 300)).padStart(3, '0')}`
    : null;

  return {
    chargeId: generateChargeId(index),
    memberId,
    createdAt: txDates[index],
    amount,
    currency: 'AUD',
    type,
    outcome,
    failureReason,
    cardCountry,
    cardBrand,
    isRecurring: type === 'foundations-membership',
  };
}

export const mockTransactions: Transaction[] = Array.from({ length: 500 }, (_, i) => generateTransaction(i));

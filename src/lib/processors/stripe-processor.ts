import type { Transaction } from '@/lib/types';

const REQUIRED_COLUMNS = [
  'charge_id',
  'created',
  'currency',
  'amount',
  'outcome_type',
  'card_country',
  'interaction_type',
] as const;

function parseOutcome(raw: string): Transaction['outcome'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'authorized' || normalized === 'succeeded') return 'authorized';
  if (normalized === 'declined' || normalized === 'issuer_declined') return 'declined';
  if (normalized === 'blocked') return 'blocked';
  return 'authorized';
}

function parseStripeDate(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null;

  const trimmed = value.trim();

  // Check for truncated time-only format (MM:SS.0) — indicates broken export
  if (/^\d{1,2}:\d{2}\.\d$/.test(trimmed)) {
    return null;
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d.toISOString();

  return null;
}

function classifyTransaction(
  amountCents: number,
  interactionType: string,
  isRecurring: boolean
): Transaction['type'] {
  // $349 (34900 cents) is the advanced testing fee
  if (amountCents === 34900 || amountCents === 34800) return 'advanced-testing';

  // Large one-time payments are likely advanced testing
  if (amountCents >= 15000 && !isRecurring) return 'advanced-testing';

  // Recurring payments are foundations memberships
  if (isRecurring) return 'foundations-membership';

  // Customer-initiated saved card could be supplements or medication
  if (interactionType === 'customer_initiated_saved_card' && amountCents < 15000) return 'supplements';

  // Fallback based on dollar amount
  const amountDollars = amountCents / 100;
  if (amountDollars >= 15 && amountDollars <= 98) return 'supplements';

  return 'foundations-membership';
}

/** Whether any transaction dates were unparseable (broken export) */
export let stripeHasBrokenDates = false;

export function processStripeCSV(data: Record<string, string>[]): Transaction[] {
  // Validate required columns
  if (data.length > 0) {
    const cols = Object.keys(data[0]);
    const missing = REQUIRED_COLUMNS.filter((c) => !cols.includes(c));
    if (missing.length > 0) {
      console.warn(`Stripe CSV missing columns: ${missing.join(', ')}`);
    }
  }

  stripeHasBrokenDates = false;
  const now = new Date().toISOString();

  return data
    .filter((row) => row['charge_id']?.trim())
    .map((row): Transaction => {
      const amountCents = parseInt(row['amount'] ?? '0', 10);
      const amountDollars = amountCents / 100;
      const interactionType = row['interaction_type']?.trim().toLowerCase() ?? '';
      const isRecurring =
        interactionType === 'recurring' ||
        interactionType === 'subscription' ||
        interactionType === 'off_session';

      const parsedDate = parseStripeDate(row['created']);
      if (!parsedDate) stripeHasBrokenDates = true;

      return {
        chargeId: row['charge_id'].trim(),
        memberId: null, // linked later by entity-linker
        createdAt: parsedDate ?? now,
        amount: amountDollars,
        currency: (row['currency']?.trim() ?? 'aud').toLowerCase(),
        type: classifyTransaction(amountCents, interactionType, isRecurring),
        outcome: parseOutcome(row['outcome_type']),
        failureReason:
          row['outcome_type']?.trim().toLowerCase() !== 'authorized' &&
          row['outcome_type']?.trim().toLowerCase() !== 'succeeded'
            ? (row['failure_message']?.trim() || row['outcome_type']?.trim() || null)
            : null,
        cardCountry: row['card_country']?.trim() ?? '',
        cardBrand: row['card_brand']?.trim() ?? '',
        isRecurring,
      };
    });
}

/**
 * Stripe transaction classification rules for the TMRW dashboard.
 * Maps raw Stripe charge data into typed revenue categories.
 */

import type { Transaction } from '@/lib/types/transaction';

export type RevenueCategory = Transaction['type'];

export interface ClassificationRule {
  /** Human-readable name for the rule. */
  name: string;
  /** The revenue category this rule maps to. */
  category: RevenueCategory;
  /** Priority: lower number = matched first. */
  priority: number;
  /** Matcher function: returns true if the charge matches this rule. */
  match: (charge: RawStripeCharge) => boolean;
}

export interface RawStripeCharge {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  metadata_product_type: string | null;
  subscription_id: string | null;
  invoice_id: string | null;
  is_recurring: boolean | null;
  customer_email: string | null;
}

/**
 * Classification rules ordered by priority.
 * The first matching rule wins.
 */
export const revenueRules: ClassificationRule[] = [
  {
    name: 'Advanced Testing (metadata)',
    category: 'advanced-testing',
    priority: 1,
    match: (c) =>
      c.metadata_product_type?.toLowerCase() === 'advanced-testing' ||
      c.metadata_product_type?.toLowerCase() === 'advanced_testing' ||
      c.metadata_product_type?.toLowerCase() === 'joining-fee' ||
      c.metadata_product_type?.toLowerCase() === 'joining_fee',
  },
  {
    name: 'Advanced Testing (description)',
    category: 'advanced-testing',
    priority: 2,
    match: (c) => {
      const desc = (c.description ?? '').toLowerCase();
      return (
        desc.includes('advanced test') ||
        desc.includes('joining fee') ||
        desc.includes('join fee') ||
        desc.includes('registration fee') ||
        desc.includes('signup fee') ||
        desc.includes('initial test')
      );
    },
  },
  {
    name: 'Supplements (metadata)',
    category: 'supplements',
    priority: 3,
    match: (c) =>
      c.metadata_product_type?.toLowerCase() === 'supplement' ||
      c.metadata_product_type?.toLowerCase() === 'supplements',
  },
  {
    name: 'Supplements (description)',
    category: 'supplements',
    priority: 4,
    match: (c) => {
      const desc = (c.description ?? '').toLowerCase();
      return desc.includes('supplement') || desc.includes('nutraceutical');
    },
  },
  {
    name: 'Medication (metadata)',
    category: 'medication',
    priority: 5,
    match: (c) =>
      c.metadata_product_type?.toLowerCase() === 'medication' ||
      c.metadata_product_type?.toLowerCase() === 'add-on' ||
      c.metadata_product_type?.toLowerCase() === 'addon',
  },
  {
    name: 'Medication (description)',
    category: 'medication',
    priority: 6,
    match: (c) => {
      const desc = (c.description ?? '').toLowerCase();
      return (
        desc.includes('medication') ||
        desc.includes('prescription') ||
        desc.includes('add-on') ||
        desc.includes('addon')
      );
    },
  },
  {
    name: 'Treatment Journey (metadata)',
    category: 'treatment-journey',
    priority: 7,
    match: (c) =>
      c.metadata_product_type?.toLowerCase() === 'treatment-journey' ||
      c.metadata_product_type?.toLowerCase() === 'treatment_journey',
  },
  {
    name: 'Treatment Journey (description)',
    category: 'treatment-journey',
    priority: 8,
    match: (c) => {
      const desc = (c.description ?? '').toLowerCase();
      return (
        desc.includes('treatment journey') ||
        desc.includes('treatment plan') ||
        desc.includes('clinical program')
      );
    },
  },
  {
    name: 'Foundations Membership (has subscription ID)',
    category: 'foundations-membership',
    priority: 9,
    match: (c) => !!c.subscription_id,
  },
  {
    name: 'Foundations Membership (recurring flag)',
    category: 'foundations-membership',
    priority: 10,
    match: (c) => c.is_recurring === true,
  },
  {
    name: 'Foundations Membership (metadata)',
    category: 'foundations-membership',
    priority: 11,
    match: (c) =>
      c.metadata_product_type?.toLowerCase() === 'subscription' ||
      c.metadata_product_type?.toLowerCase() === 'membership' ||
      c.metadata_product_type?.toLowerCase() === 'foundations',
  },
  {
    name: 'Foundations Membership (description)',
    category: 'foundations-membership',
    priority: 12,
    match: (c) => {
      const desc = (c.description ?? '').toLowerCase();
      return (
        desc.includes('subscription') ||
        desc.includes('membership') ||
        desc.includes('foundations') ||
        desc.includes('monthly plan') ||
        desc.includes('recurring')
      );
    },
  },
  {
    name: 'Fallback (foundations membership)',
    category: 'foundations-membership',
    priority: 99,
    match: () => true,
  },
];

/**
 * Classify a raw Stripe charge into a revenue category.
 * Returns the category from the first matching rule.
 */
export function classifyCharge(charge: RawStripeCharge): RevenueCategory {
  const sorted = [...revenueRules].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (rule.match(charge)) {
      return rule.category;
    }
  }
  return 'foundations-membership';
}

/**
 * Map a Stripe charge status to a transaction outcome.
 */
export function mapOutcome(
  status: string
): Transaction['outcome'] {
  switch (status.toLowerCase()) {
    case 'succeeded':
    case 'paid':
      return 'authorized';
    case 'failed':
    case 'declined':
      return 'declined';
    case 'blocked':
      return 'blocked';
    default:
      return 'declined';
  }
}

/**
 * Convert a raw Stripe CSV row into a typed Transaction.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toTransaction(row: Record<string, any>): Transaction {
  const charge: RawStripeCharge = {
    id: row.id ?? '',
    description: row.description ?? null,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? 'aud',
    metadata_product_type: row.metadata_product_type ?? null,
    subscription_id: row.subscription_id ?? null,
    invoice_id: row.invoice_id ?? null,
    is_recurring: row.is_recurring === true || row.is_recurring === 'true',
    customer_email: row.customer_email ?? null,
  };

  return {
    chargeId: charge.id,
    memberId: row.metadata_member_id ?? null,
    createdAt: row.created ?? '',
    amount: charge.amount / 100, // Stripe amounts are in cents
    currency: charge.currency.toUpperCase(),
    type: classifyCharge(charge),
    outcome: mapOutcome(row.status ?? ''),
    failureReason: row.failure_message ?? null,
    cardCountry: row.card_country ?? '',
    cardBrand: row.card_brand ?? '',
    isRecurring: charge.is_recurring ?? false,
  };
}

import type { Transaction, TransactionStatus } from '@/lib/types';

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function parseNum(value: unknown): number {
  const s = toStr(value).trim();
  if (s === '' || s === '-') return 0;
  return parseFloat(s.replace(/[,$%]/g, '')) || 0;
}

function parseBool(value: unknown): boolean {
  const s = toStr(value).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'y';
}

function parseStripeDate(value: unknown): string | null {
  const s = toStr(value).trim();
  if (!s) return null;
  if (/^\d{1,2}:\d{2}\.\d$/.test(s)) return null; // truncated time-only — broken export
  const d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d.toISOString();
  return null;
}

function lcRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]));
}

function canonicalStatus(raw: unknown): TransactionStatus {
  const s = toStr(raw).trim().toLowerCase();
  if (s === 'paid' || s === 'succeeded') return 'succeeded';
  if (s === 'refunded') return 'refunded';
  if (s === 'failed') return 'failed';
  if (s === 'disputed') return 'disputed';
  if (s === 'pending') return 'pending';
  return 'pending';
}

function statusToOutcome(status: TransactionStatus): Transaction['outcome'] {
  switch (status) {
    case 'succeeded':
    case 'refunded':
    case 'pending':
      return 'authorized';
    case 'failed':
      return 'declined';
    case 'disputed':
      return 'blocked';
  }
}

function classifyTransaction(amountCents: number, isRecurring: boolean): Transaction['type'] {
  if (amountCents === 34900 || amountCents === 34800) return 'advanced-testing';
  if (amountCents >= 15000 && !isRecurring) return 'advanced-testing';
  if (isRecurring) return 'foundations-membership';
  const amountDollars = amountCents / 100;
  if (amountDollars >= 15 && amountDollars <= 98) return 'supplements';
  return 'foundations-membership';
}

/** Whether any transaction dates were unparseable (broken export) */
export let stripeHasBrokenDates = false;

export function processStripeCSV(data: Record<string, unknown>[]): Transaction[] {
  if (data.length > 0) {
    console.log('[stripe-processor] first-row keys:', Object.keys(data[0]));
  }

  stripeHasBrokenDates = false;
  const now = new Date().toISOString();

  return data
    .map((row): Transaction | null => {
      const lc = lcRow(row);
      const id = toStr(lc['id']).trim();
      if (!id) return null;

      const parsedDate = parseStripeDate(lc['created date (utc)']);
      if (!parsedDate) stripeHasBrokenDates = true;
      const created = parsedDate ?? now;

      const status = canonicalStatus(lc['status']);
      const amount = parseNum(lc['amount']);
      const amountCents = Math.round(amount * 100); // dollars → cents (best-effort if Stripe exports decimals)
      const invoiceIdRaw = toStr(lc['invoice id']).trim();
      const invoiceId = invoiceIdRaw || null;
      const isRecurring = Boolean(invoiceId);
      const declineReasonRaw = toStr(lc['decline reason']).trim();
      const declineReason = declineReasonRaw || null;
      const refundedDate = parseStripeDate(lc['refunded date (utc)']);

      const outcome = statusToOutcome(status);

      return {
        // PII-clean fields
        id,
        created,
        amount,
        amountRefunded: parseNum(lc['amount refunded']),
        currency: (toStr(lc['currency']).trim() || 'aud').toLowerCase(),
        convertedAmount: parseNum(lc['converted amount']),
        convertedCurrency: (toStr(lc['converted currency']).trim() || '').toLowerCase(),
        status,
        declineReason,
        fee: parseNum(lc['fee']),
        refundedDate,
        invoiceId,
        captured: parseBool(lc['captured']),

        // Legacy aliases for dashboard compat
        chargeId: id,
        memberId: null,
        createdAt: created,
        type: classifyTransaction(amountCents, isRecurring),
        outcome,
        failureReason: declineReason,
        cardCountry: '',
        cardBrand: '',
        isRecurring,
      };
    })
    .filter((t): t is Transaction => t !== null);
}

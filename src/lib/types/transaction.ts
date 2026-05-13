export type TransactionStatus =
  | 'succeeded'
  | 'refunded'
  | 'failed'
  | 'disputed'
  | 'pending';

export interface Transaction {
  // Canonical fields from the PII-clean Stripe export
  id: string;
  created: string;
  amount: number;
  amountRefunded: number;
  currency: string;
  convertedAmount: number;
  convertedCurrency: string;
  status: TransactionStatus;
  declineReason: string | null;
  fee: number;
  refundedDate: string | null;
  invoiceId: string | null;
  captured: boolean;

  // Legacy aliases / derived fields kept for dashboard backwards-compatibility
  chargeId: string;
  memberId: string | null;
  createdAt: string;
  type: 'foundations-membership' | 'advanced-testing' | 'supplements' | 'medication' | 'treatment-journey';
  outcome: 'authorized' | 'declined' | 'blocked';
  failureReason: string | null;
  cardCountry: string;
  cardBrand: string;
  isRecurring: boolean;
}

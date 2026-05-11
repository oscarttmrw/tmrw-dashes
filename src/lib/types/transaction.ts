export interface Transaction {
  chargeId: string;
  memberId: string | null;
  createdAt: string;
  amount: number;
  currency: string;
  type: 'foundations-membership' | 'advanced-testing' | 'supplements' | 'medication' | 'treatment-journey';
  outcome: 'authorized' | 'declined' | 'blocked';
  failureReason: string | null;
  cardCountry: string;
  cardBrand: string;
  isRecurring: boolean;
}

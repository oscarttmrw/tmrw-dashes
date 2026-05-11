export type DatePreset =
  | 'this-week'
  | 'last-7-days'
  | 'this-month'
  | 'last-30-days'
  | 'this-quarter'
  | 'last-quarter'
  | 'ytd'
  | 'custom';

export type ComparisonMode = 'previous-period' | 'same-period-last-year' | 'off';

export interface DateRange {
  start: string;
  end: string;
  preset: DatePreset;
}

export interface FilterState {
  dateRange: DateRange;
  comparison: ComparisonMode;
  memberType: 'all' | 'Customer' | 'Friend-Family' | 'Investor' | 'Employee';
  clinician: string | null;
  ticketStatus: string | null;
  ticketPriority: string | null;
  channel: string | null;
  transactionType: string | null;
  cardCountry: string | null;
}

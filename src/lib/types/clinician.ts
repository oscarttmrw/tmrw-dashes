export interface Clinician {
  id: string;
  name: string;
  role:
    | 'Integrative Clinician'
    | 'Head of Clinical Services'
    | 'Customer & Ops Lead';
  fte: number;
  department: 'clinical';
  activeCases: number;
  closedCases: number;
  membersPerFTE: number;
  avgCaseDuration: number | null;
  dashboardsPublished: number;
  complexCaseTime: number;
  simpleCaseTime: number;
}

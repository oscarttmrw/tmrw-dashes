export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: 'corporate' | 'sciences' | 'medical' | 'clinical' | 'technology' | 'brand';
  fte: number;
  startDate: string;
}

export const mockTeam: TeamMember[] = [
  // Corporate (3)
  { id: 'TM-001', name: 'Mark Britt', role: 'CEO', department: 'corporate', fte: 1, startDate: '2024-01-15' },
  { id: 'TM-002', name: 'Emma Walsh', role: 'COO', department: 'corporate', fte: 1, startDate: '2024-03-01' },
  { id: 'TM-003', name: 'David Chen', role: 'CFO (Fractional)', department: 'corporate', fte: 0.5, startDate: '2024-06-01' },

  // Sciences (2)
  { id: 'TM-004', name: 'Dr Sarah Leong', role: 'Chief Science Officer', department: 'sciences', fte: 1, startDate: '2024-02-15' },
  { id: 'TM-021', name: 'Dr Lisa Huang', role: 'Research Scientist', department: 'sciences', fte: 1, startDate: '2025-02-01' },

  // Medical (2)
  { id: 'TM-005', name: 'Dr Rahul Mohan', role: 'Medical Director', department: 'medical', fte: 0.8, startDate: '2024-04-01' },
  { id: 'TM-006', name: 'Dr James Liu', role: 'GP Advisor', department: 'medical', fte: 0.4, startDate: '2024-07-01' },

  // Clinical (8)
  { id: 'TM-007', name: 'Katie Kell', role: 'Head of Clinical Services', department: 'clinical', fte: 1, startDate: '2024-02-01' },
  { id: 'TM-008', name: 'Alia Chen', role: 'Integrative Clinician', department: 'clinical', fte: 1, startDate: '2024-03-15' },
  { id: 'TM-009', name: 'Paula Martinez', role: 'Integrative Clinician', department: 'clinical', fte: 1, startDate: '2024-04-01' },
  { id: 'TM-010', name: 'Isabelle Baissac', role: 'Integrative Clinician', department: 'clinical', fte: 1, startDate: '2024-05-01' },
  { id: 'TM-011', name: 'Jaclyn Torres', role: 'Integrative Clinician', department: 'clinical', fte: 1, startDate: '2025-01-15' },
  { id: 'TM-012', name: 'Marko Petrov', role: 'Integrative Clinician', department: 'clinical', fte: 0.6, startDate: '2025-02-01' },
  { id: 'TM-013', name: 'Sanja Kumar', role: 'Integrative Clinician', department: 'clinical', fte: 0.6, startDate: '2025-01-01' },
  { id: 'TM-014', name: 'Katrina Walsh', role: 'Customer & Ops Lead', department: 'clinical', fte: 1, startDate: '2024-06-15' },

  // Technology (5)
  { id: 'TM-015', name: 'Alex Thompson', role: 'Engineering Lead', department: 'technology', fte: 1, startDate: '2024-01-15' },
  { id: 'TM-016', name: 'Nina Gibbias', role: 'Full Stack Developer', department: 'technology', fte: 1, startDate: '2024-05-01' },
  { id: 'TM-017', name: 'Tom Watts', role: 'Full Stack Developer', department: 'technology', fte: 1, startDate: '2024-07-01' },
  { id: 'TM-018', name: 'Sarah Chen', role: 'Product Designer', department: 'technology', fte: 1, startDate: '2024-08-01' },
  { id: 'TM-019', name: 'Alex Park', role: 'Data Engineer', department: 'technology', fte: 1, startDate: '2025-01-15' },

  // Brand (1)
  { id: 'TM-020', name: 'Sophie Delacroix', role: 'Brand Lead', department: 'brand', fte: 1, startDate: '2024-09-01' },
];

export const mockHiringPipeline = [
  { role: 'Senior Integrative Clinician', department: 'clinical' as const, stage: 'interviewing' as const, targetStart: '2026-04-15' },
  { role: 'Data Analyst', department: 'technology' as const, stage: 'sourcing' as const, targetStart: '2026-05-01' },
  { role: 'Customer Success Manager', department: 'clinical' as const, stage: 'offer' as const, targetStart: '2026-03-15' },
];

export const departmentSummary = [
  { department: 'Corporate', color: '#78716C', fte: 2.5, headcount: 3 },
  { department: 'Sciences', color: '#F59E0B', fte: 2, headcount: 2 },
  { department: 'Medical', color: '#EF4444', fte: 1.2, headcount: 2 },
  { department: 'Clinical', color: '#EC4899', fte: 7.2, headcount: 8 },
  { department: 'Technology', color: '#3B82F6', fte: 5, headcount: 5 },
  { department: 'Brand', color: '#8B5CF6', fte: 1, headcount: 1 },
];

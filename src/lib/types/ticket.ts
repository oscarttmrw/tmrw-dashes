export interface Ticket {
  id: string;
  memberId: string | null;
  status: 'Open' | 'Pending' | 'Solved' | 'Closed';
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  channel: string;
  ticketType: 'Question' | 'Incident' | 'Problem' | 'Task' | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  solvedAt: string | null;
  assignee: string;
  group: string;
  firstReplyMinutes: number | null;
  firstResolutionMinutes: number | null;
  fullResolutionMinutes: number | null;
  requesterWaitMinutes: number | null;
  satisfaction: 'Good' | 'Bad' | 'Offered' | 'Not Offered' | null;
  reopens: number;
  replies: number;
  assigneeStations: number;
  groupStations: number;
}

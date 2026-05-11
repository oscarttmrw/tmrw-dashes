/**
 * Status-to-colour mapping utilities for the TMRW dashboard.
 * Returns Tailwind CSS class names.
 */

import type { Status, DataSource } from '@/lib/types';

/**
 * Foreground / text colour for a traffic-light status.
 */
export function statusColor(status: Status): string {
  const map: Record<Status, string> = {
    green: 'text-status-green',
    amber: 'text-status-amber',
    red: 'text-status-red',
    grey: 'text-status-grey',
  };
  return map[status] ?? map.grey;
}

/**
 * Muted background colour for a traffic-light status.
 */
export function statusBgColor(status: Status): string {
  const map: Record<Status, string> = {
    green: 'bg-status-green-light border-status-green/20',
    amber: 'bg-status-amber-light border-status-amber/20',
    red: 'bg-status-red-light border-status-red/20',
    grey: 'bg-status-grey-light border-status-grey/20',
  };
  return map[status] ?? map.grey;
}

/**
 * Brand colour for a data source.
 */
export function sourceColor(source: DataSource): string {
  const map: Record<string, string> = {
    hubspot: 'text-src-hubspot',
    stripe: 'text-src-stripe',
    zendesk: 'text-src-zendesk',
    manual: 'text-src-manual',
    derived: 'text-dash-text-secondary',
  };
  return map[source] ?? 'text-src-manual';
}

/**
 * Colour for a department / functional area.
 */
export function deptColor(dept: string): string {
  const map: Record<string, string> = {
    financial: 'text-emerald-700 bg-emerald-50',
    members: 'text-blue-700 bg-blue-50',
    clinical: 'text-purple-700 bg-purple-50',
    support: 'text-amber-700 bg-amber-50',
    marketing: 'text-pink-700 bg-pink-50',
    strategy: 'text-indigo-700 bg-indigo-50',
    team: 'text-cyan-700 bg-cyan-50',
    eos: 'text-dash-red bg-dash-red-light',
    admin: 'text-slate-700 bg-slate-50',
  };
  return map[dept.toLowerCase()] ?? 'text-slate-700 bg-slate-50';
}

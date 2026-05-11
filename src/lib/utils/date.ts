/**
 * Date utility functions for the TMRW dashboard.
 * All date strings are expected in ISO 8601 format (YYYY-MM-DD or full ISO).
 * Display times use AEDT (Australia/Sydney) unless otherwise noted.
 */

const TIMEZONE = 'Australia/Sydney';

function toDate(date: string | Date): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

/**
 * Format a date as "Mar 3, 2026".
 */
export function formatDate(date: string | Date): string {
  return toDate(date).toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: TIMEZONE,
  });
}

/**
 * Format a date as "Mar 3" (no year).
 */
export function formatDateShort(date: string | Date): string {
  return toDate(date).toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    timeZone: TIMEZONE,
  });
}

/**
 * Format a date-time as "Mar 3, 2026 09:14 AEDT".
 */
export function formatDateTime(date: string | Date): string {
  const d = toDate(date);
  const datePart = d.toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: TIMEZONE,
  });
  const timePart = d.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE,
  });
  const tzPart = d.toLocaleTimeString('en-AU', {
    timeZoneName: 'short',
    timeZone: TIMEZONE,
  }).split(' ').pop() ?? 'AEDT';

  return `${datePart} ${timePart} ${tzPart}`;
}

/**
 * Return the number of whole days between a date string and today.
 */
export function daysAgo(date: string): number {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Return the ISO week number for a date.
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Return a month key like "2026-03" from an ISO date string.
 */
export function getMonthKey(date: string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Check whether a date string falls within an inclusive range.
 */
export function isInDateRange(date: string, start: string, end: string): boolean {
  const d = new Date(date).getTime();
  return d >= new Date(start).getTime() && d <= new Date(end).getTime();
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function startOfQuarter(date: Date): Date {
  const q = Math.floor(date.getMonth() / 3)
  return new Date(date.getFullYear(), q * 3, 1)
}

export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1)
}

export function subMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() - months)
  return d
}

export function subWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - (weeks * 7))
  return d
}

export function isAfter(a: Date, b: Date): boolean { return a.getTime() > b.getTime() }
export function isBefore(a: Date, b: Date): boolean { return a.getTime() < b.getTime() }

/**
 * Return the default date range: first and last day of the current month.
 */
export function getDefaultDateRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { start: fmt(start), end: fmt(end) };
}

/**
 * Return a human-readable label for a date range.
 * Examples: "Mar 2026", "Mar 1 - Mar 15, 2026", "2026"
 */
export function periodLabel(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);

  // Same day
  if (start === end) {
    return formatDate(s);
  }

  // Full single month
  if (
    s.getDate() === 1 &&
    e.getDate() === new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate() &&
    s.getMonth() === e.getMonth() &&
    s.getFullYear() === e.getFullYear()
  ) {
    return s.toLocaleDateString('en-AU', {
      month: 'short',
      year: 'numeric',
      timeZone: TIMEZONE,
    });
  }

  // Full year
  if (
    s.getMonth() === 0 &&
    s.getDate() === 1 &&
    e.getMonth() === 11 &&
    e.getDate() === 31 &&
    s.getFullYear() === e.getFullYear()
  ) {
    return String(s.getFullYear());
  }

  // Same year range
  if (s.getFullYear() === e.getFullYear()) {
    return `${formatDateShort(s)} - ${formatDateShort(e)}, ${s.getFullYear()}`;
  }

  // Cross-year range
  return `${formatDate(s)} - ${formatDate(e)}`;
}

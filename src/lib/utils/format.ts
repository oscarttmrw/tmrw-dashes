/**
 * Number and value formatting utilities for the TMRW dashboard.
 */

/**
 * Format as currency: "$1,234" (no decimals).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format as compact currency: "$1.2K", "$3.4M".
 */
export function formatCurrencyCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

/**
 * Format as percentage: "42.5%".
 * @param decimals Number of decimal places (default 1).
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with thousand separators: "1,234".
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-AU').format(value);
}

/**
 * Convert minutes to hours display: "2.5h".
 */
export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}h`;
}

/**
 * Format days: "27d".
 */
export function formatDays(days: number): string {
  return `${Math.round(days)}d`;
}

export interface TrendResult {
  direction: 'up' | 'down' | 'flat';
  value: string;
  isPositive: boolean;
}

/**
 * Calculate the trend between two values.
 * Returns direction, formatted percentage change, and whether the change is positive.
 * A change of less than 0.5% is considered flat.
 */
export function formatTrend(current: number, previous: number): TrendResult {
  if (previous === 0) {
    if (current === 0) return { direction: 'flat', value: '0%', isPositive: true };
    return {
      direction: current > 0 ? 'up' : 'down',
      value: '100%',
      isPositive: current > 0,
    };
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;
  const absChange = Math.abs(change);

  if (absChange < 0.5) {
    return { direction: 'flat', value: '0%', isPositive: true };
  }

  return {
    direction: change > 0 ? 'up' : 'down',
    value: `${absChange.toFixed(1)}%`,
    isPositive: change > 0,
  };
}

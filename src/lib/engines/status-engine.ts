/**
 * Status computation engine for the TMRW dashboard.
 * Evaluates metric values against targets to produce RAG status.
 */

import type { Status, MetricDirection, MetricValue } from '@/lib/types';
import type { Question } from '@/lib/types';

/**
 * Compute the RAG status for a single metric.
 *
 * Rules:
 * - If value or target is null/undefined/TBC -> grey
 * - If higher-better: >= target = green, >= 80% target = amber, else red
 * - If lower-better: <= target = green, <= 120% target = amber, else red
 */
export function computeMetricStatus(
  value: number | string | null | undefined,
  target: number | string | null | undefined,
  direction: MetricDirection
): Status {
  // Handle null/undefined/TBC cases
  if (value === null || value === undefined) return 'grey';
  if (target === null || target === undefined) return 'grey';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const numTarget = typeof target === 'string' ? parseFloat(target) : target;

  if (isNaN(numValue) || isNaN(numTarget)) return 'grey';

  // Check for TBC-style string targets
  if (typeof target === 'string' && target.toUpperCase().includes('TBC')) {
    return 'grey';
  }

  if (numTarget === 0) {
    // Special case: target of 0
    if (direction === 'lower-better') {
      return numValue === 0 ? 'green' : numValue <= 1 ? 'amber' : 'red';
    }
    // higher-better with target 0 doesn't make much sense, treat as grey
    return 'grey';
  }

  if (direction === 'higher-better') {
    if (numValue >= numTarget) return 'green';
    if (numValue >= numTarget * 0.8) return 'amber';
    return 'red';
  }

  // lower-better
  if (numValue <= numTarget) return 'green';
  if (numValue <= numTarget * 1.2) return 'amber';
  return 'red';
}

/**
 * Compute the composite status for a strategic question (Q1-Q5).
 * Uses worst-of logic across primary metrics, tempered by secondary metrics.
 *
 * Rules:
 * - If any primary metric is red -> red
 * - If any primary metric is amber -> amber
 * - If all primary metrics are green -> green
 * - If all metrics are grey -> grey
 */
export function computeQuestionStatus(
  primaryMetrics: MetricValue[],
  secondaryMetrics: MetricValue[] = []
): Status {
  const allMetrics = [...primaryMetrics, ...secondaryMetrics];

  // If no metrics at all, grey
  if (allMetrics.length === 0) return 'grey';

  // If all are grey, return grey
  const nonGrey = allMetrics.filter((m) => m.status !== 'grey');
  if (nonGrey.length === 0) return 'grey';

  // Check primary metrics first (they drive the status)
  const primaryNonGrey = primaryMetrics.filter((m) => m.status !== 'grey');

  if (primaryNonGrey.length === 0) {
    // Fall back to secondary metrics if no primary data
    const secondaryNonGrey = secondaryMetrics.filter((m) => m.status !== 'grey');
    if (secondaryNonGrey.length === 0) return 'grey';
    if (secondaryNonGrey.some((m) => m.status === 'red')) return 'red';
    if (secondaryNonGrey.some((m) => m.status === 'amber')) return 'amber';
    return 'green';
  }

  // Worst-of logic for primary metrics
  if (primaryNonGrey.some((m) => m.status === 'red')) return 'red';
  if (primaryNonGrey.some((m) => m.status === 'amber')) return 'amber';
  return 'green';
}

/**
 * Batch-evaluate an array of MetricValues, updating their status field.
 * Requires a direction lookup keyed by metricId.
 */
export function evaluateMetricStatuses(
  metrics: MetricValue[],
  directionMap: Record<string, MetricDirection>
): MetricValue[] {
  return metrics.map((m) => ({
    ...m,
    status: computeMetricStatus(
      m.current,
      m.target,
      directionMap[m.metricId] ?? 'higher-better'
    ),
  }));
}

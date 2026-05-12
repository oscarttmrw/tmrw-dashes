/**
 * Maps metric IDs to the data sources they require.
 * Used to show "why is this TBD" context on MetricCards.
 */

/** Maps a metric ID to a human-readable display label. */
const metricDisplayNames: Record<string, string> = {
  'mrr': 'MRR',
  'total-revenue': 'Total Revenue',
  'payment-success-rate': 'Payment Success Rate',
  'csat': 'CSAT',
  'open-tickets': 'Open Tickets',
  'avg-first-reply': 'Avg First Reply Time',
  'biomarker-improvement': 'Biomarker Improvement',
  'bio-age-delta': 'Biological Age Delta',
  'cac-by-channel': 'CAC by Channel',
  'platform-uptime': 'Platform Uptime',
  'nps': 'NPS',
  'avg-resolution-time': 'Avg Resolution Time',
  'ticket-volume': 'Ticket Volume',
  'first-reply-time': 'First Reply Time',
  'email-open-rate': 'Email Open Rate',
  'sequence-completion': 'Sequence Completion',
  'website-conversion': 'Website Conversion',
  'supplement-delivery': 'Supplement Delivery',
}

/**
 * Returns the display names of all metrics powered by the given source key.
 * Maps source keys to the registryId values used in metricSourceMap.
 */
export function getMetricsPoweredBy(source: string): string[] {
  const registryIds: Record<string, string[]> = {
    tableau: [],
    hubspot: ['hubspot', 'hubspot-marketing'],
    stripe: ['stripe'],
    zendesk: ['zendesk'],
  }
  const ids = registryIds[source] ?? []
  const matched: string[] = []
  for (const [metricId, entry] of Object.entries(metricSourceMap)) {
    if (entry.registryId.some((rid) => ids.includes(rid))) {
      matched.push(metricDisplayNames[metricId] ?? metricId)
    }
  }
  return matched
}

export const metricSourceMap: Record<string, { sources: string[]; registryId: string[] }> = {
  'mrr': { sources: ['Stripe'], registryId: ['stripe'] },
  'total-revenue': { sources: ['Stripe'], registryId: ['stripe'] },
  'payment-success-rate': { sources: ['Stripe'], registryId: ['stripe'] },
  'csat': { sources: ['Zendesk'], registryId: ['zendesk'] },
  'open-tickets': { sources: ['Zendesk'], registryId: ['zendesk'] },
  'avg-first-reply': { sources: ['Zendesk'], registryId: ['zendesk'] },
  'biomarker-improvement': { sources: ['Oracle Clinical'], registryId: ['oracle-clinical'] },
  'bio-age-delta': { sources: ['Oracle Clinical'], registryId: ['oracle-clinical'] },
  'cac-by-channel': { sources: ['Meta Ads', 'HubSpot Marketing'], registryId: ['meta-ads', 'hubspot-marketing'] },
  'platform-uptime': { sources: ['Vercel / AWS'], registryId: ['uptime'] },
  'nps': { sources: ['NPS Survey'], registryId: ['nps'] },
  'avg-resolution-time': { sources: ['Zendesk'], registryId: ['zendesk'] },
  'ticket-volume': { sources: ['Zendesk'], registryId: ['zendesk'] },
  'first-reply-time': { sources: ['Zendesk'], registryId: ['zendesk'] },
  'email-open-rate': { sources: ['HubSpot Marketing'], registryId: ['hubspot-marketing'] },
  'sequence-completion': { sources: ['HubSpot Marketing'], registryId: ['hubspot-marketing'] },
  'website-conversion': { sources: ['Google Analytics'], registryId: ['google-analytics'] },
  'supplement-delivery': { sources: ['Supplement Fulfilment'], registryId: ['supplement-fulfilment'] },
}

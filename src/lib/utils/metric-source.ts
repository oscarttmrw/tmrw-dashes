/**
 * Maps metric IDs to the data sources they require.
 * Used to show "why is this TBD" context on MetricCards.
 */

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

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
  'blended-cac': 'Blended CAC',
  'platform-uptime': 'Platform Uptime',
  'nps': 'NPS',
  'avg-resolution-time': 'Avg Resolution Time',
  'ticket-volume': 'Ticket Volume',
  'first-reply-time': 'First Reply Time',
  'email-open-rate': 'Email Open Rate',
  'sequence-completion': 'Sequence Completion',
  'website-conversion': 'Website Conversion',
  'supplement-delivery': 'Supplement Delivery',
  'total-ad-spend': 'Total Ad Spend',
  'impressions': 'Impressions',
  'ctr': 'CTR',
  'landing-page-views': 'Landing Page Views',
  'cost-per-lpv': 'Cost per LPV',
  'conversions': 'Conversions (Meta)',
  'cost-per-conversion': 'Cost per Conversion',
  'total-followers': 'Total Followers',
  'followers-by-platform': 'Followers by Platform',
  'weekly-page-views': 'Weekly Page Views',
  'weekly-video-views': 'Weekly Video Views',
  'weekly-post-engagements': 'Weekly Post Engagements',
  'opportunities-opened': 'Opportunities Opened',
  'open-opportunity-value': 'Open Opportunity Value',
  'won-opportunities': 'Won Opportunities',
  'won-opportunity-value': 'Won Opportunity Value',
  'calls-booked': 'Calls Booked',
  'showed-appointments': 'Showed Appointments',
  'no-show-appointments': 'No-Show Appointments',
  'upcoming-appointments': 'Upcoming Appointments',
  'show-rate': 'Show Rate',
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
    meta_ads: ['meta_ads'],
    social_organic: ['social_organic'],
    pelagonia: ['pelagonia'],
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
  'cac-by-channel': { sources: ['Meta Ads', 'HubSpot Marketing'], registryId: ['meta_ads', 'hubspot-marketing'] },
  'platform-uptime': { sources: ['Vercel / AWS'], registryId: ['uptime'] },
  'nps': { sources: ['NPS Survey'], registryId: ['nps'] },
  'avg-resolution-time': { sources: ['Zendesk'], registryId: ['zendesk'] },
  'ticket-volume': { sources: ['Zendesk'], registryId: ['zendesk'] },
  'first-reply-time': { sources: ['Zendesk'], registryId: ['zendesk'] },
  'email-open-rate': { sources: ['HubSpot Marketing'], registryId: ['hubspot-marketing'] },
  'sequence-completion': { sources: ['HubSpot Marketing'], registryId: ['hubspot-marketing'] },
  'website-conversion': { sources: ['Google Analytics'], registryId: ['google-analytics'] },
  'supplement-delivery': { sources: ['Supplement Fulfilment'], registryId: ['supplement-fulfilment'] },
  // Meta Ads
  'total-ad-spend': { sources: ['Meta for Business'], registryId: ['meta_ads'] },
  'impressions': { sources: ['Meta for Business'], registryId: ['meta_ads'] },
  'ctr': { sources: ['Meta for Business'], registryId: ['meta_ads'] },
  'landing-page-views': { sources: ['Meta for Business'], registryId: ['meta_ads'] },
  'cost-per-lpv': { sources: ['Meta for Business'], registryId: ['meta_ads'] },
  'conversions': { sources: ['Meta for Business'], registryId: ['meta_ads'] },
  'cost-per-conversion': { sources: ['Meta for Business'], registryId: ['meta_ads'] },
  'blended-cac': { sources: ['Meta for Business', 'HubSpot'], registryId: ['meta_ads', 'hubspot'] },
  // Social Organic
  'total-followers': { sources: ['Social Organic'], registryId: ['social_organic'] },
  'followers-by-platform': { sources: ['Social Organic'], registryId: ['social_organic'] },
  'weekly-page-views': { sources: ['Social Organic'], registryId: ['social_organic'] },
  'weekly-video-views': { sources: ['Social Organic'], registryId: ['social_organic'] },
  'weekly-post-engagements': { sources: ['Social Organic'], registryId: ['social_organic'] },
  // Pelagonia (GoHighLevel)
  'opportunities-opened': { sources: ['Pelagonia (GoHighLevel)'], registryId: ['pelagonia'] },
  'open-opportunity-value': { sources: ['Pelagonia (GoHighLevel)'], registryId: ['pelagonia'] },
  'won-opportunities': { sources: ['Pelagonia (GoHighLevel)'], registryId: ['pelagonia'] },
  'won-opportunity-value': { sources: ['Pelagonia (GoHighLevel)'], registryId: ['pelagonia'] },
  'calls-booked': { sources: ['Pelagonia (GoHighLevel)'], registryId: ['pelagonia'] },
  'showed-appointments': { sources: ['Pelagonia (GoHighLevel)'], registryId: ['pelagonia'] },
  'no-show-appointments': { sources: ['Pelagonia (GoHighLevel)'], registryId: ['pelagonia'] },
  'upcoming-appointments': { sources: ['Pelagonia (GoHighLevel)'], registryId: ['pelagonia'] },
  'show-rate': { sources: ['Pelagonia (GoHighLevel)'], registryId: ['pelagonia'] },
}

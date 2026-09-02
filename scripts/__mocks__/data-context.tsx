// Test double for the data context: serves whatever rows the smoke test loads.
import * as React from 'react'

export type CanonicalRow = Record<string, unknown>

let injected: Record<string, unknown> = {}
export function __inject(data: Record<string, unknown>) { injected = data }

const EMPTY: string[] = [
  'members', 'transactions', 'tickets', 'clinicians', 'metaAds', 'pelagoniaOpportunities',
  'rocks', 'alerts', 'meta_ads', 'marketing_daily', 'social_followers', 'social_views',
  'stripe', 'stripe_revenue', 'product_category_map', 'hubspot', 'pelagonia', 'tableau',
  'zendesk', 'zendesk_tickets', 'hubspot_contacts', 'ghl_opportunities', 'operational_data',
  'plan_targets', 'financial_revenue',
]

export function useDashboardData() {
  const base: Record<string, unknown> = {}
  for (const k of EMPTY) base[k] = []
  return {
    ...base,
    ...injected,
    manualMetrics: {},
    isUsingMockData: false,
    dataMode: 'actual',
    lastRefresh: {},
    lastRefreshed: {},
    loading: false,
    error: null,
    refresh: async () => {},
    resetToDemo: () => {},
    switchToActual: () => {},
    hasActualData: true,
    derivedCAC: null,
  } as never
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children)
}

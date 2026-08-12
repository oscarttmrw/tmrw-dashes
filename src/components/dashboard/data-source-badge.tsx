'use client'

import { cn } from '@/lib/utils'

type KnownSource =
  | 'hubspot'
  | 'hubspot_contacts'
  | 'ghl_opportunities'
  | 'operational_data'
  | 'stripe'
  | 'stripe_revenue'
  | 'product_category_map'
  | 'zendesk'
  | 'zendesk_tickets'
  | 'manual'
  | 'tableau'
  | 'meta'
  | 'meta_ads'
  | 'marketing_daily'
  | 'social_followers'
  | 'social_views'
  | 'pelagonia'
  | 'financial_revenue'
  | 'financial_revenue_net'
  | 'financial_revenue_gross'

const sourceConfig: Record<KnownSource, { label: string; color: string }> = {
  hubspot:           { label: 'HubSpot',           color: 'bg-src-hubspot/15 text-src-hubspot' },
  hubspot_contacts:  { label: 'HubSpot Contacts',  color: 'bg-src-hubspot/15 text-src-hubspot' },
  ghl_opportunities: { label: 'GHL Opportunities', color: 'bg-src-zendesk/15 text-src-zendesk' },
  operational_data:  { label: 'Operational Data',  color: 'bg-src-manual/15 text-src-manual' },
  stripe:            { label: 'Stripe',            color: 'bg-src-stripe/15 text-src-stripe' },
  stripe_revenue:    { label: 'Stripe Revenue',    color: 'bg-src-stripe/15 text-src-stripe' },
  product_category_map: { label: 'Product Map',    color: 'bg-src-stripe/15 text-src-stripe' },
  zendesk:           { label: 'Zendesk',           color: 'bg-src-zendesk/15 text-src-zendesk' },
  zendesk_tickets:   { label: 'Zendesk Tickets',   color: 'bg-src-zendesk/15 text-src-zendesk' },
  manual:            { label: 'Manual',            color: 'bg-src-manual/15 text-src-manual' },
  tableau:           { label: 'Tableau',           color: 'bg-src-tableau/15 text-src-tableau' },
  meta:              { label: 'Meta',              color: 'bg-src-hubspot/15 text-src-hubspot' },
  meta_ads:          { label: 'Meta Ads',          color: 'bg-src-hubspot/15 text-src-hubspot' },
  marketing_daily:   { label: 'Marketing Daily',   color: 'bg-src-manual/15 text-src-manual' },
  social_followers:  { label: 'Social Followers',  color: 'bg-src-manual/15 text-src-manual' },
  social_views:      { label: 'Social Views',      color: 'bg-src-manual/15 text-src-manual' },
  pelagonia:         { label: 'Pelagonia',         color: 'bg-src-zendesk/15 text-src-zendesk' },
  financial_revenue:       { label: 'Financial Revenue', color: 'bg-src-stripe/15 text-src-stripe' },
  financial_revenue_net:   { label: 'Revenue — Net',     color: 'bg-src-stripe/15 text-src-stripe' },
  financial_revenue_gross: { label: 'Revenue — Gross',   color: 'bg-src-stripe/15 text-src-stripe' },
}

// Accept any string at runtime — historical upload_log rows might carry a
// source key that's since been removed. Fall back to a neutral badge so the
// upload-history table doesn't crash on stale data.
export function DataSourceBadge({ source }: { source: string }) {
  const config = (sourceConfig as Record<string, { label: string; color: string } | undefined>)[source]
    ?? { label: source, color: 'bg-dash-surface text-dash-text-secondary' }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 font-sans text-[10px] font-medium',
        config.color
      )}
    >
      {config.label}
    </span>
  )
}

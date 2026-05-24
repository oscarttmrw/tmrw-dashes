'use client'

import { cn } from '@/lib/utils'

type Source =
  | 'hubspot'
  | 'hubspot_contacts'
  | 'ghl_opportunities'
  | 'operational_data'
  | 'stripe'
  | 'zendesk'
  | 'manual'
  | 'tableau'
  | 'meta'
  | 'pelagonia'

const sourceConfig: Record<Source, { label: string; color: string }> = {
  hubspot: { label: 'HubSpot', color: 'bg-src-hubspot/15 text-src-hubspot' },
  hubspot_contacts: { label: 'HubSpot Contacts', color: 'bg-src-hubspot/15 text-src-hubspot' },
  ghl_opportunities: { label: 'GHL Opportunities', color: 'bg-src-zendesk/15 text-src-zendesk' },
  operational_data: { label: 'Operational Data', color: 'bg-src-manual/15 text-src-manual' },
  stripe: { label: 'Stripe', color: 'bg-src-stripe/15 text-src-stripe' },
  zendesk: { label: 'Zendesk', color: 'bg-src-zendesk/15 text-src-zendesk' },
  manual: { label: 'Manual', color: 'bg-src-manual/15 text-src-manual' },
  tableau: { label: 'Tableau', color: 'bg-src-tableau/15 text-src-tableau' },
  meta: { label: 'Meta', color: 'bg-src-hubspot/15 text-src-hubspot' },
  pelagonia: { label: 'Pelagonia', color: 'bg-src-zendesk/15 text-src-zendesk' },
}

export function DataSourceBadge({ source }: { source: Source }) {
  const config = sourceConfig[source]
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

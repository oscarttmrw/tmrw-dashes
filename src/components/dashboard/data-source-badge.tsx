'use client'

import { cn } from '@/lib/utils'

type Source = 'hubspot' | 'stripe' | 'zendesk' | 'manual' | 'tableau'

const sourceConfig: Record<Source, { label: string; color: string }> = {
  hubspot: { label: 'HubSpot', color: 'bg-src-hubspot/15 text-src-hubspot' },
  stripe: { label: 'Stripe', color: 'bg-src-stripe/15 text-src-stripe' },
  zendesk: { label: 'Zendesk', color: 'bg-src-zendesk/15 text-src-zendesk' },
  manual: { label: 'Manual', color: 'bg-src-manual/15 text-src-manual' },
  tableau: { label: 'Tableau', color: 'bg-src-tableau/15 text-src-tableau' },
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

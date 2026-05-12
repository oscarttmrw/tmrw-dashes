'use client'

import { Breadcrumb } from '@/components/layout/breadcrumb'
import { SectionHeading } from '@/components/dashboard/section-heading'

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-dash-border bg-dash-surface px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-dash-border/50">
        <svg
          className="h-6 w-6 text-dash-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
          />
        </svg>
      </div>
      <h3 className="mb-2 font-sans text-sm font-semibold text-dash-text">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-dash-text-secondary">{description}</p>
      {action && (
        <a
          href={action.href}
          className="mt-5 inline-flex items-center rounded-md bg-dash-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-dash-red/90"
        >
          {action.label}
          <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
      )}
    </div>
  )
}

export default function MarketingPage() {
  return (
    <div className="space-y-4 md:space-y-10">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Campaign Deep Dive' }]} />
      <section>
        <SectionHeading number={1} title="Campaign Performance" />
        <EmptyState
          title="Campaign data not yet connected"
          description="This view will show individual campaign metrics (CAC, conversion, ROAS) when HubSpot marketing data is available."
          action={{ label: 'Connect HubSpot', href: '/admin/upload' }}
        />
      </section>
      <section>
        <SectionHeading number={2} title="Content & Engagement" />
        <EmptyState
          title="Lifecycle marketing metrics"
          description="Email open rates, sequence completion, and content engagement will appear here when HubSpot lifecycle automation is active."
        />
      </section>
    </div>
  )
}

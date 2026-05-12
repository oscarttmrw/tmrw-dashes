# tmrw-dashes — Full Codebase Export

_Generated: 2026-05-12 11:29 UTC_

## `.env.local.example`

```example
# Supabase — get from supabase.com > project > settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Upload password — extra gate on POST /api/data/upload (optional but recommended)
UPLOAD_PW=change-me-to-something-secret

```

## `middleware.ts`

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}

```

## `next.config.mjs`

```mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

export default nextConfig

```

## `package.json`

```json
{
  "name": "tmrw-dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.49.8",
    "@tailwindcss/postcss": "^4.2.1",
    "@tremor/react": "^3.18.7",
    "@types/node": "^25.3.5",
    "@types/papaparse": "^5.5.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "autoprefixer": "^10.4.27",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "framer-motion": "^12.35.0",
    "html2canvas": "^1.4.1",
    "jspdf": "^4.2.0",
    "lucide-react": "^0.577.0",
    "next": "^14.2.35",
    "papaparse": "^5.5.3",
    "postcss": "^8.5.8",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^3.7.0",
    "tailwind-merge": "^3.5.0",
    "tailwindcss": "^4.2.1",
    "typescript": "^5.9.3",
    "xlsx": "^0.18.5"
  }
}

```

## `postcss.config.mjs`

```mjs
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;

```

## `src/app/admin/manual/page.tsx`

```tsx
'use client'

import { Breadcrumb } from '@/components/layout/breadcrumb'

// ---------------------------------------------------------------------------
// Form field definitions by section
// ---------------------------------------------------------------------------
interface Field {
  label: string
  current: string
  type?: 'text' | 'number'
}

interface Section {
  title: string
  fields: Field[]
}

const sections: Section[] = [
  {
    title: 'Financial',
    fields: [
      { label: 'Blended CAC', current: '$95', type: 'number' },
      { label: 'CM/Member', current: '$72', type: 'number' },
    ],
  },
  {
    title: 'Clinical',
    fields: [
      { label: 'Gate 2A Pass Rate', current: '92%', type: 'number' },
      { label: 'Gate 2B Pass Rate', current: '88%', type: 'number' },
      { label: 'Gate 3 Pass Rate', current: '95%', type: 'number' },
      { label: 'Biomarker Improvement Rate', current: 'TBC', type: 'text' },
    ],
  },
  {
    title: 'Marketing',
    fields: [
      { label: 'Organic %', current: '72%', type: 'number' },
      { label: 'Referral Rate', current: 'TBC', type: 'text' },
    ],
  },
  {
    title: 'Partnerships',
    fields: [
      { label: 'Channel Partners', current: '0', type: 'number' },
      { label: 'Corporate Partners', current: '0', type: 'number' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ManualEntryPage() {
  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Manual Entry' },
        ]}
      />

      {/* Sections */}
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
            {section.title}
          </h2>
          <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div
                  key={field.label}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
                >
                  <label className="w-52 shrink-0 text-sm text-dash-text">
                    {field.label}
                  </label>
                  <span className="w-28 shrink-0 font-mono text-sm text-dash-text-muted">
                    Current: {field.current}
                  </span>
                  <input
                    type={field.type ?? 'text'}
                    placeholder="New value"
                    className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red sm:max-w-[200px]"
                  />
                  <button className="shrink-0 rounded-md border border-dash-border bg-dash-bg px-4 py-2 text-xs font-medium text-dash-text-secondary transition-colors hover:border-dash-red/40 hover:text-dash-red">
                    Save
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}

```

## `src/app/admin/page.tsx`

```tsx
import { redirect } from 'next/navigation'

export default function AdminPage() {
  redirect('/admin/upload')
}

```

## `src/app/admin/registry/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { StatusDot } from '@/components/dashboard/status-dot'
import { useDashboardData } from '@/lib/context/data-context'
import type { Status } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────

type ConnectionStatus = 'live' | 'available-not-connected' | 'source-not-ready' | 'not-available'
type Priority = 'P1' | 'P2' | 'P3' | 'P4'
type Owner = 'Mark' | 'Daniel' | 'Ben' | 'Marko' | 'Steph' | 'Brooke' | 'Konstantinos' | 'Emma' | 'TBD'

interface DataSource {
  id: string
  name: string
  system: string
  connectionMethod: 'csv-upload' | 'snowflake-daily' | 'api-direct' | 'manual-entry' | 'not-connected'
  futureMethod: 'snowflake-daily' | 'api-direct' | 'manual-entry'
  status: ConnectionStatus
  owner: Owner
  priority: Priority
  targetDate: string | null
  lastSync: string | null
  affectedPages: string[]
  metricsUnlocked: number
  metricsTotal: number
  dependencies: string[]
  notes: string
}

// ─── Data Source Registry ────────────────────────────────────────────

const dataSources: DataSource[] = [
  {
    id: 'tableau',
    name: 'Tableau (Oracle Pipeline)',
    system: 'Tableau / Oracle',
    connectionMethod: 'csv-upload',
    futureMethod: 'snowflake-daily',
    status: 'live',
    owner: 'Mark',
    priority: 'P1',
    targetDate: null,
    lastSync: '2026-03-07',
    affectedPages: ['Scorecard', 'Delivery', 'Retention', 'Acquisition'],
    metricsUnlocked: 18,
    metricsTotal: 18,
    dependencies: [],
    notes: 'Primary member data. UTF-16 TSV, 284 members. Uploads via Admin > Data Upload.',
  },
  {
    id: 'hubspot',
    name: 'HubSpot CRM',
    system: 'HubSpot',
    connectionMethod: 'csv-upload',
    futureMethod: 'snowflake-daily',
    status: 'live',
    owner: 'Steph',
    priority: 'P1',
    targetDate: null,
    lastSync: '2026-03-07',
    affectedPages: ['Delivery', 'Acquisition', 'Retention'],
    metricsUnlocked: 12,
    metricsTotal: 12,
    dependencies: [],
    notes: 'Clinician assignment, dashboard status, add-ons. Migrated from Attio. 253 records.',
  },
  {
    id: 'stripe',
    name: 'Stripe Payments',
    system: 'Stripe',
    connectionMethod: 'not-connected',
    futureMethod: 'snowflake-daily',
    status: 'source-not-ready',
    owner: 'Daniel',
    priority: 'P1',
    targetDate: '2026-03-14',
    lastSync: null,
    affectedPages: ['Financial', 'Scorecard', 'Acquisition'],
    metricsUnlocked: 0,
    metricsTotal: 14,
    dependencies: ['Re-export with full timestamps and customer email'],
    notes: 'Current export has truncated dates (MM:SS only). Need fresh Payments export from Stripe Dashboard, not the Analytics report.',
  },
  {
    id: 'zendesk',
    name: 'Zendesk Support',
    system: 'Zendesk Explore',
    connectionMethod: 'not-connected',
    futureMethod: 'snowflake-daily',
    status: 'available-not-connected',
    owner: 'Steph',
    priority: 'P1',
    targetDate: '2026-03-14',
    lastSync: null,
    affectedPages: ['Support', 'Scorecard'],
    metricsUnlocked: 0,
    metricsTotal: 16,
    dependencies: ['Export from Explore: Queries > Support: Tickets dataset > CSV'],
    notes: '47 reports available in Explore. Need standard ticket export with time-in-minutes fields.',
  },
  {
    id: 'oracle-clinical',
    name: 'Oracle Clinical Outcomes',
    system: 'Oracle',
    connectionMethod: 'not-connected',
    futureMethod: 'snowflake-daily',
    status: 'not-available',
    owner: 'Ben',
    priority: 'P2',
    targetDate: '2026-06-01',
    lastSync: null,
    affectedPages: ['Retention', 'Scorecard'],
    metricsUnlocked: 0,
    metricsTotal: 4,
    dependencies: ['Oracle API access', 'Retest data schema definition', 'Biomarker outcome model'],
    notes: 'Required for Q1 strategic question ("prove it works"). No members have completed retest cycle yet. Data structure TBD.',
  },
  {
    id: 'meta-ads',
    name: 'Meta Ads',
    system: 'Meta Business Manager',
    connectionMethod: 'not-connected',
    futureMethod: 'snowflake-daily',
    status: 'not-available',
    owner: 'Konstantinos',
    priority: 'P3',
    targetDate: '2026-04-30',
    lastSync: null,
    affectedPages: ['Acquisition', 'Financial'],
    metricsUnlocked: 0,
    metricsTotal: 6,
    dependencies: ['Meta Business Manager admin access', 'Campaign naming convention agreed'],
    notes: 'Enables real CAC by campaign, ROAS tracking. Becomes P1 when paid spend exceeds $15K/month.',
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    system: 'GA4',
    connectionMethod: 'not-connected',
    futureMethod: 'snowflake-daily',
    status: 'not-available',
    owner: 'Konstantinos',
    priority: 'P3',
    targetDate: '2026-04-30',
    lastSync: null,
    affectedPages: ['Acquisition', 'Marketing'],
    metricsUnlocked: 0,
    metricsTotal: 5,
    dependencies: ['GA4 property configured', 'Conversion events defined'],
    notes: 'Website funnel: visitor > waitlist > purchase. Currently no web analytics in dashboard.',
  },
  {
    id: 'uptime',
    name: 'Platform Uptime',
    system: 'Vercel / AWS CloudWatch',
    connectionMethod: 'not-connected',
    futureMethod: 'snowflake-daily',
    status: 'not-available',
    owner: 'Ben',
    priority: 'P3',
    targetDate: '2026-05-15',
    lastSync: null,
    affectedPages: ['Scorecard'],
    metricsUnlocked: 0,
    metricsTotal: 3,
    dependencies: ['Define which services to monitor', 'Choose monitoring provider'],
    notes: 'Atlas uptime, Oracle uptime, API response times. Simple availability percentage.',
  },
  {
    id: 'supplement-fulfilment',
    name: 'Supplement Fulfilment',
    system: 'TBC (Manufacturer system)',
    connectionMethod: 'not-connected',
    futureMethod: 'snowflake-daily',
    status: 'not-available',
    owner: 'Brooke',
    priority: 'P3',
    targetDate: '2026-05-30',
    lastSync: null,
    affectedPages: ['Delivery'],
    metricsUnlocked: 0,
    metricsTotal: 3,
    dependencies: ['Supplement manufacturer API or export', 'Tracking number integration'],
    notes: 'Time-to-first-pod-delivery, fulfilment accuracy, reorder tracking.',
  },
  {
    id: 'hubspot-marketing',
    name: 'HubSpot Marketing',
    system: 'HubSpot',
    connectionMethod: 'not-connected',
    futureMethod: 'snowflake-daily',
    status: 'available-not-connected',
    owner: 'Steph',
    priority: 'P2',
    targetDate: '2026-04-15',
    lastSync: null,
    affectedPages: ['Marketing', 'Acquisition'],
    metricsUnlocked: 0,
    metricsTotal: 8,
    dependencies: ['HubSpot marketing sequences active', 'UTM tracking standardised'],
    notes: 'Email open rates, sequence completion, content engagement. Separate from CRM contact data.',
  },
  {
    id: 'nps',
    name: 'NPS Survey Data',
    system: 'TBC (Typeform / Delighted / HubSpot)',
    connectionMethod: 'not-connected',
    futureMethod: 'snowflake-daily',
    status: 'not-available',
    owner: 'Emma',
    priority: 'P3',
    targetDate: '2026-06-01',
    lastSync: null,
    affectedPages: ['Retention', 'Scorecard'],
    metricsUnlocked: 0,
    metricsTotal: 3,
    dependencies: ['NPS survey tool selected', 'Survey cadence defined', 'Member ID linkage'],
    notes: 'NPS score, promoter/detractor breakdown. Feeds Q2 strategic question.',
  },
  {
    id: 'manual',
    name: 'Manual Metrics',
    system: 'Dashboard Admin',
    connectionMethod: 'manual-entry',
    futureMethod: 'manual-entry',
    status: 'live',
    owner: 'Mark',
    priority: 'P1',
    targetDate: null,
    lastSync: '2026-03-07',
    affectedPages: ['Scorecard', 'Strategy', 'EOS'],
    metricsUnlocked: 10,
    metricsTotal: 10,
    dependencies: [],
    notes: 'Targets, CAC, Rocks, strategic bets, posture choices. Always manual — these are leadership decisions, not system data.',
  },
]

// ─── Status helpers ──────────────────────────────────────────────────

function connectionStatusLabel(s: ConnectionStatus): string {
  switch (s) {
    case 'live': return 'Live'
    case 'available-not-connected': return 'Available'
    case 'source-not-ready': return 'Not ready'
    case 'not-available': return 'Not yet available'
  }
}

function connectionStatusDot(s: ConnectionStatus): Status {
  switch (s) {
    case 'live': return 'green'
    case 'available-not-connected': return 'amber'
    case 'source-not-ready': return 'red'
    case 'not-available': return 'grey'
  }
}

function priorityColor(p: Priority): string {
  switch (p) {
    case 'P1': return 'bg-status-red/10 text-status-red'
    case 'P2': return 'bg-status-amber/10 text-status-amber'
    case 'P3': return 'bg-dash-surface-alt text-dash-text-secondary'
    case 'P4': return 'bg-dash-surface-alt text-dash-text-muted'
  }
}

// ─── Mobile card for data sources ────────────────────────────────────

function DataSourceCard({ src }: { src: DataSource }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-lg border border-dash-border bg-dash-surface p-3"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusDot status={connectionStatusDot(src.status)} />
            <span className="truncate text-sm font-medium text-dash-text">{src.name}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-dash-text-muted">
            <span>{src.system}</span>
            <span>·</span>
            <span>{src.owner}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityColor(src.priority)}`}>
            {src.priority}
          </span>
          <span className="font-mono text-xs text-dash-text-secondary">
            {src.metricsUnlocked}/{src.metricsTotal}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-dash-border pt-3 text-xs text-dash-text-secondary">
          <div className="flex justify-between">
            <span>Status</span>
            <span>{connectionStatusLabel(src.status)}</span>
          </div>
          <div className="flex justify-between">
            <span>Method</span>
            <span>
              {src.connectionMethod === 'csv-upload' ? 'CSV Upload' :
               src.connectionMethod === 'manual-entry' ? 'Manual' :
               src.connectionMethod === 'api-direct' ? 'API' :
               src.connectionMethod === 'snowflake-daily' ? 'Snowflake' : 'Not connected'}
            </span>
          </div>
          {src.targetDate && (
            <div className="flex justify-between">
              <span>Target</span>
              <span className="font-mono">{src.targetDate}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-1 pt-1">
            {src.affectedPages.map(page => (
              <span key={page} className="rounded bg-dash-surface-alt px-1.5 py-0.5 text-[10px] text-dash-text-secondary">{page}</span>
            ))}
          </div>
          {src.dependencies.length > 0 && (
            <div className="pt-1 text-[11px] text-dash-text-muted">
              Blockers: {src.dependencies.join(' ; ')}
            </div>
          )}
          {src.notes && (
            <div className="pt-1 text-[11px] italic text-dash-text-muted">{src.notes}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sort helper ─────────────────────────────────────────────────────

function sortedSources() {
  return [...dataSources].sort((a, b) => {
    const pOrder: Record<Priority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 }
    const sOrder: Record<ConnectionStatus, number> = {
      'source-not-ready': 0,
      'available-not-connected': 1,
      'not-available': 2,
      'live': 3,
    }
    return (pOrder[a.priority] - pOrder[b.priority]) || (sOrder[a.status] - sOrder[b.status])
  })
}

// ─── Page ────────────────────────────────────────────────────────────

export default function DataRegistryPage() {
  const { lastRefreshed } = useDashboardData()

  const totalMetrics = dataSources.reduce((s, d) => s + d.metricsTotal, 0)
  const liveMetrics = dataSources.reduce((s, d) => s + d.metricsUnlocked, 0)
  const coveragePct = Math.round((liveMetrics / totalMetrics) * 100)
  const liveSources = dataSources.filter(d => d.status === 'live').length
  const p1Gaps = dataSources.filter(d => d.status !== 'live' && d.priority === 'P1')
  const sorted = sortedSources()

  return (
    <div className="space-y-6 md:space-y-10">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Admin', href: '/admin/upload' },
        { label: 'Data Registry' },
      ]} />

      {/* ── Summary Strip ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4">
          <span className="text-[10px] font-medium uppercase tracking-wide text-dash-text-secondary md:text-[11px]">Data Sources</span>
          <p className="mt-1 font-mono text-lg font-bold text-dash-text md:text-xl">{liveSources} / {dataSources.length}</p>
          <p className="text-[10px] text-dash-text-muted md:text-xs">connected</p>
        </div>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4">
          <span className="text-[10px] font-medium uppercase tracking-wide text-dash-text-secondary md:text-[11px]">Metrics</span>
          <p className="mt-1 font-mono text-lg font-bold text-dash-text md:text-xl">{liveMetrics} / {totalMetrics}</p>
          <p className="text-[10px] text-dash-text-muted md:text-xs">live ({coveragePct}%)</p>
        </div>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4">
          <span className="text-[10px] font-medium uppercase tracking-wide text-dash-text-secondary md:text-[11px]">P1 Gaps</span>
          <p className="mt-1 font-mono text-lg font-bold text-status-red md:text-xl">{p1Gaps.length}</p>
          <p className="text-[10px] text-dash-text-muted md:text-xs">blocking core pages</p>
        </div>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4">
          <span className="text-[10px] font-medium uppercase tracking-wide text-dash-text-secondary md:text-[11px]">Architecture</span>
          <p className="mt-1 font-mono text-lg font-bold text-dash-text md:text-xl">CSV</p>
          <p className="text-[10px] text-dash-text-muted md:text-xs">Snowflake daily (target)</p>
        </div>
      </div>

      {/* ── 01 Data Source Status ──────────────────────────────── */}
      <section>
        <SectionHeading number={1} title="Data Source Status" />

        {/* Mobile: stacked cards */}
        <div className="space-y-2 md:hidden">
          {sorted.map(src => (
            <DataSourceCard key={src.id} src={src} />
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto rounded-lg border border-dash-border md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface-alt">
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Source</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Status</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Method</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Owner</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Priority</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Target</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Metrics</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Pages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {sorted.map(src => (
                <tr key={src.id} className="group">
                  <td className="px-4 py-3">
                    <div className="font-medium text-dash-text">{src.name}</div>
                    <div className="text-[11px] text-dash-text-muted">{src.system}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusDot status={connectionStatusDot(src.status)} />
                      <span className="text-xs">{connectionStatusLabel(src.status)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-dash-text-secondary">
                      {src.connectionMethod === 'csv-upload' ? 'CSV Upload' :
                       src.connectionMethod === 'snowflake-daily' ? 'Snowflake' :
                       src.connectionMethod === 'manual-entry' ? 'Manual' :
                       src.connectionMethod === 'api-direct' ? 'API' : '—'}
                    </div>
                    {src.futureMethod !== src.connectionMethod && (
                      <div className="text-[10px] text-dash-text-muted">{'→'} {src.futureMethod === 'snowflake-daily' ? 'Snowflake Daily' : src.futureMethod}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-dash-text">{src.owner}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityColor(src.priority)}`}>
                      {src.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-dash-text-secondary">
                    {src.targetDate || (src.status === 'live' ? '✓' : '—')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-xs font-bold text-dash-text">{src.metricsUnlocked}</span>
                    <span className="text-xs text-dash-text-muted"> / {src.metricsTotal}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {src.affectedPages.map(page => (
                        <span key={page} className="rounded bg-dash-surface-alt px-1.5 py-0.5 text-[10px] text-dash-text-secondary">{page}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 02 Data Roadmap ───────────────────────────────────── */}
      <section>
        <SectionHeading number={2} title="Data Roadmap" />
        <div className="space-y-4">
          {(['P1', 'P2', 'P3', 'P4'] as const).map(priority => {
            const items = dataSources.filter(d => d.priority === priority && d.status !== 'live')
            if (items.length === 0) return null
            return (
              <div key={priority}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">
                  {priority} — {priority === 'P1' ? 'Blocks core pages' : priority === 'P2' ? 'Enhances existing pages' : priority === 'P3' ? 'New capability' : 'Future state'}
                </h3>
                <div className="space-y-2">
                  {items.map(src => (
                    <div key={src.id} className="flex items-start gap-3 rounded-lg border border-dash-border bg-dash-surface p-3 md:gap-4 md:p-4">
                      <div className="mt-1 shrink-0">
                        <StatusDot status={connectionStatusDot(src.status)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <span className="truncate font-medium text-dash-text">{src.name}</span>
                          <span className="shrink-0 font-mono text-xs text-dash-text-secondary">{src.targetDate || 'TBD'}</span>
                        </div>
                        <div className="mt-1 text-xs text-dash-text-secondary">
                          Owner: <span className="font-medium">{src.owner}</span> · Unlocks {src.metricsTotal} metrics on {src.affectedPages.join(', ')}
                        </div>
                        {src.dependencies.length > 0 && (
                          <div className="mt-1 text-[11px] text-dash-text-muted">
                            Blockers: {src.dependencies.join(' → ')}
                          </div>
                        )}
                        {src.notes && (
                          <div className="mt-1 hidden text-[11px] italic text-dash-text-muted sm:block">{src.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 03 Architecture ───────────────────────────────────── */}
      <section>
        <SectionHeading number={3} title="Target Architecture — Snowflake Daily" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <div className="space-y-4 text-sm text-dash-text-secondary">
            <div>
              <h4 className="font-semibold text-dash-text">Current State: Manual CSV Upload</h4>
              <p className="mt-1 text-xs md:text-sm">Each data source is exported manually and uploaded via Admin {'→'} Data Upload. Processing happens client-side in the browser.</p>
            </div>
            <div className="border-t border-dash-border pt-4">
              <h4 className="font-semibold text-dash-text">Target State: Snowflake Daily Pipeline</h4>
              <p className="mt-1 text-xs md:text-sm">All source systems push data into Snowflake via connectors (Fivetran / Airbyte). Snowflake runs nightly transformations (dbt) that normalise, join, and strip PII. A daily scheduled task exports a single consolidated JSON to a secure endpoint. The dashboard fetches this on page load.</p>
            </div>
            <div className="border-t border-dash-border pt-4">
              <h4 className="font-semibold text-dash-text">Data Flow</h4>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px] md:gap-2 md:text-xs">
                <span className="rounded bg-dash-surface-alt px-1.5 py-1 md:px-2">HubSpot</span>
                <span className="rounded bg-dash-surface-alt px-1.5 py-1 md:px-2">Stripe</span>
                <span className="rounded bg-dash-surface-alt px-1.5 py-1 md:px-2">Zendesk</span>
                <span className="rounded bg-dash-surface-alt px-1.5 py-1 md:px-2">Oracle</span>
                <span className="hidden rounded bg-dash-surface-alt px-1.5 py-1 sm:inline md:px-2">Meta</span>
                <span className="hidden rounded bg-dash-surface-alt px-1.5 py-1 sm:inline md:px-2">GA4</span>
                <span className="text-dash-text">{'→'}</span>
                <span className="rounded bg-status-amber/10 px-1.5 py-1 font-semibold text-status-amber md:px-2">Snowflake</span>
                <span className="text-dash-text">{'→'}</span>
                <span className="rounded bg-dash-surface-alt px-1.5 py-1 md:px-2">dbt</span>
                <span className="text-dash-text">{'→'}</span>
                <span className="rounded bg-dash-surface-alt px-1.5 py-1 md:px-2">PII stripped</span>
                <span className="text-dash-text">{'→'}</span>
                <span className="rounded bg-dash-red/10 px-1.5 py-1 font-semibold text-dash-red md:px-2">S3 / Blob</span>
                <span className="text-dash-text">{'→'}</span>
                <span className="rounded bg-status-green/10 px-1.5 py-1 font-semibold text-status-green md:px-2">Dashboard</span>
              </div>
            </div>
            <div className="border-t border-dash-border pt-4">
              <h4 className="font-semibold text-dash-text">Security Model</h4>
              <p className="mt-1 text-xs md:text-sm">The dashboard never connects to Snowflake directly. No database credentials in the frontend codebase. All data is pre-processed and PII-stripped before export. The dashboard reads a static JSON file from a secure, authenticated URL. Manual CSV upload remains available as a fallback.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

```

## `src/app/admin/settings/page.tsx`

```tsx
'use client'

import { Breadcrumb } from '@/components/layout/breadcrumb'

// ---------------------------------------------------------------------------
// Metric Targets
// ---------------------------------------------------------------------------
const metricTargets = [
  { metric: 'Active Members', currentTarget: '300' },
  { metric: 'Monthly Revenue', currentTarget: '$75,000' },
  { metric: 'Churn Rate', currentTarget: '<5%' },
  { metric: 'NPS', currentTarget: '>70' },
  { metric: 'CSAT', currentTarget: '>80%' },
  { metric: 'First Reply Time', currentTarget: '<4h' },
  { metric: 'Resolution Time', currentTarget: '<24h' },
  { metric: 'Clinical Gate Pass Rate', currentTarget: '>90%' },
]

// ---------------------------------------------------------------------------
// SLA Thresholds
// ---------------------------------------------------------------------------
const slaThresholds = [
  { label: 'First Reply Target', current: '<4h', unit: 'hours' },
  { label: 'Resolution Target', current: '<24h', unit: 'hours' },
  { label: 'CSAT Target', current: '>80%', unit: '%' },
]

// ---------------------------------------------------------------------------
// Revenue Classification Rules
// ---------------------------------------------------------------------------
const revenueRules = [
  { category: 'Joining Fee', rangeMin: 299, rangeMax: 599 },
  { category: 'Subscription', rangeMin: 99, rangeMax: 249 },
  { category: 'Supplement', rangeMin: 15, rangeMax: 98 },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Settings' },
        ]}
      />

      {/* Metric Targets */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Metric Targets
        </h2>
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Metric</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Current Target</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">New Target</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {metricTargets.map((t) => (
                <tr key={t.metric} className="bg-dash-surface/50">
                  <td className="px-4 py-2 text-dash-text">{t.metric}</td>
                  <td className="px-4 py-2 font-mono text-dash-text-secondary">
                    {t.currentTarget}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="New value"
                      className="w-full max-w-[160px] rounded-md border border-dash-border bg-dash-bg px-3 py-1.5 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button className="rounded-md border border-dash-border bg-dash-bg px-4 py-1.5 text-xs font-medium text-dash-text-secondary transition-colors hover:border-dash-red/40 hover:text-dash-red">
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Support SLA Thresholds */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Support SLA Thresholds
        </h2>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
          <div className="space-y-4">
            {slaThresholds.map((sla) => (
              <div
                key={sla.label}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
              >
                <label className="w-44 shrink-0 text-sm text-dash-text">
                  {sla.label}
                </label>
                <span className="w-28 shrink-0 font-mono text-sm text-dash-text-muted">
                  Current: {sla.current}
                </span>
                <input
                  type="text"
                  placeholder={`Value (${sla.unit})`}
                  className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red sm:max-w-[160px]"
                />
                <button className="shrink-0 rounded-md border border-dash-border bg-dash-bg px-4 py-2 text-xs font-medium text-dash-text-secondary transition-colors hover:border-dash-red/40 hover:text-dash-red">
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue Classification Rules */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Revenue Classification Rules
        </h2>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
          <div className="space-y-4">
            {revenueRules.map((rule) => (
              <div
                key={rule.category}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
              >
                <label className="w-44 shrink-0 text-sm text-dash-text">
                  {rule.category}
                </label>
                <span className="w-40 shrink-0 font-mono text-sm text-dash-text-muted">
                  ${rule.rangeMin} &ndash; ${rule.rangeMax}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-24 rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
                  />
                  <span className="text-dash-text-muted">&ndash;</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-24 rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
                  />
                </div>
                <button className="shrink-0 rounded-md border border-dash-border bg-dash-bg px-4 py-2 text-xs font-medium text-dash-text-secondary transition-colors hover:border-dash-red/40 hover:text-dash-red">
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Retention */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Data Retention
        </h2>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label className="w-44 shrink-0 text-sm text-dash-text">
              Months of Historical Data
            </label>
            <span className="w-28 shrink-0 font-mono text-sm text-dash-text-muted">
              Current: 12
            </span>
            <input
              type="number"
              placeholder="Months"
              defaultValue={12}
              className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red sm:max-w-[120px]"
            />
            <button className="shrink-0 rounded-md border border-dash-border bg-dash-bg px-4 py-2 text-xs font-medium text-dash-text-secondary transition-colors hover:border-dash-red/40 hover:text-dash-red">
              Save
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

```

## `src/app/admin/upload/page.tsx`

```tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { useDashboardData } from '@/lib/context/data-context'
import { getSchema } from '@/lib/config/data-sources'
import { processTableauTSV, type TableauMemberRaw } from '@/lib/processors/tableau-processor'
import { processHubspotCSV } from '@/lib/processors/hubspot-processor'
import { processStripeCSV } from '@/lib/processors/stripe-processor'
import { processZendeskCSV } from '@/lib/processors/zendesk-processor'
import type { Member } from '@/lib/types'
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react'

function tableauRawToMember(raw: TableauMemberRaw): Member {
  const now = new Date().toISOString()
  const caseStatus = raw.caseStatus?.toLowerCase()
  return {
    id: `tab-${raw.memberId}`,
    hubspotRecordId: null,
    firstName: '',
    lastName: '',
    displayName: `Member ${raw.memberId}`,
    email: raw.email,
    sex: null,
    ageRange: null,
    type: raw.personType === 'Customer' ? 'Customer' : raw.personType === 'Employee' ? 'Employee' : raw.personType === 'Investor' ? 'Investor' : raw.personType === 'Friend-Family' ? 'Friend-Family' : 'Customer',
    caseStatus: caseStatus === 'closed' ? 'Closed' : caseStatus === 'inactive' ? 'Inactive' : 'Open',
    createdAt: raw.createdAt ?? now,
    primaryClinician: null,
    assignedDoctor: null,
    dashboardUnlocked: raw.dashboardPublishedAt !== null,
    dashboardUnlockedAt: raw.dashboardPublishedAt,
    lastTestDate: null,
    nextRetestDate: null,
    emailSequenceTriggered: [],
    addOns: [],
    journeyStage: raw.journeyStage,
    totalRevenue: 0,
    transactionCount: 0,
    firstPaymentDate: raw.firstPurchaseDate,
    lastPaymentDate: null,
    mrr: 0,
    ticketCount: 0,
    openTickets: 0,
    avgResolutionTime: null,
    lastTicketDate: null,
    csat: null,
    healthScore: 'unknown',
    riskFlags: [],
    daysSinceRegistration: raw.createdAt ? Math.floor((Date.now() - new Date(raw.createdAt).getTime()) / 86400000) : 0,
    betterTomorrows: 0,
    isVIP: false,
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SourceKey = 'tableau' | 'hubspot' | 'stripe' | 'zendesk'

interface UploadState {
  status: 'idle' | 'validating' | 'preview' | 'processing' | 'success' | 'error'
  fileName?: string
  rowCount?: number
  columnCount?: number
  preview?: string[][]
  errors?: string[]
  resultCount?: number
}

interface DataSourceConfig {
  key: SourceKey
  name: string
  recordLabel: string
  columnLabel: string
  note?: string
  exportInstructions?: string
}

const dataSources: DataSourceConfig[] = [
  {
    key: 'tableau',
    name: 'TABLEAU',
    recordLabel: 'members',
    columnLabel: 'measures',
    note: 'TSV file with UTF-16 encoding handled automatically',
  },
  {
    key: 'hubspot',
    name: 'HUBSPOT',
    recordLabel: 'records',
    columnLabel: 'columns',
  },
  {
    key: 'stripe',
    name: 'STRIPE',
    recordLabel: 'transactions',
    columnLabel: 'columns',
  },
  {
    key: 'zendesk',
    name: 'ZENDESK',
    recordLabel: 'records',
    columnLabel: 'columns',
    exportInstructions: 'Admin Center → Account → Tools → Reports → CSV Export',
  },
]

// ---------------------------------------------------------------------------
// Upload Card Component
// ---------------------------------------------------------------------------

function UploadCard({ source }: { source: DataSourceConfig }) {
  const { lastRefreshed, updateSource } = useDashboardData()
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const fileRef = useRef<HTMLInputElement>(null)

  const lastRefresh = lastRefreshed[source.key]

  const readFileContent = useCallback(async (file: File): Promise<string> => {
    // For Tableau TSV: detect and handle UTF-16LE
    if (source.key === 'tableau') {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      // Check for UTF-16 BOM (FF FE)
      if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
        return new TextDecoder('utf-16le').decode(buffer)
      }
      // Check for UTF-16 BE BOM (FE FF)
      if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
        return new TextDecoder('utf-16be').decode(buffer)
      }
    }
    return file.text()
  }, [source.key])

  const validateColumns = useCallback((headers: string[], sourceKey: SourceKey): string[] => {
    const schema = getSchema(sourceKey)
    if (!schema) return []
    const missing = schema.requiredColumns.filter(
      (col) => !headers.some((h) => h.trim() === col)
    )
    return missing
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setState({ status: 'validating', fileName: file.name })

    try {
      let content: string

      // XLSX support: convert to CSV first
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        content = XLSX.utils.sheet_to_csv(firstSheet)
      } else {
        content = await readFileContent(file)
      }

      if (source.key === 'tableau') {
        // TSV processing
        let text = content
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
        const lines = text.split(/\r?\n/).filter((l) => l.trim())
        if (lines.length < 2) {
          setState({ status: 'error', fileName: file.name, errors: ['File is empty or has no data rows'] })
          return
        }
        const headers = lines[0].split('\t').map((h) => h.trim())
        const missing = validateColumns(headers, 'tableau')
        if (missing.length > 0) {
          setState({ status: 'error', fileName: file.name, errors: [`Missing columns: ${missing.join(', ')}`] })
          return
        }
        // Preview
        const previewRows = lines.slice(1, 4).map((l) => l.split('\t').slice(0, 5))
        setState({
          status: 'preview',
          fileName: file.name,
          rowCount: lines.length - 1,
          columnCount: headers.length,
          preview: [headers.slice(0, 5), ...previewRows],
        })

        // Process
        setState((prev) => ({ ...prev, status: 'processing' }))
        const rawMembers = processTableauTSV(content)
        const members = rawMembers.map(tableauRawToMember)
        updateSource('tableau', { members })
        setState({
          status: 'success',
          fileName: file.name,
          resultCount: members.length,
          rowCount: lines.length - 1,
          columnCount: headers.length,
        })
      } else {
        // CSV processing with PapaParse
        Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as Record<string, string>[]
            if (data.length === 0) {
              setState({ status: 'error', fileName: file.name, errors: ['File contains no data rows'] })
              return
            }
            const headers = Object.keys(data[0])
            const missing = validateColumns(headers, source.key)
            if (missing.length > 0) {
              setState({ status: 'error', fileName: file.name, errors: [`Missing columns: ${missing.join(', ')}`] })
              return
            }
            // Preview
            const previewHeaders = headers.slice(0, 5)
            const previewRows = data.slice(0, 3).map((row) => previewHeaders.map((h) => row[h] || ''))
            setState({
              status: 'preview',
              fileName: file.name,
              rowCount: data.length,
              columnCount: headers.length,
              preview: [previewHeaders, ...previewRows],
            })

            // Process
            setState((prev) => ({ ...prev, status: 'processing' }))
            try {
              if (source.key === 'hubspot') {
                const members = processHubspotCSV(data)
                updateSource('hubspot', { members })
                setState({ status: 'success', fileName: file.name, resultCount: members.length, rowCount: data.length, columnCount: headers.length })
              } else if (source.key === 'stripe') {
                const transactions = processStripeCSV(data)
                updateSource('stripe', { transactions })
                setState({ status: 'success', fileName: file.name, resultCount: transactions.length, rowCount: data.length, columnCount: headers.length })
              } else if (source.key === 'zendesk') {
                const tickets = processZendeskCSV(data)
                updateSource('zendesk', { tickets })
                setState({ status: 'success', fileName: file.name, resultCount: tickets.length, rowCount: data.length, columnCount: headers.length })
              }
            } catch (err) {
              setState({ status: 'error', fileName: file.name, errors: [`Processing error: ${err instanceof Error ? err.message : String(err)}`] })
            }
          },
          error: (err: Error) => {
            setState({ status: 'error', fileName: file.name, errors: [`Parse error: ${err.message}`] })
          },
        })
      }
    } catch (err) {
      setState({ status: 'error', fileName: file.name, errors: [`Read error: ${err instanceof Error ? err.message : String(err)}`] })
    }
  }, [source.key, readFileContent, validateColumns, updateSource])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so the same file can be re-uploaded
    if (fileRef.current) fileRef.current.value = ''
  }, [handleFile])

  return (
    <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-dash-text">
          {source.name}
        </h3>
        <DataSourceBadge source={source.key} />
      </div>

      {/* Last refreshed */}
      <p className="mt-2 text-xs text-dash-text-muted">
        Last refreshed:{' '}
        <span className="text-dash-text-secondary">
          {lastRefresh ? new Date(lastRefresh).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
        </span>
      </p>

      {/* Upload button */}
      <div className="mt-4 flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-dash-red px-3 py-2 text-xs font-medium text-dash-text-inverse transition-colors hover:bg-dash-red/90">
          <Upload size={14} />
          Upload CSV/TSV
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls"
            className="hidden"
            onChange={onFileChange}
          />
        </label>
        <button
          onClick={() => {
            const schema = getSchema(source.key)
            if (schema) {
              alert(`Required columns:\n${schema.requiredColumns.join('\n')}`)
            }
          }}
          className="rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-xs font-medium text-dash-text-secondary transition-colors hover:border-dash-border-strong hover:text-dash-text"
        >
          View schema
        </button>
      </div>

      {/* Status feedback */}
      <div className="mt-4">
        {state.status === 'idle' && !lastRefresh && (
          <p className="text-xs italic text-dash-text-muted">Awaiting first upload</p>
        )}

        {state.status === 'idle' && lastRefresh && state.resultCount && (
          <p className="text-xs text-dash-text-secondary">
            <span className="font-mono font-medium text-dash-text">{state.resultCount}</span>{' '}
            {source.recordLabel} processed
          </p>
        )}

        {state.status === 'validating' && (
          <p className="text-xs text-dash-text-secondary">
            Validating <span className="font-mono">{state.fileName}</span>...
          </p>
        )}

        {state.status === 'processing' && (
          <p className="text-xs text-dash-text-secondary">Processing data...</p>
        )}

        {state.status === 'success' && (
          <div className="flex items-start gap-2 rounded-md bg-status-green-light px-3 py-2">
            <CheckCircle size={14} className="mt-0.5 shrink-0 text-status-green" />
            <div className="text-xs">
              <p className="font-medium text-status-green">Upload successful</p>
              <p className="text-dash-text-secondary">
                Processed <span className="font-mono font-medium text-dash-text">{state.resultCount}</span>{' '}
                {source.recordLabel} from{' '}
                <span className="font-mono font-medium text-dash-text">{state.rowCount}</span> rows,{' '}
                <span className="font-mono font-medium text-dash-text">{state.columnCount}</span>{' '}
                {source.columnLabel}
              </p>
            </div>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex items-start gap-2 rounded-md bg-status-red-light px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-red" />
            <div className="text-xs">
              <p className="font-medium text-status-red">Upload failed</p>
              {state.errors?.map((err, i) => (
                <p key={i} className="text-dash-text-secondary">{err}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Note / Export instructions */}
      {source.note && (
        <p className="mt-2 text-xs italic text-dash-text-muted">{source.note}</p>
      )}
      {source.exportInstructions && (
        <p className="mt-2 text-xs text-dash-text-muted">
          Export:{' '}
          <span className="font-mono text-dash-text-secondary">
            {source.exportInstructions}
          </span>
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function UploadPage() {
  const { dataMode, lastRefreshed } = useDashboardData()

  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Data Upload' },
        ]}
      />

      {/* Sample data banner */}
      {dataMode === 'demo' && (
        <div className="rounded-lg border border-status-amber/30 bg-status-amber-light px-4 py-3">
          <p className="font-sans text-sm text-status-amber">
            Currently displaying demo data. Upload real CSV files and switch to Actual mode.
          </p>
        </div>
      )}
      {dataMode === 'actual' && (
        <div className="rounded-lg border border-dash-border bg-dash-surface px-4 py-3">
          <p className="text-sm text-dash-text-secondary">
            Showing real data &mdash; last updated:{' '}
            {Object.entries(lastRefreshed)
              .filter(([, ts]) => ts)
              .map(([src, ts]) => `${src}: ${new Date(ts!).toLocaleDateString('en-AU')}`)
              .join(' · ') || 'no uploads yet'}
          </p>
        </div>
      )}

      {/* Data Source Cards */}
      <SectionHeading number={1} title="Data Sources" />
      <div className="grid gap-6 lg:grid-cols-2">
        {dataSources.map((src) => (
          <UploadCard key={src.key} source={src} />
        ))}
      </div>
    </div>
  )
}

```

## `src/app/api/data/history/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const source = request.nextUrl.searchParams.get('source')
    const supabase = createClient()
    let query = supabase.from('upload_log').select('*').order('uploaded_at', { ascending: false }).limit(50)
    if (source) query = query.eq('source', source)
    const { data: rows } = await query
    if (source) return NextResponse.json({ source, versions: (rows || []).map(r => ({ timestamp: r.uploaded_at, recordCount: r.record_count })) })
    return NextResponse.json(rows || [])
  } catch (err) {
    return NextResponse.json({})
  }
}

```

## `src/app/api/data/latest/route.ts`

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/service'

const SOURCES = ['tableau', 'hubspot', 'stripe', 'zendesk']

export async function GET() {
  try {
    const supabase = createClient()
    const result: Record<string, unknown> = {}
    for (const source of SOURCES) {
      const { data: rows } = await supabase
        .from('upload_log')
        .select('*')
        .eq('source', source)
        .order('uploaded_at', { ascending: false })
        .limit(1)
      if (rows && rows.length > 0) result[source] = { data: rows[0].data, timestamp: rows[0].uploaded_at }
    }
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({}, { status: 500 })
  }
}

```

## `src/app/api/data/upload/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const { source, data } = await request.json()
    if (!source || !data) return NextResponse.json({ error: 'Missing source or data' }, { status: 400 })
    const supabase = createClient()
    const record_count = Array.isArray(data) ? data.length : 1
    const { error } = await supabase.from('upload_log').insert({ source, record_count, data })
    if (error) throw error
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

```

## `src/app/api/full-code/route.ts`

```ts
import { NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join, relative, extname } from 'path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

const LANG_MAP: Record<string, string> = {
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.css': 'css',
  '.mjs': 'javascript',
  '.js': 'javascript',
  '.json': 'json',
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full)))
    } else {
      const ext = extname(entry.name)
      if (LANG_MAP[ext]) files.push(full)
    }
  }
  return files.sort()
}

export async function GET() {
  try {
    const lines: string[] = []
    lines.push('# TMRW Dashboard — Full Source Code')
    lines.push('')
    lines.push(`Generated: ${new Date().toISOString()}`)
    lines.push('')
    lines.push('---')
    lines.push('')

    // Root config files
    const rootConfigs = ['package.json', 'tsconfig.json', 'postcss.config.mjs', 'next.config.mjs', 'tailwind.config.ts']
    for (const name of rootConfigs) {
      try {
        const content = await readFile(join(ROOT, name), 'utf-8')
        const ext = extname(name)
        const lang = LANG_MAP[ext] || ''
        lines.push(`## \`${name}\``)
        lines.push('')
        lines.push(`\`\`\`${lang}`)
        lines.push(content.trimEnd())
        lines.push('```')
        lines.push('')
      } catch {
        // file doesn't exist, skip
      }
    }

    // All src files
    const srcFiles = await collectFiles(SRC)
    for (const file of srcFiles) {
      const rel = relative(ROOT, file)
      const ext = extname(file)
      const lang = LANG_MAP[ext] || ''
      const content = await readFile(file, 'utf-8')
      lines.push(`## \`${rel}\``)
      lines.push('')
      lines.push(`\`\`\`${lang}`)
      lines.push(content.trimEnd())
      lines.push('```')
      lines.push('')
    }

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

```

## `src/app/api/priorities/archive/route.ts`

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: rows } = await supabase
      .from('upload_log')
      .select('uploaded_at, record_count, data')
      .eq('source', 'priorities')
      .order('uploaded_at', { ascending: false })
      .limit(52)
    return NextResponse.json((rows || []).map(r => ({ weekKey: r.data?.weekKey, weekOf: r.data?.weekOf, uploadedAt: r.uploaded_at })))
  } catch { return NextResponse.json([]) }
}

```

## `src/app/api/priorities/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: rows } = await supabase
      .from('upload_log')
      .select('*')
      .eq('source', 'priorities')
      .order('uploaded_at', { ascending: false })
      .limit(1)
    if (!rows || rows.length === 0) return NextResponse.json(null)
    return NextResponse.json(rows[0].data)
  } catch { return NextResponse.json(null) }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { weekOf, priorities } = body
    if (!weekOf || !priorities) return NextResponse.json({ error: 'Missing weekOf or priorities' }, { status: 400 })
    const supabase = createClient()
    const { error } = await supabase.from('upload_log').insert({ source: 'priorities', record_count: 1, data: { ...priorities, weekOf } })
    if (error) throw error
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

```

## `src/app/auth/callback/route.ts`

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/admin/upload'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

```

## `src/app/auth/update-password/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/admin/upload')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dash-bg">
      <div className="w-full max-w-sm rounded-lg border border-dash-border bg-dash-surface p-8">
        <h1 className="mb-6 font-sans text-lg font-semibold text-dash-text">Set new password</h1>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-dash-text-secondary">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
            />
          </div>
          {error && <p className="text-xs text-status-red">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-dash-red px-4 py-2 text-sm font-medium text-white hover:bg-dash-red/90 disabled:opacity-50"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}

```

## `src/app/board-pack/page.tsx`

```tsx
'use client'

import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { StatusDot } from '@/components/dashboard/status-dot'
import { ChartPeriodToggle } from '@/components/dashboard/chart-period-toggle'
import { TmrwLineChart } from '@/components/dashboard/tmrw-line-chart'
import { TmrwAreaChart } from '@/components/dashboard/tmrw-area-chart'
import {
  ResponsiveContainer,
  BarChart as RechartBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridProps, tooltipStyle, legendStyle, TMRW_COLORS } from '@/lib/utils/chart-styles'
import { useDashboardData } from '@/lib/context/data-context'

// ---------------------------------------------------------------------------
// Static data for board pack charts
// ---------------------------------------------------------------------------
const MONTHS = ['Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026']

const memberGrowthData = [
  { month: 'Sep 2025', Actual: 25, Forecast: 43 },
  { month: 'Oct 2025', Actual: 55, Forecast: 98 },
  { month: 'Nov 2025', Actual: 95, Forecast: 168 },
  { month: 'Dec 2025', Actual: 140, Forecast: 257 },
  { month: 'Jan 2026', Actual: 210, Forecast: 370 },
  { month: 'Feb 2026', Actual: 269, Forecast: 514 },
]

const revenueActualVsForecast = [
  { month: 'Sep 2025', Actual: 6800, Forecast: 8000 },
  { month: 'Oct 2025', Actual: 8900, Forecast: 10500 },
  { month: 'Nov 2025', Actual: 10500, Forecast: 13000 },
  { month: 'Dec 2025', Actual: 12100, Forecast: 16000 },
  { month: 'Jan 2026', Actual: 19500, Forecast: 22000 },
  { month: 'Feb 2026', Actual: 23499, Forecast: 28000 },
]

const revenueComposition = MONTHS.map((month, i) => ({
  month,
  'Joining Fee': [2500, 3100, 3800, 4200, 5500, 5400][i],
  Subscription: [3200, 4100, 4800, 5600, 9800, 12500][i],
  Supplement: [800, 1200, 1400, 1700, 3000, 4200][i],
  Other: [300, 500, 500, 600, 1200, 1399][i],
}))

const cohortRetention = [
  { month: 'Month 0', 'Sep 2025': 100, 'Oct 2025': 100, 'Nov 2025': 100, 'Dec 2025': 100, 'Jan 2026': 100, 'Feb 2026': 100 },
  { month: 'Month 1', 'Sep 2025': 92, 'Oct 2025': 90, 'Nov 2025': 88, 'Dec 2025': 90, 'Jan 2026': 92, 'Feb 2026': 92 },
  { month: 'Month 2', 'Sep 2025': 85, 'Oct 2025': 86, 'Nov 2025': 82, 'Dec 2025': 85, 'Jan 2026': 85 },
  { month: 'Month 3', 'Sep 2025': 82, 'Oct 2025': 84, 'Nov 2025': 75, 'Dec 2025': 80 },
  { month: 'Month 4', 'Sep 2025': 80, 'Oct 2025': 82 },
  { month: 'Month 5', 'Sep 2025': 78 },
]

const pipelineQueueTrend = MONTHS.map((month, i) => ({
  month,
  'Queue Size': [35, 40, 45, 52, 60, 67][i],
}))

const deliverySpeedByCohort = MONTHS.map((month, i) => ({
  month,
  'Days to Dashboard': [120, 115, 108, 102, 95, 85][i],
  Target: 30,
}))

const capacityForecast = [
  { month: 'Jan 2026', Demand: 480, Capacity: 554 },
  { month: 'Feb 2026', Demand: 510, Capacity: 554 },
  { month: 'Mar 2026', Demand: 530, Capacity: 554 },
  { month: 'Apr 2026', Demand: 545, Capacity: 664 },
  { month: 'May 2026', Demand: 570, Capacity: 664 },
  { month: 'Jun 2026', Demand: 600, Capacity: 664 },
]

const cmPerMemberTrend = MONTHS.map((month, i) => ({
  month,
  'CM/Member': [35, 40, 42, 48, 52, 56][i],
  Target: 80,
}))

// Strategic question summaries
const strategicHealth = [
  { q: 'Prove it works', status: 'grey' as const, metric: 'TBC' },
  { q: 'Customers love it', status: 'amber' as const, metric: '78% ret' },
  { q: 'Defensible moat', status: 'red' as const, metric: '0 partners' },
  { q: 'Deliver reliably', status: 'red' as const, metric: '98d avg' },
  { q: 'Economics right', status: 'amber' as const, metric: '94% NRR' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BoardPackPage() {
  const [growthPeriod, setGrowthPeriod] = useState('monthly')
  const [revenuePeriod, setRevenuePeriod] = useState('monthly')
  const [compPeriod, setCompPeriod] = useState('monthly')

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Board Pack' }]} />
          <h1 className="mt-2 font-sans text-xl font-bold text-dash-text">
            BOARD PACK — March 2026
          </h1>
        </div>
      </div>

      {/* ── 01 Strategic Health ──────────────────────────────────── */}
      <section>
        <SectionHeading number={1} title="Strategic Health" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {strategicHealth.map((q, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-dash-border bg-dash-surface px-4 py-3">
              <StatusDot status={q.status} />
              <div>
                <p className="text-xs font-medium text-dash-text">{q.q}</p>
                <p className="font-mono text-sm text-dash-text-secondary">{q.metric}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 02 Member Growth ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <SectionHeading number={2} title="Member Growth" />
          <ChartPeriodToggle
            options={[{ label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' }, { label: 'YTD', value: 'ytd' }]}
            selected={growthPeriod}
            onChange={setGrowthPeriod}
          />
        </div>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <TmrwLineChart
            data={memberGrowthData}
            index="month"
            series={[
              { dataKey: 'Actual', color: TMRW_COLORS.red },
              { dataKey: 'Forecast', color: TMRW_COLORS.grey, dashed: true },
            ]}
            height={288}
            className="h-56 md:h-72"
            yAxisWidth={40}
          />
        </div>
      </section>

      {/* ── 03 Revenue ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <SectionHeading number={3} title="Revenue" />
          <ChartPeriodToggle
            options={[{ label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' }, { label: 'YTD', value: 'ytd' }]}
            selected={revenuePeriod}
            onChange={setRevenuePeriod}
          />
        </div>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <ResponsiveContainer width="100%" height={288} className="h-56 md:h-72">
            <RechartBarChart data={revenueActualVsForecast}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={48} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${(Number(v) / 1000).toFixed(1)}K`} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="Actual" fill={TMRW_COLORS.red} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Forecast" fill={TMRW_COLORS.grey} radius={[4, 4, 0, 0]} />
            </RechartBarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── 04 Revenue Composition ───────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <SectionHeading number={4} title="Revenue Composition" />
          <ChartPeriodToggle
            options={[{ label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' }]}
            selected={compPeriod}
            onChange={setCompPeriod}
          />
        </div>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <TmrwAreaChart
            data={revenueComposition}
            index="month"
            series={[
              { dataKey: 'Joining Fee', color: TMRW_COLORS.red },
              { dataKey: 'Subscription', color: TMRW_COLORS.blue },
              { dataKey: 'Supplement', color: TMRW_COLORS.green },
              { dataKey: 'Other', color: TMRW_COLORS.amber },
            ]}
            height={288}
            className="h-56 md:h-72"
            yAxisWidth={48}
            valueFormatter={(v) => `$${(v / 1000).toFixed(1)}K`}
          />
        </div>
      </section>

      {/* ── 05 Retention ─────────────────────────────────────────── */}
      <section>
        <SectionHeading number={5} title="Retention" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Cohort Retention Curves — Last 6 Monthly Cohorts
          </h3>
          <TmrwLineChart
            data={cohortRetention}
            index="month"
            series={[
              { dataKey: 'Sep 2025', color: '#8B0000' },
              { dataKey: 'Oct 2025', color: '#D97706' },
              { dataKey: 'Nov 2025', color: '#EAB308' },
              { dataKey: 'Dec 2025', color: '#16A34A' },
              { dataKey: 'Jan 2026', color: '#0891B2' },
              { dataKey: 'Feb 2026', color: '#7C3AED' },
            ]}
            height={288}
            className="h-56 md:h-72"
            yAxisWidth={40}
            valueFormatter={(v) => `${v}%`}
            connectNulls={false}
          />
        </div>
      </section>

      {/* ── 06 Operational Delivery ──────────────────────────────── */}
      <section>
        <SectionHeading number={6} title="Operational Delivery" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">Pipeline Queue Trend</h3>
            <TmrwLineChart
              data={pipelineQueueTrend}
              index="month"
              series={[
                { dataKey: 'Queue Size', color: TMRW_COLORS.red },
              ]}
              height={224}
              className="h-44 md:h-56"
              yAxisWidth={30}
              showLegend={false}
            />
          </div>
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">Delivery Speed by Cohort</h3>
            <TmrwLineChart
              data={deliverySpeedByCohort}
              index="month"
              series={[
                { dataKey: 'Days to Dashboard', color: TMRW_COLORS.red },
                { dataKey: 'Target', color: TMRW_COLORS.grey, dashed: true },
              ]}
              height={224}
              className="h-44 md:h-56"
              yAxisWidth={30}
              valueFormatter={(v) => `${v}d`}
            />
          </div>
        </div>
      </section>

      {/* ── 07 Clinical Capacity ─────────────────────────────────── */}
      <section>
        <SectionHeading number={7} title="Clinical Capacity" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Demand vs Capacity (+1 Clinician in April Scenario)
          </h3>
          <TmrwLineChart
            data={capacityForecast}
            index="month"
            series={[
              { dataKey: 'Demand', color: TMRW_COLORS.red },
              { dataKey: 'Capacity', color: TMRW_COLORS.green },
            ]}
            height={256}
            className="h-48 md:h-64"
            yAxisWidth={48}
          />
        </div>
      </section>

      {/* ── 08 Unit Economics ────────────────────────────────────── */}
      <section>
        <SectionHeading number={8} title="Unit Economics" />
        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <MetricCard label="CM/Member (Current)" value="$56" status="amber" target=">$80" sparkline={[35, 40, 42, 48, 52, 56]} />
          <MetricCard label="LTV:CAC Ratio" value="3.2:1" status="green" target=">3:1" sparkline={[2.1, 2.4, 2.7, 2.9, 3.0, 3.2]} />
        </div>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">CM/Member Monthly with Target</h3>
          <TmrwLineChart
            data={cmPerMemberTrend}
            index="month"
            series={[
              { dataKey: 'CM/Member', color: TMRW_COLORS.red },
              { dataKey: 'Target', color: TMRW_COLORS.grey, dashed: true },
            ]}
            height={224}
            className="h-44 md:h-56"
            yAxisWidth={40}
            valueFormatter={(v) => `$${v}`}
          />
        </div>
      </section>
    </div>
  )
}

```

## `src/app/clinical/page.tsx`

```tsx
'use client'

import React, { useState, useMemo, Fragment } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { AlertCard } from '@/components/dashboard/alert-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { ChartPeriodToggle } from '@/components/dashboard/chart-period-toggle'
import { ClinicianDetailPanel } from '@/components/panels/clinician-detail-panel'
import { MemberDetailPanel } from '@/components/panels/member-detail-panel'
import {
  ResponsiveContainer,
  LineChart as RechartLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridStyle, tooltipStyle, legendStyle, lineDot, TMRW_COLORS } from '@/lib/utils/chart-styles'
import { Sparkline } from '@/components/dashboard/sparkline'
import { TrendIndicator } from '@/components/dashboard/trend-indicator'
import { StatusDot } from '@/components/dashboard/status-dot'
import { cn } from '@/lib/utils'
import { useDashboardData } from '@/lib/context/data-context'
import type { Clinician, Member, Status } from '@/lib/types'

// ═══════════════════════════════════════════════════════════════════════
// 01 Journey Pipeline — Kanban Flow
// ═══════════════════════════════════════════════════════════════════════

interface PipelineStage {
  id: string
  label: string
  shortLabel: string
  phase: 'onboarding' | 'insights' | 'ongoing' | 'retest'
  memberCount: number
  medianDwellDays: number | null
  targetDwellDays: number | null
  trend: number
  oracleStage: string
  dataSource: 'tableau' | 'hubspot' | 'oracle' | 'derived'
  isBottleneck: boolean
}

const pipelineStages: PipelineStage[] = [
  { id: 'registered', label: 'Registered', shortLabel: 'Reg', phase: 'onboarding', memberCount: 18, medianDwellDays: 2, targetDwellDays: 1, trend: +3, oracleStage: 'Registration Complete', dataSource: 'tableau', isBottleneck: false },
  { id: 'clinician-assigned', label: 'Clinician Assigned', shortLabel: 'Assigned', phase: 'onboarding', memberCount: 12, medianDwellDays: 1, targetDwellDays: 1, trend: 0, oracleStage: 'Clinician Allocated', dataSource: 'hubspot', isBottleneck: false },
  { id: 'health-story', label: 'Health Story', shortLabel: 'HS', phase: 'onboarding', memberCount: 16, medianDwellDays: 4, targetDwellDays: 3, trend: -2, oracleStage: 'Health Story Submitted', dataSource: 'oracle', isBottleneck: false },
  { id: 'kit-transit', label: 'Kit in Transit', shortLabel: 'Kit', phase: 'onboarding', memberCount: 22, medianDwellDays: 5, targetDwellDays: 3, trend: +1, oracleStage: 'Kit Dispatched', dataSource: 'oracle', isBottleneck: false },
  { id: 'sample-collection', label: 'Sample Collection', shortLabel: 'Sample', phase: 'onboarding', memberCount: 14, medianDwellDays: 8, targetDwellDays: 7, trend: 0, oracleStage: 'Sample Received', dataSource: 'oracle', isBottleneck: false },
  { id: 'lab-processing', label: 'Lab Processing', shortLabel: 'Lab', phase: 'onboarding', memberCount: 23, medianDwellDays: 21, targetDwellDays: 14, trend: +2, oracleStage: 'Awaiting Results', dataSource: 'tableau', isBottleneck: true },
  { id: 'clinical-review', label: 'Clinical Review', shortLabel: 'Review', phase: 'onboarding', memberCount: 18, medianDwellDays: 5, targetDwellDays: 2, trend: +3, oracleStage: 'Clinical Review Complete', dataSource: 'oracle', isBottleneck: true },
  { id: 'doctor-signoff', label: 'Doctor Sign-off', shortLabel: 'Dr Sign', phase: 'onboarding', memberCount: 12, medianDwellDays: 4, targetDwellDays: 1, trend: +1, oracleStage: 'Doctor Sign-off', dataSource: 'oracle', isBottleneck: true },
  { id: 'dashboard-prep', label: 'Dashboard Prep', shortLabel: 'Prep', phase: 'onboarding', memberCount: 19, medianDwellDays: 3, targetDwellDays: 1, trend: -1, oracleStage: 'Report Prepared', dataSource: 'oracle', isBottleneck: true },
  { id: 'dashboard-live', label: 'Dashboard Live', shortLabel: 'Live', phase: 'insights', memberCount: 61, medianDwellDays: 14, targetDwellDays: 7, trend: +5, oracleStage: 'Dashboard Live', dataSource: 'tableau', isBottleneck: true },
  { id: 'insights-call', label: 'Insights Call', shortLabel: 'Insights', phase: 'insights', memberCount: 1, medianDwellDays: null, targetDwellDays: 3, trend: 0, oracleStage: 'Insights Call Complete', dataSource: 'oracle', isBottleneck: false },
  { id: 'active-plan', label: 'Active Plan', shortLabel: 'Active', phase: 'ongoing', memberCount: 46, medianDwellDays: null, targetDwellDays: null, trend: +4, oracleStage: 'Ongoing Monitoring', dataSource: 'tableau', isBottleneck: false },
  { id: 'retest-due', label: 'Retest Due', shortLabel: 'Retest', phase: 'retest', memberCount: 5, medianDwellDays: null, targetDwellDays: null, trend: +2, oracleStage: 'Retest Initiated', dataSource: 'oracle', isBottleneck: false },
]

const PHASE_COLORS = {
  onboarding: '#2D6A4F',
  insights: '#92400E',
  ongoing: '#3D5B6B',
  retest: '#5B4A6B',
}

// ═══════════════════════════════════════════════════════════════════════
// 02 Clinical Activity Report
// ═══════════════════════════════════════════════════════════════════════

interface ClinicalActivity {
  id: string
  label: string
  category: 'clinical' | 'operational' | 'member'
  today: number
  thisWeek: number
  lastWeek: number
  thisMonth: number
  trailing4wAvg: number
  sparkline: number[]
  target: number | null
  dataSource: 'oracle' | 'hubspot' | 'tableau' | 'derived'
  owner: string
}

const clinicalActivities: ClinicalActivity[] = [
  { id: 'health-stories', label: 'Health Stories Completed', category: 'clinical', today: 2, thisWeek: 8, lastWeek: 7, thisMonth: 32, trailing4wAvg: 7.5, sparkline: [1,2,1,3,2,1,2,3,1,2,2,1,3,2,1,2,3,1,2,2,1,3,2,1,2,3,1,2,2,2], target: 3, dataSource: 'oracle', owner: 'Clinical Team' },
  { id: 'welcome-calls', label: 'Welcome Calls Completed', category: 'clinical', today: 1, thisWeek: 5, lastWeek: 4, thisMonth: 22, trailing4wAvg: 5.0, sparkline: [1,1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1,1,1], target: 2, dataSource: 'oracle', owner: 'Clinical Team' },
  { id: 'clinical-reviews', label: 'Clinical Reviews Completed', category: 'clinical', today: 3, thisWeek: 12, lastWeek: 10, thisMonth: 45, trailing4wAvg: 10.5, sparkline: [2,1,3,2,1,2,3,2,1,2,3,2,1,3,2,2,1,3,2,1,2,3,2,1,2,3,2,1,3,3], target: 3, dataSource: 'oracle', owner: 'Clinical Team' },
  { id: 'doctor-signoffs', label: 'Doctor Sign-offs', category: 'clinical', today: 2, thisWeek: 10, lastWeek: 8, thisMonth: 38, trailing4wAvg: 9.0, sparkline: [1,2,1,1,2,1,2,1,1,2,1,2,1,1,2,2,1,2,1,1,2,1,2,1,1,2,1,2,2,2], target: 3, dataSource: 'oracle', owner: 'Dr Mohan / Dr Team' },
  { id: 'dashboards-published', label: 'Dashboards Published', category: 'clinical', today: 1, thisWeek: 8, lastWeek: 5, thisMonth: 28, trailing4wAvg: 6.5, sparkline: [0,1,1,0,1,0,1,1,0,1,1,0,1,1,0,1,2,1,1,0,1,2,1,1,1,2,1,1,1,1], target: 3, dataSource: 'tableau', owner: 'Clinical Team' },
  { id: 'insights-calls', label: 'Insights Calls Completed', category: 'clinical', today: 0, thisWeek: 1, lastWeek: 0, thisMonth: 3, trailing4wAvg: 0.5, sparkline: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0], target: 5, dataSource: 'oracle', owner: 'Clinical Team' },
  { id: 'supplement-protocols', label: 'Supplement Protocols Created', category: 'clinical', today: 2, thisWeek: 9, lastWeek: 7, thisMonth: 35, trailing4wAvg: 8.0, sparkline: [1,1,2,1,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,2,2,2], target: 3, dataSource: 'oracle', owner: 'Clinical Team' },
  { id: 'kits-dispatched', label: 'Kits Dispatched', category: 'operational', today: 3, thisWeek: 14, lastWeek: 12, thisMonth: 52, trailing4wAvg: 13.0, sparkline: [1,2,2,1,2,2,1,2,2,2,1,2,2,1,2,3,2,1,2,2,2,3,2,1,2,3,2,2,3,3], target: null, dataSource: 'oracle', owner: 'Operations' },
  { id: 'kit-qc-failures', label: 'Kit QC Failures', category: 'operational', today: 0, thisWeek: 2, lastWeek: 3, thisMonth: 8, trailing4wAvg: 2.5, sparkline: [0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,0,0,0], target: null, dataSource: 'oracle', owner: 'Operations' },
  { id: 'results-received', label: 'Lab Results Received', category: 'operational', today: 4, thisWeek: 15, lastWeek: 13, thisMonth: 55, trailing4wAvg: 14.0, sparkline: [1,2,2,1,2,2,2,1,2,2,2,1,2,3,2,1,2,2,2,3,2,1,2,3,2,2,3,2,4,4], target: null, dataSource: 'oracle', owner: 'Lab / External' },
  { id: 'supplement-purchases', label: 'Supplement Purchases', category: 'member', today: 1, thisWeek: 6, lastWeek: 5, thisMonth: 24, trailing4wAvg: 5.5, sparkline: [0,1,1,0,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,1,0,1,1,0,1,1,0,1,1], target: null, dataSource: 'oracle', owner: 'Member-initiated' },
  { id: 'ad-hoc-support', label: 'Ad-hoc Clinician Requests', category: 'member', today: 2, thisWeek: 8, lastWeek: 6, thisMonth: 30, trailing4wAvg: 7.0, sparkline: [1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,2,1,1,1,0,1,2,1,1,1,2,1,2,2], target: null, dataSource: 'oracle', owner: 'Clinical Team' },
]

// ═══════════════════════════════════════════════════════════════════════
// 03 Stage Conversion & Timing
// ═══════════════════════════════════════════════════════════════════════

interface StageTransition {
  from: string
  to: string
  conversionRate: number
  medianDays: number | null
  targetDays: number
  trend: number[]
  memberCount: number
  dataSource: 'tableau' | 'oracle' | 'derived'
}

const stageTransitions: StageTransition[] = [
  { from: 'Registration', to: 'Clinician Assigned', conversionRate: 98, medianDays: 1, targetDays: 1, trend: [95,96,97,97,98,98], memberCount: 284, dataSource: 'derived' },
  { from: 'Clinician Assigned', to: 'Health Story', conversionRate: 92, medianDays: 3, targetDays: 2, trend: [88,89,90,91,91,92], memberCount: 272, dataSource: 'oracle' },
  { from: 'Health Story', to: 'Kit Dispatch', conversionRate: 88, medianDays: 2, targetDays: 1, trend: [82,84,85,86,87,88], memberCount: 248, dataSource: 'oracle' },
  { from: 'Kit Dispatch', to: 'Sample at Lab', conversionRate: 85, medianDays: 8, targetDays: 7, trend: [80,82,83,84,85,85], memberCount: 216, dataSource: 'oracle' },
  { from: 'Sample at Lab', to: 'Results Ready', conversionRate: 100, medianDays: 21, targetDays: 14, trend: [100,100,100,100,100,100], memberCount: 189, dataSource: 'tableau' },
  { from: 'Results Ready', to: 'Clinical Review', conversionRate: 95, medianDays: 5, targetDays: 2, trend: [90,91,92,93,94,95], memberCount: 189, dataSource: 'oracle' },
  { from: 'Clinical Review', to: 'Doctor Sign-off', conversionRate: 90, medianDays: 4, targetDays: 1, trend: [85,86,87,88,89,90], memberCount: 180, dataSource: 'oracle' },
  { from: 'Doctor Sign-off', to: 'Dashboard Published', conversionRate: 85, medianDays: 3, targetDays: 1, trend: [78,80,82,83,84,85], memberCount: 162, dataSource: 'tableau' },
  { from: 'Dashboard', to: 'Insights Call', conversionRate: 2, medianDays: null, targetDays: 7, trend: [0,0,0,1,1,2], memberCount: 61, dataSource: 'oracle' },
  { from: 'Insights Call', to: 'Active Plan', conversionRate: 100, medianDays: 1, targetDays: 1, trend: [100,100,100,100,100,100], memberCount: 1, dataSource: 'oracle' },
]

// ═══════════════════════════════════════════════════════════════════════
// 04 Clinician Load — Tenure-Weighted Intensity
// ═══════════════════════════════════════════════════════════════════════

interface ClinicianTenureLoad {
  name: string
  month1: number
  month2: number
  month3: number
  month4plus: number
  total: number
  weightedHours: number
  availableHours: number
  utilisationPct: number
}

const TIME_WEIGHTS = { month1: 2.5, month2: 1.5, month3: 0.75, month4plus: 0.25 }

const clinicianTenureData: ClinicianTenureLoad[] = [
  { name: 'Katie Kell', month1: 8, month2: 12, month3: 10, month4plus: 23, total: 53, weightedHours: 0, availableHours: 132, utilisationPct: 0 },
  { name: 'Alia Jaghbir', month1: 6, month2: 10, month3: 12, month4plus: 23, total: 51, weightedHours: 0, availableHours: 132, utilisationPct: 0 },
  { name: 'Paula Aguina', month1: 7, month2: 11, month3: 11, month4plus: 22, total: 51, weightedHours: 0, availableHours: 132, utilisationPct: 0 },
  { name: 'Isabelle Baissac', month1: 5, month2: 8, month3: 10, month4plus: 25, total: 48, weightedHours: 0, availableHours: 132, utilisationPct: 0 },
  { name: 'Jaclyn Blueming', month1: 3, month2: 4, month3: 3, month4plus: 4, total: 14, weightedHours: 0, availableHours: 132, utilisationPct: 0 },
  { name: 'Marko Papuckovski', month1: 2, month2: 3, month3: 2, month4plus: 2, total: 9, weightedHours: 0, availableHours: 132, utilisationPct: 0 },
]

clinicianTenureData.forEach(c => {
  c.weightedHours = c.month1 * TIME_WEIGHTS.month1 + c.month2 * TIME_WEIGHTS.month2 + c.month3 * TIME_WEIGHTS.month3 + c.month4plus * TIME_WEIGHTS.month4plus
  c.utilisationPct = Math.round((c.weightedHours / c.availableHours) * 100)
})

// ═══════════════════════════════════════════════════════════════════════
// 05 Action Queue
// ═══════════════════════════════════════════════════════════════════════

interface ActionItem {
  type: string
  label: string
  count: number
  owner: string
  urgentCount: number
  detail: string
}

const actionQueue: ActionItem[] = [
  { type: 'clinical-review', label: 'Clinical Reviews Pending', count: 18, owner: 'Clinical Team', urgentCount: 7, detail: '7 waiting 5+ days, 5 from yesterday, 6 since today' },
  { type: 'doctor-signoff', label: 'Doctor Sign-offs Pending', count: 12, owner: 'Dr Mohan', urgentCount: 4, detail: "4 waiting 4+ days. All from Katie and Paula's patients." },
  { type: 'dashboard-publish', label: 'Dashboards Ready to Publish', count: 19, owner: 'Clinical Team', urgentCount: 11, detail: '11 members waiting 30+ days. 3 waiting 90+ days.' },
  { type: 'insights-call', label: 'Insights Calls to Schedule', count: 60, owner: 'Clinical Team', urgentCount: 60, detail: '60 members have dashboards but no insights call scheduled.' },
  { type: 'welcome-call', label: 'Welcome Calls Scheduled Today', count: 3, owner: 'Katie, Alia', urgentCount: 0, detail: '10:00 — Member #089 (Katie), 14:00 — Member #142 (Alia), 16:00 — Member #201 (Katie)' },
  { type: 'supplement-protocol', label: 'Supplement Protocols to Create', count: 6, owner: 'Clinical Team', urgentCount: 2, detail: 'For members who completed welcome call this week. 2 overdue from last week.' },
  { type: 'kit-qc', label: 'Kit QC Failures to Resolve', count: 2, owner: 'Operations', urgentCount: 2, detail: 'Member #142 — kit returned damaged. Member #289 — sample insufficient.' },
]

// ═══════════════════════════════════════════════════════════════════════
// 06 Capacity Model (carried forward)
// ═══════════════════════════════════════════════════════════════════════

const capacityForecastMonthly = [
  { month: 'Jan 2026', demand: 480, capacity: 554 },
  { month: 'Feb 2026', demand: 510, capacity: 554 },
  { month: 'Mar 2026', demand: 530, capacity: 554 },
  { month: 'Apr 2026', demand: 545, capacity: 554 },
  { month: 'May 2026', demand: 570, capacity: 554 },
  { month: 'Jun 2026', demand: 600, capacity: 554 },
]

const capacityForecastQuarterly = [
  { month: 'Q4 2025', demand: 440, capacity: 554 },
  { month: 'Q1 2026', demand: 507, capacity: 554 },
  { month: 'Q2 2026', demand: 572, capacity: 554 },
]

type HiringScenario = 'current' | 'plus1-apr' | 'plus2-apr' | 'plus1-jun'
const HOURS_PER_CLINICIAN = 110

function getCapacityForecast(scenario: HiringScenario) {
  return capacityForecastMonthly.map((row) => {
    let extra = 0
    const monthIndex = capacityForecastMonthly.indexOf(row)
    if (scenario === 'plus1-apr' && monthIndex >= 3) extra = HOURS_PER_CLINICIAN
    if (scenario === 'plus2-apr' && monthIndex >= 3) extra = HOURS_PER_CLINICIAN * 2
    if (scenario === 'plus1-jun' && monthIndex >= 5) extra = HOURS_PER_CLINICIAN
    return { ...row, capacity: row.capacity + extra }
  })
}

const scenarioDescriptions: Record<HiringScenario, string> = {
  current: 'No additional hires. Demand exceeds capacity by May 2026.',
  'plus1-apr': '+1 clinician from April adds 110h/mo. Capacity gap closed through June.',
  'plus2-apr': '+2 clinicians from April adds 220h/mo. Surplus maintained through June.',
  'plus1-jun': '+1 clinician from June adds 110h/mo. Gap persists April-May before relief.',
}

// ═══════════════════════════════════════════════════════════════════════
// 07 Clinical Efficiency (carried forward)
// ═══════════════════════════════════════════════════════════════════════

const timePerMemberMonthly = [
  { month: 'Sep 2025', actual: 0.9, model: 0.5 },
  { month: 'Oct 2025', actual: 0.85, model: 0.5 },
  { month: 'Nov 2025', actual: 0.82, model: 0.5 },
  { month: 'Dec 2025', actual: 0.78, model: 0.5 },
  { month: 'Jan 2026', actual: 0.75, model: 0.5 },
  { month: 'Feb 2026', actual: 0.72, model: 0.5 },
]

const timePerMemberQuarterly = [
  { month: 'Q3 2025', actual: 0.86, model: 0.5 },
  { month: 'Q4 2025', actual: 0.79, model: 0.5 },
  { month: 'Q1 2026', actual: 0.73, model: 0.5 },
]

const newVsReturning = [
  { month: 'Sep 2025', newMember: 1.2, returning: 0.6 },
  { month: 'Oct 2025', newMember: 1.15, returning: 0.58 },
  { month: 'Nov 2025', newMember: 1.1, returning: 0.55 },
  { month: 'Dec 2025', newMember: 1.05, returning: 0.52 },
  { month: 'Jan 2026', newMember: 1.0, returning: 0.5 },
  { month: 'Feb 2026', newMember: 0.95, returning: 0.48 },
]

const costTrendData = [
  { month: 'Sep 2025', Katie: 63, Alia: 60, Paula: 57, Isabelle: 55, Jaclyn: 53, Marko: 50 },
  { month: 'Nov 2025', Katie: 61, Alia: 58, Paula: 55, Isabelle: 53, Jaclyn: 50, Marko: 48 },
  { month: 'Jan 2026', Katie: 59, Alia: 56, Paula: 53, Isabelle: 51, Jaclyn: 49, Marko: 47 },
  { month: 'Mar 2026', Katie: 58, Alia: 55, Paula: 52, Isabelle: 50, Jaclyn: 48, Marko: 46 },
]

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function dwellStatusColor(median: number | null, target: number | null): Status {
  if (median === null || target === null) return 'grey'
  if (median <= target) return 'green'
  if (median <= target * 2) return 'amber'
  return 'red'
}

function dwellTextColor(s: Status): string {
  return s === 'green' ? 'text-status-green' : s === 'amber' ? 'text-status-amber' : s === 'red' ? 'text-status-red' : 'text-dash-text-muted'
}

// ═══════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════

export default function ClinicalPage() {
  const { clinicians, members, dataMode } = useDashboardData()

  const [selectedClinician, setSelectedClinician] = useState<Clinician | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)
  const [expandedAction, setExpandedAction] = useState<string | null>(null)

  // Chart period toggles
  const [timePerMemberPeriod, setTimePerMemberPeriod] = useState('monthly')
  const [capacityPeriod, setCapacityPeriod] = useState('monthly')
  const [hiringScenario, setHiringScenario] = useState<HiringScenario>('current')

  const timePerMemberData = timePerMemberPeriod === 'monthly' ? timePerMemberMonthly : timePerMemberQuarterly

  const baseCapacity = capacityPeriod === 'monthly' ? capacityForecastMonthly : capacityForecastQuarterly
  const capacityData = useMemo(() => {
    if (capacityPeriod === 'quarterly') return baseCapacity
    return getCapacityForecast(hiringScenario)
  }, [hiringScenario, capacityPeriod, baseCapacity])

  // Pipeline stats
  const totalInPipeline = pipelineStages.reduce((s, p) => s + p.memberCount, 0)
  const bottleneckCount = pipelineStages.filter(p => p.isBottleneck).length

  // Oracle data available check
  const hasOracle = dataMode === 'demo'

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Delivery' }]} />
        <div className="flex items-center gap-2">
          <DataSourceBadge source="hubspot" />
          <DataSourceBadge source="tableau" />
          <DataSourceBadge source="manual" />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 01 Journey Pipeline — Kanban Flow                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={1} title="Journey Pipeline" />

        {/* Phase colour legend */}
        <div className="mb-4 flex flex-wrap gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: PHASE_COLORS.onboarding }} /> Onboarding
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: PHASE_COLORS.insights }} /> Insights & Results
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: PHASE_COLORS.ongoing }} /> Ongoing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: PHASE_COLORS.retest }} /> Retest
          </span>
        </div>

        {/* Pipeline cards — horizontal scroll */}
        <div className="overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0">
          <div className="flex gap-1.5 min-w-max md:gap-2">
            {pipelineStages.map((stage, i) => {
              const phaseColor = PHASE_COLORS[stage.phase]
              const status = dwellStatusColor(stage.medianDwellDays, stage.targetDwellDays)
              const textColor = dwellTextColor(status)

              return (
                <Fragment key={stage.id}>
                  {i > 0 && (
                    <div className="flex items-center text-dash-text-muted">
                      <ChevronRight size={14} className="md:h-4 md:w-4" />
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedStage(selectedStage?.id === stage.id ? null : stage)}
                    className={cn(
                      'flex flex-col rounded-lg border bg-dash-surface p-2.5 transition-colors hover:border-dash-border-strong',
                      'w-[100px] shrink-0 md:w-[120px]',
                      stage.isBottleneck ? 'border-status-red' : 'border-dash-border',
                      selectedStage?.id === stage.id && 'ring-2 ring-dash-red',
                    )}
                  >
                    <div className="mb-1.5 h-1 w-full rounded-full md:mb-2" style={{ backgroundColor: phaseColor }} />
                    <span className="text-[9px] font-medium uppercase leading-tight tracking-wide text-dash-text-secondary md:text-[10px]">
                      <span className="md:hidden">{stage.shortLabel}</span>
                      <span className="hidden md:inline">{stage.label}</span>
                    </span>
                    <span className="mt-0.5 font-mono text-xl font-bold text-dash-text md:mt-1 md:text-2xl">
                      {stage.memberCount}
                    </span>
                    <div className="mt-0.5 md:mt-1">
                      <TrendIndicator value={stage.trend} />
                    </div>
                    {stage.medianDwellDays !== null && (
                      <div className="mt-1.5 border-t border-dash-border pt-1.5 md:mt-2 md:pt-2">
                        <span className={cn('font-mono text-xs font-bold', textColor)}>
                          {stage.medianDwellDays}d
                        </span>
                        <span className="text-[9px] text-dash-text-muted md:text-[10px]"> / {stage.targetDwellDays}d</span>
                      </div>
                    )}
                    {stage.dataSource === 'oracle' && (
                      <span className="mt-0.5 text-[8px] italic text-dash-text-muted md:mt-1 md:text-[9px]">Oracle</span>
                    )}
                  </button>
                </Fragment>
              )
            })}
          </div>
        </div>

        {/* Selected stage detail */}
        {selectedStage && (
          <div className="mt-3 rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium text-dash-text">{selectedStage.label}</h3>
                <p className="text-xs text-dash-text-muted">{selectedStage.oracleStage} &middot; Source: {selectedStage.dataSource}</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-dash-text-secondary"><span className="font-mono font-bold text-dash-text">{selectedStage.memberCount}</span> members</span>
                {selectedStage.medianDwellDays !== null && (
                  <span className="text-dash-text-secondary">Dwell: <span className={cn('font-mono font-bold', dwellTextColor(dwellStatusColor(selectedStage.medianDwellDays, selectedStage.targetDwellDays)))}>{selectedStage.medianDwellDays}d</span> / {selectedStage.targetDwellDays}d</span>
                )}
              </div>
            </div>
            {selectedStage.isBottleneck && (
              <div className="mt-2 rounded bg-status-red/5 px-3 py-2 text-xs text-status-red">
                Bottleneck: median dwell exceeds target by {selectedStage.medianDwellDays !== null && selectedStage.targetDwellDays !== null ? Math.round(((selectedStage.medianDwellDays - selectedStage.targetDwellDays) / selectedStage.targetDwellDays) * 100) : 0}%
              </div>
            )}
          </div>
        )}

        {/* Summary stats */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs md:mt-4 md:gap-6">
          <span className="text-dash-text-secondary">
            Total in pipeline: <span className="font-mono font-bold text-dash-text">{totalInPipeline}</span>
          </span>
          <span className="text-dash-text-secondary">
            Bottlenecks: <span className="font-mono font-bold text-status-red">{bottleneckCount} stages</span>
          </span>
          <span className="text-dash-text-secondary">
            End-to-end median: <span className="font-mono font-bold text-dash-text">77d</span>
            <span className="text-dash-text-muted"> / 40d target</span>
          </span>
        </div>

        {!hasOracle && dataMode === 'actual' && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-dash-surface-alt px-3 py-2 text-[11px] text-dash-text-muted">
            <span>8 of 13 stages require Oracle data pipeline.</span>
            <Link href="/admin/registry" className="text-dash-red hover:underline">View data roadmap &rarr;</Link>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 02 Clinical Activity Report                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={2} title="Clinical Activity Report" />

        {/* Mobile: stacked cards */}
        <div className="space-y-2 md:hidden">
          {(['clinical', 'operational', 'member'] as const).map(cat => (
            <div key={cat}>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-dash-text-muted">
                {cat === 'clinical' ? 'Clinical' : cat === 'operational' ? 'Operational' : 'Member-Initiated'}
              </h3>
              {clinicalActivities.filter(a => a.category === cat).map(activity => {
                const weekDelta = activity.thisWeek - activity.lastWeek
                const todayVsTarget = activity.target ? (activity.today >= activity.target ? 'green' : activity.today >= activity.target * 0.5 ? 'amber' : 'red') : null
                const todayColor = todayVsTarget === 'green' ? 'text-status-green' : todayVsTarget === 'red' ? 'text-status-red' : todayVsTarget === 'amber' ? 'text-status-amber' : 'text-dash-text'

                return (
                  <div key={activity.id} className="rounded-lg border border-dash-border bg-dash-surface p-3 mb-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-dash-text">{activity.label}</span>
                      <span className={cn('font-mono text-lg font-bold', todayColor)}>{activity.today}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-dash-text-muted">
                      <span>Wk: <span className="font-mono text-dash-text">{activity.thisWeek}</span> ({weekDelta >= 0 ? '+' : ''}{weekDelta})</span>
                      <span>Mo: <span className="font-mono text-dash-text">{activity.thisMonth}</span></span>
                      {activity.target && <span>Target: {activity.target}/d</span>}
                    </div>
                    <div className="mt-1.5">
                      <Sparkline data={activity.sparkline} width={160} height={16} color="#8B0000" />
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto rounded-lg border border-dash-border md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface-alt">
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Activity</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Today</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">This Week</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Last Week</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">4wk Avg</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">This Month</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">30d Trend</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {(['clinical', 'operational', 'member'] as const).map(cat => (
                <Fragment key={cat}>
                  <tr className="bg-dash-surface-alt/50">
                    <td colSpan={8} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-dash-text-muted">
                      {cat === 'clinical' ? 'Clinical Activities' : cat === 'operational' ? 'Operational Activities' : 'Member-Initiated Activities'}
                    </td>
                  </tr>
                  {clinicalActivities.filter(a => a.category === cat).map(activity => {
                    const weekDelta = activity.thisWeek - activity.lastWeek
                    const todayVsTarget = activity.target ? (activity.today >= activity.target ? 'green' : activity.today >= activity.target * 0.5 ? 'amber' : 'red') : null
                    const todayColor = todayVsTarget === 'green' ? 'text-status-green' : todayVsTarget === 'red' ? 'text-status-red' : todayVsTarget === 'amber' ? 'text-status-amber' : 'text-dash-text'

                    return (
                      <tr key={activity.id}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-dash-text">{activity.label}</span>
                          {activity.target && (
                            <span className="ml-2 text-[10px] text-dash-text-muted">target: {activity.target}/day</span>
                          )}
                        </td>
                        <td className={cn('px-4 py-3 text-right font-mono font-bold', todayColor)}>
                          {activity.today}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-dash-text">
                          <span className="font-bold">{activity.thisWeek}</span>
                          <span className={cn('ml-1 text-[10px]', weekDelta > 0 ? 'text-status-green' : weekDelta < 0 ? 'text-status-red' : 'text-dash-text-muted')}>
                            {weekDelta > 0 ? '+' : ''}{weekDelta}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-dash-text-secondary">{activity.lastWeek}</td>
                        <td className="px-4 py-3 text-right font-mono text-dash-text-secondary">{activity.trailing4wAvg.toFixed(1)}/wk</td>
                        <td className="px-4 py-3 text-right font-mono text-dash-text">{activity.thisMonth}</td>
                        <td className="px-4 py-3">
                          <Sparkline data={activity.sparkline} width={100} height={20} color="#8B0000" />
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-dash-surface-alt text-dash-text-muted">
                            {activity.dataSource}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Key callouts */}
        <div className="mt-3 space-y-2 md:mt-4">
          <div className="rounded-lg border-l-[3px] border-status-red bg-dash-surface p-3 md:p-4">
            <p className="text-xs font-medium text-dash-text md:text-sm">
              Insights Calls: <span className="font-mono">1 this week, 3 this month.</span> Target is 5/day. This step is barely happening &mdash; 1 of 284 members has completed an insights call.
            </p>
          </div>
          <div className="rounded-lg border-l-[3px] border-status-green bg-dash-surface p-3 md:p-4">
            <p className="text-xs font-medium text-dash-text md:text-sm">
              Clinical Reviews up 20% week-on-week (12 vs 10). Pipeline clearing velocity improving.
            </p>
          </div>
        </div>

        {!hasOracle && dataMode === 'actual' && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-dash-surface-alt px-3 py-2 text-[11px] text-dash-text-muted">
            <span>Requires Oracle data pipeline.</span>
            <Link href="/admin/registry" className="text-dash-red hover:underline">View data roadmap &rarr;</Link>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 03 Stage Conversion & Timing                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={3} title="Stage Conversion & Timing" />

        {/* Mobile: stacked cards */}
        <div className="space-y-2 md:hidden">
          {stageTransitions.map(t => {
            const convColor = t.conversionRate >= 90 ? 'text-status-green' : t.conversionRate >= 70 ? 'text-status-amber' : 'text-status-red'
            const timeStatus = dwellStatusColor(t.medianDays, t.targetDays)
            const timeColor = dwellTextColor(timeStatus)

            return (
              <div key={`${t.from}-${t.to}`} className={cn('rounded-lg border border-dash-border bg-dash-surface p-3', t.conversionRate < 10 && 'border-status-red bg-status-red/5')}>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-dash-text-secondary">{t.from}</span>
                  <span className="text-dash-text-muted">&rarr;</span>
                  <span className="font-medium text-dash-text">{t.to}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <span className={cn('font-mono text-xl font-bold', convColor)}>{t.conversionRate}%</span>
                    <span className="ml-2 text-[10px] text-dash-text-muted">conversion</span>
                  </div>
                  <div className="text-right">
                    <span className={cn('font-mono text-sm font-bold', timeColor)}>{t.medianDays !== null ? `${t.medianDays}d` : '—'}</span>
                    <span className="ml-1 text-[10px] text-dash-text-muted">/ {t.targetDays}d</span>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-dash-text-muted">
                  <span>n={t.memberCount}</span>
                  <Sparkline data={t.trend} width={60} height={14} color={t.conversionRate < 10 ? '#DC2626' : '#16A34A'} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto rounded-lg border border-dash-border md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface-alt">
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Transition</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Conv %</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">6mo Trend</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Median</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Target</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">n at stage</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {stageTransitions.map(t => {
                const convStatus = t.conversionRate >= 90 ? 'green' : t.conversionRate >= 70 ? 'amber' : 'red'
                const convColor = convStatus === 'green' ? 'text-status-green' : convStatus === 'amber' ? 'text-status-amber' : 'text-status-red'
                const timeStatus = dwellStatusColor(t.medianDays, t.targetDays)
                const timeColor = dwellTextColor(timeStatus)

                return (
                  <tr key={`${t.from}-${t.to}`} className={t.conversionRate < 10 ? 'bg-status-red/5' : ''}>
                    <td className="px-4 py-3">
                      <span className="text-dash-text-secondary">{t.from}</span>
                      <span className="mx-2 text-dash-text-muted">&rarr;</span>
                      <span className="font-medium text-dash-text">{t.to}</span>
                    </td>
                    <td className={cn('px-4 py-3 text-right font-mono font-bold', convColor)}>
                      {t.conversionRate}%
                    </td>
                    <td className="px-4 py-3">
                      <Sparkline data={t.trend} width={80} height={20} color={convStatus === 'red' ? '#DC2626' : '#16A34A'} />
                    </td>
                    <td className={cn('px-4 py-3 text-right font-mono font-bold', timeColor)}>
                      {t.medianDays !== null ? `${t.medianDays}d` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-dash-text-muted">
                      {t.targetDays}d
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-dash-text-secondary">
                      {t.memberCount}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-dash-surface-alt text-dash-text-muted">
                        {t.dataSource}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Screaming callout */}
        <div className="mt-3 rounded-lg border-2 border-status-red bg-status-red/5 p-4 md:mt-4 md:p-5">
          <p className="text-sm font-bold text-status-red">
            Dashboard &rarr; Insights Call: 2% conversion.
          </p>
          <p className="mt-1 text-xs text-dash-text md:text-sm">
            61 members have a live dashboard. 1 has completed an insights call. This is the single biggest drop-off in the entire journey.
            Either the call isn&apos;t being scheduled, or members aren&apos;t booking, or the process doesn&apos;t exist yet.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 04 Clinician Load — Tenure-Weighted Intensity                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={4} title="Clinician Load — Tenure-Weighted Intensity" />

        <p className="mb-3 text-[10px] text-dash-text-muted md:mb-4 md:text-xs">
          Month 1 members require ~{TIME_WEIGHTS.month1}h/month. Month 2: ~{TIME_WEIGHTS.month2}h. Month 3: ~{TIME_WEIGHTS.month3}h. Month 4+: ~{TIME_WEIGHTS.month4plus}h.
          Weighted hours = sum of (members x hourly weight). Utilisation = weighted hours / {clinicianTenureData[0].availableHours}h available.
        </p>

        {/* Mobile: stacked cards */}
        <div className="space-y-2 md:hidden">
          {clinicianTenureData.map(c => {
            const utilColor = c.utilisationPct > 85 ? 'text-status-red' : c.utilisationPct > 70 ? 'text-status-amber' : 'text-status-green'
            return (
              <div key={c.name} className="rounded-lg border border-dash-border bg-dash-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-dash-text">{c.name}</span>
                  <span className={cn('font-mono text-lg font-bold', utilColor)}>{c.utilisationPct}%</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div>
                    <div className="font-semibold text-status-red">M1</div>
                    <div className="font-mono text-dash-text">{c.month1}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-status-amber">M2</div>
                    <div className="font-mono text-dash-text">{c.month2}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-status-green">M3</div>
                    <div className="font-mono text-dash-text">{c.month3}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-dash-text-muted">M4+</div>
                    <div className="font-mono text-dash-text">{c.month4plus}</div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-dash-text-muted">
                  <span>Total: {c.total}</span>
                  <span>{c.weightedHours.toFixed(1)}h weighted</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto rounded-lg border border-dash-border md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface-alt">
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Clinician</th>
                <th className="px-4 py-3 text-right font-semibold text-status-red">Month 1</th>
                <th className="px-4 py-3 text-right font-semibold text-status-amber">Month 2</th>
                <th className="px-4 py-3 text-right font-semibold text-status-green">Month 3</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-muted">Month 4+</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Total</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Weighted Hours</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Utilisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {clinicianTenureData.map(c => {
                const maxMonth1 = Math.max(...clinicianTenureData.map(x => x.month1))
                const maxMonth2 = Math.max(...clinicianTenureData.map(x => x.month2))
                const m1Intensity = c.month1 / maxMonth1
                const m2Intensity = c.month2 / maxMonth2
                const utilColor = c.utilisationPct > 85 ? 'text-status-red' : c.utilisationPct > 70 ? 'text-status-amber' : 'text-status-green'

                return (
                  <tr key={c.name}>
                    <td className="px-4 py-3 font-medium text-dash-text">{c.name}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold" style={{ backgroundColor: `rgba(139, 0, 0, ${m1Intensity * 0.2})` }}>
                      {c.month1}
                    </td>
                    <td className="px-4 py-3 text-right font-mono" style={{ backgroundColor: `rgba(217, 119, 6, ${m2Intensity * 0.15})` }}>
                      {c.month2}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-dash-text-secondary">{c.month3}</td>
                    <td className="px-4 py-3 text-right font-mono text-dash-text-muted">{c.month4plus}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-dash-text">{c.total}</td>
                    <td className="px-4 py-3 text-right font-mono text-dash-text">{c.weightedHours.toFixed(1)}h</td>
                    <td className={cn('px-4 py-3 text-right font-mono font-bold', utilColor)}>{c.utilisationPct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Projection callout */}
        <div className="mt-3 rounded-lg border border-dash-border bg-dash-surface p-3 md:mt-4 md:p-4">
          <p className="text-xs text-dash-text md:text-sm">
            <span className="font-semibold">Scaling impact:</span> At 200 new members/month, each clinician absorbs ~33 new month-1 members,
            adding ~82.5 weighted hours. Katie&apos;s utilisation would jump from {clinicianTenureData[0].utilisationPct}% to {Math.min(100, clinicianTenureData[0].utilisationPct + Math.round(82.5/132*100))}%.
            <span className="font-semibold text-status-red"> Capacity breach within 4 weeks at current staffing.</span>
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 05 Action Queue — Today                                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={5} title="Action Queue — Today" />
        <div className="space-y-2">
          {actionQueue.map(item => (
            <button
              key={item.type}
              onClick={() => setExpandedAction(expandedAction === item.type ? null : item.type)}
              className="w-full rounded-lg border border-dash-border bg-dash-surface p-3 text-left transition-colors hover:border-dash-border-strong md:p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold md:h-8 md:w-8 md:text-sm',
                    item.urgentCount > 0 ? 'bg-status-red/10 text-status-red' : 'bg-dash-surface-alt text-dash-text-secondary'
                  )}>
                    {item.count}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-dash-text md:text-sm">{item.label}</span>
                    {item.urgentCount > 0 && (
                      <span className="ml-2 hidden rounded-full bg-status-red/10 px-2 py-0.5 text-[10px] font-semibold text-status-red sm:inline-block">
                        {item.urgentCount} urgent
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] text-dash-text-secondary md:text-xs">{item.owner}</span>
              </div>
              <p className="mt-1.5 text-[10px] text-dash-text-muted md:mt-2 md:text-xs">{item.detail}</p>
              {item.urgentCount > 0 && (
                <span className="mt-1 inline-block rounded-full bg-status-red/10 px-2 py-0.5 text-[9px] font-semibold text-status-red sm:hidden">
                  {item.urgentCount} urgent
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 06 Capacity Model (carried forward)                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={6} title="Capacity Model" />

        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Demand vs Capacity — Next 6 Months (Hours)
            </h3>
            <ChartPeriodToggle
              options={[
                { label: 'Monthly', value: 'monthly' },
                { label: 'Quarterly', value: 'quarterly' },
              ]}
              selected={capacityPeriod}
              onChange={setCapacityPeriod}
            />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-dash-text-secondary">Scenario:</span>
            {([
              { value: 'current', label: 'Current Staff' },
              { value: 'plus1-apr', label: '+1 Hire (Apr)' },
              { value: 'plus2-apr', label: '+2 Hires (Apr)' },
              { value: 'plus1-jun', label: '+1 Hire (Jun)' },
            ] as { value: HiringScenario; label: string }[]).map((s) => (
              <button
                key={s.value}
                onClick={() => setHiringScenario(s.value)}
                className={`rounded-md px-2.5 py-1 font-sans text-[11px] font-medium transition-colors ${
                  hiringScenario === s.value
                    ? 'bg-dash-accent text-white'
                    : 'border border-dash-border text-dash-text-muted hover:bg-dash-surface-hover hover:text-dash-text-secondary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={224} className="h-44 md:h-56">
            <RechartLineChart data={capacityData}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Line type="monotone" dataKey="demand" name="Demand" stroke={TMRW_COLORS.red} strokeWidth={3} dot={lineDot(TMRW_COLORS.red)} />
              <Line type="monotone" dataKey="capacity" name="Capacity" stroke={TMRW_COLORS.green} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: TMRW_COLORS.green, stroke: '#fff', strokeWidth: 1 }} />
            </RechartLineChart>
          </ResponsiveContainer>

          <div className="mt-3 rounded border border-dash-border bg-dash-bg p-3">
            <p className="text-xs text-dash-text-secondary">
              {scenarioDescriptions[hiringScenario]}
            </p>
          </div>

          <AlertCard
            severity="high"
            title="At current staffing, demand exceeds capacity in Month 5 (May 2026)."
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 07 Clinical Efficiency (carried forward)                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={7} title="Clinical Efficiency" />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                Avg Clinician Hours per Member per Month
              </h3>
              <ChartPeriodToggle
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Quarterly', value: 'quarterly' },
                ]}
                selected={timePerMemberPeriod}
                onChange={setTimePerMemberPeriod}
              />
            </div>
            <ResponsiveContainer width="100%" height={192} className="h-36 md:h-48">
              <RechartLineChart data={timePerMemberData}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={legendStyle} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke={TMRW_COLORS.blue} strokeWidth={3} dot={lineDot(TMRW_COLORS.blue, 4)} />
                <Line type="monotone" dataKey="model" name="Model" stroke={TMRW_COLORS.grey} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: TMRW_COLORS.grey, stroke: '#fff', strokeWidth: 1 }} />
              </RechartLineChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-dash-text-muted">
              Model assumes 0.5h per member. Actual converging but still 44% above model.
            </p>
          </div>

          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              New vs Returning Member Time (Hours)
            </h3>
            <ResponsiveContainer width="100%" height={192} className="h-36 md:h-48">
              <RechartLineChart data={newVsReturning}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={legendStyle} />
                <Line type="monotone" dataKey="newMember" name="New Member" stroke={TMRW_COLORS.purple} strokeWidth={3} dot={lineDot(TMRW_COLORS.purple, 4)} />
                <Line type="monotone" dataKey="returning" name="Returning" stroke={TMRW_COLORS.cyan} strokeWidth={3} dot={lineDot(TMRW_COLORS.cyan, 4)} />
              </RechartLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Cost per Case by Clinician (at $70/hr)
          </h3>
          <ResponsiveContainer width="100%" height={192} className="h-36 md:h-48">
            <RechartLineChart data={costTrendData}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${v}`} />
              <Legend wrapperStyle={{ ...legendStyle, fontSize: 12 }} />
              <Line type="monotone" dataKey="Katie" stroke={TMRW_COLORS.red} strokeWidth={2.5} dot={{ r: 3, fill: TMRW_COLORS.red }} />
              <Line type="monotone" dataKey="Alia" stroke={TMRW_COLORS.blue} strokeWidth={2.5} dot={{ r: 3, fill: TMRW_COLORS.blue }} />
              <Line type="monotone" dataKey="Paula" stroke={TMRW_COLORS.green} strokeWidth={2.5} dot={{ r: 3, fill: TMRW_COLORS.green }} />
              <Line type="monotone" dataKey="Isabelle" stroke={TMRW_COLORS.amber} strokeWidth={2.5} dot={{ r: 3, fill: TMRW_COLORS.amber }} />
              <Line type="monotone" dataKey="Jaclyn" stroke={TMRW_COLORS.purple} strokeWidth={2.5} dot={{ r: 3, fill: TMRW_COLORS.purple }} />
              <Line type="monotone" dataKey="Marko" stroke={TMRW_COLORS.cyan} strokeWidth={2.5} dot={{ r: 3, fill: TMRW_COLORS.cyan }} />
            </RechartLineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-dash-text-muted">All clinicians trending down &mdash; AI artifact pre-creation reducing time-per-case.</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 08 Quality Gates (carried forward)                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={8} title="Quality Gates" />

        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
          <MetricCard label="Gate 2A Pass Rate" value="92%" status="green" target=">90%" />
          <MetricCard label="Gate 2B Pass Rate" value="88%" status="amber" target=">90%" />
          <MetricCard label="Gate 3 Pass Rate" value="95%" status="green" target=">90%" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:mt-4 md:gap-4 lg:grid-cols-2">
          <div className="rounded-lg border-2 border-status-amber/40 bg-dash-surface p-4 md:p-5">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              QC Failure Impact
            </h3>
            <p className="font-mono text-2xl font-semibold text-status-amber">12%</p>
            <p className="mt-1 font-sans text-sm text-dash-text-secondary">QC failure rate</p>
            <p className="mt-3 font-sans text-xs text-dash-text md:text-sm">
              At 12% QC failure rate, <span className="font-semibold text-status-amber">~34 members</span> experienced restarts.
              Adding <span className="font-semibold text-status-red">~680 member-days</span> of delay.
            </p>
          </div>

          <div className="rounded-lg border-2 border-status-red/40 bg-status-red-light p-4 md:p-5">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Insights Call Completion
            </h3>
            <p className="font-mono text-2xl font-bold text-status-red md:text-3xl">1 of 284</p>
            <p className="mt-1 font-sans text-xs text-dash-text-secondary md:text-sm">members have completed an insights call</p>
            <AlertCard
              severity="high"
              title="Insights call completion is critically low at 0.4%. This gate is effectively non-operational."
            />
          </div>
        </div>
      </section>

      {/* Clinician detail slide-over */}
      <ClinicianDetailPanel
        clinician={selectedClinician}
        open={selectedClinician !== null}
        onOpenChange={(open) => { if (!open) setSelectedClinician(null) }}
      />

      {/* Member detail slide-over */}
      <MemberDetailPanel
        member={selectedMember}
        open={selectedMember !== null}
        onOpenChange={(open) => { if (!open) setSelectedMember(null) }}
      />
    </div>
  )
}

```

## `src/app/eos/page.tsx`

```tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { StatusDot } from '@/components/dashboard/status-dot'
import { Sparkline } from '@/components/dashboard/sparkline'
import { useDashboardData } from '@/lib/context/data-context'
import { cn } from '@/lib/utils'
import { Upload, ChevronDown, ChevronUp, Target, Link2 } from 'lucide-react'
import type { Status } from '@/lib/types'

// ---------------------------------------------------------------------------
// 01. Strategic Destination — 12-month targets
// ---------------------------------------------------------------------------
interface DestinationTarget {
  label: string
  now: string
  target: string
  status: Status
  href: string
}

const destinationTargets: DestinationTarget[] = [
  { label: 'Active Members', now: '270', target: '500', status: 'amber', href: '/members' },
  { label: 'MRR', now: '$18K', target: '$60K', status: 'red', href: '/financial' },
  { label: 'Churn', now: '3.8%', target: '<3%', status: 'green', href: '/retention' },
  { label: 'Reg→Dashboard', now: '98d', target: '<30d', status: 'red', href: '/clinical' },
  { label: 'NPS', now: '62', target: '70+', status: 'amber', href: '/support' },
  { label: 'Retest Rate', now: 'TBC', target: '40%+', status: 'grey', href: '/retention' },
]

// ---------------------------------------------------------------------------
// 02. Rock data
// ---------------------------------------------------------------------------
const rockMetricSpark: Record<string, number[]> = {
  'Monthly churn': [4.2, 4.0, 3.9, 3.7, 3.5, 3.4, 3.6, 3.8],
  'Members with 2+ cycles': [0, 0, 0, 0, 0, 0, 0, 0],
}

const rockLaddersTo: Record<string, string> = {
  'ROCK-001': 'Can we deliver value reliably?',
  'ROCK-002': 'Do customers love it?',
  'ROCK-003': 'Can we prove it works?',
}

const rockStatusColors: Record<string, string> = {
  'on-track': 'text-status-green', 'off-track': 'text-status-red',
  'at-risk': 'text-status-amber', complete: 'text-status-green', building: 'text-dash-text-muted',
}
const rockStatusBg: Record<string, string> = {
  'on-track': 'bg-status-green/10', 'off-track': 'bg-status-red/10',
  'at-risk': 'bg-status-amber/10', complete: 'bg-status-green/10', building: 'bg-dash-surface',
}

// ---------------------------------------------------------------------------
// 03. Priorities — Artifact Format
// ---------------------------------------------------------------------------
interface OrgPriority {
  id: string
  label: string
  title: string
  description: string
}

interface PersonThisWeek {
  name: string
  role: string
  bucket: string
  priorities: { title: string; description: string; org: string[] }[]
}

interface PersonLastWeek {
  name: string
  role: string
  priorities: { title: string }[]
}

interface PrioritiesPayload {
  weekOf: string
  orgPriorities: OrgPriority[]
  thisWeek: PersonThisWeek[]
  lastWeek: PersonLastWeek[]
  completionState: Record<string, boolean>
  exportedAt?: string
  uploadedAt?: string
  weekKey?: string
}

const ORG_COLORS: Record<string, { color: string; bg: string }> = {
  O1: { color: '#9B1C1C', bg: '#FEF2F2' },
  O2: { color: '#1C398B', bg: '#EFF3FF' },
  O3: { color: '#065F46', bg: '#ECFDF5' },
  O4: { color: '#713F12', bg: '#FEFCE8' },
}

const METRIC_KEYWORDS: Record<string, { metricId: string; label: string; page: string }> = {
  queue: { metricId: 'pipeline-queue', label: 'Pipeline Queue', page: '/clinical' },
  dashboard: { metricId: 'dashboards-waiting', label: 'Dashboards Waiting', page: '/clinical' },
  churn: { metricId: 'monthly-churn', label: 'Monthly Churn', page: '/retention' },
  retention: { metricId: 'retention-rate', label: 'Retention Rate', page: '/retention' },
  revenue: { metricId: 'mrr', label: 'MRR', page: '/financial' },
  mrr: { metricId: 'mrr', label: 'MRR', page: '/financial' },
  stripe: { metricId: 'stripe-status', label: 'Stripe', page: '/admin/registry' },
  zendesk: { metricId: 'zendesk-status', label: 'Zendesk', page: '/admin/registry' },
  hire: { metricId: 'clinical-capacity', label: 'Capacity', page: '/clinical' },
  clinician: { metricId: 'clinical-capacity', label: 'Capacity', page: '/clinical' },
  capacity: { metricId: 'clinical-capacity', label: 'Capacity', page: '/clinical' },
  support: { metricId: 'open-tickets', label: 'Open Tickets', page: '/support' },
  ticket: { metricId: 'open-tickets', label: 'Open Tickets', page: '/support' },
  csat: { metricId: 'csat', label: 'CSAT', page: '/support' },
  registration: { metricId: 'weekly-registrations', label: 'Registrations', page: '/members' },
  retest: { metricId: 'retests', label: 'Retests', page: '/retention' },
  supplement: { metricId: 'supplement-protocols', label: 'Protocols', page: '/clinical' },
  landing: { metricId: 'website-status', label: 'Website', page: '/marketing' },
  compliance: { metricId: 'tga-status', label: 'TGA', page: '/strategy' },
}

function autoLinkMetrics(text: string): { metricId: string; label: string; page: string }[] {
  const lower = text.toLowerCase()
  const matches = new Map<string, { metricId: string; label: string; page: string }>()
  for (const [keyword, metric] of Object.entries(METRIC_KEYWORDS)) {
    if (lower.includes(keyword)) matches.set(metric.metricId, metric)
  }
  return Array.from(matches.values())
}

// Demo priorities data (pre-populated in demo mode)
const DEMO_PRIORITIES: PrioritiesPayload = {
  weekOf: '2026-03-09',
  orgPriorities: [
    { id: 'O1', label: 'Clinical Process', title: 'Improved Clinical Process & Zendesk Implementation', description: 'Streamline the member journey from kit receipt to dashboard delivery. Reduce manual touchpoints and implement Zendesk for support tracking.' },
    { id: 'O2', label: 'Website & Landing', title: 'Website Rebuild & Landing Page Optimisation', description: 'Rebuild the main website and create high-converting landing pages for each journey type.' },
    { id: 'O3', label: 'Retention & Revenue', title: 'Retention Engine & Revenue Growth', description: 'Build the systems that keep members engaged past their first cycle and drive retest bookings.' },
    { id: 'O4', label: 'Compliance & Ops', title: 'TGA Compliance & Operational Foundation', description: 'Ensure all products and processes meet TGA requirements. Build the operational foundation for scale.' },
  ],
  thisWeek: [
    {
      name: 'Katie', role: 'Clinical Lead', bucket: 'main',
      priorities: [
        { title: 'Clear 12 members from kit-received queue', description: 'Focus on longest-waiting members first. Target: reduce queue from 67 to 55.', org: ['O1'] },
        { title: 'Zendesk workflow configuration', description: 'Set up auto-assignment rules and SLA timers for clinical tickets.', org: ['O1'] },
        { title: 'Review clinician capacity model', description: 'Update the capacity forecast with March hiring timeline.', org: ['O1'] },
      ],
    },
    {
      name: 'Tom', role: 'Tech Lead', bucket: 'main',
      priorities: [
        { title: 'Ship menopause journey v2 landing page', description: 'Final QA and deploy. Includes new hero section and testimonials.', org: ['O2'] },
        { title: 'Dashboard publishing automation', description: 'Reduce manual steps in dashboard generation. Target: 50% time reduction.', org: ['O1'] },
      ],
    },
    {
      name: 'Mark', role: 'CEO', bucket: 'main',
      priorities: [
        { title: 'Close allied health partnership deal', description: 'Final terms negotiation with two clinic networks in Sydney.', org: ['O3'] },
        { title: 'Board prep and investor update', description: 'Prepare March board pack with updated metrics and Q2 forecast.', org: [] },
        { title: 'Review Stripe failed payment recovery', description: 'Analyse February failed payments and approve dunning sequence.', org: ['O3'] },
      ],
    },
    {
      name: 'Emma', role: 'Growth Lead', bucket: 'main',
      priorities: [
        { title: 'Launch retest campaign for Nov cohort', description: 'Email + SMS sequence for members approaching 90-day mark.', org: ['O3'] },
        { title: 'TGA compliance documentation review', description: 'Final review of supplement product descriptions for TGA submission.', org: ['O4'] },
      ],
    },
  ],
  lastWeek: [
    {
      name: 'Katie', role: 'Clinical Lead',
      priorities: [
        { title: 'Process 8 members through results review' },
        { title: 'Draft Zendesk implementation plan' },
        { title: 'Hire clinical operations coordinator — post role' },
      ],
    },
    {
      name: 'Tom', role: 'Tech Lead',
      priorities: [
        { title: 'Fix dashboard rendering bugs on mobile' },
        { title: 'Landing page design review with Mark' },
      ],
    },
    {
      name: 'Mark', role: 'CEO',
      priorities: [
        { title: 'Partnership outreach — 3 clinic networks' },
        { title: 'Q1 Rock progress review with team' },
        { title: 'Revenue forecast update' },
      ],
    },
    {
      name: 'Emma', role: 'Growth Lead',
      priorities: [
        { title: 'Design retest email sequence' },
        { title: 'TGA product label review' },
      ],
    },
  ],
  completionState: {
    'Katie|0': true,
    'Katie|1': true,
    'Katie|2': false,
    'Tom|0': true,
    'Tom|1': true,
    'Mark|0': true,
    'Mark|1': false,
    'Mark|2': true,
    'Emma|0': true,
    'Emma|1': false,
  },
}

// ---------------------------------------------------------------------------
// 04. Weekly Scorecard
// ---------------------------------------------------------------------------
const scorecardRows: {
  metric: string; target: string; targetNumeric: number;
  weeks: { label: string; numeric: number }[]; status: Status; lowerIsBetter: boolean
}[] = [
  { metric: 'New registrations', target: '25/wk', targetNumeric: 25, lowerIsBetter: false, status: 'red',
    weeks: [{ label: '18', numeric: 18 }, { label: '15', numeric: 15 }, { label: '20', numeric: 20 }, { label: '14', numeric: 14 }, { label: '16', numeric: 16 }, { label: '12', numeric: 12 }, { label: '8', numeric: 8 }, { label: '11', numeric: 11 }] },
  { metric: 'Dashboards pub.', target: '10/wk', targetNumeric: 10, lowerIsBetter: false, status: 'amber',
    weeks: [{ label: '6', numeric: 6 }, { label: '8', numeric: 8 }, { label: '5', numeric: 5 }, { label: '9', numeric: 9 }, { label: '10', numeric: 10 }, { label: '7', numeric: 7 }, { label: '9', numeric: 9 }, { label: '8', numeric: 8 }] },
  { metric: 'Churn (monthly)', target: '<5%', targetNumeric: 5, lowerIsBetter: true, status: 'green',
    weeks: [{ label: '4.1%', numeric: 4.1 }, { label: '3.8%', numeric: 3.8 }, { label: '3.5%', numeric: 3.5 }, { label: '3.4%', numeric: 3.4 }, { label: '3.3%', numeric: 3.3 }, { label: '3.2%', numeric: 3.2 }, { label: '3.6%', numeric: 3.6 }, { label: '3.8%', numeric: 3.8 }] },
  { metric: 'Revenue collected', target: '$8K/wk', targetNumeric: 8, lowerIsBetter: false, status: 'amber',
    weeks: [{ label: '$4.8K', numeric: 4.8 }, { label: '$5.1K', numeric: 5.1 }, { label: '$5.5K', numeric: 5.5 }, { label: '$5.0K', numeric: 5.0 }, { label: '$5.2K', numeric: 5.2 }, { label: '$5.2K', numeric: 5.2 }, { label: '$6.1K', numeric: 6.1 }, { label: '$5.8K', numeric: 5.8 }] },
  { metric: 'Support tickets', target: '<20/wk', targetNumeric: 20, lowerIsBetter: true, status: 'green',
    weeks: [{ label: '22', numeric: 22 }, { label: '19', numeric: 19 }, { label: '17', numeric: 17 }, { label: '15', numeric: 15 }, { label: '18', numeric: 18 }, { label: '14', numeric: 14 }, { label: '18', numeric: 18 }, { label: '16', numeric: 16 }] },
  { metric: 'Avg reg→dashboard', target: '<30d', targetNumeric: 30, lowerIsBetter: true, status: 'green',
    weeks: [{ label: '42', numeric: 42 }, { label: '40', numeric: 40 }, { label: '38', numeric: 38 }, { label: '36', numeric: 36 }, { label: '35', numeric: 35 }, { label: '34', numeric: 34 }, { label: '32', numeric: 32 }, { label: '27', numeric: 27 }] },
  { metric: 'Failed payments', target: '<3%', targetNumeric: 3, lowerIsBetter: true, status: 'green',
    weeks: [{ label: '2.5%', numeric: 2.5 }, { label: '2.2%', numeric: 2.2 }, { label: '1.8%', numeric: 1.8 }, { label: '1.5%', numeric: 1.5 }, { label: '1.4%', numeric: 1.4 }, { label: '1.2%', numeric: 1.2 }, { label: '2.0%', numeric: 2.0 }, { label: '1.8%', numeric: 1.8 }] },
  { metric: 'First reply time', target: '<4h', targetNumeric: 4, lowerIsBetter: true, status: 'green',
    weeks: [{ label: '3.8h', numeric: 3.8 }, { label: '3.2h', numeric: 3.2 }, { label: '2.9h', numeric: 2.9 }, { label: '2.5h', numeric: 2.5 }, { label: '2.3h', numeric: 2.3 }, { label: '2.1h', numeric: 2.1 }, { label: '3.4h', numeric: 3.4 }, { label: '2.8h', numeric: 2.8 }] },
  { metric: 'CSAT', target: '>80%', targetNumeric: 80, lowerIsBetter: false, status: 'green',
    weeks: [{ label: '76%', numeric: 76 }, { label: '78%', numeric: 78 }, { label: '79%', numeric: 79 }, { label: '80%', numeric: 80 }, { label: '81%', numeric: 81 }, { label: '82%', numeric: 82 }, { label: '78%', numeric: 78 }, { label: '81%', numeric: 81 }] },
]

const statusRowBg: Record<Status, string> = {
  red: 'bg-status-red-light', amber: 'bg-status-amber-light',
  green: 'bg-dash-surface/50', grey: 'bg-dash-surface/50',
}

function cellBg(value: number, target: number, lowerIsBetter: boolean): string {
  const ratio = lowerIsBetter ? target / value : value / target
  if (ratio < 0.8) return 'bg-status-red-light'
  if (ratio > 1.2) return 'bg-status-green-light'
  return ''
}

function sparkColor(row: typeof scorecardRows[number]): string {
  const latest = row.weeks[row.weeks.length - 1].numeric
  const ratio = row.lowerIsBetter ? row.targetNumeric / latest : latest / row.targetNumeric
  if (ratio < 0.8) return '#DC2626'
  if (ratio < 1.0) return '#D97706'
  return '#16A34A'
}

// ---------------------------------------------------------------------------
// 05. IDS Queue
// ---------------------------------------------------------------------------
type IDSStatus = 'Queue' | 'Discussing' | 'Resolved'
interface IDSItem { id: string; topic: string; owner: string; status: IDSStatus }

const defaultIDSItems: IDSItem[] = [
  { id: 'ids-1', topic: 'Member onboarding flow too slow for high-value leads', owner: 'Mark', status: 'Queue' },
  { id: 'ids-2', topic: 'Clinical capacity shortfall impacting NPS', owner: 'Katie', status: 'Discussing' },
  { id: 'ids-3', topic: 'Tableau export automation keeps breaking', owner: 'Alex T', status: 'Queue' },
  { id: 'ids-4', topic: 'Q2 pricing experiment scope', owner: 'Emma', status: 'Queue' },
  { id: 'ids-5', topic: 'Partner channel attribution gap', owner: 'Tom', status: 'Resolved' },
]

const idsStatusOrder: IDSStatus[] = ['Queue', 'Discussing', 'Resolved']
const idsStatusColor: Record<IDSStatus, string> = { Queue: 'text-status-amber', Discussing: 'text-dash-red', Resolved: 'text-status-green' }
const idsStatusBgColor: Record<IDSStatus, string> = { Queue: 'bg-status-amber/10', Discussing: 'bg-dash-red/10', Resolved: 'bg-status-green/10' }

// ---------------------------------------------------------------------------
// 06. To-Do List
// ---------------------------------------------------------------------------
interface TodoItem { id: string; task: string; owner: string; due: string; done: boolean }

const defaultTodos: TodoItem[] = [
  { id: 'todo-1', task: 'Upload latest Tableau data export', owner: 'Alex P', due: '2026-03-07', done: false },
  { id: 'todo-2', task: 'Review clinical capacity planning', owner: 'Katie', due: '2026-03-10', done: false },
  { id: 'todo-3', task: 'Complete Q1 Rock metric updates', owner: 'Emma', due: '2026-03-14', done: false },
  { id: 'todo-4', task: 'Schedule board prep meeting', owner: 'Mark', due: '2026-03-12', done: false },
]

function isOverdue(dueStr: string, done: boolean): boolean {
  if (done) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(dueStr) < today
}

function formatDue(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
const IDS_STORAGE_KEY = 'eos-ids-queue'
const TODOS_STORAGE_KEY = 'eos-todos'

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* */ }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function EosPage() {
  const { rocks, dataMode } = useDashboardData()

  // --- IDS Queue state ---
  const [idsItems, setIDSItems] = useState<IDSItem[]>(defaultIDSItems)
  const [idsLoaded, setIDSLoaded] = useState(false)
  useEffect(() => { setIDSItems(loadFromStorage(IDS_STORAGE_KEY, defaultIDSItems)); setIDSLoaded(true) }, [])
  useEffect(() => { if (idsLoaded) saveToStorage(IDS_STORAGE_KEY, idsItems) }, [idsItems, idsLoaded])
  const advanceIDSStatus = useCallback((id: string) => {
    setIDSItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const idx = idsStatusOrder.indexOf(item.status)
      return idx >= idsStatusOrder.length - 1 ? item : { ...item, status: idsStatusOrder[idx + 1] }
    }))
  }, [])

  // --- To-Do state ---
  const [todos, setTodos] = useState<TodoItem[]>(defaultTodos)
  const [todosLoaded, setTodosLoaded] = useState(false)
  const [showAddTodo, setShowAddTodo] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [newOwner, setNewOwner] = useState('')
  const [newDue, setNewDue] = useState('')
  useEffect(() => { setTodos(loadFromStorage(TODOS_STORAGE_KEY, defaultTodos)); setTodosLoaded(true) }, [])
  useEffect(() => { if (todosLoaded) saveToStorage(TODOS_STORAGE_KEY, todos) }, [todos, todosLoaded])
  const toggleTodo = useCallback((id: string) => { setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t)) }, [])
  const addTodo = useCallback(() => {
    if (!newTask.trim()) return
    setTodos(prev => [...prev, { id: `todo-${Date.now()}`, task: newTask.trim(), owner: newOwner.trim() || 'Unassigned', due: newDue || new Date().toISOString().slice(0, 10), done: false }])
    setNewTask(''); setNewOwner(''); setNewDue(''); setShowAddTodo(false)
  }, [newTask, newOwner, newDue])

  // --- Priorities state (artifact format) ---
  const [priorities, setPriorities] = useState<PrioritiesPayload | null>(dataMode === 'demo' ? DEMO_PRIORITIES : null)
  const [loadingPriorities, setLoadingPriorities] = useState(dataMode !== 'demo')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dataMode === 'demo') {
      setPriorities(DEMO_PRIORITIES)
      setLoadingPriorities(false)
      return
    }
    fetch('/api/priorities')
      .then(r => r.json())
      .then(data => { if (data) setPriorities(typeof data === 'string' ? JSON.parse(data) : data) })
      .catch(() => {})
      .finally(() => setLoadingPriorities(false))
  }, [dataMode])

  const handlePrioritiesUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as PrioritiesPayload
      setPriorities({ ...parsed, uploadedAt: new Date().toISOString() })
      fetch('/api/priorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOf: parsed.weekOf, priorities: parsed }),
      }).catch(() => {})
    } catch (err) {
      console.error('Failed to parse priorities:', err)
    }
  }, [])

  const toggleCompletion = useCallback((key: string) => {
    setPriorities(prev => {
      if (!prev) return prev
      const updated = { ...prev, completionState: { ...prev.completionState, [key]: !prev.completionState[key] } }
      fetch('/api/priorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOf: updated.weekOf, priorities: updated }),
      }).catch(() => {})
      return updated
    })
  }, [])

  // --- Rock expanded state ---
  const [expandedRock, setExpandedRock] = useState<string | null>(null)
  const offTrackCount = rocks.filter(r => r.status === 'off-track' || r.status === 'building').length

  return (
    <div className="space-y-4 md:space-y-10">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'EOS / L10' }]} />

      {/* ================================================================= */}
      {/* 01. Strategic Destination                                         */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={1} title="Strategic Destination — 12 Months" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4">
          <div className="mb-2 flex items-center gap-2">
            <Target size={14} className="text-dash-red" />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-dash-text-secondary">
              Where we need to be by Feb 2027
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {destinationTargets.map(t => (
              <Link key={t.label} href={t.href}
                className="rounded-md border border-dash-border bg-dash-bg p-2.5 transition-all duration-150 hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px md:p-3"
              >
                <span className="font-sans text-[10px] font-medium uppercase tracking-[0.04em] text-dash-text-muted">{t.label}</span>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="font-mono text-sm font-bold text-dash-text md:text-base">{t.now}</span>
                  <span className="font-mono text-[10px] text-dash-text-muted">&rarr; {t.target}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <StatusDot status={t.status} size="sm" />
                  <span className={cn('font-sans text-[10px]',
                    t.status === 'red' ? 'text-status-red' : t.status === 'amber' ? 'text-status-amber' : t.status === 'green' ? 'text-status-green' : 'text-dash-text-muted'
                  )}>
                    {t.status === 'red' ? 'Off pace' : t.status === 'amber' ? 'Tracking' : t.status === 'green' ? 'On track' : 'TBC'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 02. Quarterly Rocks                                               */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={2} title="Q1 2026 Rocks" />
        <div className="mb-3 rounded-md bg-dash-surface-alt px-4 py-2">
          <p className="text-xs font-medium text-dash-text-secondary">47 days left in Q1 2026 &middot; {offTrackCount} need attention</p>
        </div>
        <div className="space-y-3">
          {rocks.map(rock => {
            const isExpanded = expandedRock === rock.id
            const laddersTo = rockLaddersTo[rock.id]
            return (
              <div key={rock.id} className="rounded-lg border border-dash-border bg-dash-surface transition-all duration-150 hover:shadow-sm">
                <button onClick={() => setExpandedRock(isExpanded ? null : rock.id)} className="flex w-full items-center gap-3 p-3 text-left md:p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dash-red font-mono text-[11px] font-bold text-white">R{rock.number}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate font-sans text-sm font-medium text-dash-text">{rock.title}</h4>
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', rockStatusColors[rock.status], rockStatusBg[rock.status])}>{rock.status.replace('-', ' ')}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-dash-text-muted">
                      <span>Owner: {rock.owner}</span>
                      {laddersTo && <span className="hidden sm:inline"><Link2 size={10} className="mr-0.5 inline" />{laddersTo}</span>}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">{rock.metrics.map(m => <StatusDot key={m.label} status={m.status} size="sm" />)}</div>
                  {isExpanded ? <ChevronUp size={16} className="text-dash-text-muted" /> : <ChevronDown size={16} className="text-dash-text-muted" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-dash-border px-3 py-3 md:px-4 md:py-4">
                    {rock.description && <p className="mb-3 text-xs text-dash-text-secondary">{rock.description}</p>}
                    <div className="space-y-2">
                      {rock.metrics.map(m => (
                        <div key={m.label} className="flex items-center justify-between rounded-md bg-dash-bg px-3 py-2">
                          <span className="text-xs text-dash-text-secondary">{m.label}</span>
                          <div className="flex items-center gap-3">
                            {rockMetricSpark[m.label] && rockMetricSpark[m.label].length >= 2 && (
                              <Sparkline data={rockMetricSpark[m.label]} color={m.status === 'red' ? '#DC2626' : m.status === 'amber' ? '#D97706' : '#16A34A'} width={80} height={18} />
                            )}
                            <span className="font-mono text-xs font-medium text-dash-text">{m.current}</span>
                            <span className="text-[10px] text-dash-text-muted">/ {m.target}</span>
                            <StatusDot status={m.status} size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 03. Weekly Priorities — Artifact Format                           */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={3} title={`Weekly Priorities${priorities ? ` — w/c ${priorities.weekOf}` : ''}`} />

        {/* Empty state */}
        {!priorities && !loadingPriorities && (
          <div className="rounded-lg border-2 border-dashed border-dash-border bg-dash-surface p-10 text-center">
            <p className="mb-1 text-sm font-medium text-dash-text">No priorities uploaded this week</p>
            <p className="mb-5 text-xs text-dash-text-muted">Export from your Claude priorities artifact and upload the JSON</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-dash-red px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-dash-red/90 hover:shadow-md">
              <Upload size={16} />Upload Priorities
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handlePrioritiesUpload} />
            </label>
          </div>
        )}

        {loadingPriorities && <div className="h-40 animate-pulse rounded-lg bg-dash-surface-alt" />}

        {priorities && (
          <div className="space-y-6">

            {/* Org Focus */}
            <div>
              <div className="mb-3">
                <span className="text-[9px] font-semibold uppercase tracking-[3px] text-dash-text-muted">Organisation</span>
                <h3 className="font-serif text-xl font-semibold text-dash-text">Weekly Priorities</h3>
                <div className="mt-2 h-px w-8 bg-dash-red" />
              </div>
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-dash-border sm:grid-cols-2">
                {priorities.orgPriorities.map((op, idx) => {
                  const c = ORG_COLORS[op.id] || { color: '#737373', bg: '#F5F5F5' }
                  return (
                    <div key={op.id} className="bg-dash-surface p-5 md:p-6">
                      <div className="flex items-start gap-3.5">
                        <span className="font-serif text-3xl font-light text-dash-border-strong select-none">{idx + 1}</span>
                        <div>
                          <span className="mb-2 inline-block rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ color: c.color, backgroundColor: c.bg }}>{op.label}</span>
                          <p className="font-serif text-[15px] font-semibold leading-tight text-dash-text">{op.title}</p>
                          <p className="mt-1.5 text-xs leading-relaxed text-dash-text-secondary">{op.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Last Week Completion Bar */}
            {(() => {
              const allKeys = priorities.lastWeek.flatMap(l => l.priorities.map((_, i) => `${l.name}|${i}`))
              const doneCount = allKeys.filter(k => priorities.completionState[k]).length
              const pct = allKeys.length > 0 ? Math.round((doneCount / allKeys.length) * 100) : 0
              return allKeys.length > 0 ? (
                <div className="flex items-center gap-5 rounded-lg border border-dash-border bg-dash-surface px-5 py-3">
                  <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[3px] text-dash-text-muted">Last week completion</span>
                  <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-dash-surface-alt">
                    <div className="h-full rounded-full bg-dash-red transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="shrink-0">
                    <span className="font-serif text-xl font-semibold text-dash-text">{doneCount}</span>
                    <span className="font-serif text-sm text-dash-text-muted">/{allKeys.length}</span>
                    <span className="ml-1.5 text-[10px] text-dash-text-muted">{pct}%</span>
                  </div>
                </div>
              ) : null
            })()}

            {/* Individual Priorities */}
            <div>
              <div className="mb-3">
                <span className="text-[9px] font-semibold uppercase tracking-[3px] text-dash-text-muted">Team</span>
                <h3 className="font-serif text-xl font-semibold text-dash-text">Individual Priorities</h3>
                <div className="mt-2 h-px w-8 bg-dash-red" />
              </div>
              <div className="space-y-px">
                {priorities.thisWeek.map(person => {
                  const lw = priorities.lastWeek.find(l => l.name === person.name)
                  const lwPriorities = lw?.priorities || []
                  const lwDone = lwPriorities.filter((_, i) => priorities.completionState[`${person.name}|${i}`]).length
                  const lwAllDone = lwPriorities.length > 0 && lwDone === lwPriorities.length
                  return (
                    <div key={person.name} className="overflow-hidden rounded-lg border border-dash-border bg-dash-surface">
                      {/* Person header */}
                      <div className="flex items-center gap-4 border-b border-dash-border bg-[#FAFAFA] px-5 py-3.5 md:px-7">
                        <div className="h-8 w-0.5 shrink-0 bg-dash-red" />
                        <div className="flex-1">
                          <div className="font-serif text-lg font-semibold text-dash-text">{person.name}</div>
                          <div className="text-[10px] uppercase tracking-[1.2px] text-dash-text-muted">{person.role}</div>
                        </div>
                        {lwPriorities.length > 0 && (
                          <span className={cn('text-[11px]', lwAllDone ? 'font-semibold text-dash-red' : 'text-dash-text-muted')}>
                            {lwAllDone ? 'Last week: all done' : `Last week: ${lwDone}/${lwPriorities.length}`}
                          </span>
                        )}
                      </div>
                      {/* Two-column body */}
                      <div className="grid grid-cols-1 lg:grid-cols-2">
                        {/* This Week */}
                        <div className="lg:border-r lg:border-dash-border">
                          <div className="border-b border-[#F6F6F6] px-5 py-2.5 md:px-7">
                            <span className="text-[9px] font-bold uppercase tracking-[2px] text-dash-red">This Week</span>
                          </div>
                          {person.priorities.map((p, pIdx) => {
                            const linked = autoLinkMetrics(p.title + ' ' + p.description)
                            return (
                              <div key={pIdx} className="border-b border-[#F6F6F6] px-5 py-3.5 last:border-b-0 md:px-7">
                                <p className="font-serif text-sm font-semibold leading-snug text-dash-text">{p.title}</p>
                                <p className="mt-1 text-[11px] leading-relaxed text-dash-text-secondary">{p.description}</p>
                                {p.org.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {p.org.map(id => {
                                      const op = priorities.orgPriorities.find(o => o.id === id)
                                      const c = ORG_COLORS[id]
                                      if (!op || !c) return null
                                      return (
                                        <span key={id} className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                                          style={{ color: c.color, backgroundColor: c.bg, border: `1px solid ${c.color}20` }}>
                                          {op.label}
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}
                                {linked.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {linked.map(lm => (
                                      <Link key={lm.metricId} href={lm.page}
                                        className="inline-flex items-center gap-1 rounded border border-dash-border bg-dash-surface-alt px-2 py-1 text-[10px] transition-all hover:border-dash-border-strong">
                                        <span className="text-dash-text-secondary">{lm.label}</span>
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {/* Last Week */}
                        <div>
                          <div className="border-b border-[#F6F6F6] px-5 py-2.5 md:px-7">
                            <span className="text-[9px] font-bold uppercase tracking-[2px] text-dash-text-muted">Last Week</span>
                          </div>
                          {lwPriorities.length === 0 ? (
                            <div className="px-5 py-4 text-xs italic text-dash-text-muted md:px-7">No priorities recorded</div>
                          ) : lwPriorities.map((p, pIdx) => {
                            const key = `${person.name}|${pIdx}`
                            const done = !!priorities.completionState[key]
                            return (
                              <div key={pIdx} onClick={() => toggleCompletion(key)}
                                className={cn('flex cursor-pointer items-start gap-3 border-b border-[#F6F6F6] px-5 py-3.5 last:border-b-0 transition-colors md:px-7', done ? 'bg-[#FEF9F9]' : 'hover:bg-dash-surface-hover')}>
                                <div className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border-[1.5px] transition-all', done ? 'border-dash-red bg-dash-red' : 'border-dash-border')}>
                                  {done && <svg width="8" height="6" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                </div>
                                <span className={cn('select-none text-xs leading-relaxed transition-colors', done ? 'text-dash-text-muted line-through' : 'text-dash-text-secondary')}>{p.title}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[11px] text-dash-text-muted">
              <span>
                {priorities.uploadedAt
                  ? `Uploaded: ${new Date(priorities.uploadedAt).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                  : dataMode === 'demo' ? 'Demo data' : ''}
              </span>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-dash-red hover:underline">
                  {priorities ? 'Re-upload' : 'Upload'}
                  <input type="file" accept=".json" className="hidden" onChange={handlePrioritiesUpload} />
                </label>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 04. Weekly Scorecard                                              */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={4} title="Weekly Scorecard" />
        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {scorecardRows.map(row => {
            const latest = row.weeks[row.weeks.length - 1]
            return (
              <div key={row.metric} className={cn('rounded-lg border border-dash-border p-3', statusRowBg[row.status])}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-dash-text">{row.metric}</span>
                  <StatusDot status={row.status} />
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-lg font-bold text-dash-text">{latest.label}</span>
                  <span className="font-mono text-[10px] text-dash-text-muted">target: {row.target}</span>
                </div>
                <div className="mt-1.5"><Sparkline data={row.weeks.map(w => w.numeric)} color={sparkColor(row)} width={200} height={20} /></div>
              </div>
            )
          })}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Metric</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Target</th>
                {Array.from({ length: 8 }, (_, i) => (
                  <th key={i} className="px-2 py-3 text-right font-mono text-[10px] font-medium text-dash-text-muted">{i === 7 ? 'This Wk' : `W${i - 7}`}</th>
                ))}
                <th className="px-3 py-3 text-center font-medium text-dash-text-secondary">Trend</th>
                <th className="px-3 py-3 text-center font-medium text-dash-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {scorecardRows.map(row => (
                <tr key={row.metric} className={statusRowBg[row.status]}>
                  <td className="px-4 py-2 font-medium text-dash-text">{row.metric}</td>
                  <td className="px-4 py-2 font-mono text-xs text-dash-text-muted">{row.target}</td>
                  {row.weeks.map((wk, i) => (
                    <td key={i} className={`px-2 py-2 text-right font-mono text-xs ${i === row.weeks.length - 1 ? 'font-semibold text-dash-text' : 'text-dash-text-secondary'} ${cellBg(wk.numeric, row.targetNumeric, row.lowerIsBetter)}`}>{wk.label}</td>
                  ))}
                  <td className="px-3 py-2 text-center"><Sparkline data={row.weeks.map(w => w.numeric)} color={sparkColor(row)} width={80} height={20} /></td>
                  <td className="px-3 py-2 text-center"><StatusDot status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 05. IDS Queue                                                     */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={5} title="IDS Queue — This Week" />
        <div className="space-y-2 md:hidden">
          {idsItems.map(item => (
            <div key={item.id} className="rounded-lg border border-dash-border bg-dash-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-dash-text">{item.topic}</p>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', idsStatusColor[item.status], idsStatusBgColor[item.status])}>{item.status}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-dash-text-muted">{item.owner}</span>
                {item.status !== 'Resolved' && (
                  <button onClick={() => advanceIDSStatus(item.id)} className="rounded border border-dash-border px-2 py-0.5 text-[10px] font-medium text-dash-text hover:bg-dash-border">Advance &rarr;</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-dash-border bg-dash-surface">
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Topic</th>
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Owner</th>
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Status</th>
              <th className="px-4 py-3 font-medium text-dash-text-secondary" />
            </tr></thead>
            <tbody className="divide-y divide-dash-border">
              {idsItems.map(item => (
                <tr key={item.id} className="bg-dash-surface/50">
                  <td className="px-4 py-2 text-dash-text">{item.topic}</td>
                  <td className="px-4 py-2 text-dash-text-secondary">{item.owner}</td>
                  <td className="px-4 py-2"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${idsStatusColor[item.status]} ${idsStatusBgColor[item.status]}`}>{item.status}</span></td>
                  <td className="px-4 py-2 text-right">
                    {item.status !== 'Resolved' && (
                      <button onClick={() => advanceIDSStatus(item.id)} className="rounded border border-dash-border bg-dash-surface px-2.5 py-1 text-xs font-medium text-dash-text transition-colors hover:bg-dash-border">Advance &rarr;</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 06. To-Do List                                                    */}
      {/* ================================================================= */}
      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading number={6} title="To-Do List" />
          <button onClick={() => setShowAddTodo(v => !v)} className="rounded border border-dash-border bg-dash-surface px-3 py-1.5 text-xs font-medium text-dash-text transition-colors hover:bg-dash-border">
            {showAddTodo ? 'Cancel' : '+ Add To-Do'}
          </button>
        </div>
        {showAddTodo && (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-dash-text-muted">Task</label>
              <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)} className="w-full rounded border border-dash-border bg-dash-bg px-3 py-1.5 text-sm text-dash-text outline-none focus:border-dash-red" placeholder="What needs doing?" />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-dash-text-muted">Owner</label>
              <input type="text" value={newOwner} onChange={e => setNewOwner(e.target.value)} className="w-full rounded border border-dash-border bg-dash-bg px-3 py-1.5 text-sm text-dash-text outline-none focus:border-dash-red" placeholder="Name" />
            </div>
            <div className="w-36">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-dash-text-muted">Due</label>
              <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="w-full rounded border border-dash-border bg-dash-bg px-3 py-1.5 text-sm text-dash-text outline-none focus:border-dash-red" />
            </div>
            <button onClick={addTodo} className="rounded bg-dash-red px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-dash-red/90">Add</button>
          </div>
        )}
        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {todos.map(row => {
            const overdue = isOverdue(row.due, row.done)
            return (
              <div key={row.id} className={cn('rounded-lg border border-dash-border bg-dash-surface p-3', overdue && 'border-l-4 border-l-status-red', row.done && 'opacity-60')}>
                <div className="flex items-start gap-2">
                  <button onClick={() => toggleTodo(row.id)} className={cn('mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs', row.done ? 'border-status-green bg-status-green/20 text-status-green' : 'border-dash-border')}>
                    {row.done ? '✓' : ''}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', row.done ? 'line-through text-dash-text-muted' : overdue ? 'text-status-red' : 'text-dash-text')}>{row.task}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-dash-text-muted">
                      <span>{row.owner}</span>
                      <span className={overdue ? 'font-semibold text-status-red' : ''}>{formatDue(row.due)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-dash-border bg-dash-surface">
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Task</th>
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Owner</th>
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Due</th>
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-dash-border">
              {todos.map(row => {
                const overdue = isOverdue(row.due, row.done)
                return (
                  <tr key={row.id} className={`${overdue ? 'border-l-4 border-l-status-red' : ''} ${row.done ? 'bg-dash-surface/30' : 'bg-dash-surface/50'}`}>
                    <td className="px-4 py-2">
                      <button onClick={() => toggleTodo(row.id)} className={cn('inline-flex h-4 w-4 items-center justify-center rounded border text-xs', row.done ? 'border-status-green bg-status-green/20 text-status-green' : 'border-dash-border')}>
                        {row.done ? '✓' : ''}
                      </button>
                    </td>
                    <td className={`px-4 py-2 ${row.done ? 'line-through text-dash-text-muted' : overdue ? 'text-status-red' : 'text-dash-text'}`}>{row.task}</td>
                    <td className="px-4 py-2 text-dash-text-secondary">{row.owner}</td>
                    <td className={`px-4 py-2 font-mono text-xs ${overdue ? 'font-semibold text-status-red' : 'text-dash-text-muted'}`}>{formatDue(row.due)}</td>
                    <td className="px-4 py-2">
                      {row.done ? <span className="inline-block rounded-full bg-status-green/10 px-2.5 py-0.5 text-xs font-medium text-status-green">done</span>
                        : overdue ? <span className="inline-block rounded-full bg-status-red/10 px-2.5 py-0.5 text-xs font-medium text-status-red">overdue</span>
                        : <span className="inline-block rounded-full bg-status-amber/10 px-2.5 py-0.5 text-xs font-medium text-status-amber">pending</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

```

## `src/app/financial/page.tsx`

```tsx
'use client'

import { useMemo, useState } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { ChartPeriodToggle } from '@/components/dashboard/chart-period-toggle'
import {
  ResponsiveContainer,
  LineChart as RechartLineChart,
  BarChart as RechartBarChart,
  PieChart,
  Pie,
  Cell,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridStyle, gridProps, tooltipStyle, legendStyle, lineDot, TMRW_COLORS } from '@/lib/utils/chart-styles'
import { useDashboardData } from '@/lib/context/data-context'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function formatMonthKey(key: string) {
  const [year, month] = key.split('-')
  return `${MONTH_LABELS[parseInt(month, 10) - 1]} ${year}`
}

function txTypeLabel(type: string): string {
  switch (type) {
    case 'foundations-membership': return 'Foundations'
    case 'advanced-testing': return 'Advanced Testing'
    case 'supplements': return 'Supplements'
    case 'medication': return 'Medication'
    case 'treatment-journey': return 'Treatment Journeys'
    default: return 'Other'
  }
}

function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function weekKeyFromDate(d: Date): string {
  const startOfYear = new Date(d.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000)
  const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
  return `W${String(weekNum).padStart(2, '0')} ${d.getFullYear()}`
}

function quarterKeyFromDate(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1
  return `Q${q} ${d.getFullYear()}`
}

// ---------------------------------------------------------------------------
// Forecast data (hardcoded per spec)
// ---------------------------------------------------------------------------

const forecastData = [
  { month: 'Sep 2025', forecast: 8000 },
  { month: 'Oct 2025', forecast: 10500 },
  { month: 'Nov 2025', forecast: 13000 },
  { month: 'Dec 2025', forecast: 16000 },
  { month: 'Jan 2026', forecast: 22000 },
  { month: 'Feb 2026', forecast: 28000 },
]

const failureReasonTrend = [
  { month: 'Oct 2025', 'Insufficient Funds': 2, 'Card Expired': 1, 'Do Not Honor': 1, 'Other': 0 },
  { month: 'Nov 2025', 'Insufficient Funds': 3, 'Card Expired': 1, 'Do Not Honor': 0, 'Other': 1 },
  { month: 'Dec 2025', 'Insufficient Funds': 2, 'Card Expired': 2, 'Do Not Honor': 1, 'Other': 0 },
  { month: 'Jan 2026', 'Insufficient Funds': 4, 'Card Expired': 1, 'Do Not Honor': 2, 'Other': 1 },
  { month: 'Feb 2026', 'Insufficient Funds': 7, 'Card Expired': 4, 'Do Not Honor': 3, 'Other': 1 },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FinancialPage() {
  const { transactions, manualMetrics, members } = useDashboardData()
  const { unitEconomics } = manualMetrics

  // Period toggle state
  const [revenueByMonthPeriod, setRevenueByMonthPeriod] = useState('month')
  const [waterfallPeriod, setWaterfallPeriod] = useState('monthly')
  const [forecastPeriod] = useState('monthly')

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const authorizedTx = useMemo(
    () => transactions.filter((tx) => tx.outcome === 'authorized'),
    [transactions]
  )

  const totalRevenue = useMemo(
    () => authorizedTx.reduce((sum, tx) => sum + tx.amount, 0),
    [authorizedTx]
  )

  const avgTransactionValue = useMemo(
    () => (authorizedTx.length > 0 ? totalRevenue / authorizedTx.length : 0),
    [authorizedTx, totalRevenue]
  )

  const declinedTx = useMemo(
    () => transactions.filter((tx) => tx.outcome === 'declined' || tx.outcome === 'blocked'),
    [transactions]
  )

  const declinedRate = useMemo(
    () => (transactions.length > 0 ? (declinedTx.length / transactions.length) * 100 : 0),
    [declinedTx, transactions]
  )

  // Revenue by type
  const revenueByType = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const tx of authorizedTx) {
      const key = txTypeLabel(tx.type)
      acc[key] = (acc[key] || 0) + tx.amount
    }
    return acc
  }, [authorizedTx])

  const revenueTypeRows = useMemo(() => {
    const entries = Object.entries(revenueByType)
    const total = entries.reduce((s, [, v]) => s + v, 0)
    return entries
      .map(([label, amount]) => ({
        label,
        amount: Math.round(amount),
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [revenueByType])


  // Revenue by period (for the bar chart in Section 2b)
  const revenueByPeriod = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {}
    for (const tx of authorizedTx) {
      const d = new Date(tx.createdAt)
      let key: string
      switch (revenueByMonthPeriod) {
        case 'week':
          key = weekKeyFromDate(d)
          break
        case 'quarter':
          key = quarterKeyFromDate(d)
          break
        case 'ytd': {
          const year = d.getFullYear().toString()
          key = year
          break
        }
        default:
          key = formatMonthKey(monthKeyFromDate(d))
      }
      if (!grouped[key]) grouped[key] = { 'Foundations': 0, 'Advanced Testing': 0, 'Supplements': 0, 'Medication': 0, 'Treatment Journeys': 0 }
      grouped[key][txTypeLabel(tx.type)] += tx.amount
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, vals]) => ({
        period,
        ...Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, Math.round(v)])),
      }))
  }, [authorizedTx, revenueByMonthPeriod])


  // MRR Waterfall — derive from monthly subscription transactions
  const mrrWaterfall = useMemo(() => {
    // Group subscription revenue by member by month
    const memberMonthly: Record<string, Record<string, number>> = {}
    for (const tx of authorizedTx) {
      if (tx.type !== 'foundations-membership' || !tx.memberId) continue
      const d = new Date(tx.createdAt)
      const mKey = monthKeyFromDate(d)
      if (!memberMonthly[tx.memberId]) memberMonthly[tx.memberId] = {}
      memberMonthly[tx.memberId][mKey] = (memberMonthly[tx.memberId][mKey] || 0) + tx.amount
    }

    const allMonths = Array.from(
      new Set(Object.values(memberMonthly).flatMap((m) => Object.keys(m)))
    ).sort()

    if (allMonths.length < 2) return []

    const rows = []
    for (let i = 1; i < allMonths.length; i++) {
      const prev = allMonths[i - 1]
      const curr = allMonths[i]
      let newMrr = 0
      let expansion = 0
      let contraction = 0
      let churned = 0
      let starting = 0

      for (const mid of Object.keys(memberMonthly)) {
        const prevVal = memberMonthly[mid][prev] || 0
        const currVal = memberMonthly[mid][curr] || 0
        starting += prevVal

        if (prevVal === 0 && currVal > 0) {
          newMrr += currVal
        } else if (prevVal > 0 && currVal === 0) {
          churned -= prevVal
        } else if (currVal > prevVal) {
          expansion += currVal - prevVal
        } else if (currVal < prevVal) {
          contraction -= prevVal - currVal
        }
      }

      const ending = starting + newMrr + expansion + contraction + churned
      rows.push({
        month: formatMonthKey(curr),
        starting: Math.round(starting),
        new: Math.round(newMrr),
        expansion: Math.round(expansion),
        contraction: Math.round(contraction),
        churned: Math.round(churned),
        ending: Math.round(ending),
      })
    }
    return rows
  }, [authorizedTx])

  // MRR Waterfall filtered by waterfallPeriod (monthly vs quarterly)
  const filteredMrrWaterfall = useMemo(() => {
    if (waterfallPeriod === 'monthly') return mrrWaterfall
    // Quarterly: group every 3 consecutive months and sum the values
    if (mrrWaterfall.length === 0) return []
    const quarters: typeof mrrWaterfall = []
    for (let i = 0; i < mrrWaterfall.length; i += 3) {
      const chunk = mrrWaterfall.slice(i, i + 3)
      const starting = chunk[0].starting
      const ending = chunk[chunk.length - 1].ending
      const newMrr = chunk.reduce((s, r) => s + r.new, 0)
      const expansion = chunk.reduce((s, r) => s + r.expansion, 0)
      const contraction = chunk.reduce((s, r) => s + r.contraction, 0)
      const churned = chunk.reduce((s, r) => s + r.churned, 0)
      // Derive quarter label from the last month in the chunk
      const lastLabel = chunk[chunk.length - 1].month
      const parts = lastLabel.split(' ')
      const mIdx = MONTH_LABELS.indexOf(parts[0])
      const qNum = Math.floor(mIdx / 3) + 1
      const qLabel = `Q${qNum} ${parts[1]}`
      quarters.push({
        month: qLabel,
        starting: Math.round(starting),
        new: Math.round(newMrr),
        expansion: Math.round(expansion),
        contraction: Math.round(contraction),
        churned: Math.round(churned),
        ending: Math.round(ending),
      })
    }
    return quarters
  }, [mrrWaterfall, waterfallPeriod])

  // Net MRR Change (for bar chart above waterfall table)
  const netMrrChange = useMemo(
    () =>
      filteredMrrWaterfall.map((row) => ({
        month: row.month,
        'Net Change': row.new + row.expansion + row.contraction + row.churned,
      })),
    [filteredMrrWaterfall]
  )

  // MRR sparkline for MRR card
  const mrrSparkline = useMemo(
    () => mrrWaterfall.map((r) => r.ending),
    [mrrWaterfall]
  )

  const currentMrr = mrrWaterfall.length > 0 ? mrrWaterfall[mrrWaterfall.length - 1].ending : 0

  // Cohort Revenue
  const cohortRevenue = useMemo(() => {
    // Group members by their first transaction month (cohort)
    const memberFirstMonth: Record<string, string> = {}
    for (const tx of authorizedTx) {
      if (!tx.memberId) continue
      const d = new Date(tx.createdAt)
      const mKey = monthKeyFromDate(d)
      if (!memberFirstMonth[tx.memberId] || mKey < memberFirstMonth[tx.memberId]) {
        memberFirstMonth[tx.memberId] = mKey
      }
    }

    // Group revenue by cohort and month offset
    const cohortData: Record<string, Record<number, number>> = {}
    for (const tx of authorizedTx) {
      if (!tx.memberId) continue
      const cohort = memberFirstMonth[tx.memberId]
      if (!cohort) continue
      const d = new Date(tx.createdAt)
      const txMonth = monthKeyFromDate(d)
      const [cY, cM] = cohort.split('-').map(Number)
      const [tY, tM] = txMonth.split('-').map(Number)
      const offset = (tY - cY) * 12 + (tM - cM)
      if (!cohortData[cohort]) cohortData[cohort] = {}
      cohortData[cohort][offset] = (cohortData[cohort][offset] || 0) + tx.amount
    }

    const cohorts = Object.keys(cohortData).sort()
    const maxOffset = 5

    return cohorts.map((cohort) => {
      const row: Record<string, number | string | null> = { cohort: formatMonthKey(cohort) }
      for (let i = 0; i <= maxOffset; i++) {
        const val = cohortData[cohort][i]
        row[`m${i}`] = val != null ? Math.round(val) : null
      }
      return row
    })
  }, [authorizedTx])

  // Cohort heatmap max
  const cohortMax = useMemo(() => {
    let max = 0
    for (const row of cohortRevenue) {
      for (let i = 0; i <= 5; i++) {
        const val = row[`m${i}`]
        if (typeof val === 'number' && val > max) max = val
      }
    }
    return max
  }, [cohortRevenue])

  // Failure reasons
  const failureReasons = useMemo(() => {
    const reasons: Record<string, number> = {}
    for (const tx of declinedTx) {
      const reason = tx.outcome === 'declined' ? 'Declined' : 'Blocked'
      reasons[reason] = (reasons[reason] || 0) + 1
    }
    const total = Object.values(reasons).reduce((s, v) => s + v, 0)
    return Object.entries(reasons)
      .map(([reason, count]) => ({
        reason,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [declinedTx])

  // Active members count
  const activeMembers = useMemo(
    () => members.filter((m) => ('status' in m ? (m as Record<string, unknown>).status === 'active' : true)).length,
    [members]
  )

  // Unit economics derived values
  const revenuePerMember = useMemo(
    () => (activeMembers > 0 ? totalRevenue / activeMembers : 0),
    [totalRevenue, activeMembers]
  )

  // Actual vs Forecast
  const actualVsForecast = useMemo(() => {
    const monthlyActual: Record<string, number> = {}
    for (const tx of authorizedTx) {
      const d = new Date(tx.createdAt)
      const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`
      monthlyActual[label] = (monthlyActual[label] || 0) + tx.amount
    }

    return forecastData.map((f) => ({
      month: f.month,
      Actual: Math.round(monthlyActual[f.month] || 0),
      Forecast: f.forecast,
    }))
  }, [authorizedTx])

  const latestVariance = useMemo(() => {
    const last = actualVsForecast[actualVsForecast.length - 1]
    if (!last) return { amount: 0, pct: 0 }
    const diff = last.Actual - last.Forecast
    return {
      amount: diff,
      pct: last.Forecast > 0 ? Math.round((diff / last.Forecast) * 100) : 0,
    }
  }, [actualVsForecast])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb + Data Sources */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Financial' }]} />
        <div className="flex items-center gap-2">
          <DataSourceBadge source="stripe" />
          <DataSourceBadge source="manual" />
        </div>
      </div>

      {/* Section 1: Revenue Headlines */}
      <section>
        <SectionHeading number={1} title="Revenue Headlines" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <MetricCard
            label="MRR"
            value={`$${currentMrr.toLocaleString()}`}
            status="green"
            target="$15K"
            sparkline={mrrSparkline}
          />
          <MetricCard
            label="Total Revenue (Period)"
            value={`$${totalRevenue.toLocaleString()}`}
            status="amber"
            target="$100K"
            sparkline={[6800, 8900, 10500, 12100, 19500, 23499]}
          />
          <MetricCard
            label="Avg Transaction Value"
            value={`$${Math.round(avgTransactionValue).toLocaleString()}`}
            status="green"
            sparkline={[148, 152, 155, 158, 160, 162]}
          />
          <MetricCard
            label="Declined Payments"
            value={`${declinedRate.toFixed(1)}%`}
            status="green"
            target="<5%"
            direction="lower-better"
            sparkline={[4.2, 3.8, 3.5, 3.2, 3.0, 3.0]}
          />
        </div>
      </section>

      {/* Section 1b: Unit Economics Ratios */}
      <section>
        <SectionHeading number={1} title="Unit Economics Ratios" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <MetricCard
            label="LTV:CAC Ratio"
            value={`${unitEconomics.ltvCacRatio}:1`}
            status="green"
            target=">3:1"
            sparkline={[2.4, 2.6, 2.8, 2.9, 3.0, 3.2]}
          />
          <MetricCard
            label="Months to Payback"
            value={String(unitEconomics.cacPaybackMonths)}
            status="green"
            target="<6"
            direction="lower-better"
            sparkline={[6.2, 5.8, 5.5, 5.2, 5.0, 4.8]}
          />
          <MetricCard
            label="Revenue per Member"
            value={`$${Math.round(revenuePerMember).toLocaleString()}`}
            status="amber"
            sparkline={[240, 252, 260, 268, 278, 286]}
          />
          <MetricCard
            label="Gross-to-Net Margin"
            value="20%"
            status="amber"
            sparkline={[15, 16, 17, 18, 19, 20]}
          />
        </div>
      </section>

      {/* Section 2: Revenue by Month */}
      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading number={2} title="Revenue by Month" />
          <ChartPeriodToggle
            options={[
              { label: 'Week', value: 'week' },
              { label: 'Month', value: 'month' },
              { label: 'Quarter', value: 'quarter' },
              { label: 'YTD', value: 'ytd' },
            ]}
            selected={revenueByMonthPeriod}
            onChange={setRevenueByMonthPeriod}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 lg:col-span-2">
            <ResponsiveContainer width="100%" height={256} className="h-48 md:h-64">
              <RechartBarChart data={revenueByPeriod}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="period" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={50} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `$${(Number(v) / 1000).toFixed(1)}K`} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="Foundations" stackId="revenue" fill={TMRW_COLORS.red} />
                <Bar dataKey="Advanced Testing" stackId="revenue" fill={TMRW_COLORS.amber} />
                <Bar dataKey="Supplements" stackId="revenue" fill={TMRW_COLORS.green} />
                <Bar dataKey="Medication" stackId="revenue" fill={TMRW_COLORS.blue} />
                <Bar dataKey="Treatment Journeys" stackId="revenue" fill={TMRW_COLORS.purple} radius={[4, 4, 0, 0]} />
              </RechartBarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Type donut */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              By Type
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={revenueTypeRows}
                  dataKey="amount"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {revenueTypeRows.map((_, i) => (
                    <Cell key={i} fill={[TMRW_COLORS.red, TMRW_COLORS.amber, TMRW_COLORS.green, TMRW_COLORS.blue, TMRW_COLORS.purple][i % 5]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `$${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={legendStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Section 3: MRR Waterfall */}
      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading number={3} title="MRR Waterfall" />
          <ChartPeriodToggle
            options={[
              { label: 'Monthly', value: 'monthly' },
              { label: 'Quarterly', value: 'quarterly' },
            ]}
            selected={waterfallPeriod}
            onChange={setWaterfallPeriod}
          />
        </div>
        <div className="mb-4">
          <ResponsiveContainer width="100%" height={192} className="h-48">
            <RechartBarChart data={netMrrChange}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={50} tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `${Number(v) >= 0 ? '+' : ''}$${Number(v).toLocaleString()}`} />
              <Bar dataKey="Net Change" fill={TMRW_COLORS.green} radius={[4, 4, 0, 0]} />
            </RechartBarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">{waterfallPeriod === 'quarterly' ? 'Quarter' : 'Month'}</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Starting</th>
                <th className="px-4 py-3 text-right font-medium text-status-green">+ New</th>
                <th className="px-4 py-3 text-right font-medium text-status-green">+ Expansion</th>
                <th className="px-4 py-3 text-right font-medium text-status-amber">- Contraction</th>
                <th className="px-4 py-3 text-right font-medium text-status-red">- Churned</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Ending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {filteredMrrWaterfall.map((row) => (
                <tr key={row.month} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{row.month}</td>
                  <td className="px-4 py-2 text-right font-mono text-dash-text">
                    ${row.starting.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-status-green">
                    +${row.new.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-status-green">
                    +${row.expansion.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-status-amber">
                    -${Math.abs(row.contraction).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-status-red">
                    -${Math.abs(row.churned).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-dash-text">
                    ${row.ending.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4: Cohort Revenue (Heatmap) */}
      <section>
        <SectionHeading number={4} title="Cohort Revenue" />
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Cohort</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">M0</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">M1</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">M2</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">M3</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">M4</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">M5</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {cohortRevenue.map((row) => (
                <tr key={row.cohort as string} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{row.cohort as string}</td>
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const val = row[`m${i}`] as number | null
                    const intensity = val != null && cohortMax > 0 ? (val as number) / cohortMax : 0
                    return (
                      <td
                        key={i}
                        className="px-4 py-2 text-right font-mono text-dash-text"
                        style={
                          val != null
                            ? { backgroundColor: `rgba(37, 99, 235, ${0.08 + intensity * 0.35})` }
                            : undefined
                        }
                      >
                        {val != null ? `$${(val as number).toLocaleString()}` : (
                          <span className="text-dash-text-muted">&mdash;</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5: Actual vs Forecast */}
      <section>
        <SectionHeading number={5} title="Actual vs Forecast" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <ResponsiveContainer width="100%" height={288} className="h-56 md:h-72">
            <RechartLineChart data={actualVsForecast} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} tickLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} tickLine={axisLineStyle} width={60} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${(Number(v) / 1000).toFixed(1)}K`} />
              <Legend wrapperStyle={legendStyle} />
              <Line type="monotone" dataKey="Actual" stroke={TMRW_COLORS.blue} strokeWidth={3} dot={lineDot(TMRW_COLORS.blue)} activeDot={{ r: 7, fill: TMRW_COLORS.blue, stroke: '#fff', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="Forecast" stroke={TMRW_COLORS.grey} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: TMRW_COLORS.grey, stroke: '#fff', strokeWidth: 1 }} />
            </RechartLineChart>
          </ResponsiveContainer>
          <div className="mt-4 rounded-md border border-dash-border bg-dash-surface p-3">
            <p className="text-sm text-dash-text-secondary">
              <span className="font-medium text-dash-text">Latest Month Variance:</span>{' '}
              <span
                className={
                  latestVariance.amount >= 0 ? 'text-status-green' : 'text-status-red'
                }
              >
                {latestVariance.amount >= 0 ? '+' : ''}${latestVariance.amount.toLocaleString()}{' '}
                ({latestVariance.pct >= 0 ? '+' : ''}{latestVariance.pct}%)
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: Refunds & Failures */}
      <section>
        <SectionHeading number={6} title="Refunds & Failures" />
        <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-2">
          <MetricCard
            label="Declined Rate"
            value={`${declinedRate.toFixed(1)}%`}
            status="green"
            target="<5%"
            direction="lower-better"
          />
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Failure Reason</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Count</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {failureReasons.map((row) => (
                <tr key={row.reason} className="bg-dash-surface/50">
                  <td className="px-4 py-2 text-dash-text">{row.reason}</td>
                  <td className="px-4 py-2 text-right font-mono text-dash-text">{row.count}</td>
                  <td className="px-4 py-2 text-right font-mono text-dash-text-secondary">{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Failure Reason Trend
          </h3>
          <ResponsiveContainer width="100%" height={256} className="h-48 md:h-64">
            <RechartBarChart data={failureReasonTrend}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="Insufficient Funds" stackId="1" fill={TMRW_COLORS.red} />
              <Bar dataKey="Card Expired" stackId="1" fill={TMRW_COLORS.amber} />
              <Bar dataKey="Do Not Honor" stackId="1" fill={TMRW_COLORS.purple} />
              <Bar dataKey="Other" stackId="1" fill={TMRW_COLORS.grey} />
            </RechartBarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Section 7: Unit Economics */}
      <section>
        <SectionHeading number={7} title="Unit Economics" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <MetricCard
            label="Blended CAC"
            value={`$${unitEconomics.blendedCAC}`}
            status="green"
            target="<$100"
            direction="lower-better"
          />
          <MetricCard
            label="CM/Member"
            value={`$${unitEconomics.contributionMarginPerMember}`}
            status="amber"
            target=">$80"
          />
          <MetricCard
            label="LTV:CAC"
            value={String(unitEconomics.ltvCacRatio)}
            status="green"
            target=">3"
          />
          <MetricCard
            label="CAC Payback"
            value={`${unitEconomics.cacPaybackMonths} months`}
            status="amber"
            target="<6 months"
            direction="lower-better"
          />
        </div>
      </section>

    </div>
  )
}

```

## `src/app/globals.css`

```css
@import "tailwindcss";
@source "../../node_modules/@tremor/react/dist/**/*.js";

@theme {
  --font-sans: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --font-serif: 'Crimson Text', Georgia, serif;

  /* Surfaces — INCREASED CONTRAST */
  --color-dash-bg: #FFFFFF;
  --color-dash-surface: #FFFFFF;
  --color-dash-surface-hover: #F7F7F7;
  --color-dash-surface-alt: #F5F5F5;
  --color-dash-header: #1A1A1A;
  --color-dash-sidebar: #F9F9F9;

  /* Borders — STRONGER */
  --color-dash-border: #D4D4D4;
  --color-dash-border-subtle: #E5E5E5;
  --color-dash-border-strong: #A3A3A3;

  /* Text */
  --color-dash-text: #1A1A1A;
  --color-dash-text-secondary: #737373;
  --color-dash-text-muted: #A3A3A3;
  --color-dash-text-inverse: #FFFFFF;

  /* Brand */
  --color-dash-red: #8B0000;
  --color-dash-red-light: #8B000015;
  --color-dash-black: #1A1A1A;

  /* Status */
  --color-status-green: #16A34A;
  --color-status-green-light: #16A34A15;
  --color-status-amber: #D97706;
  --color-status-amber-light: #D9770615;
  --color-status-red: #DC2626;
  --color-status-red-light: #DC262615;
  --color-status-grey: #A3A3A3;
  --color-status-grey-light: #A3A3A315;

  /* Charts */
  --color-chart-1: #8B0000;
  --color-chart-2: #2563EB;
  --color-chart-3: #16A34A;
  --color-chart-4: #D97706;
  --color-chart-5: #7C3AED;
  --color-chart-6: #EC4899;
  --color-chart-forecast: #8B000040;
  --color-chart-target: #D97706;
  --color-chart-comparison: #A3A3A3;

  /* Data Sources */
  --color-src-tableau: #1A1A1A;
  --color-src-hubspot: #FF7A59;
  --color-src-stripe: #635BFF;
  --color-src-zendesk: #03363D;
  --color-src-manual: #737373;
  --color-src-forecast: #8B0000;

  /* Departments */
  --color-dept-corporate: #78716C;
  --color-dept-sciences: #D97706;
  --color-dept-medical: #DC2626;
  --color-dept-clinical: #EC4899;
  --color-dept-technology: #2563EB;
  --color-dept-brand: #7C3AED;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

@layer base {
  body {
    background-color: var(--color-dash-bg);
    color: var(--color-dash-text);
    font-family: var(--font-sans);
  }

  /* ── Tremor colour overrides ────────────────────────────── */
  :root {
    --tremor-brand: #DC2626;
    --color-rose-500: #DC2626;
    --color-rose-400: #EF4444;
    --color-rose-600: #B91C1C;
    --color-blue-500: #2563EB;
    --color-blue-400: #3B82F6;
    --color-emerald-500: #059669;
    --color-emerald-400: #10B981;
    --color-amber-500: #D97706;
    --color-amber-400: #F59E0B;
    --color-violet-500: #7C3AED;
    --color-violet-400: #8B5CF6;
    --color-cyan-500: #0891B2;
    --color-cyan-400: #06B6D4;
    --color-slate-500: #64748B;
    --color-gray-500: #9CA3AF;
    --color-indigo-500: #4F46E5;
    --color-indigo-400: #6366F1;
    --color-fuchsia-500: #C026D3;
    --color-fuchsia-400: #D946EF;
    --color-teal-500: #0D9488;
    --color-teal-400: #14B8A6;
  }

  /* Tremor chart grid lines */
  .tremor-CartesianGrid-line {
    stroke: #E5E5E5 !important;
  }

  /* Tremor tooltip */
  .tremor-Tooltip-root {
    border-color: #D4D4D4 !important;
    background-color: #FFFFFF !important;
  }

  /* Tremor chart text */
  .tremor-Axis-tick text,
  .tremor-Legend-legendItem span {
    font-family: var(--font-mono) !important;
    font-size: 11px !important;
    fill: #737373 !important;
  }

  /* ================================================================
     CHART VISIBILITY OVERRIDES
     Tremor/Recharts defaults are too subtle on white backgrounds.
     These overrides force charts to be clearly readable.
     ================================================================ */

  /* ALL lines — minimum 3px stroke width */
  .recharts-line-curve,
  .recharts-area-curve {
    stroke-width: 3 !important;
  }

  /* Area fills — increase opacity from ~10% to 25% */
  .recharts-area-area {
    fill-opacity: 0.25 !important;
  }

  /* Bar charts — ensure bars have visible fill */
  .recharts-bar-rectangle {
    fill-opacity: 1 !important;
  }

  .recharts-bar-rectangle rect {
    rx: 3;
    ry: 3;
  }

  /* Dots on lines — make them visible (4px) */
  .recharts-dot {
    r: 4 !important;
    stroke-width: 2 !important;
  }

  /* Active dot on hover — larger */
  .recharts-active-dot {
    r: 6 !important;
  }

  /* Grid lines — visible but subtle */
  .recharts-cartesian-grid line {
    stroke: #E5E5E5 !important;
    stroke-width: 1 !important;
  }

  .recharts-cartesian-grid-horizontal line,
  .recharts-cartesian-grid-vertical line {
    stroke: #E5E5E5 !important;
  }

  /* Axis tick labels — JetBrains Mono, visible grey */
  .recharts-cartesian-axis-tick-value {
    font-family: 'JetBrains Mono', ui-monospace, monospace !important;
    font-size: 11px !important;
    fill: #525252 !important;
  }

  /* Axis lines */
  .recharts-cartesian-axis-line {
    stroke: #D4D4D4 !important;
  }

  .recharts-text {
    font-family: 'JetBrains Mono', ui-monospace, monospace !important;
    font-size: 11px !important;
    fill: #525252 !important;
  }

  /* Legend text */
  .recharts-legend-item-text {
    font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    color: #1A1A1A !important;
  }

  /* Tooltip container — clean white card */
  .recharts-tooltip-wrapper .recharts-default-tooltip {
    border: 1px solid #D4D4D4 !important;
    border-radius: 8px !important;
    background: #FFFFFF !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
    padding: 10px 14px !important;
  }

  /* Tooltip label */
  .recharts-tooltip-label {
    font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    color: #1A1A1A !important;
    margin-bottom: 6px !important;
  }

  /* Tooltip values */
  .recharts-tooltip-item {
    font-family: 'JetBrains Mono', ui-monospace, monospace !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    padding: 2px 0 !important;
  }

}

/* ================================================================
   MOBILE RESPONSIVENESS
   ================================================================ */

/* Sticky first column for tables on mobile */
@media (max-width: 767px) {
  .sticky-first-col th:first-child,
  .sticky-first-col td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    background-color: var(--color-dash-surface);
    border-right: 1px solid var(--color-dash-border);
  }
}

/* Mobile touch optimization */
@media (max-width: 767px) {
  button, a, [role="button"] {
    touch-action: manipulation;
  }

  html {
    -webkit-overflow-scrolling: touch;
  }

  .overflow-x-auto {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .overflow-x-auto::-webkit-scrollbar {
    display: none;
  }
}

/* Print styles — hide navigation */
@media print {
  nav, header, .mobile-nav, [data-testid="sidebar"] {
    display: none !important;
  }
  main {
    margin-left: 0 !important;
    padding: 0 !important;
  }
}

```

## `src/app/layout.tsx`

```tsx
import type { Metadata } from 'next'
import { AppShell } from '@/components/layout/app-shell'
import { DataProvider } from '@/lib/context/data-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'TMRW Operating Dashboard',
  description: 'TMRW Health operational command center',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body className="font-sans antialiased">
        <DataProvider>
          <AppShell>{children}</AppShell>
        </DataProvider>
      </body>
    </html>
  )
}

```

## `src/app/login/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/admin/upload')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dash-bg">
      <div className="w-full max-w-sm rounded-lg border border-dash-border bg-dash-surface p-8">
        <h1 className="mb-6 font-sans text-lg font-semibold text-dash-text">Sign in</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-dash-text-secondary">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-dash-text-secondary">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
            />
          </div>
          {error && <p className="text-xs text-status-red">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-dash-red px-4 py-2 text-sm font-medium text-white hover:bg-dash-red/90 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

```

## `src/app/marketing/page.tsx`

```tsx
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

```

## `src/app/members/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { AlertCard } from '@/components/dashboard/alert-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { ChartPeriodToggle } from '@/components/dashboard/chart-period-toggle'
import { useDashboardData } from '@/lib/context/data-context'
import { TmrwLineChart } from '@/components/dashboard/tmrw-line-chart'
import { TmrwAreaChart } from '@/components/dashboard/tmrw-area-chart'
import {
  ResponsiveContainer,
  BarChart as RechartBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridProps, tooltipStyle, legendStyle, TMRW_COLORS } from '@/lib/utils/chart-styles'

// ---------------------------------------------------------------------------
// Shared month labels
// ---------------------------------------------------------------------------
const MONTHS = ['Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026']

// ---------------------------------------------------------------------------
// 01 Growth vs Model
// ---------------------------------------------------------------------------
const modelTargets = [43, 55, 70, 89, 113, 144, 183, 233, 296, 376, 478, 700]
const actualValues = [25, 30, 40, 45, 70, 59]

const growthVsModelData = MONTHS.map((month, i) => ({
  month,
  Actual: actualValues[i],
  Model: modelTargets[i],
}))

// ---------------------------------------------------------------------------
// Gap Decomposition (after Growth vs Model)
// ---------------------------------------------------------------------------
const gapDecomposition = {
  plan: 70,
  actual: 59,
  leadVolumeShortfall: -8,
  conversionDecline: -3,
  netGap: -11,
}

// ---------------------------------------------------------------------------
// 02 Acquisition Mix
// ---------------------------------------------------------------------------
const acquisitionMixData = [
  { month: 'Sep 2025', 'Organic/Direct': 10, Referral: 3, Paid: 3, 'Influencer/Partner': 1, Unknown: 8 },
  { month: 'Oct 2025', 'Organic/Direct': 12, Referral: 3, Paid: 3, 'Influencer/Partner': 2, Unknown: 10 },
  { month: 'Nov 2025', 'Organic/Direct': 16, Referral: 4, Paid: 4, 'Influencer/Partner': 2, Unknown: 14 },
  { month: 'Dec 2025', 'Organic/Direct': 18, Referral: 5, Paid: 5, 'Influencer/Partner': 2, Unknown: 15 },
  { month: 'Jan 2026', 'Organic/Direct': 28, Referral: 7, Paid: 7, 'Influencer/Partner': 4, Unknown: 24 },
  { month: 'Feb 2026', 'Organic/Direct': 24, Referral: 6, Paid: 6, 'Influencer/Partner': 3, Unknown: 20 },
]

const organicRatioData = MONTHS.map((month, i) => {
  const row = acquisitionMixData[i]
  const total = row['Organic/Direct'] + row.Referral + row.Paid + row['Influencer/Partner'] + row.Unknown
  const organicPct = Math.round(((row['Organic/Direct'] + row.Referral) / total) * 100)
  return { month, '% Organic + Referral': organicPct, Target: 70 }
})

const sourceEconomics = [
  { source: 'Organic/Direct', members: 108, cac: '$0', activation: '68%', retention: '72%', cacTrend: [0, 0, 0, 0, 0, 0], retentionTrend: [65, 66, 67, 68, 70, 72] },
  { source: 'Referral', members: 28, cac: '$25', activation: '74%', retention: '78%', cacTrend: [20, 21, 22, 23, 24, 25], retentionTrend: [70, 72, 74, 75, 77, 78] },
  { source: 'Paid', members: 28, cac: '$185', activation: '52%', retention: '58%', cacTrend: [150, 155, 162, 170, 178, 185], retentionTrend: [64, 62, 61, 60, 59, 58] },
  { source: 'Influencer/Partner', members: 14, cac: '$90', activation: '61%', retention: '65%', cacTrend: [80, 82, 85, 87, 90, 92], retentionTrend: [62, 63, 64, 64, 65, 65] },
  { source: 'Unknown', members: 91, cac: '--', activation: '45%', retention: '49%', cacTrend: [], retentionTrend: [52, 51, 50, 50, 49, 49] },
]

// ---------------------------------------------------------------------------
// CAC by Channel Trend
// ---------------------------------------------------------------------------
const cacByChannelData = MONTHS.map((month, i) => ({
  month,
  Organic: [0, 0, 0, 0, 0, 0][i],
  Referral: [20, 21, 22, 23, 24, 25][i],
  Paid: [150, 155, 162, 170, 178, 185][i],
  Influencer: [80, 82, 85, 87, 90, 92][i],
}))

// ---------------------------------------------------------------------------
// Retention by Acquisition Source
// ---------------------------------------------------------------------------
const retentionBySourceData = [
  { month: 'Month 0', Organic: 100, Paid: 100 },
  { month: 'Month 1', Organic: 92, Paid: 82 },
  { month: 'Month 2', Organic: 84, Paid: 68 },
  { month: 'Month 3', Organic: 78, Paid: 64 },
  { month: 'Month 4', Organic: 74, Paid: 58 },
  { month: 'Month 5', Organic: 71, Paid: 54 },
  { month: 'Month 6', Organic: 68, Paid: 50 },
]

// ---------------------------------------------------------------------------
// 03 Conversion Funnel
// ---------------------------------------------------------------------------
const funnelSteps = [
  { label: 'Waitlist', pct: 100, count: 450 },
  { label: 'Purchase', pct: 62, count: 279 },
  { label: 'Health Story', pct: 55, count: 248 },
  { label: 'Kit Dispatched', pct: 48, count: 216 },
  { label: 'Kit Returned', pct: 42, count: 189 },
]

const funnelTimings = ['', '12 days', '3 days', '2 days', '7 days']

const conversionTrendData = MONTHS.map((month, i) => ({
  month,
  'Waitlist to Purchase': [58, 60, 61, 62, 64, 62][i],
  'Purchase to Health Story': [82, 84, 86, 88, 90, 89][i],
  'Health Story to Kit Dispatched': [84, 85, 86, 87, 88, 87][i],
  'Kit Dispatched to Returned': [82, 84, 86, 87, 88, 88][i],
}))

// ---------------------------------------------------------------------------
// 04 Referral Engine
// ---------------------------------------------------------------------------
const referralRateData = MONTHS.map((month, i) => ({
  month,
  'Referral Rate %': [8, 9, 10, 11, 10, 12][i],
  Target: 20,
}))

// ---------------------------------------------------------------------------
// 05 Member Composition
// ---------------------------------------------------------------------------
const compositionTrendData = MONTHS.map((month, i) => ({
  month,
  Customer: [5, 12, 21, 31, 46, 62][i],
  'Friend/Family': [12, 25, 42, 61, 86, 104][i],
  Investor: [5, 11, 19, 28, 42, 51][i],
  Employee: [3, 7, 13, 20, 36, 52][i],
}))

const sexTrendData = MONTHS.map((month, i) => ({
  month,
  Female: [13, 28, 48, 71, 107, 143][i],
  Male: [12, 26, 45, 67, 101, 136][i],
}))

const ageDistribution = [
  { range: '18-24', count: 12, pct: 4 },
  { range: '25-34', count: 54, pct: 19 },
  { range: '35-44', count: 91, pct: 32 },
  { range: '45-54', count: 74, pct: 26 },
  { range: '55-64', count: 38, pct: 13 },
  { range: '65+', count: 15, pct: 5 },
]

// ---------------------------------------------------------------------------
// Growth vs Model — weekly & quarterly variants
// ---------------------------------------------------------------------------
const WEEKS = ['W1 Jan', 'W2 Jan', 'W3 Jan', 'W4 Jan', 'W1 Feb', 'W2 Feb', 'W3 Feb', 'W4 Feb']
const growthVsModelWeekly = WEEKS.map((period, i) => ({
  period,
  Actual: [14, 16, 18, 22, 12, 14, 16, 17][i],
  Model: [18, 20, 22, 25, 24, 26, 28, 30][i],
}))

const QUARTERS = ['Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026']
const growthVsModelQuarterly = QUARTERS.map((period, i) => ({
  period,
  Actual: [25, 95, 155, 129][i],
  Model: [30, 168, 292, 509][i],
}))

// ---------------------------------------------------------------------------
// Acquisition Mix — quarterly & YTD variants
// ---------------------------------------------------------------------------
const acquisitionMixQuarterly = [
  { period: 'Q3 2025', 'Organic/Direct': 38, Referral: 10, Paid: 10, 'Influencer/Partner': 5, Unknown: 32 },
  { period: 'Q4 2025', 'Organic/Direct': 62, Referral: 16, Paid: 16, 'Influencer/Partner': 8, Unknown: 53 },
  { period: 'Q1 2026', 'Organic/Direct': 52, Referral: 13, Paid: 13, 'Influencer/Partner': 7, Unknown: 44 },
]

const acquisitionMixYTD = [
  { period: 'Jan 2026', 'Organic/Direct': 28, Referral: 7, Paid: 7, 'Influencer/Partner': 4, Unknown: 24 },
  { period: 'Feb 2026', 'Organic/Direct': 52, Referral: 13, Paid: 13, 'Influencer/Partner': 7, Unknown: 44 },
]

// ---------------------------------------------------------------------------
// CAC by Channel — quarterly & YTD avg variants
// ---------------------------------------------------------------------------
const cacByChannelQuarterly = QUARTERS.map((period, i) => ({
  period,
  Organic: 0,
  Referral: [19, 21, 23, 25][i],
  Paid: [142, 156, 170, 182][i],
  Influencer: [75, 82, 88, 91][i],
}))

const cacByChannelYTDAvg = [
  { period: 'YTD Avg', Organic: 0, Referral: 24, Paid: 181, Influencer: 91 },
]

// ---------------------------------------------------------------------------
// Referral Rate — quarterly & trailing 12mo variants
// ---------------------------------------------------------------------------
const referralRateQuarterly = QUARTERS.map((period, i) => ({
  period,
  'Referral Rate %': [7, 9, 11, 11][i],
  Target: 20,
}))

const TRAILING_MONTHS = ['Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026']
const referralRateTrailing = TRAILING_MONTHS.map((period, i) => ({
  period,
  'Referral Rate %': [5, 6, 6, 7, 7, 8, 8, 9, 10, 11, 10, 12][i],
  Target: 20,
}))

// ---------------------------------------------------------------------------
// Composition Trend — quarterly variant
// ---------------------------------------------------------------------------
const compositionTrendQuarterly = QUARTERS.map((period, i) => ({
  period,
  Customer: [2, 21, 46, 62][i],
  'Friend/Family': [6, 42, 86, 104][i],
  Investor: [3, 19, 42, 51][i],
  Employee: [1, 13, 36, 52][i],
}))

// ---------------------------------------------------------------------------
// Sparkline helper (inline SVG)
// ---------------------------------------------------------------------------
function Sparkline({ data, color, width = 64, height = 20 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length === 0) return <span className="text-xs text-dash-text-muted">--</span>
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(' ')
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// DecompRow helper
// ---------------------------------------------------------------------------
function DecompRow({
  label,
  value,
  detail,
  bold,
  valueColor,
}: {
  label: string
  value: string | number
  detail?: string
  bold?: boolean
  valueColor?: string
}) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? 'border-t border-dash-border pt-2 mt-1' : ''}`}>
      <div className="flex flex-col">
        <span className={`text-sm ${bold ? 'font-semibold text-dash-text' : 'text-dash-text-secondary'}`}>
          {label}
        </span>
        {detail && <span className="text-xs text-dash-text-muted">{detail}</span>}
      </div>
      <span
        className={`font-mono text-sm font-semibold ${
          valueColor ?? 'text-dash-text'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gap Trend (cumulative actual vs plan)
// ---------------------------------------------------------------------------
const gapTrendData = [
  { month: 'Sep 2025', gap: -18 },
  { month: 'Oct 2025', gap: -25 },
  { month: 'Nov 2025', gap: -30 },
  { month: 'Dec 2025', gap: -44 },
  { month: 'Jan 2026', gap: -43 },
  { month: 'Feb 2026', gap: -85 },
]

// ---------------------------------------------------------------------------
// Period option presets
// ---------------------------------------------------------------------------
const GROWTH_PERIODS = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
]

const ACQ_MIX_PERIODS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'YTD Cumulative', value: 'ytd-cumulative' },
]

const REFERRAL_PERIODS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Trailing 12mo', value: 'trailing-12mo' },
]

const COMPOSITION_PERIODS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
]

const CAC_PERIODS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'YTD Avg', value: 'ytd-avg' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AcquisitionPage() {
  const { members } = useDashboardData()

  // Period toggle state for each chart section
  const [growthPeriod, setGrowthPeriod] = useState('monthly')
  const [acqMixPeriod, setAcqMixPeriod] = useState('monthly')
  const [referralPeriod, setReferralPeriod] = useState('monthly')
  const [compositionPeriod, setCompositionPeriod] = useState('monthly')
  const [cacPeriod, setCacPeriod] = useState('monthly')

  // Derived chart data based on toggle state
  const growthData =
    growthPeriod === 'weekly' ? growthVsModelWeekly
    : growthPeriod === 'quarterly' ? growthVsModelQuarterly
    : growthVsModelData
  const growthIndex = growthPeriod === 'monthly' ? 'month' : 'period'

  const acqMixData =
    acqMixPeriod === 'quarterly' ? acquisitionMixQuarterly
    : acqMixPeriod === 'ytd-cumulative' ? acquisitionMixYTD
    : acquisitionMixData
  const acqMixIndex = acqMixPeriod === 'monthly' ? 'month' : 'period'

  const cacData =
    cacPeriod === 'quarterly' ? cacByChannelQuarterly
    : cacPeriod === 'ytd-avg' ? cacByChannelYTDAvg
    : cacByChannelData
  const cacIndex = cacPeriod === 'monthly' ? 'month' : 'period'

  const referralData =
    referralPeriod === 'quarterly' ? referralRateQuarterly
    : referralPeriod === 'trailing-12mo' ? referralRateTrailing
    : referralRateData
  const referralIndex = referralPeriod === 'monthly' ? 'month' : 'period'

  const compositionData =
    compositionPeriod === 'quarterly' ? compositionTrendQuarterly
    : compositionTrendData
  const compositionIndex = compositionPeriod === 'monthly' ? 'month' : 'period'

  // Derive total member count from context where possible
  const totalMembers = members.length

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Acquisition' }]} />
        <div className="flex items-center gap-2">
          <DataSourceBadge source="hubspot" />
          <DataSourceBadge source="tableau" />
        </div>
      </div>

      {/* ================================================================= */}
      {/* 01 Growth vs Model */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={1} title="Growth vs Model" />

        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              New Members per Month &mdash; Actual vs Modelled
            </h3>
            <ChartPeriodToggle
              options={GROWTH_PERIODS}
              selected={growthPeriod}
              onChange={setGrowthPeriod}
            />
          </div>
          <TmrwLineChart
            data={growthData}
            index={growthIndex}
            series={[
              { dataKey: 'Actual', color: TMRW_COLORS.red },
              { dataKey: 'Model', color: TMRW_COLORS.grey, dashed: true },
            ]}
            height={288}
            className="h-56 md:h-72"
            yAxisWidth={40}
          />
        </div>

        {/* Variance callout */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AlertCard
            severity="medium"
            title="February: 41 actual vs 55 modelled. 25% under plan. Cumulative YTD: 98 actual vs 98 modelled — on track overall."
          />
          <AlertCard
            severity="high"
            title="At current run rate, March projects to ~48. Model requires 70. Gap widening."
          />
        </div>

        {/* Gap Decomposition + Gap Trend side by side */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Gap Decomposition &mdash; February
            </h3>
            <DecompRow label="Plan" value={gapDecomposition.plan} detail="Target new members" />
            <DecompRow label="Actual" value={gapDecomposition.actual} detail="Enrolled this month" />
            <DecompRow
              label="Lead volume shortfall"
              value={gapDecomposition.leadVolumeShortfall}
              detail="Fewer inbound leads than forecast"
              valueColor="text-status-red"
            />
            <DecompRow
              label="Conversion decline"
              value={gapDecomposition.conversionDecline}
              detail="Lower waitlist-to-purchase rate"
              valueColor="text-status-red"
            />
            <DecompRow
              label="Net gap"
              value={gapDecomposition.netGap}
              bold
              valueColor="text-status-red"
            />
          </div>

          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">
              Gap Trend &mdash; Actual vs Plan (Cumulative)
            </h3>
            <TmrwLineChart
              data={gapTrendData}
              index="month"
              series={[
                { dataKey: 'gap', color: TMRW_COLORS.statusRed },
              ]}
              height={144}
              className="h-36"
              yAxisWidth={40}
              valueFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
              showLegend={false}
            />
            <p className="mt-2 text-xs text-dash-text-muted">
              Cumulative gap widening. Feb gap (-85) is 3x larger than Oct (-25).
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 02 Acquisition Mix */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={2} title="Acquisition Mix" />

        {/* Stacked bar chart */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              New Members by Source
            </h3>
            <ChartPeriodToggle
              options={ACQ_MIX_PERIODS}
              selected={acqMixPeriod}
              onChange={setAcqMixPeriod}
            />
          </div>
          <ResponsiveContainer width="100%" height={288} className="h-56 md:h-72">
            <RechartBarChart data={acqMixData}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey={acqMixIndex} tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="Organic/Direct" stackId="1" fill={TMRW_COLORS.green} />
              <Bar dataKey="Referral" stackId="1" fill={TMRW_COLORS.blue} />
              <Bar dataKey="Paid" stackId="1" fill={TMRW_COLORS.red} />
              <Bar dataKey="Influencer/Partner" stackId="1" fill={TMRW_COLORS.purple} />
              <Bar dataKey="Unknown" stackId="1" fill={TMRW_COLORS.grey} />
            </RechartBarChart>
          </ResponsiveContainer>
        </div>

        {/* Organic ratio trend */}
        <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Organic + Referral Ratio (Target: 70%)
          </h3>
          <TmrwLineChart
            data={organicRatioData}
            index="month"
            series={[
              { dataKey: '% Organic + Referral', color: TMRW_COLORS.green },
              { dataKey: 'Target', color: TMRW_COLORS.grey, dashed: true },
            ]}
            height={192}
            className="h-36 md:h-48"
            yAxisWidth={40}
            valueFormatter={(v) => `${v}%`}
          />
        </div>

        {/* Source economics table */}
        <div className="mt-4 overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Source</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Members</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">CAC</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">30-Day Activation</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">90-Day Retention</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">CAC Trend</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Retention Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {sourceEconomics.map(row => (
                <tr key={row.source} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{row.source}</td>
                  <td className="px-4 py-2 font-mono text-dash-text">{row.members}</td>
                  <td className="px-4 py-2 font-mono text-dash-text">{row.cac}</td>
                  <td className="px-4 py-2 font-mono text-dash-text">{row.activation}</td>
                  <td className="px-4 py-2 font-mono text-dash-text">{row.retention}</td>
                  <td className="px-4 py-2"><Sparkline data={row.cacTrend} color="#8B0000" /></td>
                  <td className="px-4 py-2"><Sparkline data={row.retentionTrend} color="#16A34A" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CAC by Channel Trend */}
        <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              CAC by Channel Trend
            </h3>
            <ChartPeriodToggle
              options={CAC_PERIODS}
              selected={cacPeriod}
              onChange={setCacPeriod}
            />
          </div>
          <TmrwLineChart
            data={cacData}
            index={cacIndex}
            series={[
              { dataKey: 'Organic', color: TMRW_COLORS.green },
              { dataKey: 'Referral', color: TMRW_COLORS.blue },
              { dataKey: 'Paid', color: TMRW_COLORS.red },
              { dataKey: 'Influencer', color: TMRW_COLORS.purple },
            ]}
            height={256}
            className="h-48 md:h-64"
            yAxisWidth={50}
            valueFormatter={(v) => `$${v}`}
          />
        </div>

        {/* Retention by Acquisition Source */}
        <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Retention by Acquisition Source
          </h3>
          <TmrwLineChart
            data={retentionBySourceData}
            index="month"
            series={[
              { dataKey: 'Organic', color: TMRW_COLORS.green },
              { dataKey: 'Paid', color: TMRW_COLORS.red },
            ]}
            height={256}
            className="h-48 md:h-64"
            yAxisWidth={40}
            valueFormatter={(v) => `${v}%`}
          />
          <div className="mt-3">
            <AlertCard
              severity="low"
              title="Organic members retain 14pp better than paid at month 3."
            />
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 03 Conversion Funnel */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={3} title="Conversion Funnel" />

        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          {/* Horizontal funnel */}
          <div className="flex items-start gap-1 overflow-x-auto pb-4">
            {funnelSteps.map((step, i) => {
              const widthPct = Math.max(14, step.pct)
              return (
                <div key={step.label} className="flex items-start">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex flex-col items-center justify-center rounded-md bg-status-red-light px-3 py-3 text-center"
                      style={{ minWidth: `${widthPct * 1.6}px`, width: `${widthPct * 1.6}px` }}
                    >
                      <span className="text-[10px] font-medium uppercase tracking-wide text-dash-text-secondary">
                        {step.label}
                      </span>
                      <span className="mt-1 font-mono text-lg font-bold text-dash-text">{step.pct}%</span>
                      <span className="text-[10px] text-dash-text-muted">({step.count})</span>
                    </div>
                    {funnelTimings[i] && (
                      <span className="mt-1 text-[10px] font-medium text-dash-text-muted">
                        {funnelTimings[i]}
                      </span>
                    )}
                  </div>
                  {i < funnelSteps.length - 1 && (
                    <span className="mx-1 mt-5 text-dash-text-muted">&rarr;</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Conversion trend by month */}
        <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Stage Conversion Rates Over Time
          </h3>
          <TmrwLineChart
            data={conversionTrendData}
            index="month"
            series={[
              { dataKey: 'Waitlist to Purchase', color: TMRW_COLORS.red },
              { dataKey: 'Purchase to Health Story', color: TMRW_COLORS.blue },
              { dataKey: 'Health Story to Kit Dispatched', color: TMRW_COLORS.green },
              { dataKey: 'Kit Dispatched to Returned', color: TMRW_COLORS.purple },
            ]}
            height={256}
            className="h-48 md:h-64"
            yAxisWidth={40}
            valueFormatter={(v) => `${v}%`}
          />
        </div>

        {/* Drop-off analysis */}
        <div className="mt-4">
          <AlertCard
            severity="high"
            title="42% of members who purchased haven't completed Health Story after 14 days. This is the largest drop-off in the funnel."
          />
        </div>
      </section>

      {/* ================================================================= */}
      {/* 04 Referral Engine */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={4} title="Referral Engine" />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Referral rate chart */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 lg:col-span-2">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                Referral Rate (% of New Members Referred) &mdash; Target: 20%
              </h3>
              <ChartPeriodToggle
                options={REFERRAL_PERIODS}
                selected={referralPeriod}
                onChange={setReferralPeriod}
              />
            </div>
            <TmrwLineChart
              data={referralData}
              index={referralIndex}
              series={[
                { dataKey: 'Referral Rate %', color: TMRW_COLORS.red },
                { dataKey: 'Target', color: TMRW_COLORS.grey, dashed: true },
              ]}
              height={224}
              className="h-44 md:h-56"
              yAxisWidth={40}
              valueFormatter={(v) => `${v}%`}
            />
          </div>

          {/* Referral velocity + NPS */}
          <div className="space-y-4">
            <MetricCard
              label="Referral Velocity"
              value="45 days"
              status="amber"
              target="<30 days"
            />
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                Referral Velocity
              </h3>
              <p className="text-sm text-dash-text-muted">
                Avg 45 days from dashboard delivery to first referral.
              </p>
            </div>
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                NPS
              </h3>
              <p className="text-sm italic text-dash-text-muted">
                NPS instrumentation pending. Survey integration planned for Q2 2026.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 05 Member Composition */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={5} title="Member Composition" />

        {/* Composition trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Cumulative Members by Type
            </h3>
            <ChartPeriodToggle
              options={COMPOSITION_PERIODS}
              selected={compositionPeriod}
              onChange={setCompositionPeriod}
            />
          </div>
          <TmrwAreaChart
            data={compositionData}
            index={compositionIndex}
            series={[
              { dataKey: 'Customer', color: TMRW_COLORS.red },
              { dataKey: 'Friend/Family', color: TMRW_COLORS.blue },
              { dataKey: 'Investor', color: TMRW_COLORS.purple },
              { dataKey: 'Employee', color: TMRW_COLORS.amber },
            ]}
            height={256}
            className="h-48 md:h-64"
            yAxisWidth={40}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Sex distribution trend */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Sex Distribution Trend
            </h3>
            <TmrwLineChart
              data={sexTrendData}
              index="month"
              series={[
                { dataKey: 'Female', color: TMRW_COLORS.red },
                { dataKey: 'Male', color: TMRW_COLORS.blue },
              ]}
              height={192}
              className="h-36 md:h-48"
              yAxisWidth={40}
            />
          </div>

          {/* Age distribution */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Age Distribution (Target: 35-55)
            </h3>
            <div className="space-y-2">
              {ageDistribution.map(row => {
                const inTarget = row.range === '35-44' || row.range === '45-54'
                return (
                  <div key={row.range} className="flex items-center gap-3">
                    <span className="w-12 text-xs font-medium text-dash-text-secondary">{row.range}</span>
                    <div className="flex-1">
                      <div
                        className={`h-5 rounded ${inTarget ? 'bg-status-green' : 'bg-slate-400'}`}
                        style={{ width: `${(row.count / 91) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-xs text-dash-text">
                      {row.count} ({row.pct}%)
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-dash-text-muted">
              Target demographic (35-55): {74 + 91} members ({Math.round(((74 + 91) / 284) * 100)}% of total)
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

```

## `src/app/page.tsx`

```tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { QuestionTile } from '@/components/dashboard/question-tile'
import { AlertCard } from '@/components/dashboard/alert-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { StatusDot } from '@/components/dashboard/status-dot'
import { TrendIndicator } from '@/components/dashboard/trend-indicator'
import { Sparkline } from '@/components/dashboard/sparkline'
import { MemberDetailPanel } from '@/components/panels/member-detail-panel'
import { useDashboardData } from '@/lib/context/data-context'
import {
  ResponsiveContainer,
  LineChart as RechartLineChart,
  AreaChart as RechartAreaChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridStyle, tooltipStyle, legendStyle, lineDot, TMRW_COLORS } from '@/lib/utils/chart-styles'
import type { Member, Status } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Pulse Card                                                        */
/* ------------------------------------------------------------------ */
function PulseCard({
  label, value, prev, trend, href,
}: {
  label: string; value: string; prev: string; trend: number; href: string
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4 transition-all duration-150 hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px"
    >
      <span className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary md:text-[11px]">
        {label}
      </span>
      <div className="mt-0.5 flex items-baseline gap-1.5 md:mt-1 md:gap-2">
        <span className="font-mono text-base font-semibold text-dash-text md:text-xl">{value}</span>
        <TrendIndicator value={trend} />
      </div>
      <span className="font-sans text-[10px] text-dash-text-muted md:text-[11px]">from {prev}</span>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Mini Trend Card                                                   */
/* ------------------------------------------------------------------ */
function MiniTrendCard({
  label, value, trend, sparkData, href, status,
}: {
  label: string; value: string; trend: number; sparkData: number[]; href: string; status: Status
}) {
  return (
    <Link href={href} className="rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4 transition-all duration-150 hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px">
      <div className="flex items-center justify-between">
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary md:text-[11px]">
          {label}
        </span>
        <StatusDot status={status} />
      </div>
      <div className="mt-0.5 flex items-baseline gap-2 md:mt-1">
        <span className="font-mono text-base font-bold text-dash-text md:text-lg">{value}</span>
        <TrendIndicator value={trend} />
      </div>
      <div className="mt-1.5 md:mt-2">
        <Sparkline data={sparkData} height={24} width={200} color={status === 'red' ? '#DC2626' : status === 'amber' ? '#D97706' : '#16A34A'} />
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  const { members, rocks, lastRefreshed, dataMode } = useDashboardData()
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const activeMembers = useMemo(
    () => members.filter(m => m.caseStatus !== 'Closed' && m.journeyStage !== 'churned' && m.journeyStage !== 'inactive'),
    [members]
  )

  const healthDistribution = useMemo(() => {
    const dist = { healthy: 0, attention: 0, 'at-risk': 0, unknown: 0 }
    for (const m of activeMembers) dist[m.healthScore]++
    return dist
  }, [activeMembers])

  const totalActive = activeMembers.length
  const healthyPct = totalActive ? Math.round((healthDistribution.healthy / totalActive) * 100) : 0
  const attentionPct = totalActive ? Math.round((healthDistribution.attention / totalActive) * 100) : 0
  const atRiskPct = totalActive ? Math.round((healthDistribution['at-risk'] / totalActive) * 100) : 0
  const unknownPct = totalActive ? Math.round((healthDistribution.unknown / totalActive) * 100) : 0

  const stuckMembers = useMemo(
    () => members
      .filter(m => m.journeyStage === 'awaiting-results' && !m.dashboardUnlocked)
      .sort((a, b) => b.daysSinceRegistration - a.daysSinceRegistration),
    [members]
  )

  const offTrackCount = rocks.filter(r => r.status === 'off-track' || r.status === 'building').length

  const sourceFreshness = Object.entries(lastRefreshed).map(([source, ts]) => {
    const days = ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 86400000) : null
    const label = ts ? new Date(ts).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }) : 'Never'
    const status: Status = days === null ? 'red' : days > 14 ? 'red' : days > 7 ? 'amber' : 'green'
    return { source, label, days, status }
  })

  // ── Health trend (8 weeks) ──
  const healthTrendData = [
    { week: 'W1', Healthy: 180, Attention: 30, 'At-Risk': 10 },
    { week: 'W2', Healthy: 182, Attention: 31, 'At-Risk': 11 },
    { week: 'W3', Healthy: 185, Attention: 32, 'At-Risk': 13 },
    { week: 'W4', Healthy: 188, Attention: 34, 'At-Risk': 15 },
    { week: 'W5', Healthy: 192, Attention: 36, 'At-Risk': 17 },
    { week: 'W6', Healthy: 198, Attention: 38, 'At-Risk': 19 },
    { week: 'W7', Healthy: 202, Attention: 40, 'At-Risk': 21 },
    { week: 'W8', Healthy: 205, Attention: 42, 'At-Risk': 23 },
  ]

  // ── Active Members vs Plan ──
  const planWaypoints = [
    { month: 'Sep 2025', plan: 43 },
    { month: 'Oct 2025', plan: 55 },
    { month: 'Nov 2025', plan: 70 },
    { month: 'Dec 2025', plan: 89 },
    { month: 'Jan 2026', plan: 113 },
    { month: 'Feb 2026', plan: 144 },
    { month: 'Mar 2026', plan: 183 },
  ]

  const membersByMonth = useMemo(() => {
    const months: Record<string, number> = {}
    let cumulative = 0
    const sorted = [...members]
      .filter(m => m.caseStatus !== 'Closed' && m.journeyStage !== 'churned')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    for (const m of sorted) {
      const d = new Date(m.createdAt)
      const key = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`
      cumulative++
      months[key] = cumulative
    }
    return months
  }, [members])

  const memberVsPlanData = planWaypoints.map(wp => ({
    month: wp.month,
    Plan: wp.plan,
    Actual: membersByMonth[wp.month] || null,
  }))

  const latestPlan = planWaypoints[planWaypoints.length - 1]?.plan || 1
  const gapPct = Math.round(((activeMembers.length - latestPlan) / latestPlan) * 100)

  // ── Mini trend data ──
  const queueHistory = [45, 48, 52, 55, 59, 63, 65, stuckMembers.length]
  const churnHistory = [3.2, 3.4, 3.3, 3.6, 3.5, 3.8, 3.6, 3.8]
  const revenueHistory = [4200, 4800, 5100, 5500, 5800, 6100, 5800, 5800]
  const queueTrend = stuckMembers.length > 65 ? 3 : -2

  const questions = [
    {
      number: 1, question: 'Can we prove it works?', status: 'grey' as const,
      primaryMetrics: [{ label: 'Biomarker Improvement', value: 'TBC', target: '60%+' }, { label: 'Bio Age Delta', value: 'TBC', target: 'TBC' }],
      activeCount: 2, totalCount: 6, redCount: 0, amberCount: 0,
      functionalLinks: [{ label: 'Delivery', href: '/clinical' }],
    },
    {
      number: 2, question: 'Do customers love it?', status: 'amber' as const,
      primaryMetrics: [{ label: '90-Day Retention', value: '78%', target: '>85%' }, { label: 'Monthly Churn', value: '3.8%', target: '<5%' }],
      activeCount: 4, totalCount: 8, redCount: 0, amberCount: 1,
      functionalLinks: [{ label: 'Retention', href: '/retention' }, { label: 'Support', href: '/support' }],
    },
    {
      number: 3, question: 'Are we building a defensible moat?', status: 'red' as const,
      primaryMetrics: [{ label: 'Channel Partners', value: '0', target: '2' }, { label: 'Referral Rate', value: '10%', target: '20%' }],
      activeCount: 2, totalCount: 6, redCount: 2, amberCount: 0,
      functionalLinks: [{ label: 'Acquisition', href: '/members' }, { label: 'Strategy', href: '/strategy' }],
    },
    {
      number: 4, question: 'Can we deliver value reliably?', status: 'red' as const,
      primaryMetrics: [{ label: 'Reg→Dashboard', value: '98d', target: '45d' }, { label: 'Queue Size', value: `${stuckMembers.length} waiting`, target: '' }],
      activeCount: 3, totalCount: 5, redCount: 1, amberCount: 1,
      functionalLinks: [{ label: 'Delivery', href: '/clinical' }],
    },
    {
      number: 5, question: 'Are the economics right?', status: 'amber' as const,
      primaryMetrics: [{ label: 'Blended CAC', value: '$95', target: '<$100' }, { label: 'NRR', value: '94%', target: '>100%' }],
      activeCount: 4, totalCount: 6, redCount: 0, amberCount: 2,
      functionalLinks: [{ label: 'Financial', href: '/financial' }, { label: 'Retention', href: '/retention' }],
    },
  ]

  return (
    <div className="space-y-4 md:space-y-10">
      <Breadcrumb items={[{ label: 'Home' }]} />

      {dataMode === 'demo' && (
        <div className="rounded-lg border border-status-amber/30 bg-status-amber/5 px-4 py-3">
          <p className="font-sans text-sm text-status-amber">
            Showing demo data &mdash; upload real data in{' '}
            <Link href="/admin/upload" className="font-medium underline">Admin</Link>{' '}
            or switch to Actual mode
          </p>
        </div>
      )}

      {dataMode === 'actual' && (
        <div className="rounded-lg border border-dash-border bg-dash-surface px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-dash-text-secondary">
            Showing real data &mdash; last updated:{' '}
            {Object.entries(lastRefreshed)
              .filter(([, ts]) => ts)
              .map(([src, ts]) => `${src}: ${new Date(ts!).toLocaleDateString('en-AU')}`)
              .join(' · ') || 'no uploads yet'}
          </p>
          {(!lastRefreshed.stripe || !lastRefreshed.zendesk) && (
            <Link href="/admin/upload" className="text-xs font-medium text-dash-red hover:underline">
              Upload missing sources →
            </Link>
          )}
        </div>
      )}

      {/* ── 1. Weekly Pulse Strip ────────────────────────────────── */}
      <section>
        <SectionHeading number={1} title="Weekly Pulse" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <PulseCard label="New Registrations" value="12" prev="18" trend={-33} href="/members" />
          <PulseCard label="Dashboards Published" value="8" prev="5" trend={60} href="/clinical" />
          <PulseCard label="Churn" value="3.8%" prev="3.6%" trend={5.5} href="/retention" />
          <PulseCard label="Revenue" value="$5.8K" prev="$6.1K" trend={-5} href="/financial" />
          <PulseCard label="SLA Breaches" value="2" prev="0" trend={100} href="/support" />
          <PulseCard label="At-Risk Members" value={String(healthDistribution['at-risk'])} prev="18" trend={28} href="/retention" />
        </div>
      </section>

      {/* ── 2. Active Members vs Plan ────────────────────────────── */}
      <section>
        <SectionHeading number={2} title="Active Members vs Plan" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <ResponsiveContainer width="100%" height={256} className="h-48 md:h-64">
            <RechartLineChart data={memberVsPlanData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} tickLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} tickLine={axisLineStyle} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Line type="monotone" dataKey="Actual" stroke={TMRW_COLORS.red} strokeWidth={3} dot={lineDot(TMRW_COLORS.red)} activeDot={{ r: 7, fill: TMRW_COLORS.red, stroke: '#fff', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="Plan" stroke={TMRW_COLORS.grey} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: TMRW_COLORS.grey, stroke: '#fff', strokeWidth: 1 }} />
            </RechartLineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-dash-text-secondary">
              Current: <span className="font-mono font-bold text-dash-text">{activeMembers.length}</span> active members
            </span>
            <span className={gapPct <= -10 ? 'font-medium text-status-red' : gapPct <= -5 ? 'text-status-amber' : 'text-status-green'}>
              {gapPct > 0 ? '+' : ''}{gapPct}% vs plan
            </span>
          </div>
        </div>
      </section>

      {/* ── 3. Key Trends — 8 Weeks ──────────────────────────────── */}
      <section>
        <SectionHeading number={3} title="Key Trends — 8 Weeks" />
        <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-3">
          <MiniTrendCard
            label="Pipeline Queue"
            value={String(stuckMembers.length)}
            trend={queueTrend}
            sparkData={queueHistory}
            href="/clinical"
            status={stuckMembers.length > 50 ? 'red' : stuckMembers.length > 30 ? 'amber' : 'green'}
          />
          <MiniTrendCard
            label="Monthly Churn"
            value="3.8%"
            trend={5.5}
            sparkData={churnHistory}
            href="/retention"
            status="green"
          />
          <MiniTrendCard
            label="Weekly Revenue"
            value="$5.8K"
            trend={-5}
            sparkData={revenueHistory}
            href="/financial"
            status="amber"
          />
        </div>
      </section>

      {/* ── 4. Critical Alerts Banner ────────────────────────────── */}
      <section>
        <SectionHeading number={4} title="Critical Alerts — Action This Week" />
        <div className="mb-3 rounded-lg border-l-[3px] border-status-red bg-dash-surface p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-dash-text">
                {stuckMembers.length} members waiting for dashboard. Queue growing +3/week.
              </p>
              <p className="mt-1 text-xs text-dash-text-muted">
                At current rate, {stuckMembers.length + 24} by May. Capacity breach imminent.
              </p>
            </div>
            <Sparkline data={[45, 48, 52, 55, 59, 63, 65, stuckMembers.length]} color="#DC2626" width={100} height={28} />
          </div>
        </div>
        <div className="space-y-2">
          <AlertCard severity="medium" title="Kit QC failure rate rose to 14% in February (from 11% in January). Impact: ~8 additional journey restarts." link={{ label: 'Delivery', href: '/clinical' }} />
          <AlertCard severity="medium" title="Dead zone engagement: 38% of members in lab processing have zero touchpoints in last 14 days." link={{ label: 'Marketing', href: '/marketing' }} />
          <AlertCard severity="low" title="February cohort activating 18% faster than November cohort. Delivery improvements translating." link={{ label: 'Delivery', href: '/clinical' }} positive />
        </div>
      </section>

      {/* ── 5. Member Health — 8 Week Trend ──────────────────────── */}
      <section>
        <SectionHeading number={5} title="Member Health — 8 Week Trend" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <ResponsiveContainer width="100%" height={176} className="h-36 md:h-44">
            <RechartAreaChart data={healthTrendData}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="week" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Area type="monotone" dataKey="Healthy" stackId="1" stroke={TMRW_COLORS.green} fill={TMRW_COLORS.green} fillOpacity={0.5} strokeWidth={0} />
              <Area type="monotone" dataKey="Attention" stackId="1" stroke={TMRW_COLORS.amber} fill={TMRW_COLORS.amber} fillOpacity={0.5} strokeWidth={0} />
              <Area type="monotone" dataKey="At-Risk" stackId="1" stroke="#DC2626" fill="#DC2626" fillOpacity={0.5} strokeWidth={0} />
            </RechartAreaChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium">
            <span>Current: <span className="font-mono">{healthDistribution.healthy}</span> healthy, <span className="font-mono">{healthDistribution.attention}</span> attention, <span className="font-mono">{healthDistribution['at-risk']}</span> at-risk</span>
            <Link href="/retention" className="ml-auto text-dash-red hover:underline">View details →</Link>
          </div>
        </div>
      </section>

      {/* ── 6. Strategic Questions ───────────────────────────────── */}
      <section>
        <SectionHeading number={6} title="Five Strategic Questions" />
        <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {questions.map(q => (
            <div key={q.number} className="flex flex-col">
              <QuestionTile {...q} />
              {q.number === 4 && (
                <div className="mt-1 rounded-b-md border border-t-0 border-dash-border bg-dash-surface/60 px-4 py-2">
                  <p className="font-sans text-[11px] italic text-dash-text-muted">Feb cohort tracking 72d, improving · Queue growing +3/wk</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. Rocks Strip ───────────────────────────────────────── */}
      <section>
        <SectionHeading number={7} title="Q1 2026 Rocks" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-dash-text-secondary">47 days left in Q1 &middot; {offTrackCount} need attention</span>
            <Link href="/eos" className="text-[11px] font-medium text-dash-red hover:underline">View L10 &rarr;</Link>
          </div>
          <div className="space-y-2">
            {rocks.map(rock => (
              <Link
                key={rock.id}
                href="/eos"
                className="flex items-center gap-3 rounded-md bg-dash-bg px-3 py-2 transition-colors hover:bg-dash-border/30"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dash-red font-mono text-[10px] font-bold text-white">
                  R{rock.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-dash-text">{rock.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  rock.status === 'on-track' ? 'bg-status-green/10 text-status-green'
                  : rock.status === 'off-track' ? 'bg-status-red/10 text-status-red'
                  : rock.status === 'at-risk' ? 'bg-status-amber/10 text-status-amber'
                  : rock.status === 'complete' ? 'bg-status-green/10 text-status-green'
                  : 'bg-dash-surface text-dash-text-muted'
                }`}>
                  {rock.status.replace('-', ' ')}
                </span>
                <div className="hidden sm:flex items-center gap-1">
                  {rock.metrics.map(m => (
                    <StatusDot key={m.label} status={m.status} size="sm" />
                  ))}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-dash-text-muted">
            <span className="font-semibold text-dash-text">Next L10: Monday 10 March.</span>
          </div>
        </div>
      </section>

      {/* ── 8. Last Data Refresh ─────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dash-text-muted">
          {sourceFreshness.map(s => (
            <span key={s.source} className="flex items-center gap-1.5">
              <StatusDot status={s.status} size="sm" />
              <span className="capitalize">{s.source}:</span>
              <span className={s.status === 'red' ? 'text-status-red' : s.status === 'amber' ? 'text-status-amber' : ''}>
                {s.label}{s.days !== null && ` (${s.days}d ago)`}
              </span>
            </span>
          ))}
        </div>
      </section>

      <MemberDetailPanel member={selectedMember} open={selectedMember !== null} onOpenChange={open => { if (!open) setSelectedMember(null) }} />
    </div>
  )
}

```

## `src/app/retention/page.tsx`

```tsx
'use client'

import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { AlertCard } from '@/components/dashboard/alert-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { Sparkline } from '@/components/dashboard/sparkline'
import { ChartPeriodToggle } from '@/components/dashboard/chart-period-toggle'
import { useDashboardData } from '@/lib/context/data-context'
import {
  ResponsiveContainer,
  LineChart as RechartLineChart,
  AreaChart as RechartAreaChart,
  BarChart as RechartBarChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridStyle, gridProps, tooltipStyle, legendStyle, TMRW_COLORS } from '@/lib/utils/chart-styles'

// ---------------------------------------------------------------------------
// 01 Cohort Retention Curves
// ---------------------------------------------------------------------------
const cohortRetentionMonthly = [
  { month: 'Month 0', 'Sep 2025': 100, 'Oct 2025': 100, 'Nov 2025': 100, 'Dec 2025': 100, 'Jan 2026': 100, 'Feb 2026': 100 },
  { month: 'Month 1', 'Sep 2025': 92, 'Oct 2025': 90, 'Nov 2025': 88, 'Dec 2025': 90, 'Jan 2026': 92, 'Feb 2026': 92 },
  { month: 'Month 2', 'Sep 2025': 85, 'Oct 2025': 86, 'Nov 2025': 82, 'Dec 2025': 85, 'Jan 2026': 85 },
  { month: 'Month 3', 'Sep 2025': 82, 'Oct 2025': 84, 'Nov 2025': 75, 'Dec 2025': 80 },
  { month: 'Month 4', 'Sep 2025': 80, 'Oct 2025': 82 },
  { month: 'Month 5', 'Sep 2025': 78 },
]

const cohortRetentionQuarterly = [
  { month: 'Month 0', 'Q3 2025': 100, 'Q4 2025': 100, 'Q1 2026': 100 },
  { month: 'Month 1', 'Q3 2025': 91, 'Q4 2025': 89, 'Q1 2026': 92 },
  { month: 'Month 2', 'Q3 2025': 85, 'Q4 2025': 84, 'Q1 2026': 85 },
  { month: 'Month 3', 'Q3 2025': 83, 'Q4 2025': 78 },
  { month: 'Month 4', 'Q3 2025': 81 },
  { month: 'Month 5', 'Q3 2025': 78 },
]

const cohortMonthlyCategories = ['Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026']
const cohortQuarterlyCategories = ['Q3 2025', 'Q4 2025', 'Q1 2026']

const cohortLineColors: Record<string, string> = {
  'Sep 2025': '#8B0000',
  'Oct 2025': '#EA580C',
  'Nov 2025': '#D97706',
  'Dec 2025': '#16A34A',
  'Jan 2026': '#0891B2',
  'Feb 2026': '#7C3AED',
  'Q3 2025': '#8B0000',
  'Q4 2025': '#16A34A',
  'Q1 2026': '#0891B2',
}

const churnByMonthOfLifeAll = [
  { month: 'Month 1', 'Churn %': 9 },
  { month: 'Month 2', 'Churn %': 7 },
  { month: 'Month 3', 'Churn %': 8 },
  { month: 'Month 4', 'Churn %': 3 },
  { month: 'Month 5', 'Churn %': 3 },
  { month: 'Month 6', 'Churn %': 2 },
]

const churnByMonthOfLifeLast3 = [
  { month: 'Month 1', 'Churn %': 10 },
  { month: 'Month 2', 'Churn %': 6 },
  { month: 'Month 3', 'Churn %': 7 },
  { month: 'Month 4', 'Churn %': 3 },
  { month: 'Month 5', 'Churn %': 2 },
  { month: 'Month 6', 'Churn %': 2 },
]

// ---------------------------------------------------------------------------
// 02 Retention by Journey Completeness
// ---------------------------------------------------------------------------
const journeyRetention = [
  { stage: 'Registered only', retention: '42%', n: 34 },
  { stage: 'Kit dispatched', retention: '55%', n: 28 },
  { stage: 'Results delivered', retention: '68%', n: 45 },
  { stage: 'Dashboard published', retention: '82%', n: 61 },
  { stage: 'Insights call', retention: '???%', n: 1 },
  { stage: 'Active plan', retention: '91%', n: 46 },
]

// ---------------------------------------------------------------------------
// 03 Churn Prediction & At-Risk Members
// ---------------------------------------------------------------------------
const riskSignals = [
  { signal: 'Days since activity > 30', severity: 'High' as const },
  { signal: 'Stalled > 45 days', severity: 'High' as const },
  { signal: 'Kit QC failure', severity: 'Medium' as const },
  { signal: 'No add-on adoption', severity: 'Medium' as const },
  { signal: 'Open ticket > 7 days', severity: 'Medium' as const },
  { signal: 'Payment failure', severity: 'High' as const },
  { signal: 'Dead zone > 4 wk no engagement', severity: 'High' as const },
  { signal: 'Overdue retest > 30 days', severity: 'Medium' as const },
]

const riskDistributionWeekly = [
  { period: 'W1 Jan', Healthy: 198, Attention: 39, 'At-Risk': 19 },
  { period: 'W2 Jan', Healthy: 199, Attention: 40, 'At-Risk': 19 },
  { period: 'W3 Jan', Healthy: 200, Attention: 40, 'At-Risk': 20 },
  { period: 'W4 Jan', Healthy: 201, Attention: 41, 'At-Risk': 20 },
  { period: 'W1 Feb', Healthy: 202, Attention: 41, 'At-Risk': 21 },
  { period: 'W2 Feb', Healthy: 203, Attention: 42, 'At-Risk': 22 },
  { period: 'W3 Feb', Healthy: 204, Attention: 42, 'At-Risk': 22 },
  { period: 'W4 Feb', Healthy: 205, Attention: 42, 'At-Risk': 23 },
]

const riskDistributionMonthly = [
  { period: 'Sep 2025', Healthy: 180, Attention: 30, 'At-Risk': 10 },
  { period: 'Oct 2025', Healthy: 185, Attention: 32, 'At-Risk': 12 },
  { period: 'Nov 2025', Healthy: 190, Attention: 35, 'At-Risk': 15 },
  { period: 'Dec 2025', Healthy: 195, Attention: 38, 'At-Risk': 18 },
  { period: 'Jan 2026', Healthy: 200, Attention: 40, 'At-Risk': 20 },
  { period: 'Feb 2026', Healthy: 205, Attention: 42, 'At-Risk': 23 },
]

// ---------------------------------------------------------------------------
// 04 Retest Conversion
// ---------------------------------------------------------------------------
const retestFunnel = [
  { stage: 'Eligible', count: 45 },
  { stage: 'Notified', count: 38 },
  { stage: 'Scheduled', count: 12 },
  { stage: 'Completed', count: 8 },
]

// ---------------------------------------------------------------------------
// 05 Revenue Retention (NRR)
// ---------------------------------------------------------------------------
const revenueByTenureMonthly = [
  { tenure: 'Month 1', 'Revenue per Member': 149 },
  { tenure: 'Month 3', 'Revenue per Member': 152 },
  { tenure: 'Month 6', 'Revenue per Member': 155 },
  { tenure: 'Month 9', 'Revenue per Member': 158 },
  { tenure: 'Month 12', 'Revenue per Member': 160 },
]

const revenueByTenureQuarterly = [
  { tenure: 'Q1', 'Revenue per Member': 150 },
  { tenure: 'Q2', 'Revenue per Member': 154 },
  { tenure: 'Q3', 'Revenue per Member': 158 },
  { tenure: 'Q4', 'Revenue per Member': 160 },
]

const revenueByTenureTrailing12 = [
  { tenure: 'Mar 2025', 'Revenue per Member': 145 },
  { tenure: 'Jun 2025', 'Revenue per Member': 148 },
  { tenure: 'Sep 2025', 'Revenue per Member': 152 },
  { tenure: 'Dec 2025', 'Revenue per Member': 156 },
  { tenure: 'Mar 2026', 'Revenue per Member': 160 },
]

// ---------------------------------------------------------------------------
// 06 Retention Levers
// ---------------------------------------------------------------------------
const retentionLevers = [
  {
    lever: 'Reduce Reg→Dashboard from 98d to 45d',
    retentionImpact: '+8pp',
    revenueImpact: '+$142K',
    basis: 'Dashboard Published = 82% retention vs Awaiting = 68%',
  },
  {
    lever: 'Achieve 50% insights call completion',
    retentionImpact: '+5pp',
    revenueImpact: '+$89K',
    basis: 'Projected from Active Plan retention of 91%. n=1 current.',
  },
  {
    lever: 'Reduce payment failure rate 3%→1%',
    retentionImpact: '+2pp',
    revenueImpact: '+$36K',
    basis: 'Payment failure = High severity churn signal.',
  },
  {
    lever: 'Eliminate dead-zone disengagement',
    retentionImpact: '+4pp',
    revenueImpact: '+$71K',
    basis: '38% of dead-zone members have zero touchpoints in 14d.',
  },
]

// ---------------------------------------------------------------------------
// Risk Signal Frequency — 8 Week Trend
// ---------------------------------------------------------------------------
const riskSignalTrends = [
  { signal: 'Stalled >45d', current: 48, data: [30, 33, 36, 38, 40, 42, 45, 48], severity: 'High' },
  { signal: 'Dead zone >4wk', current: 38, data: [22, 24, 27, 29, 31, 33, 35, 38], severity: 'High' },
  { signal: 'Days inactive >30', current: 31, data: [18, 20, 22, 24, 26, 28, 29, 31], severity: 'High' },
  { signal: 'No add-on adoption', current: 34, data: [28, 29, 30, 31, 32, 33, 33, 34], severity: 'Medium' },
  { signal: 'Open ticket >7d', current: 12, data: [18, 16, 15, 14, 14, 13, 12, 12], severity: 'Medium' },
  { signal: 'Kit QC failure', current: 11, data: [6, 7, 7, 8, 8, 9, 10, 11], severity: 'Medium' },
  { signal: 'Payment failure', current: 6, data: [10, 9, 8, 8, 7, 7, 6, 6], severity: 'High' },
  { signal: 'Overdue retest >30d', current: 5, data: [3, 3, 4, 4, 4, 5, 5, 5], severity: 'Medium' },
]

// ---------------------------------------------------------------------------
// Cohort detail mock helper
// ---------------------------------------------------------------------------
interface CohortDetail {
  cohortName: string
  totalMembers: number
  activeCount: number
  churnedCount: number
  topChurnReasons: string[]
}

const cohortDetails: Record<string, CohortDetail> = {
  'Sep 2025': { cohortName: 'Sep 2025', totalMembers: 42, activeCount: 33, churnedCount: 9, topChurnReasons: ['Dead zone inactivity', 'Payment failure', 'No dashboard unlock'] },
  'Oct 2025': { cohortName: 'Oct 2025', totalMembers: 38, activeCount: 31, churnedCount: 7, topChurnReasons: ['Stalled journey', 'Dead zone inactivity', 'Kit QC failure'] },
  'Nov 2025': { cohortName: 'Nov 2025', totalMembers: 45, activeCount: 34, churnedCount: 11, topChurnReasons: ['Dead zone inactivity', 'No add-on adoption', 'Support escalation'] },
  'Dec 2025': { cohortName: 'Dec 2025', totalMembers: 40, activeCount: 32, churnedCount: 8, topChurnReasons: ['Payment failure', 'Stalled journey', 'Dead zone inactivity'] },
  'Jan 2026': { cohortName: 'Jan 2026', totalMembers: 48, activeCount: 41, churnedCount: 7, topChurnReasons: ['Stalled journey', 'Overdue retest', 'Dead zone inactivity'] },
  'Feb 2026': { cohortName: 'Feb 2026', totalMembers: 52, activeCount: 48, churnedCount: 4, topChurnReasons: ['Dead zone inactivity', 'Payment failure'] },
  'Q3 2025': { cohortName: 'Q3 2025', totalMembers: 42, activeCount: 33, churnedCount: 9, topChurnReasons: ['Dead zone inactivity', 'Payment failure', 'No dashboard unlock'] },
  'Q4 2025': { cohortName: 'Q4 2025', totalMembers: 123, activeCount: 97, churnedCount: 26, topChurnReasons: ['Dead zone inactivity', 'Stalled journey', 'Payment failure'] },
  'Q1 2026': { cohortName: 'Q1 2026', totalMembers: 100, activeCount: 89, churnedCount: 11, topChurnReasons: ['Stalled journey', 'Overdue retest', 'Dead zone inactivity'] },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function RetentionPage() {
  const { members } = useDashboardData()

  // --- Toggle states for ChartPeriodToggle ---
  const [cohortPeriod, setCohortPeriod] = useState('monthly')
  const [churnPeriod, setChurnPeriod] = useState('all')
  const [riskPeriod, setRiskPeriod] = useState('monthly')
  const [revenuePeriod, setRevenuePeriod] = useState('monthly')

  // --- Cohort chart click state ---
  const [selectedCohort, setSelectedCohort] = useState<CohortDetail | null>(null)

  // --- Derive cohort chart data from toggle ---
  const cohortData = cohortPeriod === 'monthly' ? cohortRetentionMonthly : cohortRetentionQuarterly
  const cohortCategories = cohortPeriod === 'monthly' ? cohortMonthlyCategories : cohortQuarterlyCategories
  const cohortColors = cohortPeriod === 'monthly'
    ? ['rose', 'amber', 'yellow', 'emerald', 'cyan', 'violet']
    : ['rose', 'emerald', 'cyan']

  // --- Churn by month-of-life data from toggle ---
  const churnData = churnPeriod === 'all' ? churnByMonthOfLifeAll : churnByMonthOfLifeLast3

  // --- Risk distribution data from toggle ---
  const riskData = riskPeriod === 'weekly' ? riskDistributionWeekly : riskDistributionMonthly

  // --- Revenue data from toggle ---
  const revenueData = revenuePeriod === 'monthly'
    ? revenueByTenureMonthly
    : revenuePeriod === 'quarterly'
      ? revenueByTenureQuarterly
      : revenueByTenureTrailing12

  // --- Section 07: Recovery Tracker ---
  const recoveredMembers = useMemo(() => {
    return members.filter(
      (m) =>
        m.healthScore === 'healthy' &&
        m.riskFlags.some((f) => f.type === 'churn-risk' || f.type === 'stalled-journey')
    )
  }, [members])

  // --- Cohort click handler ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleCohortValueChange(value: any) {
    if (!value) {
      setSelectedCohort(null)
      return
    }
    const detail = cohortDetails[value.categoryClicked]
    setSelectedCohort(detail ?? null)
  }

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Retention' }]} />
        <div className="flex items-center gap-2">
          <DataSourceBadge source="tableau" />
          <DataSourceBadge source="hubspot" />
          <DataSourceBadge source="stripe" />
        </div>
      </div>

      {/* Headline Metrics */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <MetricCard
          label="90-Day Retention"
          value="78%"
          target=">85%"
          status="amber"
          sparkline={[72, 74, 75, 76, 77, 78]}
        />
        <MetricCard
          label="Monthly Churn"
          value="3.8%"
          target="<5%"
          status="green"
          sparkline={[4.2, 4.0, 3.8, 3.6, 3.5, 3.8]}
        />
        <MetricCard
          label="NRR"
          value="94%"
          target=">100%"
          status="amber"
          sparkline={[88, 89, 90, 91, 93, 94]}
        />
        <MetricCard
          label="At-Risk Count"
          value="23"
          status="red"
          sparkline={[10, 12, 15, 18, 20, 23]}
        />
      </div>

      {/* ================================================================= */}
      {/* 01 Cohort Retention Curves */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={1} title="Cohort Retention Curves" />

        <div className="space-y-3 md:space-y-6">
          {/* Multi-line cohort chart */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                  % Still Active by Signup Cohort
                </h3>
                <p className="text-xs text-dash-text-muted">X-axis: months since registration. Y-axis: % still active. Click a line for details.</p>
              </div>
              <ChartPeriodToggle
                options={[
                  { label: 'Monthly Cohorts', value: 'monthly' },
                  { label: 'Quarterly Cohorts', value: 'quarterly' },
                ]}
                selected={cohortPeriod}
                onChange={setCohortPeriod}
              />
            </div>
            <ResponsiveContainer width="100%" height={288} className="h-56 md:h-72">
              <RechartLineChart data={cohortData}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ ...legendStyle, fontSize: 12 }} />
                {cohortCategories.map(cat => (
                  <Line
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stroke={cohortLineColors[cat] || '#737373'}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: cohortLineColors[cat] || '#737373', stroke: '#fff', strokeWidth: 1.5 }}
                    connectNulls={false}
                  />
                ))}
              </RechartLineChart>
            </ResponsiveContainer>
          </div>

          {/* Cohort detail card (shown on click) */}
          {selectedCohort && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-dash-text">
                  Cohort: {selectedCohort.cohortName}
                </h4>
                <button
                  onClick={() => setSelectedCohort(null)}
                  className="text-xs text-dash-text-muted hover:text-dash-text"
                >
                  Dismiss
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-dash-text-muted">Total Members</p>
                  <p className="font-mono font-semibold text-dash-text">{selectedCohort.totalMembers}</p>
                </div>
                <div>
                  <p className="text-xs text-dash-text-muted">Active</p>
                  <p className="font-mono font-semibold text-emerald-500">{selectedCohort.activeCount}</p>
                </div>
                <div>
                  <p className="text-xs text-dash-text-muted">Churned</p>
                  <p className="font-mono font-semibold text-rose-500">{selectedCohort.churnedCount}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-dash-text-muted">Top Churn Reasons</p>
                <ul className="mt-1 list-inside list-disc text-sm text-dash-text">
                  {selectedCohort.topChurnReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Cohort comparison callout */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <p className="text-sm font-medium text-dash-text">
              November cohort retaining 7 points better at month 3 than September.
            </p>
          </div>

          {/* Churn rate by month-of-life */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                  Churn Rate by Month-of-Life
                </h3>
                <p className="text-xs text-dash-text-muted">Highest churn at month 2-3 (the &quot;dead zone&quot;).</p>
              </div>
              <ChartPeriodToggle
                options={[
                  { label: 'All Cohorts', value: 'all' },
                  { label: 'Last 3 Cohorts', value: 'last3' },
                ]}
                selected={churnPeriod}
                onChange={setChurnPeriod}
              />
            </div>
            <ResponsiveContainer width="100%" height={224} className="h-44 md:h-56">
              <RechartBarChart data={churnData}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Bar dataKey="Churn %" fill={TMRW_COLORS.red} radius={[4, 4, 0, 0]} />
              </RechartBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 02 Retention by Journey Completeness */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={2} title="Retention by Journey Completeness" />

        <div className="space-y-3 md:space-y-6">
          <div className="overflow-x-auto rounded-lg border border-dash-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface">
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Furthest Stage Reached</th>
                  <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Retention Rate</th>
                  <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">n=</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {journeyRetention.map((row) => (
                  <tr key={row.stage} className="bg-dash-surface/50">
                    <td className="px-4 py-2 font-medium text-dash-text">{row.stage}</td>
                    <td className="px-4 py-2 text-right font-mono text-dash-text">{row.retention}</td>
                    <td className="px-4 py-2 text-right font-mono text-dash-text-muted">{row.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
            <p className="text-sm font-medium text-dash-text">
              The biggest retention jump happens at Dashboard Published (+14pp). Every operational dollar should accelerate time-to-dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 03 Churn Prediction & At-Risk Members */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={3} title="Churn Prediction & At-Risk Members" />

        <div className="space-y-3 md:space-y-6">
          {/* Risk signal table */}
          <div className="overflow-x-auto rounded-lg border border-dash-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface">
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Risk Signal</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {riskSignals.map((row) => (
                  <tr key={row.signal} className="bg-dash-surface/50">
                    <td className="px-4 py-2 text-dash-text">{row.signal}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.severity === 'High'
                            ? 'bg-status-red-light text-status-red'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                        }`}
                      >
                        {row.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* At-risk member summary */}
          <AlertCard
            severity="high"
            title="Currently 23 members scored at-risk. 12 in dead zone, 6 overdue for retest, 5 with payment issues."
          />

          {/* Risk distribution over time */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                  Risk Distribution Over Time
                </h3>
                <p className="text-xs text-dash-text-muted">Stacked: healthy / attention / at-risk members.</p>
              </div>
              <ChartPeriodToggle
                options={[
                  { label: 'Weekly', value: 'weekly' },
                  { label: 'Monthly', value: 'monthly' },
                ]}
                selected={riskPeriod}
                onChange={setRiskPeriod}
              />
            </div>
            <ResponsiveContainer width="100%" height={256} className="h-48 md:h-64">
              <RechartAreaChart data={riskData}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="period" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={legendStyle} />
                <Area type="monotone" dataKey="Healthy" stackId="1" stroke={TMRW_COLORS.green} fill={TMRW_COLORS.green} fillOpacity={0.5} strokeWidth={0} />
                <Area type="monotone" dataKey="Attention" stackId="1" stroke={TMRW_COLORS.amber} fill={TMRW_COLORS.amber} fillOpacity={0.5} strokeWidth={0} />
                <Area type="monotone" dataKey="At-Risk" stackId="1" stroke="#DC2626" fill="#DC2626" fillOpacity={0.5} strokeWidth={0} />
              </RechartAreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Risk Signal Frequency — 8 Week Trend */}
      {/* ================================================================= */}
      <section>
        <div className="mb-4">
          <h2 className="font-sans text-base font-semibold tracking-[-0.01em] text-dash-text">
            Risk Signal Frequency — 8 Week Trend
          </h2>
        </div>

        <div className="space-y-3 md:space-y-6">
          {/* Mobile: card layout */}
          <div className="space-y-3 md:hidden">
            {riskSignalTrends.map((row) => {
              const delta = row.data[row.data.length - 1] - row.data[0]
              const sparkColor = delta > 0 ? '#DC2626' : delta < 0 ? '#16A34A' : '#737373'
              return (
                <div key={row.signal} className="rounded-lg border border-dash-border bg-dash-surface p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-dash-text">{row.signal}</span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.severity === 'High'
                          ? 'bg-status-red/10 text-status-red'
                          : 'bg-status-amber/10 text-status-amber'
                      }`}
                    >
                      {row.severity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Sparkline data={row.data} color={sparkColor} width={100} height={28} />
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-dash-text">{row.current}</span>
                      <span className={`font-mono text-sm font-bold ${delta > 0 ? 'text-status-red' : delta < 0 ? 'text-status-green' : 'text-dash-text-muted'}`}>
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Desktop: table layout */}
          <div className="hidden overflow-x-auto rounded-lg border border-dash-border md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface">
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Risk Signal</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Severity</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">8wk Trend</th>
                  <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Current</th>
                  <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Δ 8wk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {riskSignalTrends.map((row) => {
                  const delta = row.data[row.data.length - 1] - row.data[0]
                  const sparkColor = delta > 0 ? '#DC2626' : delta < 0 ? '#16A34A' : '#737373'
                  return (
                    <tr key={row.signal} className="bg-dash-surface/50">
                      <td className="px-4 py-2 font-medium text-dash-text">{row.signal}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.severity === 'High'
                              ? 'bg-status-red/10 text-status-red'
                              : 'bg-status-amber/10 text-status-amber'
                          }`}
                        >
                          {row.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Sparkline data={row.data} color={sparkColor} width={100} height={28} />
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-dash-text">{row.current}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold">
                        <span className={delta > 0 ? 'text-status-red' : delta < 0 ? 'text-status-green' : 'text-dash-text-muted'}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <p className="text-sm text-dash-text-muted">
              Sorted by current count. Top 3 signals (stalled, dead zone, inactive) are all growing — these are pipeline-speed driven.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 04 Retest Conversion */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={4} title="Retest Conversion" />

        <div className="space-y-3 md:space-y-6">
          {/* Retest funnel */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Retest Funnel
            </h3>
            {/* Mobile: vertical funnel */}
            <div className="flex flex-col gap-2 md:hidden">
              {retestFunnel.map((step, i) => {
                const widthPct = Math.max(20, (step.count / retestFunnel[0].count) * 100)
                const convRate =
                  i > 0
                    ? ((step.count / retestFunnel[i - 1].count) * 100).toFixed(0)
                    : null
                return (
                  <div key={step.stage}>
                    {convRate && (
                      <div className="flex justify-center py-1">
                        <span className="text-xs text-dash-text-muted">&darr; {convRate}% conv.</span>
                      </div>
                    )}
                    <div
                      className="flex items-center justify-between rounded-md bg-status-red-light px-4 py-3"
                      style={{ width: `${widthPct}%` }}
                    >
                      <span className="text-xs font-medium text-dash-text-secondary">{step.stage}</span>
                      <span className="text-lg font-bold text-dash-text">{step.count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Desktop: horizontal funnel */}
            <div className="hidden items-center gap-1 overflow-x-auto pb-4 md:flex">
              {retestFunnel.map((step, i) => {
                const widthPct = Math.max(20, (step.count / retestFunnel[0].count) * 100)
                const convRate =
                  i > 0
                    ? ((step.count / retestFunnel[i - 1].count) * 100).toFixed(0)
                    : null
                return (
                  <div key={step.stage} className="flex items-center">
                    <div
                      className="flex flex-col items-center justify-center rounded-md bg-status-red-light px-4 py-3 text-center"
                      style={{ minWidth: `${widthPct * 1.6}px`, width: `${widthPct * 1.6}px` }}
                    >
                      <span className="text-xs font-medium text-dash-text-secondary">{step.stage}</span>
                      <span className="text-lg font-bold text-dash-text">{step.count}</span>
                      {convRate && (
                        <span className="text-xs text-dash-text-muted">{convRate}% conv.</span>
                      )}
                    </div>
                    {i < retestFunnel.length - 1 && (
                      <span className="mx-1 text-dash-text-muted">&rarr;</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Time-to-retest & pipeline */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                Time-to-Retest
              </h3>
              <p className="text-2xl font-bold text-dash-text">5.2 months</p>
              <p className="mt-1 text-xs text-dash-text-muted">Median (target: 4 months)</p>
            </div>
            <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                Retest Pipeline
              </h3>
              <ul className="space-y-1 text-sm text-dash-text">
                <li><span className="font-mono font-semibold">28</span> members become retest-eligible in April</li>
                <li><span className="font-mono font-semibold">43</span> in May</li>
                <li><span className="font-mono font-semibold">67</span> in June</li>
              </ul>
            </div>
          </div>

          {/* Retest vs no-retest placeholder */}
          <div className="rounded-lg border border-dashed border-dash-border bg-dash-surface p-5">
            <p className="text-sm italic text-dash-text-muted">
              Retest vs no-retest retention: Insufficient data -- requires 2+ completed retest cycles.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 05 Revenue Retention (NRR) */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={5} title="Revenue Retention (NRR)" />

        <div className="space-y-3 md:space-y-6">
          {/* NRR metrics */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
            <MetricCard
              label="Net Revenue Retention (NRR)"
              value="94%"
              target=">100%"
              status="amber"
            />
            <MetricCard
              label="Treatment Journey Attach Rate"
              value="15%"
              target="40%"
              status="red"
            />
            <MetricCard
              label="Supplement Attach Rate"
              value="15%"
              status="amber"
            />
          </div>

          {/* Revenue per member by tenure */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                  Revenue per Member by Tenure
                </h3>
                <p className="text-xs text-dash-text-muted">Average monthly revenue ($) by member tenure.</p>
              </div>
              <ChartPeriodToggle
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Quarterly', value: 'quarterly' },
                  { label: 'Trailing 12mo', value: 'trailing12' },
                ]}
                selected={revenuePeriod}
                onChange={setRevenuePeriod}
              />
            </div>
            <ResponsiveContainer width="100%" height={224} className="h-44 md:h-56">
              <RechartBarChart data={revenueData}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="tenure" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={48} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${v}`} />
                <Bar dataKey="Revenue per Member" fill={TMRW_COLORS.cyan} radius={[4, 4, 0, 0]} />
              </RechartBarChart>
            </ResponsiveContainer>
          </div>

          {/* NRR alert */}
          <AlertCard
            severity="high"
            title="NRR below 100% — leaky bucket. Treatment journey attach rate at 15% vs 40% target is the primary gap."
          />
        </div>
      </section>

      {/* ================================================================= */}
      {/* 06 Retention Levers */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={6} title="Retention Levers — Quantified Impact" />

        {/* Mobile: card layout */}
        <div className="space-y-3 md:hidden">
          {retentionLevers.map((row) => (
            <div key={row.lever} className="rounded-lg border border-dash-border bg-dash-surface p-4">
              <p className="mb-2 text-sm font-medium text-dash-text">{row.lever}</p>
              <div className="mb-2 flex items-center gap-4">
                <div>
                  <p className="text-xs text-dash-text-muted">Retention</p>
                  <p className="font-mono text-sm font-bold text-status-green">{row.retentionImpact}</p>
                </div>
                <div>
                  <p className="text-xs text-dash-text-muted">Revenue</p>
                  <p className="font-mono text-sm font-bold text-status-green">{row.revenueImpact}</p>
                </div>
              </div>
              <p className="text-xs text-dash-text-muted">{row.basis}</p>
            </div>
          ))}
          <div className="rounded-lg border-2 border-dash-border bg-dash-surface-alt p-4">
            <p className="mb-1 text-sm font-bold text-dash-text">Combined potential</p>
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm font-bold text-dash-red">+19pp</span>
              <span className="font-mono text-sm font-bold text-dash-red">+$338K/year</span>
            </div>
            <p className="mt-1 text-xs text-dash-text-muted">Based on {members.filter(m => m.caseStatus === 'Open').length} active members × $249 ARPU</p>
          </div>
        </div>
        {/* Desktop: table layout */}
        <div className="hidden overflow-x-auto rounded-lg border border-dash-border md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Lever</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Retention Impact</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Revenue Impact (Annual)</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {retentionLevers.map((row) => (
                <tr key={row.lever} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{row.lever}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-status-green">{row.retentionImpact}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-status-green">{row.revenueImpact}</td>
                  <td className="px-4 py-2 text-xs text-dash-text-muted">{row.basis}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-dash-border bg-dash-surface-alt">
                <td className="px-4 py-3 font-bold text-dash-text">Combined potential</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-dash-red">+19pp</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-dash-red">+$338K/year</td>
                <td className="px-4 py-3 text-xs text-dash-text-muted">Based on {members.filter(m => m.caseStatus === 'Open').length} active members × $249 ARPU</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 07 Recovery Tracker */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={7} title="Recovery Tracker" />

        {recoveredMembers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-dash-border bg-dash-surface p-5">
            <p className="text-sm italic text-dash-text-muted">No recoveries tracked yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dash-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface">
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Member</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Previous Risk</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Recovery Date</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {recoveredMembers.map((m) => {
                  const relevantFlag = m.riskFlags.find(
                    (f) => f.type === 'churn-risk' || f.type === 'stalled-journey'
                  )
                  return (
                    <tr key={m.id} className="bg-dash-surface/50">
                      <td className="px-4 py-2 font-medium text-dash-text">{m.displayName}</td>
                      <td className="px-4 py-2 text-dash-text">
                        <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                          {relevantFlag?.type === 'churn-risk' ? 'Churn Risk' : 'Stalled Journey'}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-dash-text-muted">
                        {relevantFlag?.detectedAt
                          ? new Date(relevantFlag.detectedAt).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                          Healthy
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

```

## `src/app/strategy/page.tsx`

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { StatusDot } from '@/components/dashboard/status-dot'
import { Sparkline } from '@/components/dashboard/sparkline'
import { useDashboardData } from '@/lib/context/data-context'
import {
  mockQuestions,
  mockStrategicBets,
  mockPostureChoices,
  mockDestinationTable,
} from '@/data/mock'
import type { Status } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const metricLabels: Record<string, string> = {
  'biomarker-improvement': 'Biomarker Improvement Rate',
  'bio-age-delta': 'Bio Age Delta',
  'new-member-capacity': 'New Member Capacity/Month',
  'treatment-journey-conversion': 'Treatment Journey Conversion',
  csat: 'CSAT',
  'monthly-churn': 'Monthly Churn',
  'channel-partners': 'Channel Partners',
  'corporate-partners': 'Corporate Partners',
  'reg-to-dashboard': 'Reg→Dashboard',
  'members-per-clinical-fte': 'Members/Clinical FTE',
  'blended-cac': 'Blended CAC',
  'cm-per-member': 'CM/Member',
}

const metricFormats: Record<string, { prefix?: string; suffix?: string }> = {
  'blended-cac': { prefix: '$' },
  'cm-per-member': { prefix: '$' },
  'reg-to-dashboard': { suffix: 'd' },
  csat: { suffix: '%' },
  'monthly-churn': { suffix: '%' },
}

function formatMetricValue(id: string, value: number | string | null): string {
  if (value === null || value === 'TBC') return 'TBC'
  const fmt = metricFormats[id]
  if (!fmt) return String(value)
  return `${fmt.prefix ?? ''}${value}${fmt.suffix ?? ''}`
}

function formatTarget(id: string, target: number | string | null): string | null {
  if (target === null) return null
  const fmt = metricFormats[id]
  if (!fmt) return String(target)
  return `${fmt.prefix ?? ''}${target}${fmt.suffix ?? ''}`
}

const areaLinks: Record<string, { label: string; href: string }> = {
  clinical: { label: 'Clinical', href: '/clinical' },
  members: { label: 'Members', href: '/members' },
  support: { label: 'Support', href: '/support' },
  financial: { label: 'Financial', href: '/financial' },
  marketing: { label: 'Marketing', href: '/marketing' },
  strategy: { label: 'Strategy (manual)', href: '/strategy' },
}

const statusRowBg: Record<Status, string> = {
  red: 'bg-status-red-light',
  amber: 'bg-status-amber-light',
  green: 'bg-dash-surface/50',
  grey: 'bg-dash-surface/50',
}

// 12-week sparkline scores per strategic question (1-indexed by question number)
const weeklyScores: Record<number, number[]> = {
  1: [55, 58, 54, 60, 62, 59, 63, 65, 68, 67, 70, 72],
  2: [40, 42, 38, 45, 43, 47, 50, 48, 52, 55, 54, 57],
  3: [70, 72, 71, 68, 65, 67, 69, 72, 74, 76, 75, 78],
  4: [30, 32, 35, 38, 40, 42, 44, 45, 48, 50, 52, 55],
  5: [60, 58, 55, 57, 60, 62, 65, 63, 66, 68, 70, 72],
}

// Last activity timestamps for strategic bets (ISO strings)
const betLastActivity: Record<number, string> = {
  1: '2026-02-28',
  2: '2026-01-15',
  3: '2026-03-01',
}

// Position mapping for posture slider
const positionMap: Record<string, number> = {
  'decided-left': 15,
  'leaning-left': 30,
  open: 50,
  'leaning-right': 70,
  'decided-right': 85,
}

const positionValues = ['decided-left', 'leaning-left', 'open', 'leaning-right', 'decided-right'] as const

const POSTURE_STORAGE_KEY = 'strategy-posture-positions'

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function StrategyPage() {
  // Use context data (available but strategy page uses mostly mock strategy data)
  useDashboardData()

  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    new Set([1, 2, 3, 4, 5])
  )
  const [expandedBets, setExpandedBets] = useState<Set<number>>(new Set())

  // Posture slider state
  const [posturePositions, setPosturePositions] = useState<Record<string, { position: string; updatedAt: string }>>({})
  const [postureLoaded, setPostureLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(POSTURE_STORAGE_KEY)
      if (raw) setPosturePositions(JSON.parse(raw))
    } catch {
      // ignore
    }
    setPostureLoaded(true)
  }, [])

  useEffect(() => {
    if (!postureLoaded) return
    try {
      localStorage.setItem(POSTURE_STORAGE_KEY, JSON.stringify(posturePositions))
    } catch {
      // ignore
    }
  }, [posturePositions, postureLoaded])

  function toggleQuestion(n: number) {
    setExpandedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  function toggleBet(n: number) {
    setExpandedBets((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const updatePosture = useCallback((id: string, newPosition: string) => {
    setPosturePositions((prev) => ({
      ...prev,
      [id]: { position: newPosition, updatedAt: new Date().toISOString() },
    }))
  }, [])

  // Group destination rows by category
  const destinationCategories: { category: string; rows: typeof mockDestinationTable }[] = []
  const seen = new Set<string>()
  for (const row of mockDestinationTable) {
    if (!seen.has(row.category)) {
      seen.add(row.category)
      destinationCategories.push({
        category: row.category,
        rows: mockDestinationTable.filter((r) => r.category === row.category),
      })
    }
  }

  const now = new Date()

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Strategy' }]} />

      {/* ================================================================= */}
      {/* A. Five Strategic Questions                                        */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-6 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Five Strategic Questions
        </h2>

        <div className="divide-y divide-dash-border rounded-lg border border-dash-border">
          {mockQuestions.map((q) => {
            const isOpen = expandedQuestions.has(q.number)
            const sparkData = weeklyScores[q.number] ?? []
            return (
              <div key={q.id} className="bg-dash-surface">
                {/* Header row */}
                <button
                  onClick={() => toggleQuestion(q.number)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-dash-surface/80"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dash-border text-xs font-semibold text-dash-text">
                    {q.number}
                  </span>
                  <span className="flex-1 font-sans text-sm font-semibold text-dash-text">
                    {q.text}
                  </span>
                  {/* 12-week sparkline */}
                  {sparkData.length > 1 && (
                    <span className="hidden shrink-0 sm:inline-block">
                      <Sparkline data={sparkData} width={80} height={24} />
                    </span>
                  )}
                  <StatusDot status={q.status} />
                  <svg
                    className={`h-4 w-4 shrink-0 text-dash-text-muted transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="space-y-5 px-5 pb-5">
                    {/* Framing */}
                    <p className="text-sm leading-relaxed text-dash-text-secondary">
                      {q.framing}
                    </p>

                    {/* Primary metrics */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {q.primaryMetrics.map((m) => (
                        <MetricCard
                          key={m.metricId}
                          label={metricLabels[m.metricId] || m.metricId}
                          value={formatMetricValue(m.metricId, m.current)}
                          target={formatTarget(m.metricId, m.target)}
                          status={m.status}
                          trend={m.trend}
                          sparkline={m.sparkline.length > 1 ? m.sparkline : undefined}
                        />
                      ))}
                    </div>

                    {/* Secondary metrics (e.g. Q2) */}
                    {q.secondaryMetrics.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {q.secondaryMetrics.map((m) => (
                          <MetricCard
                            key={m.metricId}
                            label={metricLabels[m.metricId] || m.metricId}
                            value={formatMetricValue(m.metricId, m.current)}
                            target={formatTarget(m.metricId, m.target)}
                            status={m.status}
                            trend={m.trend}
                            sparkline={m.sparkline.length > 1 ? m.sparkline : undefined}
                          />
                        ))}
                      </div>
                    )}

                    {/* What Has To Be True */}
                    <div>
                      <h4 className="mb-2 font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
                        What Has To Be True
                      </h4>
                      <ul className="space-y-1">
                        {q.whatHasToBeTrueItems.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-dash-text-secondary"
                          >
                            <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-dash-text-muted" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Functional area links */}
                    <div className="flex items-center gap-2">
                      {q.functionalAreas.map((area) => {
                        const link = areaLinks[area]
                        if (!link) return null
                        return (
                          <a
                            key={area}
                            href={link.href}
                            className="text-xs text-dash-red hover:underline"
                          >
                            &rarr; {link.label}
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* B. Destination Table                                               */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Destination Table
        </h2>
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Category</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Metric</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Now</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">
                  Jun Target
                </th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">
                  Dec Target
                </th>
                <th className="px-4 py-3 text-center font-medium text-dash-text-secondary">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {destinationCategories.map((group) =>
                group.rows.map((row, idx) => (
                  <tr key={`${row.category}-${row.metric}`} className={statusRowBg[row.status]}>
                    {idx === 0 ? (
                      <td
                        rowSpan={group.rows.length}
                        className="border-r border-dash-border px-4 py-2 align-top font-medium text-dash-text"
                      >
                        {row.category}
                      </td>
                    ) : null}
                    <td className="px-4 py-2 text-dash-text">{row.metric}</td>
                    <td className="px-4 py-2 text-right font-mono text-dash-text">{row.now}</td>
                    <td className="px-4 py-2 text-right font-mono text-dash-text-muted">
                      {row.jun}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-dash-text-muted">
                      {row.dec}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusDot status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* C. Strategic Bets                                                  */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Strategic Bets
        </h2>
        <div className="space-y-3">
          {mockStrategicBets.map((bet) => {
            const isOpen = expandedBets.has(bet.number)
            const lastActivityISO = betLastActivity[bet.number]
            const lastActivityDate = lastActivityISO ? new Date(lastActivityISO) : null
            const daysSince = lastActivityDate ? daysBetween(now, lastActivityDate) : 0
            const isStale = daysSince > 42
            return (
              <div
                key={bet.id}
                className={`rounded-lg border bg-dash-surface ${
                  isStale ? 'border-status-amber border-2' : 'border-dash-border'
                }`}
              >
                <button
                  onClick={() => toggleBet(bet.number)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-dash-surface/80"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dash-border text-xs font-semibold text-dash-text">
                    {bet.number}
                  </span>
                  <span className="flex-1 font-sans text-sm font-semibold text-dash-text">
                    {bet.title}
                  </span>
                  {/* Last Activity indicator */}
                  {lastActivityDate && (
                    <span className={`shrink-0 text-[11px] ${isStale ? 'font-semibold text-status-amber' : 'text-dash-text-muted'}`}>
                      Last activity: {formatShortDate(lastActivityISO)}
                      {isStale && ' (stale)'}
                    </span>
                  )}
                  <svg
                    className={`h-4 w-4 shrink-0 text-dash-text-muted transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="space-y-4 px-5 pb-5">
                    {isStale && (
                      <div className="rounded border border-status-amber bg-status-amber/10 px-3 py-2 text-xs font-medium text-status-amber">
                        This bet has had no activity for {daysSince} days. Consider reviewing or archiving.
                      </div>
                    )}

                    <p className="text-sm leading-relaxed text-dash-text-secondary">
                      {bet.description}
                    </p>

                    {/* Proof conditions */}
                    <div>
                      <h4 className="mb-2 font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
                        Proof Conditions
                      </h4>
                      <ul className="space-y-1.5">
                        {bet.proofConditions.map((pc, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <span
                              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs ${
                                pc.met
                                  ? 'border-status-green bg-status-green/20 text-status-green'
                                  : 'border-dash-border'
                              }`}
                            >
                              {pc.met ? '✓' : ''}
                            </span>
                            <span
                              className={
                                pc.met ? 'text-dash-text line-through' : 'text-dash-text-secondary'
                              }
                            >
                              {pc.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* D. Strategic Posture Choices                                       */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Strategic Posture Choices
        </h2>
        <div className="space-y-4 rounded-lg border border-dash-border bg-dash-surface p-5">
          {mockPostureChoices.map((choice) => {
            const savedState = posturePositions[choice.id]
            const currentPosition = savedState?.position ?? choice.position
            const pct = positionMap[currentPosition] ?? 50
            const updatedAt = savedState?.updatedAt
              ? new Date(savedState.updatedAt).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
              : null

            return (
              <div key={choice.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs font-medium text-dash-text">
                    {choice.label}
                  </span>
                  {updatedAt && (
                    <span className="text-[10px] text-dash-text-muted">
                      Updated {updatedAt}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-right text-[11px] text-dash-text-muted">
                    {choice.leftLabel}
                  </span>
                  {/* Interactive slider track */}
                  <div className="relative flex-1">
                    <input
                      type="range"
                      min={0}
                      max={4}
                      step={1}
                      value={positionValues.indexOf(currentPosition as typeof positionValues[number])}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value, 10)
                        updatePosture(choice.id, positionValues[idx])
                      }}
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    />
                    <div className="relative h-2 rounded-full bg-dash-border">
                      {/* Centre line */}
                      <div className="absolute left-1/2 top-0 h-full w-px bg-dash-text-muted/40" />
                      {/* Marker */}
                      <div
                        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dash-red bg-dash-red/80 transition-all duration-150"
                        style={{ left: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-32 shrink-0 text-[11px] text-dash-text-muted">
                    {choice.rightLabel}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

```

## `src/app/support/page.tsx`

```tsx
'use client'

import { useState, useMemo } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { AlertCard } from '@/components/dashboard/alert-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { StatusDot } from '@/components/dashboard/status-dot'
import { TicketDetailPanel } from '@/components/panels/ticket-detail-panel'
import { ChartPeriodToggle } from '@/components/dashboard/chart-period-toggle'
import { TmrwLineChart } from '@/components/dashboard/tmrw-line-chart'
import { TmrwAreaChart } from '@/components/dashboard/tmrw-area-chart'
import {
  ResponsiveContainer,
  BarChart as RechartBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridProps, tooltipStyle, TMRW_COLORS } from '@/lib/utils/chart-styles'
import { useDashboardData } from '@/lib/context/data-context'
import type { Ticket, Status } from '@/lib/types'

function ticketStatusDot(status: Ticket['status']): Status {
  if (status === 'Open') return 'red'
  if (status === 'Pending') return 'amber'
  return 'green'
}

// ---------------------------------------------------------------------------
// 01. Support as Business Signal
// ---------------------------------------------------------------------------
const categoryTrendDataMonthly = [
  { month: 'Sep 2025', billing: 5, 'kit-issue': 3, 'results-query': 2, scheduling: 6, 'supplement-question': 3 },
  { month: 'Oct 2025', billing: 6, 'kit-issue': 4, 'results-query': 3, scheduling: 5, 'supplement-question': 4 },
  { month: 'Nov 2025', billing: 5, 'kit-issue': 5, 'results-query': 4, scheduling: 4, 'supplement-question': 3 },
  { month: 'Dec 2025', billing: 6, 'kit-issue': 6, 'results-query': 5, scheduling: 3, 'supplement-question': 4 },
  { month: 'Jan 2026', billing: 5, 'kit-issue': 7, 'results-query': 7, scheduling: 3, 'supplement-question': 3 },
  { month: 'Feb 2026', billing: 6, 'kit-issue': 8, 'results-query': 8, scheduling: 2, 'supplement-question': 4 },
]

const categoryTrendDataWeekly = [
  { month: 'W1 Feb', billing: 1, 'kit-issue': 2, 'results-query': 2, scheduling: 1, 'supplement-question': 1 },
  { month: 'W2 Feb', billing: 2, 'kit-issue': 3, 'results-query': 1, scheduling: 0, 'supplement-question': 1 },
  { month: 'W3 Feb', billing: 1, 'kit-issue': 1, 'results-query': 3, scheduling: 1, 'supplement-question': 1 },
  { month: 'W4 Feb', billing: 2, 'kit-issue': 2, 'results-query': 2, scheduling: 0, 'supplement-question': 1 },
]

const categoryTrendDataQuarterly = [
  { month: 'Q3 2025', billing: 16, 'kit-issue': 12, 'results-query': 9, scheduling: 15, 'supplement-question': 10 },
  { month: 'Q4 2025', billing: 17, 'kit-issue': 15, 'results-query': 12, scheduling: 12, 'supplement-question': 11 },
  { month: 'Q1 2026', billing: 11, 'kit-issue': 15, 'results-query': 15, scheduling: 5, 'supplement-question': 7 },
]

// ---------------------------------------------------------------------------
// 02. Support Cost Model
// ---------------------------------------------------------------------------
const ticketsPerMemberTrend = [
  { month: 'Sep 2025', 'tickets/member': 0.08 },
  { month: 'Oct 2025', 'tickets/member': 0.09 },
  { month: 'Nov 2025', 'tickets/member': 0.10 },
  { month: 'Dec 2025', 'tickets/member': 0.11 },
  { month: 'Jan 2026', 'tickets/member': 0.12 },
  { month: 'Feb 2026', 'tickets/member': 0.13 },
]

// ---------------------------------------------------------------------------
// 04. Operational Health
// ---------------------------------------------------------------------------
const slaTrendDataThisMonth = [
  { month: 'Sep 2025', 'First Reply SLA %': 92, 'Resolution SLA %': 85 },
  { month: 'Oct 2025', 'First Reply SLA %': 90, 'Resolution SLA %': 83 },
  { month: 'Nov 2025', 'First Reply SLA %': 88, 'Resolution SLA %': 80 },
  { month: 'Dec 2025', 'First Reply SLA %': 86, 'Resolution SLA %': 78 },
  { month: 'Jan 2026', 'First Reply SLA %': 84, 'Resolution SLA %': 75 },
  { month: 'Feb 2026', 'First Reply SLA %': 82, 'Resolution SLA %': 72 },
]

const slaTrendDataThisWeek = [
  { month: 'Mon', 'First Reply SLA %': 80, 'Resolution SLA %': 68 },
  { month: 'Tue', 'First Reply SLA %': 78, 'Resolution SLA %': 70 },
  { month: 'Wed', 'First Reply SLA %': 84, 'Resolution SLA %': 74 },
  { month: 'Thu', 'First Reply SLA %': 82, 'Resolution SLA %': 71 },
  { month: 'Fri', 'First Reply SLA %': 85, 'Resolution SLA %': 73 },
]

const slaTrendDataQuarter = [
  { month: 'Dec 2025', 'First Reply SLA %': 86, 'Resolution SLA %': 78 },
  { month: 'Jan 2026', 'First Reply SLA %': 84, 'Resolution SLA %': 75 },
  { month: 'Feb 2026', 'First Reply SLA %': 82, 'Resolution SLA %': 72 },
]

const slaTrendData6mo = [
  { month: 'Sep 2025', 'First Reply SLA %': 92, 'Resolution SLA %': 85 },
  { month: 'Oct 2025', 'First Reply SLA %': 90, 'Resolution SLA %': 83 },
  { month: 'Nov 2025', 'First Reply SLA %': 88, 'Resolution SLA %': 80 },
  { month: 'Dec 2025', 'First Reply SLA %': 86, 'Resolution SLA %': 78 },
  { month: 'Jan 2026', 'First Reply SLA %': 84, 'Resolution SLA %': 75 },
  { month: 'Feb 2026', 'First Reply SLA %': 82, 'Resolution SLA %': 72 },
]

const csatVolumeTrendMonthly = [
  { month: 'Sep 2025', 'CSAT %': 88, 'Ticket Volume': 20 },
  { month: 'Oct 2025', 'CSAT %': 86, 'Ticket Volume': 25 },
  { month: 'Nov 2025', 'CSAT %': 85, 'Ticket Volume': 30 },
  { month: 'Dec 2025', 'CSAT %': 84, 'Ticket Volume': 35 },
  { month: 'Jan 2026', 'CSAT %': 83, 'Ticket Volume': 40 },
  { month: 'Feb 2026', 'CSAT %': 82, 'Ticket Volume': 50 },
]

const csatVolumeTrendQuarterly = [
  { month: 'Q3 2025', 'CSAT %': 87, 'Ticket Volume': 65 },
  { month: 'Q4 2025', 'CSAT %': 85, 'Ticket Volume': 95 },
  { month: 'Q1 2026', 'CSAT %': 82, 'Ticket Volume': 130 },
]

const csatVolumeTrendRolling90d = [
  { month: 'Dec 2025', 'CSAT %': 85, 'Ticket Volume': 30 },
  { month: 'Jan 2026', 'CSAT %': 84, 'Ticket Volume': 40 },
  { month: 'Feb 2026', 'CSAT %': 82, 'Ticket Volume': 50 },
]

const agents = [
  { name: 'Nina Gibbias', tickets: 80, avgFirstReply: '2.2h', avgResolution: '16h', csat: '85%', fcr: '72%' },
  { name: 'Tom Watts', tickets: 60, avgFirstReply: '2.8h', avgResolution: '19h', csat: '80%', fcr: '65%' },
  { name: 'Sarah Chen', tickets: 40, avgFirstReply: '2.4h', avgResolution: '17h', csat: '84%', fcr: '70%' },
  { name: 'Alex Park', tickets: 20, avgFirstReply: '3.1h', avgResolution: '22h', csat: '78%', fcr: '58%' },
]

const backlogTrend = [
  { month: 'Sep 2025', 'Open Tickets': 12 },
  { month: 'Oct 2025', 'Open Tickets': 15 },
  { month: 'Nov 2025', 'Open Tickets': 18 },
  { month: 'Dec 2025', 'Open Tickets': 23 },
  { month: 'Jan 2026', 'Open Tickets': 30 },
  { month: 'Feb 2026', 'Open Tickets': 42 },
]

// ---------------------------------------------------------------------------
// Channel Trend (stacked area)
// ---------------------------------------------------------------------------
const channelTrend = [
  { month: 'Sep 2025', Email: 14, Web: 4, Chat: 1, Phone: 1 },
  { month: 'Oct 2025', Email: 17, Web: 5, Chat: 2, Phone: 1 },
  { month: 'Nov 2025', Email: 20, Web: 6, Chat: 3, Phone: 1 },
  { month: 'Dec 2025', Email: 22, Web: 7, Chat: 4, Phone: 2 },
  { month: 'Jan 2026', Email: 24, Web: 9, Chat: 5, Phone: 2 },
  { month: 'Feb 2026', Email: 30, Web: 12, Chat: 5, Phone: 3 },
]

// ---------------------------------------------------------------------------
// Tag Frequency Trend
// ---------------------------------------------------------------------------
const tagTrendData = [
  { month: 'Oct 2025', billing: 8, 'kit-issue': 6, 'results-query': 5, supplement: 4, scheduling: 3 },
  { month: 'Nov 2025', billing: 10, 'kit-issue': 8, 'results-query': 6, supplement: 5, scheduling: 4 },
  { month: 'Dec 2025', billing: 12, 'kit-issue': 10, 'results-query': 8, supplement: 6, scheduling: 5 },
  { month: 'Jan 2026', billing: 16, 'kit-issue': 12, 'results-query': 10, supplement: 8, scheduling: 7 },
  { month: 'Feb 2026', billing: 32, 'kit-issue': 28, 'results-query': 24, supplement: 20, scheduling: 18 },
]

// ---------------------------------------------------------------------------
// 05. Upstream Root Causes
// ---------------------------------------------------------------------------
const rootCauses = [
  { cause: 'Results query', tickets: 24, upstream: 'Dead zone communication gap', owner: 'Marketing' },
  { cause: 'Kit issue', tickets: 28, upstream: 'QC failure rate / instruction clarity', owner: 'Clinical' },
  { cause: 'Billing', tickets: 32, upstream: 'Pricing confusion at checkout', owner: 'Product' },
  { cause: 'Supplement question', tickets: 20, upstream: 'Protocol clarity in dashboard', owner: 'Clinical' },
  { cause: 'Scheduling', tickets: 18, upstream: 'Consultation booking friction', owner: 'Product' },
]

// ---------------------------------------------------------------------------
// Chart period options
// ---------------------------------------------------------------------------
const ticketVolumeOptions = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
]

const responseTimeOptions = [
  { label: 'This Week', value: 'this-week' },
  { label: 'This Month', value: 'this-month' },
  { label: 'Quarter', value: 'quarter' },
  { label: '6mo', value: '6mo' },
]

const csatOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Rolling 90d', value: 'rolling-90d' },
]

const tagsOptions = [
  { label: 'MTD', value: 'mtd' },
  { label: 'QTD', value: 'qtd' },
  { label: 'YTD', value: 'ytd' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SupportPage() {
  const { tickets, members } = useDashboardData()
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const recentTickets = tickets.slice(0, 10)

  // Chart period state
  const [ticketVolumePeriod, setTicketVolumePeriod] = useState('monthly')
  const [responseTimePeriod, setResponseTimePeriod] = useState('this-month')
  const [csatPeriod, setCsatPeriod] = useState('monthly')
  const [tagsPeriod, setTagsPeriod] = useState('mtd')

  // Derived chart data based on toggle state
  const categoryTrendData = ticketVolumePeriod === 'weekly'
    ? categoryTrendDataWeekly
    : ticketVolumePeriod === 'quarterly'
      ? categoryTrendDataQuarterly
      : categoryTrendDataMonthly

  const slaTrendData = responseTimePeriod === 'this-week'
    ? slaTrendDataThisWeek
    : responseTimePeriod === 'quarter'
      ? slaTrendDataQuarter
      : responseTimePeriod === '6mo'
        ? slaTrendData6mo
        : slaTrendDataThisMonth

  const csatVolumeTrend = csatPeriod === 'quarterly'
    ? csatVolumeTrendQuarterly
    : csatPeriod === 'rolling-90d'
      ? csatVolumeTrendRolling90d
      : csatVolumeTrendMonthly

  // Build member lookup map
  const memberMap = useMemo(() => {
    const map = new Map<string, (typeof members)[number]>()
    for (const m of members) {
      map.set(m.id, m)
    }
    return map
  }, [members])

  // 03: Tickets by Journey Stage data
  const journeyStageData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of tickets) {
      const member = t.memberId ? memberMap.get(t.memberId) : undefined
      const stage = member?.journeyStage ?? 'Unknown'
      counts[stage] = (counts[stage] || 0) + 1
    }
    // Scale counts based on selected period
    const scale = tagsPeriod === 'qtd' ? 2.8 : tagsPeriod === 'ytd' ? 8.5 : 1
    return Object.entries(counts)
      .map(([stage, count]) => ({ stage, Tickets: Math.round(count * scale) }))
      .sort((a, b) => b.Tickets - a.Tickets)
  }, [tickets, memberMap, tagsPeriod])

  // Helper: look up journey stage for a ticket
  function getJourneyStage(memberId?: string | null): string {
    if (!memberId) return 'Unlinked'
    const member = memberMap.get(memberId)
    return member?.journeyStage ?? 'Unlinked'
  }

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Support' }]} />
        <div className="flex items-center gap-2">
          <DataSourceBadge source="zendesk" />
          <DataSourceBadge source="manual" />
          <DataSourceBadge source="tableau" />
        </div>
      </div>

      {/* ================================================================= */}
      {/* 01 — Support as Business Signal                                   */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={1} title="Support as Business Signal" />

        {/* Support Headlines */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 mb-6">
          <MetricCard label="Cost per Ticket" value="$18.50" status="red" target="<$15" />
          <MetricCard label="CX Minutes per Patient" value="14 min" status="amber" target="10 min" />
          <MetricCard label="Churn w/ Open Ticket" value="42%" status="red" target="<20%" direction="lower-better" />
        </div>

        {/* Ticket category trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mb-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Ticket Category Trend (6 months)
            </h3>
            <ChartPeriodToggle
              options={ticketVolumeOptions}
              selected={ticketVolumePeriod}
              onChange={setTicketVolumePeriod}
            />
          </div>
          <TmrwLineChart
            data={categoryTrendData}
            index="month"
            series={[
              { dataKey: 'billing', color: TMRW_COLORS.blue },
              { dataKey: 'kit-issue', color: TMRW_COLORS.red },
              { dataKey: 'results-query', color: TMRW_COLORS.amber },
              { dataKey: 'scheduling', color: TMRW_COLORS.green },
              { dataKey: 'supplement-question', color: TMRW_COLORS.purple },
            ]}
            yAxisWidth={30}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Support-triggered churn */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Support-Triggered Churn
            </h3>
            <p className="text-sm leading-relaxed text-dash-text">
              Of <span className="font-mono font-semibold">54</span> churned members,{' '}
              <span className="font-mono font-semibold text-status-red">31 (57%)</span> had open support
              tickets. Most common:{' '}
              <span className="font-medium">results-query (14)</span>,{' '}
              <span className="font-medium">kit-issue (9)</span>,{' '}
              <span className="font-medium">billing (8)</span>.
            </p>
          </div>

          {/* First-contact resolution impact */}
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              First-Contact Resolution Impact
            </h3>
            <p className="text-sm leading-relaxed text-dash-text">
              FCR members retain at <span className="font-mono font-semibold text-status-green">88%</span> vs{' '}
              <span className="font-mono font-semibold text-status-red">71%</span> for multi-contact.
              Investing in agent training has{' '}
              <span className="font-mono font-semibold">17pp</span> retention ROI.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 02 — Support Cost Model                                           */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={2} title="Support Cost Model" />

        {/* Tickets per member trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mb-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Tickets per Member (Trend)
          </h3>
          <TmrwLineChart
            data={ticketsPerMemberTrend}
            index="month"
            series={[
              { dataKey: 'tickets/member', color: TMRW_COLORS.red },
            ]}
            yAxisWidth={40}
            showLegend={false}
            valueFormatter={(v) => v.toFixed(2)}
          />
          <AlertCard
            severity="medium"
            title="Tickets per member rising steadily (0.08 to 0.13). If trend continues, support costs will outpace revenue growth."
          />
        </div>

        {/* Support capacity model */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Support Capacity Model
          </h3>
          <p className="text-sm leading-relaxed text-dash-text mb-4">
            At current <span className="font-mono font-semibold">0.13</span> tickets/member:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border">
                  <th className="px-4 py-2 font-medium text-dash-text-secondary">Members</th>
                  <th className="px-4 py-2 font-medium text-dash-text-secondary">Tickets/Week</th>
                  <th className="px-4 py-2 font-medium text-dash-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                <tr>
                  <td className="px-4 py-2 font-mono text-dash-text">500</td>
                  <td className="px-4 py-2 font-mono text-dash-text">65</td>
                  <td className="px-4 py-2 text-status-green font-medium">Within capacity</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-dash-text">1,000</td>
                  <td className="px-4 py-2 font-mono text-dash-text">130</td>
                  <td className="px-4 py-2 text-status-red font-medium">Exceeds capacity</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-dash-text">2,000</td>
                  <td className="px-4 py-2 font-mono text-dash-text">260</td>
                  <td className="px-4 py-2 text-status-red font-medium">Exceeds capacity</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-dash-text-muted">
            Current team capacity: ~80 tickets/week. Exceeds at ~615 members.
          </p>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 03 — Tickets by Journey Stage (NEW)                               */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={3} title="Tickets by Journey Stage" />

        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mb-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Ticket Count by Member Journey Stage
            </h3>
            <ChartPeriodToggle
              options={tagsOptions}
              selected={tagsPeriod}
              onChange={setTagsPeriod}
            />
          </div>
          <ResponsiveContainer width="100%" height={224} className="h-44 md:h-56">
            <RechartBarChart data={journeyStageData}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="stage" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="Tickets" fill={TMRW_COLORS.red} radius={[4, 4, 0, 0]} />
            </RechartBarChart>
          </ResponsiveContainer>
          <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            42% of tickets come from members in &lsquo;Awaiting Results&rsquo; stage.
          </p>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 04 — Operational Health                                           */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={4} title="Operational Health" />

        {/* Operational KPI cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 mb-6">
          <MetricCard label="Open Tickets" value="50" status="red" sparkline={[35, 38, 40, 42, 45, 48, 49, 50]} />
          <MetricCard label="Avg First Reply" value="2.5h" status="amber" target="<2h" sparkline={[3.2, 3.0, 2.8, 2.6, 2.5, 2.5]} />
          <MetricCard label="Avg Resolution" value="18h" status="amber" target="<12h" sparkline={[24, 22, 20, 19, 18, 18]} />
          <MetricCard label="CSAT Score" value="82%" status="amber" target=">85%" sparkline={[78, 79, 80, 80, 81, 82]} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 mb-6">
          <MetricCard label="Tickets/Week" value="8.3" status="red" sparkline={[5.5, 6.0, 6.5, 7.0, 7.8, 8.3]} />
          <MetricCard label="SLA % First Reply <4h" value="85%" status="amber" target=">90%" sparkline={[92, 90, 88, 87, 86, 85]} />
          <MetricCard label="SLA % Resolved <24h" value="72%" status="red" target=">80%" sparkline={[80, 78, 76, 74, 73, 72]} />
        </div>

        {/* SLA compliance trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mb-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              SLA Compliance Trend
            </h3>
            <ChartPeriodToggle
              options={responseTimeOptions}
              selected={responseTimePeriod}
              onChange={setResponseTimePeriod}
            />
          </div>
          <TmrwLineChart
            data={slaTrendData}
            index="month"
            series={[
              { dataKey: 'First Reply SLA %', color: TMRW_COLORS.blue },
              { dataKey: 'Resolution SLA %', color: TMRW_COLORS.amber },
            ]}
            yAxisWidth={40}
            valueFormatter={(v) => `${v}%`}
          />
        </div>

        {/* CSAT trend with volume overlay */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mb-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              CSAT Trend with Ticket Volume
            </h3>
            <ChartPeriodToggle
              options={csatOptions}
              selected={csatPeriod}
              onChange={setCsatPeriod}
            />
          </div>
          <TmrwLineChart
            data={csatVolumeTrend}
            index="month"
            series={[
              { dataKey: 'CSAT %', color: TMRW_COLORS.green },
              { dataKey: 'Ticket Volume', color: TMRW_COLORS.grey },
            ]}
            yAxisWidth={40}
          />
        </div>

        {/* Agent performance table */}
        <div className="mb-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Agent Performance
          </h3>
          <div className="overflow-x-auto rounded-lg border border-dash-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface">
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Name</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Tickets</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">First Reply</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Resolution Time</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">CSAT</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">FCR Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {agents.map(a => (
                  <tr key={a.name} className="bg-dash-surface/50">
                    <td className="px-4 py-2 font-medium text-dash-text">{a.name}</td>
                    <td className="px-4 py-2 font-mono text-dash-text">{a.tickets}</td>
                    <td className="px-4 py-2 font-mono text-dash-text">{a.avgFirstReply}</td>
                    <td className="px-4 py-2 font-mono text-dash-text">{a.avgResolution}</td>
                    <td className="px-4 py-2 font-mono text-dash-text">{a.csat}</td>
                    <td className="px-4 py-2 font-mono text-dash-text">{a.fcr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Tickets (with detail panel) */}
        <div className="mb-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Recent Tickets
          </h3>
          <div className="overflow-x-auto rounded-lg border border-dash-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-dash-surface">
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">ID</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Status</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Priority</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Assignee</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Channel</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Journey Stage</th>
                  <th className="px-4 py-3 font-medium text-dash-text-secondary">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border">
                {recentTickets.map(t => (
                  <tr
                    key={t.id}
                    className="cursor-pointer bg-dash-surface/50 transition-colors hover:bg-dash-surface"
                    onClick={() => setSelectedTicket(t)}
                  >
                    <td className="px-4 py-2 font-mono text-dash-text">{t.id}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={ticketStatusDot(t.status)} size="sm" />
                        <span className="text-dash-text">{t.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-dash-text">{t.priority}</td>
                    <td className="px-4 py-2 text-dash-text">{t.assignee}</td>
                    <td className="px-4 py-2 text-dash-text">{t.channel}</td>
                    <td className="px-4 py-2 text-dash-text">{getJourneyStage(t.memberId)}</td>
                    <td className="px-4 py-2 font-mono text-dash-text-secondary">
                      {new Date(t.createdAt).toLocaleDateString('en-AU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Backlog trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Backlog Trend
          </h3>
          <TmrwLineChart
            data={backlogTrend}
            index="month"
            series={[
              { dataKey: 'Open Tickets', color: TMRW_COLORS.red },
            ]}
            yAxisWidth={30}
            showLegend={false}
          />
          <AlertCard
            severity="high"
            title="Open ticket backlog growing 3.5x over 6 months (12 to 42). Current trajectory is unsustainable."
          />
        </div>

        {/* Channel breakdown — stacked area trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mt-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Channel Volume Trend
          </h3>
          <TmrwAreaChart
            data={channelTrend}
            index="month"
            series={[
              { dataKey: 'Email', color: TMRW_COLORS.red },
              { dataKey: 'Web', color: TMRW_COLORS.blue },
              { dataKey: 'Chat', color: TMRW_COLORS.amber },
              { dataKey: 'Phone', color: TMRW_COLORS.green },
            ]}
            height={224}
            className="h-56 md:h-72"
            yAxisWidth={40}
          />
        </div>
      </section>

      {/* ================================================================= */}
      {/* 05 — Upstream Root Causes                                         */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={5} title="Upstream Root Causes" />

        {/* Root causes table */}
        <div className="overflow-x-auto rounded-lg border border-dash-border mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Root Cause</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Tickets (period)</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Upstream Cause</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {rootCauses.map(rc => (
                <tr key={rc.cause} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{rc.cause}</td>
                  <td className="px-4 py-2 font-mono text-dash-text">{rc.tickets}</td>
                  <td className="px-4 py-2 text-dash-text">{rc.upstream}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        rc.owner === 'Clinical'
                          ? 'bg-amber-100 text-amber-800'
                          : rc.owner === 'Product'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {rc.owner}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tag frequency trend */}
        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5 mb-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Tag Frequency Trend
          </h3>
          <TmrwLineChart
            data={tagTrendData}
            index="month"
            series={[
              { dataKey: 'billing', color: TMRW_COLORS.red },
              { dataKey: 'kit-issue', color: TMRW_COLORS.blue },
              { dataKey: 'results-query', color: TMRW_COLORS.green },
              { dataKey: 'supplement', color: TMRW_COLORS.amber },
              { dataKey: 'scheduling', color: TMRW_COLORS.purple },
            ]}
            yAxisWidth={40}
          />
          <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            All tag categories spiking in Feb — correlates with member growth acceleration.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <MetricCard label="Repeat Contact Rate" value="18%" status="red" target="<10%" />
        </div>

        <AlertCard
          severity="high"
          title="3 of 5 root causes trace to Clinical operations — kit-issue, results-query, and supplement-question all originate upstream."
          link={{ label: 'View Clinical', href: '/clinical' }}
        />
      </section>

      {/* Ticket Detail Panel */}
      <TicketDetailPanel
        ticket={selectedTicket}
        open={selectedTicket !== null}
        onOpenChange={(open) => { if (!open) setSelectedTicket(null) }}
      />
    </div>
  )
}

```

## `src/app/team/page.tsx`

```tsx
'use client'

import { Breadcrumb } from '@/components/layout/breadcrumb'
import { useDashboardData } from '@/lib/context/data-context'
import { mockTeam, mockHiringPipeline, departmentSummary } from '@/data/mock'

// ---------------------------------------------------------------------------
// A. Team Capacity vs Demand
// ---------------------------------------------------------------------------
const capacityRows: {
  role: string
  fte: number
  demand: number
  gap: number
  hireBy: string
}[] = [
  { role: 'Clinical IC', fte: 5.0, demand: 6.2, gap: -1.2, hireBy: 'Apr 2026' },
  { role: 'Clinical GP', fte: 0.9, demand: 1.1, gap: -0.2, hireBy: 'Jun 2026' },
  { role: 'Engineering', fte: 5.0, demand: 5.0, gap: 0, hireBy: '—' },
  { role: 'Brand/Marketing', fte: 1.6, demand: 2.0, gap: -0.4, hireBy: 'Jul 2026' },
  { role: 'Operations', fte: 2.0, demand: 2.0, gap: 0, hireBy: '—' },
]

function gapColor(gap: number): string {
  if (gap >= 0) return 'text-status-green'
  if (gap >= -0.5) return 'text-status-amber'
  return 'text-status-red'
}

function gapBg(gap: number): string {
  if (gap >= 0) return 'bg-status-green/10'
  if (gap >= -0.5) return 'bg-status-amber/10'
  return 'bg-status-red/10'
}

// ---------------------------------------------------------------------------
// B. Department Breakdown
// ---------------------------------------------------------------------------
const totalFTE = departmentSummary.reduce((s, d) => s + d.fte, 0)

// ---------------------------------------------------------------------------
// C. Clinician Load
// ---------------------------------------------------------------------------
const clinicianLoad = [
  { name: 'Katie', members: 53 },
  { name: 'Alia', members: 51 },
  { name: 'Paula', members: 51 },
  { name: 'Isabelle', members: 48 },
  { name: 'Jaclyn', members: 14 },
  { name: 'Marko', members: 9 },
  { name: 'Sanja', members: 8 },
  { name: 'Katrina', members: 1 },
]

const maxLoad = Math.max(...clinicianLoad.map((c) => c.members))

// ---------------------------------------------------------------------------
// D. Hiring Pipeline stage colors
// ---------------------------------------------------------------------------
const stageColors: Record<string, string> = {
  sourcing: 'bg-status-grey/20 text-status-grey',
  interviewing: 'bg-status-amber/20 text-status-amber',
  offer: 'bg-status-green/20 text-status-green',
  onboarding: 'bg-dash-red-light text-dash-red',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function TeamPage() {
  // Pull from context where applicable
  const { clinicians } = useDashboardData()

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Team' }]} />

      {/* ================================================================= */}
      {/* A. Team Capacity vs Demand                                        */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Team Capacity vs Demand
        </h2>
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Role</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">FTE</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Demand</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Gap</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Hire By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {capacityRows.map((row) => (
                <tr key={row.role} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{row.role}</td>
                  <td className="px-4 py-2 text-right font-mono text-dash-text">{row.fte.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right font-mono text-dash-text">{row.demand.toFixed(1)}</td>
                  <td className={`px-4 py-2 text-right font-mono font-semibold ${gapColor(row.gap)} ${gapBg(row.gap)}`}>
                    {row.gap > 0 ? '+' : ''}{row.gap.toFixed(1)}
                  </td>
                  <td className="px-4 py-2 text-dash-text-secondary">{row.hireBy}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-dash-border bg-dash-surface">
                <td className="px-4 py-2 font-semibold text-dash-text">Total</td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-dash-text">
                  {capacityRows.reduce((s, r) => s + r.fte, 0).toFixed(1)}
                </td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-dash-text">
                  {capacityRows.reduce((s, r) => s + r.demand, 0).toFixed(1)}
                </td>
                <td className={`px-4 py-2 text-right font-mono font-semibold ${gapColor(capacityRows.reduce((s, r) => s + r.gap, 0))}`}>
                  {capacityRows.reduce((s, r) => s + r.gap, 0).toFixed(1)}
                </td>
                <td className="px-4 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* B. Department Breakdown                                           */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Department Breakdown
        </h2>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
          {/* Stacked bar */}
          <div className="mb-4 flex h-8 w-full overflow-hidden rounded">
            {departmentSummary.map((d) => (
              <div
                key={d.department}
                className="flex items-center justify-center text-[10px] font-medium text-white"
                style={{
                  width: `${(d.fte / totalFTE) * 100}%`,
                  backgroundColor: d.color,
                }}
                title={`${d.department}: ${d.fte} FTE`}
              >
                {d.fte >= 2 ? d.fte : ''}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {departmentSummary.map((d) => (
              <div key={d.department} className="flex items-center gap-2 text-xs text-dash-text-secondary">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: d.color }}
                />
                {d.department}: <span className="font-mono font-medium text-dash-text">{d.fte} FTE</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* C. Hiring Pipeline                                                */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Hiring Pipeline
        </h2>
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Role</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Department</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Stage</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Target Start</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {mockHiringPipeline.map((hire) => (
                <tr key={hire.role} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{hire.role}</td>
                  <td className="px-4 py-2 capitalize text-dash-text">{hire.department}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${stageColors[hire.stage] ?? 'bg-status-grey/20 text-status-grey'}`}
                    >
                      {hire.stage}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-dash-text">{formatDate(hire.targetStart)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* D. Team Roster                                                    */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Team Roster
        </h2>
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Name</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Role</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Department</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">FTE</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Start Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {mockTeam.map((member) => (
                <tr key={member.id} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{member.name}</td>
                  <td className="px-4 py-2 text-dash-text">{member.role}</td>
                  <td className="px-4 py-2 capitalize text-dash-text">{member.department}</td>
                  <td className="px-4 py-2 font-mono text-dash-text">{member.fte}</td>
                  <td className="px-4 py-2 text-dash-text">{formatDate(member.startDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* E. Clinician Load                                                 */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Clinician Load
        </h2>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
          <div className="space-y-3">
            {clinicianLoad.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm text-dash-text">{c.name}</span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-dash-border/30">
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-chart-1"
                    style={{ width: `${(c.members / maxLoad) * 100}%` }}
                  />
                  {/* Benchmark line at 50 members/FTE */}
                  <div
                    className="absolute inset-y-0 w-px bg-status-red"
                    style={{ left: `${(50 / maxLoad) * 100}%` }}
                    title="Benchmark: 50 members/FTE"
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-sm text-dash-text">{c.members}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-dash-text-muted">
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-status-red" />
            Red line = benchmark at 50 members/FTE
          </p>
        </div>
      </section>
    </div>
  )
}

```

## `src/components/dashboard/alert-card.tsx`

```tsx
'use client'

import Link from 'next/link'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AlertSeverity } from '@/lib/types'

interface AlertCardProps {
  severity: AlertSeverity
  title: string
  link?: { label: string; href: string }
  positive?: boolean
}

export function AlertCard({ severity, title, link, positive = false }: AlertCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-dash-border-subtle bg-dash-surface/50 px-3.5 py-3 md:px-4">
      {positive ? (
        <CheckCircle size={14} className="mt-0.5 shrink-0 text-status-green" />
      ) : severity === 'high' ? (
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-red" />
      ) : (
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-amber" />
      )}
      <p className="flex-1 font-sans text-xs text-dash-text-secondary">
        {title}
      </p>
      {link && (
        <Link
          href={link.href}
          className="shrink-0 font-sans text-[11px] text-dash-red hover:underline"
        >
          &rarr; {link.label}
        </Link>
      )}
    </div>
  )
}

```

## `src/components/dashboard/annotation-bubble.tsx`

```tsx
'use client'

import { MessageCircle } from 'lucide-react'
import { useState } from 'react'

interface AnnotationBubbleProps {
  text: string
  author: string
  date: string
}

export function AnnotationBubble({ text, author, date }: AnnotationBubbleProps) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className="text-dash-text-muted hover:text-dash-red"
      >
        <MessageCircle size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-50 w-72 rounded-lg border border-dash-border bg-dash-surface p-3 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-xs text-dash-text-secondary">{text}</p>
            <p className="mt-2 font-sans text-[11px] text-dash-text-muted">
              &mdash; {author}, {date}
            </p>
          </div>
        </>
      )}
    </span>
  )
}

```

## `src/components/dashboard/chart-fix-wrapper.tsx`

```tsx
'use client'

import { useRef, useEffect, type ReactNode } from 'react'

interface ChartFixWrapperProps {
  children: ReactNode
  className?: string
  lineWidth?: number
  areaOpacity?: number
  dotSize?: number
}

/**
 * Wraps any Tremor chart and fixes SVG rendering after mount.
 * Tremor uses inline SVG attributes that CSS can't override.
 * This component mutates the DOM after render to force visibility.
 */
export function ChartFixWrapper({
  children,
  className,
  lineWidth = 3,
  areaOpacity = 0.2,
  dotSize = 4,
}: ChartFixWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const fix = () => {
      const el = ref.current
      if (!el) return

      // Fix line strokes — make them thick
      el.querySelectorAll('.recharts-line-curve, .recharts-area-curve').forEach((path) => {
        ;(path as SVGElement).setAttribute('stroke-width', String(lineWidth))
      })

      // Fix area fills — increase opacity
      el.querySelectorAll('.recharts-area-area').forEach((path) => {
        ;(path as SVGElement).setAttribute('fill-opacity', String(areaOpacity))
      })

      // Fix dots — make them visible
      el.querySelectorAll('.recharts-dot').forEach((dot) => {
        ;(dot as SVGElement).setAttribute('r', String(dotSize))
      })

      // Fix active dots
      el.querySelectorAll('.recharts-active-dot circle').forEach((dot) => {
        ;(dot as SVGElement).setAttribute('r', String(dotSize + 2))
      })

      // Fix bar charts that render black
      el.querySelectorAll('.recharts-bar-rectangle path, .recharts-bar-rectangle rect').forEach((bar) => {
        const fill = (bar as SVGElement).getAttribute('fill')
        if (fill === '#000' || fill === '#000000' || fill === 'black' || fill === 'rgb(0, 0, 0)') {
          ;(bar as SVGElement).setAttribute('fill', '#8B0000')
        }
      })
    }

    fix()

    const timer1 = setTimeout(fix, 100)
    const timer2 = setTimeout(fix, 500)
    const timer3 = setTimeout(fix, 1000)

    const observer = new MutationObserver(fix)
    observer.observe(ref.current, { childList: true, subtree: true, attributes: true })

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      observer.disconnect()
    }
  }, [lineWidth, areaOpacity, dotSize])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

```

## `src/components/dashboard/chart-period-toggle.tsx`

```tsx
'use client'

import { cn } from '@/lib/utils'

export type PeriodOption = {
  label: string
  value: string
}

interface ChartPeriodToggleProps {
  options: PeriodOption[]
  selected: string
  onChange: (value: string) => void
}

export function ChartPeriodToggle({ options, selected, onChange }: ChartPeriodToggleProps) {
  return (
    <div className="inline-flex flex-wrap items-center rounded-lg border border-dash-border bg-dash-surface-alt p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-1.5 font-sans text-[11px] font-semibold transition-all duration-150',
            'min-h-[32px] md:min-h-0 md:py-1',
            selected === opt.value
              ? 'bg-dash-red text-white shadow-sm'
              : 'text-dash-text-secondary hover:bg-white hover:text-dash-text hover:shadow-sm'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

```

## `src/components/dashboard/data-source-badge.tsx`

```tsx
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

```

## `src/components/dashboard/metric-card-hero.tsx`

```tsx
'use client'

import { cn } from '@/lib/utils'
import { StatusDot } from './status-dot'
import { TrendIndicator } from './trend-indicator'
import { Sparkline } from './sparkline'
import type { Status } from '@/lib/types'

interface MetricCardHeroProps {
  label: string
  value: string | number | null
  target?: string | null
  status: Status
  trend?: number | null
  sparkline?: number[]
  direction?: 'higher-better' | 'lower-better'
  building?: boolean
  className?: string
}

export function MetricCardHero({
  label,
  value,
  target,
  status,
  trend,
  sparkline,
  direction = 'higher-better',
  building = false,
  className,
}: MetricCardHeroProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dash-border bg-dash-surface p-5 border-l-[3px] border-l-dash-red',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          {trend !== undefined && trend !== null && (
            <TrendIndicator value={trend} direction={direction} />
          )}
        </div>
      </div>

      <div className="mt-2">
        {building ? (
          <p className="font-sans text-sm italic text-dash-text-muted">
            Building measurement
          </p>
        ) : (
          <p className="font-mono text-[32px] font-semibold tracking-[-0.02em] text-dash-text">
            {value ?? 'TBC'}
          </p>
        )}
      </div>

      {target && (
        <p className="mt-1 font-sans text-xs text-dash-text-muted">
          Target: {target}
        </p>
      )}

      {sparkline && sparkline.length > 1 && (
        <div className="mt-3">
          <Sparkline data={sparkline} />
        </div>
      )}
    </div>
  )
}

```

## `src/components/dashboard/metric-card-skeleton.tsx`

```tsx
'use client'

export function MetricCardSkeleton() {
  return (
    <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 animate-pulse rounded bg-dash-surface-hover" />
        <div className="h-2 w-2 animate-pulse rounded-full bg-dash-surface-hover" />
      </div>
      <div className="mt-3 h-7 w-32 animate-pulse rounded bg-dash-surface-hover" />
      <div className="mt-2 h-3 w-20 animate-pulse rounded bg-dash-surface-hover" />
      <div className="mt-4 h-8 w-full animate-pulse rounded bg-dash-surface-hover" />
    </div>
  )
}

```

## `src/components/dashboard/metric-card.tsx`

```tsx
'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StatusDot } from './status-dot'
import { TrendIndicator } from './trend-indicator'
import { Sparkline } from './sparkline'
import { useDashboardData } from '@/lib/context/data-context'
import type { Status } from '@/lib/types'

interface MetricCardProps {
  label: string
  value: string | number | null
  target?: string | null
  status: Status
  trend?: number | null
  sparkline?: number[]
  direction?: 'higher-better' | 'lower-better'
  format?: 'text' | 'currency' | 'percentage' | 'number'
  building?: boolean
  onClick?: () => void
  className?: string
}

export function MetricCard({
  label,
  value,
  target,
  status,
  trend,
  sparkline,
  direction = 'higher-better',
  building = false,
  onClick,
  className,
}: MetricCardProps) {
  const { dataMode } = useDashboardData()

  return (
    <div
      onClick={onClick}
      data-metric-card
      className={cn(
        'rounded-lg border border-dash-border bg-dash-surface p-3 md:p-5',
        'transition-all duration-150',
        onClick && 'cursor-pointer hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span data-metric-label className="font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary md:text-[11px]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          {trend !== undefined && trend !== null && (
            <TrendIndicator value={trend} direction={direction} />
          )}
        </div>
      </div>

      <div className="mt-1 md:mt-2">
        {building ? (
          <>
            <p className="font-sans text-sm italic text-dash-text-muted">
              Building measurement
            </p>
            {dataMode === 'actual' && (
              <Link href="/admin/registry" className="mt-1 inline-block text-[10px] text-dash-red hover:underline">
                Why is this TBD? &rarr;
              </Link>
            )}
          </>
        ) : (
          <p data-metric-value className="font-mono text-lg font-bold tracking-[-0.01em] text-dash-text md:text-2xl">
            {value ?? 'TBC'}
          </p>
        )}
      </div>

      {target && (
        <p className="mt-0.5 font-sans text-[10px] text-dash-text-muted md:mt-1 md:text-xs">
          Target: {target}
        </p>
      )}

      {sparkline && sparkline.length > 1 && (
        <div className="mt-1.5 md:mt-3">
          <Sparkline data={sparkline} height={24} className="md:hidden" />
          <Sparkline data={sparkline} className="hidden md:block" />
        </div>
      )}
    </div>
  )
}

```

## `src/components/dashboard/mobile-table.tsx`

```tsx
'use client'

interface MobileTableProps {
  children: React.ReactNode
  className?: string
}

export function MobileTable({ children, className }: MobileTableProps) {
  return (
    <div className={`overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 ${className || ''}`}>
      <div className="min-w-[600px]">
        {children}
      </div>
    </div>
  )
}

```

## `src/components/dashboard/question-tile.tsx`

```tsx
'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StatusDot } from './status-dot'
import type { Status } from '@/lib/types'

interface QuestionMetric {
  label: string
  value: string
  target: string
}

interface QuestionTileProps {
  number: number
  question: string
  status: Status
  primaryMetrics: QuestionMetric[]
  activeCount: number
  totalCount: number
  redCount: number
  amberCount: number
  functionalLinks: { label: string; href: string }[]
  className?: string
}

export function QuestionTile({
  number,
  question,
  status,
  primaryMetrics,
  activeCount,
  totalCount,
  redCount,
  amberCount,
  functionalLinks,
  className,
}: QuestionTileProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dash-border bg-dash-surface p-5 transition-all duration-150 hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <Link
          href={`/strategy#q${number}`}
          className="group"
        >
          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
            Q{number}
          </span>
          <h3 className="mt-0.5 font-sans text-sm font-medium text-dash-text group-hover:text-dash-red">
            {question}
          </h3>
        </Link>
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className={cn(
            'font-sans text-[11px] font-medium uppercase',
            status === 'green' && 'text-status-green',
            status === 'amber' && 'text-status-amber',
            status === 'red' && 'text-status-red',
            status === 'grey' && 'text-status-grey',
          )}>
            {status}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        {primaryMetrics.map((metric) => (
          <div key={metric.label}>
            <span className="font-sans text-[11px] text-dash-text-secondary">
              {metric.label}
            </span>
            <p className="font-mono text-lg font-medium text-dash-text">
              {metric.value}
            </p>
            <p className="font-sans text-[11px] text-dash-text-muted">
              Target: {metric.target}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-dash-border-subtle pt-3">
        <p className="font-sans text-[11px] text-dash-text-muted">
          {activeCount} of {totalCount} metrics active
          {redCount > 0 && <span className="text-status-red"> · {redCount} red</span>}
          {amberCount > 0 && <span className="text-status-amber"> · {amberCount} amber</span>}
        </p>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-[11px] text-dash-text-muted">&rarr;</span>
          {functionalLinks.map((link, i) => (
            <span key={link.href} className="text-[11px]">
              {i > 0 && <span className="text-dash-text-muted"> · </span>}
              <Link href={link.href} className="text-dash-red hover:underline">
                {link.label}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

```

## `src/components/dashboard/rock-card.tsx`

```tsx
'use client'

import { cn } from '@/lib/utils'
import { StatusDot } from './status-dot'
import { Sparkline } from './sparkline'
import type { Status } from '@/lib/types'

interface RockMetricDisplay {
  label: string
  value: string
  target: string
  status: Status
  sparkData?: number[]
}

interface RockCardProps {
  number: number
  title: string
  owner: string
  status: string
  metrics: RockMetricDisplay[]
}

const rockStatusColors: Record<string, string> = {
  'on-track': 'text-status-green',
  'off-track': 'text-status-red',
  'at-risk': 'text-status-amber',
  'complete': 'text-status-green',
  'building': 'text-status-grey',
}

export function RockCard({ number, title, owner, status, metrics }: RockCardProps) {
  return (
    <div className="rounded-lg border border-dash-border bg-dash-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
              Rock {number}
            </span>
            <span className={cn(
              'font-sans text-[11px] font-medium uppercase tracking-[0.05em]',
              rockStatusColors[status] || 'text-status-grey'
            )}>
              {status.replace('-', ' ')}
            </span>
          </div>
          <h4 className="mt-1 font-sans text-sm font-medium text-dash-text">{title}</h4>
        </div>
        <span className="font-sans text-[11px] text-dash-text-muted">Owner: {owner}</span>
      </div>

      <div className="mt-3 space-y-2">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-dash-text-secondary">{m.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-dash-text">{m.value}</span>
                <span className="text-dash-text-muted">/ {m.target}</span>
                <StatusDot status={m.status} size="sm" />
              </div>
            </div>
            {m.sparkData && m.sparkData.length >= 2 && (
              <div className="mt-1">
                <Sparkline data={m.sparkData} color={m.status === 'red' ? '#DC2626' : m.status === 'amber' ? '#D97706' : '#16A34A'} width={200} height={18} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

```

## `src/components/dashboard/section-heading.tsx`

```tsx
'use client'

export function SectionHeading({ number, title }: { number: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 md:mb-4 md:gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dash-red font-sans text-[11px] font-bold text-white shadow-sm md:h-7 md:w-7 md:text-[13px]">
        {String(number).padStart(2, '0')}
      </span>
      <h2 className="font-sans text-sm font-semibold tracking-tight text-dash-text md:text-base">
        {title}
      </h2>
    </div>
  )
}

```

## `src/components/dashboard/sparkline.tsx`

```tsx
'use client'

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  width?: number
  className?: string
}

export function Sparkline({
  data,
  color = '#8B0000',
  height = 32,
  width = 120,
  className,
}: SparklineProps) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 4

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return { x, y }
  })

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')
  const lastPoint = points[points.length - 1]

  const areaPath = [
    `M ${points[0].x},${height}`,
    `L ${points.map(p => `${p.x},${p.y}`).join(' L ')}`,
    `L ${lastPoint.x},${height}`,
    'Z',
  ].join(' ')

  return (
    <svg width={width} height={height} className={`overflow-visible ${className ?? ''}`}>
      <path d={areaPath} fill={color} opacity="0.12" />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="3.5"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  )
}

```

## `src/components/dashboard/status-dot.tsx`

```tsx
'use client'

import { cn } from '@/lib/utils'
import type { Status } from '@/lib/types'

const colors: Record<Status, string> = {
  green: 'bg-status-green',
  amber: 'bg-status-amber',
  red: 'bg-status-red',
  grey: 'bg-status-grey',
}

export function StatusDot({ status, size = 'md' }: { status: Status; size?: 'sm' | 'md' }) {
  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          'inline-block rounded-full',
          colors[status],
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
        )}
      />
      {status === 'red' && (
        <span
          className={cn(
            'absolute inset-0 inline-block animate-ping rounded-full bg-status-red opacity-40',
            size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
          )}
        />
      )}
    </span>
  )
}

```

## `src/components/dashboard/tmrw-area-chart.tsx`

```tsx
'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridProps, tooltipStyle, legendStyle, stackedArea } from '@/lib/utils/chart-styles'

export interface AreaSeries {
  dataKey: string
  name?: string
  color: string
}

interface TmrwAreaChartProps {
  data: Record<string, unknown>[]
  index: string
  series: AreaSeries[]
  height?: number
  className?: string
  yAxisWidth?: number
  valueFormatter?: (v: number) => string
  showLegend?: boolean
}

export function TmrwAreaChart({
  data,
  index,
  series,
  height = 288,
  className = '',
  yAxisWidth = 40,
  valueFormatter,
  showLegend = true,
}: TmrwAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <AreaChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={index} tick={axisTickStyle} axisLine={axisLineStyle} />
        <YAxis
          tick={axisTickStyle}
          axisLine={axisLineStyle}
          width={yAxisWidth}
          tickFormatter={valueFormatter}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={valueFormatter ? (v: unknown) => valueFormatter(Number(v)) : undefined}
        />
        {showLegend && <Legend wrapperStyle={legendStyle} />}
        {series.map((s) => (
          <Area
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name || s.dataKey}
            stackId="1"
            {...stackedArea(s.color)}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

```

## `src/components/dashboard/tmrw-line-chart.tsx`

```tsx
'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridProps, tooltipStyle, legendStyle, solidLine, dashedLine } from '@/lib/utils/chart-styles'

export interface ChartSeries {
  dataKey: string
  name?: string
  color: string
  dashed?: boolean
  dot?: boolean | object
}

interface TmrwLineChartProps {
  data: Record<string, unknown>[]
  index: string
  series: ChartSeries[]
  height?: number
  className?: string
  yAxisWidth?: number
  valueFormatter?: (v: number) => string
  showLegend?: boolean
  connectNulls?: boolean
}

export function TmrwLineChart({
  data,
  index,
  series,
  height = 288,
  className = '',
  yAxisWidth = 40,
  valueFormatter,
  showLegend = true,
  connectNulls = true,
}: TmrwLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <LineChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={index} tick={axisTickStyle} axisLine={axisLineStyle} />
        <YAxis
          tick={axisTickStyle}
          axisLine={axisLineStyle}
          width={yAxisWidth}
          tickFormatter={valueFormatter}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={valueFormatter ? (v: unknown) => valueFormatter(Number(v)) : undefined}
        />
        {showLegend && <Legend wrapperStyle={legendStyle} />}
        {series.map((s) => {
          const lineProps = s.dashed ? dashedLine(s.color) : solidLine(s.color)
          return (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              connectNulls={connectNulls}
              {...lineProps}
              {...(s.dot !== undefined ? { dot: s.dot } : {})}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}

```

## `src/components/dashboard/trend-indicator.tsx`

```tsx
'use client'

import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendIndicatorProps {
  value: number | null
  direction?: 'higher-better' | 'lower-better'
}

export function TrendIndicator({ value, direction = 'higher-better' }: TrendIndicatorProps) {
  if (value === null || value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-dash-text-muted">
        <ArrowRight size={12} />
        <span className="font-mono">0%</span>
      </span>
    )
  }

  const isUp = value > 0
  const isPositive = direction === 'higher-better' ? isUp : !isUp

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs',
        isPositive ? 'text-status-green' : 'text-status-red'
      )}
    >
      {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      <span className="font-mono">{Math.abs(value).toFixed(1)}%</span>
    </span>
  )
}

```

## `src/components/layout/app-shell.tsx`

```tsx
'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { TopBar } from './top-bar'
import { NorthStarBar } from './north-star-bar'
import { CommandBar } from './command-bar'
import { cn } from '@/lib/utils'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandBarOpen, setCommandBarOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-dash-bg">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile overlay menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          'transition-[margin-left] duration-0',
          'md:ml-48',
          sidebarCollapsed && 'md:ml-14',
          'ml-0'
        )}
      >
        <TopBar
          onCommandBarOpen={() => setCommandBarOpen(true)}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
        />
        {/* North Star bar — hidden on mobile */}
        <div className="hidden md:block">
          <NorthStarBar />
        </div>
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            id="dashboard-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="mx-auto max-w-[1440px] px-4 py-4 pb-20 md:px-6 md:py-6 md:pb-6"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileNav />

      <CommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
    </div>
  )
}

```

## `src/components/layout/breadcrumb.tsx`

```tsx
'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbProps {
  items: { label: string; href?: string }[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} className="text-dash-text-muted" />}
          {item.href ? (
            <Link href={item.href} className="text-dash-text-secondary hover:text-dash-red">
              {item.label}
            </Link>
          ) : (
            <span className="text-dash-text">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

```

## `src/components/layout/command-bar.tsx`

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { useEffect, useState } from 'react'
import { navigation } from '@/lib/config/navigation'
import { useDashboardData } from '@/lib/context/data-context'
import { metricDefinitions } from '@/lib/config/metrics'
import {
  Search,
  Upload,
  FileDown,
  User,
  BarChart3,
  Clock,
} from 'lucide-react'

interface CommandBarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const RECENT_KEY = 'tmrw-cmd-recent'
const MAX_RECENT = 10

function getRecent(): { label: string; href: string }[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch { return [] }
}

function addToRecent(item: { label: string; href: string }) {
  try {
    const stored = getRecent()
    const updated = [item, ...stored.filter(s => s.href !== item.href)].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  } catch {}
}

const categoryRoutes: Record<string, string> = {
  financial: '/financial',
  members: '/members',
  clinical: '/clinical',
  support: '/support',
  retention: '/retention',
  marketing: '/marketing',
  strategy: '/strategy',
  eos: '/eos',
}

export function CommandBar({ open, onOpenChange }: CommandBarProps) {
  const router = useRouter()
  const { members } = useDashboardData()
  const [recent, setRecent] = useState<{ label: string; href: string }[]>([])

  useEffect(() => {
    if (open) setRecent(getRecent())
  }, [open])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  function handleSelect(label: string, href: string) {
    addToRecent({ label, href })
    router.push(href)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <Command
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-dash-border bg-dash-surface shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
        onKeyDown={(e) => { if (e.key === 'Escape') onOpenChange(false) }}
        filter={(value, search) => {
          if (value.toLowerCase().includes(search.toLowerCase())) return 1
          return 0
        }}
      >
        <div className="flex items-center border-b border-dash-border px-4">
          <Search size={16} className="shrink-0 text-dash-text-muted" />
          <Command.Input
            placeholder="Search pages, metrics, members..."
            className="flex h-12 w-full bg-transparent px-3 text-sm text-dash-text outline-none placeholder:text-dash-text-muted"
            autoFocus
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-dash-text-muted">
            No results found.
          </Command.Empty>

          {recent.length > 0 && (
            <Command.Group heading="Recent" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
              {recent.slice(0, 5).map((item, i) => (
                <Command.Item
                  key={`recent-${i}`}
                  value={`recent ${item.label}`}
                  onSelect={() => handleSelect(item.label, item.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-dash-text-secondary data-[selected=true]:bg-dash-surface-hover data-[selected=true]:text-dash-text"
                >
                  <Clock size={14} className="text-dash-text-muted" />
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Navigate" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Command.Item
                  key={item.href}
                  value={`nav ${item.label}`}
                  onSelect={() => handleSelect(item.label, item.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-dash-text-secondary data-[selected=true]:bg-dash-surface-hover data-[selected=true]:text-dash-text"
                >
                  <Icon size={16} />
                  {item.label}
                </Command.Item>
              )
            })}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-dash-border" />

          <Command.Group heading="Members" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
            {members.slice(0, 50).map((m) => (
              <Command.Item
                key={m.id}
                value={`member ${m.displayName} ${m.id}`}
                onSelect={() => {
                  addToRecent({ label: m.displayName, href: `/members#${m.id}` })
                  onOpenChange(false)
                }}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-dash-text-secondary data-[selected=true]:bg-dash-surface-hover data-[selected=true]:text-dash-text"
              >
                <User size={14} className="text-dash-text-muted" />
                <span>{m.displayName}</span>
                <span className="ml-auto text-xs text-dash-text-muted">{m.id}</span>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-dash-border" />

          <Command.Group heading="Metrics" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
            {metricDefinitions.map((m) => {
              const route = categoryRoutes[m.category] || '/'
              return (
                <Command.Item
                  key={m.id}
                  value={`metric ${m.label} ${m.category}`}
                  onSelect={() => handleSelect(m.label, route)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-dash-text-secondary data-[selected=true]:bg-dash-surface-hover data-[selected=true]:text-dash-text"
                >
                  <BarChart3 size={14} className="text-dash-text-muted" />
                  <span>{m.label}</span>
                  <span className="ml-auto text-xs capitalize text-dash-text-muted">{m.category}</span>
                </Command.Item>
              )
            })}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-dash-border" />

          <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
            <Command.Item
              value="action Upload data"
              onSelect={() => handleSelect('Upload CSV data', '/admin/upload')}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-dash-text-secondary data-[selected=true]:bg-dash-surface-hover data-[selected=true]:text-dash-text"
            >
              <Upload size={16} />
              Upload CSV data
            </Command.Item>
            <Command.Item
              value="action Export PDF"
              onSelect={async () => {
                onOpenChange(false)
                const el = document.getElementById('dashboard-content')
                if (!el) return
                const html2canvas = (await import('html2canvas')).default
                const { jsPDF } = await import('jspdf')
                const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#0F0F0F' })
                const imgData = canvas.toDataURL('image/png')
                const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] })
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
                pdf.save('tmrw-dashboard.pdf')
              }}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-dash-text-secondary data-[selected=true]:bg-dash-surface-hover data-[selected=true]:text-dash-text"
            >
              <FileDown size={16} />
              Export current view as PDF
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  )
}

```

## `src/components/layout/filter-bar.tsx`

```tsx
'use client'

import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterPill {
  id: string
  label: string
  value: string
  active: boolean
}

interface FilterBarProps {
  filters: FilterPill[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export function FilterBar({ filters, onToggle, onRemove }: FilterBarProps) {
  const activeFilters = filters.filter((f) => f.active)

  return (
    <div className="flex items-center gap-2">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onToggle(filter.id)}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors',
            filter.active
              ? 'border-dash-red/30 bg-dash-red-light text-dash-red'
              : 'border-dash-border text-dash-text-secondary hover:border-dash-text-muted hover:text-dash-text'
          )}
        >
          <span>{filter.label}: {filter.value}</span>
          {filter.active && (
            <X
              size={12}
              className="text-dash-red/70 hover:text-dash-red"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(filter.id)
              }}
            />
          )}
        </button>
      ))}
      <button className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-dash-text-muted hover:text-dash-text-secondary">
        <Plus size={12} />
        Filter
      </button>
    </div>
  )
}

```

## `src/components/layout/mobile-nav.tsx`

```tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  DollarSign,
  Stethoscope,
  RefreshCw,
  MoreHorizontal,
} from 'lucide-react'

const tabs = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Financial', href: '/financial', icon: DollarSign },
  { label: 'Delivery', href: '/clinical', icon: Stethoscope },
  { label: 'Retention', href: '/retention', icon: RefreshCw },
  { label: 'More', href: '/members', icon: MoreHorizontal },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-dash-border bg-white md:hidden">
      <div className="flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href)
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2.5 min-w-[64px]',
                isActive
                  ? 'text-dash-red'
                  : 'text-dash-text-muted'
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

```

## `src/components/layout/north-star-bar.tsx`

```tsx
'use client'

import { Star } from 'lucide-react'

export function NorthStarBar() {
  return (
    <div className="border-b border-dash-border bg-dash-surface/50 px-6 py-3">
      <div className="mx-auto flex max-w-[1440px] gap-8">
        <NorthStarMetric
          label="BETTER TOMORROWS CREATED"
          value="TBC"
          subtitle="Active members x days active"
        />
        <div className="w-px bg-dash-border" />
        <NorthStarMetric
          label="COHORT RETENTION POST-2ND"
          value="TBC"
          subtitle="Target: 75%+"
        />
      </div>
    </div>
  )
}

function NorthStarMetric({
  label,
  value,
  subtitle,
}: {
  label: string
  value: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-dash-red-light">
        <Star size={14} className="text-dash-red" />
      </div>
      <div className="border-l-[3px] border-dash-red pl-3">
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-semibold tracking-[-0.02em] text-dash-text">
            {value}
          </span>
          <span className="font-sans text-xs text-dash-text-muted">{subtitle}</span>
        </div>
      </div>
    </div>
  )
}

```

## `src/components/layout/sidebar.tsx`

```tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { navigation } from '@/lib/config/navigation'
import { PanelLeftClose, PanelLeft } from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const sectionLabels: Record<string, string> = {
  home: 'HOME',
  operations: 'OPERATIONS',
  management: 'MANAGEMENT',
  admin: 'ADMIN',
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const grouped = navigation.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = []
    acc[item.section].push(item)
    return acc
  }, {} as Record<string, typeof navigation>)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-dash-border bg-dash-sidebar transition-[width] duration-0',
        collapsed ? 'w-14' : 'w-48'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-dash-border px-3">
        {!collapsed && (
          <span className="font-sans text-[15px] font-bold tracking-[-0.03em] text-dash-text">
            TMRW
          </span>
        )}
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 text-dash-text-secondary hover:bg-dash-surface-hover hover:text-dash-text"
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 p-2 pt-4">
        {(['home', 'operations', 'management', 'admin'] as const).map((section) => (
          <div key={section}>
            {!collapsed && (
              <span className="mb-1 block px-2.5 pt-3 font-sans text-[10px] font-medium uppercase tracking-[0.08em] text-dash-text-muted">
                {sectionLabels[section]}
              </span>
            )}
            {collapsed && section !== 'home' && (
              <div className="mx-3 my-2 border-t border-dash-border-subtle" />
            )}
            {grouped[section]?.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-all duration-150',
                    isActive
                      ? 'bg-dash-red/5 text-dash-red font-medium'
                      : 'text-dash-text-secondary hover:bg-dash-surface-hover hover:text-dash-text'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-dash-red"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon size={16} className="shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                  {!collapsed && <span>{item.label}</span>}
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-status-red px-1.5 font-mono text-[10px] font-medium text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

```

## `src/components/layout/top-bar.tsx`

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, Download, Search, Menu, FileText, FileDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDashboardData } from '@/lib/context/data-context'

interface TopBarProps {
  onCommandBarOpen: () => void
  onMobileMenuOpen?: () => void
}

function generateMarkdownReport() {
  const headings = document.querySelectorAll('h1, h2, h3, [data-section-heading]')
  const cards = document.querySelectorAll('[data-metric-card]')
  const lines: string[] = []

  lines.push('# TMRW Dashboard Report')
  lines.push(`**Generated:** ${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`)
  lines.push('')

  if (cards.length > 0) {
    lines.push('## Key Metrics')
    lines.push('')
    lines.push('| Metric | Value |')
    lines.push('|--------|-------|')
    cards.forEach((card) => {
      const label = card.querySelector('[data-metric-label]')?.textContent ?? ''
      const value = card.querySelector('[data-metric-value]')?.textContent ?? ''
      if (label && value) lines.push(`| ${label} | ${value} |`)
    })
    lines.push('')
  }

  headings.forEach((h) => {
    const text = h.textContent?.trim()
    if (text) {
      const level = h.tagName === 'H1' ? '##' : h.tagName === 'H2' ? '###' : '####'
      lines.push(`${level} ${text}`)
      lines.push('')
    }
  })

  return lines.join('\n')
}

async function generateFullMarkdownExport(): Promise<string> {
  const report = generateMarkdownReport()
  try {
    const res = await fetch('/api/full-code')
    if (!res.ok) {
      // Fallback to static file
      const fallback = await fetch('/full-code.md')
      if (!fallback.ok) return report
      const code = await fallback.text()
      return report + '\n\n---\n\n' + code
    }
    const code = await res.text()
    return report + '\n\n---\n\n' + code
  } catch {
    return report
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function TopBar({ onCommandBarOpen, onMobileMenuOpen }: TopBarProps) {
  const { dataMode, resetToDemo, switchToActual, hasActualData } = useDashboardData()
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-dash-border bg-dash-header px-4 md:h-14 md:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        {onMobileMenuOpen && (
          <button
            onClick={onMobileMenuOpen}
            className="rounded-md p-1.5 text-white/70 hover:text-white md:hidden"
          >
            <Menu size={20} />
          </button>
        )}
        {/* TMRW brand visible only on mobile (desktop has it in sidebar) */}
        <h1 className="font-sans text-[15px] font-semibold tracking-[-0.02em] text-white md:hidden">
          TMRW
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Search — icon only on mobile */}
        <button
          onClick={onCommandBarOpen}
          className="rounded-md p-2 text-white/70 hover:text-white md:flex md:items-center md:gap-2 md:border md:border-white/20 md:px-3 md:py-1.5"
        >
          <Search size={14} />
          <span className="hidden md:inline text-sm text-white/80">Search</span>
          <kbd className="ml-2 hidden lg:inline rounded border border-white/20 px-1.5 py-0.5 font-mono text-[10px] text-white/50">
            ⌘K
          </kbd>
        </button>

        {/* Demo / Actual toggle — hidden on smallest mobile */}
        <div className="hidden sm:flex items-center">
          <div className="h-5 w-px bg-white/15 mr-2" />
          <div className="flex items-center rounded-md border border-white/20 p-0.5">
            <button
              onClick={() => {
                if (dataMode === 'actual') resetToDemo()
              }}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-[11px] font-medium transition-colors',
                dataMode === 'demo'
                  ? 'bg-white/20 text-white'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              Demo
            </button>
            <button
              onClick={() => {
                if (hasActualData && dataMode === 'demo') switchToActual()
              }}
              className={cn(
                'rounded px-2 py-0.5 font-mono text-[11px] font-medium transition-colors',
                dataMode === 'actual'
                  ? 'bg-white/20 text-white'
                  : hasActualData
                    ? 'text-white/40 hover:text-white/60'
                    : 'text-white/20 cursor-not-allowed'
              )}
            >
              Actual
            </button>
          </div>
        </div>

        {/* Date — hidden on mobile */}
        <div className="hidden md:flex items-center gap-1.5 px-2 text-sm text-white/60">
          <div className="h-5 w-px bg-white/15" />
          <Calendar size={14} />
          <span className="font-mono text-xs">{dateStr}</span>
        </div>

        {/* Export dropdown — hidden on mobile */}
        <div className="hidden md:flex items-center" ref={exportRef}>
          <div className="h-5 w-px bg-white/15 mr-2" />
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white/60 hover:text-white"
              title="Export"
            >
              <Download size={14} />
              <span className="hidden lg:inline text-xs">Export</span>
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-md border border-dash-border bg-dash-surface shadow-lg">
                <button
                  onClick={() => {
                    window.print()
                    setExportOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-dash-text hover:bg-dash-surface-hover"
                >
                  <FileDown size={14} className="text-dash-text-secondary" />
                  Export as PDF
                </button>
                <button
                  onClick={async () => {
                    const md = await generateFullMarkdownExport()
                    const dateSlug = new Date().toISOString().slice(0, 10)
                    downloadFile(md, `tmrw-report-${dateSlug}.md`, 'text/markdown')
                    setExportOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-dash-text hover:bg-dash-surface-hover"
                >
                  <FileText size={14} className="text-dash-text-secondary" />
                  Export as Markdown
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

```

## `src/components/panels/clinician-detail-panel.tsx`

```tsx
'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { StatusDot } from '@/components/dashboard/status-dot'
import type { Clinician, Status } from '@/lib/types'

interface ClinicianDetailPanelProps {
  clinician: Clinician | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function caseloadStatus(membersPerFTE: number): Status {
  if (membersPerFTE > 60) return 'red'
  if (membersPerFTE > 50) return 'amber'
  return 'green'
}

export function ClinicianDetailPanel({ clinician, open, onOpenChange }: ClinicianDetailPanelProps) {
  if (!clinician) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{clinician.name}</SheetTitle>
          <SheetDescription>{clinician.role} · {clinician.fte} FTE</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-6">
          {/* Caseload overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-dash-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dash-text-secondary">Active Cases</span>
              <div className="mt-1 font-mono text-lg font-bold text-dash-text">{clinician.activeCases}</div>
            </div>
            <div className="rounded-md border border-dash-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dash-text-secondary">Members/FTE</span>
              <div className="mt-1 flex items-center gap-2">
                <StatusDot status={caseloadStatus(clinician.membersPerFTE)} />
                <span className="font-mono text-lg font-bold text-dash-text">{clinician.membersPerFTE}</span>
              </div>
            </div>
          </div>

          {/* Performance */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Performance</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Closed Cases" value={String(clinician.closedCases)} />
              <InfoRow label="Dashboards Published" value={String(clinician.dashboardsPublished)} />
              <InfoRow label="Avg Case Duration" value={clinician.avgCaseDuration ? `${clinician.avgCaseDuration} days` : '—'} />
            </div>
          </section>

          {/* Benchmarks */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Case Time Benchmarks</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Complex Case Time" value={`${clinician.complexCaseTime} min`} />
              <InfoRow label="Simple Case Time" value={`${clinician.simpleCaseTime} min`} />
            </div>
          </section>

          {/* Details */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Details</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Department" value={clinician.department} />
              <InfoRow label="FTE" value={String(clinician.fte)} />
              <InfoRow label="ID" value={clinician.id} />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-36 shrink-0 text-dash-text-secondary">{label}</span>
      <span className="font-mono text-dash-text">{value}</span>
    </div>
  )
}

```

## `src/components/panels/member-detail-panel.tsx`

```tsx
'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { StatusDot } from '@/components/dashboard/status-dot'
import { Badge } from '@/components/ui/badge'
import type { Member, Status } from '@/lib/types'

interface MemberDetailPanelProps {
  member: Member | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function journeyStatusColor(stage: Member['journeyStage']): Status {
  if (stage === 'churned' || stage === 'inactive') return 'red'
  if (stage === 'dashboard-unlocked' || stage === 'active-plan') return 'green'
  if (stage === 'awaiting-results' || stage === 'kit-returned') return 'amber'
  return 'grey'
}

export function MemberDetailPanel({ member, open, onOpenChange }: MemberDetailPanelProps) {
  if (!member) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle>{member.displayName}</SheetTitle>
            <button
              onClick={() => {
                member.isVIP = !member.isVIP
                try {
                  const stored = JSON.parse(localStorage.getItem('tmrw-vip-members') || '{}')
                  if (member.isVIP) stored[member.id] = true
                  else delete stored[member.id]
                  localStorage.setItem('tmrw-vip-members', JSON.stringify(stored))
                } catch {}
              }}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                member.isVIP
                  ? 'bg-dash-red-light text-dash-red'
                  : 'border border-dash-border text-dash-text-muted hover:bg-dash-surface-hover'
              }`}
              title={member.isVIP ? 'Remove VIP tag' : 'Tag as VIP'}
            >
              {member.isVIP ? '★ VIP' : '☆ VIP'}
            </button>
          </div>
          <SheetDescription>{member.id} · {member.type}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-6">
          {/* Status overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-dash-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dash-text-secondary">Journey Stage</span>
              <div className="mt-1 flex items-center gap-2">
                <StatusDot status={journeyStatusColor(member.journeyStage)} />
                <span className="font-mono text-sm text-dash-text">{member.journeyStage.replace(/-/g, ' ')}</span>
              </div>
            </div>
            <div className="rounded-md border border-dash-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dash-text-secondary">Case Status</span>
              <div className="mt-1 flex items-center gap-2">
                <StatusDot status={member.caseStatus === 'Open' ? 'green' : member.caseStatus === 'Closed' ? 'red' : 'grey'} />
                <span className="font-mono text-sm text-dash-text">{member.caseStatus}</span>
              </div>
            </div>
          </div>

          {/* Clinical */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Clinical</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Primary Clinician" value={member.primaryClinician || '—'} />
              <InfoRow label="Assigned Doctor" value={member.assignedDoctor || '—'} />
              <InfoRow label="Dashboard Unlocked" value={member.dashboardUnlocked ? 'Yes' : 'No'} />
              {member.dashboardUnlockedAt && (
                <InfoRow label="Unlocked At" value={new Date(member.dashboardUnlockedAt).toLocaleDateString('en-AU')} />
              )}
              <InfoRow label="Last Test Date" value={member.lastTestDate ? new Date(member.lastTestDate).toLocaleDateString('en-AU') : '—'} />
              <InfoRow label="Next Retest" value={member.nextRetestDate ? new Date(member.nextRetestDate).toLocaleDateString('en-AU') : '—'} />
            </div>
          </section>

          {/* Financial */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Financial</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Total Revenue" value={`$${member.totalRevenue.toLocaleString()}`} />
              <InfoRow label="Transactions" value={String(member.transactionCount)} />
              <InfoRow label="MRR" value={`$${member.mrr}`} />
              <InfoRow label="First Payment" value={member.firstPaymentDate ? new Date(member.firstPaymentDate).toLocaleDateString('en-AU') : '—'} />
            </div>
          </section>

          {/* Support */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Support</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Ticket Count" value={String(member.ticketCount)} />
              <InfoRow label="Open Tickets" value={String(member.openTickets)} />
              <InfoRow label="Avg Resolution" value={member.avgResolutionTime ? `${member.avgResolutionTime.toFixed(0)} min` : '—'} />
              <InfoRow label="CSAT" value={member.csat ? `${member.csat}%` : '—'} />
            </div>
          </section>

          {/* Risk Flags */}
          {member.riskFlags.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Risk Flags</h3>
              <div className="space-y-2">
                {member.riskFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-md bg-status-red-light px-3 py-2">
                    <StatusDot status="red" size="sm" />
                    <div>
                      <span className="text-xs font-medium text-status-red">{flag.type.replace(/-/g, ' ')}</span>
                      <p className="text-xs text-dash-text-secondary">{flag.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Meta */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Details</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Registered" value={new Date(member.createdAt).toLocaleDateString('en-AU')} />
              <InfoRow label="Days Since Registration" value={String(member.daysSinceRegistration)} />
              <InfoRow label="Sex" value={member.sex || '—'} />
              {member.addOns.length > 0 && (
                <div className="flex items-start gap-4">
                  <span className="w-36 shrink-0 text-dash-text-secondary">Add-ons</span>
                  <div className="flex flex-wrap gap-1">
                    {member.addOns.map((a) => (
                      <Badge key={a} variant="secondary">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-36 shrink-0 text-dash-text-secondary">{label}</span>
      <span className="font-mono text-dash-text">{value}</span>
    </div>
  )
}

```

## `src/components/panels/ticket-detail-panel.tsx`

```tsx
'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { StatusDot } from '@/components/dashboard/status-dot'
import { Badge } from '@/components/ui/badge'
import type { Ticket, Status } from '@/lib/types'

interface TicketDetailPanelProps {
  ticket: Ticket | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ticketStatusColor(status: Ticket['status']): Status {
  if (status === 'Open') return 'red'
  if (status === 'Pending') return 'amber'
  if (status === 'Solved' || status === 'Closed') return 'green'
  return 'grey'
}

function priorityColor(priority: Ticket['priority']): Status {
  if (priority === 'Urgent') return 'red'
  if (priority === 'High') return 'amber'
  return 'grey'
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours < 24) return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

export function TicketDetailPanel({ ticket, open, onOpenChange }: TicketDetailPanelProps) {
  if (!ticket) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Ticket #{ticket.id}</SheetTitle>
          <SheetDescription>{ticket.ticketType ?? 'Unknown type'} · {ticket.channel}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-6">
          {/* Status overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-dash-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dash-text-secondary">Status</span>
              <div className="mt-1 flex items-center gap-2">
                <StatusDot status={ticketStatusColor(ticket.status)} />
                <span className="font-mono text-sm text-dash-text">{ticket.status}</span>
              </div>
            </div>
            <div className="rounded-md border border-dash-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dash-text-secondary">Priority</span>
              <div className="mt-1 flex items-center gap-2">
                <StatusDot status={priorityColor(ticket.priority)} />
                <span className="font-mono text-sm text-dash-text">{ticket.priority}</span>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Assignment</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Assignee" value={ticket.assignee || '—'} />
              <InfoRow label="Group" value={ticket.group || '—'} />
              <InfoRow label="Member ID" value={ticket.memberId || '—'} />
            </div>
          </section>

          {/* Timing */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Timing</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Created" value={new Date(ticket.createdAt).toLocaleDateString('en-AU')} />
              <InfoRow label="Updated" value={new Date(ticket.updatedAt).toLocaleDateString('en-AU')} />
              <InfoRow label="Solved" value={ticket.solvedAt ? new Date(ticket.solvedAt).toLocaleDateString('en-AU') : '—'} />
              <InfoRow label="First Reply" value={formatMinutes(ticket.firstReplyMinutes)} />
              <InfoRow label="First Resolution" value={formatMinutes(ticket.firstResolutionMinutes)} />
              <InfoRow label="Full Resolution" value={formatMinutes(ticket.fullResolutionMinutes)} />
              <InfoRow label="Requester Wait" value={formatMinutes(ticket.requesterWaitMinutes)} />
            </div>
          </section>

          {/* Quality */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Quality</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Satisfaction" value={ticket.satisfaction ?? '—'} />
              <InfoRow label="Reopens" value={String(ticket.reopens)} />
              <InfoRow label="Replies" value={String(ticket.replies)} />
              <InfoRow label="Assignee Stations" value={String(ticket.assigneeStations)} />
              <InfoRow label="Group Stations" value={String(ticket.groupStations)} />
            </div>
          </section>

          {/* Tags */}
          {ticket.tags.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {ticket.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-36 shrink-0 text-dash-text-secondary">{label}</span>
      <span className="font-mono text-dash-text">{value}</span>
    </div>
  )
}

```

## `src/components/ui/badge.tsx`

```tsx
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-dash-red-light text-dash-red",
        secondary: "bg-dash-surface-hover text-dash-text-secondary border border-dash-border",
        success: "bg-status-green-light text-status-green",
        warning: "bg-status-amber-light text-status-amber",
        danger: "bg-status-red-light text-status-red",
        muted: "bg-status-grey-light text-status-grey",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }

```

## `src/components/ui/button.tsx`

```tsx
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-red focus-visible:ring-offset-2 focus-visible:ring-offset-dash-bg disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-dash-red text-dash-text-inverse hover:bg-dash-red/90",
        secondary: "bg-dash-surface text-dash-text hover:bg-dash-surface-hover border border-dash-border",
        ghost: "text-dash-text hover:bg-dash-surface-hover",
        outline: "border border-dash-border bg-transparent text-dash-text hover:bg-dash-surface-hover",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

```

## `src/components/ui/card.tsx`

```tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-dash-border bg-dash-surface text-dash-text",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight text-dash-text", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-dash-text-secondary", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

export { Card, CardHeader, CardTitle, CardDescription, CardContent }

```

## `src/components/ui/command.tsx`

```tsx
"use client"

import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-dash-surface text-dash-text",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandDialog = ({ children, ...props }: DialogProps) => (
  <Dialog {...props}>
    <DialogContent className="overflow-hidden p-0">
      <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-dash-text-secondary [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3">
        {children}
      </Command>
    </DialogContent>
  </Dialog>
)

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b border-dash-border px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 text-dash-text-secondary" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm text-dash-text outline-none placeholder:text-dash-text-muted disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))
CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))
CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm text-dash-text-secondary"
    {...props}
  />
))
CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-dash-text [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-dash-text-secondary",
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-dash-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-dash-text outline-none data-[selected=true]:bg-dash-red-light data-[selected=true]:text-dash-red data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      className
    )}
    {...props}
  />
))
CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn("ml-auto text-xs tracking-widest text-dash-text-muted", className)}
    {...props}
  />
)
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}

```

## `src/components/ui/dialog.tsx`

```tsx
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-dash-border bg-dash-surface p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 text-dash-text-secondary transition-opacity hover:opacity-100 hover:text-dash-text focus:outline-none disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-dash-text", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-dash-text-secondary", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

```

## `src/components/ui/dropdown-menu.tsx`

```tsx
"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-dash-text outline-none focus:bg-dash-surface-hover data-[state=open]:bg-dash-surface-hover",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border border-dash-border bg-dash-surface p-1 text-dash-text shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border border-dash-border bg-dash-surface p-1 text-dash-text shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-dash-text outline-none transition-colors focus:bg-dash-surface-hover focus:text-dash-text data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-dash-text outline-none transition-colors focus:bg-dash-surface-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-dash-red" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-dash-text outline-none transition-colors focus:bg-dash-surface-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-dash-red text-dash-red" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold text-dash-text-secondary",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-dash-border", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn("ml-auto text-xs tracking-widest text-dash-text-muted", className)}
    {...props}
  />
)
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}

```

## `src/components/ui/input.tsx`

```tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-dash-border bg-dash-bg px-3 py-1 text-sm text-dash-text placeholder:text-dash-text-muted transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-red focus-visible:ring-offset-2 focus-visible:ring-offset-dash-bg disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }

```

## `src/components/ui/popover.tsx`

```tsx
"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border border-dash-border bg-dash-surface p-4 text-dash-text shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }

```

## `src/components/ui/select.tsx`

```tsx
"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-red focus:ring-offset-2 focus:ring-offset-dash-bg disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4 text-dash-text-secondary" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4 text-dash-text-secondary" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-dash-border bg-dash-surface text-dash-text shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold text-dash-text-secondary", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-dash-text outline-none focus:bg-dash-surface-hover focus:text-dash-text data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-dash-red" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-dash-border", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}

```

## `src/components/ui/separator.tsx`

```tsx
"use client"

import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-dash-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }

```

## `src/components/ui/sheet.tsx`

```tsx
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Sheet = DialogPrimitive.Root

const SheetTrigger = DialogPrimitive.Trigger

const SheetClose = DialogPrimitive.Close

const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-dash-surface shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b border-dash-border data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t border-dash-border data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full border-r border-dash-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right: "inset-y-0 right-0 h-full border-l border-dash-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      },
      size: {
        default: "w-full sm:w-[400px]",
        sm: "w-full sm:w-[320px]",
        lg: "w-full sm:w-[640px]",
      },
    },
    defaultVariants: {
      side: "right",
      size: "default",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = "right", size, className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side, size }), className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 text-dash-text-secondary transition-opacity hover:opacity-100 hover:text-dash-text focus:outline-none disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = DialogPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-2 p-6 text-left", className)}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-0", className)}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-dash-text", className)}
    {...props}
  />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-dash-text-secondary", className)}
    {...props}
  />
))
SheetDescription.displayName = DialogPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}

```

## `src/components/ui/skeleton.tsx`

```tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("animate-pulse rounded-md bg-dash-surface-hover", className)}
    {...props}
  />
))
Skeleton.displayName = "Skeleton"

export { Skeleton }

```

## `src/components/ui/table.tsx`

```tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-dash-border", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-dash-border-subtle transition-colors hover:bg-dash-surface-hover data-[state=selected]:bg-dash-surface-hover",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-4 text-left align-middle font-medium text-dash-text-secondary [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3 align-middle text-dash-text [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }

```

## `src/components/ui/tabs.tsx`

```tsx
"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1 border-b border-dash-border",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-sm font-medium text-dash-text-secondary transition-all hover:text-dash-text focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-dash-red data-[state=active]:border-b-2 data-[state=active]:border-dash-red data-[state=active]:-mb-px",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 focus-visible:outline-none",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

```

## `src/components/ui/tooltip.tsx`

```tsx
"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-dash-border bg-dash-surface px-3 py-1.5 text-xs text-dash-text shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

```

## `src/data/mock/alerts.ts`

```ts
import type { Alert } from '@/lib/types/alerts';

export const mockAlerts: Alert[] = [
  {
    id: 'ALERT-001',
    type: 'payment-spike',
    severity: 'high',
    title: 'Payment failure rate spike',
    detail:
      'Declined transactions increased to 4.2% over the past 48 hours, above the 3% threshold. 6 members affected, primarily Visa cards in AU.',
    metricId: 'payment-failure-rate',
    functionalArea: 'financial',
    createdAt: '2026-03-05T09:15:00.000Z',
    acknowledged: false,
  },
  {
    id: 'ALERT-002',
    type: 'stalled-member',
    severity: 'medium',
    title: '12 members stalled at kit-dispatched',
    detail:
      'Twelve members have been in the kit-dispatched stage for more than 14 days without progressing. Consider sending a follow-up or checking courier tracking.',
    metricId: null,
    functionalArea: 'members',
    createdAt: '2026-03-04T14:30:00.000Z',
    acknowledged: false,
  },
  {
    id: 'ALERT-003',
    type: 'support-backlog',
    severity: 'medium',
    title: 'Support ticket backlog growing',
    detail:
      'Open ticket count reached 30, up 25% from last week. Average first reply time has increased to 3.1 hours. Consider reallocating support capacity.',
    metricId: 'open-tickets',
    functionalArea: 'support',
    createdAt: '2026-03-04T11:00:00.000Z',
    acknowledged: true,
  },
  {
    id: 'ALERT-004',
    type: 'clinician-overload',
    severity: 'low',
    title: 'Katie Kell approaching case capacity',
    detail:
      'Katie Kell currently has 38 active cases (capacity guideline: 40). Consider redistributing new cases to clinicians with lower loads.',
    metricId: null,
    functionalArea: 'clinical',
    createdAt: '2026-03-03T16:45:00.000Z',
    acknowledged: true,
  },
  {
    id: 'ALERT-005',
    type: 'zero-movement',
    severity: 'low',
    title: 'Channel partnerships metric unchanged',
    detail:
      'Channel partners count has remained at 0 for 8 weeks. This is a key growth metric for Q2 planning. Flag for leadership review.',
    metricId: 'channel-partners',
    functionalArea: 'strategy',
    createdAt: '2026-03-02T08:20:00.000Z',
    acknowledged: false,
  },
];

```

## `src/data/mock/clinicians.ts`

```ts
import type { Clinician } from '@/lib/types/clinician';

export const mockClinicians: Clinician[] = [
  {
    id: 'CLIN-001',
    name: 'Katie Kell',
    role: 'Integrative Clinician',
    fte: 1.0,
    department: 'clinical',
    activeCases: 38,
    closedCases: 15,
    membersPerFTE: 38,
    avgCaseDuration: 42,
    dashboardsPublished: 32,
    complexCaseTime: 55,
    simpleCaseTime: 25,
  },
  {
    id: 'CLIN-002',
    name: 'Alia Chen',
    role: 'Integrative Clinician',
    fte: 1.0,
    department: 'clinical',
    activeCases: 36,
    closedCases: 15,
    membersPerFTE: 36,
    avgCaseDuration: 39,
    dashboardsPublished: 30,
    complexCaseTime: 50,
    simpleCaseTime: 22,
  },
  {
    id: 'CLIN-003',
    name: 'Paula Martinez',
    role: 'Integrative Clinician',
    fte: 1.0,
    department: 'clinical',
    activeCases: 35,
    closedCases: 16,
    membersPerFTE: 35,
    avgCaseDuration: 41,
    dashboardsPublished: 31,
    complexCaseTime: 52,
    simpleCaseTime: 24,
  },
  {
    id: 'CLIN-004',
    name: 'Isabelle Baissac',
    role: 'Head of Clinical Services',
    fte: 1.0,
    department: 'clinical',
    activeCases: 32,
    closedCases: 16,
    membersPerFTE: 32,
    avgCaseDuration: 44,
    dashboardsPublished: 28,
    complexCaseTime: 60,
    simpleCaseTime: 28,
  },
  {
    id: 'CLIN-005',
    name: 'Jaclyn Torres',
    role: 'Integrative Clinician',
    fte: 0.6,
    department: 'clinical',
    activeCases: 10,
    closedCases: 4,
    membersPerFTE: 17,
    avgCaseDuration: 35,
    dashboardsPublished: 8,
    complexCaseTime: 48,
    simpleCaseTime: 20,
  },
  {
    id: 'CLIN-006',
    name: 'Marko Petrov',
    role: 'Integrative Clinician',
    fte: 0.4,
    department: 'clinical',
    activeCases: 6,
    closedCases: 3,
    membersPerFTE: 15,
    avgCaseDuration: 32,
    dashboardsPublished: 5,
    complexCaseTime: 45,
    simpleCaseTime: 20,
  },
  {
    id: 'CLIN-007',
    name: 'Sanja Kumar',
    role: 'Integrative Clinician',
    fte: 0.4,
    department: 'clinical',
    activeCases: 5,
    closedCases: 3,
    membersPerFTE: 13,
    avgCaseDuration: 30,
    dashboardsPublished: 4,
    complexCaseTime: 42,
    simpleCaseTime: 18,
  },
  {
    id: 'CLIN-008',
    name: 'Katrina Walsh',
    role: 'Customer & Ops Lead',
    fte: 0.2,
    department: 'clinical',
    activeCases: 1,
    closedCases: 0,
    membersPerFTE: 5,
    avgCaseDuration: null,
    dashboardsPublished: 0,
    complexCaseTime: 40,
    simpleCaseTime: 20,
  },
];

```

## `src/data/mock/index.ts`

```ts
export { mockMembers } from './members'
export { mockTransactions } from './transactions'
export { mockTickets } from './tickets'
export { mockClinicians } from './clinicians'
export { mockAlerts } from './alerts'
export { mockRocks } from './rocks'
export { mockManualMetrics } from './manual-metrics'
export { mockScorecard } from './scorecard'
export type { ScorecardMetric, ScorecardWeek } from './scorecard'
export { mockQuestions, mockStrategicBets, mockPostureChoices, mockDestinationTable } from './strategy'
export { mockTeam, mockHiringPipeline, departmentSummary } from './team'
export type { TeamMember } from './team'

```

## `src/data/mock/manual-metrics.ts`

```ts
export const mockManualMetrics = {
  unitEconomics: {
    blendedCAC: 95,
    contributionMarginPerMember: 72,
    ltvCacRatio: 3.2,
    cacPaybackMonths: 8,
  },
  clinicalGates: {
    gate2aPassRate: 0.92,
    gate2bPassRate: 0.88,
    gate3PassRate: 0.95,
  },
  outcomes: {
    biomarkerImprovement: 'TBC' as string | number,
    bioAgeDelta: 'TBC' as string | number,
  },
  partnerships: {
    channelPartners: 0,
    corporatePartners: 0,
  },
};

export type ManualMetrics = typeof mockManualMetrics;

```

## `src/data/mock/members.ts`

```ts
import type { Member, JourneyStage, HealthScore } from '@/lib/types/member';

// Deterministic pseudo-random number generator (mulberry32)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seededRandom(42);

function pick<T>(items: T[], weights: number[]): T {
  const r = rand();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return items[i];
  }
  return items[items.length - 1];
}

function padId(n: number): string {
  return String(n).padStart(3, '0');
}

// Clinician assignment pool
const clinicians = [
  { name: 'Katie Kell', count: 53 },
  { name: 'Alia Chen', count: 51 },
  { name: 'Paula Martinez', count: 51 },
  { name: 'Isabelle Baissac', count: 48 },
  { name: 'Jaclyn Torres', count: 14 },
  { name: 'Marko Petrov', count: 9 },
  { name: 'Sanja Kumar', count: 8 },
  { name: 'Katrina Walsh', count: 1 },
];

// Build clinician assignment list (235 total assigned, rest null)
const clinicianAssignments: (string | null)[] = [];
for (const c of clinicians) {
  for (let i = 0; i < c.count; i++) {
    clinicianAssignments.push(c.name);
  }
}
// Pad to 300 with nulls (65 unassigned)
while (clinicianAssignments.length < 300) {
  clinicianAssignments.push(null);
}

// Shuffle deterministically
for (let i = clinicianAssignments.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [clinicianAssignments[i], clinicianAssignments[j]] = [clinicianAssignments[j], clinicianAssignments[i]];
}

// Registration dates: Sep 2025 to Feb 2026, with acceleration
// Monthly distribution: Sep: 25, Oct: 30, Nov: 40, Dec: 45, Jan: 70, Feb: 90
const monthlyDist = [
  { year: 2025, month: 8, count: 25 },  // Sep (0-indexed month)
  { year: 2025, month: 9, count: 30 },  // Oct
  { year: 2025, month: 10, count: 40 }, // Nov
  { year: 2025, month: 11, count: 45 }, // Dec
  { year: 2026, month: 0, count: 70 },  // Jan
  { year: 2026, month: 1, count: 90 },  // Feb
];

const registrationDates: string[] = [];
for (const m of monthlyDist) {
  const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
  for (let i = 0; i < m.count; i++) {
    const day = 1 + Math.floor((i / m.count) * daysInMonth);
    const hour = 8 + (i % 12);
    const minute = (i * 7) % 60;
    const d = new Date(m.year, m.month, day, hour, minute, 0);
    registrationDates.push(d.toISOString());
  }
}

// Type distribution: ~70 Customer, ~120 Friend-Family, ~60 Investor, ~40 Employee, ~10 Test
const typePool: Member['type'][] = [];
for (let i = 0; i < 70; i++) typePool.push('Customer');
for (let i = 0; i < 120; i++) typePool.push('Friend-Family');
for (let i = 0; i < 60; i++) typePool.push('Investor');
for (let i = 0; i < 40; i++) typePool.push('Employee');
for (let i = 0; i < 10; i++) typePool.push('Test');

// Shuffle types deterministically
for (let i = typePool.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [typePool[i], typePool[j]] = [typePool[j], typePool[i]];
}

// Journey stages for funnel distribution
const journeyStages: JourneyStage[] = [
  'registered',
  'health-story-complete',
  'kit-dispatched',
  'kit-returned',
  'awaiting-results',
  'dashboard-unlocked',
  'insights-call-complete',
  'active-plan',
  'retest-due',
  'churned',
  'inactive',
];
const journeyWeights = [0.12, 0.10, 0.08, 0.07, 0.08, 0.15, 0.12, 0.13, 0.05, 0.06, 0.04];

// Add-on options
const addOnOptions = ['Supplement Pack', 'DNA Test', 'Gut Microbiome', 'Food Sensitivity', 'Hormone Panel'];

// Email sequences
const emailSequences = ['welcome', 'onboarding', 'kit-reminder', 'results-ready', 'retest-reminder', 'winback'];

const tags = ['billing', 'kit-issue', 'results-query', 'supplement-question', 'scheduling', 'account-change', 'clinical-question', 'feedback'];

function generateMember(index: number): Member {
  const num = index + 1;
  const id = `MBR-${padId(num)}`;
  const displayName = `Member #${padId(num)}`;
  const memberType = typePool[index];
  const createdAt = registrationDates[index];
  const createdDate = new Date(createdAt);

  // Reference date for calculating days since registration
  const refDate = new Date('2026-03-01T00:00:00.000Z');
  const daysSinceRegistration = Math.floor((refDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  // Sex distribution: ~50% Female, ~48% Male, ~2% n/a
  const sex = pick<Member['sex']>(['Female', 'Male', 'n/a'], [0.50, 0.48, 0.02]);

  // Age ranges
  const ageRange = pick(
    ['25-34', '35-44', '45-54', '55-64', '65+'],
    [0.15, 0.30, 0.30, 0.18, 0.07]
  );

  // Case status: ~65% Open, ~20% Closed, ~15% Inactive
  const caseStatus = pick<Member['caseStatus']>(['Open', 'Closed', 'Inactive'], [0.65, 0.20, 0.15]);

  // Journey stage
  const journeyStage = pick(journeyStages, journeyWeights);

  // Clinician assignment
  const primaryClinician = clinicianAssignments[index];

  // Dashboard unlock: ~35% for Customers, lower for others
  const unlockRate = memberType === 'Customer' ? 0.35 : memberType === 'Employee' ? 0.25 : 0.10;
  const dashboardUnlocked = rand() < unlockRate;

  const dashboardUnlockedAt = dashboardUnlocked
    ? new Date(createdDate.getTime() + (14 + Math.floor(rand() * 21)) * 86400000).toISOString()
    : null;

  // Add-ons: ~15% have them
  const addOns: string[] = [];
  if (rand() < 0.15) {
    const numAddOns = 1 + Math.floor(rand() * 2);
    for (let a = 0; a < numAddOns; a++) {
      const addon = addOnOptions[Math.floor(rand() * addOnOptions.length)];
      if (!addOns.includes(addon)) addOns.push(addon);
    }
  }

  // Email sequences triggered
  const triggered: string[] = [];
  const seqCount = 1 + Math.floor(rand() * 3);
  for (let s = 0; s < seqCount; s++) {
    const seq = emailSequences[Math.floor(rand() * emailSequences.length)];
    if (!triggered.includes(seq)) triggered.push(seq);
  }

  // Test dates
  const hasTest = ['dashboard-unlocked', 'insights-call-complete', 'active-plan', 'retest-due'].includes(journeyStage);
  const lastTestDate = hasTest
    ? new Date(createdDate.getTime() + (21 + Math.floor(rand() * 30)) * 86400000).toISOString()
    : null;
  const nextRetestDate = journeyStage === 'retest-due'
    ? new Date(new Date(lastTestDate!).getTime() + 90 * 86400000).toISOString()
    : null;

  // Revenue and transactions
  const hasPaid = memberType === 'Customer' || (memberType === 'Friend-Family' && rand() < 0.3);
  const transactionCount = hasPaid ? 1 + Math.floor(rand() * 6) : 0;
  const totalRevenue = hasPaid ? 349 + transactionCount * (99 + Math.floor(rand() * 100)) : 0;
  const mrr = hasPaid ? pick([99, 174, 249], [0.50, 0.30, 0.20]) : 0;
  const firstPaymentDate = hasPaid ? createdAt : null;
  const lastPaymentDate = hasPaid
    ? new Date(createdDate.getTime() + Math.floor(rand() * daysSinceRegistration) * 86400000).toISOString()
    : null;

  // Support tickets
  const ticketCount = Math.floor(rand() * 4);
  const openTickets = ticketCount > 0 ? Math.floor(rand() * 2) : 0;
  const avgResolutionTime = ticketCount > 0 ? 600 + Math.floor(rand() * 1200) : null;
  const lastTicketDate = ticketCount > 0
    ? new Date(createdDate.getTime() + Math.floor(rand() * daysSinceRegistration) * 86400000).toISOString()
    : null;
  const csat = ticketCount > 0 ? (rand() < 0.7 ? 4 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 2)) : null;

  // Health score
  const healthScore: HealthScore = caseStatus === 'Inactive'
    ? 'at-risk'
    : pick<HealthScore>(['healthy', 'attention', 'at-risk', 'unknown'], [0.55, 0.25, 0.10, 0.10]);

  // Risk flags
  const riskFlags: Member['riskFlags'] = [];
  if (healthScore === 'at-risk') {
    riskFlags.push({
      type: pick(['churn-risk', 'stalled-journey', 'payment-failure'] as const, [0.5, 0.3, 0.2]),
      severity: 'high',
      detail: 'Automated risk detection triggered',
      detectedAt: new Date(refDate.getTime() - Math.floor(rand() * 14) * 86400000).toISOString(),
    });
  } else if (healthScore === 'attention') {
    if (rand() < 0.4) {
      riskFlags.push({
        type: 'stalled-journey',
        severity: 'medium',
        detail: 'No progress in journey for 14+ days',
        detectedAt: new Date(refDate.getTime() - Math.floor(rand() * 21) * 86400000).toISOString(),
      });
    }
  }

  // Better tomorrows (engagement score 0-100)
  const betterTomorrows = healthScore === 'healthy'
    ? 60 + Math.floor(rand() * 40)
    : healthScore === 'attention'
      ? 30 + Math.floor(rand() * 40)
      : Math.floor(rand() * 40);

  // Assigned doctor (only for those past dashboard-unlocked)
  const advancedStages: JourneyStage[] = ['dashboard-unlocked', 'insights-call-complete', 'active-plan', 'retest-due'];
  const assignedDoctor = advancedStages.includes(journeyStage) && rand() < 0.6
    ? pick(['Dr. Sarah Lin', 'Dr. James Park', 'Dr. Priya Nair'], [0.4, 0.35, 0.25])
    : null;

  return {
    id,
    hubspotRecordId: `HS-${100000 + num}`,
    firstName: 'Member',
    lastName: `#${padId(num)}`,
    displayName,
    email: `member${padId(num)}@example.com`,
    sex,
    ageRange,
    type: memberType,
    caseStatus,
    createdAt,
    primaryClinician,
    assignedDoctor,
    dashboardUnlocked,
    dashboardUnlockedAt,
    lastTestDate,
    nextRetestDate,
    emailSequenceTriggered: triggered,
    addOns,
    journeyStage,
    totalRevenue,
    transactionCount,
    firstPaymentDate,
    lastPaymentDate,
    mrr,
    ticketCount,
    openTickets,
    avgResolutionTime,
    lastTicketDate,
    csat,
    healthScore,
    riskFlags,
    daysSinceRegistration,
    betterTomorrows,
    isVIP: false,
  };
}

export const mockMembers: Member[] = Array.from({ length: 300 }, (_, i) => generateMember(i));

```

## `src/data/mock/rocks.ts`

```ts
import type { Rock } from '@/lib/types/rocks';

export const mockRocks: Rock[] = [
  {
    id: 'ROCK-001',
    number: 1,
    title: 'Deliver the journey, not just the service',
    description:
      'Transform the member experience from transactional health testing into a guided, personalised wellness journey with clear milestones and automated touchpoints.',
    owner: 'Mark',
    status: 'on-track',
    quarter: 'Q1 2026',
    metrics: [
      {
        label: 'Menopause journey',
        current: 'Live',
        target: 'Live by Mar',
        status: 'green',
      },
      {
        label: 'Avg signup-to-results',
        current: 'TBC',
        target: '<5 wks',
        status: 'grey',
      },
      {
        label: 'Manual touchpoints',
        current: 'TBC',
        target: '-50%',
        status: 'grey',
      },
    ],
  },
  {
    id: 'ROCK-002',
    number: 2,
    title: 'Prove people stay',
    description:
      'Demonstrate strong member retention beyond the initial testing cycle by tracking cohort behaviour, reducing churn, and driving retest engagement.',
    owner: 'Mark',
    status: 'on-track',
    quarter: 'Q1 2026',
    metrics: [
      {
        label: 'Cohort retention post-2nd',
        current: 'TBC',
        target: '75%+',
        status: 'grey',
      },
      {
        label: 'Monthly churn',
        current: '3.8%',
        target: '<5%',
        status: 'green',
      },
      {
        label: 'Retest bookings',
        current: 'TBC',
        target: '25+',
        status: 'grey',
      },
    ],
  },
  {
    id: 'ROCK-003',
    number: 3,
    title: 'Start proving it works',
    description:
      'Build the evidence base that TMRW Health interventions lead to measurable biomarker improvements and positive health outcomes for members.',
    owner: 'Emma',
    status: 'building',
    quarter: 'Q1 2026',
    metrics: [
      {
        label: 'Members with 2+ cycles',
        current: '0',
        target: '10+',
        status: 'red',
      },
      {
        label: 'Biomarker improvement',
        current: 'TBC',
        target: '60%+',
        status: 'grey',
      },
      {
        label: 'Research partnership',
        current: 'TBC',
        target: '1 signed',
        status: 'grey',
      },
    ],
  },
];

```

## `src/data/mock/scorecard.ts`

```ts
import type { Status } from '@/lib/types/metrics';

export interface ScorecardMetric {
  id: string;
  label: string;
  owner: string;
  target: string;
  weeks: ScorecardWeek[];
}

export interface ScorecardWeek {
  weekEnding: string;
  value: string | number;
  status: Status;
}

export const mockScorecard: ScorecardMetric[] = [
  {
    id: 'sc-active-members',
    label: 'Active Members',
    owner: 'Mark',
    target: '220+',
    weeks: [
      { weekEnding: '2026-02-15', value: 195, status: 'amber' },
      { weekEnding: '2026-02-22', value: 208, status: 'amber' },
      { weekEnding: '2026-03-01', value: 218, status: 'green' },
    ],
  },
  {
    id: 'sc-new-signups',
    label: 'New Signups (weekly)',
    owner: 'Mark',
    target: '20+',
    weeks: [
      { weekEnding: '2026-02-15', value: 18, status: 'amber' },
      { weekEnding: '2026-02-22', value: 22, status: 'green' },
      { weekEnding: '2026-03-01', value: 25, status: 'green' },
    ],
  },
  {
    id: 'sc-monthly-churn',
    label: 'Monthly Churn Rate',
    owner: 'Mark',
    target: '<5%',
    weeks: [
      { weekEnding: '2026-02-15', value: '4.1%', status: 'green' },
      { weekEnding: '2026-02-22', value: '3.9%', status: 'green' },
      { weekEnding: '2026-03-01', value: '3.8%', status: 'green' },
    ],
  },
  {
    id: 'sc-mrr',
    label: 'MRR',
    owner: 'Mark',
    target: '$30K+',
    weeks: [
      { weekEnding: '2026-02-15', value: '$26.4K', status: 'amber' },
      { weekEnding: '2026-02-22', value: '$28.1K', status: 'amber' },
      { weekEnding: '2026-03-01', value: '$29.7K', status: 'amber' },
    ],
  },
  {
    id: 'sc-dashboards-published',
    label: 'Dashboards Published (weekly)',
    owner: 'Isabelle',
    target: '15+',
    weeks: [
      { weekEnding: '2026-02-15', value: 12, status: 'amber' },
      { weekEnding: '2026-02-22', value: 16, status: 'green' },
      { weekEnding: '2026-03-01', value: 14, status: 'amber' },
    ],
  },
  {
    id: 'sc-avg-first-reply',
    label: 'Avg First Reply (hrs)',
    owner: 'Nina',
    target: '<2.5h',
    weeks: [
      { weekEnding: '2026-02-15', value: '2.8h', status: 'amber' },
      { weekEnding: '2026-02-22', value: '2.4h', status: 'green' },
      { weekEnding: '2026-03-01', value: '2.5h', status: 'green' },
    ],
  },
  {
    id: 'sc-csat',
    label: 'CSAT (Good %)',
    owner: 'Nina',
    target: '80%+',
    weeks: [
      { weekEnding: '2026-02-15', value: '79%', status: 'amber' },
      { weekEnding: '2026-02-22', value: '83%', status: 'green' },
      { weekEnding: '2026-03-01', value: '82%', status: 'green' },
    ],
  },
  {
    id: 'sc-gate2a-pass',
    label: 'Gate 2A Pass Rate',
    owner: 'Emma',
    target: '90%+',
    weeks: [
      { weekEnding: '2026-02-15', value: '91%', status: 'green' },
      { weekEnding: '2026-02-22', value: '93%', status: 'green' },
      { weekEnding: '2026-03-01', value: '92%', status: 'green' },
    ],
  },
];

```

## `src/data/mock/strategy.ts`

```ts
import type {
  Question,
  StrategicBet,
  PostureChoice,
  DestinationRow,
} from '@/lib/types/strategy';

export const mockQuestions: Question[] = [
  {
    id: 'Q-001',
    number: 1,
    text: 'Can we prove it works?',
    framing:
      'The core clinical proposition — that TMRW’s personalised longevity program produces measurable, meaningful health improvements — must be provable with data.',
    primaryMetrics: [
      {
        metricId: 'biomarker-improvement',
        current: 'TBC',
        previous: null,
        target: '60%+',
        status: 'grey',
        trend: null,
        sparkline: [],
        period: 'quarterly',
      },
      {
        metricId: 'bio-age-delta',
        current: 'TBC',
        previous: null,
        target: null,
        status: 'grey',
        trend: null,
        sparkline: [],
        period: 'quarterly',
      },
    ],
    secondaryMetrics: [],
    functionalAreas: ['clinical'],
    status: 'red',
    whatHasToBeTrueItems: [
      'Members complete 2+ test cycles',
      'Biomarker data is collected and analysed',
      'Statistical significance achieved',
    ],
  },
  {
    id: 'Q-002',
    number: 2,
    text: 'Do customers love it?',
    framing:
      'The product must be so good that customers stay, refer friends, and expand their relationship.',
    primaryMetrics: [
      {
        metricId: 'new-member-capacity',
        current: 25,
        previous: null,
        target: 50,
        status: 'red',
        trend: null,
        sparkline: [],
        period: 'monthly',
      },
      {
        metricId: 'treatment-journey-conversion',
        current: 'TBC',
        previous: null,
        target: null,
        status: 'grey',
        trend: null,
        sparkline: [],
        period: 'monthly',
      },
    ],
    secondaryMetrics: [
      {
        metricId: 'csat',
        current: 82,
        previous: 78,
        target: 80,
        status: 'green',
        trend: 5.1,
        sparkline: [75, 78, 80, 78, 82],
        period: 'monthly',
      },
      {
        metricId: 'monthly-churn',
        current: 3.8,
        previous: 3.6,
        target: 5,
        status: 'green',
        trend: -5.3,
        sparkline: [5.1, 4.8, 4.5, 3.6, 3.8],
        period: 'monthly',
      },
    ],
    functionalAreas: ['members', 'support'],
    status: 'amber',
    whatHasToBeTrueItems: [
      'NPS > 50',
      'Churn < 5%',
      'Referral rate > 20%',
    ],
  },
  {
    id: 'Q-003',
    number: 3,
    text: 'Are we building a defensible moat?',
    framing:
      'Long-term competitive advantage through partnerships, data assets, and clinical proof.',
    primaryMetrics: [
      {
        metricId: 'channel-partners',
        current: 0,
        previous: 0,
        target: 2,
        status: 'red',
        trend: 0,
        sparkline: [0, 0, 0, 0, 0],
        period: 'quarterly',
      },
      {
        metricId: 'corporate-partners',
        current: 0,
        previous: 0,
        target: 3,
        status: 'red',
        trend: 0,
        sparkline: [0, 0, 0, 0, 0],
        period: 'quarterly',
      },
    ],
    secondaryMetrics: [],
    functionalAreas: ['strategy'],
    status: 'red',
    whatHasToBeTrueItems: [
      'Academic partnerships producing research',
      'B2B revenue stream emerging',
    ],
  },
  {
    id: 'Q-004',
    number: 4,
    text: 'Can we deliver value quickly and reliably?',
    framing:
      'Members must receive their personalised health insights quickly and consistently.',
    primaryMetrics: [
      {
        metricId: 'reg-to-dashboard',
        current: 98,
        previous: 105,
        target: 30,
        status: 'red',
        trend: -6.7,
        sparkline: [120, 115, 110, 105, 98],
        period: 'monthly',
      },
      {
        metricId: 'members-per-clinical-fte',
        current: 39.4,
        previous: 36,
        target: 50,
        status: 'green',
        trend: 9.4,
        sparkline: [30, 32, 34, 36, 39.4],
        period: 'monthly',
      },
    ],
    secondaryMetrics: [],
    functionalAreas: ['clinical', 'support'],
    status: 'amber',
    whatHasToBeTrueItems: [
      'Clinical team scaled',
      'Processes automated',
      'Quality gates maintained',
    ],
  },
  {
    id: 'Q-005',
    number: 5,
    text: 'Are the economics directionally right?',
    framing:
      'Unit economics must trend toward sustainability — acquiring members efficiently and generating enough margin.',
    primaryMetrics: [
      {
        metricId: 'blended-cac',
        current: 95,
        previous: 102,
        target: 100,
        status: 'green',
        trend: -6.9,
        sparkline: [115, 110, 108, 102, 95],
        period: 'monthly',
      },
      {
        metricId: 'cm-per-member',
        current: 72,
        previous: 65,
        target: 80,
        status: 'amber',
        trend: 10.8,
        sparkline: [52, 58, 62, 65, 72],
        period: 'monthly',
      },
    ],
    secondaryMetrics: [],
    functionalAreas: ['financial'],
    status: 'amber',
    whatHasToBeTrueItems: [
      'CAC < $100',
      'LTV:CAC > 3',
      'Payback < 12 months',
    ],
  },
];

export const mockStrategicBets: StrategicBet[] = [
  {
    id: 'BET-001',
    number: 1,
    title: 'Margin Expansion',
    description:
      'Reduce COGS and increase ARPU through supplement upsells and operational efficiency.',
    currentActions: [],
    laterItems: [],
    proofConditions: [
      { label: 'Supplement attach rate > 30%', met: false },
      { label: 'COGS per member reduced by 20%', met: false },
      { label: 'ARPU increases to $180+', met: false },
    ],
    connectedPillars: ['Economics', 'Scalability'],
  },
  {
    id: 'BET-002',
    number: 2,
    title: 'Academic Partnerships',
    description:
      'Partner with universities for clinical research and validation.',
    currentActions: [],
    laterItems: [],
    proofConditions: [
      { label: '1 research partnership signed', met: false },
      { label: 'First outcomes paper drafted', met: false },
      { label: 'Data sharing agreement in place', met: false },
    ],
    connectedPillars: ['Outcomes', 'Moat'],
  },
  {
    id: 'BET-003',
    number: 3,
    title: 'Physical Presence',
    description:
      'Explore physical clinic touchpoints for premium experience.',
    currentActions: [],
    laterItems: [],
    proofConditions: [
      { label: 'Feasibility study completed', met: false },
      { label: 'Location shortlist identified', met: false },
      { label: 'Unit economics modelled', met: false },
    ],
    connectedPillars: ['Experience', 'Moat'],
  },
  {
    id: 'BET-004',
    number: 4,
    title: 'Digital Member Experience',
    description:
      'Invest in the digital platform as the primary member interface.',
    currentActions: [],
    laterItems: [],
    proofConditions: [
      { label: '60%+ weekly dashboard engagement', met: false },
      { label: 'Clinician call volume drops 25%', met: false },
      { label: 'Member NPS for dashboard > 50', met: false },
    ],
    connectedPillars: ['Retention', 'Scalability'],
  },
  {
    id: 'BET-005',
    number: 5,
    title: 'International Exploration',
    description:
      'Evaluate international expansion opportunities beyond Australia.',
    currentActions: [],
    laterItems: [],
    proofConditions: [
      { label: 'Market analysis for 2 target countries', met: false },
      { label: 'Regulatory requirements mapped', met: false },
      { label: 'Go/no-go decision by Q4', met: false },
    ],
    connectedPillars: ['Growth', 'Moat'],
  },
];

export const mockPostureChoices: PostureChoice[] = [
  {
    id: 'PC-001',
    label: 'Aspiration',
    leftLabel: 'Stable growth',
    rightLabel: 'Drive scale',
    position: 'leaning-right',
    notes: '',
  },
  {
    id: 'PC-002',
    label: 'Geography',
    leftLabel: 'Expand soon',
    rightLabel: 'Expand 2027',
    position: 'leaning-left',
    notes: '',
  },
  {
    id: 'PC-003',
    label: 'Segment',
    leftLabel: 'Menopause only',
    rightLabel: 'Split focus',
    position: 'decided-left',
    notes: '',
  },
  {
    id: 'PC-004',
    label: 'B2B',
    leftLabel: 'Passive',
    rightLabel: 'Significant effort',
    position: 'open',
    notes: '',
  },
  {
    id: 'PC-005',
    label: 'Capabilities',
    leftLabel: 'Scale with people',
    rightLabel: 'Scale digitally',
    position: 'leaning-right',
    notes: '',
  },
  {
    id: 'PC-006',
    label: 'Customer service',
    leftLabel: 'Ticket to play',
    rightLabel: 'Core differentiator',
    position: 'leaning-right',
    notes: '',
  },
];

export const mockDestinationTable: DestinationRow[] = [
  // Key Business Performance
  {
    category: 'Key Business Performance',
    metric: 'Active Members',
    now: '230',
    jun: '400',
    dec: '750',
    status: 'amber',
    whatHasToBeTrue: '',
  },
  {
    category: 'Key Business Performance',
    metric: 'Monthly Revenue',
    now: '$13.5K',
    jun: '$30K',
    dec: '$75K',
    status: 'red',
    whatHasToBeTrue: '',
  },
  {
    category: 'Key Business Performance',
    metric: 'Monthly Churn',
    now: '3.8%',
    jun: '<5%',
    dec: '<3%',
    status: 'green',
    whatHasToBeTrue: '',
  },
  // Product & Experience
  {
    category: 'Product & Experience',
    metric: 'Reg→Dashboard Time',
    now: '98d',
    jun: '<45d',
    dec: '<21d',
    status: 'red',
    whatHasToBeTrue: '',
  },
  {
    category: 'Product & Experience',
    metric: 'Dashboard Unlock Rate',
    now: '21%',
    jun: '40%',
    dec: '60%',
    status: 'red',
    whatHasToBeTrue: '',
  },
  {
    category: 'Product & Experience',
    metric: 'CSAT',
    now: '82%',
    jun: '85%',
    dec: '90%',
    status: 'green',
    whatHasToBeTrue: '',
  },
  // Clinical Proof
  {
    category: 'Clinical Proof',
    metric: 'Members w/ 2+ Cycles',
    now: '0',
    jun: '15',
    dec: '50',
    status: 'red',
    whatHasToBeTrue: '',
  },
  {
    category: 'Clinical Proof',
    metric: 'Biomarker Improvement',
    now: 'TBC',
    jun: '40%',
    dec: '60%',
    status: 'grey',
    whatHasToBeTrue: '',
  },
  // Defensible Moat
  {
    category: 'Defensible Moat',
    metric: 'Channel Partners',
    now: '0',
    jun: '1',
    dec: '2',
    status: 'red',
    whatHasToBeTrue: '',
  },
  {
    category: 'Defensible Moat',
    metric: 'Corporate Partners',
    now: '0',
    jun: '1',
    dec: '3',
    status: 'red',
    whatHasToBeTrue: '',
  },
  {
    category: 'Defensible Moat',
    metric: 'Academic Partnerships',
    now: '0',
    jun: '1',
    dec: '2',
    status: 'red',
    whatHasToBeTrue: '',
  },
  // Operational Readiness
  {
    category: 'Operational Readiness',
    metric: 'Members/Clinical FTE',
    now: '39.4',
    jun: '50',
    dec: '60',
    status: 'green',
    whatHasToBeTrue: '',
  },
  {
    category: 'Operational Readiness',
    metric: 'Dashboards/Day',
    now: '0.8',
    jun: '3',
    dec: '5',
    status: 'red',
    whatHasToBeTrue: '',
  },
  // Economics
  {
    category: 'Economics',
    metric: 'Blended CAC',
    now: '$95',
    jun: '<$80',
    dec: '<$60',
    status: 'green',
    whatHasToBeTrue: '',
  },
  {
    category: 'Economics',
    metric: 'CM/Member',
    now: '$72',
    jun: '>$80',
    dec: '>$100',
    status: 'amber',
    whatHasToBeTrue: '',
  },
];

```

## `src/data/mock/team.ts`

```ts
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: 'corporate' | 'sciences' | 'medical' | 'clinical' | 'technology' | 'brand';
  fte: number;
  startDate: string;
}

export const mockTeam: TeamMember[] = [
  // Corporate (3)
  { id: 'TM-001', name: 'Mark Britt', role: 'CEO', department: 'corporate', fte: 1, startDate: '2024-01-15' },
  { id: 'TM-002', name: 'Emma Walsh', role: 'COO', department: 'corporate', fte: 1, startDate: '2024-03-01' },
  { id: 'TM-003', name: 'David Chen', role: 'CFO (Fractional)', department: 'corporate', fte: 0.5, startDate: '2024-06-01' },

  // Sciences (2)
  { id: 'TM-004', name: 'Dr Sarah Leong', role: 'Chief Science Officer', department: 'sciences', fte: 1, startDate: '2024-02-15' },
  { id: 'TM-021', name: 'Dr Lisa Huang', role: 'Research Scientist', department: 'sciences', fte: 1, startDate: '2025-02-01' },

  // Medical (2)
  { id: 'TM-005', name: 'Dr Rahul Mohan', role: 'Medical Director', department: 'medical', fte: 0.8, startDate: '2024-04-01' },
  { id: 'TM-006', name: 'Dr James Liu', role: 'GP Advisor', department: 'medical', fte: 0.4, startDate: '2024-07-01' },

  // Clinical (8)
  { id: 'TM-007', name: 'Katie Kell', role: 'Head of Clinical Services', department: 'clinical', fte: 1, startDate: '2024-02-01' },
  { id: 'TM-008', name: 'Alia Chen', role: 'Integrative Clinician', department: 'clinical', fte: 1, startDate: '2024-03-15' },
  { id: 'TM-009', name: 'Paula Martinez', role: 'Integrative Clinician', department: 'clinical', fte: 1, startDate: '2024-04-01' },
  { id: 'TM-010', name: 'Isabelle Baissac', role: 'Integrative Clinician', department: 'clinical', fte: 1, startDate: '2024-05-01' },
  { id: 'TM-011', name: 'Jaclyn Torres', role: 'Integrative Clinician', department: 'clinical', fte: 1, startDate: '2025-01-15' },
  { id: 'TM-012', name: 'Marko Petrov', role: 'Integrative Clinician', department: 'clinical', fte: 0.6, startDate: '2025-02-01' },
  { id: 'TM-013', name: 'Sanja Kumar', role: 'Integrative Clinician', department: 'clinical', fte: 0.6, startDate: '2025-01-01' },
  { id: 'TM-014', name: 'Katrina Walsh', role: 'Customer & Ops Lead', department: 'clinical', fte: 1, startDate: '2024-06-15' },

  // Technology (5)
  { id: 'TM-015', name: 'Alex Thompson', role: 'Engineering Lead', department: 'technology', fte: 1, startDate: '2024-01-15' },
  { id: 'TM-016', name: 'Nina Gibbias', role: 'Full Stack Developer', department: 'technology', fte: 1, startDate: '2024-05-01' },
  { id: 'TM-017', name: 'Tom Watts', role: 'Full Stack Developer', department: 'technology', fte: 1, startDate: '2024-07-01' },
  { id: 'TM-018', name: 'Sarah Chen', role: 'Product Designer', department: 'technology', fte: 1, startDate: '2024-08-01' },
  { id: 'TM-019', name: 'Alex Park', role: 'Data Engineer', department: 'technology', fte: 1, startDate: '2025-01-15' },

  // Brand (1)
  { id: 'TM-020', name: 'Sophie Delacroix', role: 'Brand Lead', department: 'brand', fte: 1, startDate: '2024-09-01' },
];

export const mockHiringPipeline = [
  { role: 'Senior Integrative Clinician', department: 'clinical' as const, stage: 'interviewing' as const, targetStart: '2026-04-15' },
  { role: 'Data Analyst', department: 'technology' as const, stage: 'sourcing' as const, targetStart: '2026-05-01' },
  { role: 'Customer Success Manager', department: 'clinical' as const, stage: 'offer' as const, targetStart: '2026-03-15' },
];

export const departmentSummary = [
  { department: 'Corporate', color: '#78716C', fte: 2.5, headcount: 3 },
  { department: 'Sciences', color: '#F59E0B', fte: 2, headcount: 2 },
  { department: 'Medical', color: '#EF4444', fte: 1.2, headcount: 2 },
  { department: 'Clinical', color: '#EC4899', fte: 7.2, headcount: 8 },
  { department: 'Technology', color: '#3B82F6', fte: 5, headcount: 5 },
  { department: 'Brand', color: '#8B5CF6', fte: 1, headcount: 1 },
];

```

## `src/data/mock/tickets.ts`

```ts
import type { Ticket } from '@/lib/types/ticket';

// Deterministic pseudo-random number generator (mulberry32)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seededRandom(777);

function pick<T>(items: T[], weights: number[]): T {
  const r = rand();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return items[i];
  }
  return items[items.length - 1];
}

// Tags pool
const allTags = [
  'billing',
  'kit-issue',
  'results-query',
  'supplement-question',
  'scheduling',
  'account-change',
  'clinical-question',
  'feedback',
];

// Assignee distribution: Nina 40%, Tom 30%, Sarah 20%, Alex 10%
const assignees = [
  { name: 'Nina Gibbias', weight: 0.40 },
  { name: 'Tom Watts', weight: 0.30 },
  { name: 'Sarah Chen', weight: 0.20 },
  { name: 'Alex Park', weight: 0.10 },
];

// Monthly ticket distribution (Sep 2025 - Feb 2026): 20, 25, 30, 35, 40, 50
const monthlyTicketDist = [
  { year: 2025, month: 8, count: 20 },
  { year: 2025, month: 9, count: 25 },
  { year: 2025, month: 10, count: 30 },
  { year: 2025, month: 11, count: 35 },
  { year: 2026, month: 0, count: 40 },
  { year: 2026, month: 1, count: 50 },
];

const ticketDates: string[] = [];
for (const m of monthlyTicketDist) {
  const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
  for (let i = 0; i < m.count; i++) {
    const day = 1 + Math.floor((i / m.count) * daysInMonth);
    const hour = 8 + (i % 10);
    const minute = (i * 13) % 60;
    ticketDates.push(new Date(m.year, m.month, day, hour, minute, 0).toISOString());
  }
}

function generateTicket(index: number): Ticket {
  const ticketId = String(1001 + index);
  const createdAt = ticketDates[index];
  const createdDate = new Date(createdAt);

  // Channel: 60% email, 25% web, 10% chat, 5% phone
  const channel = pick(
    ['email', 'web', 'chat', 'phone'],
    [0.60, 0.25, 0.10, 0.05]
  );

  // Priority: 5% urgent, 15% high, 50% normal, 30% low
  const priority = pick<Ticket['priority']>(
    ['Urgent', 'High', 'Normal', 'Low'],
    [0.05, 0.15, 0.50, 0.30]
  );

  // Status: 70% solved, 15% open, 10% pending, 5% closed
  const status = pick<Ticket['status']>(
    ['Solved', 'Open', 'Pending', 'Closed'],
    [0.70, 0.15, 0.10, 0.05]
  );

  // Type: 40% Question, 25% Incident, 20% Problem, 15% Task
  const ticketType = pick<Ticket['ticketType']>(
    ['Question', 'Incident', 'Problem', 'Task'],
    [0.40, 0.25, 0.20, 0.15]
  );

  // Assignee
  const assignee = pick(
    assignees.map((a) => a.name),
    assignees.map((a) => a.weight)
  );

  // Tags: 1-3 tags per ticket
  const tagCount = 1 + Math.floor(rand() * 3);
  const tags: string[] = [];
  for (let t = 0; t < tagCount; t++) {
    const tag = allTags[Math.floor(rand() * allTags.length)];
    if (!tags.includes(tag)) tags.push(tag);
  }

  // CSAT: ~60% Not Offered, ~15% Offered, ~20% Good, ~5% Bad
  const satisfaction = pick<Ticket['satisfaction']>(
    ['Not Offered', 'Offered', 'Good', 'Bad'],
    [0.60, 0.15, 0.20, 0.05]
  );

  // First reply time: avg ~150 min business hours, range 15-600
  const firstReplyMinutes =
    status === 'Open' && rand() < 0.3
      ? null
      : 15 + Math.floor(rand() * 300);

  // Resolution times (only for solved/closed)
  const isSolved = status === 'Solved' || status === 'Closed';
  const firstResolutionMinutes = isSolved
    ? 120 + Math.floor(rand() * 1920) // 2h to 34h
    : null;
  const fullResolutionMinutes = isSolved
    ? (firstResolutionMinutes ?? 0) + Math.floor(rand() * 360) // add up to 6h for reopens
    : null;

  // Requester wait time
  const requesterWaitMinutes = isSolved
    ? 30 + Math.floor(rand() * 600)
    : status === 'Open'
      ? 10 + Math.floor(rand() * 200)
      : 60 + Math.floor(rand() * 480);

  // Solved/updated dates
  const daysToResolve = isSolved ? 1 + Math.floor(rand() * 5) : Math.floor(rand() * 10);
  const updatedAt = new Date(
    createdDate.getTime() + daysToResolve * 86400000 + Math.floor(rand() * 43200000)
  ).toISOString();
  const solvedAt = isSolved ? updatedAt : null;

  // Reopens: 3% reopen rate
  const reopens = rand() < 0.03 ? 1 : 0;

  // Replies: 1-8
  const replies = 1 + Math.floor(rand() * 8);

  // Stations
  const assigneeStations = 1 + Math.floor(rand() * 3);
  const groupStations = 1 + Math.floor(rand() * 2);

  // Link ~60% of tickets to members
  const memberId =
    rand() < 0.60
      ? `MBR-${String(1 + Math.floor(rand() * 300)).padStart(3, '0')}`
      : null;

  return {
    id: ticketId,
    memberId,
    status,
    priority,
    channel,
    ticketType,
    tags,
    createdAt,
    updatedAt,
    solvedAt,
    assignee,
    group: 'Support',
    firstReplyMinutes,
    firstResolutionMinutes,
    fullResolutionMinutes,
    requesterWaitMinutes,
    satisfaction,
    reopens,
    replies,
    assigneeStations,
    groupStations,
  };
}

export const mockTickets: Ticket[] = Array.from({ length: 200 }, (_, i) =>
  generateTicket(i)
);

```

## `src/data/mock/transactions.ts`

```ts
import type { Transaction } from '@/lib/types/transaction';

// Deterministic pseudo-random number generator (mulberry32)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seededRandom(123);

function pick<T>(items: T[], weights: number[]): T {
  const r = rand();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return items[i];
  }
  return items[items.length - 1];
}

// Alphanumeric chars for charge IDs
const alphaNum = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function generateChargeId(index: number): string {
  let id = 'ch_';
  // Use deterministic sequence based on index
  let seed = index * 31 + 7;
  for (let i = 0; i < 24; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    id += alphaNum[seed % alphaNum.length];
  }
  return id;
}

// Transaction type distribution: ~240 foundations, ~100 advanced-testing, ~80 supplements, ~40 medication, ~40 treatment-journey
const typePool: Transaction['type'][] = [];
for (let i = 0; i < 240; i++) typePool.push('foundations-membership');
for (let i = 0; i < 100; i++) typePool.push('advanced-testing');
for (let i = 0; i < 80; i++) typePool.push('supplements');
for (let i = 0; i < 40; i++) typePool.push('medication');
for (let i = 0; i < 40; i++) typePool.push('treatment-journey');

// Shuffle deterministically
for (let i = typePool.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [typePool[i], typePool[j]] = [typePool[j], typePool[i]];
}

// Monthly transaction distribution (growing): Sep: 45, Oct: 55, Nov: 65, Dec: 75, Jan: 110, Feb: 150
const monthlyTxDist = [
  { year: 2025, month: 8, count: 45 },
  { year: 2025, month: 9, count: 55 },
  { year: 2025, month: 10, count: 65 },
  { year: 2025, month: 11, count: 75 },
  { year: 2026, month: 0, count: 110 },
  { year: 2026, month: 1, count: 150 },
];

const txDates: string[] = [];
for (const m of monthlyTxDist) {
  const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
  for (let i = 0; i < m.count; i++) {
    const day = 1 + Math.floor((i / m.count) * daysInMonth);
    const hour = 6 + (i % 16);
    const minute = (i * 11) % 60;
    txDates.push(new Date(m.year, m.month, day, hour, minute, 0).toISOString());
  }
}

function getAmount(type: Transaction['type']): number {
  switch (type) {
    case 'foundations-membership':
      return pick([99, 174, 249], [0.50, 0.30, 0.20]);
    case 'advanced-testing':
      return 349;
    case 'supplements':
      return 20 + Math.floor(rand() * 51); // $20-$70
    case 'medication':
      return pick([49, 79, 129], [0.4, 0.4, 0.2]);
    case 'treatment-journey':
      return pick([199, 349, 499], [0.50, 0.30, 0.20]);
    default:
      return 99;
  }
}

function generateTransaction(index: number): Transaction {
  const type = typePool[index];
  const amount = getAmount(type);

  // Outcome: 97% authorized, 2% declined, 1% blocked
  const outcome = pick<Transaction['outcome']>(
    ['authorized', 'declined', 'blocked'],
    [0.97, 0.02, 0.01]
  );

  const failureReason = outcome === 'declined'
    ? pick(['insufficient_funds', 'card_expired', 'do_not_honor'], [0.5, 0.3, 0.2])
    : outcome === 'blocked'
      ? 'suspected_fraud'
      : null;

  // Card country: 90% AU, 4% NZ, 3% SG, 2% US, 1% CA
  const cardCountry = pick(
    ['AU', 'NZ', 'SG', 'US', 'CA'],
    [0.90, 0.04, 0.03, 0.02, 0.01]
  );

  // Card brand: 50% Visa, 35% Mastercard, 15% Amex
  const cardBrand = pick(
    ['Visa', 'Mastercard', 'Amex'],
    [0.50, 0.35, 0.15]
  );

  // Link ~80% of transactions to members
  const memberId = rand() < 0.80
    ? `MBR-${String(1 + Math.floor(rand() * 300)).padStart(3, '0')}`
    : null;

  return {
    chargeId: generateChargeId(index),
    memberId,
    createdAt: txDates[index],
    amount,
    currency: 'AUD',
    type,
    outcome,
    failureReason,
    cardCountry,
    cardBrand,
    isRecurring: type === 'foundations-membership',
  };
}

export const mockTransactions: Transaction[] = Array.from({ length: 500 }, (_, i) => generateTransaction(i));

```

## `src/lib/config/data-sources.ts`

```ts
/**
 * CSV schema definitions for each external data source.
 * Used to validate uploaded files before processing.
 */

import type { CsvSchema } from '@/lib/types/data-sources';

export const hubspotSchema: CsvSchema = {
  source: 'hubspot',
  requiredColumns: [
    'Record ID',
    'Type',
    'Created at',
    'Primary Email',
  ],
  optionalColumns: [
    'Case Status',
    'Primary Clinician',
    'Assigned Doctor',
    'Dashboard Unlocked',
    '"Dashboard Unlocked" Changed At',
    'Dashboard Unlocked Changed At',
    'Sex',
    'Age Range',
    'Add-ons',
    'Last Test Date',
    'Next Retest Date',
    'Email sequence triggered',
    'Email addresses',
    'Last interaction > When',
    'Little Prick ID',
    'Patient ID',
    'Lead',
    'Lab Batch Tracking Number',
    'Name > First',
    'Name > Last',
  ],
  strippedColumns: [],
};

export const stripeSchema: CsvSchema = {
  source: 'stripe',
  requiredColumns: [
    'charge_id',
    'created',
    'amount',
    'currency',
    'outcome_type',
    'card_country',
    'interaction_type',
  ],
  optionalColumns: [
    'card_brand',
    'failure_code',
    'failure_message',
    'description',
    'fee',
    'net',
  ],
  strippedColumns: [],
};

export const zendeskSchema: CsvSchema = {
  source: 'zendesk',
  requiredColumns: [
    'ID',
    'Status',
    'Priority',
    'Via',
    'Ticket type',
    'Created at',
    'Updated at',
    'Solved at',
    'Assignee',
    'Group',
    'Tags',
    'Satisfaction Score',
    'First reply time in minutes',
    'First reply time in minutes within business hours',
    'First resolution time in minutes',
    'Full resolution time in minutes within business hours',
    'Requester wait time in minutes within business hours',
    'Reopens',
    'Replies',
    'Assignee stations',
    'Group stations',
  ],
  optionalColumns: [
    'Subject',
    'Description',
    'Requester',
  ],
  strippedColumns: [],
};

export const tableauSchema: CsvSchema = {
  source: 'tableau',
  requiredColumns: [
    'Member Id',
    'Email',
    'Created At',
    'Measure Names',
    'Measure Values',
  ],
  optionalColumns: [
    'CASE_STATUS',
    'CASE_TYPE',
    'Person Type',
    'Initial Subscription Date',
    'First Purchase Date',
    'Dashboard Published At',
    'First Result Ready At',
  ],
  strippedColumns: [],
};

/**
 * All schemas indexed by source name for easy lookup.
 */
export const dataSourceSchemas: Record<string, CsvSchema> = {
  hubspot: hubspotSchema,
  stripe: stripeSchema,
  zendesk: zendeskSchema,
  tableau: tableauSchema,
};

/**
 * Get the schema for a given data source.
 */
export function getSchema(source: string): CsvSchema | undefined {
  return dataSourceSchemas[source];
}

```

## `src/lib/config/metrics.ts`

```ts
/**
 * Metric definitions for the TMRW dashboard.
 * Covers the ~30 Tableau metrics plus additional spec-driven KPIs.
 */

import type { MetricDefinition } from '@/lib/types';

export const metricDefinitions: MetricDefinition[] = [
  // ── Financial ──────────────────────────────────────────────────────
  {
    id: 'mrr',
    label: 'Monthly Recurring Revenue',
    description: 'Total MRR from active subscriptions',
    source: 'stripe',
    direction: 'higher-better',
    format: 'currency',
    target: 100_000,
    category: 'financial',
  },
  {
    id: 'total-revenue',
    label: 'Total Revenue',
    description: 'Gross revenue for the period',
    source: 'stripe',
    direction: 'higher-better',
    format: 'currency',
    target: null,
    category: 'financial',
  },
  {
    id: 'subscription-revenue',
    label: 'Subscription Revenue',
    description: 'Revenue from recurring subscriptions',
    source: 'stripe',
    direction: 'higher-better',
    format: 'currency',
    target: null,
    category: 'financial',
  },
  {
    id: 'advanced-testing-revenue',
    label: 'Advanced Testing Revenue',
    description: 'One-time advanced testing collections',
    source: 'stripe',
    direction: 'higher-better',
    format: 'currency',
    target: null,
    category: 'financial',
  },
  {
    id: 'supplement-revenue',
    label: 'Supplement Revenue',
    description: 'Revenue from supplement sales',
    source: 'stripe',
    direction: 'higher-better',
    format: 'currency',
    target: null,
    category: 'financial',
  },
  {
    id: 'add-on-revenue',
    label: 'Add-On Revenue',
    description: 'Revenue from add-on services',
    source: 'stripe',
    direction: 'higher-better',
    format: 'currency',
    target: null,
    category: 'financial',
  },
  {
    id: 'arpu',
    label: 'ARPU',
    description: 'Average revenue per user per month',
    source: 'derived',
    direction: 'higher-better',
    format: 'currency',
    target: null,
    category: 'financial',
  },
  {
    id: 'ltv',
    label: 'Lifetime Value',
    description: 'Estimated customer lifetime value',
    source: 'derived',
    direction: 'higher-better',
    format: 'currency',
    target: null,
    category: 'financial',
  },
  {
    id: 'payment-success-rate',
    label: 'Payment Success Rate',
    description: 'Percentage of payment attempts that succeed',
    source: 'stripe',
    direction: 'higher-better',
    format: 'percentage',
    target: 98,
    category: 'financial',
  },
  {
    id: 'failed-payments',
    label: 'Failed Payments',
    description: 'Count of declined or blocked transactions',
    source: 'stripe',
    direction: 'lower-better',
    format: 'number',
    target: 0,
    category: 'financial',
  },

  // ── Members ────────────────────────────────────────────────────────
  {
    id: 'total-members',
    label: 'Total Members',
    description: 'All registered members',
    source: 'hubspot',
    direction: 'higher-better',
    format: 'number',
    target: null,
    category: 'members',
  },
  {
    id: 'active-members',
    label: 'Active Members',
    description: 'Members with open cases',
    source: 'hubspot',
    direction: 'higher-better',
    format: 'number',
    target: null,
    category: 'members',
  },
  {
    id: 'new-members',
    label: 'New Members',
    description: 'Members registered in the period',
    source: 'hubspot',
    direction: 'higher-better',
    format: 'number',
    target: null,
    category: 'members',
  },
  {
    id: 'churn-rate',
    label: 'Churn Rate',
    description: 'Percentage of members who churned in the period',
    source: 'derived',
    direction: 'lower-better',
    format: 'percentage',
    target: 5,
    category: 'members',
  },
  {
    id: 'net-member-growth',
    label: 'Net Member Growth',
    description: 'New members minus churned members',
    source: 'derived',
    direction: 'higher-better',
    format: 'number',
    target: null,
    category: 'members',
  },
  {
    id: 'health-story-completion-rate',
    label: 'Health Story Completion Rate',
    description: 'Percentage of registered members who completed their health story',
    source: 'hubspot',
    direction: 'higher-better',
    format: 'percentage',
    target: 85,
    category: 'members',
  },
  {
    id: 'kit-return-rate',
    label: 'Kit Return Rate',
    description: 'Percentage of dispatched kits that were returned',
    source: 'hubspot',
    direction: 'higher-better',
    format: 'percentage',
    target: 90,
    category: 'members',
  },
  {
    id: 'dashboard-unlock-rate',
    label: 'Dashboard Unlock Rate',
    description: 'Percentage of members who unlocked their dashboard',
    source: 'hubspot',
    direction: 'higher-better',
    format: 'percentage',
    target: 80,
    category: 'members',
  },
  {
    id: 'avg-days-to-dashboard',
    label: 'Avg Days to Dashboard',
    description: 'Average days from registration to dashboard unlock',
    source: 'derived',
    direction: 'lower-better',
    format: 'days',
    target: 30,
    category: 'members',
  },
  {
    id: 'retest-rate',
    label: 'Retest Rate',
    description: 'Percentage of eligible members who completed retests',
    source: 'hubspot',
    direction: 'higher-better',
    format: 'percentage',
    target: 70,
    category: 'members',
  },
  {
    id: 'stalled-members',
    label: 'Stalled Members',
    description: 'Members with no journey progress in 14+ days',
    source: 'derived',
    direction: 'lower-better',
    format: 'number',
    target: 0,
    category: 'members',
  },
  {
    id: 'at-risk-members',
    label: 'At-Risk Members',
    description: 'Members flagged as at-risk of churning',
    source: 'derived',
    direction: 'lower-better',
    format: 'number',
    target: 0,
    category: 'members',
  },

  // ── Clinical ───────────────────────────────────────────────────────
  {
    id: 'insights-calls-completed',
    label: 'Insights Calls Completed',
    description: 'Number of insights calls completed in the period',
    source: 'hubspot',
    direction: 'higher-better',
    format: 'number',
    target: null,
    category: 'clinical',
  },
  {
    id: 'avg-days-to-insights-call',
    label: 'Avg Days to Insights Call',
    description: 'Average days from dashboard unlock to insights call',
    source: 'derived',
    direction: 'lower-better',
    format: 'days',
    target: 14,
    category: 'clinical',
  },
  {
    id: 'clinician-utilisation',
    label: 'Clinician Utilisation',
    description: 'Percentage of clinician capacity used',
    source: 'derived',
    direction: 'higher-better',
    format: 'percentage',
    target: 80,
    category: 'clinical',
  },
  {
    id: 'active-plans',
    label: 'Active Plans',
    description: 'Members currently on an active health plan',
    source: 'hubspot',
    direction: 'higher-better',
    format: 'number',
    target: null,
    category: 'clinical',
  },
  {
    id: 'better-tomorrows-avg',
    label: 'Better Tomorrows (Avg)',
    description: 'Average Better Tomorrows score across members',
    source: 'derived',
    direction: 'higher-better',
    format: 'number',
    target: null,
    category: 'clinical',
  },

  // ── Support ────────────────────────────────────────────────────────
  {
    id: 'open-tickets',
    label: 'Open Tickets',
    description: 'Currently open support tickets',
    source: 'zendesk',
    direction: 'lower-better',
    format: 'number',
    target: null,
    category: 'support',
  },
  {
    id: 'new-tickets',
    label: 'New Tickets',
    description: 'Tickets created in the period',
    source: 'zendesk',
    direction: 'lower-better',
    format: 'number',
    target: null,
    category: 'support',
  },
  {
    id: 'first-reply-time',
    label: 'First Reply Time',
    description: 'Average time to first agent reply (minutes)',
    source: 'zendesk',
    direction: 'lower-better',
    format: 'hours',
    target: 60,
    category: 'support',
  },
  {
    id: 'resolution-time',
    label: 'Resolution Time',
    description: 'Average full resolution time (minutes)',
    source: 'zendesk',
    direction: 'lower-better',
    format: 'hours',
    target: 480,
    category: 'support',
  },
  {
    id: 'csat-score',
    label: 'CSAT Score',
    description: 'Customer satisfaction score (% good)',
    source: 'zendesk',
    direction: 'higher-better',
    format: 'percentage',
    target: 90,
    category: 'support',
  },
  {
    id: 'ticket-backlog',
    label: 'Ticket Backlog',
    description: 'Tickets open longer than SLA threshold',
    source: 'derived',
    direction: 'lower-better',
    format: 'number',
    target: 0,
    category: 'support',
  },
  {
    id: 'one-touch-resolution-rate',
    label: 'One-Touch Resolution Rate',
    description: 'Percentage of tickets resolved in a single reply',
    source: 'zendesk',
    direction: 'higher-better',
    format: 'percentage',
    target: 50,
    category: 'support',
  },
  {
    id: 'ticket-reopens',
    label: 'Ticket Reopens',
    description: 'Tickets reopened after being solved',
    source: 'zendesk',
    direction: 'lower-better',
    format: 'number',
    target: 0,
    category: 'support',
  },

  // ── Marketing ──────────────────────────────────────────────────────
  {
    id: 'leads',
    label: 'Leads',
    description: 'New marketing leads generated in the period',
    source: 'hubspot',
    direction: 'higher-better',
    format: 'number',
    target: null,
    category: 'marketing',
  },
  {
    id: 'lead-conversion-rate',
    label: 'Lead Conversion Rate',
    description: 'Percentage of leads that converted to members',
    source: 'derived',
    direction: 'higher-better',
    format: 'percentage',
    target: 15,
    category: 'marketing',
  },
  {
    id: 'cac',
    label: 'Customer Acquisition Cost',
    description: 'Average cost to acquire a new member',
    source: 'manual',
    direction: 'lower-better',
    format: 'currency',
    target: null,
    category: 'marketing',
  },
  {
    id: 'email-sequences-triggered',
    label: 'Email Sequences Triggered',
    description: 'Automated email sequences fired in the period',
    source: 'hubspot',
    direction: 'higher-better',
    format: 'number',
    target: null,
    category: 'marketing',
  },
];

/**
 * Lookup a single metric definition by id.
 */
export function getMetric(id: string): MetricDefinition | undefined {
  return metricDefinitions.find((m) => m.id === id);
}

/**
 * Get all metric definitions for a given category.
 */
export function getMetricsByCategory(category: string): MetricDefinition[] {
  return metricDefinitions.filter((m) => m.category === category);
}

```

## `src/lib/config/navigation.ts`

```ts
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Stethoscope,
  HeadphonesIcon,
  Megaphone,
  ListChecks,
  Target,
  UsersRound,
  Upload,
  Settings,
  RefreshCw,
  FileText,
  Database,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: any;
  section: 'home' | 'operations' | 'management' | 'admin';
  badge?: number;
}

export const navigation: NavItem[] = [
  { label: 'Scorecard', href: '/', icon: LayoutDashboard, section: 'home' },
  { label: 'Financial', href: '/financial', icon: DollarSign, section: 'operations' },
  { label: 'Acquisition', href: '/members', icon: Users, section: 'operations' },
  { label: 'Delivery', href: '/clinical', icon: Stethoscope, section: 'operations' },
  { label: 'Retention', href: '/retention', icon: RefreshCw, section: 'operations' },
  { label: 'Support', href: '/support', icon: HeadphonesIcon, section: 'operations' },
  { label: 'Marketing', href: '/marketing', icon: Megaphone, section: 'operations' },
  { label: 'EOS / L10', href: '/eos', icon: ListChecks, section: 'management' },
  { label: 'Board Pack', href: '/board-pack', icon: FileText, section: 'management' },
  { label: 'Strategy', href: '/strategy', icon: Target, section: 'management' },
  { label: 'Team', href: '/team', icon: UsersRound, section: 'management' },
  { label: 'Data Upload', href: '/admin/upload', icon: Upload, section: 'admin' },
  { label: 'Data Registry', href: '/admin/registry', icon: Database, section: 'admin' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, section: 'admin' },
];

```

## `src/lib/config/revenue-rules.ts`

```ts
/**
 * Stripe transaction classification rules for the TMRW dashboard.
 * Maps raw Stripe charge data into typed revenue categories.
 */

import type { Transaction } from '@/lib/types/transaction';

export type RevenueCategory = Transaction['type'];

export interface ClassificationRule {
  /** Human-readable name for the rule. */
  name: string;
  /** The revenue category this rule maps to. */
  category: RevenueCategory;
  /** Priority: lower number = matched first. */
  priority: number;
  /** Matcher function: returns true if the charge matches this rule. */
  match: (charge: RawStripeCharge) => boolean;
}

export interface RawStripeCharge {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  metadata_product_type: string | null;
  subscription_id: string | null;
  invoice_id: string | null;
  is_recurring: boolean | null;
  customer_email: string | null;
}

/**
 * Classification rules ordered by priority.
 * The first matching rule wins.
 */
export const revenueRules: ClassificationRule[] = [
  {
    name: 'Advanced Testing (metadata)',
    category: 'advanced-testing',
    priority: 1,
    match: (c) =>
      c.metadata_product_type?.toLowerCase() === 'advanced-testing' ||
      c.metadata_product_type?.toLowerCase() === 'advanced_testing' ||
      c.metadata_product_type?.toLowerCase() === 'joining-fee' ||
      c.metadata_product_type?.toLowerCase() === 'joining_fee',
  },
  {
    name: 'Advanced Testing (description)',
    category: 'advanced-testing',
    priority: 2,
    match: (c) => {
      const desc = (c.description ?? '').toLowerCase();
      return (
        desc.includes('advanced test') ||
        desc.includes('joining fee') ||
        desc.includes('join fee') ||
        desc.includes('registration fee') ||
        desc.includes('signup fee') ||
        desc.includes('initial test')
      );
    },
  },
  {
    name: 'Supplements (metadata)',
    category: 'supplements',
    priority: 3,
    match: (c) =>
      c.metadata_product_type?.toLowerCase() === 'supplement' ||
      c.metadata_product_type?.toLowerCase() === 'supplements',
  },
  {
    name: 'Supplements (description)',
    category: 'supplements',
    priority: 4,
    match: (c) => {
      const desc = (c.description ?? '').toLowerCase();
      return desc.includes('supplement') || desc.includes('nutraceutical');
    },
  },
  {
    name: 'Medication (metadata)',
    category: 'medication',
    priority: 5,
    match: (c) =>
      c.metadata_product_type?.toLowerCase() === 'medication' ||
      c.metadata_product_type?.toLowerCase() === 'add-on' ||
      c.metadata_product_type?.toLowerCase() === 'addon',
  },
  {
    name: 'Medication (description)',
    category: 'medication',
    priority: 6,
    match: (c) => {
      const desc = (c.description ?? '').toLowerCase();
      return (
        desc.includes('medication') ||
        desc.includes('prescription') ||
        desc.includes('add-on') ||
        desc.includes('addon')
      );
    },
  },
  {
    name: 'Treatment Journey (metadata)',
    category: 'treatment-journey',
    priority: 7,
    match: (c) =>
      c.metadata_product_type?.toLowerCase() === 'treatment-journey' ||
      c.metadata_product_type?.toLowerCase() === 'treatment_journey',
  },
  {
    name: 'Treatment Journey (description)',
    category: 'treatment-journey',
    priority: 8,
    match: (c) => {
      const desc = (c.description ?? '').toLowerCase();
      return (
        desc.includes('treatment journey') ||
        desc.includes('treatment plan') ||
        desc.includes('clinical program')
      );
    },
  },
  {
    name: 'Foundations Membership (has subscription ID)',
    category: 'foundations-membership',
    priority: 9,
    match: (c) => !!c.subscription_id,
  },
  {
    name: 'Foundations Membership (recurring flag)',
    category: 'foundations-membership',
    priority: 10,
    match: (c) => c.is_recurring === true,
  },
  {
    name: 'Foundations Membership (metadata)',
    category: 'foundations-membership',
    priority: 11,
    match: (c) =>
      c.metadata_product_type?.toLowerCase() === 'subscription' ||
      c.metadata_product_type?.toLowerCase() === 'membership' ||
      c.metadata_product_type?.toLowerCase() === 'foundations',
  },
  {
    name: 'Foundations Membership (description)',
    category: 'foundations-membership',
    priority: 12,
    match: (c) => {
      const desc = (c.description ?? '').toLowerCase();
      return (
        desc.includes('subscription') ||
        desc.includes('membership') ||
        desc.includes('foundations') ||
        desc.includes('monthly plan') ||
        desc.includes('recurring')
      );
    },
  },
  {
    name: 'Fallback (foundations membership)',
    category: 'foundations-membership',
    priority: 99,
    match: () => true,
  },
];

/**
 * Classify a raw Stripe charge into a revenue category.
 * Returns the category from the first matching rule.
 */
export function classifyCharge(charge: RawStripeCharge): RevenueCategory {
  const sorted = [...revenueRules].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (rule.match(charge)) {
      return rule.category;
    }
  }
  return 'foundations-membership';
}

/**
 * Map a Stripe charge status to a transaction outcome.
 */
export function mapOutcome(
  status: string
): Transaction['outcome'] {
  switch (status.toLowerCase()) {
    case 'succeeded':
    case 'paid':
      return 'authorized';
    case 'failed':
    case 'declined':
      return 'declined';
    case 'blocked':
      return 'blocked';
    default:
      return 'declined';
  }
}

/**
 * Convert a raw Stripe CSV row into a typed Transaction.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toTransaction(row: Record<string, any>): Transaction {
  const charge: RawStripeCharge = {
    id: row.id ?? '',
    description: row.description ?? null,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? 'aud',
    metadata_product_type: row.metadata_product_type ?? null,
    subscription_id: row.subscription_id ?? null,
    invoice_id: row.invoice_id ?? null,
    is_recurring: row.is_recurring === true || row.is_recurring === 'true',
    customer_email: row.customer_email ?? null,
  };

  return {
    chargeId: charge.id,
    memberId: row.metadata_member_id ?? null,
    createdAt: row.created ?? '',
    amount: charge.amount / 100, // Stripe amounts are in cents
    currency: charge.currency.toUpperCase(),
    type: classifyCharge(charge),
    outcome: mapOutcome(row.status ?? ''),
    failureReason: row.failure_message ?? null,
    cardCountry: row.card_country ?? '',
    cardBrand: row.card_brand ?? '',
    isRecurring: charge.is_recurring ?? false,
  };
}

```

## `src/lib/config/sla-thresholds.ts`

```ts
/**
 * Default SLA thresholds for the TMRW dashboard.
 * Each threshold defines green/amber/red boundaries.
 * Values use the same units as the related metric format.
 */

export interface SlaThreshold {
  metricId: string;
  label: string;
  unit: 'minutes' | 'hours' | 'days' | 'percentage' | 'count';
  /** Values at or better than this are green. */
  green: number;
  /** Values worse than green but at or better than this are amber. */
  amber: number;
  /** Values worse than amber are red. */
  // red is implicit: anything beyond amber
  direction: 'lower-better' | 'higher-better';
}

export const slaThresholds: SlaThreshold[] = [
  // ── Support SLAs ────────────────────────────────────────────────────
  {
    metricId: 'first-reply-time',
    label: 'First Reply Time',
    unit: 'minutes',
    green: 60,
    amber: 120,
    direction: 'lower-better',
  },
  {
    metricId: 'resolution-time',
    label: 'Full Resolution Time',
    unit: 'minutes',
    green: 480,
    amber: 1440,
    direction: 'lower-better',
  },
  {
    metricId: 'csat-score',
    label: 'CSAT Score',
    unit: 'percentage',
    green: 90,
    amber: 75,
    direction: 'higher-better',
  },
  {
    metricId: 'one-touch-resolution-rate',
    label: 'One-Touch Resolution Rate',
    unit: 'percentage',
    green: 50,
    amber: 30,
    direction: 'higher-better',
  },
  {
    metricId: 'ticket-backlog',
    label: 'Ticket Backlog',
    unit: 'count',
    green: 5,
    amber: 15,
    direction: 'lower-better',
  },
  {
    metricId: 'ticket-reopens',
    label: 'Ticket Reopens',
    unit: 'count',
    green: 2,
    amber: 5,
    direction: 'lower-better',
  },

  // ── Member Journey SLAs ─────────────────────────────────────────────
  {
    metricId: 'avg-days-to-dashboard',
    label: 'Avg Days to Dashboard Unlock',
    unit: 'days',
    green: 30,
    amber: 45,
    direction: 'lower-better',
  },
  {
    metricId: 'avg-days-to-insights-call',
    label: 'Avg Days to Insights Call',
    unit: 'days',
    green: 14,
    amber: 21,
    direction: 'lower-better',
  },
  {
    metricId: 'health-story-completion-rate',
    label: 'Health Story Completion',
    unit: 'percentage',
    green: 85,
    amber: 70,
    direction: 'higher-better',
  },
  {
    metricId: 'kit-return-rate',
    label: 'Kit Return Rate',
    unit: 'percentage',
    green: 90,
    amber: 75,
    direction: 'higher-better',
  },
  {
    metricId: 'dashboard-unlock-rate',
    label: 'Dashboard Unlock Rate',
    unit: 'percentage',
    green: 80,
    amber: 65,
    direction: 'higher-better',
  },
  {
    metricId: 'retest-rate',
    label: 'Retest Rate',
    unit: 'percentage',
    green: 70,
    amber: 50,
    direction: 'higher-better',
  },

  // ── Financial SLAs ──────────────────────────────────────────────────
  {
    metricId: 'payment-success-rate',
    label: 'Payment Success Rate',
    unit: 'percentage',
    green: 98,
    amber: 95,
    direction: 'higher-better',
  },
  {
    metricId: 'churn-rate',
    label: 'Churn Rate',
    unit: 'percentage',
    green: 5,
    amber: 8,
    direction: 'lower-better',
  },

  // ── Clinical SLAs ───────────────────────────────────────────────────
  {
    metricId: 'clinician-utilisation',
    label: 'Clinician Utilisation',
    unit: 'percentage',
    green: 80,
    amber: 60,
    direction: 'higher-better',
  },

  // ── Marketing SLAs ──────────────────────────────────────────────────
  {
    metricId: 'lead-conversion-rate',
    label: 'Lead Conversion Rate',
    unit: 'percentage',
    green: 15,
    amber: 10,
    direction: 'higher-better',
  },
];

/**
 * Evaluate a metric value against its SLA threshold.
 * Returns 'green', 'amber', or 'red'.
 */
export function evaluateSla(
  metricId: string,
  value: number
): 'green' | 'amber' | 'red' | null {
  const threshold = slaThresholds.find((t) => t.metricId === metricId);
  if (!threshold) return null;

  if (threshold.direction === 'lower-better') {
    if (value <= threshold.green) return 'green';
    if (value <= threshold.amber) return 'amber';
    return 'red';
  }

  // higher-better
  if (value >= threshold.green) return 'green';
  if (value >= threshold.amber) return 'amber';
  return 'red';
}

/**
 * Get the SLA threshold definition for a given metric.
 */
export function getSlaThreshold(metricId: string): SlaThreshold | undefined {
  return slaThresholds.find((t) => t.metricId === metricId);
}

```

## `src/lib/context/data-context.tsx`

```tsx
'use client'

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { Member, Transaction, Ticket, Clinician, Alert, Rock } from '@/lib/types'
import type { ManualMetrics } from '@/data/mock/manual-metrics'
import type { SnowflakeExport } from '@/lib/types/snowflake-export'
import {
  mockMembers,
  mockTransactions,
  mockTickets,
  mockClinicians,
  mockAlerts,
  mockRocks,
  mockManualMetrics,
} from '@/data/mock'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DataMode = 'demo' | 'actual'

export interface DashboardData {
  members: Member[]
  transactions: Transaction[]
  tickets: Ticket[]
  clinicians: Clinician[]
  manualMetrics: ManualMetrics
  rocks: Rock[]
  alerts: Alert[]
  isUsingMockData: boolean
  dataMode: DataMode
  lastRefreshed: Record<string, string | null>
}

interface DataContextValue extends DashboardData {
  updateSource: (source: string, data: Partial<DashboardData>) => void
  setLastRefreshed: (source: string, timestamp: string) => void
  resetToDemo: () => void
  switchToActual: () => void
  hasActualData: boolean
  isLoading: boolean
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'tmrw-dashboard-data'

function loadFromStorage(): Partial<DashboardData> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveToStorage(data: Partial<DashboardData>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      members: data.members,
      transactions: data.transactions,
      tickets: data.tickets,
      clinicians: data.clinicians,
      lastRefreshed: data.lastRefreshed,
      isUsingMockData: data.isUsingMockData,
      dataMode: data.dataMode,
    }))
  } catch {
    // localStorage full or unavailable
  }
}

// ---------------------------------------------------------------------------
// Default data
// ---------------------------------------------------------------------------

const defaultData: DashboardData = {
  members: mockMembers,
  transactions: mockTransactions,
  tickets: mockTickets,
  clinicians: mockClinicians,
  manualMetrics: mockManualMetrics,
  rocks: mockRocks,
  alerts: mockAlerts,
  isUsingMockData: true,
  dataMode: 'demo',
  lastRefreshed: {
    tableau: '2026-03-05T09:00:00.000Z',
    hubspot: '2026-03-06T14:30:00.000Z',
    stripe: '2026-03-07T06:00:00.000Z',
    zendesk: '2026-03-06T22:15:00.000Z',
  },
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Snowflake daily export (dormant until env vars set)
// ---------------------------------------------------------------------------

const SNOWFLAKE_EXPORT_URL = process.env.NEXT_PUBLIC_SNOWFLAKE_EXPORT_URL || null

function mapSnowflakeMember(m: SnowflakeExport['members'][number]): Member {
  return m as unknown as Member
}
function mapSnowflakeTransaction(t: SnowflakeExport['transactions'][number]): Transaction {
  return t as unknown as Transaction
}
function mapSnowflakeTicket(t: SnowflakeExport['tickets'][number]): Ticket {
  return t as unknown as Ticket
}
function mapSnowflakeClinician(c: SnowflakeExport['clinicians'][number]): Clinician {
  return c as unknown as Clinician
}

const DataContext = createContext<DataContextValue>({
  ...defaultData,
  updateSource: () => {},
  setLastRefreshed: () => {},
  resetToDemo: () => {},
  switchToActual: () => {},
  hasActualData: false,
  isLoading: true,
})

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData>(defaultData)
  const [isLoading, setIsLoading] = useState(true)

  // Load persisted data on mount — try server first, localStorage fallback
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/data/latest')
        if (res.ok) {
          const sources = await res.json()
          if (sources && Object.keys(sources).length > 0) {
            const updates: Partial<DashboardData> = { isUsingMockData: false, lastRefreshed: {} }
            if (sources.tableau) {
              updates.members = sources.tableau.data
              updates.lastRefreshed!.tableau = sources.tableau.timestamp
            }
            if (sources.hubspot) {
              updates.lastRefreshed!.hubspot = sources.hubspot.timestamp
            }
            if (sources.stripe) {
              updates.transactions = sources.stripe.data
              updates.lastRefreshed!.stripe = sources.stripe.timestamp
            }
            if (sources.zendesk) {
              updates.tickets = sources.zendesk.data
              updates.lastRefreshed!.zendesk = sources.zendesk.timestamp
            }
            if (Object.keys(updates.lastRefreshed || {}).length > 0) {
              setData(prev => ({
                ...prev,
                ...updates,
                dataMode: 'actual',
                rocks: prev.rocks,
                alerts: prev.alerts,
                manualMetrics: prev.manualMetrics,
              }))
              setIsLoading(false)
              return
            }
          }
        }
      } catch {
        // Server unavailable — fall through to localStorage
      }

      const stored = loadFromStorage()
      if (stored && !stored.isUsingMockData) {
        setData((prev) => ({
          ...prev,
          ...stored,
          dataMode: 'actual',
          rocks: prev.rocks,
          alerts: prev.alerts,
          manualMetrics: prev.manualMetrics,
        }))
      }
      setIsLoading(false)
    }

    loadData()
  }, [])

  const hasActualData = useMemo(() => {
    // Check in-memory state first — but only count non-null timestamps when
    // the dashboard is actually in "actual" mode (demo mode now ships its own
    // placeholder timestamps for display purposes).
    if (data.dataMode === 'actual' && Object.values(data.lastRefreshed).some(ts => ts !== null)) return true
    // Also check localStorage (actual data is preserved there when switching to demo)
    const stored = loadFromStorage()
    if (stored?.lastRefreshed && stored?.dataMode === 'actual') {
      return Object.values(stored.lastRefreshed).some(ts => ts !== null)
    }
    return false
  }, [data.lastRefreshed, data.dataMode])

  const updateSource = useCallback((source: string, incoming: Partial<DashboardData>) => {
    setData((prev) => {
      const next = {
        ...prev,
        ...incoming,
        isUsingMockData: false,
        dataMode: 'actual' as DataMode,
        lastRefreshed: {
          ...prev.lastRefreshed,
          [source]: new Date().toISOString(),
        },
      }
      saveToStorage(next)
      // Also persist to server (fire-and-forget)
      fetch('/api/data/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, data: incoming, timestamp: new Date().toISOString() }),
      }).catch(() => {})
      return next
    })
  }, [])

  const setLastRefreshed = useCallback((source: string, timestamp: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        lastRefreshed: { ...prev.lastRefreshed, [source]: timestamp },
      }
      saveToStorage(next)
      return next
    })
  }, [])

  const resetToDemo = useCallback(() => {
    setData({
      ...defaultData,
      dataMode: 'demo',
    })
    // Don't clear localStorage — preserve actual data for switching back
  }, [])

  const switchToActual = useCallback(() => {
    const stored = loadFromStorage()
    if (stored) {
      setData(prev => ({
        ...prev,
        ...stored,
        dataMode: 'actual',
        rocks: prev.rocks,
        alerts: prev.alerts,
        manualMetrics: prev.manualMetrics,
      }))
    }
  }, [])

  // Snowflake daily export auto-fetch (dormant until env vars set)
  const fetchSnowflakeExport = useCallback(async () => {
    if (!SNOWFLAKE_EXPORT_URL) return

    try {
      const res = await fetch(SNOWFLAKE_EXPORT_URL, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SNOWFLAKE_TOKEN || ''}`,
        },
      })

      if (!res.ok) throw new Error(`Snowflake fetch failed: ${res.status}`)

      const exported: SnowflakeExport = await res.json()

      const members = exported.members.map(mapSnowflakeMember)
      const transactions = exported.transactions.map(mapSnowflakeTransaction)
      const tickets = exported.tickets.map(mapSnowflakeTicket)
      const clinicians = exported.clinicians.map(mapSnowflakeClinician)

      setData(prev => ({
        ...prev,
        members,
        transactions,
        tickets,
        clinicians,
        isUsingMockData: false,
        dataMode: 'actual',
        lastRefreshed: exported.meta.sourceFreshness,
      }))

      saveToStorage({ members, transactions, tickets, clinicians, lastRefreshed: exported.meta.sourceFreshness, isUsingMockData: false, dataMode: 'actual' })

    } catch (err) {
      console.error('Snowflake export fetch failed:', err)
      // Fall back to localStorage or mock data
    }
  }, [])

  // Auto-fetch on mount if Snowflake URL is configured
  useEffect(() => {
    if (SNOWFLAKE_EXPORT_URL) {
      fetchSnowflakeExport()
    }
  }, [fetchSnowflakeExport])

  return (
    <DataContext.Provider value={{ ...data, updateSource, setLastRefreshed, resetToDemo, switchToActual, hasActualData, isLoading }}>
      {children}
    </DataContext.Provider>
  )
}

export function useDashboardData() {
  return useContext(DataContext)
}

```

## `src/lib/engines/alert-engine.ts`

```ts
/**
 * Alert engine for the TMRW dashboard.
 * Generates alerts from current vs previous metric values and member/ticket state.
 */

import type {
  Alert,
  AlertType,
  AlertSeverity,
  Member,
  Ticket,
  Transaction,
  MetricValue,
  Status,
} from '@/lib/types';

let alertCounter = 0;

function nextAlertId(): string {
  alertCounter++;
  return `alert-${Date.now()}-${alertCounter}`;
}

interface AlertInput {
  currentMetrics: MetricValue[];
  previousMetrics: MetricValue[];
  members: Member[];
  tickets: Ticket[];
  transactions: Transaction[];
}

/**
 * Generate all alerts based on current data state.
 *
 * Rules:
 * - Metric status change (green->amber, amber->red) = medium/high severity
 * - Recovery (red->amber, amber->green) = low severity (positive)
 * - Stalled member (registered >30 days, no dashboard) = medium
 * - Payment failure spike >5% = high
 * - Support backlog >20 open tickets = medium
 * - Clinician overload >60 cases = high
 */
export function generateAlerts(input: AlertInput): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  // 1. Metric status changes
  alerts.push(...detectStatusChanges(input.currentMetrics, input.previousMetrics, now));

  // 2. Stalled members
  alerts.push(...detectStalledMembers(input.members, now));

  // 3. Payment failure spike
  alerts.push(...detectPaymentFailureSpike(input.transactions, now));

  // 4. Support backlog
  alerts.push(...detectSupportBacklog(input.tickets, now));

  // 5. Clinician overload
  alerts.push(...detectClinicianOverload(input.members, now));

  return alerts;
}

function detectStatusChanges(
  current: MetricValue[],
  previous: MetricValue[],
  now: string
): Alert[] {
  const alerts: Alert[] = [];
  const prevMap = new Map(previous.map((m) => [m.metricId, m]));

  for (const metric of current) {
    const prev = prevMap.get(metric.metricId);
    if (!prev) continue;

    const prevStatus = prev.status;
    const currStatus = metric.status;

    if (prevStatus === currStatus) continue;
    if (prevStatus === 'grey' || currStatus === 'grey') continue;

    // Deterioration
    if (isDeteriorating(prevStatus, currStatus)) {
      const severity = currStatus === 'red' ? 'high' : 'medium';
      alerts.push({
        id: nextAlertId(),
        type: 'status-change',
        severity,
        title: `${metric.metricId} moved from ${prevStatus} to ${currStatus}`,
        detail: `Metric "${metric.metricId}" deteriorated from ${prevStatus} to ${currStatus}. Current value: ${metric.current}, target: ${metric.target}.`,
        metricId: metric.metricId,
        functionalArea: inferFunctionalArea(metric.metricId),
        createdAt: now,
        acknowledged: false,
      });
    }

    // Recovery
    if (isRecovering(prevStatus, currStatus)) {
      alerts.push({
        id: nextAlertId(),
        type: 'metric-recovery',
        severity: 'low',
        title: `${metric.metricId} recovered from ${prevStatus} to ${currStatus}`,
        detail: `Metric "${metric.metricId}" improved from ${prevStatus} to ${currStatus}. Current value: ${metric.current}.`,
        metricId: metric.metricId,
        functionalArea: inferFunctionalArea(metric.metricId),
        createdAt: now,
        acknowledged: false,
      });
    }
  }

  return alerts;
}

function isDeteriorating(prev: Status, curr: Status): boolean {
  const order: Record<Status, number> = { green: 0, amber: 1, red: 2, grey: -1 };
  return order[curr] > order[prev];
}

function isRecovering(prev: Status, curr: Status): boolean {
  const order: Record<Status, number> = { green: 0, amber: 1, red: 2, grey: -1 };
  return order[curr] < order[prev] && order[prev] >= 0 && order[curr] >= 0;
}

function detectStalledMembers(members: Member[], now: string): Alert[] {
  const alerts: Alert[] = [];

  const stalled = members.filter(
    (m) =>
      m.journeyStage === 'registered' &&
      m.daysSinceRegistration > 30 &&
      !m.dashboardUnlocked &&
      m.caseStatus === 'Open'
  );

  if (stalled.length > 0) {
    alerts.push({
      id: nextAlertId(),
      type: 'stalled-member',
      severity: 'medium',
      title: `${stalled.length} member(s) stalled for 30+ days`,
      detail: `${stalled.length} member(s) registered over 30 days ago without reaching dashboard unlock. Earliest registration: ${stalled.reduce(
        (min, m) => (m.daysSinceRegistration > min ? m.daysSinceRegistration : min),
        0
      )} days ago.`,
      metricId: 'stalled-members',
      functionalArea: 'members',
      createdAt: now,
      acknowledged: false,
    });
  }

  return alerts;
}

function detectPaymentFailureSpike(
  transactions: Transaction[],
  now: string
): Alert[] {
  const alerts: Alert[] = [];

  if (transactions.length === 0) return alerts;

  const failed = transactions.filter(
    (t) => t.outcome === 'declined' || t.outcome === 'blocked'
  );
  const failureRate = (failed.length / transactions.length) * 100;

  if (failureRate > 5) {
    alerts.push({
      id: nextAlertId(),
      type: 'payment-spike',
      severity: 'high',
      title: `Payment failure rate at ${failureRate.toFixed(1)}%`,
      detail: `${failed.length} of ${transactions.length} transactions failed (${failureRate.toFixed(1)}%). This exceeds the 5% threshold.`,
      metricId: 'payment-success-rate',
      functionalArea: 'financial',
      createdAt: now,
      acknowledged: false,
    });
  }

  return alerts;
}

function detectSupportBacklog(tickets: Ticket[], now: string): Alert[] {
  const alerts: Alert[] = [];

  const openTickets = tickets.filter(
    (t) => t.status === 'Open' || t.status === 'Pending'
  );

  if (openTickets.length > 20) {
    alerts.push({
      id: nextAlertId(),
      type: 'support-backlog',
      severity: 'medium',
      title: `${openTickets.length} open support tickets`,
      detail: `Support backlog has ${openTickets.length} open/pending tickets, exceeding the 20-ticket threshold.`,
      metricId: 'open-tickets',
      functionalArea: 'support',
      createdAt: now,
      acknowledged: false,
    });
  }

  return alerts;
}

function detectClinicianOverload(members: Member[], now: string): Alert[] {
  const alerts: Alert[] = [];

  // Group active cases by clinician
  const casesByClinician = new Map<string, number>();
  for (const m of members) {
    if (m.caseStatus !== 'Open' || !m.primaryClinician) continue;
    const count = casesByClinician.get(m.primaryClinician) ?? 0;
    casesByClinician.set(m.primaryClinician, count + 1);
  }

  casesByClinician.forEach((count, clinician) => {
    if (count > 60) {
      alerts.push({
        id: nextAlertId(),
        type: 'clinician-overload',
        severity: 'high',
        title: `${clinician} has ${count} active cases`,
        detail: `Clinician "${clinician}" is managing ${count} active cases, exceeding the 60-case capacity threshold.`,
        metricId: null,
        functionalArea: 'clinical',
        createdAt: now,
        acknowledged: false,
      });
    }
  });

  return alerts;
}

function inferFunctionalArea(
  metricId: string
): Alert['functionalArea'] {
  if (
    metricId.includes('revenue') ||
    metricId.includes('mrr') ||
    metricId.includes('payment') ||
    metricId.includes('arpu') ||
    metricId.includes('ltv') ||
    metricId.includes('churn')
  ) {
    return 'financial';
  }
  if (
    metricId.includes('member') ||
    metricId.includes('dashboard') ||
    metricId.includes('journey') ||
    metricId.includes('health-story') ||
    metricId.includes('kit') ||
    metricId.includes('retest') ||
    metricId.includes('stalled')
  ) {
    return 'members';
  }
  if (
    metricId.includes('clinician') ||
    metricId.includes('insights') ||
    metricId.includes('plan') ||
    metricId.includes('better-tomorrow')
  ) {
    return 'clinical';
  }
  if (
    metricId.includes('ticket') ||
    metricId.includes('csat') ||
    metricId.includes('reply') ||
    metricId.includes('resolution') ||
    metricId.includes('reopen')
  ) {
    return 'support';
  }
  if (
    metricId.includes('lead') ||
    metricId.includes('cac') ||
    metricId.includes('email-sequence')
  ) {
    return 'marketing';
  }
  return 'strategy';
}

```

## `src/lib/engines/derivation-engine.ts`

```ts
/**
 * Derivation engine for the TMRW dashboard.
 * Computes derived metrics from raw processed data.
 */

import type { Member, Transaction, Ticket } from '@/lib/types';

// ── Financial Metrics ──────────────────────────────────────────────────

/**
 * Compute Monthly Recurring Revenue from transactions.
 * Sums recurring subscription amounts from the most recent 30-day window.
 */
export function computeMRR(transactions: Transaction[]): number {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return transactions
    .filter(
      (t) =>
        t.outcome === 'authorized' &&
        t.isRecurring &&
        new Date(t.createdAt) >= thirtyDaysAgo &&
        new Date(t.createdAt) <= now
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Compute revenue breakdown by transaction type.
 */
export function computeRevenueByType(
  transactions: Transaction[]
): Record<string, number> {
  const breakdown: Record<string, number> = {
    'foundations-membership': 0,
    'advanced-testing': 0,
    supplements: 0,
    medication: 0,
    'treatment-journey': 0,
  };

  for (const t of transactions) {
    if (t.outcome !== 'authorized') continue;
    breakdown[t.type] = (breakdown[t.type] ?? 0) + t.amount;
  }

  return breakdown;
}

/**
 * Compute monthly revenue totals.
 * Returns a map of YYYY-MM -> total revenue.
 */
export function computeRevenueByMonth(
  transactions: Transaction[]
): Record<string, number> {
  const monthly: Record<string, number> = {};

  for (const t of transactions) {
    if (t.outcome !== 'authorized') continue;
    const month = t.createdAt.slice(0, 7); // YYYY-MM
    monthly[month] = (monthly[month] ?? 0) + t.amount;
  }

  return monthly;
}

// ── Member Metrics ─────────────────────────────────────────────────────

/**
 * Compute monthly churn rate.
 * Churn = members who became inactive/churned during the period / total active at start.
 */
export function computeChurnRate(
  members: Member[],
  periodStart: string,
  periodEnd: string
): number {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  // Members who were active at the start of the period
  const activeAtStart = members.filter((m) => {
    const created = new Date(m.createdAt);
    return created < start && m.caseStatus !== 'Inactive';
  });

  if (activeAtStart.length === 0) return 0;

  // Members who churned during the period
  // We approximate by checking if case is now Inactive/Closed
  // and the member was created before the period
  const churned = activeAtStart.filter(
    (m) => m.journeyStage === 'churned' || m.caseStatus === 'Inactive'
  );

  return (churned.length / activeAtStart.length) * 100;
}

/**
 * Compute the percentage of members who have unlocked their dashboard.
 */
export function computeDashboardUnlockRate(members: Member[]): number {
  const eligible = members.filter(
    (m) => m.type === 'Customer' && m.caseStatus !== 'Inactive'
  );
  if (eligible.length === 0) return 0;

  const unlocked = eligible.filter((m) => m.dashboardUnlocked);
  return (unlocked.length / eligible.length) * 100;
}

/**
 * Compute average days from registration to dashboard unlock.
 */
export function computeAvgRegToDashboard(members: Member[]): number {
  const withDashboard = members.filter(
    (m) => m.dashboardUnlocked && m.dashboardUnlockedAt && m.createdAt
  );

  if (withDashboard.length === 0) return 0;

  const totalDays = withDashboard.reduce((sum, m) => {
    const created = new Date(m.createdAt).getTime();
    const unlocked = new Date(m.dashboardUnlockedAt!).getTime();
    const days = Math.max(0, (unlocked - created) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);

  return totalDays / withDashboard.length;
}

/**
 * Compute total Better Tomorrows: sum of active days since dashboard unlock
 * across all members with unlocked dashboards.
 */
export function computeBetterTomorrows(members: Member[]): number {
  return members.reduce((sum, m) => sum + m.betterTomorrows, 0);
}

/**
 * Compute count of members waiting for their dashboard (registered but not unlocked).
 */
export function computeMembersWaitingForDashboard(members: Member[]): number {
  return members.filter(
    (m) =>
      !m.dashboardUnlocked &&
      m.caseStatus === 'Open' &&
      m.type === 'Customer'
  ).length;
}

/**
 * Compute supplement attach rate: percentage of active customers with add-ons.
 */
export function computeSupplementAttachRate(members: Member[]): number {
  const active = members.filter(
    (m) => m.caseStatus === 'Open' && m.type === 'Customer'
  );
  if (active.length === 0) return 0;

  const withSupplements = active.filter((m) => m.addOns.length > 0);
  return (withSupplements.length / active.length) * 100;
}

/**
 * Compute pipeline timing segments.
 * Returns average days spent in each journey stage.
 */
export function computePipelineTimings(
  members: Member[]
): Record<string, number> {
  const stages = [
    'registered',
    'health-story-complete',
    'kit-dispatched',
    'kit-returned',
    'awaiting-results',
    'dashboard-unlocked',
    'insights-call-complete',
    'active-plan',
    'retest-due',
  ] as const;

  const timings: Record<string, number> = {};

  // Use average days since registration grouped by current stage
  for (const stage of stages) {
    const inStage = members.filter((m) => m.journeyStage === stage);
    if (inStage.length === 0) {
      timings[stage] = 0;
      continue;
    }
    timings[stage] =
      inStage.reduce((sum, m) => sum + m.daysSinceRegistration, 0) /
      inStage.length;
  }

  return timings;
}

// ── Support Metrics ────────────────────────────────────────────────────

/**
 * Compute CSAT score from tickets.
 * CSAT = (Good ratings / Total rated) * 100.
 */
export function computeCSATScore(tickets: Ticket[]): number {
  const rated = tickets.filter(
    (t) => t.satisfaction === 'Good' || t.satisfaction === 'Bad'
  );

  if (rated.length === 0) return 0;

  const good = rated.filter((t) => t.satisfaction === 'Good').length;
  return (good / rated.length) * 100;
}

/**
 * Compute average first reply time in hours.
 */
export function computeAvgFirstReply(tickets: Ticket[]): number {
  const withReply = tickets.filter((t) => t.firstReplyMinutes !== null);
  if (withReply.length === 0) return 0;

  const totalMinutes = withReply.reduce(
    (sum, t) => sum + (t.firstReplyMinutes ?? 0),
    0
  );
  return totalMinutes / withReply.length / 60; // Convert minutes to hours
}

/**
 * Compute ticket resolution rate for a period.
 * Resolution rate = tickets solved in period / tickets created in period.
 */
export function computeTicketResolutionRate(
  tickets: Ticket[],
  periodStart: string,
  periodEnd: string
): number {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  const createdInPeriod = tickets.filter((t) => {
    const created = new Date(t.createdAt);
    return created >= start && created <= end;
  });

  if (createdInPeriod.length === 0) return 0;

  const solvedInPeriod = createdInPeriod.filter(
    (t) => t.status === 'Solved' || t.status === 'Closed'
  );

  return (solvedInPeriod.length / createdInPeriod.length) * 100;
}

```

## `src/lib/engines/health-score-engine.ts`

```ts
/**
 * Health score engine for the TMRW dashboard.
 * Computes individual member health scores based on journey progress,
 * payment status, support tickets, and activity recency.
 */

import type { Member, HealthScore } from '@/lib/types';

interface HealthFactors {
  journeyScore: number;   // 0-100
  paymentScore: number;   // 0-100
  supportScore: number;   // 0-100
  activityScore: number;  // 0-100
}

const WEIGHTS = {
  journey: 0.35,
  payment: 0.25,
  support: 0.20,
  activity: 0.20,
} as const;

const THRESHOLDS = {
  healthy: 70,
  attention: 40,
  // Below 40 = at-risk
} as const;

/**
 * Compute a health score for a single member.
 *
 * Factors:
 * - Journey progress: how far through the member journey
 * - Payment status: successful payments, no failures
 * - Support tickets: low ticket volume, good CSAT
 * - Activity recency: recent engagement
 *
 * Returns: 'healthy' | 'attention' | 'at-risk' | 'unknown'
 */
export function computeHealthScore(member: Member): HealthScore {
  // If the member has no meaningful data, return unknown
  if (!member.createdAt || member.caseStatus === 'Inactive') {
    return 'unknown';
  }

  // Churned members are at-risk by definition
  if (member.journeyStage === 'churned') {
    return 'at-risk';
  }

  const factors = computeFactors(member);
  const composite =
    factors.journeyScore * WEIGHTS.journey +
    factors.paymentScore * WEIGHTS.payment +
    factors.supportScore * WEIGHTS.support +
    factors.activityScore * WEIGHTS.activity;

  if (composite >= THRESHOLDS.healthy) return 'healthy';
  if (composite >= THRESHOLDS.attention) return 'attention';
  return 'at-risk';
}

function computeFactors(member: Member): HealthFactors {
  return {
    journeyScore: scoreJourney(member),
    paymentScore: scorePayment(member),
    supportScore: scoreSupport(member),
    activityScore: scoreActivity(member),
  };
}

/**
 * Score based on journey stage progression.
 * Later stages = higher score.
 */
function scoreJourney(member: Member): number {
  const stageScores: Record<string, number> = {
    registered: 20,
    'health-story-complete': 35,
    'kit-dispatched': 45,
    'kit-returned': 55,
    'awaiting-results': 60,
    'dashboard-unlocked': 75,
    'insights-call-complete': 85,
    'active-plan': 95,
    'retest-due': 90,
    churned: 0,
    inactive: 10,
  };

  const baseScore = stageScores[member.journeyStage] ?? 10;

  // Penalise if stalled (registered for a long time without progress)
  if (member.journeyStage === 'registered' && member.daysSinceRegistration > 30) {
    return Math.max(0, baseScore - 15);
  }

  return baseScore;
}

/**
 * Score based on payment history.
 * Successful payments and recurring = high score.
 * No payments or failures = low score.
 */
function scorePayment(member: Member): number {
  // No transactions yet - neutral (not penalised, but not positive)
  if (member.transactionCount === 0) return 50;

  let score = 60; // Base for having any payment

  // Bonus for MRR (active subscription)
  if (member.mrr > 0) score += 20;

  // Bonus for multiple successful transactions
  if (member.transactionCount >= 3) score += 10;

  // Bonus for recent payment
  if (member.lastPaymentDate) {
    const daysSincePayment = daysBetween(
      member.lastPaymentDate,
      new Date().toISOString()
    );
    if (daysSincePayment <= 30) score += 10;
    else if (daysSincePayment > 90) score -= 20;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Score based on support interaction quality.
 * Few tickets + good CSAT = high score.
 * Many open tickets or bad CSAT = low score.
 */
function scoreSupport(member: Member): number {
  // No support interaction - neutral
  if (member.ticketCount === 0) return 70;

  let score = 60;

  // Penalise for open tickets
  if (member.openTickets > 0) score -= member.openTickets * 10;

  // CSAT bonus/penalty
  if (member.csat !== null) {
    if (member.csat >= 90) score += 20;
    else if (member.csat >= 70) score += 10;
    else if (member.csat < 50) score -= 20;
  }

  // High ticket volume penalty
  if (member.ticketCount > 5) score -= 10;

  // Slow resolution penalty
  if (member.avgResolutionTime !== null && member.avgResolutionTime > 1440) {
    score -= 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Score based on activity recency.
 * Recent engagement = high score.
 * Long inactivity = low score.
 */
function scoreActivity(member: Member): number {
  const now = new Date();
  let score = 50;

  // Dashboard engagement
  if (member.dashboardUnlocked) {
    score += 20;

    if (member.dashboardUnlockedAt) {
      const daysSinceUnlock = daysBetween(
        member.dashboardUnlockedAt,
        now.toISOString()
      );
      // Recent unlock is very positive
      if (daysSinceUnlock <= 14) score += 15;
      else if (daysSinceUnlock <= 30) score += 10;
    }
  }

  // Retest engagement
  if (member.nextRetestDate) {
    const daysUntilRetest = daysBetween(
      now.toISOString(),
      member.nextRetestDate
    );
    if (daysUntilRetest > 0 && daysUntilRetest <= 30) {
      score += 10; // Retest coming up - engaged
    }
  }

  // Last test date recency
  if (member.lastTestDate) {
    const daysSinceTest = daysBetween(member.lastTestDate, now.toISOString());
    if (daysSinceTest <= 60) score += 10;
    else if (daysSinceTest > 180) score -= 15;
  }

  // Penalise very new members with no activity
  if (
    member.daysSinceRegistration > 14 &&
    !member.dashboardUnlocked &&
    member.transactionCount === 0
  ) {
    score -= 20;
  }

  return Math.min(100, Math.max(0, score));
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

/**
 * Batch-compute health scores for all members.
 * Mutates members in place, updating the healthScore field.
 * Returns the members array for convenience.
 */
export function computeAllHealthScores(members: Member[]): Member[] {
  for (const member of members) {
    member.healthScore = computeHealthScore(member);
  }
  return members;
}

```

## `src/lib/engines/question-engine.ts`

```ts
/**
 * Question engine for the TMRW dashboard.
 * Aggregates functional data into Q1-Q5 composite scores per the strategy spec.
 */

import type { Question, MetricValue, Status } from '@/lib/types';
import { computeQuestionStatus } from './status-engine';

/**
 * Metric IDs mapped to each strategic question.
 */
const QUESTION_METRIC_MAP: Record<
  string,
  { primary: string[]; secondary: string[] }
> = {
  Q1: {
    primary: [
      'better-tomorrows-avg',    // Biomarker improvement proxy
    ],
    secondary: [
      'retest-rate',             // Re-engagement signal
      'active-plans',            // Active health plans
    ],
  },
  Q2: {
    primary: [
      'csat-score',              // Customer satisfaction
      'churn-rate',              // Retention
    ],
    secondary: [
      'new-members',             // New member capacity
      'net-member-growth',       // Growth signal
      'dashboard-unlock-rate',   // Journey completion
    ],
  },
  Q3: {
    primary: [
      // Channel partners and corporate partners are manual-entry metrics
      // They will show as grey until manual data is entered
    ],
    secondary: [
      'lead-conversion-rate',    // Proxy for channel effectiveness
      'leads',                   // Pipeline health
    ],
  },
  Q4: {
    primary: [
      'avg-days-to-dashboard',   // Reg -> dashboard time
      'avg-days-to-insights-call', // Insight -> change time
      'clinician-utilisation',   // Members per clinical FTE
    ],
    secondary: [
      'first-reply-time',        // Operational responsiveness
      'resolution-time',         // Delivery speed
      'health-story-completion-rate',
      'kit-return-rate',
    ],
  },
  Q5: {
    primary: [
      'cac',                     // Blended CAC
      'arpu',                    // Revenue per member (proxy for CM/member)
      'mrr',                     // Revenue health
    ],
    secondary: [
      'payment-success-rate',    // Payment reliability
      'total-revenue',           // Top-line
      'ltv',                     // Lifetime value
    ],
  },
};

const QUESTION_DEFINITIONS: {
  id: string;
  number: number;
  text: string;
  framing: string;
  functionalAreas: string[];
  whatHasToBeTrueItems: string[];
}[] = [
  {
    id: 'Q1',
    number: 1,
    text: 'Does TMRW demonstrably improve health outcomes?',
    framing: 'Prove it works',
    functionalAreas: ['clinical', 'members'],
    whatHasToBeTrueItems: [
      'Biomarker data shows measurable improvement',
      'Biological age delta trends positive',
      'Members complete retests to validate progress',
      'Clinical protocols drive measurable change',
    ],
  },
  {
    id: 'Q2',
    number: 2,
    text: 'Do customers love us enough to stay and refer?',
    framing: 'Customer love',
    functionalAreas: ['support', 'members'],
    whatHasToBeTrueItems: [
      'CSAT consistently above 90%',
      'Churn rate below 5% monthly',
      'NPS supports organic referral growth',
      'New member pipeline remains healthy',
    ],
  },
  {
    id: 'Q3',
    number: 3,
    text: 'Are we building a defensible market position?',
    framing: 'Defensible moat',
    functionalAreas: ['marketing', 'strategy'],
    whatHasToBeTrueItems: [
      'Channel partnerships generate qualified leads',
      'Corporate partnerships provide recurring revenue',
      'Brand differentiation is clear and measurable',
      'Data moat deepens with each member',
    ],
  },
  {
    id: 'Q4',
    number: 4,
    text: 'Can we deliver reliably at increasing scale?',
    framing: 'Deliver reliably',
    functionalAreas: ['clinical', 'support', 'members'],
    whatHasToBeTrueItems: [
      'Registration to dashboard time under 30 days',
      'Insight-to-change time under 14 days',
      'Clinical FTE ratio supports growth',
      'Support response times within SLA',
    ],
  },
  {
    id: 'Q5',
    number: 5,
    text: 'Do the unit economics support sustainable growth?',
    framing: 'Economics right',
    functionalAreas: ['financial', 'marketing'],
    whatHasToBeTrueItems: [
      'Blended CAC recoverable within 6 months',
      'Contribution margin per member is positive',
      'MRR growth rate supports runway',
      'Payment success rate above 98%',
    ],
  },
];

/**
 * Compute composite question scores from available metric values.
 *
 * @param metricValues - All available MetricValue records
 * @returns Array of Question objects with computed statuses
 */
export function computeQuestionScores(metricValues: MetricValue[]): Question[] {
  const metricMap = new Map(metricValues.map((m) => [m.metricId, m]));

  return QUESTION_DEFINITIONS.map((def) => {
    const mapping = QUESTION_METRIC_MAP[def.id];
    if (!mapping) {
      return {
        ...def,
        primaryMetrics: [],
        secondaryMetrics: [],
        status: 'grey' as Status,
      };
    }

    const primaryMetrics = mapping.primary
      .map((id) => metricMap.get(id))
      .filter((m): m is MetricValue => m !== undefined);

    const secondaryMetrics = mapping.secondary
      .map((id) => metricMap.get(id))
      .filter((m): m is MetricValue => m !== undefined);

    const status = computeQuestionStatus(primaryMetrics, secondaryMetrics);

    return {
      ...def,
      primaryMetrics,
      secondaryMetrics,
      status,
    };
  });
}

```

## `src/lib/engines/status-engine.ts`

```ts
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

```

## `src/lib/processors/entity-linker.ts`

```ts
/**
 * Cross-source entity linking for the TMRW dashboard.
 * Matches records across HubSpot, Zendesk, Stripe, and Tableau via email.
 */

import type { Member, Ticket, Transaction } from '@/lib/types';
import type { TableauMemberRaw } from './tableau-processor';

/**
 * Build a lookup map from email address to member ID.
 * Handles duplicate emails by keeping the first match (earliest record).
 */
export function buildEmailLookup(members: Member[]): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const member of members) {
    const email = member.email?.trim().toLowerCase();
    if (email && !lookup.has(email)) {
      lookup.set(email, member.id);
    }
  }

  return lookup;
}

/**
 * Link Zendesk tickets to members via requester email.
 * Mutates tickets in place, setting the memberId field.
 * Returns the count of successfully linked tickets.
 */
export function linkTicketsToMembers(
  tickets: Ticket[],
  members: Member[],
  ticketEmailMap?: Map<string, string>
): number {
  const emailLookup = buildEmailLookup(members);
  let linked = 0;

  for (const ticket of tickets) {
    // If a ticket→email map is provided (from raw CSV data), use it
    const ticketEmail = ticketEmailMap?.get(ticket.id)?.trim().toLowerCase();
    if (ticketEmail && emailLookup.has(ticketEmail)) {
      ticket.memberId = emailLookup.get(ticketEmail)!;
      linked++;
      continue;
    }

    // If the ticket already has a memberId, skip
    if (ticket.memberId) {
      linked++;
    }
  }

  // Aggregate ticket stats back onto members
  const memberTickets = new Map<string, Ticket[]>();
  for (const ticket of tickets) {
    if (!ticket.memberId) continue;
    const existing = memberTickets.get(ticket.memberId) ?? [];
    existing.push(ticket);
    memberTickets.set(ticket.memberId, existing);
  }

  for (const member of members) {
    const mTickets = memberTickets.get(member.id);
    if (!mTickets || mTickets.length === 0) continue;

    member.ticketCount = mTickets.length;
    member.openTickets = mTickets.filter(
      (t) => t.status === 'Open' || t.status === 'Pending'
    ).length;

    const resolved = mTickets.filter((t) => t.fullResolutionMinutes !== null);
    member.avgResolutionTime =
      resolved.length > 0
        ? resolved.reduce((sum, t) => sum + (t.fullResolutionMinutes ?? 0), 0) /
          resolved.length
        : null;

    const sorted = [...mTickets].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    member.lastTicketDate = sorted[0]?.createdAt ?? null;

    const rated = mTickets.filter(
      (t) => t.satisfaction === 'Good' || t.satisfaction === 'Bad'
    );
    member.csat =
      rated.length > 0
        ? (rated.filter((t) => t.satisfaction === 'Good').length / rated.length) * 100
        : null;
  }

  return linked;
}

/**
 * Link transactions to members and aggregate financial data.
 * Mutates members in place, updating revenue fields.
 * Returns the count of successfully linked transactions.
 */
export function linkTransactionsToMembers(
  transactions: Transaction[],
  members: Member[],
  transactionEmailMap?: Map<string, string>
): number {
  const emailLookup = buildEmailLookup(members);
  let linked = 0;

  for (const tx of transactions) {
    const txEmail = transactionEmailMap?.get(tx.chargeId)?.trim().toLowerCase();
    if (txEmail && emailLookup.has(txEmail)) {
      tx.memberId = emailLookup.get(txEmail)!;
      linked++;
    } else if (tx.memberId) {
      linked++;
    }
  }

  // Aggregate transaction stats onto members
  const memberTxns = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (!tx.memberId) continue;
    const existing = memberTxns.get(tx.memberId) ?? [];
    existing.push(tx);
    memberTxns.set(tx.memberId, existing);
  }

  for (const member of members) {
    const mTxns = memberTxns.get(member.id);
    if (!mTxns || mTxns.length === 0) continue;

    const successful = mTxns.filter((t) => t.outcome === 'authorized');
    member.totalRevenue = successful.reduce((sum, t) => sum + t.amount, 0);
    member.transactionCount = successful.length;

    const sorted = [...successful].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    member.firstPaymentDate = sorted[0]?.createdAt ?? null;
    member.lastPaymentDate = sorted[sorted.length - 1]?.createdAt ?? null;

    // Estimate MRR from recurring transactions in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRecurring = successful.filter(
      (t) => t.isRecurring && new Date(t.createdAt) >= thirtyDaysAgo
    );
    member.mrr = recentRecurring.reduce((sum, t) => sum + t.amount, 0);
  }

  return linked;
}

/**
 * Link HubSpot members to Tableau member data via email.
 * Enriches members with Tableau-derived measures and journey stages.
 * Returns the count of successfully linked records.
 */
export function linkHubspotToTableau(
  members: Member[],
  tableauMembers: TableauMemberRaw[]
): number {
  // Build email lookup from Tableau data
  const tableauByEmail = new Map<string, TableauMemberRaw>();
  for (const tm of tableauMembers) {
    const email = tm.email?.trim().toLowerCase();
    if (email) {
      tableauByEmail.set(email, tm);
    }
  }

  // Also build by memberId for direct matching
  const tableauById = new Map<string, TableauMemberRaw>();
  for (const tm of tableauMembers) {
    if (tm.memberId) {
      tableauById.set(tm.memberId, tm);
    }
  }

  let linked = 0;

  for (const member of members) {
    // Try email match first
    const email = member.email?.trim().toLowerCase();
    let tableau = email ? tableauByEmail.get(email) : undefined;

    // Fallback to hubspot record ID match
    if (!tableau && member.hubspotRecordId) {
      tableau = tableauById.get(member.hubspotRecordId);
    }

    if (!tableau) continue;
    linked++;

    // Enrich with Tableau dates if HubSpot data is missing
    if (!member.dashboardUnlockedAt && tableau.dashboardPublishedAt) {
      member.dashboardUnlockedAt = tableau.dashboardPublishedAt;
      member.dashboardUnlocked = true;
    }

    // Upgrade journey stage if Tableau has more detail
    if (
      tableau.journeyStage === 'dashboard-unlocked' &&
      member.journeyStage === 'registered'
    ) {
      member.journeyStage = tableau.journeyStage;
    }

    // Merge measures into betterTomorrows if available
    const btValue = tableau.measures['Better Tomorrows'];
    if (typeof btValue === 'number') {
      member.betterTomorrows = btValue;
    }
  }

  return linked;
}

```

## `src/lib/processors/hubspot-processor.ts`

```ts
import type { Member, JourneyStage } from '@/lib/types';

const REQUIRED_COLUMNS = [
  'Record ID',
  'Type',
  'Created at',
  'Primary Email',
] as const;

const PII_COLUMNS = [
  'Name > First',
  'Name > Last',
  'Email',
  'Primary Email',
  'Patient ID',
] as const;

function parseDateOrNull(value: string | undefined): string | null {
  if (!value || value.trim() === '' || value === 'n/a') return null;
  const d = new Date(value.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseCaseStatus(raw: string): Member['caseStatus'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'open') return 'Open';
  if (normalized === 'closed') return 'Closed';
  return 'Inactive';
}

function parseSex(raw: string): Member['sex'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'female') return 'Female';
  if (normalized === 'male') return 'Male';
  if (normalized === 'n/a' || normalized === '') return 'n/a';
  return null;
}

function parseMemberType(raw: string): Member['type'] {
  const normalized = raw?.trim() ?? '';
  if (normalized === 'Friend-Family' || normalized === 'Friend/Family') return 'Friend-Family';
  if (normalized === 'Investor') return 'Investor';
  if (normalized === 'Employee') return 'Employee';
  if (normalized === 'Test') return 'Test';
  return 'Customer';
}

function parseAddOns(raw: string): string[] {
  if (!raw || raw.trim() === '' || raw.trim() === 'n/a') return [];
  return raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
}

function parseEmailSequences(raw: string): string[] {
  if (!raw || raw.trim() === '' || raw.trim() === 'n/a') return [];
  return raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
}

function deriveJourneyStage(row: Record<string, string>): JourneyStage {
  const caseStatus = row['Case Status']?.trim().toLowerCase();
  if (caseStatus === 'closed' || caseStatus === 'inactive') return 'churned';

  const dashboardUnlocked =
    row['Dashboard Unlocked']?.trim().toLowerCase() === 'true' ||
    row['Dashboard Unlocked']?.trim() === '1' ||
    row['Dashboard Unlocked']?.trim().toLowerCase() === 'yes';

  const nextRetest = row['Next Retest Date']?.trim();
  const lastTest = row['Last Test Date']?.trim();
  const labBatch = row['Lab Batch Tracking Number']?.trim();

  if (dashboardUnlocked && nextRetest && nextRetest !== 'n/a') return 'retest-due';
  if (dashboardUnlocked) return 'dashboard-unlocked';
  if (labBatch && labBatch !== '' && labBatch !== 'n/a') return 'awaiting-results';
  if (lastTest && lastTest !== '' && lastTest !== 'n/a') return 'kit-returned';

  return 'registered';
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

export function processHubspotCSV(data: Record<string, string>[]): Member[] {
  // Validate required columns on first row
  if (data.length > 0) {
    const cols = Object.keys(data[0]);
    const missing = REQUIRED_COLUMNS.filter((c) => !cols.includes(c));
    if (missing.length > 0) {
      console.warn(`HubSpot CSV missing columns: ${missing.join(', ')}`);
    }
  }

  const now = new Date().toISOString();

  return data
    .filter((row) => row['Record ID']?.trim())
    .map((row): Member => {
      const recordId = row['Record ID'].trim();
      const createdAt = parseDateOrNull(row['Created at']) ?? now;
      const dashboardUnlocked =
        row['Dashboard Unlocked']?.trim().toLowerCase() === 'true' ||
        row['Dashboard Unlocked']?.trim() === '1' ||
        row['Dashboard Unlocked']?.trim().toLowerCase() === 'yes';

      return {
        id: `hs-${recordId}`,
        hubspotRecordId: recordId,
        // PII fields - populated here, stripped later by pii-stripper
        firstName: row['Name > First']?.trim() ?? '',
        lastName: row['Name > Last']?.trim() ?? '',
        displayName: `${row['Name > First']?.trim() ?? ''} ${row['Name > Last']?.trim() ?? ''}`.trim() || `Member ${recordId}`,
        email: (row['Primary Email'] || row['Email addresses'] || row['Email'] || '').trim().toLowerCase(),
        sex: parseSex(row['Sex']),
        ageRange: row['Age Range']?.trim() || null,
        type: parseMemberType(row['Type']),
        caseStatus: parseCaseStatus(row['Case Status']),
        createdAt,
        primaryClinician: row['Primary Clinician']?.trim() || null,
        assignedDoctor: row['Assigned Doctor']?.trim() || null,
        dashboardUnlocked,
        dashboardUnlockedAt: dashboardUnlocked
          ? parseDateOrNull(
              row['"Dashboard Unlocked" Changed At']
              || row['Dashboard Unlocked Changed At']
              || row['\\"Dashboard Unlocked\\" Changed At']
            )
          : null,
        lastTestDate: parseDateOrNull(row['Last Test Date']),
        nextRetestDate: parseDateOrNull(row['Next Retest Date']),
        emailSequenceTriggered: parseEmailSequences(row['Email sequence triggered']),
        addOns: parseAddOns(row['Add-ons']),
        journeyStage: deriveJourneyStage(row),
        // Financial fields - populated later by entity linker
        totalRevenue: 0,
        transactionCount: 0,
        firstPaymentDate: null,
        lastPaymentDate: null,
        mrr: 0,
        // Support fields - populated later by entity linker
        ticketCount: 0,
        openTickets: 0,
        avgResolutionTime: null,
        lastTicketDate: null,
        csat: null,
        // Computed fields
        healthScore: 'unknown',
        riskFlags: [],
        daysSinceRegistration: daysBetween(createdAt, now),
        betterTomorrows: dashboardUnlocked
          ? daysBetween(
              parseDateOrNull(
                row['"Dashboard Unlocked" Changed At']
                || row['Dashboard Unlocked Changed At']
                || row['\\"Dashboard Unlocked\\" Changed At']
              ) ?? createdAt,
              now
            )
          : 0,
        isVIP: false,
      };
    });
}

```

## `src/lib/processors/pii-stripper.ts`

```ts
/**
 * PII stripping utilities for the TMRW dashboard.
 * Removes personally identifiable information from processed data
 * before it is stored or displayed.
 */

import type { Member, Ticket } from '@/lib/types';

/**
 * Strip PII fields from a single member record.
 * Replaces name fields with anonymised versions and removes email.
 * Returns a new object (does not mutate the original).
 */
export function stripMemberPII(member: Member): Member {
  const idSuffix = member.hubspotRecordId ?? member.id.slice(-6);

  return {
    ...member,
    firstName: '',
    lastName: '',
    displayName: `Member ${idSuffix}`,
    email: '',
  };
}

/**
 * Strip PII fields from an array of member records.
 * Returns a new array of stripped members.
 */
export function stripMembersPII(members: Member[]): Member[] {
  return members.map(stripMemberPII);
}

/**
 * Strip PII fields from a single ticket record.
 * Zendesk PII columns (Requester, Requester email, Subject, etc.)
 * are already excluded during CSV processing. This function handles
 * any residual PII that may have leaked through.
 * Returns a new object (does not mutate the original).
 */
export function stripTicketPII(ticket: Ticket): Ticket {
  // The Ticket type doesn't carry requester name/email fields
  // (they are stripped during processZendeskCSV), but we ensure
  // assignee names are kept since they are internal staff, not PII.
  return { ...ticket };
}

/**
 * Strip PII fields from an array of ticket records.
 * Returns a new array of stripped tickets.
 */
export function stripTicketsPII(tickets: Ticket[]): Ticket[] {
  return tickets.map(stripTicketPII);
}

/**
 * Strip PII from a raw CSV row before processing.
 * Removes known PII columns from a HubSpot record.
 */
const HUBSPOT_PII_COLUMNS = [
  'Name > First',
  'Name > Last',
  'Email',
  'Primary Email',
  'Patient ID',
] as const;

export function stripRawHubspotPII(
  row: Record<string, string>
): Record<string, string> {
  const cleaned = { ...row };
  for (const col of HUBSPOT_PII_COLUMNS) {
    delete cleaned[col];
  }
  return cleaned;
}

/**
 * Strip PII from a raw Zendesk CSV row before processing.
 */
const ZENDESK_PII_COLUMNS = [
  'Requester',
  'Requester email',
  'Requester external id',
  'Subject',
  'Organization',
] as const;

export function stripRawZendeskPII(
  row: Record<string, string>
): Record<string, string> {
  const cleaned = { ...row };
  for (const col of ZENDESK_PII_COLUMNS) {
    delete cleaned[col];
  }
  return cleaned;
}

```

## `src/lib/processors/stripe-processor.ts`

```ts
import type { Transaction } from '@/lib/types';

const REQUIRED_COLUMNS = [
  'charge_id',
  'created',
  'currency',
  'amount',
  'outcome_type',
  'card_country',
  'interaction_type',
] as const;

function parseOutcome(raw: string): Transaction['outcome'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'authorized' || normalized === 'succeeded') return 'authorized';
  if (normalized === 'declined' || normalized === 'issuer_declined') return 'declined';
  if (normalized === 'blocked') return 'blocked';
  return 'authorized';
}

function parseStripeDate(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null;

  const trimmed = value.trim();

  // Check for truncated time-only format (MM:SS.0) — indicates broken export
  if (/^\d{1,2}:\d{2}\.\d$/.test(trimmed)) {
    return null;
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d.toISOString();

  return null;
}

function classifyTransaction(
  amountCents: number,
  interactionType: string,
  isRecurring: boolean
): Transaction['type'] {
  // $349 (34900 cents) is the advanced testing fee
  if (amountCents === 34900 || amountCents === 34800) return 'advanced-testing';

  // Large one-time payments are likely advanced testing
  if (amountCents >= 15000 && !isRecurring) return 'advanced-testing';

  // Recurring payments are foundations memberships
  if (isRecurring) return 'foundations-membership';

  // Customer-initiated saved card could be supplements or medication
  if (interactionType === 'customer_initiated_saved_card' && amountCents < 15000) return 'supplements';

  // Fallback based on dollar amount
  const amountDollars = amountCents / 100;
  if (amountDollars >= 15 && amountDollars <= 98) return 'supplements';

  return 'foundations-membership';
}

/** Whether any transaction dates were unparseable (broken export) */
export let stripeHasBrokenDates = false;

export function processStripeCSV(data: Record<string, string>[]): Transaction[] {
  // Validate required columns
  if (data.length > 0) {
    const cols = Object.keys(data[0]);
    const missing = REQUIRED_COLUMNS.filter((c) => !cols.includes(c));
    if (missing.length > 0) {
      console.warn(`Stripe CSV missing columns: ${missing.join(', ')}`);
    }
  }

  stripeHasBrokenDates = false;
  const now = new Date().toISOString();

  return data
    .filter((row) => row['charge_id']?.trim())
    .map((row): Transaction => {
      const amountCents = parseInt(row['amount'] ?? '0', 10);
      const amountDollars = amountCents / 100;
      const interactionType = row['interaction_type']?.trim().toLowerCase() ?? '';
      const isRecurring =
        interactionType === 'recurring' ||
        interactionType === 'subscription' ||
        interactionType === 'off_session';

      const parsedDate = parseStripeDate(row['created']);
      if (!parsedDate) stripeHasBrokenDates = true;

      return {
        chargeId: row['charge_id'].trim(),
        memberId: null, // linked later by entity-linker
        createdAt: parsedDate ?? now,
        amount: amountDollars,
        currency: (row['currency']?.trim() ?? 'aud').toLowerCase(),
        type: classifyTransaction(amountCents, interactionType, isRecurring),
        outcome: parseOutcome(row['outcome_type']),
        failureReason:
          row['outcome_type']?.trim().toLowerCase() !== 'authorized' &&
          row['outcome_type']?.trim().toLowerCase() !== 'succeeded'
            ? (row['failure_message']?.trim() || row['outcome_type']?.trim() || null)
            : null,
        cardCountry: row['card_country']?.trim() ?? '',
        cardBrand: row['card_brand']?.trim() ?? '',
        isRecurring,
      };
    });
}

```

## `src/lib/processors/tableau-processor.ts`

```ts
import type { JourneyStage } from '@/lib/types';

export interface TableauMemberRaw {
  memberId: string;
  email: string;
  createdAt: string | null;
  initialSubscriptionDate: string | null;
  firstPurchaseDate: string | null;
  dashboardPublishedAt: string | null;
  firstResultReadyAt: string | null;
  caseStatus: string;
  caseType: string;
  personType: string;
  journeyStage: JourneyStage;
  measures: Record<string, number | string | null>;
}

function parseAustralianDate(value: string): Date | null {
  // Handle DD/MM/YYYY or DD/MM/YYYY HH:MM:SS (Australian date format)
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?$/);
  if (match) {
    const [, day, month, year, hours, minutes, seconds] = match;
    return new Date(
      parseInt(year), parseInt(month) - 1, parseInt(day),
      parseInt(hours || '0'), parseInt(minutes || '0'), parseInt(seconds || '0')
    );
  }
  // Fallback to standard Date parsing for ISO formats
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function parseDateOrNull(value: string | undefined): string | null {
  if (!value || value.trim() === '' || value.trim().toLowerCase() === 'null') return null;
  const d = parseAustralianDate(value.trim());
  return d ? d.toISOString() : null;
}

function parseMeasureValue(value: string | undefined): number | string | null {
  if (!value || value.trim() === '' || value.trim().toLowerCase() === 'null') return null;
  const numeric = parseFloat(value.trim());
  return isNaN(numeric) ? value.trim() : numeric;
}

function deriveJourneyStage(row: {
  caseStatus: string;
  dashboardPublishedAt: string | null;
  firstResultReadyAt: string | null;
  firstPurchaseDate: string | null;
  initialSubscriptionDate: string | null;
}): JourneyStage {
  const status = row.caseStatus?.toLowerCase() ?? '';

  if (status === 'closed' || status === 'inactive') return 'churned';
  if (row.dashboardPublishedAt) return 'dashboard-unlocked';
  if (row.firstResultReadyAt) return 'awaiting-results';
  if (row.firstPurchaseDate) return 'kit-dispatched';
  if (row.initialSubscriptionDate) return 'health-story-complete';
  return 'registered';
}

/**
 * Process Tableau TSV content (UTF-16LE, unpivoted format with 12 rows per member).
 * Groups rows by Member Id and pivots Measure Names into fields.
 */
export function processTableauTSV(content: string): TableauMemberRaw[] {
  // Handle UTF-16LE BOM and convert - the content may already be decoded
  let text = content;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split('\t').map((h) => h.trim());
  const colIndex = (name: string): number =>
    headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const memberIdIdx = colIndex('Member Id');
  const emailIdx = colIndex('Email');
  const createdAtIdx = colIndex('Created At');
  const initialSubIdx = colIndex('Initial Subscription Date');
  const firstPurchaseIdx = colIndex('First Purchase Date');
  const dashPubIdx = colIndex('Dashboard Published At');
  const firstResultIdx = colIndex('First Result Ready At');
  const caseStatusIdx = colIndex('CASE_STATUS');
  const caseTypeIdx = colIndex('CASE_TYPE');
  const personTypeIdx = colIndex('Person Type');
  const measureNameIdx = colIndex('Measure Names');
  const measureValueIdx = colIndex('Measure Values');

  if (memberIdIdx === -1 || measureNameIdx === -1 || measureValueIdx === -1) {
    console.warn('Tableau TSV missing required columns: Member Id, Measure Names, or Measure Values');
    return [];
  }

  // Group rows by Member Id
  const groups = new Map<
    string,
    { row: string[]; measures: Record<string, number | string | null> }
  >();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const memberId = cols[memberIdIdx]?.trim();
    if (!memberId) continue;

    if (!groups.has(memberId)) {
      groups.set(memberId, { row: cols, measures: {} });
    }

    const measureName = cols[measureNameIdx]?.trim();
    const measureValue = cols[measureValueIdx]?.trim();
    if (measureName) {
      groups.get(memberId)!.measures[measureName] = parseMeasureValue(measureValue);
    }
  }

  // Convert groups to TableauMemberRaw[]
  const results: TableauMemberRaw[] = [];

  for (const [memberId, { row, measures }] of Array.from(groups)) {
    const getCol = (idx: number): string | undefined =>
      idx >= 0 && idx < row.length ? row[idx] : undefined;

    const createdAt = parseDateOrNull(getCol(createdAtIdx));
    const initialSubscriptionDate = parseDateOrNull(getCol(initialSubIdx));
    const firstPurchaseDate = parseDateOrNull(getCol(firstPurchaseIdx));
    const dashboardPublishedAt = parseDateOrNull(getCol(dashPubIdx));
    const firstResultReadyAt = parseDateOrNull(getCol(firstResultIdx));
    const caseStatus = getCol(caseStatusIdx)?.trim() ?? '';
    const caseType = getCol(caseTypeIdx)?.trim() ?? '';
    const personType = getCol(personTypeIdx)?.trim() ?? '';

    const member: TableauMemberRaw = {
      memberId,
      email: getCol(emailIdx)?.trim() ?? '',
      createdAt,
      initialSubscriptionDate,
      firstPurchaseDate,
      dashboardPublishedAt,
      firstResultReadyAt,
      caseStatus,
      caseType,
      personType,
      journeyStage: deriveJourneyStage({
        caseStatus,
        dashboardPublishedAt,
        firstResultReadyAt,
        firstPurchaseDate,
        initialSubscriptionDate,
      }),
      measures,
    };

    results.push(member);
  }

  return results;
}

```

## `src/lib/processors/zendesk-processor.ts`

```ts
import type { Ticket } from '@/lib/types';

const PII_COLUMNS = [
  'Requester',
  'Requester email',
  'Requester external id',
  'Subject',
  'Organization',
] as const;

const TIME_FIELDS = [
  'First reply time (min)',
  'First resolution time (min)',
  'Full resolution time (min)',
  'Requester wait time (min)',
] as const;

function parseDateOrNull(value: string | undefined): string | null {
  if (!value || value.trim() === '' || value === '-') return null;
  const d = new Date(value.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseMinutes(value: string | undefined): number | null {
  if (!value || value.trim() === '' || value === '-') return null;
  const parsed = parseFloat(value.trim());
  return isNaN(parsed) ? null : parsed;
}

function parseStatus(raw: string): Ticket['status'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'open' || normalized === 'new') return 'Open';
  if (normalized === 'pending') return 'Pending';
  if (normalized === 'solved') return 'Solved';
  if (normalized === 'closed') return 'Closed';
  return 'Open';
}

function parsePriority(raw: string): Ticket['priority'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'low') return 'Low';
  if (normalized === 'high') return 'High';
  if (normalized === 'urgent') return 'Urgent';
  return 'Normal';
}

function parseTicketType(raw: string): Ticket['ticketType'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'question') return 'Question';
  if (normalized === 'incident') return 'Incident';
  if (normalized === 'problem') return 'Problem';
  if (normalized === 'task') return 'Task';
  return null;
}

function parseSatisfaction(raw: string): Ticket['satisfaction'] {
  const normalized = raw?.trim().toLowerCase() ?? '';
  if (normalized === 'good' || normalized === 'good, i\'m satisfied') return 'Good';
  if (normalized === 'bad' || normalized === 'bad, i\'m not satisfied') return 'Bad';
  if (normalized === 'offered') return 'Offered';
  return 'Not Offered';
}

function parseTags(raw: string): string[] {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return [];
  return raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
}

function parseIntOrZero(value: string | undefined): number {
  if (!value || value.trim() === '' || value === '-') return 0;
  const parsed = parseInt(value.trim(), 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function processZendeskCSV(data: Record<string, string>[]): Ticket[] {
  return data
    .filter((row) => row['ID']?.trim() || row['Id']?.trim())
    .map((row): Ticket => {
      const id = row['ID']?.trim() ?? row['Id']?.trim() ?? '';

      return {
        id: `zd-${id}`,
        memberId: null, // linked later via entity-linker
        status: parseStatus(row['Status']),
        priority: parsePriority(row['Priority']),
        channel: row['Via']?.trim() ?? row['Channel']?.trim() ?? 'unknown',
        ticketType: parseTicketType(row['Ticket type'] ?? row['Type']),
        tags: parseTags(row['Tags']),
        createdAt: parseDateOrNull(row['Created at']) ?? new Date().toISOString(),
        updatedAt: parseDateOrNull(row['Updated at']) ?? new Date().toISOString(),
        solvedAt: parseDateOrNull(row['Solved at']),
        assignee: row['Assignee']?.trim() ?? 'Unassigned',
        group: row['Group']?.trim() ?? '',
        firstReplyMinutes: parseMinutes(row['First reply time in minutes'] ?? row['First reply time (min)']),
        firstResolutionMinutes: parseMinutes(row['First resolution time in minutes'] ?? row['First resolution time (min)']),
        fullResolutionMinutes: parseMinutes(row['Full resolution time in minutes within business hours'] ?? row['Full resolution time (min)']),
        requesterWaitMinutes: parseMinutes(row['Requester wait time in minutes within business hours'] ?? row['Requester wait time (min)']),
        satisfaction: parseSatisfaction(row['Satisfaction Score'] ?? row['Satisfaction']),
        reopens: parseIntOrZero(row['Reopens']),
        replies: parseIntOrZero(row['Replies']),
        assigneeStations: parseIntOrZero(row['Assignee stations']),
        groupStations: parseIntOrZero(row['Group stations']),
      };
    });
}

```

## `src/lib/supabase/client.ts`

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

```

## `src/lib/supabase/server.ts`

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component context — can't set cookies
          }
        },
      },
    }
  )
}

```

## `src/lib/supabase/service.ts`

```ts
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

```

## `src/lib/types/alerts.ts`

```ts
export type AlertSeverity = 'low' | 'medium' | 'high';
export type AlertType =
  | 'status-change'
  | 'metric-recovery'
  | 'stalled-member'
  | 'payment-spike'
  | 'support-backlog'
  | 'clinician-overload'
  | 'retest-overdue'
  | 'zero-movement';

export interface AlertRule {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  condition: string;
  enabled: boolean;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  detail: string;
  metricId: string | null;
  functionalArea:
    | 'financial'
    | 'members'
    | 'clinical'
    | 'support'
    | 'marketing'
    | 'strategy';
  createdAt: string;
  acknowledged: boolean;
}

```

## `src/lib/types/annotations.ts`

```ts
export interface Annotation {
  id: string;
  metricId: string;
  text: string;
  author: string;
  createdAt: string;
  updatedAt: string | null;
}

```

## `src/lib/types/clinician.ts`

```ts
export interface Clinician {
  id: string;
  name: string;
  role:
    | 'Integrative Clinician'
    | 'Head of Clinical Services'
    | 'Customer & Ops Lead';
  fte: number;
  department: 'clinical';
  activeCases: number;
  closedCases: number;
  membersPerFTE: number;
  avgCaseDuration: number | null;
  dashboardsPublished: number;
  complexCaseTime: number;
  simpleCaseTime: number;
}

```

## `src/lib/types/data-sources.ts`

```ts
export type DataSourceName = 'hubspot' | 'stripe' | 'zendesk' | 'tableau' | 'manual';

export interface CsvSchema {
  source: DataSourceName;
  requiredColumns: string[];
  optionalColumns: string[];
  strippedColumns: string[];
}

export interface UploadResult {
  success: boolean;
  source: DataSourceName;
  recordCount: number;
  columnCount: number;
  newRecords: number;
  updatedRecords: number;
  errors: string[];
  timestamp: string;
}

export interface RefreshLog {
  source: DataSourceName;
  lastRefreshed: string | null;
  recordCount: number;
  columnCount: number;
  nextRecommended: string | null;
}

```

## `src/lib/types/filters.ts`

```ts
export type DatePreset =
  | 'this-week'
  | 'last-7-days'
  | 'this-month'
  | 'last-30-days'
  | 'this-quarter'
  | 'last-quarter'
  | 'ytd'
  | 'custom';

export type ComparisonMode = 'previous-period' | 'same-period-last-year' | 'off';

export interface DateRange {
  start: string;
  end: string;
  preset: DatePreset;
}

export interface FilterState {
  dateRange: DateRange;
  comparison: ComparisonMode;
  memberType: 'all' | 'Customer' | 'Friend-Family' | 'Investor' | 'Employee';
  clinician: string | null;
  ticketStatus: string | null;
  ticketPriority: string | null;
  channel: string | null;
  transactionType: string | null;
  cardCountry: string | null;
}

```

## `src/lib/types/index.ts`

```ts
export type {
  JourneyStage,
  HealthScore,
  RiskFlag,
  Member,
} from './member';

export type { Clinician } from './clinician';

export type { Ticket } from './ticket';

export type { Transaction } from './transaction';

export type {
  Status,
  MetricDirection,
  DataSource,
  MetricDefinition,
  MetricValue,
} from './metrics';

export type {
  AlertSeverity,
  AlertType,
  AlertRule,
  Alert,
} from './alerts';

export type { Annotation } from './annotations';

export type {
  RockStatus,
  RockMetric,
  Rock,
} from './rocks';

export type {
  Question,
  StrategicBet,
  PostureChoice,
  DestinationRow,
} from './strategy';

export type {
  DatePreset,
  ComparisonMode,
  DateRange,
  FilterState,
} from './filters';

export type {
  DataSourceName,
  CsvSchema,
  UploadResult,
  RefreshLog,
} from './data-sources';

```

## `src/lib/types/member.ts`

```ts
export type JourneyStage =
  | 'registered'
  | 'health-story-complete'
  | 'kit-dispatched'
  | 'kit-returned'
  | 'awaiting-results'
  | 'dashboard-unlocked'
  | 'insights-call-complete'
  | 'active-plan'
  | 'retest-due'
  | 'churned'
  | 'inactive';

export type HealthScore = 'healthy' | 'attention' | 'at-risk' | 'unknown';

export interface RiskFlag {
  type:
    | 'churn-risk'
    | 'stalled-journey'
    | 'support-escalation'
    | 'payment-failure'
    | 'overdue-retest';
  severity: 'low' | 'medium' | 'high';
  detail: string;
  detectedAt: string;
}

export interface Member {
  id: string;
  hubspotRecordId: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  sex: 'Female' | 'Male' | 'n/a' | null;
  ageRange: string | null;
  type: 'Customer' | 'Friend-Family' | 'Investor' | 'Employee' | 'Test';
  caseStatus: 'Open' | 'Closed' | 'Inactive';
  createdAt: string;
  primaryClinician: string | null;
  assignedDoctor: string | null;
  dashboardUnlocked: boolean;
  dashboardUnlockedAt: string | null;
  lastTestDate: string | null;
  nextRetestDate: string | null;
  emailSequenceTriggered: string[];
  addOns: string[];
  journeyStage: JourneyStage;
  totalRevenue: number;
  transactionCount: number;
  firstPaymentDate: string | null;
  lastPaymentDate: string | null;
  mrr: number;
  ticketCount: number;
  openTickets: number;
  avgResolutionTime: number | null;
  lastTicketDate: string | null;
  csat: number | null;
  healthScore: HealthScore;
  riskFlags: RiskFlag[];
  daysSinceRegistration: number;
  betterTomorrows: number;
  isVIP: boolean;
}

```

## `src/lib/types/metrics.ts`

```ts
export type Status = 'green' | 'amber' | 'red' | 'grey';
export type MetricDirection = 'higher-better' | 'lower-better';
export type DataSource = 'hubspot' | 'stripe' | 'zendesk' | 'manual' | 'derived';

export interface MetricDefinition {
  id: string;
  label: string;
  description: string;
  source: DataSource;
  direction: MetricDirection;
  format: 'number' | 'currency' | 'percentage' | 'days' | 'hours' | 'text';
  target: string | number | null;
  category: string;
}

export interface MetricValue {
  metricId: string;
  current: number | string | null;
  previous: number | string | null;
  target: number | string | null;
  status: Status;
  trend: number | null;
  sparkline: number[];
  period: string;
}

```

## `src/lib/types/rocks.ts`

```ts
import type { Status } from './metrics';

export type RockStatus = 'on-track' | 'off-track' | 'at-risk' | 'complete' | 'building';

export interface RockMetric {
  label: string;
  current: string;
  target: string;
  status: Status;
}

export interface Rock {
  id: string;
  number: number;
  title: string;
  description: string;
  owner: string;
  status: RockStatus;
  metrics: RockMetric[];
  quarter: string;
}

```

## `src/lib/types/snowflake-export.ts`

```ts
/**
 * Schema for the daily Snowflake export.
 * Snowflake joins all sources, normalises, strips PII, and exports this shape.
 * The dashboard consumes this directly — no client-side processing needed.
 */

export interface SnowflakeExport {
  exportedAt: string                // ISO timestamp of export
  exportVersion: string             // Schema version (e.g., "1.0")

  members: SnowflakeMember[]
  transactions: SnowflakeTransaction[]
  tickets: SnowflakeTicket[]
  clinicians: SnowflakeClinician[]

  meta: {
    memberCount: number
    transactionCount: number
    ticketCount: number
    sourceFreshness: Record<string, string | null>  // source → last sync timestamp
  }
}

export interface SnowflakeMember {
  id: string                        // Canonical member ID (from Oracle/Tableau)
  type: 'Customer' | 'Friend-Family' | 'Investor' | 'Employee' | 'Test'
  caseStatus: 'Open' | 'Closed' | 'Inactive'
  journeyStage: string
  registeredAt: string

  // Clinical (from HubSpot)
  primaryClinician: string | null
  assignedDoctor: string | null
  dashboardUnlocked: boolean
  dashboardUnlockedAt: string | null
  lastTestDate: string | null
  nextRetestDate: string | null

  // Demographics (from HubSpot)
  sex: 'Female' | 'Male' | 'n/a' | null
  ageRange: string | null
  addOns: string[]

  // Financial (from Stripe, joined by email in Snowflake)
  totalRevenue: number
  mrr: number
  transactionCount: number
  firstPaymentDate: string | null
  lastPaymentDate: string | null

  // Support (from Zendesk, joined by email in Snowflake)
  ticketCount: number
  openTickets: number
  avgResolutionMinutes: number | null
  csat: number | null

  // Computed by Snowflake dbt
  healthScore: 'healthy' | 'attention' | 'at-risk' | 'unknown'
  riskFlags: string[]
  daysSinceRegistration: number
  betterTomorrows: number
}

export interface SnowflakeTransaction {
  id: string
  memberId: string | null
  createdAt: string
  amount: number                    // In dollars (not cents)
  currency: string
  type: 'joining-fee' | 'subscription' | 'supplement' | 'other'
  outcome: 'authorized' | 'declined' | 'blocked'
  failureReason: string | null
  cardCountry: string | null
  cardBrand: string | null
}

export interface SnowflakeTicket {
  id: string
  memberId: string | null
  createdAt: string
  solvedAt: string | null
  status: 'Open' | 'Pending' | 'Solved' | 'Closed'
  priority: 'Urgent' | 'High' | 'Normal' | 'Low' | null
  channel: string
  category: string | null
  tags: string[]
  firstReplyMinutes: number | null
  resolutionMinutes: number | null
  csatScore: string | null
  assignee: string | null
}

export interface SnowflakeClinician {
  id: string
  name: string
  role: string
  activeCases: number
  avgCaseDuration: number
  utilisation: number
}

```

## `src/lib/types/strategy.ts`

```ts
import type { MetricValue, Status } from './metrics';

export interface Question {
  id: string;
  number: number;
  text: string;
  framing: string;
  primaryMetrics: MetricValue[];
  secondaryMetrics: MetricValue[];
  functionalAreas: string[];
  status: Status;
  whatHasToBeTrueItems: string[];
}

export interface StrategicBet {
  id: string;
  number: number;
  title: string;
  description: string;
  currentActions: { label: string; done: boolean }[];
  laterItems: string[];
  proofConditions: { label: string; met: boolean }[];
  connectedPillars: string[];
}

export interface PostureChoice {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
  position:
    | 'decided-left'
    | 'leaning-left'
    | 'open'
    | 'leaning-right'
    | 'decided-right';
  notes: string;
}

export interface DestinationRow {
  category: string;
  metric: string;
  now: string;
  jun: string;
  dec: string;
  status: Status;
  whatHasToBeTrue: string;
}

```

## `src/lib/types/ticket.ts`

```ts
export interface Ticket {
  id: string;
  memberId: string | null;
  status: 'Open' | 'Pending' | 'Solved' | 'Closed';
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  channel: string;
  ticketType: 'Question' | 'Incident' | 'Problem' | 'Task' | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  solvedAt: string | null;
  assignee: string;
  group: string;
  firstReplyMinutes: number | null;
  firstResolutionMinutes: number | null;
  fullResolutionMinutes: number | null;
  requesterWaitMinutes: number | null;
  satisfaction: 'Good' | 'Bad' | 'Offered' | 'Not Offered' | null;
  reopens: number;
  replies: number;
  assigneeStations: number;
  groupStations: number;
}

```

## `src/lib/types/transaction.ts`

```ts
export interface Transaction {
  chargeId: string;
  memberId: string | null;
  createdAt: string;
  amount: number;
  currency: string;
  type: 'foundations-membership' | 'advanced-testing' | 'supplements' | 'medication' | 'treatment-journey';
  outcome: 'authorized' | 'declined' | 'blocked';
  failureReason: string | null;
  cardCountry: string;
  cardBrand: string;
  isRecurring: boolean;
}

```

## `src/lib/utils.ts`

```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

## `src/lib/utils/chart-styles.ts`

```ts
export const axisTickStyle = {
  fontSize: 11,
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fill: '#525252',
}

export const axisLineStyle = {
  stroke: '#D4D4D4',
}

export const gridStyle = {
  strokeDasharray: '3 3',
  stroke: '#E5E5E5',
}

export const gridProps = {
  strokeDasharray: '3 3',
  stroke: '#E5E5E5',
}

export const tooltipStyle = {
  border: '1px solid #D4D4D4',
  borderRadius: 8,
  background: '#FFFFFF',
  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 13,
}

export const legendStyle = {
  fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 500,
}

export function lineDot(color: string, size = 5) {
  return { r: size, fill: color, stroke: '#fff', strokeWidth: 2 }
}

export function solidLine(color: string) {
  return {
    stroke: color,
    strokeWidth: 3,
    dot: { r: 4, fill: color, stroke: '#fff', strokeWidth: 2 },
  }
}

export function dashedLine(color: string) {
  return {
    stroke: color,
    strokeWidth: 2,
    strokeDasharray: '6 4',
    dot: { r: 3, fill: color, stroke: '#fff', strokeWidth: 1 },
  }
}

export function stackedArea(color: string) {
  return {
    stroke: color,
    fill: color,
    fillOpacity: 0.5,
    strokeWidth: 0,
  }
}

export const TMRW_COLORS = {
  red: '#8B0000',
  blue: '#2563EB',
  green: '#16A34A',
  amber: '#D97706',
  orange: '#EA580C',
  purple: '#7C3AED',
  cyan: '#0891B2',
  grey: '#94A3B8',
  darkGrey: '#737373',
  statusRed: '#DC2626',
  statusGreen: '#16A34A',
  statusAmber: '#D97706',
}

export const COLORS = TMRW_COLORS

```

## `src/lib/utils/color.ts`

```ts
/**
 * Status-to-colour mapping utilities for the TMRW dashboard.
 * Returns Tailwind CSS class names.
 */

import type { Status, DataSource } from '@/lib/types';

/**
 * Foreground / text colour for a traffic-light status.
 */
export function statusColor(status: Status): string {
  const map: Record<Status, string> = {
    green: 'text-status-green',
    amber: 'text-status-amber',
    red: 'text-status-red',
    grey: 'text-status-grey',
  };
  return map[status] ?? map.grey;
}

/**
 * Muted background colour for a traffic-light status.
 */
export function statusBgColor(status: Status): string {
  const map: Record<Status, string> = {
    green: 'bg-status-green-light border-status-green/20',
    amber: 'bg-status-amber-light border-status-amber/20',
    red: 'bg-status-red-light border-status-red/20',
    grey: 'bg-status-grey-light border-status-grey/20',
  };
  return map[status] ?? map.grey;
}

/**
 * Brand colour for a data source.
 */
export function sourceColor(source: DataSource): string {
  const map: Record<string, string> = {
    hubspot: 'text-src-hubspot',
    stripe: 'text-src-stripe',
    zendesk: 'text-src-zendesk',
    manual: 'text-src-manual',
    derived: 'text-dash-text-secondary',
  };
  return map[source] ?? 'text-src-manual';
}

/**
 * Colour for a department / functional area.
 */
export function deptColor(dept: string): string {
  const map: Record<string, string> = {
    financial: 'text-emerald-700 bg-emerald-50',
    members: 'text-blue-700 bg-blue-50',
    clinical: 'text-purple-700 bg-purple-50',
    support: 'text-amber-700 bg-amber-50',
    marketing: 'text-pink-700 bg-pink-50',
    strategy: 'text-indigo-700 bg-indigo-50',
    team: 'text-cyan-700 bg-cyan-50',
    eos: 'text-dash-red bg-dash-red-light',
    admin: 'text-slate-700 bg-slate-50',
  };
  return map[dept.toLowerCase()] ?? 'text-slate-700 bg-slate-50';
}

```

## `src/lib/utils/csv-parser.ts`

```ts
/**
 * CSV parsing wrapper around PapaParse for the TMRW dashboard.
 */

import Papa from 'papaparse';

export interface ParseResult<T> {
  data: T[];
  errors: string[];
  meta: { fields: string[] };
}

/**
 * Parse a CSV File into typed rows.
 * Expects the first row to be a header row.
 */
export function parseCSV<T>(file: File): Promise<ParseResult<T>> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete(results) {
        const errors = results.errors.map(
          (e) => `Row ${e.row ?? '?'}: ${e.message}`
        );
        resolve({
          data: results.data as T[],
          errors,
          meta: { fields: results.meta.fields ?? [] },
        });
      },
      error(err: Error) {
        resolve({
          data: [],
          errors: [err.message],
          meta: { fields: [] },
        });
      },
    });
  });
}

/**
 * Validate that all required columns are present in the parsed fields.
 */
export function validateColumns(
  fields: string[],
  required: string[]
): { valid: boolean; missing: string[] } {
  const fieldSet = new Set(fields.map((f) => f.trim().toLowerCase()));
  const missing = required.filter(
    (col) => !fieldSet.has(col.trim().toLowerCase())
  );
  return { valid: missing.length === 0, missing };
}

```

## `src/lib/utils/date.ts`

```ts
/**
 * Date utility functions for the TMRW dashboard.
 * All date strings are expected in ISO 8601 format (YYYY-MM-DD or full ISO).
 * Display times use AEDT (Australia/Sydney) unless otherwise noted.
 */

const TIMEZONE = 'Australia/Sydney';

function toDate(date: string | Date): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

/**
 * Format a date as "Mar 3, 2026".
 */
export function formatDate(date: string | Date): string {
  return toDate(date).toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: TIMEZONE,
  });
}

/**
 * Format a date as "Mar 3" (no year).
 */
export function formatDateShort(date: string | Date): string {
  return toDate(date).toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    timeZone: TIMEZONE,
  });
}

/**
 * Format a date-time as "Mar 3, 2026 09:14 AEDT".
 */
export function formatDateTime(date: string | Date): string {
  const d = toDate(date);
  const datePart = d.toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: TIMEZONE,
  });
  const timePart = d.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE,
  });
  const tzPart = d.toLocaleTimeString('en-AU', {
    timeZoneName: 'short',
    timeZone: TIMEZONE,
  }).split(' ').pop() ?? 'AEDT';

  return `${datePart} ${timePart} ${tzPart}`;
}

/**
 * Return the number of whole days between a date string and today.
 */
export function daysAgo(date: string): number {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Return the ISO week number for a date.
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Return a month key like "2026-03" from an ISO date string.
 */
export function getMonthKey(date: string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Check whether a date string falls within an inclusive range.
 */
export function isInDateRange(date: string, start: string, end: string): boolean {
  const d = new Date(date).getTime();
  return d >= new Date(start).getTime() && d <= new Date(end).getTime();
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function startOfQuarter(date: Date): Date {
  const q = Math.floor(date.getMonth() / 3)
  return new Date(date.getFullYear(), q * 3, 1)
}

export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1)
}

export function subMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() - months)
  return d
}

export function subWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - (weeks * 7))
  return d
}

export function isAfter(a: Date, b: Date): boolean { return a.getTime() > b.getTime() }
export function isBefore(a: Date, b: Date): boolean { return a.getTime() < b.getTime() }

/**
 * Return the default date range: first and last day of the current month.
 */
export function getDefaultDateRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { start: fmt(start), end: fmt(end) };
}

/**
 * Return a human-readable label for a date range.
 * Examples: "Mar 2026", "Mar 1 - Mar 15, 2026", "2026"
 */
export function periodLabel(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);

  // Same day
  if (start === end) {
    return formatDate(s);
  }

  // Full single month
  if (
    s.getDate() === 1 &&
    e.getDate() === new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate() &&
    s.getMonth() === e.getMonth() &&
    s.getFullYear() === e.getFullYear()
  ) {
    return s.toLocaleDateString('en-AU', {
      month: 'short',
      year: 'numeric',
      timeZone: TIMEZONE,
    });
  }

  // Full year
  if (
    s.getMonth() === 0 &&
    s.getDate() === 1 &&
    e.getMonth() === 11 &&
    e.getDate() === 31 &&
    s.getFullYear() === e.getFullYear()
  ) {
    return String(s.getFullYear());
  }

  // Same year range
  if (s.getFullYear() === e.getFullYear()) {
    return `${formatDateShort(s)} - ${formatDateShort(e)}, ${s.getFullYear()}`;
  }

  // Cross-year range
  return `${formatDate(s)} - ${formatDate(e)}`;
}

```

## `src/lib/utils/format.ts`

```ts
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

```

## `src/lib/utils/index.ts`

```ts
/**
 * Shared utility re-exports for the TMRW dashboard.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

```

## `src/lib/utils/metric-source.ts`

```ts
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

```

## `src/lib/utils/period.ts`

```ts
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, subMonths, subWeeks, isAfter, isBefore } from '@/lib/utils/date'

export type Granularity = 'day' | 'week' | 'month' | 'quarter'
export type TimeWindow = 'this-week' | 'this-month' | 'quarter' | '6mo' | 'ytd' | 'all' | 'mtd' | 'qtd' | 'trailing-4w' | 'trailing-12w'

/**
 * Filter an array of items with a date field to a specific time window.
 */
export function filterByWindow<T>(
  items: T[],
  dateAccessor: (item: T) => string | Date,
  window: TimeWindow,
  referenceDate: Date = new Date()
): T[] {
  let start: Date

  switch (window) {
    case 'this-week':
      start = startOfWeek(referenceDate)
      break
    case 'this-month':
    case 'mtd':
      start = startOfMonth(referenceDate)
      break
    case 'quarter':
    case 'qtd':
      start = startOfQuarter(referenceDate)
      break
    case '6mo':
      start = subMonths(referenceDate, 6)
      break
    case 'ytd':
      start = startOfYear(referenceDate)
      break
    case 'trailing-4w':
      start = subWeeks(referenceDate, 4)
      break
    case 'trailing-12w':
      start = subWeeks(referenceDate, 12)
      break
    case 'all':
      return items
    default:
      return items
  }

  return items.filter(item => {
    const d = new Date(dateAccessor(item))
    return isAfter(d, start) && isBefore(d, referenceDate)
  })
}

/**
 * Group items by time bucket based on granularity.
 */
export function groupByPeriod<T>(
  items: T[],
  dateAccessor: (item: T) => string | Date,
  granularity: Granularity
): Map<string, T[]> {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const d = new Date(dateAccessor(item))
    let key: string

    switch (granularity) {
      case 'day':
        key = d.toISOString().slice(0, 10)
        break
      case 'week': {
        const ws = startOfWeek(d)
        key = `W${ws.toISOString().slice(0, 10)}`
        break
      }
      case 'month':
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        break
      case 'quarter': {
        const q = Math.floor(d.getMonth() / 3) + 1
        key = `${d.getFullYear()} Q${q}`
        break
      }
    }

    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  return groups
}

/**
 * Determine the appropriate granularity for a time window.
 */
export function granularityForWindow(window: TimeWindow): Granularity {
  switch (window) {
    case 'this-week': return 'day'
    case 'this-month':
    case 'mtd':
    case 'trailing-4w': return 'week'
    case 'quarter':
    case 'qtd':
    case 'trailing-12w': return 'week'
    case '6mo':
    case 'ytd': return 'month'
    case 'all': return 'month'
    default: return 'month'
  }
}

```

## `supabase/migrations/001_create_tables.sql`

```sql
-- Upload log: one row per CSV upload, stores processed JSON data
CREATE TABLE IF NOT EXISTS public.upload_log (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  source        TEXT        NOT NULL CHECK (source IN ('tableau', 'hubspot', 'stripe', 'zendesk', 'priorities')),
  uploaded_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  record_count  INTEGER     DEFAULT 0,
  strategy      TEXT        NOT NULL DEFAULT 'full-replace',
  uploaded_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  data          JSONB       NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS upload_log_source_uploaded_at_idx
  ON public.upload_log (source, uploaded_at DESC);

-- Row-level security
ALTER TABLE public.upload_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all uploads
CREATE POLICY "Authenticated users can read upload_log"
  ON public.upload_log FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert their own uploads
CREATE POLICY "Authenticated users can insert upload_log"
  ON public.upload_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Service role bypasses RLS automatically

```

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```


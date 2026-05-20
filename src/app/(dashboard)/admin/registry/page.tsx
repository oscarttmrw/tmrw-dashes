'use client'

import { useState, useEffect } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { StatusDot } from '@/components/dashboard/status-dot'
import type { Status } from '@/lib/types'

interface UploadSummary {
  lastUploadedAt: string | null
  lastUploadedBy: string | null
  lastPeriodLabel: string | null
  totalUploads: number
}
type UploadMap = Record<string, UploadSummary>

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
    id: 'meta_ads',
    name: 'Meta Ads',
    system: 'Meta Ads Manager',
    connectionMethod: 'csv-upload',
    futureMethod: 'snowflake-daily',
    status: 'live',
    owner: 'Konstantinos',
    priority: 'P2',
    targetDate: null,
    lastSync: null,
    affectedPages: ['Marketing', 'Acquisition', 'Financial'],
    metricsUnlocked: 8,
    metricsTotal: 8,
    dependencies: [],
    notes: 'Daily aggregate paid Meta performance. Sourced from "Meta Ads" sheet in TMRW_MARKETING_DATA. Campaign Name column OTW.',
  },
  {
    id: 'social_followers',
    name: 'Social Followers',
    system: 'Manual aggregation',
    connectionMethod: 'csv-upload',
    futureMethod: 'api-direct',
    status: 'live',
    owner: 'Konstantinos',
    priority: 'P3',
    targetDate: null,
    lastSync: null,
    affectedPages: ['Marketing'],
    metricsUnlocked: 2,
    metricsTotal: 2,
    dependencies: [],
    notes: 'Per-platform follower snapshot. Sourced from "Social Media Followers" sheet in TMRW_MARKETING_DATA.',
  },
  {
    id: 'social_views',
    name: 'Social Views',
    system: 'Manual aggregation',
    connectionMethod: 'csv-upload',
    futureMethod: 'api-direct',
    status: 'live',
    owner: 'Konstantinos',
    priority: 'P3',
    targetDate: null,
    lastSync: null,
    affectedPages: ['Marketing'],
    metricsUnlocked: 3,
    metricsTotal: 3,
    dependencies: [],
    notes: 'Daily aggregate engagement (page views, video views, post engagements). Sourced from "Social Media Views" sheet in TMRW_MARKETING_DATA.',
  },
  {
    id: 'pelagonia',
    name: 'Pelagonia (GoHighLevel)',
    system: 'GoHighLevel CRM',
    connectionMethod: 'csv-upload',
    futureMethod: 'snowflake-daily',
    status: 'live',
    owner: 'Steph',
    priority: 'P2',
    targetDate: null,
    lastSync: null,
    affectedPages: ['Acquisition', 'Marketing'],
    metricsUnlocked: 9,
    metricsTotal: 9,
    dependencies: [],
    notes: 'Opportunities, call bookings, appointment show/no-show rates. CSV export from GoHighLevel pipelines.',
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
  const [uploadMap, setUploadMap] = useState<UploadMap>({})

  useEffect(() => {
    fetch('/api/data/history')
      .then(r => r.json())
      .then((rows: Array<{
        source: string; status: string; uploaded_at: string;
        uploaded_by: string | null; data_period_label: string | null;
      }>) => {
        const map: UploadMap = {}
        for (const row of rows) {
          if (!map[row.source]) {
            // First (latest) complete row wins for display
            const isComplete = row.status === 'complete'
            map[row.source] = {
              lastUploadedAt: isComplete ? row.uploaded_at : null,
              lastUploadedBy: isComplete ? row.uploaded_by : null,
              lastPeriodLabel: isComplete ? row.data_period_label : null,
              totalUploads: 0,
            }
          }
          map[row.source].totalUploads += 1
        }
        setUploadMap(map)
      })
      .catch(() => {})
  }, [])

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
                <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Source</th>
                <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Last upload</th>
                <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Uploader</th>
                <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Method</th>
                <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Owner</th>
                <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Priority</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-dash-text-secondary">Metrics</th>
                <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Pages</th>
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
                    {uploadMap[src.id]?.lastUploadedAt ? (
                      <div>
                        <div className="font-mono text-xs text-dash-text">
                          {new Date(uploadMap[src.id].lastUploadedAt!).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        {uploadMap[src.id].lastPeriodLabel && (
                          <div className="text-[10px] text-dash-text-muted">{uploadMap[src.id].lastPeriodLabel}</div>
                        )}
                        <div className="text-[10px] text-dash-text-muted">{uploadMap[src.id].totalUploads} upload{uploadMap[src.id].totalUploads !== 1 ? 's' : ''} total</div>
                      </div>
                    ) : (
                      <span className="text-xs text-dash-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-dash-text-secondary">
                    {uploadMap[src.id]?.lastUploadedBy ?? '—'}
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

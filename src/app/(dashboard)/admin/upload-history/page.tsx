'use client'

import { useState, useEffect } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadLogRow {
  id: string
  source: string
  record_count: number | null
  status: 'pending' | 'complete' | 'failed'
  error: string | null
  uploaded_at: string
  uploaded_by: string | null
  file_name: string | null
  data_period_from: string | null
  data_period_to: string | null
  data_period_label: string | null
}

const ALL_SOURCES = ['pelagonia', 'meta_ads', 'social_organic', 'zendesk', 'hubspot', 'stripe', 'tableau'] as const
const ALL_STATUSES = ['complete', 'pending', 'failed'] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function formatPeriod(row: UploadLogRow): string {
  if (row.data_period_label) return row.data_period_label
  if (row.data_period_from && row.data_period_to) {
    const f = new Date(row.data_period_from + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    const t = new Date(row.data_period_to + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    return row.data_period_from === row.data_period_to ? f : `${f} – ${t}`
  }
  return '—'
}

function StatusPill({ status }: { status: UploadLogRow['status'] }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold',
      status === 'complete' ? 'bg-status-green/10 text-status-green' :
      status === 'pending'  ? 'bg-status-amber/10 text-status-amber' :
                              'bg-status-red/10 text-status-red'
    )}>
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UploadHistoryPage() {
  const [rows, setRows] = useState<UploadLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedError, setExpandedError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/data/history')
      .then(r => r.json())
      .then((data: UploadLogRow[]) => { setRows(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = rows.filter(r => {
    if (sourceFilter !== 'all' && r.source !== sourceFilter) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-8">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Admin', href: '/admin' },
        { label: 'Upload History' },
      ]} />

      <SectionHeading number={1} title="Upload History" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="appearance-none rounded-md border border-dash-border bg-dash-surface py-1.5 pl-3 pr-7 text-xs text-dash-text focus:border-dash-red focus:outline-none"
          >
            <option value="all">All sources</option>
            {ALL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-dash-text-muted" />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none rounded-md border border-dash-border bg-dash-surface py-1.5 pl-3 pr-7 text-xs text-dash-text focus:border-dash-red focus:outline-none"
          >
            <option value="all">All statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-dash-text-muted" />
        </div>
        <span className="self-center text-xs text-dash-text-muted">
          {loading ? 'Loading…' : `${filtered.length} upload${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {!loading && filtered.length === 0 && (
          <p className="text-sm italic text-dash-text-muted">No uploads found.</p>
        )}
        {filtered.map(row => (
          <div key={row.id} className="rounded-lg border border-dash-border bg-dash-surface p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <DataSourceBadge source={row.source as any} />
              <StatusPill status={row.status} />
            </div>
            <p className="font-mono text-dash-text">{row.file_name ?? '—'}</p>
            <div className="text-dash-text-secondary space-y-0.5">
              <p>Period: {formatPeriod(row)}</p>
              <p>By: {row.uploaded_by ?? '—'}</p>
              <p>At: {formatDate(row.uploaded_at)}</p>
              <p>Rows: {row.record_count?.toLocaleString() ?? '—'}</p>
            </div>
            {row.status === 'failed' && row.error && (
              <p className="text-status-red break-words">{row.error}</p>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-lg border border-dash-border md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-dash-border bg-dash-surface-alt">
              <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Source</th>
              <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">File</th>
              <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Uploaded by</th>
              <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Data period</th>
              <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Uploaded at</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-dash-text-secondary">Rows</th>
              <th className="px-4 py-3 text-xs font-semibold text-dash-text-secondary">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dash-border">
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-sm italic text-dash-text-muted">No uploads found.</td></tr>
            )}
            {filtered.map(row => (
              <>
                <tr
                  key={row.id}
                  className={cn('group', row.status === 'failed' && 'cursor-pointer')}
                  onClick={() => row.status === 'failed' && setExpandedError(expandedError === row.id ? null : row.id)}
                >
                  <td className="px-4 py-3">
                    <DataSourceBadge source={row.source as any} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-dash-text">{row.file_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-dash-text-secondary">{row.uploaded_by ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-dash-text-secondary">{formatPeriod(row)}</td>
                  <td className="px-4 py-3 text-xs text-dash-text-secondary">{formatDate(row.uploaded_at)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-dash-text">
                    {row.record_count?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={row.status} />
                    {row.status === 'failed' && (
                      <span className="ml-1 text-[10px] text-dash-text-muted">(click for details)</span>
                    )}
                  </td>
                </tr>
                {expandedError === row.id && row.error && (
                  <tr key={`${row.id}-err`}>
                    <td colSpan={7} className="bg-status-red/5 px-4 py-3">
                      <p className="font-mono text-xs text-status-red break-words">{row.error}</p>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { useDashboardData } from '@/lib/context/data-context'
import type { DashboardData } from '@/lib/context/data-context'
import { getSchema, dataSourceConfigs } from '@/lib/config/data-sources'
import { getMetricsPoweredBy } from '@/lib/utils/metric-source'
import { processTableauTSV, type TableauMemberRaw } from '@/lib/processors/tableau-processor'
import { processHubspotCSV } from '@/lib/processors/hubspot-processor'
import { processStripeCSV } from '@/lib/processors/stripe-processor'
import { processZendeskCSV } from '@/lib/processors/zendesk-processor'
import { processMetaCSV } from '@/lib/processors/meta-processor'
import { processPelagoniaCSV } from '@/lib/processors/pelagonia-processor'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/lib/types'
import { Upload, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Tableau raw → Member mapping
// ---------------------------------------------------------------------------

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
// Date detection helpers
// ---------------------------------------------------------------------------

const DATE_COL: Partial<Record<string, string>> = {
  meta: 'day',
  stripe: 'created date (utc)',
  zendesk: 'created at',
  hubspot: 'created at',
  pelagonia: 'created at',
}

function detectDateRange(
  rows: Record<string, string>[],
  sourceKey: string
): { from: string | null; to: string | null } {
  const targetCol = DATE_COL[sourceKey]
  if (!rows.length || !targetCol) return { from: null, to: null }

  const matchingKey = Object.keys(rows[0]).find(k => k.toLowerCase().trim() === targetCol)
  if (!matchingKey) return { from: null, to: null }

  const timestamps: number[] = []
  for (const row of rows) {
    const val = row[matchingKey]
    if (val) {
      const d = new Date(val)
      if (!isNaN(d.getTime())) timestamps.push(d.getTime())
    }
  }
  if (!timestamps.length) return { from: null, to: null }

  const maxTs = Math.max(...timestamps)

  return {
    from: new Date(Math.min(...timestamps)).toISOString().split('T')[0],
    to: new Date(maxTs).toISOString().split('T')[0],
  }
}

function formatDateLabel(from: string | null, to: string | null): string {
  if (!from || !to) return ''
  const f = new Date(from + 'T00:00:00')
  const t = new Date(to + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const optsFull: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  if (from === to) return f.toLocaleDateString('en-AU', optsFull)
  return `${f.toLocaleDateString('en-AU', opts)} – ${t.toLocaleDateString('en-AU', optsFull)}`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SourceKey = 'tableau' | 'hubspot' | 'stripe' | 'zendesk' | 'meta' | 'pelagonia'

interface PendingUpload {
  file: File
  rowCount: number
  columnCount: number
  stateUpdate: Partial<DashboardData>
  detectedFrom: string | null
  detectedTo: string | null
}

interface UploadState {
  status: 'idle' | 'validating' | 'modal' | 'uploading' | 'success' | 'error'
  pending?: PendingUpload
  resultCount?: number
  errors?: string[]
}

interface ModalForm {
  uploadedBy: string
  periodFrom: string
  periodTo: string
  periodLabel: string
}

interface DataSourceConfig {
  key: SourceKey
  name: string
  recordLabel: string
  columnLabel: string
  note?: string
}

// Sorted descending by metrics powered
const dataSources: DataSourceConfig[] = (
  [
    { key: 'pelagonia', name: 'PELAGONIA (GOHIGHLEVEL)', recordLabel: 'opportunities', columnLabel: 'columns' },
    { key: 'meta',      name: 'META FOR BUSINESS',       recordLabel: 'ad sets',       columnLabel: 'columns' },
    { key: 'zendesk',   name: 'ZENDESK',                 recordLabel: 'records',        columnLabel: 'columns' },
    { key: 'hubspot',   name: 'HUBSPOT',                 recordLabel: 'records',        columnLabel: 'columns' },
    { key: 'stripe',    name: 'STRIPE',                  recordLabel: 'transactions',   columnLabel: 'columns' },
    { key: 'tableau',   name: 'TABLEAU',                 recordLabel: 'members',        columnLabel: 'measures', note: 'TSV file with UTF-16 encoding handled automatically' },
  ] as DataSourceConfig[]
).sort((a, b) => getMetricsPoweredBy(b.key).length - getMetricsPoweredBy(a.key).length)

// ---------------------------------------------------------------------------
// Upload Card
// ---------------------------------------------------------------------------

function UploadCard({
  source,
  isFileBeingDragged,
  currentUserEmail,
}: {
  source: DataSourceConfig
  isFileBeingDragged: boolean
  currentUserEmail: string
}) {
  const { lastRefreshed, updateSource } = useDashboardData()
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const [modalForm, setModalForm] = useState<ModalForm>({ uploadedBy: '', periodFrom: '', periodTo: '', periodLabel: '' })
  const [stepsOpen, setStepsOpen] = useState(false)
  const [metricsOpen, setMetricsOpen] = useState(false)
  const [schemaOpen, setSchemaOpen] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const config = dataSourceConfigs[source.key]
  const lastRefresh = lastRefreshed[source.key]

  const readFileContent = useCallback(async (file: File): Promise<string> => {
    if (source.key === 'tableau') {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(buffer)
      if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) return new TextDecoder('utf-16be').decode(buffer)
    }
    return file.text()
  }, [source.key])

  const validateColumns = useCallback((headers: string[], sourceKey: SourceKey): string[] => {
    const schema = getSchema(sourceKey)
    if (!schema) return []
    const normHeaders = headers.map(h => h.toLowerCase().trim())
    return schema.requiredColumns.filter(col => !normHeaders.includes(col.toLowerCase().trim()))
  }, [])

  const openModal = useCallback((pending: PendingUpload) => {
    const label = formatDateLabel(pending.detectedFrom, pending.detectedTo)
    setModalForm({
      uploadedBy: currentUserEmail,
      periodFrom: pending.detectedFrom ?? '',
      periodTo: pending.detectedTo ?? '',
      periodLabel: label,
    })
    setState({ status: 'modal', pending })
  }, [currentUserEmail])

  const handleFile = useCallback(async (file: File) => {
    setState({ status: 'validating' })

    try {
      let content: string
      if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        content = XLSX.utils.sheet_to_csv(firstSheet)
      } else {
        content = await readFileContent(file)
      }

      if (source.key === 'tableau') {
        let text = content
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 2) {
          setState({ status: 'error', errors: ['File is empty or has no data rows'] }); return
        }
        const headers = lines[0].split('\t').map(h => h.trim())
        const missing = validateColumns(headers, 'tableau')
        if (missing.length > 0) {
          setState({ status: 'error', errors: [`Missing columns: ${missing.join(', ')}`] }); return
        }
        const rawMembers = processTableauTSV(content)
        const members = rawMembers.map(tableauRawToMember)
        // Date detection from processed data
        const dates = rawMembers.map(m => m.createdAt).filter(Boolean).map(d => new Date(d!).getTime()).filter(n => !isNaN(n))
        const detectedFrom = dates.length ? new Date(Math.min(...dates)).toISOString().split('T')[0] : null
        const detectedTo   = dates.length ? new Date(Math.max(...dates)).toISOString().split('T')[0] : null
        openModal({ file, rowCount: lines.length - 1, columnCount: headers.length, stateUpdate: { members }, detectedFrom, detectedTo })
      } else {
        Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as Record<string, string>[]
            if (!data.length) {
              setState({ status: 'error', errors: ['File contains no data rows'] }); return
            }
            const headers = Object.keys(data[0])
            const missing = validateColumns(headers, source.key)
            if (missing.length > 0) {
              setState({ status: 'error', errors: [`Missing columns: ${missing.join(', ')}`] }); return
            }
            const { from, to } = detectDateRange(data, source.key)
            let stateUpdate: Partial<DashboardData>
            try {
              if (source.key === 'hubspot') {
                stateUpdate = { members: processHubspotCSV(data) }
              } else if (source.key === 'stripe') {
                stateUpdate = { transactions: processStripeCSV(data) }
              } else if (source.key === 'zendesk') {
                stateUpdate = { tickets: processZendeskCSV(data) }
              } else if (source.key === 'meta') {
                stateUpdate = { metaAds: processMetaCSV(data) }
              } else if (source.key === 'pelagonia') {
                stateUpdate = { pelagoniaOpportunities: processPelagoniaCSV(data) }
              } else {
                stateUpdate = {}
              }
            } catch (err) {
              setState({ status: 'error', errors: [`Processing error: ${err instanceof Error ? err.message : String(err)}`] }); return
            }
            openModal({ file, rowCount: data.length, columnCount: headers.length, stateUpdate, detectedFrom: from, detectedTo: to })
          },
          error: (err: Error) => {
            setState({ status: 'error', errors: [`Parse error: ${err.message}`] })
          },
        })
      }
    } catch (err) {
      setState({ status: 'error', errors: [`Read error: ${err instanceof Error ? err.message : String(err)}`] })
    }
  }, [source.key, readFileContent, validateColumns, openModal])

  const handleConfirm = useCallback(async () => {
    if (!state.pending) return
    setState(prev => ({ ...prev, status: 'uploading' }))

    const form = new FormData()
    form.append('source', source.key)
    form.append('file', state.pending.file)
    form.append('file_name', state.pending.file.name)
    form.append('uploaded_by', modalForm.uploadedBy)
    form.append('data_period_from', modalForm.periodFrom)
    form.append('data_period_to', modalForm.periodTo)
    form.append('data_period_label', modalForm.periodLabel)

    try {
      const res = await fetch('/api/data/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setState({ status: 'error', errors: [body.error ?? `Upload failed (HTTP ${res.status})`] })
        return
      }
      updateSource(source.key, state.pending.stateUpdate)
      setState({ status: 'success', resultCount: state.pending.rowCount })
    } catch (err) {
      setState({ status: 'error', errors: [`Network error: ${err instanceof Error ? err.message : String(err)}`] })
    }
  }, [state.pending, modalForm, source.key, updateSource])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (fileRef.current) fileRef.current.value = ''
  }, [handleFile])

  const onDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDraggingOver(true) }, [])
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDraggingOver(false) }, [])
  const onDrop      = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const canConfirm = modalForm.uploadedBy.trim().length > 0 && state.status !== 'uploading'

  return (
    <>
      {/* Confirmation modal */}
      {(state.status === 'modal' || state.status === 'uploading') && state.pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-dash-border bg-dash-bg shadow-2xl">
            <div className="flex items-center justify-between border-b border-dash-border px-6 py-4">
              <h2 className="text-sm font-semibold text-dash-text">Confirm upload — {source.name}</h2>
              {state.status !== 'uploading' && (
                <button onClick={() => setState({ status: 'idle' })} className="text-dash-text-muted hover:text-dash-text">
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="space-y-4 px-6 py-5">
              {/* Read-only summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-dash-surface px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-dash-text-muted">File</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-dash-text">{state.pending.file.name}</p>
                </div>
                <div className="rounded-md bg-dash-surface px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-dash-text-muted">Rows detected</p>
                  <p className="mt-0.5 font-mono text-xs font-medium text-dash-text">{state.pending.rowCount.toLocaleString()}</p>
                </div>
              </div>

              {/* Data period */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-dash-text-secondary">Data period</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-[10px] text-dash-text-muted">From</p>
                    <input
                      type="date"
                      value={modalForm.periodFrom}
                      onChange={e => {
                        const from = e.target.value
                        setModalForm(prev => ({ ...prev, periodFrom: from, periodLabel: formatDateLabel(from, prev.periodTo) }))
                      }}
                      className="w-full rounded-md border border-dash-border bg-dash-surface px-2.5 py-1.5 font-mono text-xs text-dash-text focus:border-dash-red focus:outline-none"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] text-dash-text-muted">To</p>
                    <input
                      type="date"
                      value={modalForm.periodTo}
                      onChange={e => {
                        const to = e.target.value
                        setModalForm(prev => ({ ...prev, periodTo: to, periodLabel: formatDateLabel(prev.periodFrom, to) }))
                      }}
                      className="w-full rounded-md border border-dash-border bg-dash-surface px-2.5 py-1.5 font-mono text-xs text-dash-text focus:border-dash-red focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Period label */}
              <div>
                <label className="mb-1 block text-xs font-medium text-dash-text-secondary">
                  Period label <span className="text-dash-text-muted">(e.g. Q1 2026, Jan–Apr backfill)</span>
                </label>
                <input
                  type="text"
                  value={modalForm.periodLabel}
                  onChange={e => setModalForm(prev => ({ ...prev, periodLabel: e.target.value }))}
                  placeholder="e.g. Q1 2026"
                  className="w-full rounded-md border border-dash-border bg-dash-surface px-2.5 py-1.5 text-xs text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none"
                />
              </div>

              {/* Uploaded by */}
              <div>
                <label className="mb-1 block text-xs font-medium text-dash-text-secondary">
                  Uploaded by <span className="text-status-red">*</span>
                </label>
                <input
                  type="text"
                  value={modalForm.uploadedBy}
                  onChange={e => setModalForm(prev => ({ ...prev, uploadedBy: e.target.value }))}
                  placeholder="your@email.com"
                  className="w-full rounded-md border border-dash-border bg-dash-surface px-2.5 py-1.5 text-xs text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-dash-border px-6 py-4">
              {state.status !== 'uploading' && (
                <button
                  onClick={() => setState({ status: 'idle' })}
                  className="rounded-md border border-dash-border px-3 py-1.5 text-xs font-medium text-dash-text-secondary hover:text-dash-text"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="rounded-md bg-dash-red px-4 py-1.5 text-xs font-medium text-dash-text-inverse transition-colors hover:bg-dash-red/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state.status === 'uploading' ? 'Uploading…' : 'Confirm & upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'rounded-lg border p-5 transition-all duration-150',
          isDraggingOver
            ? 'scale-[1.01] border-dashed border-dash-red bg-dash-red-light'
            : isFileBeingDragged
            ? 'border-dashed border-dash-border-strong bg-dash-surface'
            : 'border-dash-border bg-dash-surface'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-dash-text">{source.name}</h3>
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
        <div className="mt-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-dash-red px-3 py-2 text-xs font-medium text-dash-text-inverse transition-colors hover:bg-dash-red/90">
            <Upload size={14} />
            Upload CSV/TSV
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" className="hidden" onChange={onFileChange} />
          </label>
        </div>

        {/* Drop hint */}
        {isDraggingOver && (
          <p className="mt-3 text-center text-xs font-medium text-dash-red">Drop file to upload</p>
        )}

        {/* Status */}
        <div className="mt-4">
          {state.status === 'idle' && !lastRefresh && (
            <p className="text-xs italic text-dash-text-muted">Awaiting first upload</p>
          )}
          {state.status === 'idle' && lastRefresh && state.resultCount && (
            <p className="text-xs text-dash-text-secondary">
              <span className="font-mono font-medium text-dash-text">{state.resultCount.toLocaleString()}</span> {source.recordLabel} processed
            </p>
          )}
          {state.status === 'validating' && (
            <p className="text-xs text-dash-text-secondary">Validating file…</p>
          )}
          {state.status === 'success' && (
            <div className="flex items-start gap-2 rounded-md bg-status-green-light px-3 py-2">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-status-green" />
              <div className="text-xs">
                <p className="font-medium text-status-green">Upload successful</p>
                <p className="text-dash-text-secondary">
                  <span className="font-mono font-medium text-dash-text">{state.resultCount?.toLocaleString()}</span> {source.recordLabel} saved to Supabase
                </p>
              </div>
            </div>
          )}
          {state.status === 'error' && (
            <div className="flex items-start gap-2 rounded-md bg-status-red-light px-3 py-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-red" />
              <div className="min-w-0 text-xs">
                <p className="font-medium text-status-red">Upload failed</p>
                {state.errors?.map((err, i) => (
                  <p key={i} className="break-words text-dash-text-secondary">{err}</p>
                ))}
                <button
                  onClick={() => setState({ status: 'idle' })}
                  className="mt-1.5 text-dash-text-muted underline hover:text-dash-text"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Note */}
        {source.note && <p className="mt-2 text-xs italic text-dash-text-muted">{source.note}</p>}

        {/* Panel — Required columns */}
        {(() => {
          const schema = getSchema(source.key)
          return schema ? (
            <div className="mt-4 rounded-lg border border-dash-border bg-dash-bg p-4 md:p-5">
              <button type="button" onClick={() => setSchemaOpen(o => !o)} className="flex w-full items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">Required columns</span>
                {schemaOpen ? <ChevronUp size={14} className="text-dash-text-secondary" /> : <ChevronDown size={14} className="text-dash-text-secondary" />}
              </button>
              {schemaOpen && (
                <ul className="mt-3 space-y-1">
                  {schema.requiredColumns.map((col, i) => <li key={i} className="font-mono text-xs text-dash-text">{col}</li>)}
                </ul>
              )}
            </div>
          ) : null
        })()}

        {/* Panel A — How to pull this data */}
        {config && (
          <div className="mt-3 rounded-lg border border-dash-border bg-dash-bg p-4 md:p-5">
            <button type="button" onClick={() => setStepsOpen(o => !o)} className="flex w-full items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">How to pull this data</span>
              {stepsOpen ? <ChevronUp size={14} className="text-dash-text-secondary" /> : <ChevronDown size={14} className="text-dash-text-secondary" />}
            </button>
            {stepsOpen && (
              <ol className="mt-3 list-decimal list-inside space-y-1">
                {config.exportSteps.map((step, i) => <li key={i} className="text-sm text-dash-text">{step}</li>)}
              </ol>
            )}
          </div>
        )}

        {/* Panel B — What this data powers */}
        {config && (
          <div className="mt-3 rounded-lg border border-dash-border bg-dash-bg p-4 md:p-5">
            <button type="button" onClick={() => setMetricsOpen(o => !o)} className="flex w-full items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">What this data powers</span>
              {metricsOpen ? <ChevronUp size={14} className="text-dash-text-secondary" /> : <ChevronDown size={14} className="text-dash-text-secondary" />}
            </button>
            {metricsOpen && (
              config.poweredMetrics.length > 0
                ? <ul className="mt-3 list-disc list-inside space-y-1">{config.poweredMetrics.map((m, i) => <li key={i} className="text-sm text-dash-text">{m}</li>)}</ul>
                : <p className="mt-3 text-sm text-dash-text">No metrics mapped yet.</p>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UploadPage() {
  const { dataMode, lastRefreshed } = useDashboardData()
  const [isFileBeingDragged, setIsFileBeingDragged] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const dragCounter = useRef(0)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setCurrentUserEmail(data.user.email)
    })
  }, [])

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) { dragCounter.current += 1; setIsFileBeingDragged(true) }
    }
    const onDragLeave = () => {
      dragCounter.current -= 1
      if (dragCounter.current <= 0) { dragCounter.current = 0; setIsFileBeingDragged(false) }
    }
    const onDrop = () => { dragCounter.current = 0; setIsFileBeingDragged(false) }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  return (
    <div className="space-y-10">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Data Upload' }]} />

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
            Showing real data — last updated:{' '}
            {Object.entries(lastRefreshed)
              .filter(([, ts]) => ts)
              .map(([src, ts]) => `${src}: ${new Date(ts!).toLocaleDateString('en-AU')}`)
              .join(' · ') || 'no uploads yet'}
          </p>
        </div>
      )}

      <SectionHeading number={1} title="Data Sources" />
      <div className="grid gap-6 lg:grid-cols-2">
        {dataSources.map(src => (
          <UploadCard key={src.key} source={src} isFileBeingDragged={isFileBeingDragged} currentUserEmail={currentUserEmail} />
        ))}
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { useDashboardData } from '@/lib/context/data-context'
import { dataSourceSchemas, validateRequiredColumns, dataSourceConfigs } from '@/lib/config/data-sources'
import { createClient } from '@/lib/supabase/client'
import { Upload, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Source auto-detection
// ---------------------------------------------------------------------------
//
// The upload page is a single FileDrop tile. When a file is dropped, its
// headers are inspected and matched against every registered schema's
// required-columns list. The first schema whose required columns are ALL
// present (case-insensitive) is the detected source. The user is then shown
// a confirmation modal and the file is POSTed to /api/data/upload with the
// detected source key.

type SourceKey =
  | 'tableau'
  | 'hubspot_contacts'
  | 'ghl_opportunities'
  | 'operational_data'
  | 'stripe'
  | 'zendesk'
  | 'meta'
  | 'pelagonia'

// Date-detection column for the preview/modal (case-insensitive header).
const DATE_COL: Partial<Record<SourceKey, string>> = {
  meta: 'reporting starts',
  stripe: 'created',
  zendesk: 'created at',
  hubspot_contacts: 'create date',
  ghl_opportunities: 'created on',
  operational_data: 'date',
  pelagonia: 'created at',
}

function detectSourceByHeaders(headers: string[]): SourceKey | null {
  // Walk schemas in a stable order — most-specific (most required columns)
  // first, so a CSV that satisfies both a narrow and a broad schema picks
  // the narrow one.
  const ranked = (Object.entries(dataSourceSchemas) as [SourceKey, typeof dataSourceSchemas[string]][])
    .slice()
    .sort(([, a], [, b]) => b.requiredColumns.length - a.requiredColumns.length)
  for (const [key, schema] of ranked) {
    const missing = validateRequiredColumns(schema, headers)
    if (missing.length === 0) return key
  }
  return null
}

function detectDateRange(
  rows: Record<string, string>[],
  source: SourceKey
): { from: string | null; to: string | null } {
  const targetCol = DATE_COL[source]
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

  let maxTs = Math.max(...timestamps)
  if (source === 'meta') {
    const endKey = Object.keys(rows[0]).find(k => k.toLowerCase().trim() === 'reporting ends')
    if (endKey) {
      for (const row of rows) {
        const d = new Date(row[endKey])
        if (!isNaN(d.getTime())) maxTs = Math.max(maxTs, d.getTime())
      }
    }
  }

  return {
    from: new Date(Math.min(...timestamps)).toISOString().split('T')[0],
    to: new Date(maxTs).toISOString().split('T')[0],
  }
}

/**
 * Pull a usable string out of any thrown value or API error payload. The
 * native `String(err)` of a Supabase / fetch error object yields the dreaded
 * "[object Object]" — this helper handles Error instances, strings, and
 * arbitrary plain objects.
 */
function extractErrorMessage(err: unknown): string | null {
  if (err === null || err === undefined) return null
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    const maybe = err as { message?: unknown; error?: unknown; reason?: unknown }
    if (typeof maybe.message === 'string') return maybe.message
    if (typeof maybe.error === 'string') return maybe.error
    if (typeof maybe.reason === 'string') return maybe.reason
    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }
  return String(err)
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

interface PendingUpload {
  file: File
  source: SourceKey | null
  rowCount: number
  columnCount: number
  detectedFrom: string | null
  detectedTo: string | null
  parsedRows: Record<string, string>[]
}

interface UploadState {
  status: 'idle' | 'validating' | 'modal' | 'uploading' | 'success' | 'error'
  pending?: PendingUpload
  resultCount?: number
  errors?: string[]
  detectedSource?: SourceKey
}

const SOURCE_OPTIONS: { key: SourceKey; label: string }[] = [
  { key: 'hubspot_contacts',  label: 'HubSpot Contacts' },
  { key: 'ghl_opportunities', label: 'GHL Opportunities' },
  { key: 'operational_data',  label: 'Operational Data' },
  { key: 'stripe',            label: 'Stripe Charges' },
  { key: 'meta',              label: 'Meta Ads' },
  { key: 'zendesk',           label: 'Zendesk' },
  { key: 'pelagonia',         label: 'Pelagonia' },
  { key: 'tableau',           label: 'Tableau' },
]

interface ModalForm {
  uploadedBy: string
  periodFrom: string
  periodTo: string
  periodLabel: string
  source: SourceKey | null
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UploadPage() {
  const { dataMode, lastRefreshed, refresh } = useDashboardData()
  const [isFileBeingDragged, setIsFileBeingDragged] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const [modalForm, setModalForm] = useState<ModalForm>({ uploadedBy: '', periodFrom: '', periodTo: '', periodLabel: '', source: null })
  const fileRef = useRef<HTMLInputElement>(null)
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
    const onDragLeaveWin = () => {
      dragCounter.current -= 1
      if (dragCounter.current <= 0) { dragCounter.current = 0; setIsFileBeingDragged(false) }
    }
    const onDropWin = () => { dragCounter.current = 0; setIsFileBeingDragged(false) }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeaveWin)
    window.addEventListener('drop', onDropWin)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeaveWin)
      window.removeEventListener('drop', onDropWin)
    }
  }, [])

  const openModal = useCallback((pending: PendingUpload) => {
    const label = formatDateLabel(pending.detectedFrom, pending.detectedTo)
    setModalForm({
      uploadedBy: currentUserEmail,
      periodFrom: pending.detectedFrom ?? '',
      periodTo: pending.detectedTo ?? '',
      periodLabel: label,
      source: pending.source,
    })
    setState({
      status: 'modal',
      pending,
      detectedSource: pending.source ?? undefined,
    })
  }, [currentUserEmail])

  const handleFile = useCallback(async (file: File) => {
    setState({ status: 'validating' })

    try {
      const name = file.name.toLowerCase()
      const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls')

      let rows: Record<string, string>[]
      if (isXlsx) {
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        // Detection sweeps every sheet — pick the first sheet whose headers
        // satisfy a known schema. The server-side upload route picks the
        // correct sheet again at processing time (see route.ts).
        let chosenRows: Record<string, string>[] | null = null
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName]
          const sheetRows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, string>[]
          if (sheetRows.length === 0) continue
          const headers = Object.keys(sheetRows[0])
          if (detectSourceByHeaders(headers)) {
            chosenRows = sheetRows
            break
          }
        }
        if (!chosenRows) {
          const firstWs = wb.Sheets[wb.SheetNames[0]]
          chosenRows = XLSX.utils.sheet_to_json(firstWs, { defval: '' }) as Record<string, string>[]
        }
        rows = chosenRows
      } else {
        // CSV / TSV — read as text, detect delimiter, parse.
        const buffer = await file.arrayBuffer()
        let text: string
        try {
          text = new TextDecoder('utf-16le').decode(buffer)
          if (!text.includes('\t') && !text.includes(',')) throw new Error('not utf-16')
        } catch {
          text = new TextDecoder('utf-8').decode(buffer)
        }
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
        const delimiter = text.includes('\t') ? '\t' : ','
        const result = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true,
          delimiter,
        })
        rows = result.data
      }

      if (!rows.length) {
        setState({ status: 'error', errors: ['File contains no data rows'] })
        return
      }

      const headers = Object.keys(rows[0])
      const source = detectSourceByHeaders(headers)
      const { from, to } = source ? detectDateRange(rows, source) : { from: null, to: null }
      openModal({
        file,
        source,
        rowCount: rows.length,
        columnCount: headers.length,
        detectedFrom: from,
        detectedTo: to,
        parsedRows: rows,
      })
    } catch (err) {
      setState({ status: 'error', errors: [`Read error: ${err instanceof Error ? err.message : String(err)}`] })
    }
  }, [openModal])

  const handleConfirm = useCallback(async () => {
    if (!state.pending || !modalForm.source) return
    const chosenSource = modalForm.source
    setState(prev => ({ ...prev, status: 'uploading' }))

    const form = new FormData()
    form.append('source', chosenSource)
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
        const message = extractErrorMessage(body?.error) ?? `Upload failed (HTTP ${res.status})`
        setState({ status: 'error', errors: [message] })
        return
      }
      const body = await res.json().catch(() => ({}))
      const rowCount = typeof body.rowCount === 'number' ? body.rowCount : state.pending.rowCount
      const apiErrors = Array.isArray(body.errors)
        ? (body.errors as Array<unknown>).map(e => extractErrorMessage(e) ?? '').filter(Boolean)
        : []
      await refresh()
      if (apiErrors.length > 0) {
        setState({ status: 'success', resultCount: rowCount, detectedSource: chosenSource, errors: apiErrors.slice(0, 10) })
      } else {
        setState({ status: 'success', resultCount: rowCount, detectedSource: chosenSource })
      }
    } catch (err) {
      setState({ status: 'error', errors: [`Network error: ${extractErrorMessage(err) ?? 'unknown error'}`] })
    }
  }, [state.pending, modalForm, refresh])

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

  const canConfirm =
    modalForm.uploadedBy.trim().length > 0
    && modalForm.source !== null
    && state.status !== 'uploading'
  const detectedName = state.detectedSource ? (dataSourceConfigs[state.detectedSource]?.name ?? state.detectedSource) : ''

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

      <SectionHeading number={1} title="Upload data" />

      {/* Confirmation modal */}
      {(state.status === 'modal' || state.status === 'uploading') && state.pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-dash-border bg-dash-bg shadow-2xl">
            <div className="flex items-center justify-between border-b border-dash-border px-6 py-4">
              <h2 className="text-sm font-semibold text-dash-text">Confirm upload</h2>
              {state.status !== 'uploading' && (
                <button onClick={() => setState({ status: 'idle' })} className="text-dash-text-muted hover:text-dash-text">
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="space-y-4 px-6 py-5">
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

              <div>
                <label className="mb-1 block text-xs font-medium text-dash-text-secondary">
                  Detected as: {state.pending.source === null && (
                    <span className="font-normal italic text-status-amber">no match — pick one below</span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={modalForm.source ?? ''}
                    onChange={e => {
                      const next = (e.target.value || null) as SourceKey | null
                      const range =
                        next && state.pending
                          ? detectDateRange(state.pending.parsedRows, next)
                          : { from: null, to: null }
                      setModalForm(prev => ({
                        ...prev,
                        source: next,
                        periodFrom: range.from ?? prev.periodFrom,
                        periodTo: range.to ?? prev.periodTo,
                        periodLabel: formatDateLabel(
                          range.from ?? prev.periodFrom,
                          range.to ?? prev.periodTo,
                        ),
                      }))
                    }}
                    className="w-full rounded-md border border-dash-border bg-dash-surface px-2.5 py-1.5 text-xs text-dash-text focus:border-dash-red focus:outline-none"
                  >
                    <option value="">Pick source…</option>
                    {SOURCE_OPTIONS.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                  {modalForm.source && (
                    <DataSourceBadge source={modalForm.source} />
                  )}
                </div>
              </div>

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

      {/* Single auto-detect file-drop tile */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'rounded-lg border p-8 transition-all duration-150',
          isDraggingOver
            ? 'scale-[1.01] border-dashed border-dash-red bg-dash-red-light'
            : isFileBeingDragged
            ? 'border-dashed border-dash-border-strong bg-dash-surface'
            : 'border-dash-border bg-dash-surface'
        )}
      >
        <div className="flex flex-col items-center text-center">
          <Upload size={28} className="text-dash-text-secondary" />
          <h3 className="mt-3 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text">
            Drop a file to upload
          </h3>
          <p className="mt-1 max-w-md text-xs text-dash-text-secondary">
            CSV, TSV or XLSX. The source is auto-detected from the file's column headers.
          </p>

          <div className="mt-5">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-dash-red px-4 py-2 text-xs font-medium text-dash-text-inverse transition-colors hover:bg-dash-red/90">
              <Upload size={14} />
              Choose file
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" className="hidden" onChange={onFileChange} />
            </label>
          </div>

          {isDraggingOver && (
            <p className="mt-4 text-xs font-medium text-dash-red">Drop file to upload</p>
          )}
        </div>

        {/* Status feedback */}
        <div className="mt-6 max-w-md mx-auto">
          {state.status === 'validating' && (
            <p className="text-center text-xs text-dash-text-secondary">Detecting source…</p>
          )}
          {state.status === 'success' && (
            <div className="flex items-start gap-2 rounded-md bg-status-green-light px-3 py-2">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-status-green" />
              <div className="text-xs">
                <p className="font-medium text-status-green">Upload successful</p>
                <p className="text-dash-text-secondary">
                  <span className="font-mono font-medium text-dash-text">{state.resultCount?.toLocaleString()}</span> rows saved to Supabase
                  {detectedName ? ` (${detectedName})` : ''}
                </p>
                {state.errors && state.errors.length > 0 && (
                  <ul className="mt-1.5 list-disc list-inside text-dash-text-muted">
                    {state.errors.map((err, i) => <li key={i} className="break-words">{err}</li>)}
                  </ul>
                )}
                <button
                  onClick={() => setState({ status: 'idle' })}
                  className="mt-1.5 underline text-dash-text-muted hover:text-dash-text"
                >
                  Dismiss
                </button>
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
      </div>
    </div>
  )
}

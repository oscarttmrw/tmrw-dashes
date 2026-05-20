'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { useDashboardData } from '@/lib/context/data-context'
import { getSchema, validateRequiredColumns } from '@/lib/config/data-sources'
import { createClient } from '@/lib/supabase/client'

type SourceKey = 'meta_ads' | 'social_organic' | 'stripe' | 'hubspot' | 'pelagonia' | 'tableau' | 'zendesk'

const SHEET_NAME_TO_SOURCE: Record<string, SourceKey> = {
  'meta ads': 'meta_ads',
  'social media followers': 'social_organic',
  'social media views': 'social_organic',
}

const VALID_SOURCES: SourceKey[] = [
  'meta_ads', 'social_organic', 'stripe', 'hubspot', 'pelagonia', 'tableau', 'zendesk',
]

// Column the schema's date filter keys off. Used to auto-fill the from/to
// pickers in the confirm modal. Sources without a date column show empty
// inputs and the user can leave them blank.
const DATE_COL: Partial<Record<SourceKey, string>> = {
  meta_ads: 'date',
  social_organic: 'date',
  stripe: 'created',
  hubspot: 'created at',
  pelagonia: 'created at',
  zendesk: 'created at',
}

interface DetectedSheet {
  file: File
  sheetName: string
  rows: Record<string, unknown>[]
  headers: string[]
  detectedSource: SourceKey | null
  rowCount: number
}

interface SheetSubmissionState extends DetectedSheet {
  chosenSource: SourceKey | 'skip'
  missingColumns: string[]
  periodFrom: string
  periodTo: string
}

interface ModalForm {
  uploadedBy: string
}

export default function UploadPage() {
  const { lastRefreshed, refresh } = useDashboardData()
  const [sheets, setSheets] = useState<SheetSubmissionState[] | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [modalForm, setModalForm] = useState<ModalForm>({ uploadedBy: '' })
  const [results, setResults] = useState<{ source: string; success: boolean; message: string }[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setModalForm(f => ({ ...f, uploadedBy: data.user!.email! }))
    })
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setParseError(null)
    try {
      const detected = await parseDroppedFile(file)
      if (detected.length === 0) {
        setParseError('File contains no readable sheets.')
        return
      }
      const withValidation: SheetSubmissionState[] = detected.map(s => {
        const chosen: SourceKey | 'skip' = s.detectedSource ?? 'skip'
        const missing = chosen !== 'skip' ? validateSheet(s, chosen) : []
        const { from, to } = chosen !== 'skip' ? detectDateRange(s.rows, chosen) : { from: '', to: '' }
        return { ...s, chosenSource: chosen, missingColumns: missing, periodFrom: from, periodTo: to }
      })
      setSheets(withValidation)
      setModalOpen(true)
    } catch (err) {
      setParseError(`Parse error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [])

  const handleSourceChange = (idx: number, source: SourceKey | 'skip') => {
    setSheets(prev => {
      if (!prev) return prev
      const copy = [...prev]
      const sheet = copy[idx]
      const missing = source !== 'skip' ? validateSheet(sheet, source) : []
      const { from, to } = source !== 'skip' ? detectDateRange(sheet.rows, source) : { from: '', to: '' }
      copy[idx] = { ...sheet, chosenSource: source, missingColumns: missing, periodFrom: from, periodTo: to }
      return copy
    })
  }

  const handlePeriodChange = (idx: number, field: 'periodFrom' | 'periodTo', value: string) => {
    setSheets(prev => {
      if (!prev) return prev
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      return copy
    })
  }

  const canSubmit = (sheets?.every(s =>
    s.chosenSource === 'skip' || s.missingColumns.length === 0
  ) ?? false)
    && (sheets?.some(s => s.chosenSource !== 'skip') ?? false)
    && modalForm.uploadedBy.trim().length > 0

  const handleSubmit = async () => {
    if (!sheets) return
    setSubmitting(true)
    setResults([])
    const out: typeof results = []
    for (const sheet of sheets) {
      if (sheet.chosenSource === 'skip') continue
      try {
        const res = await submitSheet(sheet, sheet.chosenSource, modalForm)
        out.push({
          source: sheet.chosenSource,
          success: !!res.success,
          message: res.success ? `Uploaded ${res.rowCount} rows` : (res.error ?? 'Unknown error'),
        })
      } catch (err) {
        out.push({ source: sheet.chosenSource, success: false, message: String(err) })
      }
    }
    setResults(out)
    setSubmitting(false)
    setModalOpen(false)
    setSheets(null)
    refresh()
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Upload' }]} />

      <section>
        <h1 className="mb-1 font-sans text-base font-semibold text-dash-text">Upload data</h1>
        <p className="mb-4 text-xs text-dash-text-muted">
          Drop a workbook (xlsx) or single file (csv/tsv). Sheets are auto-routed by name or column signature where possible — you&apos;ll confirm before anything is written.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const f = e.dataTransfer.files[0]
            if (f) void handleFile(f)
          }}
          onClick={() => fileRef.current?.click()}
          className={`flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
            isDragging ? 'border-dash-red bg-dash-red/5' : 'border-dash-border bg-dash-surface hover:border-dash-text-muted'
          }`}
        >
          <p className="text-sm text-dash-text">Drop file here or click to browse</p>
          <p className="mt-1 text-xs text-dash-text-muted">xlsx, csv, tsv</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); if (fileRef.current) fileRef.current.value = '' }}
          />
        </div>

        {parseError && (
          <p className="mt-3 text-xs text-status-red">{parseError}</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-sans text-sm font-semibold text-dash-text">Source status</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {VALID_SOURCES.map(source => (
            <div key={source} className="rounded-lg border border-dash-border bg-dash-surface p-3">
              <p className="font-mono text-xs uppercase tracking-wide text-dash-text-muted">{source}</p>
              <p className="mt-1 text-sm text-dash-text">
                {lastRefreshed[source]
                  ? `Last upload: ${new Date(lastRefreshed[source]!).toLocaleString('en-AU')}`
                  : 'Never uploaded'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {results.length > 0 && (
        <section>
          <h2 className="mb-3 font-sans text-sm font-semibold text-dash-text">Last upload results</h2>
          <ul className="space-y-1 text-sm">
            {results.map((r, i) => (
              <li key={i} className={r.success ? 'text-status-green' : 'text-status-red'}>
                {r.source}: {r.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {modalOpen && sheets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-dash-bg p-6">
            <h2 className="mb-4 font-sans text-base font-semibold text-dash-text">Confirm upload</h2>

            <div className="space-y-3">
              {sheets.map((s, idx) => (
                <div key={idx} className="rounded-md border border-dash-border bg-dash-surface p-3">
                  <p className="text-xs text-dash-text-muted">{s.file.name} :: {s.sheetName}</p>

                  <div className="mt-2 grid grid-cols-3 items-center gap-3">
                    <div>
                      <label className="block text-xs text-dash-text-muted">Source</label>
                      <select
                        value={s.chosenSource}
                        onChange={(e) => handleSourceChange(idx, e.target.value as SourceKey | 'skip')}
                        className="mt-1 w-full rounded-md border border-dash-border bg-dash-bg px-2 py-1 text-sm text-dash-text"
                      >
                        {VALID_SOURCES.map(src => (
                          <option key={src} value={src}>{src}</option>
                        ))}
                        <option value="skip">Skip this sheet</option>
                      </select>
                    </div>
                    <div className="text-xs text-dash-text-secondary">{s.rowCount} rows</div>
                    <div className="text-xs">
                      {s.chosenSource === 'skip'
                        ? <span className="text-dash-text-muted">Skipped</span>
                        : s.missingColumns.length === 0
                          ? <span className="text-status-green">✓ Valid</span>
                          : <span className="text-status-red">✗ Missing: {s.missingColumns.join(', ')}</span>}
                    </div>
                  </div>

                  {s.chosenSource !== 'skip' && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-dash-text-muted">Period from</label>
                        <input
                          type="date"
                          value={s.periodFrom}
                          onChange={(e) => handlePeriodChange(idx, 'periodFrom', e.target.value)}
                          className="mt-1 w-full rounded-md border border-dash-border bg-dash-bg px-2 py-1 font-mono text-xs text-dash-text"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-dash-text-muted">Period to</label>
                        <input
                          type="date"
                          value={s.periodTo}
                          onChange={(e) => handlePeriodChange(idx, 'periodTo', e.target.value)}
                          className="mt-1 w-full rounded-md border border-dash-border bg-dash-bg px-2 py-1 font-mono text-xs text-dash-text"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <label className="block text-xs text-dash-text-muted">Uploaded by</label>
                <input
                  type="email"
                  value={modalForm.uploadedBy}
                  onChange={(e) => setModalForm(f => ({ ...f, uploadedBy: e.target.value }))}
                  placeholder="you@tmrw.health"
                  className="mt-1 w-full rounded-md border border-dash-border bg-dash-bg px-2 py-1 text-sm text-dash-text"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => { setModalOpen(false); setSheets(null) }}
                className="rounded-md border border-dash-border px-4 py-2 text-sm text-dash-text hover:bg-dash-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="rounded-md bg-dash-red px-4 py-2 text-sm font-medium text-dash-text-inverse hover:bg-dash-red/90 disabled:opacity-50"
              >
                {submitting ? 'Uploading…' : `Upload ${sheets.filter(s => s.chosenSource !== 'skip').length} sheet(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────

// Probe each source's required-column schema; if exactly one source's
// requirements are fully satisfied by the headers, that's the match.
// More than one match → ambiguous → return null (user picks).
function detectSourceByHeaders(headers: string[]): SourceKey | null {
  const matches: SourceKey[] = []
  for (const source of VALID_SOURCES) {
    const schema = getSchema(source)
    if (!schema) continue
    const missing = validateRequiredColumns(schema, headers)
    if (missing.length === 0) matches.push(source)
  }
  return matches.length === 1 ? matches[0] : null
}

function detectDateRange(
  rows: Record<string, unknown>[],
  source: SourceKey
): { from: string; to: string } {
  const targetCol = DATE_COL[source]
  if (!rows.length || !targetCol) return { from: '', to: '' }

  const matchingKey = Object.keys(rows[0]).find(k => k.toLowerCase().trim() === targetCol)
  if (!matchingKey) return { from: '', to: '' }

  const timestamps: number[] = []
  for (const row of rows) {
    const val = row[matchingKey]
    if (val === null || val === undefined || val === '') continue
    const d = new Date(String(val))
    if (!isNaN(d.getTime())) timestamps.push(d.getTime())
  }
  if (!timestamps.length) return { from: '', to: '' }

  return {
    from: new Date(Math.min(...timestamps)).toISOString().split('T')[0],
    to: new Date(Math.max(...timestamps)).toISOString().split('T')[0],
  }
}

async function parseDroppedFile(file: File): Promise<DetectedSheet[]> {
  const ext = file.name.toLowerCase().split('.').pop() ?? ''

  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    return wb.SheetNames.map(sheetName => {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: null })
      const headers = rows.length > 0 ? Object.keys(rows[0]) : []
      const byName = SHEET_NAME_TO_SOURCE[sheetName.toLowerCase().trim()] ?? null
      const detected = byName ?? detectSourceByHeaders(headers)
      return {
        file,
        sheetName,
        rows,
        headers,
        detectedSource: detected,
        rowCount: rows.length,
      }
    })
  }

  const text = await file.text()
  const delimiter = text.includes('\t') ? '\t' : ','
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true, skipEmptyLines: true, delimiter,
  })
  const rows = result.data
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  return [{
    file,
    sheetName: file.name,
    rows,
    headers,
    detectedSource: detectSourceByHeaders(headers),
    rowCount: rows.length,
  }]
}

function validateSheet(sheet: DetectedSheet, source: SourceKey): string[] {
  const schema = getSchema(source)
  if (!schema) return ['Unknown source']
  return validateRequiredColumns(schema, sheet.headers)
}

async function submitSheet(sheet: SheetSubmissionState, source: SourceKey, metadata: ModalForm) {
  const csv = Papa.unparse(sheet.rows)
  const blob = new Blob([csv], { type: 'text/csv' })
  const file = new File([blob], `${sheet.sheetName}.csv`, { type: 'text/csv' })

  const fd = new FormData()
  fd.append('file', file)
  fd.append('source', source)
  fd.append('uploaded_by', metadata.uploadedBy)
  fd.append('data_period_from', sheet.periodFrom)
  fd.append('data_period_to', sheet.periodTo)
  fd.append('file_name', `${sheet.file.name} :: ${sheet.sheetName}`)

  const res = await fetch('/api/data/upload', { method: 'POST', body: fd })
  return res.json()
}

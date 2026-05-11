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

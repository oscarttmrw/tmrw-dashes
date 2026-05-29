import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/service'
import { getSchema, validateRequiredColumns } from '@/lib/config/data-sources'
import {
  fullReplaceStrategy,
  dateRangeReplaceStrategy,
  upsertStrategy,
} from '@/lib/upload-strategies'
import { processMetaAdsToCanonical } from '@/lib/processors/meta-processor'
import { processSocialFollowersToCanonical } from '@/lib/processors/social-followers-processor'
import { processSocialViewsToCanonical } from '@/lib/processors/social-views-processor'
import { processStripeToCanonical } from '@/lib/processors/stripe-processor'
import { processHubspotContactsToCanonical } from '@/lib/processors/hubspot-contacts-processor'
import { processGhlToCanonical } from '@/lib/processors/ghl-processor'
import { processOperationalDataToCanonical } from '@/lib/processors/operational-data-processor'
import { processPelagoniaToCanonical } from '@/lib/processors/pelagonia-processor'
import { processTableauToCanonical } from '@/lib/processors/tableau-processor'
import { processZendeskToCanonical } from '@/lib/processors/zendesk-processor'
import {
  processFinancialRevenueNetToCanonical,
  processFinancialRevenueGrossToCanonical,
} from '@/lib/processors/financial-revenue-processor'
import type { ProcessorResult } from '@/lib/processors/_canonical-helpers'

type SourceKey =
  | 'tableau'
  | 'hubspot_contacts'
  | 'ghl_opportunities'
  | 'operational_data'
  | 'stripe'
  | 'zendesk'
  | 'meta_ads'
  | 'social_followers'
  | 'social_views'
  | 'pelagonia'
  | 'financial_revenue_net'
  | 'financial_revenue_gross'

const SOURCE_TABLE: Record<SourceKey, string> = {
  tableau: 'tableau_data',
  hubspot_contacts: 'hubspot_contacts',
  ghl_opportunities: 'ghl_opportunities',
  operational_data: 'operational_data',
  stripe: 'stripe_data',
  zendesk: 'zendesk_data',
  meta_ads: 'meta_ads',
  social_followers: 'social_followers',
  social_views: 'social_views',
  pelagonia: 'pelagonia_data',
  financial_revenue_net: 'financial_revenue',
  financial_revenue_gross: 'financial_revenue',
}

const SOURCE_DATE_COLUMN: Record<SourceKey, string | null> = {
  tableau: null,
  hubspot_contacts: null,
  ghl_opportunities: 'created_on',
  operational_data: 'date',
  stripe: 'created',
  zendesk: null,
  meta_ads: 'date',
  social_followers: 'date',
  social_views: 'date',
  pelagonia: 'pelagonia_created_at',
  financial_revenue_net: 'date',
  financial_revenue_gross: 'date',
}

const SOURCE_PROCESSOR: Record<SourceKey, (data: Record<string, unknown>[]) => ProcessorResult> = {
  meta_ads: processMetaAdsToCanonical,
  social_followers: processSocialFollowersToCanonical,
  social_views: processSocialViewsToCanonical,
  stripe: processStripeToCanonical,
  hubspot_contacts: processHubspotContactsToCanonical,
  ghl_opportunities: processGhlToCanonical,
  operational_data: processOperationalDataToCanonical,
  pelagonia: processPelagoniaToCanonical,
  tableau: processTableauToCanonical,
  zendesk: processZendeskToCanonical,
  financial_revenue_net: processFinancialRevenueNetToCanonical,
  financial_revenue_gross: processFinancialRevenueGrossToCanonical,
}

async function applyWriteStrategy(
  supabase: ReturnType<typeof createClient>,
  source: SourceKey,
  batchId: string,
  rows: Record<string, unknown>[]
) {
  const table = SOURCE_TABLE[source]
  switch (source) {
    case 'tableau':
    case 'hubspot_contacts':
      return fullReplaceStrategy(supabase, table, batchId, rows)
    case 'ghl_opportunities':
      return upsertStrategy(supabase, table, batchId, rows, 'opportunity_id')
    case 'operational_data':
      return upsertStrategy(supabase, table, batchId, rows, 'date')
    case 'stripe':
      return upsertStrategy(supabase, table, batchId, rows, 'stripe_invoice_id')
    case 'meta_ads':
      return dateRangeReplaceStrategy(supabase, table, batchId, rows, 'date')
    case 'social_followers':
      return upsertStrategy(supabase, table, batchId, rows, 'date,platform')
    case 'social_views':
      return upsertStrategy(supabase, table, batchId, rows, 'date,platform')
    case 'pelagonia':
      return dateRangeReplaceStrategy(supabase, table, batchId, rows, 'pelagonia_created_at')
    case 'zendesk':
      return upsertStrategy(supabase, table, batchId, rows, 'zendesk_ticket_id')
    case 'financial_revenue_net':
    case 'financial_revenue_gross': {
      // Snapshot-replace only this revenue_type's rows so uploading the Net
      // sheet doesn't wipe the Gross rows (both live in financial_revenue).
      const revenueType = source === 'financial_revenue_net' ? 'net' : 'gross'
      const { error: delErr } = await supabase
        .from(table)
        .delete()
        .eq('revenue_type', revenueType)
      if (delErr) throw delErr
      if (rows.length === 0) return
      const { error: insErr } = await supabase
        .from(table)
        .insert(rows.map(r => ({ ...r, batch_id: batchId })))
      if (insErr) throw insErr
      return
    }
  }
}

function dataPeriodBounds(
  rows: Record<string, unknown>[],
  source: SourceKey
): { start: string | null; end: string | null } {
  const col = SOURCE_DATE_COLUMN[source]
  if (!col) return { start: null, end: null }
  const times = rows
    .map(r => new Date(String(r[col] ?? '')).getTime())
    .filter(t => !isNaN(t))
  if (times.length === 0) return { start: null, end: null }
  return {
    start: new Date(Math.min(...times)).toISOString(),
    end: new Date(Math.max(...times)).toISOString(),
  }
}

/**
 * Pull a usable string out of any thrown value. `String(err)` on a Supabase
 * error object yields "[object Object]" — this helper unwraps Error / string
 * / plain-object payloads so the API and upload_log both surface real messages.
 */
function extractErrorMessage(err: unknown): string {
  if (err === null || err === undefined) return 'Unknown error'
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    const maybe = err as { message?: unknown; error?: unknown; details?: unknown; hint?: unknown }
    if (typeof maybe.message === 'string') return maybe.message
    if (typeof maybe.error === 'string') return maybe.error
    if (typeof maybe.details === 'string') return maybe.details
    if (typeof maybe.hint === 'string') return maybe.hint
    try {
      return JSON.stringify(err)
    } catch {
      return Object.prototype.toString.call(err)
    }
  }
  return String(err)
}

export async function POST(request: NextRequest) {
  let batchId: string | null = null
  const supabase = createClient()

  try {
    const form = await request.formData()
    const sourceVal = form.get('source')
    const file = form.get('file')

    if (!sourceVal || !file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing source or file' }, { status: 400 })
    }

    const source = sourceVal.toString() as SourceKey
    if (!SOURCE_TABLE[source]) {
      return NextResponse.json({ error: `Unknown source: ${source}` }, { status: 400 })
    }

    const uploadedBy      = form.get('uploaded_by')?.toString()      ?? null
    const dataPeriodFrom  = form.get('data_period_from')?.toString()  ?? null
    const dataPeriodTo    = form.get('data_period_to')?.toString()    ?? null
    const dataPeriodLabel = form.get('data_period_label')?.toString() ?? null
    const fileName        = form.get('file_name')?.toString()         ?? file.name

    const buffer = await file.arrayBuffer()
    const name = file.name.toLowerCase()
    let rawRows: Record<string, unknown>[]

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const { default: XLSX } = await import('xlsx')
      const wb = XLSX.read(buffer, { type: 'array' })
      // Operational Data ships on Sheet2; other xlsx files use the first sheet.
      const sheetName =
        source === 'operational_data' && wb.SheetNames.includes('Sheet2')
          ? 'Sheet2'
          : wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      // Operational Data needs raw Excel serial numbers to come through as
      // numbers, not pre-formatted strings — set raw:true for this source.
      const sheetOpts =
        source === 'operational_data'
          ? { defval: null, raw: true }
          : { defval: null }
      rawRows = XLSX.utils.sheet_to_json(ws, sheetOpts) as Record<string, unknown>[]
    } else {
      let text: string
      try {
        text = new TextDecoder('utf-16le').decode(buffer)
        if (!text.includes('\t') && !text.includes(',')) throw new Error('not utf-16')
      } catch {
        text = new TextDecoder('utf-8').decode(buffer)
      }
      const delimiter = text.includes('\t') ? '\t' : ','
      const { default: Papa } = await import('papaparse')
      const result = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
        delimiter,
      })
      rawRows = result.data
    }

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'File contains no data rows' }, { status: 422 })
    }

    const schema = getSchema(source)
    if (schema) {
      const missing = validateRequiredColumns(schema, Object.keys(rawRows[0]))
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Missing required columns: ${missing.join(', ')}` },
          { status: 422 }
        )
      }
    }

    const processor = SOURCE_PROCESSOR[source]
    const { validRows, errors } = processor(rawRows)

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid rows after processing',
          errorCount: errors.length,
          errors: errors.slice(0, 50),
        },
        { status: 400 }
      )
    }

    const period = dataPeriodBounds(validRows, source)

    const { data: logRow, error: logErr } = await supabase
      .from('upload_log')
      .insert({
        source,
        record_count: validRows.length,
        status: 'in_progress',
        uploaded_by: uploadedBy,
        data_period_from: dataPeriodFrom || period.start,
        data_period_to: dataPeriodTo || period.end,
        data_period_label: dataPeriodLabel || null,
        file_name: fileName,
      })
      .select('id')
      .single()

    if (logErr || !logRow) throw logErr ?? new Error('Failed to create upload log')
    batchId = logRow.id

    await applyWriteStrategy(supabase, source, batchId!, validRows)

    await supabase
      .from('upload_log')
      .update({
        status: 'complete',
        record_count: validRows.length,
      })
      .eq('id', batchId)

    return NextResponse.json({
      success: true,
      batchId,
      rowCount: validRows.length,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const message = extractErrorMessage(err)
    if (batchId) {
      const supabase2 = createClient()
      await supabase2
        .from('upload_log')
        .update({ status: 'failed', error: message })
        .eq('id', batchId)
    }
    console.error('Upload error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/service'
import { getSchema, validateRequiredColumns } from '@/lib/config/data-sources'
import {
  fullReplaceStrategy,
  dateRangeReplaceStrategy,
  upsertStrategy,
  appendStrategy,
} from '@/lib/upload-strategies'
import { processMetaAdsToCanonical } from '@/lib/processors/meta-processor'
import { processSocialOrganicToCanonical } from '@/lib/processors/social-organic-processor'
import { processStripeToCanonical } from '@/lib/processors/stripe-processor'
import { processHubspotToCanonical } from '@/lib/processors/hubspot-processor'
import { processPelagoniaToCanonical } from '@/lib/processors/pelagonia-processor'
import { processTableauToCanonical } from '@/lib/processors/tableau-processor'
import { processZendeskToCanonical } from '@/lib/processors/zendesk-processor'
import type { ProcessorResult } from '@/lib/processors/_canonical-helpers'

type SourceKey = 'tableau' | 'hubspot' | 'stripe' | 'zendesk' | 'meta_ads' | 'social_organic' | 'pelagonia'

const SOURCE_TABLE: Record<SourceKey, string> = {
  tableau: 'tableau_data',
  hubspot: 'hubspot_data',
  stripe: 'stripe_data',
  zendesk: 'zendesk_data',
  meta_ads: 'meta_ads',
  social_organic: 'social_organic',
  pelagonia: 'pelagonia_data',
}

const SOURCE_DATE_COLUMN: Record<SourceKey, string | null> = {
  tableau: null,
  hubspot: null,
  stripe: 'created',
  zendesk: null,
  meta_ads: 'date',
  social_organic: 'date',
  pelagonia: 'pelagonia_created_at',
}

const SOURCE_PROCESSOR: Record<SourceKey, (data: Record<string, unknown>[]) => ProcessorResult> = {
  meta_ads: processMetaAdsToCanonical,
  social_organic: processSocialOrganicToCanonical,
  stripe: processStripeToCanonical,
  hubspot: processHubspotToCanonical,
  pelagonia: processPelagoniaToCanonical,
  tableau: processTableauToCanonical,
  zendesk: processZendeskToCanonical,
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
    case 'hubspot':
      return fullReplaceStrategy(supabase, table, batchId, rows)
    case 'stripe':
      return dateRangeReplaceStrategy(supabase, table, batchId, rows, 'created')
    case 'meta_ads':
      return dateRangeReplaceStrategy(supabase, table, batchId, rows, 'date')
    case 'social_organic':
      // Upsert on the composite unique constraint so re-uploads update in place.
      return upsertStrategy(supabase, table, batchId, rows, 'date,platform,metric_name')
    case 'pelagonia':
      return dateRangeReplaceStrategy(supabase, table, batchId, rows, 'pelagonia_created_at')
    case 'zendesk':
      return upsertStrategy(supabase, table, batchId, rows, 'zendesk_ticket_id')
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
      const ws = wb.Sheets[wb.SheetNames[0]]
      rawRows = XLSX.utils.sheet_to_json(ws, { defval: null }) as Record<string, unknown>[]
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
    if (batchId) {
      const supabase2 = createClient()
      await supabase2
        .from('upload_log')
        .update({ status: 'failed', error: String(err) })
        .eq('id', batchId)
    }
    console.error('Upload error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

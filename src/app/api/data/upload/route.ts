import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/service'
import { getSchema } from '@/lib/config/data-sources'
import { fullReplaceStrategy, dateRangeReplaceStrategy, upsertStrategy } from '@/lib/upload-strategies'

type SourceKey = 'tableau' | 'hubspot' | 'stripe' | 'zendesk' | 'meta' | 'pelagonia'

const SOURCE_TABLE: Record<SourceKey, string> = {
  tableau: 'tableau_data',
  hubspot: 'hubspot_data',
  stripe: 'stripe_data',
  zendesk: 'zendesk_data',
  meta: 'meta_data',
  pelagonia: 'pelagonia_data',
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
    case 'pelagonia':
      return fullReplaceStrategy(supabase, table, batchId, rows)
    case 'stripe':
      return dateRangeReplaceStrategy(supabase, table, batchId, rows, 'created')
    case 'meta':
      return dateRangeReplaceStrategy(supabase, table, batchId, rows, 'Reporting Starts')
    case 'zendesk':
      return upsertStrategy(supabase, table, batchId, rows, 'ID')
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

    // Audit metadata
    const uploadedBy      = form.get('uploaded_by')?.toString()      ?? null
    const dataPeriodFrom  = form.get('data_period_from')?.toString()  ?? null
    const dataPeriodTo    = form.get('data_period_to')?.toString()    ?? null
    const dataPeriodLabel = form.get('data_period_label')?.toString() ?? null
    const fileName        = form.get('file_name')?.toString()         ?? file.name

    const buffer = await file.arrayBuffer()
    const name = file.name.toLowerCase()
    let rows: Record<string, unknown>[]

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const { default: XLSX } = await import('xlsx')
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json(ws, { defval: null }) as Record<string, unknown>[]
    } else {
      // Try UTF-16 (Tableau TSV) then fall back to UTF-8
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
      rows = result.data
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'File contains no data rows' }, { status: 422 })
    }

    // Validate required columns (case-insensitive)
    const schema = getSchema(source)
    if (schema) {
      const normHeaders = Object.keys(rows[0]).map(h => h.toLowerCase().trim())
      const missing = schema.requiredColumns.filter(col => !normHeaders.includes(col.toLowerCase().trim()))
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Missing required columns: ${missing.join(', ')}` },
          { status: 422 }
        )
      }
    }

    // Create upload_log row
    const { data: logRow, error: logErr } = await supabase
      .from('upload_log')
      .insert({
        source,
        record_count: rows.length,
        status: 'pending',
        uploaded_by: uploadedBy,
        data_period_from: dataPeriodFrom || null,
        data_period_to: dataPeriodTo || null,
        data_period_label: dataPeriodLabel || null,
        file_name: fileName,
      })
      .select('id')
      .single()

    if (logErr || !logRow) throw logErr ?? new Error('Failed to create upload log')
    batchId = logRow.id

    await applyWriteStrategy(supabase, source, batchId!, rows)

    await supabase
      .from('upload_log')
      .update({ status: 'complete', record_count: rows.length })
      .eq('id', batchId)

    return NextResponse.json({
      success: true,
      batchId,
      recordCount: rows.length,
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

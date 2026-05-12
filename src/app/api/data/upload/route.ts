import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/service'
import { getSchema } from '@/lib/config/data-sources'
import { fullReplaceStrategy, appendStrategy, dateRangeReplaceStrategy, upsertStrategy } from '@/lib/upload-strategies'

type SourceKey = 'tableau' | 'hubspot' | 'stripe' | 'zendesk'

const SOURCE_TABLE: Record<SourceKey, string> = {
  tableau: 'tableau_data',
  hubspot: 'hubspot_data',
  stripe: 'stripe_data',
  zendesk: 'zendesk_data',
}

// Which write strategy to apply per source
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
    case 'zendesk':
      return upsertStrategy(supabase, table, batchId, rows, 'ID')
  }
}

export async function POST(request: NextRequest) {
  let batchId: string | null = null
  const supabase = createClient()

  try {
    const contentType = request.headers.get('content-type') ?? ''

    let source: SourceKey
    let rows: Record<string, unknown>[]

    if (contentType.includes('multipart/form-data')) {
      // File upload path
      const form = await request.formData()
      const sourceVal = form.get('source')
      const file = form.get('file')

      if (!sourceVal || !file || !(file instanceof File)) {
        return NextResponse.json({ error: 'Missing source or file' }, { status: 400 })
      }
      source = sourceVal.toString() as SourceKey
      if (!SOURCE_TABLE[source]) {
        return NextResponse.json({ error: `Unknown source: ${source}` }, { status: 400 })
      }

      const buffer = await file.arrayBuffer()
      const fileName = file.name.toLowerCase()

      // Parse file — support CSV, TSV, XLSX, and Tableau's UTF-16 TSV
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const { default: XLSX } = await import('xlsx')
        const wb = XLSX.read(buffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(ws, { defval: null }) as Record<string, unknown>[]
      } else {
        // Try UTF-16 decode first (Tableau TSV), fall back to UTF-8
        let text: string
        try {
          text = new TextDecoder('utf-16le').decode(buffer)
          if (!text.includes('\t') && !text.includes(',')) throw new Error('not utf16')
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
    } else {
      // JSON path (legacy / programmatic)
      const body = await request.json()
      source = body.source as SourceKey
      rows = body.data as Record<string, unknown>[]
      if (!source || !rows) {
        return NextResponse.json({ error: 'Missing source or data' }, { status: 400 })
      }
    }

    // Validate required columns
    const schema = getSchema(source)
    if (schema && rows.length > 0) {
      const headers = Object.keys(rows[0])
      const missing = schema.requiredColumns.filter(col => !headers.includes(col))
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Missing required columns: ${missing.join(', ')}` },
          { status: 422 }
        )
      }
    }

    // Create upload_log row first to get the batch_id
    const { data: logRow, error: logErr } = await supabase
      .from('upload_log')
      .insert({ source, record_count: rows.length, status: 'pending' })
      .select('id')
      .single()

    if (logErr || !logRow) throw logErr ?? new Error('Failed to create upload log')
    batchId = logRow.id

    // Write rows using the appropriate strategy
    await applyWriteStrategy(supabase, source, batchId, rows)

    // Mark complete
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
    // If we have a batch_id, mark it failed
    if (batchId) {
      const supabase2 = createClient()
      await supabase2
        .from('upload_log')
        .update({ status: 'failed', error: String(err) })
        .eq('id', batchId)
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * Manual CSV / XLSX upload.
 *
 * This route owns only the file-specific part of ingest: reading the upload,
 * decoding it, and turning it into raw rows. Everything after that —
 * validation, processing, the upload_log batch, and the write strategy — lives
 * in src/lib/ingest/pipeline.ts and is shared with the automated
 * /api/data/ingest endpoint, so both paths behave identically.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  runIngest,
  isSourceKey,
  extractErrorMessage,
  type SourceKey,
} from '@/lib/ingest/pipeline'

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const sourceVal = form.get('source')
    const file = form.get('file')

    if (!sourceVal || !file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing source or file' }, { status: 400 })
    }

    const source = sourceVal.toString() as SourceKey
    if (!isSourceKey(source)) {
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

    const result = await runIngest(source, rawRows, {
      uploadedBy,
      dataPeriodFrom,
      dataPeriodTo,
      dataPeriodLabel,
      fileName,
    })

    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      batchId: result.batchId,
      rowCount: result.rowCount,
      errorCount: result.errorCount,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    // Reached only for failures before ingest starts — malformed multipart
    // body, unreadable file, bad encoding. Batch-level failures are recorded
    // against upload_log inside runIngest.
    const message = extractErrorMessage(err)
    console.error('Upload error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

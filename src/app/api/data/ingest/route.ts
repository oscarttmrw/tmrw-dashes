/**
 * Automated ingest endpoint — the "second front door" for data.
 *
 * The manual path (/api/data/upload) takes a file from a person in a browser.
 * This route takes rows as JSON from a scheduled job (e.g. a nightly Snowflake
 * sync), and hands them to the SAME pipeline: same column validation, same
 * processors, same write strategies, same upload_log audit trail. There is no
 * second copy of that logic — see src/lib/ingest/pipeline.ts.
 *
 * AUTH
 *   This route is excluded from the cookie-session check in src/middleware.ts,
 *   because an automated caller has no browser session. It is gated instead by
 *   a bearer token and FAILS CLOSED: if INGEST_TOKEN is not set in the
 *   environment, every request is rejected. It is never open.
 *
 *     Authorization: Bearer <INGEST_TOKEN>
 *
 * REQUEST
 *   POST /api/data/ingest
 *   Content-Type: application/json
 *   {
 *     "source": "meta_ads",
 *     "rows": [ { "Date": "2026-08-01", "Spend ($)": 1234.56, ... } ],
 *     "uploaded_by":        "snowflake-sync",   // optional, for the audit log
 *     "data_period_label":  "Aug 2026",         // optional
 *     "data_period_from":   "2026-08-01",       // optional, else derived
 *     "data_period_to":     "2026-08-07"        // optional, else derived
 *   }
 *
 * IMPORTANT — the shape of `rows`
 *   Keys must match the source's EXPORT COLUMN HEADERS, not the database column
 *   names — the same headers the CSV upload expects (they are declared per
 *   source in src/lib/config/data-sources.ts). The processor normalises them.
 *   So a Snowflake query should alias its columns to those headers:
 *
 *     select reporting_date as "Date", total_spend as "Spend ($)" from ...
 *
 *   This is deliberate: it means automated data goes through exactly the same
 *   tested validation and coercion as a hand-uploaded file, instead of a
 *   parallel path that could drift. Header matching is case-insensitive.
 *
 * RESPONSES
 *   200  { success, batchId, rowCount, errorCount, errors[], timestamp }
 *   401  bad or missing token
 *   400  bad JSON / unknown source / empty or malformed rows
 *   413  payload exceeds MAX_ROWS
 *   422  required columns missing
 *   500  write failed (the batch is marked `failed` in upload_log)
 *   503  INGEST_TOKEN not configured on the server
 *
 * Re-running the same sync is safe. Every write strategy is idempotent —
 * upserts key on a unique column, date-range sources replace the range they
 * cover, and snapshot sources replace wholesale. A retry corrects rather than
 * duplicates.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { runIngest, isSourceKey, SOURCE_KEYS } from '@/lib/ingest/pipeline'

/**
 * Upper bound on rows per request. Guards against a runaway query filling the
 * database or exhausting the function's memory. A daily sync of any current
 * source is far below this; a legitimate backfill should be chunked by date
 * range across several calls rather than raising this number.
 */
const MAX_ROWS = 50_000

/** Constant-time token comparison, via fixed-length digests. */
function tokensMatch(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

function isAuthorized(request: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.INGEST_TOKEN

  // Fail closed. An unset token must never mean "allow everyone".
  if (!expected || expected.trim() === '') {
    console.error('INGEST_TOKEN is not configured — rejecting ingest request.')
    return {
      ok: false,
      status: 503,
      error: 'Ingest endpoint is not configured on this deployment.',
    }
  }

  const header = request.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return { ok: false, status: 401, error: 'Missing or malformed Authorization header.' }
  }

  if (!tokensMatch(match[1].trim(), expected.trim())) {
    return { ok: false, status: 401, error: 'Invalid ingest token.' }
  }

  return { ok: true }
}

export async function POST(request: NextRequest) {
  const auth = isAuthorized(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const payload = body as {
    source?: unknown
    rows?: unknown
    uploaded_by?: unknown
    data_period_label?: unknown
    data_period_from?: unknown
    data_period_to?: unknown
  }

  if (!isSourceKey(payload.source)) {
    return NextResponse.json(
      {
        error: `Unknown source: ${String(payload.source)}`,
        validSources: SOURCE_KEYS,
      },
      { status: 400 }
    )
  }
  const source = payload.source

  if (!Array.isArray(payload.rows)) {
    return NextResponse.json({ error: '`rows` must be an array' }, { status: 400 })
  }
  if (payload.rows.length === 0) {
    return NextResponse.json({ error: '`rows` is empty — nothing to ingest' }, { status: 400 })
  }
  if (payload.rows.length > MAX_ROWS) {
    return NextResponse.json(
      {
        error: `Too many rows: ${payload.rows.length}. Maximum is ${MAX_ROWS} per request — chunk the sync by date range.`,
      },
      { status: 413 }
    )
  }

  // Every row must be a plain object; the processors index rows by key.
  const badRow = payload.rows.findIndex(
    r => typeof r !== 'object' || r === null || Array.isArray(r)
  )
  if (badRow !== -1) {
    return NextResponse.json(
      { error: `Row ${badRow} is not an object — every row must be a key/value map` },
      { status: 400 }
    )
  }
  const rows = payload.rows as Record<string, unknown>[]

  const asStringOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() !== '' ? v : null

  const result = await runIngest(source, rows, {
    // Defaults to a recognisable marker so Upload History clearly separates
    // automated syncs from files a person uploaded.
    uploadedBy: asStringOrNull(payload.uploaded_by) ?? 'automated-sync',
    dataPeriodFrom: asStringOrNull(payload.data_period_from),
    dataPeriodTo: asStringOrNull(payload.data_period_to),
    dataPeriodLabel: asStringOrNull(payload.data_period_label),
    fileName: null,
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
}

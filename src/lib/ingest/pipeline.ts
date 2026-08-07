/**
 * Shared ingest pipeline.
 *
 * This module owns everything that happens AFTER rows have been obtained and
 * BEFORE a response is returned:
 *
 *   raw rows → validate columns → processor → canonical rows
 *            → upload_log batch → write strategy → mark complete
 *
 * It is deliberately independent of where the rows came from. Two routes use it:
 *
 *   POST /api/data/upload  — a person uploads a CSV/XLSX in the browser
 *   POST /api/data/ingest  — an automated job posts rows as JSON
 *
 * Both paths therefore run the same validation, the same processors, the same
 * write strategies, and land in the same `upload_log` audit trail. Adding a
 * source here wires up both at once — there is only one mapping to maintain.
 *
 * Everything in this file was moved verbatim out of the upload route; the
 * behaviour of that route is unchanged.
 */
import { createServiceClient } from '@/lib/supabase/service'
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

export type SourceKey =
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

export const SOURCE_TABLE: Record<SourceKey, string> = {
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

export const SOURCE_DATE_COLUMN: Record<SourceKey, string | null> = {
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

export const SOURCE_PROCESSOR: Record<
  SourceKey,
  (data: Record<string, unknown>[]) => ProcessorResult
> = {
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

/** Every valid source key, for validating untrusted input. */
export const SOURCE_KEYS = Object.keys(SOURCE_TABLE) as SourceKey[]

export function isSourceKey(v: unknown): v is SourceKey {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(SOURCE_TABLE, v)
}

export async function applyWriteStrategy(
  supabase: ReturnType<typeof createServiceClient>,
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

export function dataPeriodBounds(
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
export function extractErrorMessage(err: unknown): string {
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

export interface IngestAudit {
  uploadedBy?: string | null
  dataPeriodFrom?: string | null
  dataPeriodTo?: string | null
  dataPeriodLabel?: string | null
  fileName?: string | null
}

export type IngestResult =
  | {
      ok: true
      batchId: string
      rowCount: number
      errorCount: number
      errors: { rowIndex: number; reason: string }[]
    }
  | { ok: false; status: number; body: Record<string, unknown> }

/**
 * Validate, process, and persist a batch of raw rows.
 *
 * `rawRows` are pre-canonical — keyed by the source's export column headers
 * (e.g. "Spend ($)", "Reporting Starts"), exactly as they arrive from a CSV.
 * The source's processor normalises them. An automated caller should alias its
 * query columns to those same headers so it goes through identical validation
 * rather than a second, untested code path.
 *
 * On any failure after the batch row is created, the batch is marked `failed`
 * with the error message before returning, so a partial write is always
 * visible in the audit trail rather than silently disappearing.
 */
export async function runIngest(
  source: SourceKey,
  rawRows: Record<string, unknown>[],
  audit: IngestAudit = {}
): Promise<IngestResult> {
  const supabase = createServiceClient()
  let batchId: string | null = null

  try {
    const schema = getSchema(source)
    if (schema) {
      const missing = validateRequiredColumns(schema, Object.keys(rawRows[0]))
      if (missing.length > 0) {
        return {
          ok: false,
          status: 422,
          body: { error: `Missing required columns: ${missing.join(', ')}` },
        }
      }
    }

    const processor = SOURCE_PROCESSOR[source]
    const { validRows, errors } = processor(rawRows)

    if (validRows.length === 0) {
      return {
        ok: false,
        status: 400,
        body: {
          error: 'No valid rows after processing',
          errorCount: errors.length,
          errors: errors.slice(0, 50),
        },
      }
    }

    const period = dataPeriodBounds(validRows, source)

    const { data: logRow, error: logErr } = await supabase
      .from('upload_log')
      .insert({
        source,
        record_count: validRows.length,
        status: 'in_progress',
        uploaded_by: audit.uploadedBy ?? null,
        data_period_from: audit.dataPeriodFrom || period.start,
        data_period_to: audit.dataPeriodTo || period.end,
        data_period_label: audit.dataPeriodLabel || null,
        file_name: audit.fileName ?? null,
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

    return {
      ok: true,
      batchId: batchId!,
      rowCount: validRows.length,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
    }
  } catch (err) {
    const message = extractErrorMessage(err)
    if (batchId) {
      await supabase
        .from('upload_log')
        .update({ status: 'failed', error: message })
        .eq('id', batchId)
    }
    console.error(`Ingest error (source=${source}):`, err)
    return { ok: false, status: 500, body: { error: message } }
  }
}

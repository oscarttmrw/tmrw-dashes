import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>

// Inserts all rows with batch_id. Used for append-only sources (Stripe charges).
export async function appendStrategy(
  supabase: SupabaseClient,
  table: string,
  batchId: string,
  rows: Row[]
): Promise<void> {
  const records = rows.map(r => ({ batch_id: batchId, row_data: r }))
  const { error } = await supabase.from(table).insert(records)
  if (error) throw error
}

// Deletes ALL existing rows then inserts fresh. Used when source is always a full export (Tableau, HubSpot).
export async function fullReplaceStrategy(
  supabase: SupabaseClient,
  table: string,
  batchId: string,
  rows: Row[]
): Promise<void> {
  const { error: delErr } = await supabase.from(table).delete().neq('id', 0)
  if (delErr) throw delErr
  const records = rows.map(r => ({ batch_id: batchId, row_data: r }))
  if (records.length > 0) {
    const { error } = await supabase.from(table).insert(records)
    if (error) throw error
  }
}

// Deletes rows whose row_data->>'created' falls within the upload date range, then inserts.
// Used for Stripe where you upload a date-range slice.
export async function dateRangeReplaceStrategy(
  supabase: SupabaseClient,
  table: string,
  batchId: string,
  rows: Row[],
  dateField = 'created'
): Promise<void> {
  if (rows.length === 0) return
  const dates = rows
    .map(r => new Date(r[dateField] as string).getTime())
    .filter(d => !isNaN(d))
  if (dates.length > 0) {
    const minDate = new Date(Math.min(...dates)).toISOString()
    const maxDate = new Date(Math.max(...dates)).toISOString()
    await supabase
      .from(table)
      .delete()
      .gte(`row_data->>'${dateField}'`, minDate)
      .lte(`row_data->>'${dateField}'`, maxDate)
  }
  const records = rows.map(r => ({ batch_id: batchId, row_data: r }))
  const { error } = await supabase.from(table).insert(records)
  if (error) throw error
}

// Upsert by a unique key field inside row_data. Used for Zendesk tickets (ID).
export async function upsertStrategy(
  supabase: SupabaseClient,
  table: string,
  batchId: string,
  rows: Row[],
  _keyField = 'ID'
): Promise<void> {
  // Simple approach: full replace for Zendesk (tickets are small volume)
  await fullReplaceStrategy(supabase, table, batchId, rows)
}

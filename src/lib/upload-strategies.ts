import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>

function withBatch(rows: Row[], batchId: string): Row[] {
  return rows.map(r => ({ ...r, batch_id: batchId }))
}

// Simple insert. Used for append-only sources.
export async function appendStrategy(
  supabase: SupabaseClient,
  table: string,
  batchId: string,
  rows: Row[]
): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase.from(table).insert(withBatch(rows, batchId))
  if (error) throw error
}

// Deletes ALL existing rows then inserts fresh. Used for Tableau, HubSpot.
export async function fullReplaceStrategy(
  supabase: SupabaseClient,
  table: string,
  batchId: string,
  rows: Row[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from(table)
    .delete()
    .not('id', 'is', null)
  if (delErr) throw delErr
  if (rows.length === 0) return
  const { error } = await supabase.from(table).insert(withBatch(rows, batchId))
  if (error) throw error
}

// Deletes rows in the upload's date range, then inserts. Used for Stripe, Meta, Pelagonia.
export async function dateRangeReplaceStrategy(
  supabase: SupabaseClient,
  table: string,
  batchId: string,
  rows: Row[],
  dateColumn: string
): Promise<void> {
  if (rows.length === 0) return
  const times = rows
    .map(r => {
      const v = r[dateColumn]
      if (v === null || v === undefined) return NaN
      const d = new Date(String(v))
      return d.getTime()
    })
    .filter(t => !isNaN(t))
  if (times.length > 0) {
    const minDate = new Date(Math.min(...times)).toISOString()
    const maxDate = new Date(Math.max(...times)).toISOString()
    const { error: delErr } = await supabase
      .from(table)
      .delete()
      .gte(dateColumn, minDate)
      .lte(dateColumn, maxDate)
    if (delErr) throw delErr
  }
  const { error } = await supabase.from(table).insert(withBatch(rows, batchId))
  if (error) throw error
}

// Upsert on a unique key. Used for Zendesk (zendesk_ticket_id).
export async function upsertStrategy(
  supabase: SupabaseClient,
  table: string,
  batchId: string,
  rows: Row[],
  conflictKey: string
): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase
    .from(table)
    .upsert(withBatch(rows, batchId), { onConflict: conflictKey })
  if (error) throw error
}

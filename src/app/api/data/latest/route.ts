import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

type SourceKey = 'meta' | 'stripe' | 'hubspot' | 'pelagonia' | 'tableau' | 'zendesk'

const SOURCE_TABLE: Record<SourceKey, string> = {
  meta: 'meta_data',
  stripe: 'stripe_data',
  hubspot: 'hubspot_data',
  pelagonia: 'pelagonia_data',
  tableau: 'tableau_data',
  zendesk: 'zendesk_data',
}

const SOURCE_ORDER_COLUMN: Record<SourceKey, string> = {
  meta: 'date',
  stripe: 'created_at',
  hubspot: 'hubspot_created_at',
  pelagonia: 'pelagonia_created_at',
  tableau: 'event_date',
  zendesk: 'zendesk_created_at',
}

export async function GET() {
  // Auth gate — require authenticated user session.
  const userClient = await createServerSupabase()
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const sources: SourceKey[] = ['meta', 'stripe', 'hubspot', 'pelagonia', 'tableau', 'zendesk']

  const results = await Promise.all(
    sources.map(s =>
      supabase
        .from(SOURCE_TABLE[s])
        .select('*')
        .order(SOURCE_ORDER_COLUMN[s], { ascending: false, nullsFirst: false })
    )
  )

  const refreshLogs = await Promise.all(
    sources.map(s =>
      supabase
        .from('upload_log')
        .select('inserted_at, uploaded_at')
        .eq('source', s)
        .eq('status', 'complete')
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    )
  )

  const out: Record<string, unknown> = {}
  const errors: { source: string; message: string }[] = []
  const lastRefresh: Record<string, string | null> = {}

  sources.forEach((s, i) => {
    const { data, error } = results[i]
    if (error) {
      errors.push({ source: s, message: error.message })
      out[s] = []
    } else {
      out[s] = data ?? []
    }
    const log = refreshLogs[i].data
    lastRefresh[s] = (log?.uploaded_at as string | undefined)
      ?? (log?.inserted_at as string | undefined)
      ?? null
  })

  out.lastRefresh = lastRefresh
  if (errors.length > 0) out.errors = errors

  return NextResponse.json(out)
}

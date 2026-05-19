import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

type SourceKey = 'metaAds' | 'socialOrganic' | 'stripe' | 'hubspot' | 'pelagonia' | 'tableau' | 'zendesk'

const SOURCE_TABLE: Record<SourceKey, string> = {
  metaAds: 'meta_ads',
  socialOrganic: 'social_organic',
  stripe: 'stripe_data',
  hubspot: 'hubspot_data',
  pelagonia: 'pelagonia_data',
  tableau: 'tableau_data',
  zendesk: 'zendesk_data',
}

const SOURCE_ORDER_COLUMN: Record<SourceKey, string> = {
  metaAds: 'date',
  socialOrganic: 'date',
  stripe: 'created',
  hubspot: 'hubspot_created_at',
  pelagonia: 'pelagonia_created_at',
  tableau: 'event_date',
  zendesk: 'zendesk_created_at',
}

// JS-side camelCase key → upload_log.source value (snake_case, matches upload route).
const SOURCE_DB_NAME: Record<SourceKey, string> = {
  metaAds: 'meta_ads',
  socialOrganic: 'social_organic',
  stripe: 'stripe',
  hubspot: 'hubspot',
  pelagonia: 'pelagonia',
  tableau: 'tableau',
  zendesk: 'zendesk',
}

export async function GET() {
  // Auth gate — require authenticated user session.
  const userClient = await createServerSupabase()
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const sources: SourceKey[] = ['metaAds', 'socialOrganic', 'stripe', 'hubspot', 'pelagonia', 'tableau', 'zendesk']

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
        .select('uploaded_at')
        .eq('source', SOURCE_DB_NAME[s])
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
    lastRefresh[s] = (log?.uploaded_at as string | undefined) ?? null
  })

  out.lastRefresh = lastRefresh
  if (errors.length > 0) out.errors = errors

  return NextResponse.json(out)
}

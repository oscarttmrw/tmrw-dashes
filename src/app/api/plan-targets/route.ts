import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

interface PlanTargetInput {
  month: string  // 'YYYY-MM-01'
  registrations_target: number | null
  gross_revenue_target: number | null
  net_revenue_target: number | null
  mrr_target: number | null
}

function normalizeMonth(input: unknown): string | null {
  if (typeof input !== 'string') return null
  // Accept 'YYYY-MM' or 'YYYY-MM-DD' — coerce to 'YYYY-MM-01'.
  const m = input.match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-01`
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return isNaN(n) ? null : n
}

export async function GET() {
  const userClient = await createServerSupabase()
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('plan_targets')
    .select('*')
    .order('month', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plan_targets: data ?? [] })
}

export async function POST(request: NextRequest) {
  const userClient = await createServerSupabase()
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const raw = body as Partial<PlanTargetInput>
  const month = normalizeMonth(raw.month)
  if (!month) {
    return NextResponse.json({ error: 'month must be a string in YYYY-MM or YYYY-MM-DD format' }, { status: 400 })
  }

  const row = {
    month,
    registrations_target: numOrNull(raw.registrations_target),
    gross_revenue_target: numOrNull(raw.gross_revenue_target),
    net_revenue_target: numOrNull(raw.net_revenue_target),
    mrr_target: numOrNull(raw.mrr_target),
    updated_at: new Date().toISOString(),
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('plan_targets')
    .upsert(row, { onConflict: 'month' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plan_target: data })
}

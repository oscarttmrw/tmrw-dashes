import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

export interface PosthogManualValues {
  registrations: number | null
  churnedMembers: number | null
  totalCasebook: number | null
  uploadedAt: string | null
}

const EMPTY: PosthogManualValues = {
  registrations: null,
  churnedMembers: null,
  totalCasebook: null,
  uploadedAt: null,
}

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('posthog_manual_log')
      .select('registrations, churned_members, total_casebook, uploaded_at')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json(EMPTY)
    return NextResponse.json({
      registrations: data.registrations ?? null,
      churnedMembers: data.churned_members ?? null,
      totalCasebook: data.total_casebook ?? null,
      uploadedAt: data.uploaded_at ?? null,
    } satisfies PosthogManualValues)
  } catch {
    return NextResponse.json(EMPTY)
  }
}

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}

export async function POST(request: NextRequest) {
  try {
    const userClient = await createServerSupabase()
    const { data: userData } = await userClient.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const registrations = toIntOrNull(body.registrations)
    const churnedMembers = toIntOrNull(body.churnedMembers)
    const totalCasebook = toIntOrNull(body.totalCasebook)

    const supabase = createServiceClient()
    const { error } = await supabase.from('posthog_manual_log').insert({
      registrations,
      churned_members: churnedMembers,
      total_casebook: totalCasebook,
      uploaded_by: userData.user.email ?? userData.user.id,
    })
    if (error) throw error

    return NextResponse.json({
      success: true,
      values: {
        registrations,
        churnedMembers,
        totalCasebook,
        uploadedAt: new Date().toISOString(),
      } satisfies PosthogManualValues,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

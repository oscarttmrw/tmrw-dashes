import { NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: rows } = await supabase
      .from('priorities_log')
      .select('uploaded_at, week_of, data')
      .order('uploaded_at', { ascending: false })
      .limit(52)
    return NextResponse.json((rows || []).map(r => ({ weekKey: r.data?.weekKey, weekOf: r.week_of, uploadedAt: r.uploaded_at })))
  } catch { return NextResponse.json([]) }
}

import { NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: rows } = await supabase
      .from('upload_log')
      .select('uploaded_at, record_count, data')
      .eq('source', 'priorities')
      .order('uploaded_at', { ascending: false })
      .limit(52)
    return NextResponse.json((rows || []).map(r => ({ weekKey: r.data?.weekKey, weekOf: r.data?.weekOf, uploadedAt: r.uploaded_at })))
  } catch { return NextResponse.json([]) }
}

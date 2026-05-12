import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const source = request.nextUrl.searchParams.get('source')
    const supabase = createClient()
    let query = supabase.from('upload_log').select('*').order('uploaded_at', { ascending: false }).limit(50)
    if (source) query = query.eq('source', source)
    const { data: rows } = await query
    if (source) return NextResponse.json({ source, versions: (rows || []).map(r => ({ timestamp: r.uploaded_at, recordCount: r.record_count })) })
    return NextResponse.json(rows || [])
  } catch (err) {
    return NextResponse.json({})
  }
}

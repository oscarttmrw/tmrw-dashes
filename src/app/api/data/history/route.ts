import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const source = request.nextUrl.searchParams.get('source')
    const supabase = createClient()

    let query = supabase
      .from('upload_log')
      .select('id, source, record_count, status, error, uploaded_at, uploaded_by, file_name, data_period_from, data_period_to, data_period_label')
      .order('uploaded_at', { ascending: false })
      .limit(100)

    if (source) query = query.eq('source', source)

    const { data: rows, error } = await query
    if (error) throw error

    return NextResponse.json(rows ?? [])
  } catch (err) {
    console.error('History fetch error:', err)
    return NextResponse.json([], { status: 500 })
  }
}

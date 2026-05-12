import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: rows } = await supabase
      .from('upload_log')
      .select('*')
      .eq('source', 'priorities')
      .order('uploaded_at', { ascending: false })
      .limit(1)
    if (!rows || rows.length === 0) return NextResponse.json(null)
    return NextResponse.json(rows[0].data)
  } catch { return NextResponse.json(null) }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { weekOf, priorities } = body
    if (!weekOf || !priorities) return NextResponse.json({ error: 'Missing weekOf or priorities' }, { status: 400 })
    const supabase = createClient()
    const { error } = await supabase.from('upload_log').insert({ source: 'priorities', record_count: 1, data: { ...priorities, weekOf } })
    if (error) throw error
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const { source, data } = await request.json()
    if (!source || !data) return NextResponse.json({ error: 'Missing source or data' }, { status: 400 })
    const supabase = createClient()
    const record_count = Array.isArray(data) ? data.length : 1
    const { error } = await supabase.from('upload_log').insert({ source, record_count, data })
    if (error) throw error
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

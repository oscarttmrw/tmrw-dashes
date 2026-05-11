import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/service'

const SOURCES = ['tableau', 'hubspot', 'stripe', 'zendesk']

export async function GET() {
  try {
    const supabase = createClient()
    const result: Record<string, unknown> = {}
    for (const source of SOURCES) {
      const { data: rows } = await supabase
        .from('upload_log')
        .select('*')
        .eq('source', source)
        .order('uploaded_at', { ascending: false })
        .limit(1)
      if (rows && rows.length > 0) result[source] = { data: rows[0].data, timestamp: rows[0].uploaded_at }
    }
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({}, { status: 500 })
  }
}

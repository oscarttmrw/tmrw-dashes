import { NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/service'

const SOURCE_TABLE: Record<string, string> = {
  tableau: 'tableau_data',
  hubspot: 'hubspot_data',
  stripe: 'stripe_data',
  zendesk: 'zendesk_data',
}

export async function GET() {
  try {
    const supabase = createClient()
    const result: Record<string, unknown> = {}

    for (const [source, table] of Object.entries(SOURCE_TABLE)) {
      // Get the latest complete batch for this source
      const { data: latestLog } = await supabase
        .from('upload_log')
        .select('id, uploaded_at')
        .eq('source', source)
        .eq('status', 'complete')
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single()

      if (!latestLog) continue

      // Get all rows for that batch
      const { data: rows } = await supabase
        .from(table)
        .select('row_data')
        .eq('batch_id', latestLog.id)

      if (rows && rows.length > 0) {
        result[source] = {
          data: rows.map(r => r.row_data),
          timestamp: latestLog.uploaded_at,
          batchId: latestLog.id,
        }
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({}, { status: 500 })
  }
}

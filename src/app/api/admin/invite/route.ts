import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (password !== process.env.UPLOAD_PW) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }
    const supabase = createServiceClient()
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { onboarded: false },
    })
    if (error) throw error
    return NextResponse.json({ success: true, user: data.user })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

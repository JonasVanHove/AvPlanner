import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    console.log('🔍 API Request /members/info:', { memberId })

    if (!memberId) {
      console.error('❌ Missing memberId')
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, profile_image, profile_image_url, created_at, team_id')
      .eq('id', memberId)
      .maybeSingle()

    if (error) {
      console.error('❌ /members/info query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      console.log('📭 Member not found:', memberId)
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, member: data })
  } catch (err: any) {
    console.error('💥 API /members/info exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

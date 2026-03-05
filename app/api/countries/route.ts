import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    console.log('🌍 Fetching countries...')

    // Fetch all countries from the database
    const { data: countries, error } = await supabase
      .from('countries')
      .select('code, name, name_nl, name_fr')
      .order('name')

    if (error) {
      console.error('❌ Countries fetch error:', error)
      return NextResponse.json({ countries: [], count: 0, warning: error.message }, { status: 200 })
    }

    console.log('✅ Countries fetched:', countries?.length || 0)

    return NextResponse.json({
      countries: countries || [],
      count: countries?.length || 0
    })

  } catch (error) {
    console.error('💥 Countries API Error:', error)
    return NextResponse.json({ countries: [], count: 0, warning: error instanceof Error ? error.message : String(error) }, { status: 200 })
  }
}
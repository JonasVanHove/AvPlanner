import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🌍 Fetching countries...')

    // Fetch all countries from the database
    const { data: countries, error } = await supabase
      .from('countries')
      .select('code, name, name_nl, name_fr')
      .order('name')

    if (error) {
      console.error('❌ Countries fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Countries fetched:', countries?.length || 0)

    return NextResponse.json({
      countries: countries || [],
      count: countries?.length || 0
    })

  } catch (error) {
    console.error('💥 Countries API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
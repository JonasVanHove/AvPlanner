import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    const country = searchParams.get('country') // optional country filter

    console.log('📅 Fetching holidays for:', { year, country })

    // Build the query
    let query = supabase
      .from('holidays')
      .select(`
        id,
        name,
        date,
        country_code,
        is_official,
        countries!inner (
          name,
          name_nl,
          name_fr
        )
      `)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date')

    // Add country filter if specified
    if (country && country !== 'all') {
      query = query.eq('country_code', country)
    }

    const { data: holidays, error } = await query

    if (error) {
      console.error('❌ Holidays fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to include country name and use fallback for multilingual names
    const transformedHolidays = holidays?.map((holiday: any) => ({
      id: holiday.id,
      name: holiday.name,
      name_nl: holiday.name, // Use original name as fallback since name_nl doesn't exist yet
      name_fr: holiday.name, // Use original name as fallback since name_fr doesn't exist yet
      date: holiday.date,
      country_code: holiday.country_code,
      country_name: holiday.countries?.name || 'Unknown',
      is_official: holiday.is_official
    })) || []

    console.log('✅ Found holidays:', transformedHolidays.length)

    return NextResponse.json(transformedHolidays)
  } catch (error) {
    console.error('❌ Holidays API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch holidays' }, 
      { status: 500 }
    )
  }
}
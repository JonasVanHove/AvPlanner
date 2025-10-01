import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    console.log('🧪 Testing holiday system for team:', teamId)

    // Get team members with their countries
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, first_name, last_name, country_code, email')
      .eq('team_id', teamId)
      .eq('status', 'active')

    if (membersError) {
      console.error('❌ Members fetch error:', membersError)
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    console.log('👥 Found team members:', members?.length || 0)
    console.log('📍 Countries:', [...new Set(members?.map(m => m.country_code).filter(Boolean))])

    // Get countries
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('code, name')
      .in('code', members?.map(m => m.country_code).filter(Boolean) || [])

    if (countriesError) {
      console.error('❌ Countries fetch error:', countriesError)
    }

    // Get holidays for these countries (next 30 days)
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const { data: holidays, error: holidaysError } = await supabase
      .from('holidays')
      .select('id, country_code, date, name, is_official')
      .in('country_code', members?.map(m => m.country_code).filter(Boolean) || [])
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    if (holidaysError) {
      console.error('❌ Holidays fetch error:', holidaysError)
    }

    console.log('🎄 Found holidays:', holidays?.length || 0)
    
    // Check existing availability entries
    const { data: availability, error: availError } = await supabase
      .from('availability')
      .select('member_id, date, status, auto_holiday')
      .in('member_id', members?.map(m => m.id) || [])
      .gte('date', startDate)
      .lte('date', endDate)

    if (availError) {
      console.error('❌ Availability fetch error:', availError)
    }

    return NextResponse.json({
      teamId,
      members: members || [],
      countries: countries || [],
      holidays: holidays || [],
      currentAvailability: availability || [],
      summary: {
        memberCount: members?.length || 0,
        countryCount: new Set(members?.map(m => m.country_code).filter(Boolean)).size,
        holidayCount: holidays?.length || 0,
        existingAvailabilityEntries: availability?.length || 0
      }
    })

  } catch (error) {
    console.error('💥 Test API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
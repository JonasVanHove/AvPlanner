import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 Fetching teams for testing...')

    // Get all teams with their member counts
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        id, 
        name, 
        slug,
        created_at,
        members (
          id,
          first_name,
          last_name,
          country_code,
          status
        )
      `)
      .limit(10)

    if (error) {
      console.error('❌ Teams fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const teamsWithSummary = teams?.map(team => ({
      ...team,
      memberCount: team.members?.filter((m: any) => m.status === 'active').length || 0,
      countries: [...new Set(team.members?.map((m: any) => m.country_code).filter(Boolean))]
    }))

    console.log('🏢 Found teams:', teamsWithSummary?.length || 0)

    return NextResponse.json({
      teams: teamsWithSummary || [],
      count: teamsWithSummary?.length || 0
    })

  } catch (error) {
    console.error('💥 Teams API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
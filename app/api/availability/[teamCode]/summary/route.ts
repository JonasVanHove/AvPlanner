import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/availability/[teamCode]/summary
 * 
 * Get a summary of team availability data
 * 
 * Query parameters:
 * - password: (optional) Team password if team is password-protected
 * - startDate: (optional) Start date in YYYY-MM-DD format
 * - endDate: (optional) End date in YYYY-MM-DD format
 * 
 * Returns:
 * - Team info
 * - Member count
 * - Availability statistics (available, unavailable, maybe, no data)
 * - Date range coverage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { searchParams } = new URL(request.url)
    const teamCode = resolvedParams.teamCode
    const password = searchParams.get('password')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Validate team code
    if (!teamCode) {
      return NextResponse.json(
        { error: 'Team code is required' },
        { status: 400 }
      )
    }

    // Fetch team by invite_code or slug
    let { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, slug, invite_code, is_password_protected, password_hash, created_at')
      .eq('invite_code', teamCode)
      .single()

    // If not found by invite_code, try by slug
    if (teamError && teamError.code === 'PGRST116') {
      const { data: teamBySlug, error: slugError } = await supabase
        .from('teams')
        .select('id, name, slug, invite_code, is_password_protected, password_hash, created_at')
        .eq('slug', teamCode)
        .single()

      team = teamBySlug
      teamError = slugError
    }

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check password if team is password-protected
    if (team.is_password_protected) {
      if (!password) {
        return NextResponse.json(
          { 
            error: 'Password required',
            message: 'This team is password-protected. Please provide a password.' 
          },
          { status: 401 }
        )
      }

      const hashedPassword = btoa(password)
      if (hashedPassword !== team.password_hash) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        )
      }
    }

    // Fetch member counts
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, status, is_hidden')
      .eq('team_id', team.id)

    if (membersError) {
      return NextResponse.json(
        { error: 'Error fetching members', details: membersError.message },
        { status: 500 }
      )
    }

    const memberIds = members?.map(m => m.id) || []
    const activeMemberCount = members?.filter(m => m.status === 'active' && !m.is_hidden).length || 0
    const totalMemberCount = members?.length || 0

    // Fetch availability data with optional date range
    let availabilityQuery = supabase
      .from('availability')
      .select('status, date')
      .in('member_id', memberIds)

    if (startDate) {
      availabilityQuery = availabilityQuery.gte('date', startDate)
    }

    if (endDate) {
      availabilityQuery = availabilityQuery.lte('date', endDate)
    }

    const { data: availability, error: availabilityError } = await availabilityQuery

    if (availabilityError) {
      return NextResponse.json(
        { error: 'Error fetching availability', details: availabilityError.message },
        { status: 500 }
      )
    }

    // Calculate statistics
    const availableCount = availability?.filter(a => a.status === 'available').length || 0
    const unavailableCount = availability?.filter(a => a.status === 'unavailable').length || 0
    const maybeCount = availability?.filter(a => a.status === 'maybe').length || 0
    const totalEntries = availability?.length || 0

    // Get date range
    const dates = availability?.map(a => a.date).sort() || []
    const earliestDate = dates[0] || null
    const latestDate = dates[dates.length - 1] || null

    // Calculate unique dates
    const uniqueDates = new Set(dates).size

    const response = {
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        invite_code: team.invite_code,
        is_password_protected: team.is_password_protected,
        created_at: team.created_at
      },
      statistics: {
        members: {
          total: totalMemberCount,
          active: activeMemberCount,
          hidden: members?.filter(m => m.is_hidden).length || 0
        },
        availability: {
          total_entries: totalEntries,
          available: availableCount,
          unavailable: unavailableCount,
          maybe: maybeCount,
          unique_dates: uniqueDates
        },
        dateRange: {
          earliest: earliestDate,
          latest: latestDate,
          requested_start: startDate,
          requested_end: endDate
        }
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/availability/[teamCode]/day/[date]
 * 
 * Get availability data for a specific day
 * 
 * Query parameters:
 * - password: (optional) Team password if team is password-protected
 * - includeHidden: (optional) Include hidden members (default: false)
 * 
 * Returns:
 * - Team info
 * - Members with their availability status for the specified date
 * - Summary statistics for the day
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamCode: string; date: string }> }
) {
  try {
    const resolvedParams = await params
    const { searchParams } = new URL(request.url)
    const teamCode = resolvedParams.teamCode
    const date = resolvedParams.date
    const password = searchParams.get('password')
    const includeHidden = searchParams.get('includeHidden') === 'true'

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    // Fetch team by invite_code or slug
    let { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, slug, invite_code, is_password_protected, password_hash')
      .eq('invite_code', teamCode)
      .single()

    // If not found by invite_code, try by slug
    if (teamError && teamError.code === 'PGRST116') {
      const { data: teamBySlug, error: slugError } = await supabase
        .from('teams')
        .select('id, name, slug, invite_code, is_password_protected, password_hash')
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

    // Fetch members
    let membersQuery = supabase
      .from('members')
      .select('id, first_name, last_name, email, role, status, is_hidden, profile_image, profile_image_url, order_index, birth_date')
      .eq('team_id', team.id)

    if (!includeHidden) {
      membersQuery = membersQuery.eq('is_hidden', false)
    }

    const { data: members, error: membersError } = await membersQuery.order('order_index', { ascending: true })

    if (membersError) {
      return NextResponse.json(
        { error: 'Error fetching members', details: membersError.message },
        { status: 500 }
      )
    }

    // Fetch availability for the specific date
    const { data: availability, error: availabilityError } = await supabase
      .from('availability')
      .select('*')
      .in('member_id', members?.map(m => m.id) || [])
      .eq('date', date)

    if (availabilityError) {
      return NextResponse.json(
        { error: 'Error fetching availability', details: availabilityError.message },
        { status: 500 }
      )
    }

    // Create a map of member_id to availability status
    const availabilityMap = new Map(
      availability?.map(a => [a.member_id, a.status]) || []
    )

    // Combine member data with availability
    const membersWithAvailability = members?.map(m => ({
      id: m.id,
      first_name: m.first_name,
      last_name: m.last_name,
      full_name: `${m.first_name} ${m.last_name}`,
      email: m.email,
      role: m.role,
      status: m.status,
      is_hidden: m.is_hidden,
      profile_image: m.profile_image_url || m.profile_image,
      order_index: m.order_index,
      birth_date: m.birth_date,
      availability: availabilityMap.get(m.id) || null
    })) || []

    // Calculate statistics
    const availableCount = membersWithAvailability.filter(m => m.availability === 'available').length
    const unavailableCount = membersWithAvailability.filter(m => m.availability === 'unavailable').length
    const maybeCount = membersWithAvailability.filter(m => m.availability === 'maybe').length
    const noDataCount = membersWithAvailability.filter(m => m.availability === null).length

    const response = {
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        invite_code: team.invite_code,
        is_password_protected: team.is_password_protected
      },
      date: date,
      members: membersWithAvailability,
      summary: {
        total_members: membersWithAvailability.length,
        available: availableCount,
        unavailable: unavailableCount,
        maybe: maybeCount,
        no_data: noDataCount
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

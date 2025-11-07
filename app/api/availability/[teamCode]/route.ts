import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/availability/[teamCode]
 * 
 * Fetch availability data for a specific team
 * 
 * Query parameters:
 * - password: (optional) Team password if team is password-protected
 * - startDate: (optional) Start date in YYYY-MM-DD format
 * - endDate: (optional) End date in YYYY-MM-DD format
 * - date: (optional) Specific date in YYYY-MM-DD format
 * - week: (optional) Week number (1-53) - requires year parameter
 * - year: (optional) Year for week parameter
 * - memberId: (optional) Filter by specific member ID
 * - includeHidden: (optional) Include hidden members (default: false)
 * 
 * Returns:
 * - 200: Availability data
 * - 401: Unauthorized (wrong password)
 * - 404: Team not found
 * - 400: Bad request (invalid parameters)
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
    const date = searchParams.get('date')
    const week = searchParams.get('week')
    const year = searchParams.get('year')
    const memberId = searchParams.get('memberId')
    const includeHidden = searchParams.get('includeHidden') === 'true'

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

    // Calculate date range
    let calculatedStartDate: string | null = startDate
    let calculatedEndDate: string | null = endDate

    if (date) {
      // Single date query
      calculatedStartDate = date
      calculatedEndDate = date
    } else if (week && year) {
      // Week-based query
      const weekNum = parseInt(week)
      const yearNum = parseInt(year)
      
      if (isNaN(weekNum) || isNaN(yearNum) || weekNum < 1 || weekNum > 53) {
        return NextResponse.json(
          { error: 'Invalid week or year parameter' },
          { status: 400 }
        )
      }

      // Calculate start and end dates for the week
      const firstDayOfYear = new Date(yearNum, 0, 1)
      const daysOffset = (weekNum - 1) * 7
      const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000)
      
      // Adjust to Monday if needed (ISO week starts on Monday)
      const dayOfWeek = weekStart.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      weekStart.setDate(weekStart.getDate() + diff)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      calculatedStartDate = weekStart.toISOString().split('T')[0]
      calculatedEndDate = weekEnd.toISOString().split('T')[0]
    }

    // Fetch members
    let membersQuery = supabase
      .from('members')
      .select('id, first_name, last_name, email, role, status, is_hidden, profile_image, profile_image_url, order_index, birth_date')
      .eq('team_id', team.id)

    if (!includeHidden) {
      membersQuery = membersQuery.eq('is_hidden', false)
    }

    if (memberId) {
      membersQuery = membersQuery.eq('id', memberId)
    }

    const { data: members, error: membersError } = await membersQuery.order('order_index', { ascending: true })

    if (membersError) {
      return NextResponse.json(
        { error: 'Error fetching members', details: membersError.message },
        { status: 500 }
      )
    }

    // Fetch availability data
    let availabilityQuery = supabase
      .from('availability')
      .select('*')
      .in('member_id', members?.map(m => m.id) || [])

    if (calculatedStartDate) {
      availabilityQuery = availabilityQuery.gte('date', calculatedStartDate)
    }

    if (calculatedEndDate) {
      availabilityQuery = availabilityQuery.lte('date', calculatedEndDate)
    }

    availabilityQuery = availabilityQuery.order('date', { ascending: true })

    const { data: availability, error: availabilityError } = await availabilityQuery

    if (availabilityError) {
      return NextResponse.json(
        { error: 'Error fetching availability', details: availabilityError.message },
        { status: 500 }
      )
    }

    // Combine data
    const response = {
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        invite_code: team.invite_code,
        is_password_protected: team.is_password_protected
      },
      members: members?.map(m => ({
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
        email: m.email,
        role: m.role,
        status: m.status,
        is_hidden: m.is_hidden,
        profile_image: m.profile_image_url || m.profile_image,
        order_index: m.order_index,
        birth_date: m.birth_date
      })) || [],
      availability: availability?.map(a => ({
        id: a.id,
        member_id: a.member_id,
        date: a.date,
        status: a.status,
        created_at: a.created_at,
        updated_at: a.updated_at
      })) || [],
      dateRange: {
        startDate: calculatedStartDate,
        endDate: calculatedEndDate
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

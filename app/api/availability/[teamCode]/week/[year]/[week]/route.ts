import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/availability/[teamCode]/week/[year]/[week]
 * 
 * Get availability data for a specific week (ISO week)
 * 
 * Query parameters:
 * - password: (optional) Team password if team is password-protected
 * - includeHidden: (optional) Include hidden members (default: false)
 * 
 * Returns:
 * - Team info
 * - Week date range
 * - Members with their availability status for each day of the week
 * - Daily and weekly summary statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamCode: string; year: string; week: string }> }
) {
  try {
    const resolvedParams = await params
    const { searchParams } = new URL(request.url)
    const teamCode = resolvedParams.teamCode
    const year = parseInt(resolvedParams.year)
    const week = parseInt(resolvedParams.week)
    const password = searchParams.get('password')
    const includeHidden = searchParams.get('includeHidden') === 'true'

    // Validate week and year
    if (isNaN(year) || isNaN(week) || week < 1 || week > 53 || year < 1900 || year > 2100) {
      return NextResponse.json(
        { error: 'Invalid year or week number' },
        { status: 400 }
      )
    }

    // Calculate start and end dates for the week (ISO week - Monday to Sunday)
    const firstDayOfYear = new Date(year, 0, 1)
    const daysOffset = (week - 1) * 7
    const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000)
    
    // Adjust to Monday (ISO week starts on Monday)
    const dayOfWeek = weekStart.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    weekStart.setDate(weekStart.getDate() + diff)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const startDate = weekStart.toISOString().split('T')[0]
    const endDate = weekEnd.toISOString().split('T')[0]

    // Generate all dates in the week
    const weekDates: string[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      weekDates.push(date.toISOString().split('T')[0])
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

    // Fetch availability for the week
    const { data: availability, error: availabilityError } = await supabase
      .from('availability')
      .select('*')
      .in('member_id', members?.map(m => m.id) || [])
      .gte('date', startDate)
      .lte('date', endDate)

    if (availabilityError) {
      return NextResponse.json(
        { error: 'Error fetching availability', details: availabilityError.message },
        { status: 500 }
      )
    }

    // Create a map of member_id + date to availability status
    const availabilityMap = new Map(
      availability?.map(a => [`${a.member_id}_${a.date}`, a.status]) || []
    )

    // Combine member data with availability for each day
    const membersWithAvailability = members?.map(m => {
      const weekAvailability: { [key: string]: string | null } = {}
      weekDates.forEach(date => {
        weekAvailability[date] = availabilityMap.get(`${m.id}_${date}`) || null
      })

      return {
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
        availability: weekAvailability
      }
    }) || []

    // Calculate daily statistics
    const dailyStats = weekDates.map(date => {
      const dayAvailability = membersWithAvailability.map(m => m.availability[date])
      return {
        date,
        available: dayAvailability.filter(a => a === 'available').length,
        unavailable: dayAvailability.filter(a => a === 'unavailable').length,
        maybe: dayAvailability.filter(a => a === 'maybe').length,
        no_data: dayAvailability.filter(a => a === null).length
      }
    })

    // Calculate weekly totals
    const totalAvailable = dailyStats.reduce((sum, day) => sum + day.available, 0)
    const totalUnavailable = dailyStats.reduce((sum, day) => sum + day.unavailable, 0)
    const totalMaybe = dailyStats.reduce((sum, day) => sum + day.maybe, 0)
    const totalNoData = dailyStats.reduce((sum, day) => sum + day.no_data, 0)

    const response = {
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        invite_code: team.invite_code,
        is_password_protected: team.is_password_protected
      },
      week: {
        year,
        week_number: week,
        start_date: startDate,
        end_date: endDate,
        dates: weekDates
      },
      members: membersWithAvailability,
      daily_summary: dailyStats,
      week_summary: {
        total_members: membersWithAvailability.length,
        total_available: totalAvailable,
        total_unavailable: totalUnavailable,
        total_maybe: totalMaybe,
        total_no_data: totalNoData
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

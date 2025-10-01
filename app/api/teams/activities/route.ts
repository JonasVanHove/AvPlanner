import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const daysBack = parseInt(searchParams.get('daysBack') || '7')
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log('🔍 API Request:', { teamId, daysBack, limit })

    if (!teamId) {
      console.error('❌ No team ID provided')
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // Get team members directly from members table where team_id matches
    console.log('📞 Fetching team members for team:', teamId)
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)

    const { data: teamMembers, error: teamError } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, profile_image, profile_image_url, is_hidden')
      .eq('team_id', teamId)
      .eq('status', 'active')

    if (teamError) {
      console.error('❌ Team members query error:', teamError)
      return NextResponse.json({ error: teamError.message }, { status: 500 })
    }

    if (!teamMembers || teamMembers.length === 0) {
      console.log('📭 No team members found for team:', teamId)
      return NextResponse.json({ activities: [] })
    }

    const memberIds = teamMembers.map((member: any) => member.id)
    console.log('👥 Found team members:', memberIds.length, 'members')

    // First get recent availability for these members
    const { data: availabilityData, error: availError } = await supabase
      .from('availability')
      .select('*')
      .in('member_id', memberIds)
      .or(`updated_at.gte.${cutoffDate.toISOString()},and(updated_at.is.null,created_at.gte.${cutoffDate.toISOString()})`)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (availError) {
      console.error('❌ Availability query error:', availError)
      return NextResponse.json({ error: availError.message }, { status: 500 })
    }

    console.log('📊 Found availability records:', availabilityData?.length || 0)

    // Get unique changed_by_ids to fetch their information
    const changedByIds = availabilityData
      ?.map(item => item.changed_by_id)
      .filter(id => id != null) // Remove null/undefined values
      ?? []
    
    const uniqueChangedByIds = [...new Set(changedByIds)]
    
    // Fetch changed_by member information if there are any
    let changedByMembers: any[] = []
    if (uniqueChangedByIds.length > 0) {
      const { data: changedByData, error: changedByError } = await supabase
        .from('members')
        .select('id, first_name, last_name, email, profile_image, profile_image_url')
        .in('id', uniqueChangedByIds)

      if (changedByError) {
        console.error('❌ Changed by members query error:', changedByError)
        // Continue without changed_by data rather than failing
      } else {
        changedByMembers = changedByData || []
      }
    }

    console.log('👤 Found changed_by members:', changedByMembers.length)

    // Combine the data with member info
    const activities = availabilityData?.map((item: any, index: number) => {
      const member = teamMembers.find((m: any) => m.id === item.member_id)
      
      // Find who made the change from our manually fetched data
      const changed_by_member = item.changed_by_id 
        ? changedByMembers.find((cb: any) => cb.id === item.changed_by_id)
        : null
      
      // Handle both profile_image (base64) and profile_image_url
      const getProfileImage = (member: any) => {
        if (member?.profile_image) {
          // If it's already a data URL, use it as is
          return member.profile_image.startsWith('data:') ? member.profile_image : `data:image/jpeg;base64,${member.profile_image}`
        }
        return member?.profile_image_url || null
      }

      return {
        idx: index,
        id: item.id,
        member_id: item.member_id,
        member_name: member ? `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email : 'Unknown',
        member_email: member?.email || 'unknown@example.com',
        profile_image_url: getProfileImage(member),
        // Add changed_by information with auto_holiday handling
        auto_holiday: item.auto_holiday || false,
        changed_by_id: item.changed_by_id, // This is who made the change (can be null if self-change)
        changed_by_email: item.auto_holiday ? 'system@auto' : (changed_by_member?.email || null),
        changed_by_name: item.auto_holiday 
          ? 'System' // For auto-holidays, show 'System' as changer
          : (changed_by_member 
            ? (`${changed_by_member.first_name || ''} ${changed_by_member.last_name || ''}`.trim() || changed_by_member.email)
            : null), // If no changed_by_member found, it's null (not Unknown)
        changed_by_profile_url: item.auto_holiday ? null : (changed_by_member ? getProfileImage(changed_by_member) : null),
        date: item.date,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at || null
      }
    }) || []

    // Filter activities for hidden members: only show if they have non-holiday activities
    const filteredActivities = activities.filter(activity => {
      const member = teamMembers.find((m: any) => m.id === activity.member_id)
      
      // If member is not hidden, always show their activities
      if (!member?.is_hidden) {
        return true
      }
      
      // If member is hidden, only show non-holiday activities
      if (member.is_hidden && activity.status === 'holiday') {
        console.log('🙈 Filtering out holiday for hidden member:', activity.member_name, activity.date)
        return false
      }
      
      // Hidden member with non-holiday activity - show it
      if (member.is_hidden && activity.status !== 'holiday') {
        console.log('👁️ Showing non-holiday activity for hidden member:', activity.member_name, activity.status, activity.date)
        return true
      }
      
      return true
    })

    console.log('✅ Returning', filteredActivities.length, 'availability activities (filtered from', activities.length, 'total)')

    return NextResponse.json({ activities: filteredActivities })
  } catch (error) {
    console.error('💥 API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
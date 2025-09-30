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

    // Use a simple fallback query for now - skip auth for debugging
    console.log('📞 Using simple availability query as fallback')
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)

    // Get team members directly from members table where team_id matches
    const { data: teamMembers, error: teamError } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, profile_image, profile_image_url')
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

    // Now get recent availability for these members
    const { data: availabilityData, error: availError } = await supabase
      .from('availability')
      .select('*')
      .in('member_id', memberIds)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (availError) {
      console.error('❌ Availability query error:', availError)
      return NextResponse.json({ error: availError.message }, { status: 500 })
    }

    console.log('📊 Found availability records:', availabilityData?.length || 0)

    // Combine the data with member info
    const activities = availabilityData?.map((item: any, index: number) => {
      const member = teamMembers.find((m: any) => m.id === item.member_id)
      
      // For now, assume the member changed their own availability
      // In the future, you could track who made the change in a separate field
      const changed_by = member
      
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
        // Add changed_by information
        changed_by_email: changed_by?.email || member?.email || 'unknown@example.com',
        changed_by_name: changed_by ? `${changed_by.first_name || ''} ${changed_by.last_name || ''}`.trim() || changed_by.email : 'Unknown',
        changed_by_profile_url: getProfileImage(changed_by),
        date: item.date,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at || null
      }
    }) || []

    console.log('✅ Returning', activities.length, 'availability activities')

    return NextResponse.json({ activities })
  } catch (error) {
    console.error('💥 API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
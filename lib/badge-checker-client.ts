"use client"

import { supabase } from "@/lib/supabase"

export interface Badge {
  type: string
  id?: string
  week_year: string
  activity_count?: number
}

/**
 * Client-side badge checking and awarding
 * This bypasses API routes and works directly with Supabase from the browser
 * Solves Node.js fetch issues on Windows
 */
export async function checkAndAwardBadgesClientSide(
  memberId: string,
  teamId: string
): Promise<{ newBadges: Badge[], stats: any }> {
  console.log('🏅 [CLIENT] Starting client-side badge check...')
  console.log('🏅 [CLIENT] Member:', memberId, 'Team:', teamId)

  try {
    // 1. Get member info
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, auth_user_id, first_name, last_name, email')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      console.error('🏅 [CLIENT] ❌ Member not found:', memberError?.message)
      return { newBadges: [], stats: { error: 'Member not found' } }
    }

    if (!member.auth_user_id) {
      console.error('🏅 [CLIENT] ❌ Member not linked to user')
      return { newBadges: [], stats: { error: 'Member not linked to user' } }
    }

    console.log('🏅 [CLIENT] ✅ Member found:', member.first_name)

    // 2. Count unique availability dates
    const { data: availabilities, error: availError } = await supabase
      .from('availability')
      .select('date')
      .eq('member_id', memberId)

    if (availError) {
      console.error('🏅 [CLIENT] ❌ Error fetching availabilities:', availError.message)
      return { newBadges: [], stats: { error: 'Failed to count availabilities' } }
    }

    const uniqueDates = new Set(availabilities?.map(a => a.date) || []).size
    console.log(`🏅 [CLIENT] Found ${uniqueDates} unique dates`)

    // 3. Determine which activity badges to award
    const activityBadges: Array<{ type: string, threshold: number }> = []
    if (uniqueDates >= 10) activityBadges.push({ type: 'activity_10', threshold: 10 })
    if (uniqueDates >= 50) activityBadges.push({ type: 'activity_50', threshold: 50 })
    if (uniqueDates >= 100) activityBadges.push({ type: 'activity_100', threshold: 100 })
    if (uniqueDates >= 500) activityBadges.push({ type: 'activity_500', threshold: 500 })
    if (uniqueDates >= 1000) activityBadges.push({ type: 'activity_1000', threshold: 1000 })

    console.log(`🏅 [CLIENT] Eligible for ${activityBadges.length} badge(s)`)

    const newBadges: Badge[] = []

    // 4. Award each eligible badge (if not already awarded)
    for (const badge of activityBadges) {
      console.log(`🏅 [CLIENT] Checking ${badge.type}...`)

      // Check if badge already exists
      const { data: existing, error: checkError } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', member.auth_user_id)
        .eq('member_id', memberId)
        .eq('team_id', teamId)
        .eq('badge_type', badge.type)
        .eq('week_year', 'lifetime')
        .maybeSingle()

      if (checkError) {
        console.error(`🏅 [CLIENT] ❌ Error checking ${badge.type}:`, checkError.message)
        continue
      }

      if (existing) {
        console.log(`🏅 [CLIENT] Badge ${badge.type} already exists`)
        continue
      }

      // Award the badge
      console.log(`🏅 [CLIENT] Awarding ${badge.type}...`)
      const { data: newBadge, error: insertError } = await supabase
        .from('user_badges')
        .insert({
          user_id: member.auth_user_id,
          member_id: memberId,
          team_id: teamId,
          badge_type: badge.type,
          week_year: 'lifetime',
          metadata: { total_activities: uniqueDates }
        })
        .select()
        .single()

      if (insertError) {
        console.error(`🏅 [CLIENT] ❌ Error awarding ${badge.type}:`, insertError.message)
        if (insertError.code === '42501') {
          console.error('🏅 [CLIENT] ⚠️  Permission denied. RLS may be blocking this.')
        }
      } else {
        console.log(`🏅 [CLIENT] ✅ Awarded ${badge.type}!`)
        newBadges.push({
          type: badge.type,
          id: newBadge.id,
          week_year: 'lifetime',
          activity_count: uniqueDates
        })
      }
    }

    console.log(`🏅 [CLIENT] ✅ Complete! Awarded ${newBadges.length} new badge(s)`)

    return {
      newBadges,
      stats: {
        uniqueDates,
        eligibleBadges: activityBadges.length,
        newBadgesAwarded: newBadges.length
      }
    }
  } catch (error: any) {
    console.error('🏅 [CLIENT] ❌ Exception:', error)
    return {
      newBadges: [],
      stats: { error: error.message }
    }
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Direct badge awarding fallback endpoint.
// Uses service role key if available (bypasses RLS) otherwise anon key (may fail if RLS blocks).
// This avoids RPC fetch issues by doing straight table operations.

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/badges/check-direct
 * Direct badge checking without RPC (workaround for fetch failed issues)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🏅 [DIRECT] Badge check initiated (direct SQL method)')
    const { memberId, teamId } = await request.json()
    console.log(`🏅 [DIRECT] Member: ${memberId}, Team: ${teamId}`)

    if (!memberId || !teamId) {
      return NextResponse.json(
        { error: "Missing memberId or teamId" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      return NextResponse.json({ error: "Supabase URL missing" }, { status: 500 })
    }
    if (!anonKey && !serviceRoleKey) {
      return NextResponse.json({ 
        error: "Supabase keys missing", 
        details: "Add NEXT_PUBLIC_SUPABASE_ANON_KEY (and optionally SUPABASE_SERVICE_ROLE_KEY) to .env.local" 
      }, { status: 500 })
    }

    const usingService = Boolean(serviceRoleKey)
    const supabase = createClient(supabaseUrl, usingService ? serviceRoleKey! : anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        // Wrap fetch to log low-level network errors
        fetch: async (input, init) => {
          try {
            return await fetch(input, init)
          } catch (e: any) {
            console.error('🏅 [DIRECT] Low-level fetch error:', e?.message)
            throw e
          }
        }
      }
    })
    console.log(`🏅 [DIRECT] Using ${usingService ? 'service_role' : 'anon'} key for badge awarding`)

    // Get member info including auth_user_id
    console.log('🏅 [DIRECT] Fetching member info...')
    
    // Try to fetch member - if this fails, it's likely a fetch/network issue
    let member: any = null
    let memberError: any = null
    
    try {
      const result = await supabase
        .from('members')
        .select('id, auth_user_id, first_name, last_name, email, team_id')
        .eq('id', memberId)
        .eq('team_id', teamId)
        .single()
      
      member = result.data
      memberError = result.error
      
      console.log('🏅 [DIRECT] Member query result:', { 
        found: Boolean(member), 
        error: memberError?.message,
        errorCode: memberError?.code 
      })
    } catch (fetchError: any) {
      console.error('🏅 [DIRECT] ❌ Fetch exception during member lookup:', fetchError.message)
      return NextResponse.json(
        { 
          error: "Database connection failed", 
          details: "Cannot connect to Supabase. This is a Node.js fetch issue on Windows.",
          hint: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local OR try: $env:NODE_TLS_REJECT_UNAUTHORIZED=\"0\"; pnpm dev"
        },
        { status: 500 }
      )
    }

    if (memberError || !member) {
      console.error('🏅 [DIRECT] ❌ Member not found or not in team:', memberError?.message)
      return NextResponse.json(
        { error: "Member not found", details: memberError?.message },
        { status: 404 }
      )
    }

    console.log('🏅 [DIRECT] ✅ Member found:', member.first_name)

    if (!member.auth_user_id) {
      console.error('🏅 [DIRECT] ❌ Member not linked to user')
      return NextResponse.json(
        { error: "Member not linked to user account" },
        { status: 400 }
      )
    }

    // Count unique dates (for activity badges)
    console.log('🏅 [DIRECT] Counting unique availability dates...')
    const { data: availabilities, error: availError } = await supabase
      .from('availability')
      .select('date')
      .eq('member_id', memberId)
      .order('date')

    if (availError) {
      console.error('🏅 [DIRECT] ❌ Error counting availabilities:', availError.message)
      return NextResponse.json(
        { error: "Failed to count availabilities" },
        { status: 500 }
      )
    }

    const uniqueDates = new Set(availabilities?.map(a => a.date) || []).size
    console.log(`🏅 [DIRECT] Found ${uniqueDates} unique dates`)

    // Check which activity badges to award
    const activityBadges: Array<{type: string, threshold: number}> = []
    if (uniqueDates >= 10) activityBadges.push({ type: 'activity_10', threshold: 10 })
    if (uniqueDates >= 50) activityBadges.push({ type: 'activity_50', threshold: 50 })
    if (uniqueDates >= 100) activityBadges.push({ type: 'activity_100', threshold: 100 })
    if (uniqueDates >= 500) activityBadges.push({ type: 'activity_500', threshold: 500 })
    if (uniqueDates >= 1000) activityBadges.push({ type: 'activity_1000', threshold: 1000 })

    const newBadges: any[] = []

    // Award activity badges
    for (const badge of activityBadges) {
      console.log(`🏅 [DIRECT] Checking if ${badge.type} already exists...`)
      
      // Check if badge already exists
      const { data: existing } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', member.auth_user_id)
        .eq('member_id', memberId)
        .eq('team_id', teamId)
        .eq('badge_type', badge.type)
        .eq('week_year', 'lifetime')
        .single()

      if (!existing) {
        console.log(`🏅 [DIRECT] Awarding ${badge.type}...`)
        
        // Award the badge
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
          console.error(`🏅 [DIRECT] ❌ Error awarding ${badge.type}:`, insertError.message)
          if (insertError.code === '42501') {
            console.error('🏅 [DIRECT] ❌ RLS prevented insert. Service role key required.')
          }
        } else {
          console.log(`🏅 [DIRECT] ✅ Awarded ${badge.type}!`)
          newBadges.push({
            type: badge.type,
            id: newBadge.id,
            week_year: 'lifetime',
            activity_count: uniqueDates
          })
        }
      } else {
        console.log(`🏅 [DIRECT] Badge ${badge.type} already exists`)
      }
    }

    console.log(`🏅 [DIRECT] ✅ Complete! Awarded ${newBadges.length} new badge(s)`)

    return NextResponse.json({
      success: true,
      newBadges,
      stats: {
        uniqueDates,
        eligibleBadges: activityBadges.length,
        newBadgesAwarded: newBadges.length,
        usingServiceRole: usingService
      },
      hints: usingService ? [] : [
        'Consider adding SUPABASE_SERVICE_ROLE_KEY to enable awarding under RLS',
        newBadges.length === 0 && activityBadges.length > 0 ? 'RLS may be blocking inserts; service role key fixes this.' : ''
      ].filter(Boolean)
    })

  } catch (error: any) {
    console.error('🏅 [DIRECT] ❌ Exception:', error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

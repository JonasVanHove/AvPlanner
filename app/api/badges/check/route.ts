import { NextRequest, NextResponse } from "next/server"
// Try to use admin client first (if service role key available), fallback to regular client
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Try to get admin client if available (has better permissions and might fix fetch issues)
let adminClient: any = null
try {
  const { getSupabaseAdmin } = require('@/lib/supabaseAdmin')
  adminClient = getSupabaseAdmin()
  console.log('🏅 [SETUP] Using Supabase Admin client')
} catch (e) {
  console.log('🏅 [SETUP] Service role key not available, using regular client')
}

const supabaseClient = adminClient || supabase

/**
 * POST /api/badges/check
 * Checks and awards badges for a member after they update availability
 * Body: { memberId: string, teamId: string }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🏅 [API] Badge check initiated')
    const { memberId, teamId } = await request.json()
    console.log(`🏅 [API] Checking badges for member: ${memberId} in team: ${teamId}`)

    if (!memberId || !teamId) {
      console.error('🏅 [API] ❌ Missing memberId or teamId')
      return NextResponse.json(
        { error: "Missing memberId or teamId" },
        { status: 400 }
      )
    }

    console.log('🏅 [API] Calling check_and_award_badges RPC function...')
    // Call the database function to check and award badges
    const { data, error } = await supabaseClient.rpc("check_and_award_badges", {
      p_member_id: memberId,
      p_team_id: teamId,
    })

    if (error) {
      console.error("🏅 [API] ❌ Database error:", error)
      console.error("🏅 [API] Error code:", error.code)
      console.error("🏅 [API] Error hint:", error.hint)
      console.error("🏅 [API] Error details:", error.details)
      console.error("🏅 [API] Error message:", error.message)
      
      // Check if it's a "function does not exist" error
      if (error.message && (error.message.includes('does not exist') || error.message.includes('function'))) {
        return NextResponse.json(
          { 
            error: "Badge system not set up", 
            details: "Database function 'check_and_award_badges' does not exist. Please run gamification-schema.sql in Supabase SQL Editor.",
            setup_required: true
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: "Failed to check badges", details: error.message },
        { status: 500 }
      )
    }

    console.log('🏅 [API] ✅ RPC function executed successfully')
    console.log('🏅 [API] Result:', JSON.stringify(data, null, 2))

    const newBadges = data?.new_badges || []
    if (newBadges.length > 0) {
      console.log(`🏅 [API] 🎉 ${newBadges.length} NEW BADGE(S) AWARDED:`)
      newBadges.forEach((badge: any) => {
        console.log(`🏅 [API]    • ${badge.type}`)
      })
    } else {
      console.log('🏅 [API] ℹ️  No new badges awarded (may already have them or criteria not met)')
    }

    return NextResponse.json({ 
      success: true, 
      result: data,
      newBadges: newBadges
    })
  } catch (error: any) {
    console.error("🏅 [API] ❌ Exception caught:", error)
    console.error("🏅 [API] Exception name:", error.name)
    console.error("🏅 [API] Exception message:", error.message)
    console.error("🏅 [API] Stack trace:", error.stack)
    
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error.message,
        type: error.name
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/badges/check?memberId=xxx&teamId=xxx
 * Check if member is eligible for badges (without awarding)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("memberId")
    const teamId = searchParams.get("teamId")

    if (!memberId || !teamId) {
      return NextResponse.json(
        { error: "Missing memberId or teamId" },
        { status: 400 }
      )
    }

    // Check timely completion
    const { data: isTimely, error: timelyError } = await supabaseClient.rpc(
      "check_timely_completion",
      {
        p_member_id: memberId,
        p_team_id: teamId,
      }
    )

    if (timelyError) {
      console.error("Error checking timely completion:", timelyError)
    }

    // Check helped others
    const { data: helpedMembers, error: helpedError } = await supabaseClient.rpc(
      "check_helped_others",
      {
        p_member_id: memberId,
        p_team_id: teamId,
      }
    )

    if (helpedError) {
      console.error("Error checking helped others:", helpedError)
    }

    return NextResponse.json({
      success: true,
      eligible: {
        timelyCompletion: isTimely || false,
        helpedOthers: (helpedMembers || []).length > 0,
        helpedMembersCount: (helpedMembers || []).length,
      },
    })
  } catch (error: any) {
    console.error("Badge eligibility check error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

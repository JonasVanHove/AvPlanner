import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

/**
 * GET /api/badges/user?email=xxx&teamId=xxx&limit=50
 * Get badges for a specific user
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const teamId = searchParams.get("teamId")
    const memberId = searchParams.get("memberId")
    const limit = parseInt(searchParams.get("limit") || "50")

    console.log('🏅 [API] Badge request received:', { email, teamId, limit })

    // Support two modes: lookup by email (legacy) or by memberId (preferred when viewing other members)
    if (!email && !memberId) {
      console.warn('🏅 [API] Missing email or memberId parameter')
      return NextResponse.json(
        { error: "Missing email or memberId parameter" },
        { status: 400 }
      )
    }

    let data: any = null
    let error: any = null

    if (memberId) {
      // Query the user_badges table directly by member_id for reliability
      console.log('🏅 [API] Querying user_badges by memberId...')
      const res = await supabase
        .from('user_badges')
        .select('*')
        .eq('member_id', memberId)
        .eq('team_id', teamId)
        .order('earned_at', { ascending: false })
      data = res.data
      error = res.error
    } else if (email) {
      console.log('🏅 [API] Calling get_user_badges RPC function...')
      const res = await supabase.rpc("get_user_badges", {
        p_user_email: email,
        p_team_id: teamId || null,
        p_limit: limit,
      })
      data = res.data
      error = res.error
    }

    const elapsed = Date.now() - startTime

    if (error) {
      console.error(`🏅 [API] Error fetching user badges (${elapsed}ms):`, error)
      
      // Return empty array instead of error if function doesn't exist yet
      if (error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.warn('🏅 [API] Badge function not yet created in database - returning empty badges')
        return NextResponse.json({
          success: true,
          badges: [],
          count: 0,
          warning: 'Badge system not yet configured'
        })
      }
      
      return NextResponse.json(
        { error: "Failed to fetch badges", details: error.message },
        { status: 500 }
      )
    }

    console.log(`🏅 [API] ✅ Successfully fetched ${(data || []).length} badges in ${elapsed}ms`)
    console.log('🏅 [API] Badge data:', data)

    return NextResponse.json({
      success: true,
      badges: data || [],
      count: (data || []).length,
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`🏅 [API] ❌ User badges fetch error (${elapsed}ms):`, error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

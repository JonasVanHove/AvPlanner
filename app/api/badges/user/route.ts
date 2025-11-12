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
    const limit = parseInt(searchParams.get("limit") || "50")

    console.log('🏅 [API] Badge request received:', { email, teamId, limit })

    if (!email) {
      console.warn('🏅 [API] Missing email parameter')
      return NextResponse.json(
        { error: "Missing email parameter" },
        { status: 400 }
      )
    }

    console.log('🏅 [API] Calling get_user_badges RPC function...')
    
    // Call database function to get user badges
    const { data, error } = await supabase.rpc("get_user_badges", {
      p_user_email: email,
      p_team_id: teamId || null,
      p_limit: limit,
    })

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

import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

/**
 * GET /api/badges/leaderboard?teamId=xxx&limit=10
 * Get badge leaderboard for a team
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("teamId")
    const limit = parseInt(searchParams.get("limit") || "10")

    if (!teamId) {
      return NextResponse.json(
        { error: "Missing teamId parameter" },
        { status: 400 }
      )
    }

    // Call database function to get leaderboard
    const { data, error } = await supabase.rpc("get_badge_leaderboard", {
      p_team_id: teamId,
      p_limit: limit,
    })

    if (error) {
      console.error("Error fetching badge leaderboard:", error)
      return NextResponse.json(
        { error: "Failed to fetch leaderboard", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      leaderboard: data || [],
    })
  } catch (error: any) {
    console.error("Leaderboard fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

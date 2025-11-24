import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

/**
 * GET /api/badges/user?email=xxx&teamId=xxx&memberId=xxx&limit=50
 * Returns badges for a user (by email or memberId). Prefers calling the
 * SECURITY DEFINER function `get_user_badges` via the admin client when
 * available to bypass RLS, otherwise falls back to direct table queries.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const teamId = searchParams.get("teamId")
    const memberId = searchParams.get("memberId")
    const limit = parseInt(searchParams.get("limit") || "50")

    console.log('🏅 [API] Badge request received:', { email, teamId, memberId, limit })

    if (!email && !memberId) {
      console.warn('🏅 [API] Missing email or memberId parameter')
      return NextResponse.json({ error: 'Missing email or memberId parameter' }, { status: 400 })
    }

    let admin: any = null
    try {
      admin = getSupabaseAdmin()
    } catch (e) {
      console.warn('🏅 [API] Supabase admin client not available, using anon client')
      admin = null
    }

    let data: any[] = []
    let err: any = null

    const errMsg = (e: any) => (e && e.message) ? String(e.message) : String(e)

    if (memberId) {
      try {
        if (admin) {
          let memberEmail: string | null = null
          try {
            const mRes = await admin.from('members').select('email,auth_user_id').eq('id', memberId).maybeSingle()
            if (mRes && mRes.data) {
              memberEmail = mRes.data.email || null
              if (!memberEmail && mRes.data.auth_user_id) {
                try {
                  const userRes = await admin.auth.admin.getUserById(mRes.data.auth_user_id)
                  memberEmail = userRes?.data?.user?.email || null
                } catch (e) {
                  console.warn('🏅 [API] Could not resolve user email from auth_user_id:', e)
                }
              }
            }
          } catch (e) {
            console.warn('🏅 [API] Failed to lookup member email/auth_user_id:', e)
          }

          if (memberEmail) {
            try {
              console.log('🏅 [API] Calling RPC get_user_badges for email:', memberEmail)
              const rpcRes = await admin.rpc('get_user_badges', { p_user_email: memberEmail, p_team_id: teamId, p_limit: limit })
              data = rpcRes?.data || []
              err = rpcRes?.error || null
            } catch (e) {
              console.warn('🏅 [API] RPC get_user_badges failed, falling back to direct query:', e)
              err = e
            }
          }

          if ((!data || data.length === 0) && !err) {
            const q = admin.from('user_badges').select('*').eq('member_id', memberId)
            if (teamId) q.eq('team_id', teamId)
            q.order('earned_at', { ascending: false }).limit(limit)
            const res = await q
            data = res?.data || []
            err = res?.error || null
          }
        } else {
          const q = supabase.from('user_badges').select('*').eq('member_id', memberId)
          if (teamId) q.eq('team_id', teamId)
          q.order('earned_at', { ascending: false }).limit(limit)
          const res = await q
          data = res?.data || []
          err = res?.error || null
        }
      } catch (e) {
        console.error('🏅 [API] Error querying user_badges for memberId:', e)
        data = []
        err = e
      }
    }

    if (email) {
      try {
        const membersClient = admin || supabase
        const membersRes = await membersClient.from('members').select('id,team_id,email').ilike('email', email)
        const members = (membersRes && membersRes.data) || []
        const memberIds = members.map((m: any) => m.id).filter(Boolean)

        if (memberIds.length === 0) {
          console.log('🏅 [API] No members found for email:', email)
        } else {
          try {
            const client = admin || supabase
            let q = client.from('user_badges').select('*').in('member_id', memberIds)
            if (teamId) q = q.eq('team_id', teamId)
            q = q.order('earned_at', { ascending: false }).limit(limit)
            const res = await q
            data = res?.data || []
            err = res?.error || null
          } catch (e) {
            console.error('🏅 [API] Error querying user_badges by memberIds:', e)
            data = data || []
            err = e
          }
        }
      } catch (e) {
        console.error('🏅 [API] Error resolving members for email:', e)
        data = data || []
        err = e
      }
    }

    const elapsed = Date.now() - startTime

    if (err) {
      console.error(`🏅 [API] Error fetching user badges (${elapsed}ms):`, err)
      const msg = errMsg(err)
      if (msg.includes('function') || msg.includes('does not exist')) {
        console.warn('🏅 [API] Badge function not yet created in database - returning empty badges')
        return NextResponse.json({ success: true, badges: [], count: 0, warning: 'Badge system not yet configured' })
      }
      return NextResponse.json({ error: 'Failed to fetch badges', details: msg }, { status: 500 })
    }

    const rawBadges = (data || []) as any[]
    const normalized = rawBadges.map((b) => ({
      badge_id: b.id || b.badge_id,
      badge_type: b.badge_type,
      week_year: b.week_year,
      earned_at: b.earned_at,
      team_name: b.team_name || '',
      metadata: b.metadata || {},
    }))

    const disciplineFor = (type: string) => {
      if (!type) return 'other'
      if (type === 'timely_completion') return 'timely'
      if (type === 'helped_other') return 'helper'
      if (type.startsWith('streak') || ['perfect_month'].includes(type) || type.startsWith('consistency')) return 'streak'
      if (type.startsWith('activity')) return 'activity'
      if (['collaboration'].includes(type)) return 'collaboration'
      if (['early_bird', 'night_shift'].includes(type)) return 'early_bird'
      if (['attendance_100'].includes(type)) return 'attendance'
      return 'other'
    }

    const disciplineOrder = ['timely', 'helper', 'streak', 'activity', 'collaboration', 'early_bird', 'consistency', 'attendance', 'other']

    const sorted = normalized.sort((a, b) => {
      const da = disciplineFor(a.badge_type)
      const db = disciplineFor(b.badge_type)
      const ia = disciplineOrder.indexOf(da)
      const ib = disciplineOrder.indexOf(db)
      if (ia !== ib) return ia - ib
      if (a.badge_type !== b.badge_type) return a.badge_type.localeCompare(b.badge_type)
      return new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime()
    })

    const grouped: Record<string, any[]> = {}
    for (const badge of sorted) {
      const d = disciplineFor(badge.badge_type)
      grouped[d] = grouped[d] || []
      grouped[d].push(badge)
    }

    const groupedOrdered: Record<string, any[]> = {}
    for (const d of disciplineOrder) {
      if (grouped[d] && grouped[d].length > 0) groupedOrdered[d] = grouped[d]
    }

    console.log('🏅 [API] ✅ Fetched', normalized.length, 'badges in', elapsed, 'ms')

    return NextResponse.json({ success: true, badges: sorted, grouped: groupedOrdered, count: sorted.length })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`🏅 [API] ❌ User badges fetch error (${elapsed}ms):`, error)
    return NextResponse.json({ error: 'Internal server error', details: String(error?.message || error) }, { status: 500 })
  }
}

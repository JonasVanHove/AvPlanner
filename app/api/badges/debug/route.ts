import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const memberId = searchParams.get('memberId')
  const teamId = searchParams.get('teamId')
  const limit = parseInt(searchParams.get('limit') || '100')

  const out: any = {
    timestamp: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      anon_and_service_key_match: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    queries: {}
  }

  try {
    // Run anon client query
    try {
      const anonQ = supabase
        .from('user_badges')
        .select('*')
        .limit(limit)
      if (memberId) anonQ.eq('member_id', memberId)
      if (teamId) anonQ.eq('team_id', teamId)
      const anonRes = await anonQ
      out.queries.anon = {
        status: 'ok',
        dataCount: (anonRes.data || []).length,
        dataSample: (anonRes.data || []).slice(0, 20),
        error: anonRes.error ? anonRes.error.message : null,
        raw: anonRes
      }
    } catch (anonErr: any) {
      out.queries.anon = { status: 'error', error: anonErr?.message || String(anonErr) }
    }

    // Run admin client query
    try {
      let adminClient = null
      try {
        adminClient = getSupabaseAdmin()
      } catch (adminErr: any) {
        out.queries.adminInitError = adminErr?.message || String(adminErr)
      }

      if (adminClient) {
        const adminQ = adminClient
          .from('user_badges')
          .select('*')
          .limit(limit)
        if (memberId) adminQ.eq('member_id', memberId)
        if (teamId) adminQ.eq('team_id', teamId)
        const adminRes = await adminQ
        out.queries.admin = {
          status: 'ok',
          dataCount: (adminRes.data || []).length,
          dataSample: (adminRes.data || []).slice(0, 20),
          error: adminRes.error ? adminRes.error.message : null,
          raw: adminRes
        }
      } else {
        out.queries.admin = { status: 'skipped', reason: 'admin client not available' }
      }
    } catch (adminErr: any) {
      out.queries.admin = { status: 'error', error: adminErr?.message || String(adminErr) }
    }

    return NextResponse.json(out)
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function buildUrl(base: string, teamId?: string, memberId?: string, limit = 100) {
  const url = new URL(`${base.replace(/\/$/, '')}/rest/v1/user_badges`)
  url.searchParams.set('select', '*')
  url.searchParams.set('limit', String(limit))
  if (teamId) url.searchParams.set('team_id', `eq.${teamId}`)
  if (memberId) url.searchParams.set('member_id', `eq.${memberId}`)
  return url.toString()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId') || undefined
  const memberId = searchParams.get('memberId') || undefined
  const limit = parseInt(searchParams.get('limit') || '100')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const out: any = { timestamp: new Date().toISOString(), rest: {} }

  if (!supabaseUrl) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
  }

  try {
    const url = buildUrl(supabaseUrl, teamId, memberId, limit)

    // call with anon key
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          apikey: anonKey || '',
          Authorization: `Bearer ${anonKey || ''}`,
          Accept: 'application/json'
        }
      })
      const text = await res.text()
      let parsed: any = null
      try { parsed = text ? JSON.parse(text) : null } catch (e) { parsed = text }
      out.rest.anon = { status: res.status, ok: res.ok, body: parsed }
    } catch (e: any) {
      out.rest.anon = { error: e?.message || String(e) }
    }

    // call with service role key
    try {
      const res2 = await fetch(url, {
        method: 'GET',
        headers: {
          apikey: serviceKey || '',
          Authorization: `Bearer ${serviceKey || ''}`,
          Accept: 'application/json'
        }
      })
      const text2 = await res2.text()
      let parsed2: any = null
      try { parsed2 = text2 ? JSON.parse(text2) : null } catch (e) { parsed2 = text2 }
      out.rest.service = { status: res2.status, ok: res2.ok, body: parsed2 }
    } catch (e: any) {
      out.rest.service = { error: e?.message || String(e) }
    }

    return NextResponse.json(out)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

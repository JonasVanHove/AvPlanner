import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null

  const mask = (s: string | null) => {
    if (!s) return null
    return s.length > 12 ? `${s.slice(0, 8)}...${s.slice(-4)}` : s
  }

  const result: any = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anonKey,
      SUPABASE_SERVICE_ROLE_KEY: !!serviceKey,
    },
    values: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_prefix: mask(anonKey),
      SUPABASE_SERVICE_ROLE_KEY_prefix: mask(serviceKey),
    },
  }

  // Try a simple REST call using the service role key (if present)
  if (supabaseUrl && serviceKey) {
    try {
      const restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/user_badges?select=*&limit=1`
      const r = await fetch(restUrl, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } })
      const bodyText = await r.text()
      result.rest = { status: r.status, ok: r.ok, bodySample: bodyText ? bodyText.slice(0, 200) : '' }
    } catch (e) {
      result.rest = { error: String(e) }
    }
  }

  return NextResponse.json(result)
}

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Server-side fallback signup when public /auth/v1/signup 500s.
// Expects JSON body: { email, password, first_name, last_name }
// Returns JSON { userId, email } or error.
export async function POST(req: NextRequest) {
  try {
    // Ensure server-side env is present
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[manual-signup] Missing SUPABASE_SERVICE_ROLE_KEY')
      return new Response(JSON.stringify({ error: 'missing_service_role_key' }), { status: 500 })
    }

    const body = await req.json()
    const { email, password, first_name, last_name } = body || {}
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'missing_email_or_password' }), { status: 400 })
    }

    // Try admin user creation
    const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password,
      user_metadata: {
        first_name: first_name || '',
        last_name: last_name || '',
      },
      email_confirm: true,
    })

    if (createErr) {
      console.error('[manual-signup] createUser error:', createErr)
      return new Response(JSON.stringify({ error: createErr.message || 'create_user_failed' }), { status: 500 })
    }

    // Ensure profile row exists (in case trigger still broken)
    if (userData?.user?.id) {
      const profileId = userData.user.id
      const profileEmail = userData.user.email
      if (profileEmail) {
        const { error: upsertErr } = await supabaseAdmin.from('users').upsert({
          id: profileId,
          email: profileEmail,
          first_name: first_name || '',
          last_name: last_name || '',
        })
        if (upsertErr) {
          // Log but don't fail signup
          console.warn('[manual-signup] profile upsert warning:', upsertErr)
        }
      }
    }

    return new Response(JSON.stringify({ userId: userData?.user?.id, email: userData?.user?.email }), { status: 200 })
  } catch (err: any) {
    console.error('[manual-signup] unexpected error:', err)
    return new Response(JSON.stringify({ error: err?.message || 'unknown_error' }), { status: 500 })
  }
}

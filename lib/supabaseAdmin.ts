import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

let supabaseAdminInstance: SupabaseClient | null = null

// IMPORTANT: Never import this file from client-side code.
// Lazy initialization to prevent build-time errors when env vars are not set
export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdminInstance) return supabaseAdminInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL is required")
  }

  // Fallback: if service role key absent, use anon key (limited privileges)
  const effectiveKey = serviceRoleKey || anonKey
  if (!effectiveKey) {
    throw new Error("Missing Supabase keys: provide SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  supabaseAdminInstance = createClient(supabaseUrl, effectiveKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return supabaseAdminInstance
}

// For backward compatibility - but prefer using getSupabaseAdmin()
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseAdmin()
    return (client as any)[prop]
  }
})

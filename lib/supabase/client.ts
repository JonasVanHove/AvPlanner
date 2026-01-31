import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Lightweight createClient wrapper used by buddy-battle libs.
 * - If `url` and `key` are provided they are used.
 * - Otherwise fallback to environment variables (service role key when available).
 */
export function createClient(
  url?: string,
  key?: string,
  options?: any
): SupabaseClient {
  const supabaseUrl = url ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = key ?? (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or Key is not configured');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, options);
}

export type { SupabaseClient } from '@supabase/supabase-js';

// =====================================================
// BUDDY BATTLE - Shared team resolution utility
// Resolves team from slug, invite_code, UUID, or name
// =====================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function resolveTeamFromSlug(slug: string): Promise<{ id: string; name: string; slug?: string; invite_code?: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore - may happen in server components
        }
      },
    },
  });

  const decodedSlug = decodeURIComponent(slug);

  // 1. Try RPC function first (bypasses RLS)
  try {
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_team_public_info', { lookup_value: decodedSlug })
      .maybeSingle();

    if (!rpcError && rpcData) {
      return rpcData as { id: string; name: string; slug?: string; invite_code?: string };
    }
  } catch {
    // RPC might not exist, continue with fallbacks
  }

  // 2. Check if slug looks like a full UUID
  const isFullUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedSlug);
  
  if (isFullUUID) {
    const { data } = await supabase
      .from('teams')
      .select('id, name, slug, invite_code')
      .eq('id', decodedSlug)
      .single();
    if (data) return data;
  }

  // 3. Try invite_code (most common for short codes like "6328bc9c")
  const { data: inviteData } = await supabase
    .from('teams')
    .select('id, name, slug, invite_code')
    .eq('invite_code', decodedSlug)
    .maybeSingle();
  if (inviteData) return inviteData;

  // 4. Try slug (friendly URL)
  const { data: slugData } = await supabase
    .from('teams')
    .select('id, name, slug, invite_code')
    .eq('slug', decodedSlug)
    .maybeSingle();
  if (slugData) return slugData;

  // 5. Try short UUID match (first 8 chars)
  if (/^[0-9a-f]{8}$/i.test(decodedSlug)) {
    const { data: shortIdData } = await supabase
      .from('teams')
      .select('id, name, slug, invite_code')
      .like('id', `${decodedSlug}%`)
      .maybeSingle();
    if (shortIdData) return shortIdData;
  }

  // 6. Try name (case-insensitive)
  const { data: nameData } = await supabase
    .from('teams')
    .select('id, name, slug, invite_code')
    .ilike('name', decodedSlug)
    .maybeSingle();
  if (nameData) return nameData;

  return null;
}

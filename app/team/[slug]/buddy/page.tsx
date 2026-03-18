// =====================================================
// BUDDY BATTLE - Main Page Route
// /team/[slug]/buddy
// =====================================================

import { Suspense } from 'react';
import { BuddyPageClient } from './client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

// Loading component
function BuddyLoading() {
  return (
    <div className="buddy-battle-container flex items-center justify-center min-h-screen">
      <div className="scanlines" />
      <div className="retro-panel p-8">
        <div className="retro-loading mx-auto mb-4" />
        <p className="retro-text text-center">Loading Buddy Battle...</p>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getTeamBySlug(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('[BUDDY PAGE] Missing Supabase environment variables');
    return null;
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      url,
      key,
      {
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
              // Ignore
            }
          },
        },
      }
    );

    const decodedSlug = decodeURIComponent(slug);

    // Try using the secure RPC function first (bypasses RLS)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_team_public_info', { lookup_value: decodedSlug })
      .maybeSingle();

    if (!rpcError && rpcData) {
      return rpcData;
    }

    // Fallback to direct queries (will fail if RLS is strict and user is anon)
    // Check if slug looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug) ||
                   /^[0-9a-f]{8}$/i.test(slug); // Also support short IDs

    if (isUUID) {
      // If it's a UUID, search by id
      const result = await supabase
        .from('teams')
        .select('id, name, slug, invite_code')
        .eq('id', slug)
        .single();

      if (result.data) return result.data;
    }

    // Try by invite_code first (for backwards compatibility)
    const inviteResult = await supabase
      .from('teams')
      .select('id, name, slug, invite_code')
      .eq('invite_code', decodedSlug)
      .maybeSingle();

    if (inviteResult.data) return inviteResult.data;

    // Then try by slug (friendly URL)
    const slugResult = await supabase
      .from('teams')
      .select('id, name, slug, invite_code')
      .eq('slug', decodedSlug)
      .maybeSingle();

    if (slugResult.data) return slugResult.data;

    // Finally try by name (case-insensitive)
    const nameResult = await supabase
      .from('teams')
      .select('id, name, slug, invite_code')
      .ilike('name', decodedSlug)
      .maybeSingle();

    if (nameResult.data) return nameResult.data;

    // Try with spaces replaced by hyphens (e.g., "efficiency-team" -> "Efficiency Team")
    const nameWithSpaces = decodedSlug.replace(/-/g, ' ');
    if (nameWithSpaces !== decodedSlug) {
      const nameSpacesResult = await supabase
        .from('teams')
        .select('id, name, slug, invite_code')
        .ilike('name', nameWithSpaces)
        .maybeSingle();

      if (nameSpacesResult.data) return nameSpacesResult.data;
    }

    return null;
  } catch (error) {
    console.error('[BUDDY PAGE] Error fetching team:', error);
    return null;
  }
}

export default async function BuddyPage({ params }: PageProps) {
  const { slug } = await params;
  
  let team = null;
  try {
    team = await getTeamBySlug(slug);
  } catch (e) {
    console.error('[BUDDY PAGE] Fatal error fetching team:', e);
    // Continue without team, let client handle it
  }
  
  // If we found the team and need to redirect
  if (team && team.invite_code && slug !== team.invite_code) {
    redirect(`/team/${team.invite_code}/buddy`);
  }
  
  return (
    <Suspense fallback={<BuddyLoading />}>
      <BuddyPageClient teamId={team?.id} teamSlug={team?.invite_code || slug} />
    </Suspense>
  );
}

// Metadata
export async function generateMetadata({ params }: PageProps) {
  return {
    title: 'AvPlanner Buddy | Home',
    description: 'Train your buddy, battle opponents, and become the ultimate availability master!',
  };
}

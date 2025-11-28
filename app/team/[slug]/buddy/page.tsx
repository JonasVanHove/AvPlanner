// =====================================================
// BUDDY BATTLE - Main Page Route
// /team/[slug]/buddy
// =====================================================

import { Suspense } from 'react';
import { BuddyPageClient } from './client';
import '@/styles/buddy-battle.css';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

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
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Check if slug looks like a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug) ||
                 /^[0-9a-f]{8}$/i.test(slug); // Also support short IDs

  let query = supabase
    .from('teams')
    .select('id, name, slug');

  if (isUUID) {
    // If it's a UUID, search by id
    query = query.eq('id', slug);
  } else {
    // Otherwise search by slug
    query = query.eq('slug', slug);
  }

  const { data: team, error } = await query.single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching team:', error);
  }

  return team;
}

export default async function BuddyPage({ params }: PageProps) {
  const { slug } = await params;
  
  const team = await getTeamBySlug(slug);
  
  if (!team) {
    notFound();
  }
  
  return (
    <Suspense fallback={<BuddyLoading />}>
      <BuddyPageClient teamId={team.id} teamSlug={slug} />
    </Suspense>
  );
}

// Metadata
export async function generateMetadata({ params }: PageProps) {
  return {
    title: 'Buddy Battle | AvPlanner',
    description: 'Train your buddy, battle opponents, and become the ultimate availability master!',
  };
}

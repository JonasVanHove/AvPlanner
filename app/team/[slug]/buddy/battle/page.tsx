// =====================================================
// BUDDY BATTLE - Battle Page Route
// /team/[slug]/buddy/battle
// =====================================================

import { Suspense } from 'react';
import { BattleScreen } from '@/components/buddy-battle/battle-screen';
import '@/styles/buddy-battle.css';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

// Loading component
function BattleLoading() {
  return (
    <div className="buddy-battle-container flex items-center justify-center min-h-screen">
      <div className="scanlines" />
      <div className="retro-panel p-8">
        <div className="retro-loading mx-auto mb-4" />
        <p className="retro-text text-center">Preparing for battle...</p>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ type?: string; opponent?: string }>;
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
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  let query = supabase
    .from('teams')
    .select('id, name, slug');

  if (isUUID) {
    query = query.eq('id', slug);
  } else {
    query = query.eq('slug', slug);
  }

  const { data: team, error } = await query.single();
  return team;
}

export default async function BattlePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  
  const team = await getTeamBySlug(slug);
  
  if (!team) {
    notFound();
  }
  
  return (
    <Suspense fallback={<BattleLoading />}>
      <BattleScreen teamId={team.id} />
    </Suspense>
  );
}

// Metadata
export async function generateMetadata({ params, searchParams }: PageProps) {
  const query = searchParams ? await searchParams : {};
  const battleType = query.type || 'pvp';
  
  const titles: Record<string, string> = {
    tutorial: 'Tutorial Battle - Nikita',
    boss: 'Boss Battle - Marie-Françoise',
    pvp: 'Team Battle',
  };
  
  return {
    title: `AvPlanner Buddy | ${titles[battleType] || 'Battle'}`,
    description: 'Engage in turn-based combat with your buddy!',
  };
}

// =====================================================
// BUDDY BATTLE - Team Overview Page Route
// /team/[slug]/buddy/team
// =====================================================

import { Suspense } from 'react';
import { TeamOverview } from '@/components/buddy-battle/team-overview';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import '@/styles/buddy-battle.css';

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

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  let query = supabase.from('teams').select('id, name');
  if (isUUID) {
    query = query.eq('id', slug);
  } else {
    query = query.eq('slug', slug);
  }

  const { data: team } = await query.single();
  return team;
}

function LoadingFallback() {
  return (
    <div className="buddy-battle-container flex items-center justify-center min-h-screen">
      <div className="scanlines" />
      <div className="retro-panel p-8">
        <div className="retro-loading mx-auto mb-4" />
        <p className="retro-text text-center">Loading Team...</p>
      </div>
    </div>
  );
}

export default async function TeamOverviewPage({ params }: PageProps) {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  
  if (!team) {
    notFound();
  }
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TeamOverview teamId={team.id} />
    </Suspense>
  );
}

export async function generateMetadata() {
  return {
    title: 'Team Buddies | Buddy Battle',
    description: 'View all team members and their buddies!',
  };
}

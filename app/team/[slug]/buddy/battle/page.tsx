// =====================================================
// BUDDY BATTLE - Battle Page Route
// /team/[slug]/buddy/battle
// =====================================================

import { Suspense } from 'react';
import { BattleScreen } from '@/components/buddy-battle/battle-screen';
import { resolveTeamFromSlug } from '@/lib/buddy-battle/resolve-team';
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

export default async function BattlePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  
  const team = await resolveTeamFromSlug(slug);
  
  if (!team) {
    notFound();
  }
  
  return (
    <Suspense fallback={<BattleLoading />}>
      <BattleScreen teamId={team.id} teamSlug={team.invite_code || slug} />
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

// =====================================================
// BUDDY BATTLE - Battle Page Route
// /team/[teamId]/buddy/battle
// =====================================================

import { Suspense } from 'react';
import { BattleScreen } from '@/components/buddy-battle/battle-screen';
import '@/styles/buddy-battle.css';

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
  params: Promise<{ teamId: string }>;
  searchParams?: Promise<{ type?: string; opponent?: string }>;
}

export default async function BattlePage({ params, searchParams }: PageProps) {
  const { teamId } = await params;
  const query = searchParams ? await searchParams : {};
  
  return (
    <Suspense fallback={<BattleLoading />}>
      <BattleScreen />
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
    title: `${titles[battleType] || 'Battle'} | Buddy Battle`,
    description: 'Engage in turn-based combat with your buddy!',
  };
}

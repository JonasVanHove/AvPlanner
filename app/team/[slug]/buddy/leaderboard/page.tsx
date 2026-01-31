// =====================================================
// BUDDY BATTLE - Leaderboard Page Route
// /team/[slug]/buddy/leaderboard
// =====================================================

import { Suspense } from 'react';
import { LeaderboardScreen } from '@/components/buddy-battle/leaderboard-screen';
import '@/styles/buddy-battle.css';

// Loading component
function LeaderboardLoading() {
  return (
    <div className="buddy-battle-container flex items-center justify-center min-h-screen">
      <div className="scanlines" />
      <div className="retro-panel p-8">
        <div className="retro-loading mx-auto mb-4" />
        <p className="retro-text text-center">Loading rankings...</p>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LeaderboardPage({ params }: PageProps) {
  const { slug } = await params;
  
  return (
    <Suspense fallback={<LeaderboardLoading />}>
      <LeaderboardScreen />
    </Suspense>
  );
}

// Metadata
export function generateMetadata() {
  return {
    title: 'AvPlanner Buddy | Leaderboard',
    description: 'See the top trainers in your team!',
  };
}

// =====================================================
// BUDDY BATTLE - Achievements Page Route
// /team/[slug]/buddy/achievements
// =====================================================

import { Suspense } from 'react';
import { AchievementsScreen } from '@/components/buddy-battle/achievements-screen';
import '@/styles/buddy-battle.css';

// Loading component
function AchievementsLoading() {
  return (
    <div className="buddy-battle-container flex items-center justify-center min-h-screen">
      <div className="scanlines" />
      <div className="retro-panel p-8">
        <div className="retro-loading mx-auto mb-4" />
        <p className="retro-text text-center">Loading achievements...</p>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AchievementsPage({ params }: PageProps) {
  const { slug } = await params;
  
  return (
    <Suspense fallback={<AchievementsLoading />}>
      <AchievementsScreen />
    </Suspense>
  );
}

// Metadata
export function generateMetadata() {
  return {
    title: 'AvPlanner Buddy | Achievements',
    description: 'View your earned achievements and track your progress!',
  };
}

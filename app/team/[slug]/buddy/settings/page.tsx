// =====================================================
// BUDDY BATTLE - Settings Page Route
// /team/[slug]/buddy/settings
// =====================================================

import { Suspense } from 'react';
import { GameSettings } from '@/components/buddy-battle/game-settings';
import { resolveTeamFromSlug } from '@/lib/buddy-battle/resolve-team';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

function LoadingFallback() {
  return (
    <div className="buddy-battle-container flex items-center justify-center min-h-screen">
      <div className="scanlines" />
      <div className="retro-panel p-8">
        <div className="retro-loading mx-auto mb-4" />
        <p className="retro-text text-center">Loading Settings...</p>
      </div>
    </div>
  );
}

export default async function SettingsPage({ params }: PageProps) {
  const { slug } = await params;
  const team = await resolveTeamFromSlug(slug);
  
  if (!team) {
    notFound();
  }
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GameSettings teamId={team.id} teamSlug={slug} />
    </Suspense>
  );
}

export async function generateMetadata() {
  return {
    title: 'Settings | Buddy Battle',
    description: 'Customize your Buddy Battle experience',
  };
}

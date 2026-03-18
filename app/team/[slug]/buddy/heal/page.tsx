// =====================================================
// BUDDY BATTLE - Heal Center Page Route
// /team/[slug]/buddy/heal
// =====================================================

import { Suspense } from 'react';
import { HealCenter } from '@/components/buddy-battle/heal-center';
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
        <p className="retro-text text-center">Loading Heal Center...</p>
      </div>
    </div>
  );
}

export default async function HealCenterPage({ params }: PageProps) {
  const { slug } = await params;
  const team = await resolveTeamFromSlug(slug);
  
  if (!team) {
    notFound();
  }
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HealCenter teamId={team.id} teamSlug={slug} />
    </Suspense>
  );
}

export async function generateMetadata() {
  return {
    title: 'Heal Center | Buddy Battle',
    description: 'Restore your buddy to full health!',
  };
}

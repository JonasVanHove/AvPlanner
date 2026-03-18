// =====================================================
// BUDDY BATTLE - Team Overview Page Route
// /team/[slug]/buddy/team
// =====================================================

import { Suspense } from 'react';
import { TeamOverview } from '@/components/buddy-battle/team-overview';
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
        <p className="retro-text text-center">Loading Team...</p>
      </div>
    </div>
  );
}

export default async function TeamOverviewPage({ params }: PageProps) {
  const { slug } = await params;
  const team = await resolveTeamFromSlug(slug);
  
  if (!team) {
    notFound();
  }
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TeamOverview teamId={team.id} teamSlug={slug} />
    </Suspense>
  );
}

export async function generateMetadata() {
  return {
    title: 'Team Buddies | Buddy Battle',
    description: 'View all team members and their buddies!',
  };
}

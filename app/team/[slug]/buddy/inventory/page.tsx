// =====================================================
// BUDDY BATTLE - Inventory Page Route
// /team/[slug]/buddy/inventory
// =====================================================

import { Suspense } from 'react';
import { InventoryScreen } from '@/components/buddy-battle/inventory-screen';
import { resolveTeamFromSlug } from '@/lib/buddy-battle/resolve-team';
import { notFound } from 'next/navigation';

// Loading component
function InventoryLoading() {
  return (
    <div className="buddy-battle-container flex items-center justify-center min-h-screen">
      <div className="scanlines" />
      <div className="retro-panel p-8">
        <div className="retro-loading mx-auto mb-4" />
        <p className="retro-text text-center">Loading inventory...</p>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function InventoryPage({ params }: PageProps) {
  const { slug } = await params;
  const team = await resolveTeamFromSlug(slug);
  if (!team) notFound();
  
  return (
    <Suspense fallback={<InventoryLoading />}>
      <InventoryScreen teamId={team.id} teamSlug={slug} />
    </Suspense>
  );
}

// Metadata
export function generateMetadata() {
  return {
    title: 'AvPlanner Buddy | Inventory',
    description: 'Manage your items and equipment!',
  };
}

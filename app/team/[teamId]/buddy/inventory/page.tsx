// =====================================================
// BUDDY BATTLE - Inventory Page Route
// /team/[teamId]/buddy/inventory
// =====================================================

import { Suspense } from 'react';
import { InventoryScreen } from '@/components/buddy-battle/inventory-screen';
import '@/styles/buddy-battle.css';

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
  params: Promise<{ teamId: string }>;
}

export default async function InventoryPage({ params }: PageProps) {
  const { teamId } = await params;
  
  return (
    <Suspense fallback={<InventoryLoading />}>
      <InventoryScreen />
    </Suspense>
  );
}

// Metadata
export function generateMetadata() {
  return {
    title: 'Inventory | Buddy Battle',
    description: 'Manage your items and equipment!',
  };
}

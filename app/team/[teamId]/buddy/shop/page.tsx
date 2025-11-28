// =====================================================
// BUDDY BATTLE - Shop Page Route
// /team/[teamId]/buddy/shop
// =====================================================

import { Suspense } from 'react';
import { ShopScreen } from '@/components/buddy-battle/shop-screen';
import '@/styles/buddy-battle.css';

// Loading component
function ShopLoading() {
  return (
    <div className="buddy-battle-container flex items-center justify-center min-h-screen">
      <div className="scanlines" />
      <div className="retro-panel p-8">
        <div className="retro-loading mx-auto mb-4" />
        <p className="retro-text text-center">Loading shop...</p>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function ShopPage({ params }: PageProps) {
  const { teamId } = await params;
  
  return (
    <Suspense fallback={<ShopLoading />}>
      <ShopScreen />
    </Suspense>
  );
}

// Metadata
export function generateMetadata() {
  return {
    title: 'Buddy Shop | Buddy Battle',
    description: 'Purchase items, upgrades, and mystery boxes for your buddy!',
  };
}

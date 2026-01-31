// =====================================================
// BUDDY BATTLE - Shop Page Route
// /team/[slug]/buddy/shop
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
  params: Promise<{ slug: string }>;
}

export default async function ShopPage({ params }: PageProps) {
  const { slug } = await params;
  
  return (
    <Suspense fallback={<ShopLoading />}>
      <ShopScreen />
    </Suspense>
  );
}

// Metadata
export function generateMetadata() {
  return {
    title: 'AvPlanner Buddy | Shop',
    description: 'Purchase items, upgrades, and mystery boxes for your buddy!',
  };
}

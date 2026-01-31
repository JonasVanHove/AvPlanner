// =====================================================
// BUDDY BATTLE - Upgrade Page Route
// /team/[slug]/buddy/upgrade
// =====================================================

import { Suspense } from 'react';
import { UpgradeScreen } from '@/components/buddy-battle/upgrade-screen';
import '@/styles/buddy-battle.css';

// Loading component
function UpgradeLoading() {
  return (
    <div className="buddy-battle-container flex items-center justify-center min-h-screen">
      <div className="scanlines" />
      <div className="retro-panel p-8">
        <div className="retro-loading mx-auto mb-4" />
        <p className="retro-text text-center">Loading upgrades...</p>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function UpgradePage({ params }: PageProps) {
  const { slug } = await params;
  
  return (
    <Suspense fallback={<UpgradeLoading />}>
      <UpgradeScreen />
    </Suspense>
  );
}

// Metadata
export function generateMetadata() {
  return {
    title: 'AvPlanner Buddy | Upgrade Stats',
    description: 'Spend points to upgrade your buddy stats!',
  };
}

// =====================================================
// BUDDY BATTLE - Main Page Route
// /team/[teamId]/buddy
// =====================================================

import { Suspense } from 'react';
import { BuddyBattlePage } from '@/components/buddy-battle/buddy-battle-page';
import { BuddySetup } from '@/components/buddy-battle/buddy-setup';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import '@/styles/buddy-battle.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });
}

// Loading component
function BuddyLoading() {
  return (
    <div className="buddy-battle-container flex items-center justify-center min-h-screen">
      <div className="scanlines" />
      <div className="retro-panel p-8">
        <div className="retro-loading mx-auto mb-4" />
        <p className="retro-text text-center">Loading Buddy Battle...</p>
      </div>
    </div>
  );
}

// Check if user has a buddy
async function checkBuddy(teamId: string) {
  const supabase = await getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { hasBuddy: false, buddy: null };
  
  const { data: buddy } = await supabase
    .from('player_buddies')
    .select('*')
    .eq('user_id', user.id)
    .eq('team_id', teamId)
    .single();
  
  return { hasBuddy: !!buddy, buddy };
}

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function BuddyPage({ params }: PageProps) {
  const { teamId } = await params;
  const { hasBuddy, buddy } = await checkBuddy(teamId);
  
  return (
    <Suspense fallback={<BuddyLoading />}>
      {hasBuddy ? (
        <BuddyBattlePage />
      ) : (
        <BuddySetup teamId={teamId} onComplete={() => {}} />
      )}
    </Suspense>
  );
}

// Metadata
export async function generateMetadata({ params }: PageProps) {
  return {
    title: 'Buddy Battle | AvPlanner',
    description: 'Train your buddy, battle opponents, and become the ultimate availability master!',
  };
}

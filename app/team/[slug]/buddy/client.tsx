'use client';

// =====================================================
// BUDDY BATTLE - Client Component
// Handles buddy check and routing between setup/game
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BuddyBattlePage } from '@/components/buddy-battle/buddy-battle-page';
import { BuddySetup } from '@/components/buddy-battle/buddy-setup';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface BuddyPageClientProps {
  teamId?: string;      // The actual team UUID (optional, can be fetched client-side)
  teamSlug: string;    // The URL slug for navigation
}

export function BuddyPageClient({ teamId: initialTeamId, teamSlug }: BuddyPageClientProps) {
  const router = useRouter();
  const [teamId, setTeamId] = useState<string | undefined>(initialTeamId);
  const [user, setUser] = useState<User | null>(null);
  const [hasBuddy, setHasBuddy] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // 1. Resolve Team ID if missing
        let currentTeamId = initialTeamId;
        if (!currentTeamId) {
          console.log('[BuddyClient] Fetching team ID for slug:', teamSlug);
          // Try RPC first
          const { data: rpcData } = await supabase
            .rpc('get_team_public_info', { lookup_value: teamSlug })
            .maybeSingle();
            
          if (rpcData) {
            currentTeamId = rpcData.id;
          } else {
            // Fallback to direct query
            const { data: teamData } = await supabase
              .from('teams')
              .select('id')
              .or(`slug.eq.${teamSlug},invite_code.eq.${teamSlug}`)
              .maybeSingle();
              
            if (teamData) currentTeamId = teamData.id;
          }
          
          if (currentTeamId) {
            setTeamId(currentTeamId);
          } else {
            setError('Team niet gevonden');
            setLoading(false);
            return;
          }
        }

        // 2. Check User
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        if (!currentUser) {
          setHasBuddy(false);
          setLoading(false);
          return;
        }

        // 3. Check Member & Buddy
        // First, get the member ID for this user in this team
        const { data: member } = await supabase
          .from('members')
          .select('id')
          .eq('auth_user_id', currentUser.id)
          .eq('team_id', currentTeamId)
          .single();

        if (!member) {
          console.log('No member found for this user in this team');
          setHasBuddy(false);
          setLoading(false);
          return;
        }

        // Then check if this member has a buddy
        const { data: buddy } = await supabase
          .from('player_buddies')
          .select('id')
          .eq('member_id', member.id)
          .eq('team_id', currentTeamId)
          .single();

        setHasBuddy(!!buddy);
      } catch (error) {
        console.error('Error checking buddy:', error);
        setError('Er ging iets mis bij het laden');
        setHasBuddy(false);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [initialTeamId, teamSlug]);

  const handleSetupComplete = () => {
    setHasBuddy(true);
    // Refresh the page to load the game
    router.refresh();
  };

  const handleLogin = async () => {
    // Store current path for redirect after login
    const currentPath = window.location.pathname;
    localStorage.setItem('redirectAfterLogin', currentPath);
    router.push('/auth/login');
  };

  if (loading) {
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

  if (error) {
    return (
      <div className="buddy-battle-container flex items-center justify-center min-h-screen">
        <div className="scanlines" />
        <div className="retro-panel p-8 border-red-500">
          <div className="text-4xl mb-4 text-center">⚠️</div>
          <p className="retro-text text-center text-red-400">{error}</p>
          <button onClick={() => router.push('/')} className="retro-btn mt-4 w-full">
            Terug naar Home
          </button>
        </div>
      </div>
    );
  }

  // Not logged in - show login prompt
  if (!user) {
    return (
      <div className="buddy-battle-container flex items-center justify-center min-h-screen p-4">
        <div className="scanlines" />
        <div className="retro-panel p-8 max-w-md text-center">
          <div className="text-6xl mb-6">🎮</div>
          <h1 className="retro-title mb-4">Buddy Battle</h1>
          <p className="retro-text text-gb-light-green mb-6">
            Log in om je eigen Buddy te trainen, te vechten en beloningen te verdienen!
          </p>
          <div className="space-y-4">
            <button 
              onClick={handleLogin}
              className="retro-btn retro-btn-primary w-full"
            >
              🔐 Inloggen
            </button>
            <button 
              onClick={() => router.back()}
              className="retro-btn w-full"
            >
              ← Terug
            </button>
          </div>
          <p className="retro-text text-xs text-gb-dark-green mt-6">
            Nog geen account? Maak er een aan na het inloggen!
          </p>
        </div>
      </div>
    );
  }

  if (hasBuddy && teamId) {
    return <BuddyBattlePage teamId={teamId} teamSlug={teamSlug} />;
  }

  // Show setup with container
  if (teamId) {
    return (
      <div className="buddy-battle-container min-h-screen p-4">
        <div className="scanlines" />
        <BuddySetup teamId={teamId} onComplete={handleSetupComplete} />
      </div>
    );
  }
  
  return null;
}

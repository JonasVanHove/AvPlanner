'use client';

// =====================================================
// BUDDY BATTLE - Client Component
// Handles buddy check and routing between setup/game
// =====================================================

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BuddyBattlePage } from '@/components/buddy-battle/buddy-battle-page';
import { BuddySetup } from '@/components/buddy-battle/buddy-setup';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

const BUDDY_DIRECT_MODE_KEY = 'buddy_battle_direct_mode';

function isBuddyDirectModeEnabled(): boolean {
  try {
    return sessionStorage.getItem(BUDDY_DIRECT_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

function enableBuddyDirectMode() {
  try {
    sessionStorage.setItem(BUDDY_DIRECT_MODE_KEY, '1');
  } catch {
    // Ignore storage issues
  }
}

interface BuddyPageClientProps {
  teamId?: string;      // The actual team UUID (optional, can be fetched client-side)
  teamSlug: string;    // The URL slug for navigation
}

export function BuddyPageClient({ teamId: initialTeamId, teamSlug }: BuddyPageClientProps) {
  const router = useRouter();
  const initKeyRef = useRef<string | null>(null);
  const [teamId, setTeamId] = useState<string | undefined>(initialTeamId);
  const [user, setUser] = useState<User | null>(null);
  const [hasBuddy, setHasBuddy] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initKey = `${initialTeamId ?? ''}:${teamSlug}`;
    if (initKeyRef.current === initKey) {
      return;
    }

    initKeyRef.current = initKey;

    async function init() {
      try {
        // 1. Resolve Team ID if missing
        let currentTeamId = initialTeamId;
        if (!currentTeamId) {
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
            setError('Team not found');
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

        const runDirectLookup = async () => {
          const { data: memberRows, error: memberError } = await supabase
            .from('members')
            .select('id')
            .eq('team_id', currentTeamId)
            .eq('auth_user_id', currentUser.id)
            .limit(1);

          if (memberError) {
            console.error('[BuddyClient] Direct-mode members query failed:', memberError);
            setError('Something went wrong while loading');
            setHasBuddy(false);
            return;
          }

          const member = memberRows?.[0];
          if (!member) {
            setError('Join this team before using Buddy Battle.');
            setHasBuddy(false);
            return;
          }

          const { data: buddyRows, error: buddyError } = await supabase
            .from('player_buddies')
            .select('id')
            .eq('member_id', member.id)
            .eq('team_id', currentTeamId)
            .limit(1);

          if (buddyError) {
            console.error('[BuddyClient] Direct-mode buddy query failed:', buddyError);
            setError('Something went wrong while loading');
            setHasBuddy(false);
            return;
          }

          setHasBuddy(Boolean(buddyRows?.[0]));
        };

        if (isBuddyDirectModeEnabled()) {
          await runDirectLookup();
          return;
        }

        // 3. Use API endpoint as primary source of truth
        // Get session for the access token - try getSession first, then refresh if needed
        let accessToken: string | null = null;
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          accessToken = session.access_token;
        } else {
          // Session might be expired in localStorage, try refreshing
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData.session?.access_token) {
            accessToken = refreshData.session.access_token;
          }
        }
        
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const apiResponse = await fetch(`/api/buddy-battle/buddy?teamId=${currentTeamId}&summaryOnly=1`, {
          credentials: 'include',
          headers,
        });

        const apiData = await apiResponse.json();

        if (!apiResponse.ok) {
          const debugMessage = String(apiData?.debug_message || '');
          const debugDetails = String(apiData?.debug_details || '');
          const isFetchFailed =
            debugMessage.includes('fetch failed') || debugDetails.includes('fetch failed');

          if (!isFetchFailed) {
            console.warn('[BuddyClient] API error:', {
              status: apiResponse.status,
              error: apiData.error,
              debug_message: apiData.debug_message,
              debug_code: apiData.debug_code,
              debug_details: apiData.debug_details,
              debug_hint: apiData.debug_hint,
            });
          }

          // Fallback for Windows dev environments where Node server->Supabase fetch can fail.
          // Query from browser client directly so buddy page can still initialize.
          if (isFetchFailed && currentUser) {
            console.warn('[BuddyClient] Falling back to direct Supabase client lookup');
            enableBuddyDirectMode();
            await runDirectLookup();
            return;
          }
        }

        if (apiData.needsSetup) {
          setHasBuddy(false);
        } else if (apiData.membershipRequired) {
          setError(apiData.error || 'Join this team before using Buddy Battle.');
          setHasBuddy(false);
        } else if (apiData.buddy) {
          setHasBuddy(true);
        } else if (apiData.error) {
          setError(apiData.error);
          setHasBuddy(false);
        }
      } catch (error) {
        console.error('[BuddyClient] Fatal error during init:', error);
        setError('Something went wrong while loading');
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
    // Redirect to login page
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
      <div className="buddy-battle-container flex items-center justify-center min-h-screen p-4">
        <div className="scanlines" />
        <div className="retro-panel p-8 border-red-500 max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="retro-text text-center text-red-400 mb-6">{error}</p>
          <div className="space-y-4">
            <button 
              onClick={() => {
                setError(null);
                setLoading(true);
                setHasBuddy(null);
                window.location.reload();
              }}
              className="retro-btn retro-btn-primary w-full"
            >
              🔄 Reload
            </button>
            <button 
              onClick={() => router.back()}
              className="retro-btn w-full"
            >
              ← Back
            </button>
          </div>
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
            Log in to train your own Buddy, battle and earn rewards!
          </p>
          <div className="space-y-4">
            <button 
              onClick={handleLogin}
              className="retro-btn retro-btn-primary w-full"
            >
              🔐 Log In
            </button>
            <button 
              onClick={() => router.back()}
              className="retro-btn w-full"
            >
              ← Back
            </button>
          </div>
          <p className="retro-text text-xs text-gb-dark-green mt-6">
            No account yet? Create one after logging in!
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
      <div className="buddy-battle-container min-h-screen p-4 relative">
        <div className="scanlines" />
        {/* Back button in the corner */}
        <button
          onClick={() => router.back()}
          className="retro-btn absolute top-4 left-4 z-10"
          title="Back to previous page"
        >
          ← Back
        </button>
        <BuddySetup teamId={teamId} onComplete={handleSetupComplete} />
      </div>
    );
  }
  
  return null;
}

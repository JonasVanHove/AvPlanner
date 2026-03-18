'use client';

// =====================================================
// BUDDY BATTLE - Main Page Component
// Retro-styled buddy management interface
// =====================================================

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { supabase } from '@/lib/supabase';

// Import sub-components
import { BuddyDisplay } from './buddy-display';
import { TrainerCard } from './trainer-card';
import { StatsPanel } from './stats-panel';
import { QuestPanel } from './quest-panel';
import { MenuPanel } from './menu-panel';
import { BuddySetup } from './buddy-setup';
import { RetroButton } from './ui/retro-button';
import { RetroDialog } from './ui/retro-dialog';

import type { BuddyDashboard } from '@/lib/buddy-battle/types';
import { getAuthHeaders } from '@/lib/buddy-battle/client-auth';
import { getCurrentQuarter, isBossBattleAvailable } from '@/lib/buddy-battle/game-logic';

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

interface BuddyBattlePageProps {
  teamId?: string;    // Optional: passed from parent, otherwise uses URL param
  teamSlug?: string;  // Optional: for navigation
}

export function BuddyBattlePage({ teamId: propTeamId, teamSlug }: BuddyBattlePageProps = {}) {
  const params = useParams();
  const router = useRouter();
  // Use prop if provided, otherwise fall back to URL param (slug)
  const teamId = propTeamId || params?.slug as string;
  // For navigation URLs, prefer slug (from URL) over UUID
  const navSlug = teamSlug || params?.slug as string || teamId;
  
  const { sounds, isMuted, toggleMute, initAudio, isInitialized } = useRetroSounds();
  
  const [dashboard, setDashboard] = useState<BuddyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);

  const fetchDashboardFallback = async (resolvedTeamId: string, userId: string): Promise<BuddyDashboard | null> => {
    const { data: memberRows, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('team_id', resolvedTeamId)
      .eq('auth_user_id', userId)
      .limit(1);

    if (memberError) {
      throw new Error(`[members fallback] ${memberError.message}`);
    }

    const member = memberRows?.[0];
    if (!member) {
      return null;
    }

    const { data: buddyRows, error: buddyError } = await supabase
      .from('player_buddies')
      .select(`
        *,
        buddy_type:buddy_types(*),
        member:members(id, first_name, last_name, profile_image_url)
      `)
      .eq('member_id', member.id)
      .eq('team_id', resolvedTeamId)
      .limit(1);

    if (buddyError) {
      throw new Error(`[player_buddies fallback] ${buddyError.message}`);
    }

    const buddy = buddyRows?.[0] as BuddyDashboard['buddy'] | undefined;
    if (!buddy) {
      return {
        buddy: null as any,
        trainer: null as any,
        active_quests: [],
        recent_achievements: [],
        active_team_buffs: [],
        next_level_xp: 0,
        available_battles: {
          can_do_tutorial: true,
          can_do_boss: false,
          boss_attempts_used: 0,
          max_boss_attempts: 2,
        },
      };
    }

    const quarter = getCurrentQuarter();

    const [trainerResult, questsResult, buffsResult, bossResult] = await Promise.allSettled([
      supabase
        .from('buddy_trainer_profiles')
        .select('*')
        .eq('player_buddy_id', buddy.id)
        .limit(1),
      supabase
        .from('buddy_quest_progress')
        .select('*, quest:buddy_quests(*)')
        .eq('player_buddy_id', buddy.id),
      supabase
        .from('buddy_team_buffs')
        .select('*')
        .eq('team_id', resolvedTeamId)
        .gte('active_until', new Date().toISOString()),
      supabase
        .from('boss_battle_attempts')
        .select('id')
        .eq('player_buddy_id', buddy.id)
        .eq('quarter_year', quarter),
    ]);

    const trainer =
      trainerResult.status === 'fulfilled'
        ? (trainerResult.value.data?.[0] ?? null)
        : null;
    const activeQuests =
      questsResult.status === 'fulfilled'
        ? (questsResult.value.data ?? [])
        : [];
    const activeTeamBuffs =
      buffsResult.status === 'fulfilled'
        ? (buffsResult.value.data ?? [])
        : [];
    const bossAttemptsCount =
      bossResult.status === 'fulfilled'
        ? (bossResult.value.data?.length ?? 0)
        : 0;

    return {
      buddy,
      trainer,
      active_quests: activeQuests as any,
      recent_achievements: [],
      active_team_buffs: activeTeamBuffs as any,
      next_level_xp: buddy.level < 100 ? buddy.level * 10 + (buddy.level - 1) * 5 : 0,
      available_battles: {
        can_do_tutorial: !trainer?.tutorial_completed,
        can_do_boss: isBossBattleAvailable() && bossAttemptsCount < 2,
        boss_attempts_used: bossAttemptsCount,
        max_boss_attempts: 2,
      },
    };
  };

  const isFetchFailedResponse = (responseData: any) => {
    const message = String(responseData?.debug_message || '');
    const details = String(responseData?.debug_details || '');
    return message.includes('fetch failed') || details.includes('fetch failed');
  };
  
  // Fetch buddy data
  useEffect(() => {
    async function fetchData() {
      if (!teamId) return;
      
      try {
        if (isBuddyDirectModeEnabled()) {
          const { data: authData } = await supabase.auth.getUser();
          const currentUser = authData.user;

          if (!currentUser) {
            setError('Unauthorized');
            return;
          }

          const fallbackDashboard = await fetchDashboardFallback(teamId, currentUser.id);
          if (!fallbackDashboard) {
            setError('Join this team before using Buddy Battle.');
            return;
          }

          if (!fallbackDashboard.buddy) {
            setNeedsSetup(true);
            return;
          }

          setDashboard(fallbackDashboard);
          if (!fallbackDashboard.trainer?.tutorial_completed && fallbackDashboard.available_battles?.can_do_tutorial) {
            setShowTutorialPrompt(true);
          }
          return;
        }

        const headers = await getAuthHeaders();
        const response = await fetch(`/api/buddy-battle/buddy?teamId=${teamId}`, {
          credentials: 'include',
          headers,
        });
        const data = await response.json();

        if (!response.ok && isFetchFailedResponse(data)) {
          const { data: authData } = await supabase.auth.getUser();
          const currentUser = authData.user;

          if (!currentUser) {
            setError('Unauthorized');
            return;
          }

          console.warn('[BuddyBattlePage] API fetch failed, using direct Supabase fallback');
          enableBuddyDirectMode();
          const fallbackDashboard = await fetchDashboardFallback(teamId, currentUser.id);

          if (!fallbackDashboard) {
            setError('Join this team before using Buddy Battle.');
            return;
          }

          if (!fallbackDashboard.buddy) {
            setNeedsSetup(true);
            return;
          }

          setDashboard(fallbackDashboard);
          if (!fallbackDashboard.trainer?.tutorial_completed && fallbackDashboard.available_battles?.can_do_tutorial) {
            setShowTutorialPrompt(true);
          }
          return;
        }
        
        if (data.needsSetup) {
          setNeedsSetup(true);
        } else if (data.membershipRequired) {
          setError(data.error || 'Join this team before using Buddy Battle.');
        } else if (data.buddy) {
          setDashboard(data);
          
          // Check if should show tutorial prompt
          if (!data.trainer?.tutorial_completed && data.available_battles?.can_do_tutorial) {
            setShowTutorialPrompt(true);
          }
        } else if (!response.ok) {
          setError(data.error || 'Failed to load buddy data');
        }
      } catch (err) {
        setError('Failed to load buddy data');
        console.error('[BuddyBattlePage] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [teamId]);
  
  // Initialize audio on first user interaction
  const handleUserInteraction = () => {
    if (!isInitialized) {
      initAudio();
    }
  };
  
  // Handle buddy creation
  const handleBuddyCreated = async () => {
    setNeedsSetup(false);
    setLoading(true);
    
    try {
      if (isBuddyDirectModeEnabled()) {
        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData.user;

        if (!currentUser) {
          setError('Unauthorized');
          return;
        }

        const fallbackDashboard = await fetchDashboardFallback(teamId, currentUser.id);
        if (!fallbackDashboard) {
          setError('Join this team before using Buddy Battle.');
          return;
        }

        if (!fallbackDashboard.buddy) {
          setNeedsSetup(true);
          return;
        }

        setDashboard(fallbackDashboard);
        if (!fallbackDashboard.trainer?.tutorial_completed && fallbackDashboard.available_battles?.can_do_tutorial) {
          setShowTutorialPrompt(true);
        }
        return;
      }

      // Refetch data with auth headers
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/buddy-battle/buddy?teamId=${teamId}`, {
        credentials: 'include',
        headers,
      });
      const data = await response.json();

      if (!response.ok && isFetchFailedResponse(data)) {
        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData.user;

        if (!currentUser) {
          setError('Unauthorized');
          return;
        }

        console.warn('[BuddyBattlePage] API fetch failed after creation, using direct Supabase fallback');
        enableBuddyDirectMode();
        const fallbackDashboard = await fetchDashboardFallback(teamId, currentUser.id);

        if (!fallbackDashboard) {
          setError('Join this team before using Buddy Battle.');
          return;
        }

        if (!fallbackDashboard.buddy) {
          setNeedsSetup(true);
          return;
        }

        setDashboard(fallbackDashboard);
        if (!fallbackDashboard.trainer?.tutorial_completed && fallbackDashboard.available_battles?.can_do_tutorial) {
          setShowTutorialPrompt(true);
        }
        return;
      }
      
      if (data.membershipRequired) {
        setError(data.error || 'Join this team before using Buddy Battle.');
      } else if (data.buddy) {
        setDashboard(data);
        sounds.achievement();
        
        // Show tutorial prompt for new buddy only if tutorial not yet completed
        if (!data.trainer?.tutorial_completed && data.available_battles?.can_do_tutorial) {
          setShowTutorialPrompt(true);
        }
      } else {
        setError('Failed to load buddy after creation');
      }
    } catch (err) {
      console.error('[BuddyBattlePage] Failed to refetch after buddy creation:', err);
      setError('Failed to load buddy');
    } finally {
      setLoading(false);
    }
  };
  
  // Navigate to battle
  const handleStartTutorial = () => {
    sounds.confirm();
    router.push(`/team/${navSlug}/buddy/battle?type=tutorial`);
  };
  
  const handleDismissTutorial = () => {
    sounds.cancel();
    setShowTutorialPrompt(false);
  };
  
  if (loading) {
    return (
      <div className="buddy-battle-container flex items-center justify-center min-h-screen" onClick={handleUserInteraction}>
        <div className="retro-panel p-8">
          <div className="retro-loading mx-auto mb-4" />
          <p className="retro-text text-center">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (needsSetup) {
    return (
      <div className="buddy-battle-container min-h-screen p-4" onClick={handleUserInteraction}>
        <BuddySetup teamId={teamId} onComplete={handleBuddyCreated} />
      </div>
    );
  }
  
  if (error || !dashboard) {
    return (
      <div className="buddy-battle-container flex items-center justify-center min-h-screen" onClick={handleUserInteraction}>
        <div className="retro-panel p-8">
          <p className="retro-text text-center text-red-400">{error || 'Failed to load'}</p>
          <RetroButton onClick={() => window.location.reload()} className="mt-4">
            Retry
          </RetroButton>
        </div>
      </div>
    );
  }
  
  const { buddy, trainer, active_quests, active_team_buffs, available_battles } = dashboard;
  
  return (
    <div className="buddy-battle-container min-h-screen p-4" onClick={handleUserInteraction}>
      {/* Scanlines overlay */}
      <div className="scanlines" />
      
      {/* Sound toggle */}
      <button 
        className={`sound-toggle ${isMuted ? 'muted' : ''}`}
        onClick={() => { sounds.select(); toggleMute(); }}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      
      {/* Header */}
      <header className="mb-6">
        <h1 className="retro-title text-center mb-2">BUDDY BATTLE</h1>
        <p className="retro-text text-center text-gb-light-green">
          Team Training Arena
        </p>
      </header>
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {/* Left column: Buddy display */}
        <div className="lg:col-span-1">
          <BuddyDisplay 
            buddy={buddy} 
            onUpgrade={() => {
              sounds.select();
              router.push(`/team/${navSlug}/buddy/upgrade`);
            }}
          />
          
          {/* Points display */}
          <div className="retro-panel mt-4">
            <div className="flex justify-between items-center">
              <span className="retro-text">Points:</span>
              <span className="retro-text-lg text-retro-yellow">
                {buddy.available_points} 🪙
              </span>
            </div>
            {(dashboard.buddy.points_awarded_today ?? 0) > 0 && (
              <p className="retro-text text-xs text-retro-lime mt-2">
                +{dashboard.buddy.points_awarded_today} earned today!
              </p>
            )}
          </div>
        </div>
        
        {/* Center column: Trainer card & Menu */}
        <div className="lg:col-span-1">
          <TrainerCard 
            buddy={buddy} 
            trainer={trainer} 
            teamBuffs={active_team_buffs}
          />
          
          <MenuPanel 
            teamId={navSlug}
            canDoTutorial={available_battles?.can_do_tutorial}
            canDoBoss={available_battles?.can_do_boss}
            bossAttempts={available_battles?.boss_attempts_used || 0}
            maxBossAttempts={available_battles?.max_boss_attempts || 2}
            currentHp={buddy.current_hp}
            maxHp={buddy.max_hp}
          />
        </div>
        
        {/* Right column: Stats & Quests */}
        <div className="lg:col-span-1">
          <StatsPanel buddy={buddy} />
          
          <div className="mt-4">
            <QuestPanel quests={active_quests} buddyId={buddy.id} teamId={teamId} />
          </div>
        </div>
      </div>
      
      {/* Tutorial prompt dialog */}
      {showTutorialPrompt && (
        <RetroDialog
          title="Welcome, Trainer!"
          onClose={handleDismissTutorial}
        >
          <p className="retro-text mb-4">
            Your buddy is ready for training!
          </p>
          <p className="retro-text mb-4">
            Would you like to start the tutorial battle against Nick Eetah?
          </p>
          <div className="flex gap-4 justify-center">
            <RetroButton variant="primary" onClick={handleStartTutorial}>
              Start Tutorial
            </RetroButton>
            <RetroButton onClick={handleDismissTutorial}>
              Later
            </RetroButton>
          </div>
        </RetroDialog>
      )}
    </div>
  );
}

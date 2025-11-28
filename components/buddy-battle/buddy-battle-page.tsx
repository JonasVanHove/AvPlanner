'use client';

// =====================================================
// BUDDY BATTLE - Main Page Component
// Retro-styled buddy management interface
// =====================================================

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { supabase } from '@/lib/supabase';
import '@/styles/buddy-battle.css';

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

// Helper function to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }
  return {
    'Content-Type': 'application/json',
  };
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
  
  const { sounds, isMuted, toggleMute, initAudio, isInitialized } = useRetroSounds();
  
  const [dashboard, setDashboard] = useState<BuddyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);
  
  // Fetch buddy data
  useEffect(() => {
    async function fetchData() {
      if (!teamId) return;
      
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/buddy-battle/buddy?teamId=${teamId}`, {
          credentials: 'include',
          headers,
        });
        const data = await response.json();
        
        if (data.needsSetup) {
          setNeedsSetup(true);
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
        console.error(err);
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
    
    // Refetch data
    const response = await fetch(`/api/buddy-battle/buddy?teamId=${teamId}`, {
      credentials: 'include',
    });
    const data = await response.json();
    setDashboard(data);
    setLoading(false);
    
    sounds.achievement();
    setShowTutorialPrompt(true);
  };
  
  // Navigate to battle
  const handleStartTutorial = () => {
    sounds.confirm();
    router.push(`/team/${teamId}/buddy/battle?type=tutorial`);
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
              router.push(`/team/${teamId}/buddy/upgrade`);
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
            teamId={teamId}
            canDoTutorial={available_battles?.can_do_tutorial}
            canDoBoss={available_battles?.can_do_boss}
            bossAttempts={available_battles?.boss_attempts_used || 0}
            maxBossAttempts={available_battles?.max_boss_attempts || 2}
          />
        </div>
        
        {/* Right column: Stats & Quests */}
        <div className="lg:col-span-1">
          <StatsPanel buddy={buddy} />
          
          <div className="mt-4">
            <QuestPanel quests={active_quests} buddyId={buddy.id} />
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
            Would you like to start the tutorial battle against Nikita?
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

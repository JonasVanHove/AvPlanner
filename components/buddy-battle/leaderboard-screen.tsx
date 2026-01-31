'use client';

// =====================================================
// BUDDY BATTLE - Leaderboard Component
// Rankings for trainers in the team
// =====================================================

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { supabase } from '@/lib/supabase';
import '@/styles/buddy-battle.css';

import { RetroButton, RetroTabs, RetroProgress, RetroBadge } from './ui/retro-button';
import { ELEMENT_COLORS } from '@/lib/buddy-battle/types';
import type { LeaderboardEntry, BuddyElement } from '@/lib/buddy-battle/types';

// Helper to get auth headers for API calls
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

type LeaderboardCategory = 'level' | 'battles' | 'bosses' | 'streak' | 'points';

interface LeaderboardData {
  rankings: LeaderboardEntry[];
  player_rank: number;
  total_players: number;
}

export function LeaderboardScreen() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.slug as string;
  
  const { sounds, initAudio, isInitialized } = useRetroSounds();
  
  const [category, setCategory] = useState<LeaderboardCategory>('level');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch leaderboard
  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/buddy-battle/leaderboard?category=${category}&teamId=${teamId}`, { 
          headers,
          credentials: 'include' 
        });
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLeaderboard();
  }, [category, teamId]);
  
  // Handle category change
  const handleCategoryChange = (newCategory: string) => {
    sounds.select();
    setCategory(newCategory as LeaderboardCategory);
  };
  
  // Get position medal
  const getPositionDisplay = (position: number) => {
    switch (position) {
      case 1: return <span className="text-2xl">🥇</span>;
      case 2: return <span className="text-2xl">🥈</span>;
      case 3: return <span className="text-2xl">🥉</span>;
      default: return <span className="retro-text">{position}</span>;
    }
  };
  
  // Get value label based on category
  const getValueLabel = (entry: LeaderboardEntry) => {
    switch (category) {
      case 'level': return `Lv. ${entry.value}`;
      case 'battles': return `${entry.value} wins`;
      case 'bosses': return `${entry.value} defeated`;
      case 'streak': return `${entry.value} days`;
      case 'points': return `${entry.value} pts`;
      default: return entry.value.toString();
    }
  };
  
  // Initialize audio
  const handleInteraction = () => {
    if (!isInitialized) initAudio();
  };
  
  return (
    <div 
      className="buddy-battle-container min-h-screen p-4"
      onClick={handleInteraction}
    >
      <div className="scanlines" />
      
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="retro-title">Leaderboard</h1>
          <p className="retro-text text-xs text-retro-gray">
            Top trainers in your team
          </p>
        </div>
        
        {/* Back button */}
        <RetroButton 
          onClick={() => router.push(`/team/${teamId}/buddy`)}
          variant="default"
          size="small"
          className="mb-4"
        >
          ← Back
        </RetroButton>
        
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'level', label: '⭐ Level', emoji: '⭐' },
            { id: 'battles', label: '⚔️ Battles', emoji: '⚔️' },
            { id: 'bosses', label: '👹 Bosses', emoji: '👹' },
            { id: 'streak', label: '🔥 Streak', emoji: '🔥' },
            { id: 'points', label: '✨ Points', emoji: '✨' },
          ].map(cat => (
            <button
              key={cat.id}
              className={`retro-btn text-xs px-3 py-2 ${
                category === cat.id 
                  ? 'bg-gb-light-green text-gb-dark' 
                  : ''
              }`}
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        
        {/* Player's rank summary */}
        {data && (
          <div className="retro-panel mb-4 p-3">
            <div className="flex justify-between items-center">
              <p className="retro-text text-xs">Your Rank</p>
              <p className="retro-text-lg text-retro-lime">
                #{data.player_rank} of {data.total_players}
              </p>
            </div>
          </div>
        )}
        
        {/* Rankings list */}
        {loading ? (
          <div className="retro-panel p-8 text-center">
            <div className="retro-loading mx-auto mb-4" />
            <p className="retro-text">Loading rankings...</p>
          </div>
        ) : !data?.rankings || data.rankings.length === 0 ? (
          <div className="retro-panel p-8 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <p className="retro-text text-gb-light-green mb-2">
              Nog geen rankings!
            </p>
            <p className="retro-text text-xs text-gb-dark-green">
              Wees de eerste om een buddy te maken en te battlen.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.rankings.map((entry, index) => (
              <div 
                key={entry.user_id}
                className={`retro-panel p-3 ${
                  entry.is_current_player 
                    ? 'border-retro-lime border-2' 
                    : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Position */}
                  <div className="w-10 text-center">
                    {getPositionDisplay(entry.rank)}
                  </div>
                  
                  {/* Buddy sprite mini */}
                  <div 
                    className="w-10 h-10 rounded flex items-center justify-center"
                    style={{
                      backgroundColor: entry.buddy_element 
                        ? ELEMENT_COLORS[entry.buddy_element] 
                        : '#4a5568',
                    }}
                  >
                    <span className="text-xl">
                      {entry.buddy_element === 'fire' && '🔥'}
                      {entry.buddy_element === 'water' && '💧'}
                      {entry.buddy_element === 'earth' && '🌍'}
                      {entry.buddy_element === 'air' && '💨'}
                      {entry.buddy_element === 'electric' && '⚡'}
                      {!entry.buddy_element && '👤'}
                    </span>
                  </div>
                  
                  {/* Player info */}
                  <div className="flex-1">
                    <p className="retro-text text-sm">
                      {entry.member_name}
                      {entry.is_current_player && (
                        <span className="text-retro-lime ml-2">(You)</span>
                      )}
                    </p>
                    <p className="retro-text text-xs text-retro-gray">
                      {entry.buddy_nickname || entry.buddy_type_name}
                    </p>
                  </div>
                  
                  {/* Value */}
                  <div className="text-right">
                    <p className="retro-text-lg text-retro-yellow">
                      {getValueLabel(entry)}
                    </p>
                  </div>
                </div>
                
                {/* Show level bar for level category */}
                {category === 'level' && entry.xp_progress && (
                  <div className="mt-2 ml-[52px]">
                    <RetroProgress 
                      value={entry.xp_progress.current}
                      max={entry.xp_progress.required}
                      label=""
                      variant="xp"
                    />
                  </div>
                )}
              </div>
            ))}
            
            {(!data?.rankings || data.rankings.length === 0) && (
              <div className="retro-panel p-8 text-center">
                <p className="text-4xl mb-4">🏆</p>
                <p className="retro-text text-retro-gray">
                  No rankings yet. Be the first to climb!
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Seasonal info */}
        <div className="retro-panel mt-6 p-4 text-center">
          <p className="retro-text text-xs text-retro-gray mb-2">
            🏆 Seasonal Championship
          </p>
          <p className="retro-text text-sm">
            Top 3 trainers at the end of each quarter earn exclusive rewards!
          </p>
          <div className="flex justify-center gap-4 mt-3">
            <div>
              <span className="text-xl">🥇</span>
              <p className="retro-text text-xs text-retro-yellow">500 pts + Title</p>
            </div>
            <div>
              <span className="text-xl">🥈</span>
              <p className="retro-text text-xs text-retro-gray">300 pts</p>
            </div>
            <div>
              <span className="text-xl">🥉</span>
              <p className="retro-text text-xs text-retro-gray">150 pts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

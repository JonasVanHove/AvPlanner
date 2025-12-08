'use client';

// =====================================================
// BUDDY BATTLE - Achievements Screen Component
// Display all achievements and player progress
// =====================================================

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { supabase } from '@/lib/supabase';
import '@/styles/buddy-battle.css';

import { RetroButton, RetroTabs, RetroProgress, RetroBadge, RetroCard } from './ui/retro-button';

// Helper to get auth headers for API calls
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  achievement_type: string;
  requirement_value: number;
  reward_title: string;
  is_earned: boolean;
  earned_at: string | null;
}

interface AchievementsData {
  achievements: Achievement[];
  grouped: {
    battle: Achievement[];
    level: Achievement[];
    streak: Achievement[];
    collector: Achievement[];
    team: Achievement[];
    special: Achievement[];
  };
  total: number;
  earned: number;
}

export function AchievementsScreen() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.slug as string;
  
  const { sounds, initAudio, isInitialized } = useRetroSounds();
  
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  // Fetch achievements
  useEffect(() => {
    async function fetchAchievements() {
      if (!teamId) return;
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/buddy-battle/achievements?teamId=${teamId}`, { 
          headers,
          credentials: 'include' 
        });
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAchievements();
  }, [teamId]);
  
  // Get achievement icon
  const getAchievementIcon = (type: string, isEarned: boolean) => {
    if (!isEarned) return '🔒';
    
    switch (type) {
      case 'first_battle': return '⚔️';
      case 'boss_slayer': return '👹';
      case 'level_milestone': return '⭐';
      case 'win_streak': return '🔥';
      case 'collector': return '📦';
      case 'team_player': return '👥';
      case 'perfect_attendance': return '📅';
      case 'legend': return '👑';
      default: return '🏆';
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  
  // Get filtered achievements
  const getFilteredAchievements = () => {
    if (!data) return [];
    
    switch (activeTab) {
      case 'battle':
        return data.grouped.battle;
      case 'level':
        return data.grouped.level;
      case 'streak':
        return data.grouped.streak;
      case 'collector':
        return data.grouped.collector;
      case 'team':
        return data.grouped.team;
      case 'special':
        return data.grouped.special;
      case 'earned':
        return data.achievements.filter(a => a.is_earned);
      default:
        return data.achievements;
    }
  };
  
  // Initialize audio
  const handleInteraction = () => {
    if (!isInitialized) initAudio();
  };
  
  if (loading) {
    return (
      <div 
        className="buddy-battle-container flex items-center justify-center min-h-screen"
        onClick={handleInteraction}
      >
        <div className="retro-panel p-8">
          <div className="retro-loading mx-auto mb-4" />
          <p className="retro-text text-center">Loading achievements...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="buddy-battle-container min-h-screen p-4"
      onClick={handleInteraction}
    >
      <div className="scanlines" />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="retro-title">Achievements</h1>
          <p className="retro-text text-xs text-retro-gray">
            {data?.earned || 0} / {data?.total || 0} unlocked
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
        
        {/* Progress bar */}
        <div className="retro-panel mb-4 p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="retro-text text-xs">Overall Progress</p>
            <p className="retro-text text-xs text-retro-lime">
              {data ? Math.round((data.earned / data.total) * 100) : 0}%
            </p>
          </div>
          <RetroProgress 
            value={data?.earned || 0}
            max={data?.total || 1}
            label=""
            variant="xp"
          />
        </div>
        
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'all', label: 'All' },
            { id: 'earned', label: '✓ Earned' },
            { id: 'battle', label: '⚔️ Battle' },
            { id: 'level', label: '⭐ Level' },
            { id: 'streak', label: '🔥 Streak' },
            { id: 'special', label: '👑 Special' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`retro-btn text-xs px-3 py-2 ${
                activeTab === tab.id 
                  ? 'bg-gb-light-green text-gb-dark' 
                  : ''
              }`}
              onClick={() => {
                sounds.select();
                setActiveTab(tab.id);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Achievements grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {getFilteredAchievements().map(achievement => (
            <div 
              key={achievement.id}
              className={`retro-panel p-4 ${
                achievement.is_earned 
                  ? 'border-retro-lime border-2' 
                  : 'opacity-70'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div 
                  className={`w-14 h-14 rounded-lg flex items-center justify-center text-3xl ${
                    achievement.is_earned 
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' 
                      : 'bg-gray-600'
                  }`}
                >
                  {getAchievementIcon(achievement.achievement_type, achievement.is_earned)}
                </div>
                
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`retro-text ${
                      achievement.is_earned ? 'text-retro-lime' : ''
                    }`}>
                      {achievement.name}
                    </p>
                    {achievement.is_earned && (
                      <span className="text-xs">✓</span>
                    )}
                  </div>
                  
                  <p className="retro-text text-xs text-retro-gray mb-2">
                    {achievement.description}
                  </p>
                  
                  {achievement.reward_title && (
                    <RetroBadge variant={achievement.is_earned ? 'legendary' : 'common'}>
                      Title: {achievement.reward_title}
                    </RetroBadge>
                  )}
                  
                  {achievement.is_earned && achievement.earned_at && (
                    <p className="retro-text text-xxs text-retro-gray mt-2">
                      Earned: {formatDate(achievement.earned_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {getFilteredAchievements().length === 0 && (
          <div className="retro-panel p-8 text-center">
            <p className="text-4xl mb-4">🏆</p>
            <p className="retro-text text-retro-gray">
              No achievements in this category yet
            </p>
          </div>
        )}
        
        {/* Info panel */}
        <div className="retro-panel mt-6 p-4 text-center">
          <p className="retro-text text-xs text-retro-gray">
            💡 Achievements unlock special titles for your trainer card!
          </p>
        </div>
      </div>
    </div>
  );
}

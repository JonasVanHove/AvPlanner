'use client';

// =====================================================
// BUDDY BATTLE - Quest Panel Component
// Daily and weekly quest tracking
// =====================================================

import React, { useState } from 'react';
import type { QuestProgress } from '@/lib/buddy-battle/types';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { supabase } from '@/lib/supabase';

// Helper to get auth headers for API calls
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

interface QuestPanelProps {
  quests: QuestProgress[];
  buddyId: string;
  teamId: string;
  onQuestClaimed?: () => void;
}

export function QuestPanel({ quests, buddyId, teamId, onQuestClaimed }: QuestPanelProps) {
  const { sounds } = useRetroSounds();
  const [claiming, setClaiming] = useState<string | null>(null);
  
  const dailyQuests = quests.filter(q => q.quest?.quest_type === 'daily');
  const weeklyQuests = quests.filter(q => q.quest?.quest_type === 'weekly');
  
  const handleClaim = async (questProgressId: string) => {
    setClaiming(questProgressId);
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/buddy-battle/quests?teamId=${teamId}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ action: 'claim', questId: questProgressId }),
      });
      
      if (response.ok) {
        sounds.achievement();
        onQuestClaimed?.();
      } else {
        sounds.error();
      }
    } catch (error) {
      sounds.error();
      console.error('Failed to claim quest:', error);
    } finally {
      setClaiming(null);
    }
  };
  
  return (
    <div className="retro-panel">
      <h3 className="retro-text-lg mb-3 text-retro-lime">Quests</h3>
      
      {/* Daily Quests */}
      {dailyQuests.length > 0 && (
        <div className="mb-4">
          <p className="retro-text text-xs text-retro-yellow mb-2">📅 Daily</p>
          <div className="space-y-2">
            {dailyQuests.map(quest => (
              <QuestItem 
                key={quest.id} 
                quest={quest} 
                onClaim={() => handleClaim(quest.id)}
                claiming={claiming === quest.id}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Weekly Quests */}
      {weeklyQuests.length > 0 && (
        <div>
          <p className="retro-text text-xs text-retro-yellow mb-2">📆 Weekly</p>
          <div className="space-y-2">
            {weeklyQuests.map(quest => (
              <QuestItem 
                key={quest.id} 
                quest={quest} 
                onClaim={() => handleClaim(quest.id)}
                claiming={claiming === quest.id}
              />
            ))}
          </div>
        </div>
      )}
      
      {quests.length === 0 && (
        <p className="retro-text text-xs text-center text-gb-dark-green py-4">
          No active quests.<br />Check back tomorrow!
        </p>
      )}
    </div>
  );
}

function QuestItem({ 
  quest, 
  onClaim, 
  claiming 
}: { 
  quest: QuestProgress; 
  onClaim: () => void;
  claiming: boolean;
}) {
  const q = quest.quest;
  if (!q) return null;
  
  const progress = Math.min(quest.current_progress, q.requirement_value);
  const percentage = (progress / q.requirement_value) * 100;
  const canClaim = quest.is_completed && !quest.is_claimed;
  
  return (
    <div className={`quest-item ${quest.is_completed ? 'quest-completed' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="retro-text text-xs mb-1">{q.name}</p>
          <p className="retro-text text-xs text-gb-dark-green">
            {progress}/{q.requirement_value}
          </p>
        </div>
        
        <div className="text-right">
          {q.reward_points > 0 && (
            <span className="retro-text text-xs text-retro-yellow">
              +{q.reward_points} 🪙
            </span>
          )}
          {q.reward_xp > 0 && (
            <span className="retro-text text-xs text-retro-cyan ml-2">
              +{q.reward_xp} XP
            </span>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="quest-progress-bar">
        <div 
          className="quest-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Claim button */}
      {canClaim && (
        <button 
          className="retro-btn retro-btn-primary w-full mt-2 text-xs"
          onClick={onClaim}
          disabled={claiming}
        >
          {claiming ? 'Claiming...' : 'Claim Reward'}
        </button>
      )}
    </div>
  );
}

'use client';

// =====================================================
// BUDDY BATTLE - Trainer Card Component
// Retro pixel-style trainer profile card
// =====================================================

import React from 'react';
import type { PlayerBuddyWithDetails, TrainerProfile, TeamBuff } from '@/lib/buddy-battle/types';
import { getTrainerTitle } from '@/lib/buddy-battle/game-logic';

interface TrainerCardProps {
  buddy: PlayerBuddyWithDetails;
  trainer: TrainerProfile | null;
  teamBuffs?: TeamBuff[];
}

export function TrainerCard({ buddy, trainer, teamBuffs = [] }: TrainerCardProps) {
  const trainerLevel = trainer?.trainer_level || 1;
  const trainerXP = trainer?.trainer_xp || 0;
  const xpForNextLevel = trainerLevel * 15 + (trainerLevel - 1) * 10;
  const title = trainer?.trainer_title || getTrainerTitle(trainerLevel);
  
  return (
    <div className="trainer-card">
      {/* Card header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="retro-text-lg">{buddy.member?.first_name}</h2>
          <p className="retro-text text-xs text-retro-yellow">{title}</p>
        </div>
        <div className="text-right">
          <p className="retro-text text-xs">Trainer Lv.</p>
          <p className="retro-text-xl text-retro-lime">{trainerLevel}</p>
        </div>
      </div>
      
      {/* Trainer avatar */}
      <div className="flex gap-4 mb-4">
        <div className="trainer-avatar bg-gb-dark flex items-center justify-center">
          <TrainerAvatar color={trainer?.avatar_color || '#4CAF50'} />
        </div>
        
        <div className="flex-1">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatMini label="Battles" value={trainer?.total_battles || 0} />
            <StatMini label="Won" value={trainer?.battles_won || 0} />
            <StatMini label="Streak" value={trainer?.current_login_streak || 0} />
            <StatMini label="Bosses" value={trainer?.bosses_defeated || 0} />
          </div>
        </div>
      </div>
      
      {/* XP Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="retro-text text-xs">Trainer XP</span>
          <span className="retro-text text-xs">{trainerXP}/{xpForNextLevel}</span>
        </div>
        <div className="xp-bar-container">
          <div 
            className="xp-bar"
            style={{ width: `${Math.min(100, (trainerXP / xpForNextLevel) * 100)}%` }}
          />
        </div>
      </div>
      
      {/* Active team buffs */}
      {teamBuffs.length > 0 && (
        <div className="border-t-2 border-gb-dark-green pt-3">
          <p className="retro-text text-xs mb-2 text-retro-lime">Active Team Buffs:</p>
          <div className="flex flex-wrap gap-2">
            {teamBuffs.map(buff => (
              <span 
                key={buff.id}
                className="retro-text text-xs px-2 py-1 bg-retro-purple border border-retro-pink"
              >
                {getBuffLabel(buff.buff_type)} +{buff.buff_value}%
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Achievements preview */}
      <div className="border-t-2 border-gb-dark-green pt-3 mt-3">
        <p className="retro-text text-xs mb-2">Achievements:</p>
        <div className="flex gap-2">
          {trainer?.tutorial_completed && (
            <div className="badge-icon" title="Tutorial Completed">
              ⚔️
            </div>
          )}
          {(trainer?.bosses_defeated || 0) > 0 && (
            <div className="badge-icon" title="Boss Slayer">
              👑
            </div>
          )}
          {(trainer?.current_login_streak || 0) >= 7 && (
            <div className="badge-icon" title="Week Streak">
              🔥
            </div>
          )}
          {(trainer?.battles_won || 0) >= 10 && (
            <div className="badge-icon" title="Battle Veteran">
              🏆
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gb-dark p-2 border border-gb-dark-green">
      <p className="retro-text text-xs text-gb-light-green">{label}</p>
      <p className="retro-text">{value}</p>
    </div>
  );
}

function TrainerAvatar({ color }: { color: string }) {
  return (
    <svg 
      viewBox="0 0 16 16" 
      className="w-full h-full"
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Hair */}
      <rect x="3" y="1" width="10" height="4" fill={color} />
      {/* Face */}
      <rect x="4" y="3" width="8" height="6" fill="#ffd5b5" />
      {/* Eyes */}
      <rect x="5" y="5" width="2" height="2" fill="#000" />
      <rect x="9" y="5" width="2" height="2" fill="#000" />
      {/* Body */}
      <rect x="3" y="9" width="10" height="6" fill={color} />
      {/* Collar detail */}
      <rect x="6" y="9" width="4" height="2" fill="#fff" />
    </svg>
  );
}

function getBuffLabel(buffType: string): string {
  const labels: Record<string, string> = {
    xp_boost: 'XP',
    point_boost: 'Points',
    shop_discount: 'Shop',
    crit_boost: 'Crit',
  };
  return labels[buffType] || buffType;
}

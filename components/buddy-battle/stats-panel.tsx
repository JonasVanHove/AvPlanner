'use client';

// =====================================================
// BUDDY BATTLE - Stats Panel Component
// Display buddy stats with upgrade potential
// =====================================================

import React from 'react';
import type { PlayerBuddyWithDetails, StatType } from '@/lib/buddy-battle/types';
import { getStatCap } from '@/lib/buddy-battle/game-logic';

interface StatsPanelProps {
  buddy: PlayerBuddyWithDetails;
  showCaps?: boolean;
}

export function StatsPanel({ buddy, showCaps = true }: StatsPanelProps) {
  const stats: { type: StatType; label: string; value: number; icon: string }[] = [
    { type: 'hp', label: 'HP', value: buddy.max_hp, icon: '❤️' },
    { type: 'attack', label: 'ATK', value: buddy.attack, icon: '⚔️' },
    { type: 'defense', label: 'DEF', value: buddy.defense, icon: '🛡️' },
    { type: 'speed', label: 'SPD', value: buddy.speed, icon: '💨' },
    { type: 'special_attack', label: 'SP.ATK', value: buddy.special_attack, icon: '✨' },
    { type: 'special_defense', label: 'SP.DEF', value: buddy.special_defense, icon: '🔮' },
    { type: 'critical_chance', label: 'CRIT', value: buddy.critical_chance, icon: '🎯' },
  ];
  
  return (
    <div className="retro-panel">
      <h3 className="retro-text-lg mb-3 text-retro-lime">Stats</h3>
      
      <div className="space-y-2">
        {stats.map(stat => {
          const cap = getStatCap(buddy.level, stat.type);
          const percentage = (stat.value / cap) * 100;
          const isMaxed = stat.value >= cap;
          
          return (
            <div key={stat.type} className="stat-item">
              <div className="flex items-center gap-2">
                <span className="text-lg">{stat.icon}</span>
                <span className="retro-text text-xs w-16">{stat.label}</span>
              </div>
              
              <div className="flex-1 mx-3">
                <div className="h-2 bg-gb-dark border border-gb-dark-green">
                  <div 
                    className={`h-full transition-all ${isMaxed ? 'bg-retro-yellow' : 'bg-retro-green'}`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
              </div>
              
              <div className="text-right min-w-[60px]">
                <span className={`retro-text text-xs ${isMaxed ? 'text-retro-yellow' : ''}`}>
                  {stat.type === 'critical_chance' ? `${stat.value}%` : stat.value}
                </span>
                {showCaps && (
                  <span className="retro-text text-xs text-gb-dark-green">
                    /{stat.type === 'critical_chance' ? `${cap}%` : cap}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Total stats */}
      <div className="border-t-2 border-gb-dark-green mt-3 pt-3">
        <div className="flex justify-between items-center">
          <span className="retro-text text-xs">Total Stats:</span>
          <span className="retro-text text-retro-yellow">
            {buddy.max_hp + buddy.attack + buddy.defense + buddy.speed + buddy.special_attack + buddy.special_defense}
          </span>
        </div>
      </div>
    </div>
  );
}

// Compact version for battle screen
export function StatsCompact({ buddy }: { buddy: PlayerBuddyWithDetails }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatBox label="ATK" value={buddy.attack} />
      <StatBox label="DEF" value={buddy.defense} />
      <StatBox label="SPD" value={buddy.speed} />
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gb-dark border border-gb-dark-green p-1 text-center">
      <p className="retro-text text-xs text-gb-light-green">{label}</p>
      <p className="retro-text">{value}</p>
    </div>
  );
}

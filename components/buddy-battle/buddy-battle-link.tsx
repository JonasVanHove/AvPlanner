'use client';

// =====================================================
// BUDDY BATTLE - Team Link Component
// Shows buddy status and links to buddy battle
// =====================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '@/styles/buddy-battle.css';

interface BuddyPreview {
  has_buddy: boolean;
  buddy_name?: string;
  element?: string;
  level?: number;
  available_points?: number;
  has_unclaimed_quests?: boolean;
  streak_days?: number;
}

interface BuddyBattleLinkProps {
  teamId: string;
  compact?: boolean;
}

export function BuddyBattleLink({ teamId, compact = false }: BuddyBattleLinkProps) {
  const [preview, setPreview] = useState<BuddyPreview | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchPreview() {
      try {
        const response = await fetch(`/api/buddy-battle/buddy?teamId=${teamId}&preview=true`, { credentials: 'include' });
        const data = await response.json();
        setPreview(data);
      } catch (error) {
        console.error('Failed to fetch buddy preview:', error);
        setPreview({ has_buddy: false });
      } finally {
        setLoading(false);
      }
    }
    
    fetchPreview();
  }, [teamId]);
  
  const getElementEmoji = (element?: string) => {
    switch (element) {
      case 'fire': return '🔥';
      case 'water': return '💧';
      case 'earth': return '🌍';
      case 'air': return '💨';
      case 'electric': return '⚡';
      default: return '🎮';
    }
  };
  
  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-12" />
    );
  }
  
  if (compact) {
    return (
      <Link 
        href={`/team/${teamId}/buddy`}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white transition-all"
      >
        <span className="text-xl">{getElementEmoji(preview?.element)}</span>
        <span className="font-medium">Buddy Battle</span>
        {preview?.has_unclaimed_quests && (
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        )}
      </Link>
    );
  }
  
  return (
    <Link 
      href={`/team/${teamId}/buddy`}
      className="block"
    >
      <div className="retro-panel p-4 hover:opacity-90 transition-opacity cursor-pointer">
        <div className="flex items-center gap-4">
          {/* Buddy icon */}
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
            style={{
              background: preview?.has_buddy 
                ? 'linear-gradient(135deg, #8bac0f 0%, #306230 100%)'
                : 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
            }}
          >
            {getElementEmoji(preview?.element)}
          </div>
          
          <div className="flex-1">
            {preview?.has_buddy ? (
              <>
                <p className="retro-text font-medium">{preview.buddy_name}</p>
                <p className="retro-text text-xs text-retro-gray">
                  Level {preview.level} • {preview.available_points} points
                  {preview.streak_days && preview.streak_days > 0 && (
                    <span className="text-retro-yellow ml-2">
                      🔥 {preview.streak_days} day streak
                    </span>
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="retro-text font-medium">Buddy Battle</p>
                <p className="retro-text text-xs text-retro-gray">
                  Click to start your adventure!
                </p>
              </>
            )}
          </div>
          
          {/* Notification badge */}
          {preview?.has_unclaimed_quests && (
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
              <span className="retro-text text-xs text-retro-yellow">Quest!</span>
            </div>
          )}
          
          {/* Arrow */}
          <span className="retro-text text-xl">→</span>
        </div>
      </div>
    </Link>
  );
}

// Smaller inline version for menus
export function BuddyBattleMenuItem({ teamId }: { teamId: string }) {
  return (
    <Link 
      href={`/team/${teamId}/buddy`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-lg"
    >
      <span className="text-2xl">🎮</span>
      <div>
        <p className="font-medium text-gray-900 dark:text-white">Buddy Battle</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Train, battle, and earn rewards
        </p>
      </div>
    </Link>
  );
}

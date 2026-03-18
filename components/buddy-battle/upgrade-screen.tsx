'use client';

// =====================================================
// BUDDY BATTLE - Upgrades Screen Component
// Spend points to upgrade buddy stats
// =====================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { supabase } from '@/lib/supabase';

import { RetroButton, RetroProgress, RetroToast, RetroDialog } from './ui/retro-button';
import { ELEMENT_COLORS, GAME_CONSTANTS } from '@/lib/buddy-battle/types';
import { PixelBuddy } from './buddy-display';
import type { PlayerBuddy, BuddyStat, UpgradeCost } from '@/lib/buddy-battle/types';
import { getAuthHeaders } from '@/lib/buddy-battle/client-auth';

interface PointsBreakdown {
  status: string;
  count: number;
  points: number;
}

interface UpgradeData {
  buddy: PlayerBuddy & { name: string; element: string };
  available_points: number;
  total_earned: number;
  total_spent: number;
  points_breakdown: PointsBreakdown[];
  upgrades: UpgradeCost[];
}

interface UpgradeScreenProps {
  teamId: string;
  teamSlug?: string;
}

export function UpgradeScreen({ teamId, teamSlug }: UpgradeScreenProps) {
  const router = useRouter();
  const navId = teamSlug || teamId;
  
  const { sounds, initAudio, isInitialized } = useRetroSounds();
  
  const [data, setData] = useState<UpgradeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<BuddyStat | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showConfirm, setShowConfirm] = useState<UpgradeCost | null>(null);
  
  // Fetch upgrade data
  useEffect(() => {
    async function fetchUpgradeData() {
      if (!teamId) return;
      try {
        const headers = await getAuthHeaders();
        console.log('[UpgradeScreen] Fetching with headers:', { 
          hasAuth: !!(headers as Record<string, string>)['Authorization'],
          teamId 
        });
        
        const response = await fetch(`/api/buddy-battle/upgrade?teamId=${teamId}`, { 
          credentials: 'include',
          headers,
        });
        
        console.log('[UpgradeScreen] Response status:', response.status);
        
        const result = await response.json();
        
        if (response.status === 401) {
          console.error('[UpgradeScreen] Unauthorized - user may need to log in again');
          setToast({ message: 'Please log in to view upgrades', type: 'error' });
        } else {
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch upgrade data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUpgradeData();
  }, [teamId]);
  
  // Handle upgrade
  const handleUpgrade = async (stat: BuddyStat) => {
    if (!data || upgrading) return;
    
    const upgrade = data.upgrades.find(u => u.stat_type === stat);
    if (!upgrade || upgrade.is_maxed) {
      sounds.error();
      setToast({ message: 'Cannot upgrade this stat', type: 'error' });
      return;
    }
    
    if (data.available_points < upgrade.point_cost) {
      sounds.error();
      setToast({ message: 'Not enough points!', type: 'error' });
      return;
    }
    
    setUpgrading(stat);
    sounds.select();
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/buddy-battle/upgrade?teamId=${teamId}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ stat }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        sounds.levelUp();
        setToast({ 
          message: `${stat.toUpperCase().replace('_', ' ')} upgraded to ${result.new_value}!`, 
          type: 'success' 
        });
        setData(result.data);
      } else {
        sounds.error();
        setToast({ message: result.message || 'Upgrade failed', type: 'error' });
      }
    } catch (error) {
      sounds.error();
      setToast({ message: 'Upgrade failed', type: 'error' });
    } finally {
      setUpgrading(null);
      setShowConfirm(null);
    }
  };
  
  // Get stat icon
  const getStatIcon = (stat: BuddyStat) => {
    switch (stat) {
      case 'hp': return '❤️';
      case 'attack': return '⚔️';
      case 'defense': return '🛡️';
      case 'speed': return '⚡';
      case 'special_attack': return '✨';
      case 'special_defense': return '🔮';
      case 'critical_chance': return '💥';
      default: return '📊';
    }
  };
  
  // Get stat description
  const getStatDescription = (stat: BuddyStat) => {
    switch (stat) {
      case 'hp': return 'Increases maximum health points';
      case 'attack': return 'Increases damage dealt to opponents';
      case 'defense': return 'Reduces damage taken from attacks';
      case 'speed': return 'Increases chance to attack first';
      case 'special_attack': return 'Increases special move damage';
      case 'special_defense': return 'Reduces special attack damage taken';
      case 'critical_chance': return 'Increases critical hit chance';
      default: return '';
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
          <p className="retro-text text-center">Loading upgrades...</p>
        </div>
      </div>
    );
  }
  
  if (!data?.buddy) {
    return (
      <div 
        className="buddy-battle-container flex items-center justify-center min-h-screen"
        onClick={handleInteraction}
      >
        <div className="retro-panel p-8">
          <p className="retro-text text-center text-retro-red mb-4">
            No buddy found
          </p>
          <RetroButton onClick={() => router.push(`/team/${navId}/buddy`)}>
            Return
          </RetroButton>
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
      
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="retro-title text-3xl">⬆️ Upgrade Stats</h1>
          <p className="retro-text text-base text-retro-gray mt-2">
            Earn points by filling in your availability!
          </p>
        </div>
        
        {/* Back button */}
        <RetroButton 
          onClick={() => router.push(`/team/${navId}/buddy`)}
          variant="default"
          size="small"
          className="mb-5"
        >
          ← Back
        </RetroButton>
        
        {/* Buddy preview */}
        <div className="retro-panel mb-4 p-5">
          <div className="flex items-center gap-5">
            {/* Use the actual PixelBuddy avatar */}
            <div 
              className="buddy-sprite w-24 h-24 flex-shrink-0"
              style={{
                background: `linear-gradient(180deg, ${data.buddy.color_primary || ELEMENT_COLORS[data.buddy.element || 'fire']}40 0%, transparent 100%)`,
              }}
            >
              <PixelBuddy 
                type={data.buddy.buddy_type?.name || 'Plannie'}
                primaryColor={data.buddy.color_primary || ELEMENT_COLORS[data.buddy.element || 'fire']}
                secondaryColor={data.buddy.color_secondary || '#2196F3'}
                accentColor={data.buddy.color_accent || '#FFC107'}
                element={data.buddy.element || data.buddy.buddy_type?.element}
              />
            </div>
            
            <div className="flex-1">
              <p className="retro-text text-xl font-bold">{data.buddy.name}</p>
              <p className="retro-text text-base text-retro-gray mt-1">
                Level {data.buddy.level} • {(data.buddy.element || data.buddy.buddy_type?.element || 'unknown').toUpperCase()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Points Overview Panel */}
        <div className="retro-panel mb-4 p-5">
          <h3 className="retro-text text-lg text-retro-yellow mb-4 flex items-center gap-2">
            ✨ Points Overview
          </h3>
          
          {/* Main points display */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-black/20 rounded">
              <p className="retro-text text-sm text-retro-gray mb-1">Earned</p>
              <p className="retro-text text-2xl text-retro-lime font-bold">{data.total_earned || 0}</p>
            </div>
            <div className="text-center p-3 bg-black/20 rounded">
              <p className="retro-text text-sm text-retro-gray mb-1">Spent</p>
              <p className="retro-text text-2xl text-retro-red font-bold">{data.total_spent || 0}</p>
            </div>
            <div className="text-center p-3 bg-black/20 rounded border-2 border-retro-lime/50">
              <p className="retro-text text-sm text-retro-gray mb-1">Available</p>
              <p className="retro-text text-2xl text-retro-yellow font-bold">{data.available_points}</p>
            </div>
          </div>
          
          {/* Points breakdown by availability status */}
          {data.points_breakdown && data.points_breakdown.length > 0 && (
            <details className="group">
              <summary className="retro-text text-sm text-retro-gray cursor-pointer hover:text-retro-lime">
                📊 How points are earned (click to expand)
              </summary>
              <div className="mt-3 space-y-2">
                <p className="retro-text text-sm text-retro-gray mb-2">
                  Points are based on your availability history:
                </p>
                {data.points_breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gb-dark-green/30">
                    <span className="retro-text text-base capitalize">
                      {item.status === 'available' && '✅'}
                      {item.status === 'remote' && '🏠'}
                      {item.status === 'unavailable' && '❌'}
                      {item.status === 'holiday' && '🏖️'}
                      {item.status === 'absent' && '🚫'}
                      {item.status === 'need_to_check' && '❓'}
                      {' '}{item.status.replace('_', ' ')}
                    </span>
                    <span className="retro-text text-base text-retro-gray">
                      {item.count}× = <span className="text-retro-lime font-bold">{item.points} pts</span>
                    </span>
                  </div>
                ))}
                <p className="retro-text text-sm text-retro-gray mt-3 opacity-75">
                  💡 Available/Remote = 2pts • Unavailable/Holiday/Absent = 1pt
                </p>
              </div>
            </details>
          )}
        </div>
        
        {/* Stat upgrades */}
        <div className="space-y-4">
          <h3 className="retro-text text-lg text-retro-yellow mb-2">
            📈 Choose a Stat to Upgrade
          </h3>
          {data.upgrades.map(upgrade => {
            const isMaxed = upgrade.is_maxed;
            const canAfford = data.available_points >= upgrade.point_cost;
            
            return (
              <div 
                key={upgrade.stat_type}
                className="retro-panel p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getStatIcon(upgrade.stat_type)}</span>
                    <div>
                      <p className="retro-text text-lg uppercase font-bold">{upgrade.stat_type.replace('_', ' ')}</p>
                      <p className="retro-text text-sm text-retro-gray">
                        {getStatDescription(upgrade.stat_type)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="retro-text text-xl font-bold">
                      {upgrade.current_value}
                      <span className="text-retro-gray text-base"> / {upgrade.max_value}</span>
                    </p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mb-4">
                  <RetroProgress 
                    value={upgrade.current_value}
                    max={upgrade.max_value}
                    label=""
                    variant={isMaxed ? 'xp' : 'default'}
                  />
                </div>
                
                {/* Upgrade button */}
                <div className="flex justify-between items-center">
                  <p className="retro-text text-base">
                    Cost: <span className={canAfford ? 'text-retro-lime font-bold' : 'text-retro-red'}>
                      {upgrade.point_cost} ✨
                    </span>
                  </p>
                  
                  {isMaxed ? (
                    <span className="retro-text text-base text-retro-yellow font-bold">MAXED ⭐</span>
                  ) : (
                    <RetroButton 
                      onClick={() => setShowConfirm(upgrade)}
                      disabled={!canAfford || upgrading !== null}
                      variant={canAfford ? 'primary' : 'default'}
                      size="small"
                    >
                      {upgrading === upgrade.stat_type ? 'Upgrading...' : 'Upgrade +1'}
                    </RetroButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Info panel */}
        <div className="retro-panel mt-6 p-5">
          <p className="retro-text text-base text-retro-gray text-center leading-relaxed">
            💡 <strong>Tip:</strong> Balance your stats for optimal battle performance!
            <br />
            <span className="text-retro-yellow">Attack</span> for damage, 
            <span className="text-retro-blue"> Defense</span> for survival,
            <span className="text-retro-lime"> Speed</span> for initiative.
          </p>
        </div>
      </div>
      
      {/* Confirm dialog */}
      {showConfirm && (
        <RetroDialog 
          title="Confirm Upgrade"
          onClose={() => setShowConfirm(null)}
        >
          <div className="text-center">
            <span className="text-5xl block mb-4">{getStatIcon(showConfirm.stat_type)}</span>
            
            <p className="retro-text text-lg mb-3">
              Upgrade <span className="text-retro-lime uppercase font-bold">{showConfirm.stat_type.replace('_', ' ')}</span>?
            </p>
            
            <p className="retro-text text-xl mb-4">
              {showConfirm.current_value} → <span className="text-retro-lime font-bold">{showConfirm.next_value}</span>
            </p>
            
            <p className="retro-text text-base text-retro-gray mb-5">
              Cost: <span className="text-retro-yellow font-bold">{showConfirm.point_cost} ✨</span>
            </p>
            
            <div className="flex justify-center gap-4">
              <RetroButton 
                onClick={() => setShowConfirm(null)}
                variant="default"
              >
                Cancel
              </RetroButton>
              <RetroButton 
                onClick={() => handleUpgrade(showConfirm.stat_type)}
                variant="primary"
                disabled={upgrading !== null}
              >
                {upgrading ? 'Upgrading...' : 'Confirm'}
              </RetroButton>
            </div>
          </div>
        </RetroDialog>
      )}
      
      {/* Toast */}
      {toast && (
        <RetroToast 
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
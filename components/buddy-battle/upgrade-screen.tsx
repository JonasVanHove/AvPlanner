'use client';

// =====================================================
// BUDDY BATTLE - Upgrades Screen Component
// Spend points to upgrade buddy stats
// =====================================================

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import '@/styles/buddy-battle.css';

import { RetroButton, RetroProgress, RetroToast, RetroDialog } from './ui/retro-button';
import { ELEMENT_COLORS, GAME_CONSTANTS } from '@/lib/buddy-battle/types';
import type { PlayerBuddy, BuddyStat } from '@/lib/buddy-battle/types';

interface UpgradeInfo {
  stat: BuddyStat;
  current: number;
  max: number;
  cost: number;
  can_upgrade: boolean;
}

interface UpgradeData {
  buddy: PlayerBuddy;
  available_points: number;
  upgrades: UpgradeInfo[];
  total_upgrades_today: number;
}

export function UpgradeScreen() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.teamId as string;
  
  const { sounds, initAudio, isInitialized } = useRetroSounds();
  
  const [data, setData] = useState<UpgradeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<BuddyStat | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showConfirm, setShowConfirm] = useState<UpgradeInfo | null>(null);
  
  // Fetch upgrade data
  useEffect(() => {
    async function fetchUpgradeData() {
      try {
        const response = await fetch('/api/buddy-battle/upgrade', { credentials: 'include' });
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch upgrade data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUpgradeData();
  }, []);
  
  // Handle upgrade
  const handleUpgrade = async (stat: BuddyStat) => {
    if (!data || upgrading) return;
    
    const upgrade = data.upgrades.find(u => u.stat === stat);
    if (!upgrade || !upgrade.can_upgrade) {
      sounds.error();
      setToast({ message: 'Cannot upgrade this stat', type: 'error' });
      return;
    }
    
    setUpgrading(stat);
    sounds.select();
    
    try {
      const response = await fetch('/api/buddy-battle/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stat }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        sounds.levelUp();
        setToast({ 
          message: `${stat.toUpperCase()} upgraded to ${result.new_value}!`, 
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
          <RetroButton onClick={() => router.push(`/team/${teamId}/buddy`)}>
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
        <div className="text-center mb-4">
          <h1 className="retro-title">Upgrade Stats</h1>
          <p className="retro-text text-xs text-retro-gray">
            Spend points to make your buddy stronger
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
        
        {/* Buddy preview */}
        <div className="retro-panel mb-4 p-4">
          <div className="flex items-center gap-4">
            {(() => {
              const element = data.buddy.element || data.buddy.buddy_type?.element || 'fire';
              return (
                <div 
                  className="buddy-sprite w-16 h-16"
                  style={{
                    background: `linear-gradient(135deg, ${ELEMENT_COLORS[element]} 0%, #1a1c2c 100%)`,
                  }}
                >
                  <span className="text-2xl">
                    {element === 'fire' && '🔥'}
                    {element === 'water' && '💧'}
                    {element === 'earth' && '🌍'}
                    {element === 'air' && '💨'}
                    {element === 'electric' && '⚡'}
                  </span>
                </div>
              );
            })()}
            
            <div className="flex-1">
              <p className="retro-text-lg">{data.buddy.name}</p>
              <p className="retro-text text-xs text-retro-gray">
                Level {data.buddy.level} | {data.buddy.element || data.buddy.buddy_type?.element || 'unknown'}
              </p>
            </div>
            
            <div className="text-right">
              <p className="retro-text text-xs text-retro-gray">Available Points</p>
              <p className="retro-text-lg text-retro-lime">{data.available_points} ✨</p>
            </div>
          </div>
        </div>
        
        {/* Daily upgrade limit indicator */}
        <div className="retro-panel mb-4 p-3">
          <div className="flex justify-between items-center">
            <p className="retro-text text-xs">Daily Upgrades</p>
            <p className="retro-text text-xs">
              <span className={data.total_upgrades_today >= 5 ? 'text-retro-red' : 'text-retro-lime'}>
                {data.total_upgrades_today}
              </span>
              <span className="text-retro-gray"> / 5</span>
            </p>
          </div>
          <RetroProgress 
            value={data.total_upgrades_today}
            max={5}
            label=""
            variant="default"
          />
        </div>
        
        {/* Stat upgrades */}
        <div className="space-y-3">
          {data.upgrades.map(upgrade => {
            const percentage = (upgrade.current / upgrade.max) * 100;
            const isMaxed = upgrade.current >= upgrade.max;
            const canAfford = data.available_points >= upgrade.cost;
            
            return (
              <div 
                key={upgrade.stat}
                className="retro-panel p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getStatIcon(upgrade.stat)}</span>
                    <div>
                      <p className="retro-text-lg uppercase">{upgrade.stat}</p>
                      <p className="retro-text text-xxs text-retro-gray">
                        {getStatDescription(upgrade.stat)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="retro-text-lg">
                      {upgrade.current}
                      <span className="text-retro-gray text-xs"> / {upgrade.max}</span>
                    </p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mb-3">
                  <RetroProgress 
                    value={upgrade.current}
                    max={upgrade.max}
                    label=""
                    variant={isMaxed ? 'xp' : 'default'}
                  />
                </div>
                
                {/* Upgrade button */}
                <div className="flex justify-between items-center">
                  <p className="retro-text text-xs">
                    Cost: <span className={canAfford ? 'text-retro-lime' : 'text-retro-red'}>
                      {upgrade.cost} ✨
                    </span>
                  </p>
                  
                  {isMaxed ? (
                    <span className="retro-text text-xs text-retro-yellow">MAXED</span>
                  ) : (
                    <RetroButton 
                      onClick={() => setShowConfirm(upgrade)}
                      disabled={!upgrade.can_upgrade || upgrading !== null}
                      variant={canAfford ? 'primary' : 'default'}
                      size="small"
                    >
                      {upgrading === upgrade.stat ? 'Upgrading...' : '+1'}
                    </RetroButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Info panel */}
        <div className="retro-panel mt-6 p-4">
          <p className="retro-text text-xs text-retro-gray text-center">
            💡 Tip: Balance your stats for optimal battle performance!
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
            <span className="text-5xl block mb-4">{getStatIcon(showConfirm.stat)}</span>
            
            <p className="retro-text mb-2">
              Upgrade <span className="text-retro-lime uppercase">{showConfirm.stat}</span>?
            </p>
            
            <p className="retro-text-lg mb-4">
              {showConfirm.current} → <span className="text-retro-lime">{showConfirm.current + 1}</span>
            </p>
            
            <p className="retro-text text-xs text-retro-gray mb-4">
              Cost: {showConfirm.cost} ✨
            </p>
            
            <div className="flex justify-center gap-3">
              <RetroButton 
                onClick={() => setShowConfirm(null)}
                variant="default"
              >
                Cancel
              </RetroButton>
              <RetroButton 
                onClick={() => handleUpgrade(showConfirm.stat)}
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

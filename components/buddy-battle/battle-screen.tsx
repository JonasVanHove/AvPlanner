'use client';

// =====================================================
// BUDDY BATTLE - Battle Screen Component
// Turn-based combat interface
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { supabase } from '@/lib/supabase';
import '@/styles/buddy-battle.css';

import { RetroButton, RetroDialog, RetroProgress } from './ui/retro-button';
import { ELEMENT_COLORS } from '@/lib/buddy-battle/types';
import type { BattleState, BuddyAbility, BattleAction, NPCBoss } from '@/lib/buddy-battle/types';

type BattlePhase = 'intro' | 'battle' | 'victory' | 'defeat';

interface DialogueState {
  lines: string[];
  currentLine: number;
}

interface BattleScreenProps {
  teamId: string;
}

export function BattleScreen({ teamId }: BattleScreenProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const battleType = searchParams?.get('type') || 'pvp';
  
  const { sounds, initAudio, isInitialized } = useRetroSounds();
  
  const [phase, setPhase] = useState<BattlePhase>('intro');
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<{ id: string; value: number; x: number; y: number; isCrit: boolean }[]>([]);
  
  // Initialize battle
  useEffect(() => {
    async function startBattle() {
      if (!teamId) {
        console.error('No teamId provided');
        setLoading(false);
        return;
      }
      
      try {
        // Get auth token for API call
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        console.log('[BattleScreen] Starting battle:', { teamId, battleType, hasToken: !!session?.access_token });
        
        const response = await fetch('/api/buddy-battle/battle', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            action: 'start',
            buddyId: 'current', // Will be resolved by API using teamId
            teamId, // Pass teamId so API can find the buddy
            battleType,
          }),
        });
        
        console.log('[BattleScreen] Response status:', response.status);
        
        // Check for empty response
        const text = await response.text();
        if (!text) {
          console.error('[BattleScreen] Empty response from API');
          return;
        }
        
        const data = JSON.parse(text);
        console.log('[BattleScreen] Response data:', data);
        
        if (data.error) {
          console.error('[BattleScreen] API error:', data.error);
          return;
        }
        
        if (data.battle) {
          setBattleState(data.battle);
          
          // Set up intro dialogue for NPC battles
          if (data.npc_dialogue) {
            setDialogue({
              lines: data.npc_dialogue,
              currentLine: 0,
            });
          } else {
            setPhase('battle');
          }
        }
      } catch (error) {
        console.error('Failed to start battle:', error);
      } finally {
        setLoading(false);
      }
    }
    
    startBattle();
  }, [teamId, battleType]);
  
  // Handle dialogue advancement
  const advanceDialogue = useCallback(() => {
    if (!dialogue) return;
    
    sounds.select();
    
    if (dialogue.currentLine < dialogue.lines.length - 1) {
      setDialogue({
        ...dialogue,
        currentLine: dialogue.currentLine + 1,
      });
    } else {
      setDialogue(null);
      if (phase === 'intro') {
        setPhase('battle');
        sounds.bossAppear();
      }
    }
  }, [dialogue, phase, sounds]);
  
  // Handle ability selection
  const handleAbilitySelect = (ability: BuddyAbility) => {
    sounds.select();
    setSelectedAbility(ability.id);
  };
  
  // Execute turn
  const executeTurn = async () => {
    if (!selectedAbility || !battleState) return;
    
    sounds.attack();
    
    try {
      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/buddy-battle/battle', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          action: 'turn',
          buddyId: 'current',
          teamId,
          battleId: battleState.battle_id,
          abilityId: selectedAbility,
        }),
      });
      
      const data = await response.json();
      
      if (data.battle_state) {
        // Process turn results
        processTurnResult(data);
        setBattleState(data.battle_state);
      }
    } catch (error) {
      sounds.error();
      console.error('Turn failed:', error);
    }
    
    setSelectedAbility(null);
  };
  
  // Process turn result for animations
  const processTurnResult = (data: any) => {
    // Show damage number
    if (data.damage) {
      const id = Date.now().toString();
      setDamageNumbers(prev => [...prev, {
        id,
        value: data.damage,
        x: 50 + Math.random() * 20,
        y: 30 + Math.random() * 10,
        isCrit: data.is_critical,
      }]);
      
      if (data.is_critical) {
        sounds.critical();
      } else {
        sounds.hit();
      }
      
      // Remove after animation
      setTimeout(() => {
        setDamageNumbers(prev => prev.filter(d => d.id !== id));
      }, 1000);
    }
    
    // Show action message
    if (data.message) {
      setActionMessage(data.message);
      setTimeout(() => setActionMessage(null), 2000);
    }
    
    // Check for battle end
    if (data.battle_state?.is_finished) {
      if (data.battle_state.winner === 'player') {
        sounds.victory();
        setPhase('victory');
      } else {
        sounds.defeat();
        setPhase('defeat');
      }
    }
  };
  
  // Handle flee
  const handleFlee = async () => {
    if (!battleState) return;
    
    sounds.cancel();
    
    // Get auth token for API call
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    await fetch('/api/buddy-battle/battle', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        action: 'flee',
        buddyId: 'current',
        teamId,
        battleId: battleState.battle_id,
      }),
    });
    
    router.push(`/team/${teamId}/buddy`);
  };
  
  // Initialize audio on interaction
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
          <p className="retro-text text-center">Preparing battle...</p>
        </div>
      </div>
    );
  }
  
  if (!battleState) {
    return (
      <div 
        className="buddy-battle-container flex items-center justify-center min-h-screen"
        onClick={handleInteraction}
      >
        <div className="retro-panel p-8">
          <p className="retro-text text-center text-retro-red mb-4">
            Failed to start battle
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
      
      {/* Battle Arena */}
      <div className="max-w-4xl mx-auto">
        {/* Battle Type Header */}
        <div className="text-center mb-4">
          <h1 className="retro-title">
            {battleType === 'tutorial' && 'Tutorial Battle'}
            {battleType === 'boss' && 'Boss Battle'}
            {battleType === 'pvp' && 'Team Battle'}
          </h1>
        </div>
        
        {/* Opponent Area */}
        <div className="retro-panel mb-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="retro-text-lg">{battleState.opponent.name}</p>
              <span 
                className="element-badge"
                style={{ backgroundColor: ELEMENT_COLORS[battleState.opponent.element] }}
              >
                {battleState.opponent.element}
              </span>
            </div>
            <div className="text-right">
              <p className="retro-text text-xs">Lv. ??</p>
            </div>
          </div>
          
          {/* Opponent HP */}
          <RetroProgress 
            value={battleState.opponent.current_hp}
            max={battleState.opponent.max_hp}
            label="HP"
            variant="hp"
          />
          
          {/* Opponent Sprite */}
          <div className="flex justify-center mt-4 relative">
            <div 
              className={`buddy-sprite w-32 h-32 ${phase === 'battle' ? 'battle' : ''}`}
              style={{
                background: `linear-gradient(135deg, ${ELEMENT_COLORS[battleState.opponent.element]} 0%, #1a1c2c 100%)`,
              }}
            >
              <span className="text-6xl">
                {battleState.opponent.is_npc && battleType === 'tutorial' && '🥋'}
                {battleState.opponent.is_npc && battleType === 'boss' && '👹'}
                {!battleState.opponent.is_npc && '⚔️'}
              </span>
            </div>
            
            {/* Damage numbers */}
            {damageNumbers.map(dmg => (
              <div 
                key={dmg.id}
                className={`damage-number ${dmg.isCrit ? 'critical' : ''}`}
                style={{ left: `${dmg.x}%`, top: `${dmg.y}%` }}
              >
                {dmg.value}
              </div>
            ))}
          </div>
        </div>
        
        {/* Player Area */}
        <div className="retro-panel mb-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="retro-text-lg">{battleState.player_buddy.name}</p>
              <span 
                className="element-badge"
                style={{ backgroundColor: ELEMENT_COLORS[battleState.player_buddy.element] }}
              >
                {battleState.player_buddy.element}
              </span>
            </div>
          </div>
          
          {/* Player HP */}
          <RetroProgress 
            value={battleState.player_buddy.current_hp}
            max={battleState.player_buddy.max_hp}
            label="HP"
            variant="hp"
          />
          
          {/* Player Sprite (smaller, back view position) */}
          <div className="flex justify-start mt-4">
            <div 
              className="buddy-sprite w-24 h-24"
              style={{
                background: `linear-gradient(135deg, ${ELEMENT_COLORS[battleState.player_buddy.element]} 0%, #1a1c2c 100%)`,
              }}
            >
              <span className="text-4xl">🎮</span>
            </div>
          </div>
        </div>
        
        {/* Action Message */}
        {actionMessage && (
          <div className="dialog-box mb-4">
            <p className="dialog-text">{actionMessage}</p>
          </div>
        )}
        
        {/* Battle Menu */}
        {phase === 'battle' && battleState.is_player_turn && (
          <div className="retro-panel">
            <p className="retro-text text-xs mb-3 text-retro-lime">Choose your action:</p>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {battleState.available_abilities.slice(0, 4).map(ability => {
                const isOnCooldown = (battleState.player_buddy.ability_cooldowns[ability.id] || 0) > 0;
                
                return (
                  <button
                    key={ability.id}
                    className={`retro-btn text-xs py-3 ${
                      selectedAbility === ability.id 
                        ? 'bg-gb-light-green text-gb-dark' 
                        : ''
                    } ${isOnCooldown ? 'opacity-50' : ''}`}
                    onClick={() => !isOnCooldown && handleAbilitySelect(ability)}
                    disabled={isOnCooldown}
                  >
                    <div>{ability.name}</div>
                    <div className="text-xxs mt-1">
                      {ability.element !== 'neutral' && (
                        <span 
                          className="inline-block w-2 h-2 rounded-full mr-1"
                          style={{ backgroundColor: ELEMENT_COLORS[ability.element as keyof typeof ELEMENT_COLORS] }}
                        />
                      )}
                      PWR: {ability.damage_base}
                    </div>
                    {isOnCooldown && (
                      <div className="text-retro-red">
                        CD: {battleState.player_buddy.ability_cooldowns[ability.id]}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="flex justify-between">
              <RetroButton 
                onClick={handleFlee}
                variant="danger"
                size="small"
              >
                Flee
              </RetroButton>
              
              <RetroButton 
                onClick={executeTurn}
                variant="primary"
                disabled={!selectedAbility}
              >
                Attack!
              </RetroButton>
            </div>
          </div>
        )}
        
        {/* Waiting for opponent */}
        {phase === 'battle' && !battleState.is_player_turn && (
          <div className="retro-panel text-center py-6">
            <div className="retro-loading mx-auto mb-4" />
            <p className="retro-text">Opponent's turn...</p>
          </div>
        )}
      </div>
      
      {/* Dialogue overlay */}
      {dialogue && (
        <div 
          className="fixed inset-x-0 bottom-0 p-4 cursor-pointer"
          onClick={advanceDialogue}
        >
          <div className="dialog-box max-w-2xl mx-auto">
            <p className="dialog-text">
              {dialogue.lines[dialogue.currentLine]}
            </p>
          </div>
        </div>
      )}
      
      {/* Victory screen */}
      {phase === 'victory' && (
        <RetroDialog title="Victory!" showClose={false}>
          <div className="text-center">
            <p className="text-6xl mb-4">🎉</p>
            <p className="retro-text mb-4">You won the battle!</p>
            <p className="retro-text text-xs text-retro-yellow mb-4">
              +50 XP | +10 Points
            </p>
            <RetroButton 
              variant="primary"
              onClick={() => router.push(`/team/${teamId}/buddy`)}
            >
              Continue
            </RetroButton>
          </div>
        </RetroDialog>
      )}
      
      {/* Defeat screen */}
      {phase === 'defeat' && (
        <RetroDialog title="Defeat..." showClose={false}>
          <div className="text-center">
            <p className="text-6xl mb-4">😢</p>
            <p className="retro-text mb-4">You lost the battle...</p>
            <p className="retro-text text-xs text-retro-red mb-4">
              Anxiety +10
            </p>
            <RetroButton 
              onClick={() => router.push(`/team/${teamId}/buddy`)}
            >
              Return
            </RetroButton>
          </div>
        </RetroDialog>
      )}
    </div>
  );
}

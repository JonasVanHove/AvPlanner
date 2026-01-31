'use client';

// =====================================================
// BUDDY BATTLE - Battle Screen Component
// Turn-based combat interface with Habbo Hotel style
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { supabase } from '@/lib/supabase';
import '@/styles/buddy-battle.css';

import { RetroButton, RetroDialog, RetroProgress } from './ui/retro-button';
import { ELEMENT_COLORS } from '@/lib/buddy-battle/types';
import type { BattleState, BuddyAbility, BattleAction, NPCBoss } from '@/lib/buddy-battle/types';

// =====================================================
// AvPlanner Buddy Avatars - TRUE PIXEL ART STYLE
// Like Habbo Hotel / Mario Bros - blocky 8-bit pixels
// =====================================================

type BuddyVariant = 'player' | 'tutorial' | 'boss';

interface AvPlannerBuddyProps {
  element: string;
  color: string;
  variant?: BuddyVariant;
  isFlipped?: boolean;
}

// Pixel size constant for easy adjustment
const P = 3; // 3px per pixel = 16x16 grid in 48x48 viewBox

// Plannie - The Calendar Buddy (Fire element) 🔥📅 - PIXEL ART
function PlannieBuddy({ color, isFlipped }: AvPlannerBuddyProps) {
  const dark = '#2d3436';
  const light = '#fff';
  const red = '#d63031';
  const skin = '#ffeaa7';
  
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" style={{ transform: isFlipped ? 'scaleX(-1)' : 'none', imageRendering: 'pixelated' }}>
      {/* Shadow */}
      <rect x={6*P} y={15*P} width={4*P} height={P} fill="rgba(0,0,0,0.3)" />
      
      {/* Calendar body - blocky */}
      <rect x={3*P} y={4*P} width={10*P} height={10*P} fill={color} />
      <rect x={3*P} y={4*P} width={10*P} height={2*P} fill={red} />
      
      {/* Calendar rings */}
      <rect x={5*P} y={3*P} width={P} height={2*P} fill={dark} />
      <rect x={10*P} y={3*P} width={P} height={2*P} fill={dark} />
      
      {/* Calendar grid */}
      <rect x={4*P} y={7*P} width={8*P} height={P} fill={light} opacity="0.5" />
      <rect x={4*P} y={9*P} width={8*P} height={P} fill={light} opacity="0.5" />
      <rect x={4*P} y={11*P} width={8*P} height={P} fill={light} opacity="0.5" />
      
      {/* Eyes - pixel style */}
      <rect x={5*P} y={8*P} width={2*P} height={2*P} fill={light} />
      <rect x={9*P} y={8*P} width={2*P} height={2*P} fill={light} />
      <rect x={6*P} y={9*P} width={P} height={P} fill={dark} />
      <rect x={10*P} y={9*P} width={P} height={P} fill={dark} />
      
      {/* Smile - pixel */}
      <rect x={6*P} y={11*P} width={P} height={P} fill={dark} />
      <rect x={7*P} y={12*P} width={2*P} height={P} fill={dark} />
      <rect x={9*P} y={11*P} width={P} height={P} fill={dark} />
      
      {/* Flame hair - pixel */}
      <rect x={7*P} y={1*P} width={2*P} height={P} fill="#ff7675" />
      <rect x={6*P} y={2*P} width={P} height={P} fill="#ff7675" />
      <rect x={8*P} y={2*P} width={2*P} height={P} fill="#fab1a0" />
      <rect x={7*P} y={3*P} width={2*P} height={P} fill="#fab1a0" />
      
      {/* Arms - pixel */}
      <rect x={1*P} y={8*P} width={2*P} height={3*P} fill={color} />
      <rect x={13*P} y={8*P} width={2*P} height={3*P} fill={color} />
      <rect x={1*P} y={10*P} width={P} height={P} fill={skin} />
      <rect x={14*P} y={10*P} width={P} height={P} fill={skin} />
      
      {/* Feet - pixel */}
      <rect x={4*P} y={14*P} width={2*P} height={P} fill={dark} />
      <rect x={10*P} y={14*P} width={2*P} height={P} fill={dark} />
    </svg>
  );
}

// Clocky - The Time Buddy (Water element) 💧⏰ - PIXEL ART
function ClockyBuddy({ color, isFlipped }: AvPlannerBuddyProps) {
  const dark = '#2d3436';
  const light = '#fff';
  const water = '#74b9ff';
  
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" style={{ transform: isFlipped ? 'scaleX(-1)' : 'none', imageRendering: 'pixelated' }}>
      {/* Shadow */}
      <rect x={5*P} y={15*P} width={6*P} height={P} fill="rgba(0,0,0,0.3)" />
      
      {/* Clock body - octagon-ish pixel circle */}
      <rect x={5*P} y={3*P} width={6*P} height={P} fill={color} />
      <rect x={4*P} y={4*P} width={8*P} height={P} fill={color} />
      <rect x={3*P} y={5*P} width={10*P} height={6*P} fill={color} />
      <rect x={4*P} y={11*P} width={8*P} height={P} fill={color} />
      <rect x={5*P} y={12*P} width={6*P} height={P} fill={color} />
      
      {/* Clock face */}
      <rect x={5*P} y={5*P} width={6*P} height={5*P} fill={light} />
      
      {/* Clock hands */}
      <rect x={7*P} y={5*P} width={P} height={3*P} fill={dark} />
      <rect x={8*P} y={7*P} width={2*P} height={P} fill={dark} />
      
      {/* Hour markers */}
      <rect x={7*P} y={4*P} width={P} height={P} fill={color} />
      <rect x={7*P} y={10*P} width={P} height={P} fill={color} />
      <rect x={4*P} y={7*P} width={P} height={P} fill={color} />
      <rect x={10*P} y={7*P} width={P} height={P} fill={color} />
      
      {/* Eyes */}
      <rect x={5*P} y={6*P} width={2*P} height={2*P} fill={light} />
      <rect x={8*P} y={6*P} width={2*P} height={2*P} fill={light} />
      <rect x={6*P} y={7*P} width={P} height={P} fill={dark} />
      <rect x={9*P} y={7*P} width={P} height={P} fill={dark} />
      
      {/* Smile */}
      <rect x={6*P} y={9*P} width={3*P} height={P} fill={dark} />
      
      {/* Water drop antenna */}
      <rect x={7*P} y={1*P} width={P} height={2*P} fill={water} />
      <rect x={6*P} y={2*P} width={3*P} height={P} fill={water} />
      
      {/* Feet */}
      <rect x={5*P} y={13*P} width={2*P} height={P} fill={dark} />
      <rect x={9*P} y={13*P} width={2*P} height={P} fill={dark} />
    </svg>
  );
}

// Tasker - The Checklist Buddy (Earth element) 🌍✅ - PIXEL ART
function TaskerBuddy({ color, isFlipped }: AvPlannerBuddyProps) {
  const dark = '#2d3436';
  const light = '#fff';
  const wood = '#a0826d';
  const green = '#00b894';
  
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" style={{ transform: isFlipped ? 'scaleX(-1)' : 'none', imageRendering: 'pixelated' }}>
      {/* Shadow */}
      <rect x={5*P} y={15*P} width={6*P} height={P} fill="rgba(0,0,0,0.3)" />
      
      {/* Clipboard body */}
      <rect x={4*P} y={3*P} width={8*P} height={11*P} fill={wood} />
      <rect x={5*P} y={5*P} width={6*P} height={8*P} fill={light} />
      
      {/* Clipboard clip */}
      <rect x={6*P} y={2*P} width={4*P} height={2*P} fill="#b2bec3" />
      <rect x={7*P} y={3*P} width={2*P} height={P} fill="#636e72" />
      
      {/* Checklist items */}
      <rect x={5*P} y={6*P} width={P} height={P} fill={color} />
      <rect x={6*P} y={6*P} width={4*P} height={P} fill="#dfe6e9" />
      <rect x={5*P} y={8*P} width={P} height={P} fill={color} />
      <rect x={6*P} y={8*P} width={4*P} height={P} fill="#dfe6e9" />
      <rect x={5*P} y={10*P} width={P} height={P} fill="#b2bec3" />
      <rect x={6*P} y={10*P} width={4*P} height={P} fill="#dfe6e9" />
      
      {/* Eyes on clip area */}
      <rect x={6*P} y={3*P} width={P} height={P} fill={light} />
      <rect x={9*P} y={3*P} width={P} height={P} fill={light} />
      <rect x={6*P} y={3*P} width={P} height={P} fill={dark} />
      <rect x={9*P} y={3*P} width={P} height={P} fill={dark} />
      
      {/* Leaf antenna */}
      <rect x={7*P} y={0*P} width={2*P} height={2*P} fill={green} />
      <rect x={8*P} y={1*P} width={P} height={P} fill={green} />
      
      {/* Arms */}
      <rect x={2*P} y={7*P} width={2*P} height={3*P} fill={wood} />
      <rect x={12*P} y={7*P} width={2*P} height={3*P} fill={wood} />
      
      {/* Feet */}
      <rect x={5*P} y={14*P} width={2*P} height={P} fill={dark} />
      <rect x={9*P} y={14*P} width={2*P} height={P} fill={dark} />
    </svg>
  );
}

// Breezy - The Notification Buddy (Air element) 💨🔔 - PIXEL ART
function BreezyBuddy({ color, isFlipped }: AvPlannerBuddyProps) {
  const dark = '#2d3436';
  const light = '#fff';
  const gold = '#fdcb6e';
  
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" style={{ transform: isFlipped ? 'scaleX(-1)' : 'none', imageRendering: 'pixelated' }}>
      {/* Shadow - smaller, floating */}
      <rect x={6*P} y={14*P} width={4*P} height={P} fill="rgba(0,0,0,0.2)" />
      
      {/* Bell body - pixel */}
      <rect x={6*P} y={4*P} width={4*P} height={P} fill={color} />
      <rect x={5*P} y={5*P} width={6*P} height={P} fill={color} />
      <rect x={4*P} y={6*P} width={8*P} height={5*P} fill={color} />
      <rect x={3*P} y={11*P} width={10*P} height={P} fill={color} />
      
      {/* Bell top */}
      <rect x={7*P} y={2*P} width={2*P} height={2*P} fill={color} />
      <rect x={7*P} y={1*P} width={2*P} height={P} fill={gold} />
      
      {/* Bell clapper */}
      <rect x={7*P} y={12*P} width={2*P} height={P} fill={gold} />
      
      {/* Eyes */}
      <rect x={5*P} y={7*P} width={2*P} height={2*P} fill={light} />
      <rect x={9*P} y={7*P} width={2*P} height={2*P} fill={light} />
      <rect x={6*P} y={8*P} width={P} height={P} fill={dark} />
      <rect x={10*P} y={8*P} width={P} height={P} fill={dark} />
      
      {/* Smile */}
      <rect x={6*P} y={10*P} width={4*P} height={P} fill={dark} />
      
      {/* Wind pixels */}
      <rect x={1*P} y={5*P} width={2*P} height={P} fill="#dfe6e9" opacity="0.6" />
      <rect x={2*P} y={6*P} width={P} height={P} fill="#dfe6e9" opacity="0.4" />
      <rect x={13*P} y={5*P} width={2*P} height={P} fill="#dfe6e9" opacity="0.6" />
      <rect x={13*P} y={6*P} width={P} height={P} fill="#dfe6e9" opacity="0.4" />
    </svg>
  );
}

// Sparky - The Reminder Buddy (Electric element) ⚡💡 - PIXEL ART
function SparkyBuddy({ color, isFlipped }: AvPlannerBuddyProps) {
  const dark = '#2d3436';
  const light = '#fff';
  const gold = '#fdcb6e';
  const gray = '#b2bec3';
  
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" style={{ transform: isFlipped ? 'scaleX(-1)' : 'none', imageRendering: 'pixelated' }}>
      {/* Shadow */}
      <rect x={5*P} y={15*P} width={6*P} height={P} fill="rgba(0,0,0,0.3)" />
      
      {/* Glow */}
      <rect x={4*P} y={3*P} width={8*P} height={8*P} fill={gold} opacity="0.2" />
      
      {/* Lightbulb glass - pixel */}
      <rect x={6*P} y={2*P} width={4*P} height={P} fill={color} />
      <rect x={5*P} y={3*P} width={6*P} height={P} fill={color} />
      <rect x={4*P} y={4*P} width={8*P} height={4*P} fill={color} />
      <rect x={5*P} y={8*P} width={6*P} height={P} fill={color} />
      <rect x={6*P} y={9*P} width={4*P} height={P} fill={color} />
      
      {/* Screw base */}
      <rect x={6*P} y={10*P} width={4*P} height={P} fill={gray} />
      <rect x={5*P} y={11*P} width={6*P} height={P} fill={dark} />
      <rect x={6*P} y={12*P} width={4*P} height={P} fill={gray} />
      <rect x={6*P} y={13*P} width={4*P} height={P} fill={dark} />
      
      {/* Eyes */}
      <rect x={5*P} y={5*P} width={2*P} height={2*P} fill={light} />
      <rect x={9*P} y={5*P} width={2*P} height={2*P} fill={light} />
      <rect x={6*P} y={6*P} width={P} height={P} fill={dark} />
      <rect x={10*P} y={6*P} width={P} height={P} fill={dark} />
      
      {/* Smile */}
      <rect x={6*P} y={8*P} width={4*P} height={P} fill={dark} />
      
      {/* Electric sparks - pixel */}
      <rect x={2*P} y={3*P} width={P} height={P} fill={gold} />
      <rect x={1*P} y={4*P} width={P} height={P} fill={gold} />
      <rect x={2*P} y={5*P} width={P} height={P} fill={gold} />
      <rect x={13*P} y={3*P} width={P} height={P} fill={gold} />
      <rect x={14*P} y={4*P} width={P} height={P} fill={gold} />
      <rect x={13*P} y={5*P} width={P} height={P} fill={gold} />
      <rect x={7*P} y={0*P} width={2*P} height={P} fill={gold} />
      
      {/* Feet */}
      <rect x={6*P} y={14*P} width={P} height={P} fill={dark} />
      <rect x={9*P} y={14*P} width={P} height={P} fill={dark} />
    </svg>
  );
}

// Boss Avatar - Deadline Monster 👹 - PIXEL ART
function BossAvatar({ color }: { color: string }) {
  const dark = '#2d3436';
  const light = '#fff';
  const red = '#d63031';
  
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {/* Shadow */}
      <rect x={4*P} y={15*P} width={8*P} height={P} fill="rgba(0,0,0,0.4)" />
      
      {/* Body - menacing shape */}
      <rect x={4*P} y={6*P} width={8*P} height={8*P} fill={color} />
      <rect x={3*P} y={8*P} width={10*P} height={4*P} fill={color} />
      
      {/* Horns */}
      <rect x={3*P} y={3*P} width={P} height={3*P} fill={dark} />
      <rect x={2*P} y={2*P} width={P} height={2*P} fill={dark} />
      <rect x={12*P} y={3*P} width={P} height={3*P} fill={dark} />
      <rect x={13*P} y={2*P} width={P} height={2*P} fill={dark} />
      
      {/* Crown spikes */}
      <rect x={5*P} y={4*P} width={P} height={2*P} fill={red} />
      <rect x={7*P} y={3*P} width={2*P} height={3*P} fill={red} />
      <rect x={10*P} y={4*P} width={P} height={2*P} fill={red} />
      
      {/* Angry eyes */}
      <rect x={4*P} y={7*P} width={3*P} height={2*P} fill={light} />
      <rect x={9*P} y={7*P} width={3*P} height={2*P} fill={light} />
      <rect x={5*P} y={8*P} width={P} height={P} fill={red} />
      <rect x={10*P} y={8*P} width={P} height={P} fill={red} />
      
      {/* Angry eyebrows */}
      <rect x={4*P} y={6*P} width={2*P} height={P} fill={dark} />
      <rect x={10*P} y={6*P} width={2*P} height={P} fill={dark} />
      
      {/* Mouth - angry teeth */}
      <rect x={5*P} y={10*P} width={6*P} height={2*P} fill={dark} />
      <rect x={6*P} y={10*P} width={P} height={P} fill={light} />
      <rect x={8*P} y={10*P} width={P} height={P} fill={light} />
      <rect x={10*P} y={10*P} width={P} height={P} fill={light} />
      
      {/* Timer on chest */}
      <rect x={6*P} y={12*P} width={4*P} height={P} fill={dark} />
      <rect x={7*P} y={12*P} width={2*P} height={P} fill={red} />
      
      {/* Claw arms */}
      <rect x={1*P} y={8*P} width={2*P} height={3*P} fill={color} />
      <rect x={0*P} y={10*P} width={P} height={2*P} fill={color} />
      <rect x={13*P} y={8*P} width={2*P} height={3*P} fill={color} />
      <rect x={15*P} y={10*P} width={P} height={2*P} fill={color} />
      
      {/* Feet */}
      <rect x={4*P} y={14*P} width={3*P} height={P} fill={dark} />
      <rect x={9*P} y={14*P} width={3*P} height={P} fill={dark} />
    </svg>
  );
}

// Tutorial Sensei Avatar 🥋 - PIXEL ART
function TutorialAvatar({ color }: { color: string }) {
  const dark = '#2d3436';
  const light = '#fff';
  const skin = '#ffeaa7';
  const red = '#d63031';
  const gray = '#dfe6e9';
  
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {/* Shadow */}
      <rect x={5*P} y={15*P} width={6*P} height={P} fill="rgba(0,0,0,0.3)" />
      
      {/* Body - robe */}
      <rect x={4*P} y={7*P} width={8*P} height={7*P} fill={color} />
      <rect x={6*P} y={8*P} width={4*P} height={6*P} fill={light} opacity="0.3" />
      
      {/* Belt */}
      <rect x={4*P} y={10*P} width={8*P} height={P} fill={dark} />
      
      {/* Head */}
      <rect x={5*P} y={2*P} width={6*P} height={5*P} fill={skin} />
      
      {/* Headband */}
      <rect x={5*P} y={3*P} width={6*P} height={P} fill={red} />
      <rect x={7*P} y={3*P} width={2*P} height={P} fill={light} />
      
      {/* Wise closed eyes */}
      <rect x={6*P} y={4*P} width={2*P} height={P} fill={dark} />
      <rect x={9*P} y={4*P} width={P} height={P} fill={dark} />
      
      {/* Beard */}
      <rect x={6*P} y={6*P} width={4*P} height={P} fill={gray} />
      <rect x={7*P} y={7*P} width={2*P} height={P} fill={gray} />
      
      {/* Arms in robe */}
      <rect x={2*P} y={9*P} width={2*P} height={3*P} fill={color} />
      <rect x={12*P} y={9*P} width={2*P} height={3*P} fill={color} />
      
      {/* Feet */}
      <rect x={5*P} y={14*P} width={2*P} height={P} fill={dark} />
      <rect x={9*P} y={14*P} width={2*P} height={P} fill={dark} />
    </svg>
  );
}

// Main AvPlanner Buddy Avatar component
function AvPlannerBuddyAvatar({ 
  element,
  color, 
  variant = 'player',
  isFlipped = false
}: AvPlannerBuddyProps) {
  // Return boss or tutorial avatar for special variants
  if (variant === 'boss') {
    return <BossAvatar color={color} />;
  }
  
  if (variant === 'tutorial') {
    return <TutorialAvatar color={color} />;
  }
  
  // Select buddy based on element
  const buddyProps = { color, variant, isFlipped };
  
  switch (element.toLowerCase()) {
    case 'fire':
      return <PlannieBuddy {...buddyProps} element={element} />;
    case 'water':
      return <ClockyBuddy {...buddyProps} element={element} />;
    case 'earth':
      return <TaskerBuddy {...buddyProps} element={element} />;
    case 'air':
      return <BreezyBuddy {...buddyProps} element={element} />;
    case 'electric':
      return <SparkyBuddy {...buddyProps} element={element} />;
    default:
      return <PlannieBuddy {...buddyProps} element={element} />;
  }
}

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
  const [damageNumbers, setDamageNumbers] = useState<{ id: string; value: number; x: number; y: number; isCrit: boolean; isPlayer?: boolean }[]>([]);
  const [isExecutingTurn, setIsExecutingTurn] = useState(false);
  const [shakeTarget, setShakeTarget] = useState<'player' | 'opponent' | null>(null);
  const [flashTarget, setFlashTarget] = useState<'player' | 'opponent' | null>(null);
  
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
  
  // Handle keyboard for dialogue advancement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (dialogue && (e.key === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        advanceDialogue();
      }
    };
    
    if (dialogue) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [dialogue, advanceDialogue]);
  
  // Handle ability selection
  const handleAbilitySelect = (ability: BuddyAbility) => {
    sounds.select();
    setSelectedAbility(ability.id);
  };
  
  // Execute turn
  const executeTurn = async () => {
    if (!selectedAbility || !battleState || isExecutingTurn) return;
    
    setIsExecutingTurn(true);
    sounds.attack();
    
    // Flash player sprite (attacking)
    setFlashTarget('player');
    setTimeout(() => setFlashTarget(null), 200);
    
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
      console.log('[BattleScreen] Turn response:', data);
      
      if (data.error) {
        console.error('[BattleScreen] Turn error:', data.error);
        sounds.error();
        setActionMessage(data.error);
        setTimeout(() => setActionMessage(null), 2500);
        return;
      }
      
      if (data.battle_state) {
        // Process turn results
        processTurnResult(data);
        setBattleState(data.battle_state);
      }
    } catch (error) {
      sounds.error();
      console.error('Turn failed:', error);
      setActionMessage('Attack failed!');
      setTimeout(() => setActionMessage(null), 1500);
    } finally {
      setIsExecutingTurn(false);
    }
    
    setSelectedAbility(null);
  };
  
  // Process turn result for animations
  const processTurnResult = (data: any) => {
    // Player's attack damage to opponent
    if (data.damage) {
      // Shake opponent when hit
      setShakeTarget('opponent');
      setTimeout(() => setShakeTarget(null), 300);
      
      const id = Date.now().toString();
      setDamageNumbers(prev => [...prev, {
        id,
        value: data.damage,
        x: 50 + Math.random() * 20,
        y: 30 + Math.random() * 10,
        isCrit: data.is_critical,
        isPlayer: false,
      }]);
      
      if (data.is_critical) {
        sounds.critical();
      } else {
        sounds.hit();
      }
      
      // Remove after animation
      setTimeout(() => {
        setDamageNumbers(prev => prev.filter(d => d.id !== id));
      }, 1500);
    }
    
    // Opponent's counter-attack damage to player
    if (data.opponent_damage) {
      setTimeout(() => {
        // Shake player when hit by opponent
        setShakeTarget('player');
        setTimeout(() => setShakeTarget(null), 300);
        
        const id = (Date.now() + 1).toString();
        setDamageNumbers(prev => [...prev, {
          id,
          value: data.opponent_damage,
          x: 20 + Math.random() * 20,
          y: 60 + Math.random() * 10,
          isCrit: data.opponent_is_critical || false,
          isPlayer: true,
        }]);
        
        if (data.opponent_is_critical) {
          sounds.critical();
        } else {
          sounds.hit();
        }
        
        setTimeout(() => {
          setDamageNumbers(prev => prev.filter(d => d.id !== id));
        }, 1500);
      }, 800); // Delay opponent attack animation
    }
    
    // Show action message
    if (data.message) {
      setActionMessage(data.message);
      setTimeout(() => setActionMessage(null), 2500);
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
      
      {/* Battle Arena - Pokemon Style Layout */}
      <div className="max-w-4xl mx-auto">
        {/* Battle Type Header */}
        <div className="text-center mb-4">
          <h1 className="retro-title">
            {battleType === 'tutorial' && 'Tutorial Battle'}
            {battleType === 'boss' && 'Boss Battle'}
            {battleType === 'pvp' && 'Team Battle'}
          </h1>
        </div>
        
        {/* Battle Field - Pokemon Style Grid */}
        <div className="relative bg-gradient-to-b from-transparent to-[#2d343640] rounded-2xl p-4 mb-4" style={{ minHeight: '320px' }}>
          
          {/* Opponent Area - TOP LEFT (like Pokemon) */}
          <div className="absolute top-2 left-2 right-1/2 pr-4">
            {/* Opponent Stats Panel */}
            <div className="retro-panel p-3 mb-2">
              <div className="flex justify-between items-start mb-1">
                <p className="retro-text-lg">{battleState.opponent.name}</p>
                <span 
                  className="element-badge"
                  style={{ backgroundColor: ELEMENT_COLORS[battleState.opponent.element] }}
                >
                  {battleState.opponent.element}
                </span>
              </div>
              <RetroProgress 
                value={battleState.opponent.current_hp}
                max={battleState.opponent.max_hp}
                label="HP"
                variant="hp"
                animate={true}
              />
            </div>
          </div>
          
          {/* Opponent Sprite - TOP CENTER-RIGHT (facing left toward player) */}
          <div className="absolute top-4 right-1/4 transform translate-x-1/2 z-10">
            <div 
              className={`buddy-sprite w-28 h-28 ${phase === 'battle' ? 'battle' : ''} ${shakeTarget === 'opponent' ? 'shake-hit' : ''} ${flashTarget === 'opponent' ? 'flash-damage' : ''}`}
              style={{
                background: `linear-gradient(180deg, ${ELEMENT_COLORS[battleState.opponent.element]}30 0%, transparent 100%)`,
              }}
            >
              <AvPlannerBuddyAvatar 
                element={battleState.opponent.element}
                color={ELEMENT_COLORS[battleState.opponent.element]}
                variant={battleState.opponent.is_npc 
                  ? (battleType === 'boss' ? 'boss' : 'tutorial')
                  : 'player'
                }
                isFlipped={true}
              />
            </div>
            
            {/* Damage numbers on opponent */}
            {damageNumbers.filter(d => !d.isPlayer).map(dmg => (
              <div 
                key={dmg.id}
                className={`damage-number ${dmg.isCrit ? 'critical' : ''}`}
                style={{ left: `${dmg.x - 30}%`, top: `${dmg.y}%` }}
              >
                {dmg.value}
              </div>
            ))}
          </div>
          
          {/* Player Sprite - BOTTOM CENTER-LEFT (facing right toward opponent) */}
          <div className="absolute bottom-16 left-1/4 transform -translate-x-1/2 z-10">
            <div 
              className={`buddy-sprite w-32 h-32 ${shakeTarget === 'player' ? 'shake-hit' : ''} ${flashTarget === 'player' ? 'flash-attack' : ''}`}
              style={{
                background: `linear-gradient(180deg, ${ELEMENT_COLORS[battleState.player_buddy.element]}30 0%, transparent 100%)`,
              }}
            >
              <AvPlannerBuddyAvatar 
                element={battleState.player_buddy.element}
                color={ELEMENT_COLORS[battleState.player_buddy.element]}
                variant="player"
                isFlipped={false}
              />
            </div>
            
            {/* Damage numbers on player */}
            {damageNumbers.filter(d => d.isPlayer).map(dmg => (
              <div 
                key={dmg.id}
                className={`damage-number ${dmg.isCrit ? 'critical' : ''}`}
                style={{ left: `${dmg.x}%`, top: `${dmg.y}%` }}
              >
                -{dmg.value}
              </div>
            ))}
          </div>
          
          {/* Player Stats Panel - BOTTOM RIGHT (like Pokemon) */}
          <div className="absolute bottom-2 right-2 left-1/2 pl-4">
            <div className="retro-panel p-3">
              <div className="flex justify-between items-start mb-1">
                <p className="retro-text-lg">{battleState.player_buddy.name}</p>
                <span 
                  className="element-badge"
                  style={{ backgroundColor: ELEMENT_COLORS[battleState.player_buddy.element] }}
                >
                  {battleState.player_buddy.element}
                </span>
              </div>
              <RetroProgress 
                value={battleState.player_buddy.current_hp}
                max={battleState.player_buddy.max_hp}
                label="HP"
                variant="hp"
                animate={true}
              />
            </div>
          </div>
          
          {/* Battle ground decoration */}
          <div className="absolute bottom-8 left-0 right-0 h-16 bg-gradient-to-t from-[#2d343680] to-transparent rounded-b-2xl" />
        </div>
        
        {/* Action Message */}
        {actionMessage && (
          <div className="dialog-box mb-4">
            <p className="dialog-text">{actionMessage}</p>
          </div>
        )}
        
        {/* Battle Menu - 4 Moves Max (Pokemon style) */}
        {phase === 'battle' && battleState.is_player_turn && (
          <div className="retro-panel">
            <p className="retro-text text-xs mb-3" style={{ color: '#fdcb6e' }}>Choose your move:</p>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {battleState.available_abilities.slice(0, 4).map(ability => {
                const isOnCooldown = (battleState.player_buddy.ability_cooldowns[ability.id] || 0) > 0;
                const isHealing = ability.effect_type === 'heal';
                
                return (
                  <button
                    key={ability.id}
                    className={`retro-btn text-xs py-3 ${
                      selectedAbility === ability.id 
                        ? 'ring-2 ring-[#fdcb6e]' 
                        : ''
                    } ${isOnCooldown ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !isOnCooldown && handleAbilitySelect(ability)}
                    disabled={isOnCooldown}
                    title={isOnCooldown ? `On cooldown for ${battleState.player_buddy.ability_cooldowns[ability.id]} more turns` : ''}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {ability.name}
                      {isHealing && <span>💚</span>}
                      {isOnCooldown && <span>❌</span>}
                    </div>
                    <div className="text-xxs mt-1 opacity-75">
                      {ability.element !== 'neutral' && (
                        <span 
                          className="inline-block w-2 h-2 rounded-full mr-1"
                          style={{ backgroundColor: ELEMENT_COLORS[ability.element as keyof typeof ELEMENT_COLORS] }}
                        />
                      )}
                      {isHealing ? `HEAL: ${ability.effect_value || ability.damage_base}` : `PWR: ${ability.damage_base}`}
                      {ability.cooldown_turns > 0 && ` • CD: ${ability.cooldown_turns}`}
                    </div>
                    {isOnCooldown && (
                      <div className="text-xs mt-1 font-semibold" style={{ color: '#ff7675' }}>
                        Cooldown: {battleState.player_buddy.ability_cooldowns[ability.id]} turns left
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
                disabled={!selectedAbility || isExecutingTurn}
              >
                {isExecutingTurn ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-pulse">⚔️</span>
                    Attacking...
                  </span>
                ) : (
                  'Attack!'
                )}
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

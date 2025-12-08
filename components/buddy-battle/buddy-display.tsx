'use client';

// =====================================================
// BUDDY BATTLE - Buddy Display Component
// Shows the buddy sprite with level/HP info
// =====================================================

import React from 'react';
import type { PlayerBuddyWithDetails } from '@/lib/buddy-battle/types';
import { ELEMENT_COLORS } from '@/lib/buddy-battle/types';

interface BuddyDisplayProps {
  buddy: PlayerBuddyWithDetails;
  onUpgrade?: () => void;
  size?: 'small' | 'medium' | 'large';
  showStats?: boolean;
}

export function BuddyDisplay({ 
  buddy, 
  onUpgrade,
  size = 'medium',
  showStats = true 
}: BuddyDisplayProps) {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48',
  };
  
  const hpPercent = (buddy.current_hp / buddy.max_hp) * 100;
  const hpClass = hpPercent <= 20 ? 'critical' : hpPercent <= 50 ? 'low' : '';
  
  const elementColor = ELEMENT_COLORS[buddy.buddy_type?.element || 'earth'];
  
  return (
    <div className="retro-panel">
      {/* Buddy name and level */}
      <div className="flex justify-between items-center mb-2">
        <span className="retro-text-lg">
          {buddy.nickname || buddy.buddy_type?.name || 'Buddy'}
        </span>
        <span 
          className="element-badge"
          style={{ backgroundColor: elementColor }}
        >
          {buddy.buddy_type?.element}
        </span>
      </div>
      
      {/* Level */}
      <div className="flex justify-between items-center mb-3">
        <span className="retro-text">Lv.</span>
        <span className="retro-text-xl text-retro-yellow">{buddy.level}</span>
      </div>
      
      {/* Buddy sprite */}
      <div className="flex justify-center mb-4">
        <div 
          className={`buddy-sprite ${sizeClasses[size]}`}
          style={{
            background: `linear-gradient(180deg, ${buddy.color_primary}40 0%, transparent 100%)`,
          }}
        >
          <PixelBuddy 
            type={buddy.buddy_type?.name || 'Blazor'}
            primaryColor={buddy.color_primary}
            secondaryColor={buddy.color_secondary}
            accentColor={buddy.color_accent}
            element={buddy.buddy_type?.element}
          />
        </div>
      </div>
      
      {showStats && (
        <>
          {/* HP Bar */}
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1">
              <span className="retro-text text-xs">HP</span>
              <span className="retro-text text-xs">
                {buddy.current_hp}/{buddy.max_hp}
              </span>
            </div>
            <div className="hp-bar-container">
              <div 
                className={`hp-bar ${hpClass}`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>
          
          {/* XP Bar */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="retro-text text-xs">XP</span>
              <span className="retro-text text-xs">
                {buddy.experience}/{buddy.level * 10 + (buddy.level - 1) * 5}
              </span>
            </div>
            <div className="xp-bar-container">
              <div 
                className="xp-bar"
                style={{ 
                  width: `${(buddy.experience / (buddy.level * 10 + (buddy.level - 1) * 5)) * 100}%` 
                }}
              />
            </div>
          </div>
          
          {/* Anxiety indicator */}
          {buddy.anxiety_level > 0 && (
            <div className="flex items-center gap-2 text-retro-red">
              <span className="retro-text text-xs">😰 Anxiety:</span>
              <span className="retro-text text-xs">{buddy.anxiety_level}%</span>
            </div>
          )}
          
          {/* Upgrade button */}
          {onUpgrade && (
            <button 
              className="retro-btn retro-btn-primary w-full mt-3"
              onClick={onUpgrade}
            >
              Upgrade Stats
            </button>
          )}
        </>
      )}
    </div>
  );
}

// =====================================================
// AvPlanner Buddy Avatars - TRUE PIXEL ART STYLE
// Like Habbo Hotel / Mario Bros - blocky 8-bit pixels
// =====================================================

// Helper: Create pixel grid for true retro look
const Pixel = ({ x, y, color, size = 3 }: { x: number; y: number; color: string; size?: number }) => (
  <rect x={x * size} y={y * size} width={size} height={size} fill={color} />
);

// Plannie - The Calendar Buddy (Fire element) 🔥📅 - PIXEL ART
function PlannieBuddy({ color }: { color: string }) {
  const p = 3; // pixel size
  const dark = '#2d3436';
  const light = '#fff';
  const red = '#d63031';
  const skin = '#ffeaa7';
  
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {/* Shadow */}
      <rect x={6*p} y={15*p} width={4*p} height={p} fill="rgba(0,0,0,0.3)" />
      
      {/* Calendar body - blocky */}
      <rect x={3*p} y={4*p} width={10*p} height={10*p} fill={color} />
      <rect x={3*p} y={4*p} width={10*p} height={2*p} fill={red} />
      
      {/* Calendar rings */}
      <rect x={5*p} y={3*p} width={p} height={2*p} fill={dark} />
      <rect x={10*p} y={3*p} width={p} height={2*p} fill={dark} />
      
      {/* Calendar grid */}
      <rect x={4*p} y={7*p} width={8*p} height={p} fill={light} opacity="0.5" />
      <rect x={4*p} y={9*p} width={8*p} height={p} fill={light} opacity="0.5" />
      <rect x={4*p} y={11*p} width={8*p} height={p} fill={light} opacity="0.5" />
      
      {/* Eyes - pixel style */}
      <rect x={5*p} y={8*p} width={2*p} height={2*p} fill={light} />
      <rect x={9*p} y={8*p} width={2*p} height={2*p} fill={light} />
      <rect x={6*p} y={9*p} width={p} height={p} fill={dark} />
      <rect x={10*p} y={9*p} width={p} height={p} fill={dark} />
      
      {/* Smile - pixel */}
      <rect x={6*p} y={11*p} width={p} height={p} fill={dark} />
      <rect x={7*p} y={12*p} width={2*p} height={p} fill={dark} />
      <rect x={9*p} y={11*p} width={p} height={p} fill={dark} />
      
      {/* Flame hair - pixel */}
      <rect x={7*p} y={1*p} width={2*p} height={p} fill="#ff7675" />
      <rect x={6*p} y={2*p} width={p} height={p} fill="#ff7675" />
      <rect x={8*p} y={2*p} width={2*p} height={p} fill="#fab1a0" />
      <rect x={7*p} y={3*p} width={2*p} height={p} fill="#fab1a0" />
      
      {/* Arms - pixel */}
      <rect x={1*p} y={8*p} width={2*p} height={3*p} fill={color} />
      <rect x={13*p} y={8*p} width={2*p} height={3*p} fill={color} />
      <rect x={1*p} y={10*p} width={p} height={p} fill={skin} />
      <rect x={14*p} y={10*p} width={p} height={p} fill={skin} />
      
      {/* Feet - pixel */}
      <rect x={4*p} y={14*p} width={2*p} height={p} fill={dark} />
      <rect x={10*p} y={14*p} width={2*p} height={p} fill={dark} />
    </svg>
  );
}

// Clocky - The Time Buddy (Water element) 💧⏰ - PIXEL ART
function ClockyBuddy({ color }: { color: string }) {
  const p = 3;
  const dark = '#2d3436';
  const light = '#fff';
  const water = '#74b9ff';
  
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {/* Shadow */}
      <rect x={5*p} y={15*p} width={6*p} height={p} fill="rgba(0,0,0,0.3)" />
      
      {/* Clock body - octagon-ish pixel circle */}
      <rect x={5*p} y={3*p} width={6*p} height={p} fill={color} />
      <rect x={4*p} y={4*p} width={8*p} height={p} fill={color} />
      <rect x={3*p} y={5*p} width={10*p} height={6*p} fill={color} />
      <rect x={4*p} y={11*p} width={8*p} height={p} fill={color} />
      <rect x={5*p} y={12*p} width={6*p} height={p} fill={color} />
      
      {/* Clock face */}
      <rect x={5*p} y={5*p} width={6*p} height={5*p} fill={light} />
      
      {/* Clock hands */}
      <rect x={7*p} y={5*p} width={p} height={3*p} fill={dark} />
      <rect x={8*p} y={7*p} width={2*p} height={p} fill={dark} />
      
      {/* Hour markers */}
      <rect x={7*p} y={4*p} width={p} height={p} fill={color} />
      <rect x={7*p} y={10*p} width={p} height={p} fill={color} />
      <rect x={4*p} y={7*p} width={p} height={p} fill={color} />
      <rect x={10*p} y={7*p} width={p} height={p} fill={color} />
      
      {/* Eyes */}
      <rect x={5*p} y={6*p} width={2*p} height={2*p} fill={light} />
      <rect x={8*p} y={6*p} width={2*p} height={2*p} fill={light} />
      <rect x={6*p} y={7*p} width={p} height={p} fill={dark} />
      <rect x={9*p} y={7*p} width={p} height={p} fill={dark} />
      
      {/* Smile */}
      <rect x={6*p} y={9*p} width={3*p} height={p} fill={dark} />
      
      {/* Water drop antenna */}
      <rect x={7*p} y={1*p} width={p} height={2*p} fill={water} />
      <rect x={6*p} y={2*p} width={3*p} height={p} fill={water} />
      
      {/* Feet */}
      <rect x={5*p} y={13*p} width={2*p} height={p} fill={dark} />
      <rect x={9*p} y={13*p} width={2*p} height={p} fill={dark} />
    </svg>
  );
}

// Tasker - The Checklist Buddy (Earth element) 🌍✅ - PIXEL ART
function TaskerBuddy({ color }: { color: string }) {
  const p = 3;
  const dark = '#2d3436';
  const light = '#fff';
  const wood = '#a0826d';
  const green = '#00b894';
  
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {/* Shadow */}
      <rect x={5*p} y={15*p} width={6*p} height={p} fill="rgba(0,0,0,0.3)" />
      
      {/* Clipboard body */}
      <rect x={4*p} y={3*p} width={8*p} height={11*p} fill={wood} />
      <rect x={5*p} y={5*p} width={6*p} height={8*p} fill={light} />
      
      {/* Clipboard clip */}
      <rect x={6*p} y={2*p} width={4*p} height={2*p} fill="#b2bec3" />
      <rect x={7*p} y={3*p} width={2*p} height={p} fill="#636e72" />
      
      {/* Checklist items */}
      <rect x={5*p} y={6*p} width={p} height={p} fill={color} />
      <rect x={6*p} y={6*p} width={4*p} height={p} fill="#dfe6e9" />
      <rect x={5*p} y={8*p} width={p} height={p} fill={color} />
      <rect x={6*p} y={8*p} width={4*p} height={p} fill="#dfe6e9" />
      <rect x={5*p} y={10*p} width={p} height={p} fill="#b2bec3" />
      <rect x={6*p} y={10*p} width={4*p} height={p} fill="#dfe6e9" />
      
      {/* Eyes on clip area */}
      <rect x={6*p} y={3*p} width={p} height={p} fill={light} />
      <rect x={9*p} y={3*p} width={p} height={p} fill={light} />
      <rect x={6*p} y={3*p} width={p} height={p} fill={dark} />
      <rect x={9*p} y={3*p} width={p} height={p} fill={dark} />
      
      {/* Leaf antenna */}
      <rect x={7*p} y={0*p} width={2*p} height={2*p} fill={green} />
      <rect x={8*p} y={1*p} width={p} height={p} fill={green} />
      
      {/* Arms */}
      <rect x={2*p} y={7*p} width={2*p} height={3*p} fill={wood} />
      <rect x={12*p} y={7*p} width={2*p} height={3*p} fill={wood} />
      
      {/* Feet */}
      <rect x={5*p} y={14*p} width={2*p} height={p} fill={dark} />
      <rect x={9*p} y={14*p} width={2*p} height={p} fill={dark} />
    </svg>
  );
}

// Breezy - The Notification Buddy (Air element) 💨🔔 - PIXEL ART
function BreezyBuddy({ color }: { color: string }) {
  const p = 3;
  const dark = '#2d3436';
  const light = '#fff';
  const gold = '#fdcb6e';
  
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {/* Shadow - smaller, floating */}
      <rect x={6*p} y={14*p} width={4*p} height={p} fill="rgba(0,0,0,0.2)" />
      
      {/* Bell body - pixel */}
      <rect x={6*p} y={4*p} width={4*p} height={p} fill={color} />
      <rect x={5*p} y={5*p} width={6*p} height={p} fill={color} />
      <rect x={4*p} y={6*p} width={8*p} height={5*p} fill={color} />
      <rect x={3*p} y={11*p} width={10*p} height={p} fill={color} />
      
      {/* Bell top */}
      <rect x={7*p} y={2*p} width={2*p} height={2*p} fill={color} />
      <rect x={7*p} y={1*p} width={2*p} height={p} fill={gold} />
      
      {/* Bell clapper */}
      <rect x={7*p} y={12*p} width={2*p} height={p} fill={gold} />
      
      {/* Eyes */}
      <rect x={5*p} y={7*p} width={2*p} height={2*p} fill={light} />
      <rect x={9*p} y={7*p} width={2*p} height={2*p} fill={light} />
      <rect x={6*p} y={8*p} width={p} height={p} fill={dark} />
      <rect x={10*p} y={8*p} width={p} height={p} fill={dark} />
      
      {/* Smile */}
      <rect x={6*p} y={10*p} width={4*p} height={p} fill={dark} />
      
      {/* Wind pixels */}
      <rect x={1*p} y={5*p} width={2*p} height={p} fill="#dfe6e9" opacity="0.6" />
      <rect x={2*p} y={6*p} width={p} height={p} fill="#dfe6e9" opacity="0.4" />
      <rect x={13*p} y={5*p} width={2*p} height={p} fill="#dfe6e9" opacity="0.6" />
      <rect x={13*p} y={6*p} width={p} height={p} fill="#dfe6e9" opacity="0.4" />
    </svg>
  );
}

// Sparky - The Reminder Buddy (Electric element) ⚡💡 - PIXEL ART
function SparkyBuddy({ color }: { color: string }) {
  const p = 3;
  const dark = '#2d3436';
  const light = '#fff';
  const gold = '#fdcb6e';
  const gray = '#b2bec3';
  
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {/* Shadow */}
      <rect x={5*p} y={15*p} width={6*p} height={p} fill="rgba(0,0,0,0.3)" />
      
      {/* Glow */}
      <rect x={4*p} y={3*p} width={8*p} height={8*p} fill={gold} opacity="0.2" />
      
      {/* Lightbulb glass - pixel */}
      <rect x={6*p} y={2*p} width={4*p} height={p} fill={color} />
      <rect x={5*p} y={3*p} width={6*p} height={p} fill={color} />
      <rect x={4*p} y={4*p} width={8*p} height={4*p} fill={color} />
      <rect x={5*p} y={8*p} width={6*p} height={p} fill={color} />
      <rect x={6*p} y={9*p} width={4*p} height={p} fill={color} />
      
      {/* Screw base */}
      <rect x={6*p} y={10*p} width={4*p} height={p} fill={gray} />
      <rect x={5*p} y={11*p} width={6*p} height={p} fill={dark} />
      <rect x={6*p} y={12*p} width={4*p} height={p} fill={gray} />
      <rect x={6*p} y={13*p} width={4*p} height={p} fill={dark} />
      
      {/* Eyes */}
      <rect x={5*p} y={5*p} width={2*p} height={2*p} fill={light} />
      <rect x={9*p} y={5*p} width={2*p} height={2*p} fill={light} />
      <rect x={6*p} y={6*p} width={p} height={p} fill={dark} />
      <rect x={10*p} y={6*p} width={p} height={p} fill={dark} />
      
      {/* Smile */}
      <rect x={6*p} y={8*p} width={4*p} height={p} fill={dark} />
      
      {/* Electric sparks - pixel */}
      <rect x={2*p} y={3*p} width={p} height={p} fill={gold} />
      <rect x={1*p} y={4*p} width={p} height={p} fill={gold} />
      <rect x={2*p} y={5*p} width={p} height={p} fill={gold} />
      <rect x={13*p} y={3*p} width={p} height={p} fill={gold} />
      <rect x={14*p} y={4*p} width={p} height={p} fill={gold} />
      <rect x={13*p} y={5*p} width={p} height={p} fill={gold} />
      <rect x={7*p} y={0*p} width={2*p} height={p} fill={gold} />
      
      {/* Feet */}
      <rect x={6*p} y={14*p} width={p} height={p} fill={dark} />
      <rect x={9*p} y={14*p} width={p} height={p} fill={dark} />
    </svg>
  );
}

// Main PixelBuddy component - selects the right buddy based on element
export function PixelBuddy({ 
  type, 
  primaryColor, 
  secondaryColor,
  accentColor,
  element
}: { 
  type: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  element?: string;
}) {
  // Determine element from type name if not provided
  const buddyElement = element?.toLowerCase() || 
    (type.toLowerCase().includes('blaz') ? 'fire' :
     type.toLowerCase().includes('aqua') || type.toLowerCase().includes('tidal') ? 'water' :
     type.toLowerCase().includes('terra') || type.toLowerCase().includes('stone') ? 'earth' :
     type.toLowerCase().includes('zeph') || type.toLowerCase().includes('wind') ? 'air' :
     type.toLowerCase().includes('volt') || type.toLowerCase().includes('spark') ? 'electric' :
     'fire');
  
  switch (buddyElement) {
    case 'fire':
      return <PlannieBuddy color={primaryColor} />;
    case 'water':
      return <ClockyBuddy color={primaryColor} />;
    case 'earth':
      return <TaskerBuddy color={primaryColor} />;
    case 'air':
      return <BreezyBuddy color={primaryColor} />;
    case 'electric':
      return <SparkyBuddy color={primaryColor} />;
    default:
      return <PlannieBuddy color={primaryColor} />;
  }
}

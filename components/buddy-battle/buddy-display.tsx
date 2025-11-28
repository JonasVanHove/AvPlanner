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
            background: `linear-gradient(135deg, ${buddy.color_primary} 0%, ${buddy.color_secondary} 100%)`,
          }}
        >
          {/* Pixel art placeholder - would be replaced with actual sprites */}
          <PixelBuddy 
            type={buddy.buddy_type?.name || 'Blazor'}
            primaryColor={buddy.color_primary}
            secondaryColor={buddy.color_secondary}
            accentColor={buddy.color_accent}
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

// Simple pixel art buddy representation using CSS
export function PixelBuddy({ 
  type, 
  primaryColor, 
  secondaryColor,
  accentColor 
}: { 
  type: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}) {
  // This is a simplified SVG representation
  // In production, you'd use actual pixel art sprites
  
  return (
    <svg 
      viewBox="0 0 16 16" 
      className="w-full h-full"
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Base body */}
      <rect x="4" y="6" width="8" height="8" fill={primaryColor} />
      {/* Head */}
      <rect x="3" y="2" width="10" height="6" fill={primaryColor} />
      {/* Eyes */}
      <rect x="5" y="4" width="2" height="2" fill="#fff" />
      <rect x="9" y="4" width="2" height="2" fill="#fff" />
      <rect x="6" y="5" width="1" height="1" fill="#000" />
      <rect x="10" y="5" width="1" height="1" fill="#000" />
      {/* Accent detail */}
      <rect x="6" y="8" width="4" height="2" fill={secondaryColor} />
      {/* Highlight */}
      <rect x="4" y="3" width="2" height="1" fill={accentColor} />
      {/* Feet */}
      <rect x="4" y="14" width="3" height="2" fill={secondaryColor} />
      <rect x="9" y="14" width="3" height="2" fill={secondaryColor} />
    </svg>
  );
}

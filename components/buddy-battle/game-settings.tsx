'use client';

// =====================================================
// BUDDY BATTLE - Game Settings Component
// Music, SFX, and other game options
// =====================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { RetroButton } from './ui/retro-button';

interface GameSettingsProps {
  teamId: string;
}

// Local storage keys
const STORAGE_KEYS = {
  MUSIC_ENABLED: 'buddy-battle-music-enabled',
  SFX_ENABLED: 'buddy-battle-sfx-enabled',
  SHOW_DAMAGE_NUMBERS: 'buddy-battle-damage-numbers',
  BATTLE_SPEED: 'buddy-battle-speed',
  SHOW_TUTORIALS: 'buddy-battle-tutorials',
};

export function GameSettings({ teamId }: GameSettingsProps) {
  const router = useRouter();
  const { sounds, isMuted, toggleMute } = useRetroSounds();
  
  // Settings state
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [showDamageNumbers, setShowDamageNumbers] = useState(true);
  const [battleSpeed, setBattleSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [showTutorials, setShowTutorials] = useState(true);
  
  // Load settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMusic = localStorage.getItem(STORAGE_KEYS.MUSIC_ENABLED);
      const savedSfx = localStorage.getItem(STORAGE_KEYS.SFX_ENABLED);
      const savedDamage = localStorage.getItem(STORAGE_KEYS.SHOW_DAMAGE_NUMBERS);
      const savedSpeed = localStorage.getItem(STORAGE_KEYS.BATTLE_SPEED);
      const savedTutorials = localStorage.getItem(STORAGE_KEYS.SHOW_TUTORIALS);
      
      if (savedMusic !== null) setMusicEnabled(savedMusic === 'true');
      if (savedSfx !== null) setSfxEnabled(savedSfx === 'true');
      if (savedDamage !== null) setShowDamageNumbers(savedDamage === 'true');
      if (savedSpeed !== null) setBattleSpeed(savedSpeed as 'slow' | 'normal' | 'fast');
      if (savedTutorials !== null) setShowTutorials(savedTutorials === 'true');
    }
  }, []);
  
  // Save settings to localStorage
  const saveSetting = (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  };
  
  // Toggle handlers
  const handleMusicToggle = () => {
    const newValue = !musicEnabled;
    setMusicEnabled(newValue);
    saveSetting(STORAGE_KEYS.MUSIC_ENABLED, String(newValue));
    if (!newValue && !isMuted) {
      toggleMute(); // Mute all sounds when music is disabled
    }
    sounds.select();
  };
  
  const handleSfxToggle = () => {
    const newValue = !sfxEnabled;
    setSfxEnabled(newValue);
    saveSetting(STORAGE_KEYS.SFX_ENABLED, String(newValue));
    
    // Toggle mute based on both music and sfx
    if (!newValue && !musicEnabled && !isMuted) {
      toggleMute();
    } else if ((newValue || musicEnabled) && isMuted) {
      toggleMute();
    }
    
    if (newValue) sounds.select(); // Play sound to confirm
  };
  
  const handleDamageNumbersToggle = () => {
    const newValue = !showDamageNumbers;
    setShowDamageNumbers(newValue);
    saveSetting(STORAGE_KEYS.SHOW_DAMAGE_NUMBERS, String(newValue));
    sounds.select();
  };
  
  const handleBattleSpeedChange = (speed: 'slow' | 'normal' | 'fast') => {
    setBattleSpeed(speed);
    saveSetting(STORAGE_KEYS.BATTLE_SPEED, speed);
    sounds.select();
  };
  
  const handleTutorialsToggle = () => {
    const newValue = !showTutorials;
    setShowTutorials(newValue);
    saveSetting(STORAGE_KEYS.SHOW_TUTORIALS, String(newValue));
    sounds.select();
  };
  
  return (
    <div className="buddy-battle-container min-h-screen p-4">
      <div className="scanlines" />
      
      {/* Header */}
      <header className="mb-6">
        <h1 className="retro-title text-center mb-2">⚙️ SETTINGS ⚙️</h1>
        <p className="retro-text text-center text-gb-light-green">
          Customize your game experience
        </p>
      </header>
      
      <div className="max-w-lg mx-auto space-y-4">
        
        {/* Audio Settings */}
        <div className="retro-panel p-4">
          <h3 className="retro-text-lg text-retro-lime mb-4 text-center">🔊 Audio</h3>
          
          {/* Music Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gb-dark-green">
            <div>
              <p className="retro-text">🎵 Music</p>
              <p className="retro-text text-xs text-gb-dark-green">Background music</p>
            </div>
            <ToggleSwitch 
              enabled={musicEnabled} 
              onToggle={handleMusicToggle}
            />
          </div>
          
          {/* SFX Toggle */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="retro-text">🔔 Sound Effects</p>
              <p className="retro-text text-xs text-gb-dark-green">Battle sounds, UI clicks</p>
            </div>
            <ToggleSwitch 
              enabled={sfxEnabled} 
              onToggle={handleSfxToggle}
            />
          </div>
        </div>
        
        {/* Battle Settings */}
        <div className="retro-panel p-4">
          <h3 className="retro-text-lg text-retro-lime mb-4 text-center">⚔️ Battle</h3>
          
          {/* Damage Numbers */}
          <div className="flex items-center justify-between py-3 border-b border-gb-dark-green">
            <div>
              <p className="retro-text">💥 Damage Numbers</p>
              <p className="retro-text text-xs text-gb-dark-green">Show floating damage</p>
            </div>
            <ToggleSwitch 
              enabled={showDamageNumbers} 
              onToggle={handleDamageNumbersToggle}
            />
          </div>
          
          {/* Battle Speed */}
          <div className="py-3">
            <p className="retro-text mb-2">⚡ Battle Speed</p>
            <div className="flex gap-2">
              {(['slow', 'normal', 'fast'] as const).map(speed => (
                <button
                  key={speed}
                  onClick={() => handleBattleSpeedChange(speed)}
                  className={`retro-btn flex-1 text-xs ${
                    battleSpeed === speed ? 'retro-btn-primary' : ''
                  }`}
                >
                  {speed === 'slow' ? '🐢' : speed === 'normal' ? '🚶' : '🏃'} 
                  {speed.charAt(0).toUpperCase() + speed.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* General Settings */}
        <div className="retro-panel p-4">
          <h3 className="retro-text-lg text-retro-lime mb-4 text-center">📋 General</h3>
          
          {/* Tutorials */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="retro-text">📚 Show Tutorials</p>
              <p className="retro-text text-xs text-gb-dark-green">Helpful tips & hints</p>
            </div>
            <ToggleSwitch 
              enabled={showTutorials} 
              onToggle={handleTutorialsToggle}
            />
          </div>
        </div>
        
        {/* Navigation */}
        <div className="retro-panel p-4">
          <h3 className="retro-text-lg text-retro-lime mb-4 text-center">🚪 Navigation</h3>
          
          {/* Back to AvPlanner */}
          <RetroButton 
            onClick={() => {
              sounds.confirm();
              router.push(`/team/${teamId}`);
            }}
            className="w-full mb-3"
          >
            📅 Back to AvPlanner
          </RetroButton>
          
          {/* Back to Buddy Menu */}
          <RetroButton 
            onClick={() => {
              sounds.cancel();
              router.push(`/team/${teamId}/buddy`);
            }}
            className="w-full"
            variant="primary"
          >
            ← Back to Buddy Menu
          </RetroButton>
        </div>
        
        {/* Credits */}
        <div className="retro-panel p-4 text-center">
          <p className="retro-text text-xs text-gb-dark-green mb-2">
            Buddy Battle v1.0
          </p>
          <p className="retro-text text-xs text-gb-dark-green">
            🎮 Made with ❤️ for AvPlanner
          </p>
        </div>
      </div>
    </div>
  );
}

// Toggle Switch Component - Retro pixel style
function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex items-center focus:outline-none"
      aria-checked={enabled}
      role="switch"
    >
      {/* Track */}
      <div 
        className={`
          w-12 h-6 rounded border-2 transition-colors duration-150
          ${enabled 
            ? 'bg-green-500 border-green-700' 
            : 'bg-gray-600 border-gray-800'
          }
        `}
        style={{
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)'
        }}
      >
        {/* Thumb/Knob */}
        <div
          className={`
            absolute top-0.5 w-5 h-5 rounded transition-all duration-150
            ${enabled 
              ? 'left-6 bg-white border-green-300' 
              : 'left-0.5 bg-gray-300 border-gray-500'
            }
            border-2
          `}
          style={{
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
          }}
        />
      </div>
      
      {/* Status text */}
      <span className={`ml-2 retro-text text-xs ${enabled ? 'text-green-400' : 'text-gray-500'}`}>
        {enabled ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

// Hook to read settings anywhere in the app
export function useGameSettings() {
  const [settings, setSettings] = useState({
    musicEnabled: true,
    sfxEnabled: true,
    showDamageNumbers: true,
    battleSpeed: 'normal' as 'slow' | 'normal' | 'fast',
    showTutorials: true,
  });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSettings({
        musicEnabled: localStorage.getItem(STORAGE_KEYS.MUSIC_ENABLED) !== 'false',
        sfxEnabled: localStorage.getItem(STORAGE_KEYS.SFX_ENABLED) !== 'false',
        showDamageNumbers: localStorage.getItem(STORAGE_KEYS.SHOW_DAMAGE_NUMBERS) !== 'false',
        battleSpeed: (localStorage.getItem(STORAGE_KEYS.BATTLE_SPEED) || 'normal') as 'slow' | 'normal' | 'fast',
        showTutorials: localStorage.getItem(STORAGE_KEYS.SHOW_TUTORIALS) !== 'false',
      });
    }
  }, []);
  
  return settings;
}

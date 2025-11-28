'use client';

// =====================================================
// BUDDY BATTLE - Sound Effects Hook
// 8-bit audio system
// =====================================================

import { useCallback, useRef, useState, useEffect } from 'react';

// Web Audio API context
let audioContext: AudioContext | null = null;

// Sound effect definitions using oscillator synthesis
const SOUNDS = {
  // UI Sounds
  menu_select: { frequency: 440, duration: 0.1, type: 'square' as OscillatorType },
  menu_confirm: { frequency: 880, duration: 0.15, type: 'square' as OscillatorType },
  menu_cancel: { frequency: 220, duration: 0.1, type: 'square' as OscillatorType },
  menu_error: { frequency: 100, duration: 0.2, type: 'sawtooth' as OscillatorType },
  
  // Battle Sounds
  attack: { frequency: 200, duration: 0.1, type: 'sawtooth' as OscillatorType, sweep: true },
  hit: { frequency: 150, duration: 0.15, type: 'square' as OscillatorType },
  critical: { frequency: 600, duration: 0.2, type: 'square' as OscillatorType, sweep: true },
  miss: { frequency: 100, duration: 0.3, type: 'sine' as OscillatorType },
  heal: { frequency: 523, duration: 0.3, type: 'sine' as OscillatorType, arpeggio: true },
  
  // Level/XP Sounds
  level_up: { frequency: 523, duration: 0.5, type: 'square' as OscillatorType, fanfare: true },
  xp_gain: { frequency: 660, duration: 0.1, type: 'triangle' as OscillatorType },
  point_earn: { frequency: 880, duration: 0.08, type: 'square' as OscillatorType },
  
  // Shop Sounds
  purchase: { frequency: 440, duration: 0.15, type: 'triangle' as OscillatorType },
  coin: { frequency: 1320, duration: 0.1, type: 'square' as OscillatorType },
  
  // Victory/Defeat
  victory: { frequency: 523, duration: 0.8, type: 'square' as OscillatorType, fanfare: true },
  defeat: { frequency: 220, duration: 0.6, type: 'sawtooth' as OscillatorType, descend: true },
  
  // Boss
  boss_appear: { frequency: 80, duration: 0.5, type: 'sawtooth' as OscillatorType },
  
  // Notifications
  notification: { frequency: 880, duration: 0.15, type: 'sine' as OscillatorType },
  achievement: { frequency: 659, duration: 0.4, type: 'square' as OscillatorType, fanfare: true },
};

type SoundName = keyof typeof SOUNDS;

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  sweep?: boolean;
  arpeggio?: boolean;
  fanfare?: boolean;
  descend?: boolean;
}

export function useRetroSounds() {
  const [isMuted, setIsMuted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize audio context on user interaction
  const initAudio = useCallback(() => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      setIsInitialized(true);
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }, []);
  
  // Play a synthesized sound
  const playSound = useCallback((soundName: SoundName) => {
    if (isMuted || !audioContext) return;
    
    const config = SOUNDS[soundName] as SoundConfig;
    if (!config) return;
    
    try {
      const now = audioContext.currentTime;
      
      // Create oscillator
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, now);
      
      // Apply effects
      if (config.sweep) {
        oscillator.frequency.exponentialRampToValueAtTime(
          config.frequency * 0.5,
          now + config.duration
        );
      }
      
      if (config.descend) {
        oscillator.frequency.exponentialRampToValueAtTime(
          config.frequency * 0.25,
          now + config.duration
        );
      }
      
      if (config.fanfare) {
        // Play ascending notes
        const notes = [1, 1.25, 1.5, 2];
        notes.forEach((mult, i) => {
          oscillator.frequency.setValueAtTime(
            config.frequency * mult,
            now + (i * config.duration / notes.length)
          );
        });
      }
      
      if (config.arpeggio) {
        const notes = [1, 1.2, 1.5, 1.2, 1];
        notes.forEach((mult, i) => {
          oscillator.frequency.setValueAtTime(
            config.frequency * mult,
            now + (i * config.duration / notes.length)
          );
        });
      }
      
      // Envelope
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
      
      // Connect and play
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(now);
      oscillator.stop(now + config.duration);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [isMuted]);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);
  
  // Shortcut methods
  const sounds = {
    // UI
    select: () => playSound('menu_select'),
    confirm: () => playSound('menu_confirm'),
    cancel: () => playSound('menu_cancel'),
    error: () => playSound('menu_error'),
    
    // Battle
    attack: () => playSound('attack'),
    hit: () => playSound('hit'),
    critical: () => playSound('critical'),
    miss: () => playSound('miss'),
    heal: () => playSound('heal'),
    
    // Progress
    levelUp: () => playSound('level_up'),
    xpGain: () => playSound('xp_gain'),
    pointEarn: () => playSound('point_earn'),
    
    // Shop
    purchase: () => playSound('purchase'),
    coin: () => playSound('coin'),
    
    // Results
    victory: () => playSound('victory'),
    defeat: () => playSound('defeat'),
    
    // Other
    bossAppear: () => playSound('boss_appear'),
    notification: () => playSound('notification'),
    achievement: () => playSound('achievement'),
  };
  
  return {
    sounds,
    isMuted,
    toggleMute,
    initAudio,
    isInitialized,
  };
}

// Play sound on button click
export function withSound<T extends (...args: any[]) => any>(
  fn: T,
  playFn: () => void
): T {
  return ((...args: Parameters<T>) => {
    playFn();
    return fn(...args);
  }) as T;
}

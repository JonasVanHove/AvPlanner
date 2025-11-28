'use client';

// =====================================================
// BUDDY BATTLE - Buddy Setup Component
// Character creation screen
// =====================================================

import React, { useState, useEffect } from 'react';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { ELEMENT_COLORS, BuddyElement } from '@/lib/buddy-battle/types';
import { supabase } from '@/lib/supabase';

interface BuddySetupProps {
  teamId: string;
  onComplete: () => void;
}

// Local type for buddy types from API (which may have different format)
interface ApiBuddyType {
  id: string;
  name: string;
  description: string;
  element: BuddyElement;
  // Support both formats
  base_hp?: number;
  base_attack?: number;
  base_defense?: number;
  base_speed?: number;
  base_stats?: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    critical?: number;
  };
  sprite_color?: string;
  abilities?: string[];
  personality?: string;
  lore?: string;
}

// Helper to get stats from either format
function getStats(type: ApiBuddyType) {
  if (type.base_stats) {
    return {
      hp: type.base_stats.hp,
      attack: type.base_stats.attack,
      defense: type.base_stats.defense,
      speed: type.base_stats.speed,
    };
  }
  return {
    hp: type.base_hp || 80,
    attack: type.base_attack || 80,
    defense: type.base_defense || 80,
    speed: type.base_speed || 80,
  };
}

const DEFAULT_COLORS = [
  { primary: '#4CAF50', secondary: '#2196F3', accent: '#FFC107', name: 'Forest' },
  { primary: '#FF5722', secondary: '#FF9800', accent: '#FFEB3B', name: 'Sunset' },
  { primary: '#9C27B0', secondary: '#E91E63', accent: '#F48FB1', name: 'Mystic' },
  { primary: '#00BCD4', secondary: '#03A9F4', accent: '#B3E5FC', name: 'Ocean' },
  { primary: '#795548', secondary: '#607D8B', accent: '#9E9E9E', name: 'Stone' },
];

export function BuddySetup({ teamId, onComplete }: BuddySetupProps) {
  const { sounds } = useRetroSounds();
  const [step, setStep] = useState(1);
  const [buddyTypes, setBuddyTypes] = useState<ApiBuddyType[]>([]);
  const [selectedType, setSelectedType] = useState<ApiBuddyType | null>(null);
  const [nickname, setNickname] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Fetch buddy types
  useEffect(() => {
    async function fetchTypes() {
      try {
        const response = await fetch('/api/buddy-battle/types', { credentials: 'include' });
        const data = await response.json();
        // API returns buddy_types
        setBuddyTypes(data.buddy_types || data.types || []);
      } catch (error) {
        console.error('Failed to fetch buddy types:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTypes();
  }, []);
  
  const handleSelectType = (type: ApiBuddyType) => {
    sounds.select();
    setSelectedType(type);
  };
  
  const handleNextStep = () => {
    if (step === 1 && !selectedType) {
      sounds.error();
      return;
    }
    sounds.confirm();
    setStep(step + 1);
  };
  
  const handlePrevStep = () => {
    sounds.cancel();
    setStep(step - 1);
  };
  
  const handleCreate = async () => {
    if (!selectedType) return;
    
    setCreating(true);
    
    try {
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch('/api/buddy-battle/buddy', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          teamId,
          buddyTypeId: selectedType.id,
          nickname: nickname.trim() || null,
          colors: DEFAULT_COLORS[selectedColorIndex],
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        sounds.achievement();
        onComplete();
      } else {
        sounds.error();
        console.error('Failed to create buddy:', data.error, data.details || '');
        alert(`Fout bij aanmaken buddy: ${data.error}\n${data.details || ''}`);
      }
    } catch (error) {
      sounds.error();
      console.error('Error creating buddy:', error);
      alert(`Er ging iets mis: ${error}`);
    } finally {
      setCreating(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] py-8">
        <div className="retro-panel p-8">
          <div className="retro-loading mx-auto mb-4" />
          <p className="retro-text text-center">Loading buddies...</p>
        </div>
      </div>
    );
  }

  // Show message if no buddy types available
  if (buddyTypes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] py-8">
        <div className="retro-panel p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="retro-text mb-2">Geen buddy types beschikbaar</p>
          <p className="retro-text text-xs text-gb-dark-green">
            Neem contact op met de beheerder
          </p>
        </div>
      </div>
    );
  }

  const stepLabels = ['Buddy', 'Kleuren', 'Naam'];
  
  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="retro-title mb-2">🎮 Kies Je Buddy</h1>
        <p className="retro-text text-gb-light-green">
          Stap {step} van 3: {stepLabels[step - 1]}
        </p>
      </div>
      
      {/* Step indicators - Enhanced */}
      <div className="flex justify-center items-center gap-2 mb-8">
        {[1, 2, 3].map((s, index) => (
          <div key={s} className="flex items-center">
            <div 
              className={`
                w-10 h-10 border-4 flex items-center justify-center transition-all duration-300
                ${s === step 
                  ? 'border-retro-yellow bg-retro-yellow text-retro-black scale-110 shadow-lg' 
                  : s < step 
                    ? 'border-retro-green bg-retro-green text-retro-black cursor-pointer hover:scale-105' 
                    : 'border-gb-dark-green text-gb-dark-green bg-gb-dark'
                }
                ${s === step ? 'animate-pulse' : ''}
              `}
              style={s === step ? { boxShadow: '0 0 15px rgba(255, 205, 117, 0.6)' } : {}}
              onClick={() => s < step && setStep(s)}
              title={s < step ? `Terug naar stap ${s}: ${stepLabels[s - 1]}` : stepLabels[s - 1]}
            >
              {s < step ? (
                <span className="text-sm">✓</span>
              ) : (
                <span className="retro-text text-xs font-bold">{s}</span>
              )}
            </div>
            {/* Connector line */}
            {index < 2 && (
              <div 
                className={`w-8 h-1 mx-1 transition-colors duration-300 ${
                  s < step ? 'bg-retro-green' : 'bg-gb-dark-green'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex justify-center gap-8 mb-6">
        {stepLabels.map((label, index) => (
          <span 
            key={label}
            className={`retro-text text-xs transition-colors ${
              index + 1 === step 
                ? 'text-retro-yellow' 
                : index + 1 < step 
                  ? 'text-retro-green' 
                  : 'text-gb-dark-green'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
      
      {/* Step 1: Select Buddy Type */}
      {step === 1 && (
        <div className="retro-panel">
          <h2 className="retro-text-lg mb-4 text-center">Select Your Buddy</h2>
          <p className="retro-text text-xs text-center text-gb-light-green mb-6">
            Klik op een buddy om te selecteren
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buddyTypes.map(type => (
              <button
                key={type.id}
                className={`retro-panel retro-selectable p-4 ${
                  selectedType?.id === type.id 
                    ? 'retro-selected' 
                    : ''
                }`}
                onClick={() => handleSelectType(type)}
              >
                {/* Buddy preview */}
                <div 
                  className="buddy-sprite w-20 h-20 mx-auto mb-3"
                  style={{ 
                    background: `linear-gradient(135deg, ${ELEMENT_COLORS[type.element]} 0%, #1a1c2c 100%)` 
                  }}
                >
                  <span className="text-4xl">
                    {type.element === 'fire' && '🔥'}
                    {type.element === 'water' && '💧'}
                    {type.element === 'earth' && '🌍'}
                    {type.element === 'air' && '💨'}
                    {type.element === 'electric' && '⚡'}
                  </span>
                </div>
                
                <h3 className="retro-text text-center mb-1">{type.name}</h3>
                <span 
                  className="element-badge block mx-auto w-fit"
                  style={{ backgroundColor: ELEMENT_COLORS[type.element] }}
                >
                  {type.element}
                </span>
                
                <p className="retro-text text-xs text-gb-dark-green mt-2 text-center">
                  {type.description}
                </p>
                
                {/* Base stats preview */}
                <div className="grid grid-cols-2 gap-1 mt-3 text-xs">
                  {(() => {
                    const stats = getStats(type);
                    return (
                      <>
                        <StatPreview label="HP" value={stats.hp} />
                        <StatPreview label="ATK" value={stats.attack} />
                        <StatPreview label="DEF" value={stats.defense} />
                        <StatPreview label="SPD" value={stats.speed} />
                      </>
                    );
                  })()}
                </div>
              </button>
            ))}
          </div>
          
          <div className="flex justify-between items-center mt-6">
            <p className="retro-text text-xs text-gb-light-green">
              {selectedType ? `✓ ${selectedType.name} geselecteerd` : 'Selecteer een buddy'}
            </p>
            <button 
              className="retro-btn retro-btn-primary"
              onClick={handleNextStep}
              disabled={!selectedType}
            >
              Next →
            </button>
          </div>
        </div>
      )}
      
      {/* Step 2: Customize Colors */}
      {step === 2 && selectedType && (
        <div className="retro-panel">
          <h2 className="retro-text-lg mb-4 text-center">Customize Colors</h2>
          <p className="retro-text text-xs text-center text-gb-light-green mb-6">
            Kies een kleurenschema voor je buddy
          </p>
          
          {/* Preview */}
          <div className="flex justify-center mb-6">
            <div 
              className="buddy-sprite w-32 h-32 transition-all duration-300"
              style={{ 
                background: `linear-gradient(135deg, ${DEFAULT_COLORS[selectedColorIndex].primary} 0%, ${DEFAULT_COLORS[selectedColorIndex].secondary} 100%)`,
                boxShadow: `0 0 30px ${DEFAULT_COLORS[selectedColorIndex].primary}40`
              }}
            >
              <span className="text-6xl">
                {selectedType.element === 'fire' && '🔥'}
                {selectedType.element === 'water' && '💧'}
                {selectedType.element === 'earth' && '🌍'}
                {selectedType.element === 'air' && '💨'}
                {selectedType.element === 'electric' && '⚡'}
              </span>
            </div>
          </div>
          
          {/* Color presets */}
          <div className="flex justify-center gap-4 mb-4">
            {DEFAULT_COLORS.map((color, index) => (
              <button
                key={index}
                className={`color-swatch ${
                  selectedColorIndex === index ? 'selected' : ''
                }`}
                style={{ 
                  background: `linear-gradient(135deg, ${color.primary} 0%, ${color.secondary} 100%)` 
                }}
                onClick={() => {
                  sounds.select();
                  setSelectedColorIndex(index);
                }}
                title={color.name}
              />
            ))}
          </div>
          
          <p className="retro-text text-sm text-center text-retro-yellow mb-6">
            ✓ {DEFAULT_COLORS[selectedColorIndex].name}
          </p>
          
          <div className="flex justify-between mt-6">
            <button className="retro-btn" onClick={handlePrevStep}>
              ← Back
            </button>
            <button 
              className="retro-btn retro-btn-primary"
              onClick={handleNextStep}
            >
              Next →
            </button>
          </div>
        </div>
      )}
      
      {/* Step 3: Nickname */}
      {step === 3 && selectedType && (
        <div className="retro-panel">
          <h2 className="retro-text-lg mb-4 text-center">Give a Nickname</h2>
          <p className="retro-text text-xs text-center text-gb-light-green mb-6">
            Geef je buddy een unieke naam (optioneel)
          </p>
          
          {/* Preview */}
          <div className="flex justify-center mb-6">
            <div 
              className="buddy-sprite w-32 h-32 transition-all duration-300"
              style={{ 
                background: `linear-gradient(135deg, ${DEFAULT_COLORS[selectedColorIndex].primary} 0%, ${DEFAULT_COLORS[selectedColorIndex].secondary} 100%)`,
                boxShadow: `0 0 30px ${DEFAULT_COLORS[selectedColorIndex].primary}40`
              }}
            >
              <span className="text-6xl">
                {selectedType.element === 'fire' && '🔥'}
                {selectedType.element === 'water' && '💧'}
                {selectedType.element === 'earth' && '🌍'}
                {selectedType.element === 'air' && '💨'}
                {selectedType.element === 'electric' && '⚡'}
              </span>
            </div>
          </div>
          
          <div className="max-w-xs mx-auto mb-6">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 12))}
              placeholder={selectedType.name}
              className="w-full bg-gb-dark border-4 border-gb-dark-green p-3 retro-text text-center text-gb-lightest focus:border-retro-yellow outline-none transition-colors"
              maxLength={12}
            />
            <p className="retro-text text-xs text-gb-dark-green mt-2 text-center">
              {nickname.length}/12 karakters (optioneel)
            </p>
          </div>
          
          {/* Summary */}
          <div className="retro-panel bg-gb-dark p-4 mb-6">
            <h3 className="retro-text text-center mb-3 text-retro-yellow">📋 Samenvatting</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="retro-text text-xs text-gb-light-green">Type:</span>
                <span className="retro-text text-xs text-gb-lightest">{selectedType.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="retro-text text-xs text-gb-light-green">Element:</span>
                <span 
                  className="retro-text text-xs px-2 py-1"
                  style={{ backgroundColor: ELEMENT_COLORS[selectedType.element], color: '#1a1c2c' }}
                >
                  {selectedType.element}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="retro-text text-xs text-gb-light-green">Naam:</span>
                <span className="retro-text text-xs text-retro-yellow">{nickname || selectedType.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="retro-text text-xs text-gb-light-green">Thema:</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 border border-gb-dark-green"
                    style={{ background: `linear-gradient(135deg, ${DEFAULT_COLORS[selectedColorIndex].primary} 0%, ${DEFAULT_COLORS[selectedColorIndex].secondary} 100%)` }}
                  />
                  <span className="retro-text text-xs">{DEFAULT_COLORS[selectedColorIndex].name}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button className="retro-btn" onClick={handlePrevStep}>
              ← Terug
            </button>
            <button 
              className="retro-btn retro-btn-special"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? 'Aanmaken...' : '✨ Maak Buddy!'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPreview({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-gb-dark-green">{label}</span>
      <span className="text-gb-lightest">{value}</span>
    </div>
  );
}

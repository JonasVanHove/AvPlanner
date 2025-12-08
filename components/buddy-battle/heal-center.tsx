'use client';

// =====================================================
// BUDDY BATTLE - Heal Center Component
// Pokemon Center style healing with daily limit
// =====================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { supabase } from '@/lib/supabase';
import { RetroButton, RetroProgress, RetroDialog } from './ui/retro-button';
import { PixelBuddy } from './buddy-display';
import { ELEMENT_COLORS, BuddyElement } from '@/lib/buddy-battle/types';

interface HealCenterProps {
  teamId: string;
}

interface BuddyData {
  id: string;
  nickname: string;
  current_hp: number;
  max_hp: number;
  level: number;
  buddy_type: {
    name: string;
    element: string;
    base_color: string;
    secondary_color: string;
    accent_color: string;
  };
  last_healed_at: string | null;
}

export function HealCenter({ teamId }: HealCenterProps) {
  const router = useRouter();
  const { sounds } = useRetroSounds();
  
  const [buddy, setBuddy] = useState<BuddyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [healing, setHealing] = useState(false);
  const [canHeal, setCanHeal] = useState(false);
  const [hoursUntilHeal, setHoursUntilHeal] = useState(0);
  const [showHealAnimation, setShowHealAnimation] = useState(false);
  const [healedAmount, setHealedAmount] = useState(0);
  
  useEffect(() => {
    fetchBuddyData();
  }, [teamId]);
  
  async function fetchBuddyData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get member for this team
      const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('team_id', teamId)
        .single();
      
      if (!member) return;
      
      // Get buddy with type
      const { data: buddyData } = await supabase
        .from('player_buddies')
        .select(`
          id,
          nickname,
          current_hp,
          max_hp,
          level,
          last_healed_at,
          buddy_type:buddy_types(name, element, base_color, secondary_color, accent_color)
        `)
        .eq('member_id', member.id)
        .eq('team_id', teamId)
        .single();
      
      if (buddyData) {
        // Flatten buddy_type
        const buddy = {
          ...buddyData,
          buddy_type: Array.isArray(buddyData.buddy_type) 
            ? buddyData.buddy_type[0] 
            : buddyData.buddy_type
        };
        setBuddy(buddy);
        
        // Check if can heal (once per 24 hours)
        const lastHealed = buddy.last_healed_at ? new Date(buddy.last_healed_at) : null;
        const now = new Date();
        
        if (!lastHealed) {
          setCanHeal(true);
          setHoursUntilHeal(0);
        } else {
          const hoursSinceHeal = (now.getTime() - lastHealed.getTime()) / (1000 * 60 * 60);
          if (hoursSinceHeal >= 24) {
            setCanHeal(true);
            setHoursUntilHeal(0);
          } else {
            setCanHeal(false);
            setHoursUntilHeal(Math.ceil(24 - hoursSinceHeal));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching buddy:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleHeal() {
    if (!buddy || !canHeal || buddy.current_hp >= buddy.max_hp) return;
    
    setHealing(true);
    sounds.select();
    
    try {
      const healAmount = buddy.max_hp - buddy.current_hp;
      
      // Update buddy HP and last_healed_at
      const { error } = await supabase
        .from('player_buddies')
        .update({
          current_hp: buddy.max_hp,
          last_healed_at: new Date().toISOString()
        })
        .eq('id', buddy.id);
      
      if (error) throw error;
      
      // Show heal animation
      setHealedAmount(healAmount);
      setShowHealAnimation(true);
      sounds.heal();
      
      // Update local state after animation
      setTimeout(() => {
        setBuddy({
          ...buddy,
          current_hp: buddy.max_hp,
          last_healed_at: new Date().toISOString()
        });
        setCanHeal(false);
        setHoursUntilHeal(24);
        setShowHealAnimation(false);
        setHealing(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error healing buddy:', error);
      sounds.error();
      setHealing(false);
    }
  }
  
  if (loading) {
    return (
      <div className="buddy-battle-container min-h-screen flex items-center justify-center">
        <div className="scanlines" />
        <div className="retro-panel p-8">
          <div className="retro-loading mx-auto mb-4" />
          <p className="retro-text text-center">Loading Heal Center...</p>
        </div>
      </div>
    );
  }
  
  if (!buddy) {
    return (
      <div className="buddy-battle-container min-h-screen flex items-center justify-center p-4">
        <div className="scanlines" />
        <div className="retro-panel p-8 text-center">
          <p className="retro-text text-red-400">No buddy found</p>
          <RetroButton onClick={() => router.back()} className="mt-4">
            ← Back
          </RetroButton>
        </div>
      </div>
    );
  }
  
  const hpPercentage = (buddy.current_hp / buddy.max_hp) * 100;
  const needsHealing = buddy.current_hp < buddy.max_hp;
  const elementColor = ELEMENT_COLORS[buddy.buddy_type.element as BuddyElement] || '#0984e3';
  
  return (
    <div className="buddy-battle-container min-h-screen p-4">
      <div className="scanlines" />
      
      {/* Header */}
      <header className="mb-6">
        <h1 className="retro-title text-center mb-2">🏥 HEAL CENTER 🏥</h1>
        <p className="retro-text text-center text-gb-light-green">
          Rest and recover your buddy
        </p>
      </header>
      
      <div className="max-w-lg mx-auto space-y-6">
        {/* Nurse Sprite */}
        <div className="retro-panel p-6 text-center">
          <div className="text-6xl mb-4">👩‍⚕️</div>
          <p className="retro-text text-retro-lime mb-2">Welcome to the Heal Center!</p>
          <p className="retro-text text-sm">
            {needsHealing 
              ? "Your buddy looks a bit tired. Would you like me to heal them?"
              : "Your buddy is in perfect health!"}
          </p>
        </div>
        
        {/* Buddy Display */}
        <div className="retro-panel p-6">
          <div className="flex items-center gap-6">
            {/* Buddy Sprite */}
            <div 
              className={`w-24 h-24 relative ${showHealAnimation ? 'heal-glow' : ''}`}
              style={{ 
                background: `linear-gradient(180deg, ${elementColor}30 0%, transparent 100%)`,
                borderRadius: '8px'
              }}
            >
              <PixelBuddy
                type={buddy.buddy_type.name}
                primaryColor={buddy.buddy_type.base_color || elementColor}
                secondaryColor={buddy.buddy_type.secondary_color || '#fff'}
                accentColor={buddy.buddy_type.accent_color || '#333'}
                element={buddy.buddy_type.element}
              />
              
              {/* Heal particles */}
              {showHealAnimation && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="heal-particles">✨💚✨</span>
                </div>
              )}
            </div>
            
            {/* Buddy Info */}
            <div className="flex-1">
              <h3 className="retro-text-lg mb-2">{buddy.nickname || buddy.buddy_type.name}</h3>
              <p className="retro-text text-xs text-gb-dark-green mb-2">Lv. {buddy.level}</p>
              
              <div className="mb-2">
                <RetroProgress
                  value={buddy.current_hp}
                  max={buddy.max_hp}
                  label="HP"
                  variant="hp"
                  animate={showHealAnimation}
                />
              </div>
              
              <p className="retro-text text-xs">
                {buddy.current_hp} / {buddy.max_hp} HP
              </p>
              
              {showHealAnimation && (
                <p className="retro-text text-retro-lime animate-pulse mt-2">
                  +{healedAmount} HP restored!
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Heal Button */}
        <div className="retro-panel p-6 text-center">
          {needsHealing ? (
            canHeal ? (
              <>
                <p className="retro-text mb-4 text-retro-yellow">
                  ⚡ Daily heal available! ⚡
                </p>
                <RetroButton
                  variant="primary"
                  onClick={handleHeal}
                  disabled={healing}
                  className="px-8 py-4 text-lg"
                >
                  {healing ? '💚 Healing...' : '💚 Heal Buddy'}
                </RetroButton>
                <p className="retro-text text-xs mt-4 text-gb-dark-green">
                  Free once per day!
                </p>
              </>
            ) : (
              <>
                <p className="retro-text text-gb-light-green mb-2">
                  Daily heal already used
                </p>
                <p className="retro-text text-retro-yellow mb-4">
                  ⏰ Available in {hoursUntilHeal} hour{hoursUntilHeal !== 1 ? 's' : ''}
                </p>
                <div className="retro-panel bg-gb-dark-green/50 p-4">
                  <p className="retro-text text-sm mb-2">Alternative options:</p>
                  <ul className="retro-text text-xs text-left space-y-1">
                    <li>• 🧪 Use healing items from Shop</li>
                    <li>• ⚔️ Win battles for bonus HP</li>
                    <li>• 📋 Complete quests for rewards</li>
                  </ul>
                </div>
              </>
            )
          ) : (
            <>
              <p className="retro-text text-retro-lime text-lg mb-2">
                ✨ Full Health! ✨
              </p>
              <p className="retro-text text-sm">
                Your buddy is ready for battle!
              </p>
            </>
          )}
        </div>
        
        {/* Back Button */}
        <div className="text-center">
          <RetroButton onClick={() => {
            sounds.cancel();
            router.push(`/team/${teamId}/buddy`);
          }}>
            ← Back to Menu
          </RetroButton>
        </div>
      </div>
      
      {/* Heal animation styles */}
      <style jsx>{`
        .heal-glow {
          animation: healGlow 0.5s ease-in-out infinite alternate;
        }
        
        @keyframes healGlow {
          from { box-shadow: 0 0 10px #00b894, 0 0 20px #00b89480; }
          to { box-shadow: 0 0 20px #00b894, 0 0 40px #00b89480; }
        }
        
        .heal-particles {
          font-size: 24px;
          animation: floatUp 1s ease-out forwards;
        }
        
        @keyframes floatUp {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-30px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

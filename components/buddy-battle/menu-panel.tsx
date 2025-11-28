'use client';

// =====================================================
// BUDDY BATTLE - Menu Panel Component
// Navigation menu for game modes
// =====================================================

import React from 'react';
import { useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { isBossBattleAvailable, getCurrentQuarter } from '@/lib/buddy-battle/game-logic';

interface MenuPanelProps {
  teamId: string;
  canDoTutorial?: boolean;
  canDoBoss?: boolean;
  bossAttempts?: number;
  maxBossAttempts?: number;
}

export function MenuPanel({ 
  teamId, 
  canDoTutorial = false,
  canDoBoss = false,
  bossAttempts = 0,
  maxBossAttempts = 2
}: MenuPanelProps) {
  const router = useRouter();
  const { sounds } = useRetroSounds();
  
  const navigate = (path: string) => {
    sounds.confirm();
    router.push(path);
  };
  
  const bossAvailable = isBossBattleAvailable();
  
  return (
    <div className="retro-panel mt-4">
      <h3 className="retro-text-lg mb-3 text-retro-lime text-center">Menu</h3>
      
      <div className="menu-grid">
        {/* Tutorial Battle */}
        {canDoTutorial && (
          <MenuButton
            icon="📚"
            label="Tutorial"
            onClick={() => navigate(`/team/${teamId}/buddy/battle?type=tutorial`)}
            variant="special"
          />
        )}
        
        {/* PvP Battle */}
        <MenuButton
          icon="⚔️"
          label="Battle"
          onClick={() => navigate(`/team/${teamId}/buddy/battle`)}
        />
        
        {/* Boss Battle */}
        <MenuButton
          icon="👹"
          label="Boss"
          onClick={() => navigate(`/team/${teamId}/buddy/battle?type=boss`)}
          disabled={!bossAvailable || !canDoBoss}
          badge={bossAvailable ? `${bossAttempts}/${maxBossAttempts}` : 'Soon'}
          variant={canDoBoss ? 'danger' : undefined}
        />
        
        {/* Shop */}
        <MenuButton
          icon="🛒"
          label="Shop"
          onClick={() => navigate(`/team/${teamId}/buddy/shop`)}
        />
        
        {/* Inventory */}
        <MenuButton
          icon="🎒"
          label="Inventory"
          onClick={() => navigate(`/team/${teamId}/buddy/inventory`)}
        />
        
        {/* Leaderboard */}
        <MenuButton
          icon="🏆"
          label="Rankings"
          onClick={() => navigate(`/team/${teamId}/buddy/leaderboard`)}
        />
        
        {/* Upgrade */}
        <MenuButton
          icon="📈"
          label="Upgrade"
          onClick={() => navigate(`/team/${teamId}/buddy/upgrade`)}
        />
        
        {/* Team */}
        <MenuButton
          icon="👥"
          label="Team"
          onClick={() => navigate(`/team/${teamId}/buddy/team`)}
        />
      </div>
      
      {/* Quarter info */}
      <div className="border-t-2 border-gb-dark-green mt-4 pt-3">
        <p className="retro-text text-xs text-center text-gb-dark-green">
          Current Quarter: {getCurrentQuarter()}
        </p>
        {bossAvailable && (
          <p className="retro-text text-xs text-center text-retro-red mt-1">
            🔥 Boss Battle Available! 🔥
          </p>
        )}
      </div>
    </div>
  );
}

interface MenuButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
  variant?: 'primary' | 'danger' | 'special';
}

function MenuButton({ icon, label, onClick, disabled, badge, variant }: MenuButtonProps) {
  const { sounds } = useRetroSounds();
  
  const handleClick = () => {
    if (disabled) {
      sounds.error();
      return;
    }
    onClick();
  };
  
  const variantClass = variant 
    ? `retro-btn-${variant}` 
    : '';
  
  return (
    <button
      className={`retro-btn ${variantClass} w-full flex flex-col items-center gap-1 py-3 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={handleClick}
      disabled={disabled}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs">{label}</span>
      {badge && (
        <span className="retro-text text-xs text-retro-yellow mt-1">
          [{badge}]
        </span>
      )}
    </button>
  );
}

'use client';

// =====================================================
// BUDDY BATTLE - Retro UI Components
// Reusable retro-styled UI elements
// =====================================================

import React from 'react';

// ===================
// RETRO BUTTON
// ===================

interface RetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'special';
  size?: 'small' | 'medium' | 'large';
}

export function RetroButton({ 
  children, 
  variant = 'default',
  size = 'medium',
  className = '',
  ...props 
}: RetroButtonProps) {
  const variantClass = variant !== 'default' ? `retro-btn-${variant}` : '';
  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'px-4 py-2',
    large: 'text-base px-6 py-3',
  };
  
  return (
    <button 
      className={`retro-btn ${variantClass} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ===================
// RETRO DIALOG
// ===================

interface RetroDialogProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  showClose?: boolean;
}

export function RetroDialog({ 
  title, 
  children, 
  onClose,
  showClose = true 
}: RetroDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - Habbo style darker overlay */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundColor: 'rgba(26, 26, 46, 0.92)',
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      />
      
      {/* Dialog - Habbo Hotel panel style */}
      <div 
        className="relative z-10 max-w-md w-full"
        style={{
          background: 'linear-gradient(180deg, #4a5568 0%, #3d4852 5%, #3d4852 95%, #2d3436 100%)',
          border: '3px solid #5a6672',
          borderRadius: '12px',
          boxShadow: `
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 6px 0 #1a1a2e,
            0 10px 20px rgba(0,0,0,0.4)
          `,
          padding: '20px',
          fontFamily: "'Press Start 2P', monospace",
          animation: 'dialogSlideIn 0.2s ease-out'
        }}
      >
        {/* Top highlight line */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 15,
            right: 15,
            height: '3px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            borderRadius: '12px 12px 0 0'
          }}
        />
        
        {/* Header - Habbo style */}
        <div 
          className="flex justify-between items-center mb-4 pb-3"
          style={{ borderBottom: '2px solid rgba(90, 102, 114, 0.5)' }}
        >
          <h2 
            style={{ 
              color: '#fdcb6e',
              fontSize: '12px',
              textShadow: '1px 1px 0 #1a1a2e, 0 0 10px rgba(253, 203, 110, 0.3)',
              fontFamily: "'Press Start 2P', monospace"
            }}
          >
            {title}
          </h2>
          {showClose && onClose && (
            <button 
              style={{
                background: 'linear-gradient(180deg, #d63031 0%, #c0392b 50%, #a93226 100%)',
                color: '#ffffff',
                border: '2px solid #ff7675',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 0 #8e2420, inset 0 1px 0 rgba(255,255,255,0.3)'
              }}
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Content - Habbo text color */}
        <div style={{ color: '#dfe6e9' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ===================
// RETRO TOAST
// ===================

interface RetroToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export function RetroToast({ message, type = 'info', onClose }: RetroToastProps) {
  const typeColors = {
    success: 'border-retro-green',
    error: 'border-retro-red',
    info: 'border-gb-light-green',
  };
  
  const typeIcons = {
    success: '✓',
    error: '✕',
    info: '!',
  };
  
  return (
    <div className={`retro-toast ${typeColors[type]}`}>
      <span className="mr-2">{typeIcons[type]}</span>
      <span className="retro-text text-xs">{message}</span>
      {onClose && (
        <button className="ml-4 text-gb-light-green" onClick={onClose}>
          ✕
        </button>
      )}
    </div>
  );
}

// ===================
// RETRO TAB
// ===================

interface RetroTabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function RetroTabs({ tabs, activeTab, onTabChange }: RetroTabsProps) {
  return (
    <div className="flex gap-1 mb-4">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`retro-btn flex-1 ${
            activeTab === tab.id 
              ? 'bg-gb-light-green text-gb-dark' 
              : ''
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ===================
// RETRO PROGRESS BAR
// ===================

interface RetroProgressProps {
  value: number;
  max: number;
  label?: string;
  variant?: 'hp' | 'xp' | 'default';
  showText?: boolean;
  animate?: boolean;
}

export function RetroProgress({ 
  value, 
  max, 
  label,
  variant = 'default',
  showText = true,
  animate = false
}: RetroProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const containerClass = variant === 'xp' ? 'xp-bar-container' : 'hp-bar-container';
  const barClass = variant === 'xp' ? 'xp-bar' : 'hp-bar';
  
  // HP specific coloring
  let hpStatus = '';
  if (variant === 'hp') {
    if (percentage <= 20) hpStatus = 'critical';
    else if (percentage <= 50) hpStatus = 'low';
  }
  
  return (
    <div>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="retro-text text-xs">{label}</span>
        </div>
      )}
      <div className={`${containerClass} relative`}>
        <div 
          className={`${barClass} ${hpStatus} ${animate ? 'hp-animate' : ''}`}
          style={{ 
            width: `${percentage}%`,
            transition: animate ? 'width 0.5s ease-out' : 'none'
          }}
        />
        {/* HP numbers inside bar */}
        {showText && variant === 'hp' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              className="retro-text text-xs font-bold"
              style={{ 
                color: '#fff', 
                textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
                fontSize: '10px'
              }}
            >
              {Math.floor(value)} / {max}
            </span>
          </div>
        )}
        {/* XP numbers to the right */}
        {showText && variant !== 'hp' && (
          <span className="ml-2 retro-text text-xs">{Math.floor(value)}/{max}</span>
        )}
      </div>
    </div>
  );
}

// ===================
// RETRO LOADING
// ===================

export function RetroLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="retro-loading" />
      <p className="retro-text text-xs">{text}</p>
    </div>
  );
}

// ===================
// RETRO CARD
// ===================

interface RetroCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function RetroCard({ 
  children, 
  className = '', 
  onClick,
  selected = false 
}: RetroCardProps) {
  const clickableClass = onClick ? 'cursor-pointer hover:border-gb-light-green' : '';
  const selectedClass = selected ? 'border-retro-yellow' : '';
  
  return (
    <div 
      className={`retro-panel ${clickableClass} ${selectedClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ===================
// RETRO BADGE
// ===================

interface RetroBadgeProps {
  children: React.ReactNode;
  variant?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export function RetroBadge({ children, variant = 'common' }: RetroBadgeProps) {
  return (
    <span className={`retro-text text-xs px-2 py-1 border rarity-${variant}`}>
      {children}
    </span>
  );
}

// Add animation keyframes to CSS
// These would normally be in the CSS file but for convenience:
const style = `
@keyframes scale-in {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = style;
  document.head.appendChild(styleEl);
}

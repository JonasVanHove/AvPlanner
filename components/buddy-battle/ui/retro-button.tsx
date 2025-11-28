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
      {/* Backdrop with retro green tint */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundColor: 'rgba(15, 56, 15, 0.92)',
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      />
      
      {/* Dialog with explicit retro styling */}
      <div 
        className="relative z-10 max-w-md w-full"
        style={{
          backgroundColor: '#0f380f',
          border: '4px solid #306230',
          boxShadow: `
            inset 2px 2px 0 #8bac0f,
            inset -2px -2px 0 #1a1c2c,
            8px 8px 0 rgba(0,0,0,0.5),
            0 0 30px rgba(139, 172, 15, 0.3)
          `,
          padding: '16px',
          fontFamily: "'Press Start 2P', monospace",
          animation: 'dialogSlideIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div 
          className="flex justify-between items-center mb-4 pb-2"
          style={{ borderBottom: '2px solid #306230' }}
        >
          <h2 
            style={{ 
              color: '#a7f070',
              fontSize: '14px',
              textShadow: '2px 2px 0 #1a1c2c',
              fontFamily: "'Press Start 2P', monospace"
            }}
          >
            {title}
          </h2>
          {showClose && onClose && (
            <button 
              className="retro-btn text-xs px-2 py-1"
              style={{
                backgroundColor: '#306230',
                color: '#9bbc0f',
                border: '2px solid #8bac0f',
                fontFamily: "'Press Start 2P', monospace",
                cursor: 'pointer'
              }}
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Content with retro text color */}
        <div style={{ color: '#9bbc0f' }}>
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
}

export function RetroProgress({ 
  value, 
  max, 
  label,
  variant = 'default',
  showText = true 
}: RetroProgressProps) {
  const percentage = Math.min(100, (value / max) * 100);
  
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
      {(label || showText) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="retro-text text-xs">{label}</span>}
          {showText && (
            <span className="retro-text text-xs">{value}/{max}</span>
          )}
        </div>
      )}
      <div className={containerClass}>
        <div 
          className={`${barClass} ${hpStatus}`}
          style={{ width: `${percentage}%` }}
        />
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

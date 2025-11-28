// =====================================================
// POINTS AWARDED TOAST
// Animated notification when buddy points are earned
// Uses pure CSS animations (no external dependencies)
// =====================================================

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { PointsAwardResult } from '@/hooks/use-buddy-points';

interface PointsAwardedToastProps {
  result: PointsAwardResult | null;
  onClose?: () => void;
  duration?: number;
}

export function PointsAwardedToast({ 
  result, 
  onClose,
  duration = 3000 
}: PointsAwardedToastProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result?.pointsAwarded && result.pointsAwarded > 0) {
      setVisible(true);
      setAnimating(true);
      setBouncing(true);
      
      // Stop bouncing after initial animation
      const bounceTimer = setTimeout(() => setBouncing(false), 2000);
      
      const hideTimer = setTimeout(() => {
        setAnimating(false);
        setTimeout(() => {
          setVisible(false);
          onClose?.();
        }, 300);
      }, duration);
      
      return () => {
        clearTimeout(hideTimer);
        clearTimeout(bounceTimer);
      };
    }
  }, [result, duration, onClose]);

  if (!visible || !result || result.pointsAwarded === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toast-enter {
          0% { opacity: 0; transform: translateY(50px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-exit {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-20px) scale(0.9); }
        }
        @keyframes coin-bounce {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(15deg) scale(1.2); }
          50% { transform: rotate(-15deg) scale(1); }
          75% { transform: rotate(10deg) scale(1.1); }
        }
        @keyframes points-pop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes level-up-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        @keyframes slide-down {
          0% { opacity: 0; max-height: 0; }
          100% { opacity: 1; max-height: 50px; }
        }
        .toast-container-bb {
          animation: ${animating ? 'toast-enter' : 'toast-exit'} 0.3s ease-out forwards;
        }
        .coin-icon-bb {
          animation: coin-bounce 0.5s ease-in-out infinite;
          animation-play-state: ${bouncing ? 'running' : 'paused'};
        }
        .points-value-bb {
          animation: points-pop 0.4s ease-out 0.2s both;
        }
        .level-up-icon-bb {
          animation: level-up-pulse 0.3s ease-in-out 3;
        }
        .sparkle-icon-bb {
          animation: sparkle 0.5s ease-in-out infinite;
        }
        .progress-bar-bb {
          animation: shrink ${duration}ms linear forwards;
          transform-origin: left;
        }
        .level-up-section-bb {
          animation: slide-down 0.4s ease-out 0.5s both;
        }
      `}</style>
      
      <div className="fixed bottom-4 right-4 z-50 toast-container-bb">
        <div 
          className="relative overflow-hidden rounded-lg shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #306230 0%, #0f380f 100%)',
            border: '3px solid #9bbc0f',
            fontFamily: '"Press Start 2P", monospace',
            minWidth: '200px',
          }}
        >
          {/* Scanline effect */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
            }}
          />
          
          <div className="p-4 relative z-10">
            {/* Coin icon and points */}
            <div className="flex items-center gap-3">
              <div className="text-2xl coin-icon-bb">
                🪙
              </div>
              
              <div>
                <div 
                  className="text-base font-bold points-value-bb"
                  style={{ color: '#9bbc0f' }}
                >
                  +{result.pointsAwarded}
                </div>
                <div 
                  className="text-[8px] mt-1"
                  style={{ color: '#8bac0f' }}
                >
                  COINS EARNED
                </div>
              </div>
            </div>

            {/* Level up notification */}
            {result.levelUp && (
              <div 
                className="mt-3 pt-3 level-up-section-bb"
                style={{ borderTop: '2px dashed #8bac0f' }}
              >
                <div className="flex items-center gap-2">
                  <span className="level-up-icon-bb">⬆️</span>
                  <span 
                    className="text-[10px]"
                    style={{ color: '#9bbc0f' }}
                  >
                    LEVEL UP! → LV.{result.newLevel}
                  </span>
                  <span className="sparkle-icon-bb">✨</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar for auto-dismiss */}
          <div
            ref={progressRef}
            className="h-1 progress-bar-bb"
            style={{ background: '#9bbc0f' }}
          />
        </div>
      </div>
    </>
  );
}

// Minimal version for compact display
export function PointsAwardedToastMini({ 
  result, 
  onClose,
  duration = 2000 
}: PointsAwardedToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (result?.pointsAwarded && result.pointsAwarded > 0) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [result, duration, onClose]);

  if (!visible || !result || result.pointsAwarded === 0) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 animate-bounce"
      style={{
        background: '#306230',
        border: '2px solid #9bbc0f',
        borderRadius: '8px',
        padding: '8px 12px',
        fontFamily: '"Press Start 2P", monospace',
      }}
    >
      <span style={{ color: '#9bbc0f' }}>
        🪙 +{result.pointsAwarded}
      </span>
    </div>
  );
}

export default PointsAwardedToast;

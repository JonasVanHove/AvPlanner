// =====================================================
// BUDDY BATTLE - Calendar Integration Hook
// Integrates with availability calendar to award points
// =====================================================

import { useState, useCallback } from 'react';
import { useBuddyPoints, PointsAwardResult } from './use-buddy-points';

interface CalendarIntegrationResult {
  // Points state
  lastPointsAwarded: PointsAwardResult | null;
  isAwarding: boolean;
  
  // Award points after availability update
  awardPointsForAvailability: (
    userId: string,
    teamId: string,
    date: string,
    isHoliday?: boolean
  ) => Promise<PointsAwardResult | null>;
  
  // Clear last result (after showing toast)
  clearLastResult: () => void;
}

/**
 * Hook for integrating Buddy Battle points with the Availability Calendar
 * 
 * Usage in availability-calendar-redesigned.tsx:
 * 
 * ```typescript
 * import { useBuddyBattleCalendar } from '@/hooks/use-buddy-battle-calendar';
 * import { PointsAwardedToast } from '@/components/buddy-battle';
 * 
 * // In component:
 * const { lastPointsAwarded, awardPointsForAvailability, clearLastResult } = useBuddyBattleCalendar();
 * 
 * // After updating availability:
 * const result = await awardPointsForAvailability(userId, teamId, date, isHoliday);
 * 
 * // In JSX:
 * {lastPointsAwarded && (
 *   <PointsAwardedToast result={lastPointsAwarded} onClose={clearLastResult} />
 * )}
 * ```
 */
export function useBuddyBattleCalendar(): CalendarIntegrationResult {
  const { awardPoints, isAwarding } = useBuddyPoints();
  const [lastPointsAwarded, setLastPointsAwarded] = useState<PointsAwardResult | null>(null);
  
  const awardPointsForAvailability = useCallback(async (
    userId: string,
    teamId: string,
    date: string,
    isHoliday = false
  ): Promise<PointsAwardResult | null> => {
    try {
      const result = await awardPoints(userId, teamId, date, isHoliday);
      
      if (result.pointsAwarded > 0) {
        setLastPointsAwarded(result);
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('[BuddyBattle] Error awarding points:', error);
      return null;
    }
  }, [awardPoints]);
  
  const clearLastResult = useCallback(() => {
    setLastPointsAwarded(null);
  }, []);
  
  return {
    lastPointsAwarded,
    isAwarding,
    awardPointsForAvailability,
    clearLastResult,
  };
}

// Re-export for convenience
export { PointsAwardedToast, PointsAwardedToastMini } from '@/components/buddy-battle/points-awarded-toast';
export type { PointsAwardResult };

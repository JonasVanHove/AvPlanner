// =====================================================
// USE BUDDY POINTS HOOK
// Automatically awards points when availability is saved
// =====================================================

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GAME_CONSTANTS } from '@/lib/buddy-battle/types';

interface UsePointsResult {
  awardPoints: (userId: string, teamId: string, date: string, isHoliday?: boolean) => Promise<PointsAwardResult>;
  awardBulkPoints: (userId: string, teamId: string, dates: string[], holidays: string[]) => Promise<PointsAwardResult>;
  isAwarding: boolean;
  lastAward: PointsAwardResult | null;
}

interface PointsAwardResult {
  success: boolean;
  pointsAwarded: number;
  newTotal: number;
  levelUp?: boolean;
  newLevel?: number;
  message?: string;
}

/**
 * Hook for awarding buddy points when availability is tracked
 * 
 * Usage:
 * ```tsx
 * const { awardPoints, isAwarding } = useBuddyPoints();
 * 
 * // When user saves availability:
 * await awardPoints(userId, teamId, '2024-01-15', false);
 * 
 * // For bulk updates:
 * await awardBulkPoints(userId, teamId, dates, holidayDates);
 * ```
 */
export function useBuddyPoints(): UsePointsResult {
  const [isAwarding, setIsAwarding] = useState(false);
  const [lastAward, setLastAward] = useState<PointsAwardResult | null>(null);

  const awardPoints = useCallback(async (
    userId: string,
    teamId: string,
    date: string,
    isHoliday = false
  ): Promise<PointsAwardResult> => {
    setIsAwarding(true);
    
    try {
      const supabase = createClient();
      
      // Check if player has a buddy
      const { data: buddy, error: buddyError } = await supabase
        .from('player_buddies')
        .select('id, coins, total_points, level')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .single();

      if (buddyError || !buddy) {
        // Player doesn't have a buddy yet - silently skip
        const result: PointsAwardResult = {
          success: true,
          pointsAwarded: 0,
          newTotal: 0,
          message: 'No buddy found - points not awarded'
        };
        setLastAward(result);
        return result;
      }

      // Check if points already awarded for this date
      const { data: existing } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('player_buddy_id', buddy.id)
        .eq('source', 'availability')
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`)
        .single();

      if (existing) {
        const result: PointsAwardResult = {
          success: true,
          pointsAwarded: 0,
          newTotal: buddy.total_points,
          message: 'Points already awarded for this date'
        };
        setLastAward(result);
        return result;
      }

      // Calculate points
      const pointsToAward = isHoliday 
        ? GAME_CONSTANTS.POINTS.HOLIDAY_AVAILABILITY 
        : GAME_CONSTANTS.POINTS.DAILY_AVAILABILITY;

      // Award points
      const newTotal = buddy.total_points + pointsToAward;
      const newCoins = buddy.coins + pointsToAward;

      // Calculate new level
      const { data: levelData } = await supabase
        .rpc('get_level_for_xp', { xp_amount: newTotal })
        .single();

      const newLevel = levelData || buddy.level;
      const levelUp = newLevel > buddy.level;

      // Update buddy
      const { error: updateError } = await supabase
        .from('player_buddies')
        .update({
          total_points: newTotal,
          coins: newCoins,
          level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', buddy.id);

      if (updateError) throw updateError;

      // Record transaction
      await supabase.from('point_transactions').insert({
        player_buddy_id: buddy.id,
        amount: pointsToAward,
        source: 'availability',
        description: isHoliday 
          ? `Holiday availability bonus for ${date}` 
          : `Daily availability for ${date}`
      });

      // Create level up notification if applicable
      if (levelUp) {
        await supabase.from('buddy_battle_notifications').insert({
          user_id: userId,
          type: 'level_up',
          title: 'Level Up!',
          message: `Your buddy reached level ${newLevel}!`,
          data: { newLevel, previousLevel: buddy.level }
        });
      }

      const result: PointsAwardResult = {
        success: true,
        pointsAwarded: pointsToAward,
        newTotal,
        levelUp,
        newLevel: levelUp ? newLevel : undefined,
        message: levelUp 
          ? `+${pointsToAward} coins! Your buddy leveled up to ${newLevel}!`
          : `+${pointsToAward} coins earned!`
      };

      setLastAward(result);
      return result;
    } catch (error) {
      console.error('Error awarding points:', error);
      const result: PointsAwardResult = {
        success: false,
        pointsAwarded: 0,
        newTotal: 0,
        message: 'Failed to award points'
      };
      setLastAward(result);
      return result;
    } finally {
      setIsAwarding(false);
    }
  }, []);

  const awardBulkPoints = useCallback(async (
    userId: string,
    teamId: string,
    dates: string[],
    holidays: string[] = []
  ): Promise<PointsAwardResult> => {
    setIsAwarding(true);
    
    try {
      let totalPointsAwarded = 0;
      let finalTotal = 0;
      let didLevelUp = false;
      let finalLevel = 0;

      // Process each date
      for (const date of dates) {
        const isHoliday = holidays.includes(date);
        const result = await awardPoints(userId, teamId, date, isHoliday);
        
        if (result.success) {
          totalPointsAwarded += result.pointsAwarded;
          finalTotal = result.newTotal;
          if (result.levelUp) {
            didLevelUp = true;
            finalLevel = result.newLevel || finalLevel;
          }
        }
      }

      const result: PointsAwardResult = {
        success: true,
        pointsAwarded: totalPointsAwarded,
        newTotal: finalTotal,
        levelUp: didLevelUp,
        newLevel: didLevelUp ? finalLevel : undefined,
        message: totalPointsAwarded > 0 
          ? `+${totalPointsAwarded} coins earned for ${dates.length} days!`
          : 'No new points to award'
      };

      setLastAward(result);
      return result;
    } catch (error) {
      console.error('Error awarding bulk points:', error);
      const result: PointsAwardResult = {
        success: false,
        pointsAwarded: 0,
        newTotal: 0,
        message: 'Failed to award points'
      };
      setLastAward(result);
      return result;
    } finally {
      setIsAwarding(false);
    }
  }, [awardPoints]);

  return {
    awardPoints,
    awardBulkPoints,
    isAwarding,
    lastAward
  };
}

export type { PointsAwardResult };

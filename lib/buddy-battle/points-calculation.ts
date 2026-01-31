// =====================================================
// BUDDY BATTLE - Points Calculation Hook
// Calculates and awards points based on availability
// =====================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PointsResult {
  points_earned: number;
  is_holiday: boolean;
  streak_days: number;
  streak_bonus: number;
  total_points: number;
}

/**
 * Calculate and award points for a member's availability on a specific date
 */
export async function calculateAndAwardPoints(
  memberId: string,
  teamId: string,
  date: Date
): Promise<PointsResult | null> {
  const dateStr = date.toISOString().split('T')[0];
  
  try {
    // Get member's buddy
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('*')
      .eq('member_id', memberId)
      .eq('team_id', teamId)
      .single();
    
    if (buddyError || !buddy) {
      console.log('No buddy found for member:', memberId);
      return null;
    }
    
    // Check if already calculated for this date
    if (buddy.last_points_calculated_date === dateStr) {
      console.log('Points already calculated for date:', dateStr);
      return null;
    }
    
    // Check availability for this date
    const { data: availability, error: avError } = await supabase
      .from('availability')
      .select('*')
      .eq('member_id', memberId)
      .eq('date', dateStr)
      .single();
    
    if (avError || !availability) {
      console.log('No availability found for date:', dateStr);
      return null;
    }
    
    // Only award points for filled availability
    const validStatuses = ['available', 'remote', 'office', 'holiday', 'sick'];
    if (!validStatuses.includes(availability.status)) {
      return null;
    }
    
    // Base points
    let pointsEarned = 1;
    let isHoliday = false;
    
    // Check if it's a holiday (bonus point)
    const { data: member } = await supabase
      .from('members')
      .select('country_code')
      .eq('id', memberId)
      .single();
    
    if (member?.country_code) {
      const { data: holiday } = await supabase
        .from('holidays')
        .select('*')
        .eq('country_code', member.country_code)
        .eq('date', dateStr)
        .eq('is_official', true)
        .single();
      
      if (holiday) {
        isHoliday = true;
        pointsEarned = 2;
      }
    }
    
    // Calculate streak
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let streakDays = buddy.streak_days || 0;
    let streakBonus = 0;
    
    // Check if we have yesterday's availability
    const { data: yesterdayAv } = await supabase
      .from('availability')
      .select('*')
      .eq('member_id', memberId)
      .eq('date', yesterdayStr)
      .not('status', 'is', null)
      .single();
    
    if (yesterdayAv && buddy.last_points_calculated_date === yesterdayStr) {
      // Continue streak
      streakDays += 1;
    } else {
      // Reset streak
      streakDays = 1;
    }
    
    // Streak bonus (every 7 days)
    if (streakDays > 0 && streakDays % 7 === 0) {
      streakBonus = 1;
    }
    
    const totalPoints = pointsEarned + streakBonus;
    
    // Update buddy
    const newAvailablePoints = (buddy.available_points || 0) + totalPoints;
    const newTotalEarned = (buddy.total_points_earned || 0) + totalPoints;
    
    // Reduce anxiety for filling availability (-5)
    const newAnxiety = Math.max(0, (buddy.anxiety_level || 0) - 5);
    
    await supabase
      .from('player_buddies')
      .update({
        available_points: newAvailablePoints,
        total_points_earned: newTotalEarned,
        streak_days: streakDays,
        anxiety_level: newAnxiety,
        last_points_calculated_date: dateStr,
        updated_at: new Date().toISOString(),
      })
      .eq('id', buddy.id);
    
    // Log transaction
    await supabase
      .from('buddy_point_transactions')
      .insert({
        player_buddy_id: buddy.id,
        amount: totalPoints,
        transaction_type: isHoliday ? 'holiday_bonus' : 'daily_availability',
        description: `Points earned for ${dateStr}${isHoliday ? ' (holiday bonus)' : ''}${streakBonus > 0 ? ` + ${streakBonus} streak bonus` : ''}`,
        reference_date: dateStr,
      });
    
    // Log activity
    await supabase
      .from('buddy_activity_log')
      .insert({
        player_buddy_id: buddy.id,
        team_id: teamId,
        action_type: 'points_earned',
        action_data: {
          date: dateStr,
          base_points: pointsEarned,
          is_holiday: isHoliday,
          streak_days: streakDays,
          streak_bonus: streakBonus,
          total: totalPoints,
        },
      });
    
    // Update quest progress for availability
    await updateQuestProgress(buddy.id, 'complete_availability', 1);
    
    // Update login streak quest
    await updateQuestProgress(buddy.id, 'login_streak', 1);
    
    return {
      points_earned: pointsEarned,
      is_holiday: isHoliday,
      streak_days: streakDays,
      streak_bonus: streakBonus,
      total_points: totalPoints,
    };
    
  } catch (error) {
    console.error('Error calculating points:', error);
    return null;
  }
}

/**
 * Update quest progress for a specific requirement type
 */
async function updateQuestProgress(
  buddyId: string,
  requirementType: string,
  amount: number = 1
): Promise<void> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    
    const periods = {
      daily: `${year}-${month}-${day}`,
      weekly: `${year}-W${String(weekNumber).padStart(2, '0')}`,
    };
    
    // Find matching quests
    const { data: quests } = await supabase
      .from('buddy_quests')
      .select('*')
      .eq('requirement_type', requirementType)
      .eq('is_active', true);
    
    if (!quests || quests.length === 0) return;
    
    for (const quest of quests) {
      const periodId = quest.quest_type === 'daily' ? periods.daily : periods.weekly;
      
      // Get or create progress
      let { data: progress } = await supabase
        .from('buddy_quest_progress')
        .select('*')
        .eq('player_buddy_id', buddyId)
        .eq('quest_id', quest.id)
        .eq('period_identifier', periodId)
        .single();
      
      if (!progress) {
        const { data: newProgress } = await supabase
          .from('buddy_quest_progress')
          .insert({
            player_buddy_id: buddyId,
            quest_id: quest.id,
            period_identifier: periodId,
            current_progress: 0,
          })
          .select()
          .single();
        
        progress = newProgress;
      }
      
      if (progress && !progress.is_completed) {
        const newProgressValue = (progress.current_progress || 0) + amount;
        const isCompleted = newProgressValue >= quest.requirement_value;
        
        await supabase
          .from('buddy_quest_progress')
          .update({
            current_progress: newProgressValue,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
          })
          .eq('id', progress.id);
      }
    }
  } catch (error) {
    console.error('Error updating quest progress:', error);
  }
}

/**
 * Award XP and check for level up
 */
export async function awardXP(
  buddyId: string,
  xpAmount: number
): Promise<{ leveled_up: boolean; new_level: number } | null> {
  try {
    const { data: buddy, error } = await supabase
      .from('player_buddies')
      .select('*')
      .eq('id', buddyId)
      .single();
    
    if (error || !buddy) return null;
    
    const currentLevel = buddy.level || 1;
    const currentXP = buddy.experience || 0;
    const newXP = currentXP + xpAmount;
    
    // Calculate XP needed for next level
    const xpForNextLevel = getXPForLevel(currentLevel + 1);
    
    let newLevel = currentLevel;
    let remainingXP = newXP;
    
    // Check for level ups
    while (remainingXP >= getXPForLevel(newLevel + 1) && newLevel < 100) {
      remainingXP -= getXPForLevel(newLevel + 1);
      newLevel++;
    }
    
    if (newLevel > currentLevel) {
      // Leveled up!
      await supabase
        .from('player_buddies')
        .update({
          level: newLevel,
          experience: remainingXP,
          updated_at: new Date().toISOString(),
        })
        .eq('id', buddyId);
      
      // Check for level achievements
      await checkLevelAchievements(buddyId, newLevel);
      
      return { leveled_up: true, new_level: newLevel };
    } else {
      // Just add XP
      await supabase
        .from('player_buddies')
        .update({
          experience: newXP,
          updated_at: new Date().toISOString(),
        })
        .eq('id', buddyId);
      
      return { leveled_up: false, new_level: currentLevel };
    }
    
  } catch (error) {
    console.error('Error awarding XP:', error);
    return null;
  }
}

/**
 * Get XP required for a specific level
 */
function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(level * 10 + Math.max(0, level - 1) * 5);
}

/**
 * Check and award level-based achievements
 */
async function checkLevelAchievements(buddyId: string, level: number): Promise<void> {
  try {
    const milestones = [
      { level: 10, achievement: 'Rising Star' },
      { level: 50, achievement: 'Elite' },
      { level: 100, achievement: 'Master' },
    ];
    
    for (const milestone of milestones) {
      if (level >= milestone.level) {
        // Get achievement
        const { data: achievement } = await supabase
          .from('buddy_achievements')
          .select('*')
          .eq('name', milestone.achievement)
          .single();
        
        if (achievement) {
          // Check if already earned
          const { data: existing } = await supabase
            .from('buddy_player_achievements')
            .select('*')
            .eq('player_buddy_id', buddyId)
            .eq('achievement_id', achievement.id)
            .single();
          
          if (!existing) {
            // Award achievement
            await supabase
              .from('buddy_player_achievements')
              .insert({
                player_buddy_id: buddyId,
                achievement_id: achievement.id,
              });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error);
  }
}

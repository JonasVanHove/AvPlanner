// =====================================================
// BUDDY BATTLE - Points Webhook API
// Called when availability is updated
// POST: Calculate and award points for the day
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { memberId, teamId, date } = body;
    
    if (!memberId || !teamId || !date) {
      return NextResponse.json({ 
        error: 'Missing required fields: memberId, teamId, date' 
      }, { status: 400 });
    }
    
    const dateStr = new Date(date).toISOString().split('T')[0];
    
    // Get member's buddy for this team
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('*')
      .eq('member_id', memberId)
      .eq('team_id', teamId)
      .single();
    
    if (buddyError || !buddy) {
      // No buddy yet, that's okay
      return NextResponse.json({ 
        success: true, 
        message: 'No buddy found for this member',
        points_earned: 0 
      });
    }
    
    // Check if already calculated for this date
    if (buddy.last_points_calculated_date === dateStr) {
      return NextResponse.json({ 
        success: true, 
        message: 'Points already calculated for this date',
        points_earned: 0 
      });
    }
    
    // Check availability for this date
    const { data: availability, error: avError } = await supabase
      .from('availability')
      .select('*')
      .eq('member_id', memberId)
      .eq('date', dateStr)
      .single();
    
    if (avError || !availability) {
      return NextResponse.json({ 
        success: true, 
        message: 'No availability found',
        points_earned: 0 
      });
    }
    
    // Only award points for filled availability
    const validStatuses = ['available', 'remote', 'office', 'holiday', 'sick'];
    if (!availability.status || !validStatuses.includes(availability.status)) {
      return NextResponse.json({ 
        success: true, 
        message: 'Status not valid for points',
        points_earned: 0 
      });
    }
    
    // Base points
    let pointsEarned = 1;
    let isHoliday = false;
    
    // Check if it's a holiday
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
    
    if (buddy.last_points_calculated_date === yesterdayStr) {
      streakDays += 1;
    } else {
      streakDays = 1;
    }
    
    // Streak bonus every 7 days
    if (streakDays > 0 && streakDays % 7 === 0) {
      streakBonus = 1;
    }
    
    const totalPoints = pointsEarned + streakBonus;
    
    // Update buddy
    const newAvailablePoints = (buddy.available_points || 0) + totalPoints;
    const newTotalEarned = (buddy.total_points_earned || 0) + totalPoints;
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
        description: `Points for ${dateStr}${isHoliday ? ' (holiday)' : ''}${streakBonus > 0 ? ` + streak bonus` : ''}`,
        reference_date: dateStr,
      });
    
    // Update quest progress
    await updateQuestProgress(supabase, buddy.id, 'complete_availability');
    await updateQuestProgress(supabase, buddy.id, 'login_streak');
    
    return NextResponse.json({
      success: true,
      points_earned: totalPoints,
      breakdown: {
        base: pointsEarned,
        holiday_bonus: isHoliday ? 1 : 0,
        streak_bonus: streakBonus,
      },
      streak_days: streakDays,
      new_balance: newAvailablePoints,
    });
    
  } catch (error) {
    console.error('Points webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper to update quest progress
async function updateQuestProgress(
  supabase: any,
  buddyId: string,
  requirementType: string
) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    
    const dailyPeriod = `${year}-${month}-${day}`;
    const weeklyPeriod = `${year}-W${String(weekNumber).padStart(2, '0')}`;
    
    // Find matching quests
    const { data: quests } = await supabase
      .from('buddy_quests')
      .select('*')
      .eq('requirement_type', requirementType)
      .eq('is_active', true);
    
    if (!quests || quests.length === 0) return;
    
    for (const quest of quests) {
      const periodId = quest.quest_type === 'daily' ? dailyPeriod : weeklyPeriod;
      
      // Get existing progress
      const { data: progress } = await supabase
        .from('buddy_quest_progress')
        .select('*')
        .eq('player_buddy_id', buddyId)
        .eq('quest_id', quest.id)
        .eq('period_identifier', periodId)
        .single();
      
      if (!progress) {
        // Create new progress
        await supabase
          .from('buddy_quest_progress')
          .insert({
            player_buddy_id: buddyId,
            quest_id: quest.id,
            period_identifier: periodId,
            current_progress: 1,
            is_completed: 1 >= quest.requirement_value,
            completed_at: 1 >= quest.requirement_value ? new Date().toISOString() : null,
          });
      } else if (!progress.is_completed) {
        const newValue = (progress.current_progress || 0) + 1;
        const isComplete = newValue >= quest.requirement_value;
        
        await supabase
          .from('buddy_quest_progress')
          .update({
            current_progress: newValue,
            is_completed: isComplete,
            completed_at: isComplete ? new Date().toISOString() : null,
          })
          .eq('id', progress.id);
      }
    }
  } catch (error) {
    console.error('Quest progress update error:', error);
  }
}

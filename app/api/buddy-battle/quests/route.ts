// =====================================================
// BUDDY BATTLE - Quests API
// GET: Fetch available and active quests
// POST: Claim quest rewards
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

// Get current period identifiers
function getPeriodIdentifiers() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  // Calculate week number
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  
  return {
    daily: `${year}-${month}-${day}`,
    weekly: `${year}-W${String(weekNumber).padStart(2, '0')}`,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }
    
    const supabase = await getSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get player's member for this team
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('team_id', teamId)
      .single();
    
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    // Get player's buddy
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('id')
      .eq('member_id', member.id)
      .single();
    
    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'No buddy found' }, { status: 404 });
    }
    
    const periods = getPeriodIdentifiers();
    
    // Fetch all active quests
    const { data: quests, error: questsError } = await supabase
      .from('buddy_quests')
      .select('*')
      .eq('is_active', true);
    
    if (questsError) {
      console.error('Error fetching quests:', questsError);
      return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
    }
    
    // Fetch player's quest progress for current periods
    const { data: progress, error: progressError } = await supabase
      .from('buddy_quest_progress')
      .select('*')
      .eq('player_buddy_id', buddy.id)
      .in('period_identifier', [periods.daily, periods.weekly]);
    
    if (progressError) {
      console.error('Error fetching progress:', progressError);
    }
    
    // Combine quests with progress
    const questsWithProgress = (quests || []).map(quest => {
      const questProgress = progress?.find(p => 
        p.quest_id === quest.id && 
        p.period_identifier === (quest.quest_type === 'daily' ? periods.daily : periods.weekly)
      );
      
      return {
        id: quest.id,
        name: quest.name,
        description: quest.description,
        quest_type: quest.quest_type,
        requirement_type: quest.requirement_type,
        requirement_value: quest.requirement_value,
        reward_points: quest.reward_points,
        reward_xp: quest.reward_xp,
        reward_item_id: quest.reward_item_id,
        current_progress: questProgress?.current_progress || 0,
        is_completed: questProgress?.is_completed || false,
        is_claimed: questProgress?.is_claimed || false,
        progress_id: questProgress?.id || null,
      };
    });
    
    // Separate by type
    const dailyQuests = questsWithProgress.filter(q => q.quest_type === 'daily');
    const weeklyQuests = questsWithProgress.filter(q => q.quest_type === 'weekly');
    
    return NextResponse.json({
      daily: dailyQuests,
      weekly: weeklyQuests,
      periods,
    });
    
  } catch (error) {
    console.error('Quests GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }
    
    const supabase = await getSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, questId } = body;
    
    // Get player's member for this team
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('team_id', teamId)
      .single();
    
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    // Get player's buddy
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('*')
      .eq('member_id', member.id)
      .single();
    
    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'No buddy found' }, { status: 404 });
    }
    
    const periods = getPeriodIdentifiers();
    
    switch (action) {
      case 'claim': {
        // Get the quest
        const { data: quest, error: questError } = await supabase
          .from('buddy_quests')
          .select('*')
          .eq('id', questId)
          .single();
        
        if (questError || !quest) {
          return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
        }
        
        const periodId = quest.quest_type === 'daily' ? periods.daily : periods.weekly;
        
        // Get progress
        const { data: progress, error: progressError } = await supabase
          .from('buddy_quest_progress')
          .select('*')
          .eq('player_buddy_id', buddy.id)
          .eq('quest_id', questId)
          .eq('period_identifier', periodId)
          .single();
        
        if (progressError || !progress) {
          return NextResponse.json({ 
            success: false, 
            message: 'Quest progress not found' 
          });
        }
        
        if (!progress.is_completed) {
          return NextResponse.json({ 
            success: false, 
            message: 'Quest not completed yet' 
          });
        }
        
        if (progress.is_claimed) {
          return NextResponse.json({ 
            success: false, 
            message: 'Rewards already claimed' 
          });
        }
        
        // Claim rewards
        const newPoints = (buddy.available_points || 0) + quest.reward_points;
        const newXP = (buddy.trainer_xp || 0) + quest.reward_xp;
        
        // Update buddy
        await supabase
          .from('player_buddies')
          .update({
            available_points: newPoints,
            total_points_earned: (buddy.total_points_earned || 0) + quest.reward_points,
            trainer_xp: newXP,
          })
          .eq('id', buddy.id);
        
        // Mark as claimed
        await supabase
          .from('buddy_quest_progress')
          .update({
            is_claimed: true,
            claimed_at: new Date().toISOString(),
          })
          .eq('id', progress.id);
        
        // Add item reward if applicable
        if (quest.reward_item_id) {
          // Check if already has item
          const { data: existingItem } = await supabase
            .from('buddy_player_inventory')
            .select('*')
            .eq('player_buddy_id', buddy.id)
            .eq('item_id', quest.reward_item_id)
            .single();
          
          if (existingItem) {
            // Increase quantity
            await supabase
              .from('buddy_player_inventory')
              .update({ quantity: existingItem.quantity + (quest.reward_item_quantity || 1) })
              .eq('id', existingItem.id);
          } else {
            // Add new item
            await supabase
              .from('buddy_player_inventory')
              .insert({
                player_buddy_id: buddy.id,
                item_id: quest.reward_item_id,
                quantity: quest.reward_item_quantity || 1,
                acquired_from: 'quest',
              });
          }
        }
        
        // Log activity
        await supabase
          .from('buddy_activity_log')
          .insert({
            player_buddy_id: buddy.id,
            team_id: buddy.team_id,
            action_type: 'quest_completed',
            action_data: {
              quest_id: questId,
              quest_name: quest.name,
              reward_points: quest.reward_points,
              reward_xp: quest.reward_xp,
            },
          });
        
        return NextResponse.json({
          success: true,
          rewards: {
            points: quest.reward_points,
            xp: quest.reward_xp,
            item: quest.reward_item_id ? true : false,
          },
          new_balance: newPoints,
        });
      }
      
      case 'update_progress': {
        // This is called internally to update quest progress
        const { requirementType, amount = 1 } = body;
        
        // Find matching quests
        const { data: matchingQuests } = await supabase
          .from('buddy_quests')
          .select('*')
          .eq('requirement_type', requirementType)
          .eq('is_active', true);
        
        if (!matchingQuests || matchingQuests.length === 0) {
          return NextResponse.json({ success: true, message: 'No matching quests' });
        }
        
        for (const quest of matchingQuests) {
          const periodId = quest.quest_type === 'daily' ? periods.daily : periods.weekly;
          
          // Get or create progress
          let { data: progress } = await supabase
            .from('buddy_quest_progress')
            .select('*')
            .eq('player_buddy_id', buddy.id)
            .eq('quest_id', quest.id)
            .eq('period_identifier', periodId)
            .single();
          
          if (!progress) {
            // Create progress
            const { data: newProgress } = await supabase
              .from('buddy_quest_progress')
              .insert({
                player_buddy_id: buddy.id,
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
        
        return NextResponse.json({ success: true });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Quests POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

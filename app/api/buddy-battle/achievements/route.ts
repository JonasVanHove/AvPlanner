// =====================================================
// BUDDY BATTLE - Achievements API
// GET: Fetch player's achievements
// POST: Check and award achievements
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get player's buddy
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'No buddy found' }, { status: 404 });
    }
    
    // Fetch all achievements
    const { data: allAchievements, error: achError } = await supabase
      .from('buddy_achievements')
      .select('*')
      .order('requirement_value', { ascending: true });
    
    if (achError) {
      console.error('Error fetching achievements:', achError);
      return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
    }
    
    // Fetch player's earned achievements
    const { data: earnedAchievements, error: earnedError } = await supabase
      .from('buddy_player_achievements')
      .select('achievement_id, earned_at')
      .eq('player_buddy_id', buddy.id);
    
    if (earnedError) {
      console.error('Error fetching earned achievements:', earnedError);
    }
    
    const earnedIds = new Set(earnedAchievements?.map(a => a.achievement_id) || []);
    
    // Combine with earned status
    const achievements = (allAchievements || []).map(ach => {
      const earned = earnedAchievements?.find(e => e.achievement_id === ach.id);
      return {
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon_name: ach.icon_name,
        achievement_type: ach.achievement_type,
        requirement_value: ach.requirement_value,
        reward_title: ach.reward_title,
        is_earned: earnedIds.has(ach.id),
        earned_at: earned?.earned_at || null,
      };
    });
    
    // Group by type
    const grouped = {
      battle: achievements.filter(a => ['first_battle', 'boss_slayer'].includes(a.achievement_type)),
      level: achievements.filter(a => a.achievement_type === 'level_milestone'),
      streak: achievements.filter(a => a.achievement_type === 'win_streak'),
      collector: achievements.filter(a => a.achievement_type === 'collector'),
      team: achievements.filter(a => a.achievement_type === 'team_player'),
      special: achievements.filter(a => ['perfect_attendance', 'legend'].includes(a.achievement_type)),
    };
    
    return NextResponse.json({
      achievements,
      grouped,
      total: achievements.length,
      earned: achievements.filter(a => a.is_earned).length,
    });
    
  } catch (error) {
    console.error('Achievements GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
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
    const { action } = body;
    
    // Get player's buddy with stats
    const { data: buddy, error: buddyError } = await supabase
      .from('player_buddies')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'No buddy found' }, { status: 404 });
    }
    
    // Get trainer profile
    const { data: profile } = await supabase
      .from('buddy_trainer_profiles')
      .select('*')
      .eq('player_buddy_id', buddy.id)
      .single();
    
    switch (action) {
      case 'check_all': {
        const newAchievements: string[] = [];
        
        // Get all achievements
        const { data: achievements } = await supabase
          .from('buddy_achievements')
          .select('*');
        
        // Get already earned
        const { data: earned } = await supabase
          .from('buddy_player_achievements')
          .select('achievement_id')
          .eq('player_buddy_id', buddy.id);
        
        const earnedIds = new Set(earned?.map(e => e.achievement_id) || []);
        
        for (const ach of achievements || []) {
          if (earnedIds.has(ach.id)) continue;
          
          let shouldAward = false;
          
          switch (ach.achievement_type) {
            case 'first_battle':
              shouldAward = (profile?.total_battles || 0) >= ach.requirement_value;
              break;
            case 'boss_slayer':
              shouldAward = (profile?.bosses_defeated || 0) >= ach.requirement_value;
              break;
            case 'level_milestone':
              shouldAward = (buddy.level || 1) >= ach.requirement_value;
              break;
            case 'win_streak':
              shouldAward = (profile?.longest_login_streak || 0) >= ach.requirement_value;
              break;
            case 'collector':
              // Count unique items
              const { count } = await supabase
                .from('buddy_player_inventory')
                .select('*', { count: 'exact', head: true })
                .eq('player_buddy_id', buddy.id);
              shouldAward = (count || 0) >= ach.requirement_value;
              break;
            case 'legend':
              shouldAward = (profile?.battles_won || 0) >= ach.requirement_value;
              break;
          }
          
          if (shouldAward) {
            // Award achievement
            await supabase
              .from('buddy_player_achievements')
              .insert({
                player_buddy_id: buddy.id,
                achievement_id: ach.id,
              });
            
            newAchievements.push(ach.name);
            
            // Log activity
            await supabase
              .from('buddy_activity_log')
              .insert({
                player_buddy_id: buddy.id,
                team_id: buddy.team_id,
                action_type: 'achievement_earned',
                action_data: {
                  achievement_id: ach.id,
                  achievement_name: ach.name,
                  reward_title: ach.reward_title,
                },
              });
          }
        }
        
        return NextResponse.json({
          success: true,
          new_achievements: newAchievements,
          count: newAchievements.length,
        });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Achievements POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

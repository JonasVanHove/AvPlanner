// =====================================================
// BUDDY BATTLE - Leaderboard API
// GET: Fetch leaderboard rankings
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

type LeaderboardCategory = 'level' | 'battles' | 'bosses' | 'streak' | 'points';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || 'level') as LeaderboardCategory;
    const teamId = searchParams.get('teamId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }
    
    // Determine order column based on category
    let orderColumn: string;
    switch (category) {
      case 'level':
        orderColumn = 'trainer_level';
        break;
      case 'battles':
        orderColumn = 'battles_won';
        break;
      case 'bosses':
        orderColumn = 'bosses_defeated';
        break;
      case 'streak':
        orderColumn = 'streak_days';
        break;
      case 'points':
        orderColumn = 'total_points';
        break;
      default:
        orderColumn = 'trainer_level';
    }
    
    // Fetch buddies for team members
    const { data: buddies, error: buddyError } = await supabase
      .from('player_buddies')
      .select(`
        id,
        user_id,
        buddy_name,
        buddy_type,
        element,
        trainer_level,
        trainer_xp,
        total_points,
        battles_won,
        battles_lost,
        bosses_defeated,
        streak_days,
        team_id
      `)
      .eq('team_id', teamId)
      .order(orderColumn, { ascending: false })
      .limit(limit);
    
    if (buddyError) {
      console.error('Error fetching leaderboard:', buddyError);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
    
    // Get user profiles for display names
    const userIds = buddies?.map(b => b.user_id) || [];
    
    const { data: profiles } = await supabase
      .from('members')
      .select('auth_user_id, name')
      .in('auth_user_id', userIds);
    
    // Build rankings
    const rankings = (buddies || []).map((buddy, index) => {
      const profile = profiles?.find(p => p.auth_user_id === buddy.user_id);
      
      // Calculate XP progress for current level
      const currentLevelXP = getXPForLevel(buddy.trainer_level);
      const nextLevelXP = getXPForLevel(buddy.trainer_level + 1);
      const xpProgress = {
        current: buddy.trainer_xp - currentLevelXP,
        required: nextLevelXP - currentLevelXP,
      };
      
      // Get value based on category
      let value: number;
      switch (category) {
        case 'level':
          value = buddy.trainer_level;
          break;
        case 'battles':
          value = buddy.battles_won;
          break;
        case 'bosses':
          value = buddy.bosses_defeated;
          break;
        case 'streak':
          value = buddy.streak_days;
          break;
        case 'points':
          value = buddy.total_points;
          break;
        default:
          value = buddy.trainer_level;
      }
      
      return {
        position: index + 1,
        user_id: buddy.user_id,
        trainer_name: profile?.name || 'Unknown Trainer',
        buddy_name: buddy.buddy_name,
        buddy_element: buddy.element,
        value,
        xp_progress: xpProgress,
        is_current_player: buddy.user_id === user.id,
      };
    });
    
    // Find player's rank
    const playerRank = rankings.findIndex(r => r.is_current_player) + 1;
    
    return NextResponse.json({
      rankings,
      player_rank: playerRank || rankings.length + 1,
      total_players: rankings.length,
      category,
    });
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// XP calculation helper
function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  // Exponential formula: each level requires more XP
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

// =====================================================
// BUDDY BATTLE - Leaderboard API
// GET: Fetch leaderboard rankings
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type LeaderboardCategory = 'level' | 'battles' | 'bosses' | 'streak' | 'points';

export async function GET(request: NextRequest) {
  try {
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || 'level') as LeaderboardCategory;
    const teamId = searchParams.get('teamId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }
    
    // Determine order column based on category
    // Using actual columns from player_buddies table
    let orderColumn: string;
    switch (category) {
      case 'level':
        orderColumn = 'level';
        break;
      case 'battles':
        orderColumn = 'wins';
        break;
      case 'bosses':
        orderColumn = 'boss_defeats';
        break;
      case 'streak':
        orderColumn = 'streak_days';
        break;
      case 'points':
        orderColumn = 'total_points_earned';
        break;
      default:
        orderColumn = 'level';
    }
    
    // Fetch buddies for team with buddy type info
    const { data: buddies, error: buddyError } = await supabase
      .from('player_buddies')
      .select(`
        id,
        member_id,
        nickname,
        level,
        total_xp,
        wins,
        losses,
        boss_defeats,
        streak_days,
        total_points_earned,
        available_points,
        buddy_type_id,
        buddy_types(name, element)
      `)
      .eq('team_id', teamId)
      .order(orderColumn, { ascending: false, nullsFirst: false })
      .limit(limit);
    
    if (buddyError) {
      console.error('Error fetching leaderboard:', buddyError);
      return NextResponse.json({ 
        rankings: [],
        player_rank: 0,
        total_players: 0,
        category,
        error: buddyError.message 
      });
    }
    
    if (!buddies || buddies.length === 0) {
      return NextResponse.json({
        rankings: [],
        player_rank: 0,
        total_players: 0,
        category,
      });
    }
    
    // Get member info for display names
    const memberIds = buddies.map(b => b.member_id);
    
    const { data: members } = await supabase
      .from('members')
      .select('id, first_name, last_name, auth_user_id')
      .in('id', memberIds);
    
    // Get current user to mark their entry
    const cookieStore = await cookies();
    const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    });
    const { data: { user } } = await authClient.auth.getUser();
    
    // Build rankings
    const rankings = buddies.map((buddy, index) => {
      const member = members?.find(m => m.id === buddy.member_id);
      const buddyType = Array.isArray(buddy.buddy_types) ? buddy.buddy_types[0] : buddy.buddy_types;
      
      // Get value based on category
      let value: number;
      switch (category) {
        case 'level':
          value = buddy.level || 1;
          break;
        case 'battles':
          value = buddy.wins || 0;
          break;
        case 'bosses':
          value = buddy.boss_defeats || 0;
          break;
        case 'streak':
          value = buddy.streak_days || 0;
          break;
        case 'points':
          value = buddy.total_points_earned || 0;
          break;
        default:
          value = buddy.level || 1;
      }
      
      return {
        rank: index + 1,
        user_id: member?.auth_user_id || buddy.member_id,
        trainer_name: member ? `${member.first_name} ${member.last_name}`.trim() : 'Unknown',
        buddy_name: buddy.nickname || buddyType?.name || 'Buddy',
        buddy_element: buddyType?.element || 'neutral',
        value,
        level: buddy.level || 1,
        total_xp: buddy.total_xp || 0,
        is_current_player: user?.id === member?.auth_user_id,
      };
    });
    
    // Find player's rank
    const playerRank = rankings.findIndex(r => r.is_current_player) + 1;
    
    return NextResponse.json({
      rankings,
      player_rank: playerRank || 0,
      total_players: rankings.length,
      category,
    });
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({
      rankings: [],
      player_rank: 0,
      total_players: 0,
      error: 'Internal server error'
    });
  }
}

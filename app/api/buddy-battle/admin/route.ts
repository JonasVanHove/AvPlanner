// =====================================================
// BUDDY BATTLE - Admin API
// GET: Fetch admin dashboard data
// POST: Admin actions (reset, bonuses, etc.)
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
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }
    
    // Check if user is team admin
    const { data: member } = await supabase
      .from('members')
      .select('is_admin')
      .eq('team_id', teamId)
      .eq('auth_user_id', user.id)
      .single();
    
    if (!member?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Fetch all buddies in team
    const { data: buddies, error: buddiesError } = await supabase
      .from('player_buddies')
      .select('*')
      .eq('team_id', teamId);
    
    if (buddiesError) {
      console.error('Error fetching buddies:', buddiesError);
    }
    
    const buddyList = buddies || [];
    
    // Get member names
    const userIds = buddyList.map(b => b.user_id);
    const { data: members } = await supabase
      .from('members')
      .select('auth_user_id, name')
      .in('auth_user_id', userIds);
    
    // Calculate stats
    const today = new Date().toISOString().split('T')[0];
    const totalPlayers = buddyList.length;
    const activeToday = buddyList.filter(b => 
      b.last_availability_date === today
    ).length;
    const totalBattles = buddyList.reduce((sum, b) => sum + (b.battles_won || 0) + (b.battles_lost || 0), 0);
    const totalPoints = buddyList.reduce((sum, b) => sum + (b.total_points || 0), 0);
    const bossDefeats = buddyList.reduce((sum, b) => sum + (b.bosses_defeated || 0), 0);
    const avgLevel = totalPlayers > 0 
      ? buddyList.reduce((sum, b) => sum + (b.trainer_level || 1), 0) / totalPlayers 
      : 0;
    
    // Most popular element
    const elementCounts: Record<string, number> = {};
    buddyList.forEach(b => {
      elementCounts[b.element] = (elementCounts[b.element] || 0) + 1;
    });
    const mostPopularElement = Object.entries(elementCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'fire';
    
    // Top streaker
    const topStreaker = buddyList.reduce((best, b) => {
      if ((b.streak_days || 0) > (best?.streak_days || 0)) {
        const member = members?.find(m => m.auth_user_id === b.user_id);
        return { name: member?.name || 'Unknown', days: b.streak_days || 0 };
      }
      return best;
    }, { name: 'None', days: 0 });
    
    // Player details
    const players = buddyList.map(b => {
      const member = members?.find(m => m.auth_user_id === b.user_id);
      return {
        user_id: b.user_id,
        trainer_name: member?.name || 'Unknown',
        buddy_name: b.buddy_name,
        element: b.element,
        level: b.trainer_level || 1,
        total_points: b.total_points || 0,
        battles_won: b.battles_won || 0,
        streak_days: b.streak_days || 0,
        last_active: b.last_availability_date || b.created_at,
        anxiety_level: b.anxiety_level || 0,
      };
    });
    
    // Fetch daily analytics (last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const { data: analyticsData } = await supabase
      .from('buddy_daily_analytics')
      .select('*')
      .eq('team_id', teamId)
      .gte('date', twoWeeksAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });
    
    const analytics = (analyticsData || []).map(day => ({
      date: day.date,
      active_users: day.active_users || 0,
      points_earned: day.total_points_earned || 0,
      battles_fought: day.battles_fought || 0,
      quests_completed: day.quests_completed || 0,
    }));
    
    return NextResponse.json({
      stats: {
        total_players: totalPlayers,
        active_today: activeToday,
        total_battles: totalBattles,
        total_points_distributed: totalPoints,
        boss_defeats: bossDefeats,
        average_level: avgLevel,
        most_popular_element: mostPopularElement,
        top_streaker: topStreaker,
      },
      players,
      analytics,
    });
    
  } catch (error) {
    console.error('Admin GET error:', error);
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
    const { action, teamId, ...params } = body;
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }
    
    // Check if user is team admin
    const { data: member } = await supabase
      .from('members')
      .select('is_admin')
      .eq('team_id', teamId)
      .eq('auth_user_id', user.id)
      .single();
    
    if (!member?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    switch (action) {
      case 'send_bonus': {
        const { amount = 10 } = params;
        
        // Give bonus to all team members
        await supabase.rpc('give_team_bonus', {
          p_team_id: teamId,
          p_bonus_amount: amount,
        });
        
        return NextResponse.json({ success: true, message: `Sent ${amount} bonus points to all team members` });
      }
      
      case 'refresh_shop': {
        // Force shop refresh
        await supabase
          .from('buddy_shop_inventory')
          .update({ expires_at: new Date().toISOString() })
          .eq('team_id', teamId);
        
        return NextResponse.json({ success: true, message: 'Shop refreshed' });
      }
      
      case 'reset_all': {
        // This is dangerous - reset all progress
        // In production, add additional confirmation
        await supabase
          .from('player_buddies')
          .delete()
          .eq('team_id', teamId);
        
        return NextResponse.json({ success: true, message: 'All progress reset' });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Admin POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

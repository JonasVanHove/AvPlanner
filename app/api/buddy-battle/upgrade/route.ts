// =====================================================
// BUDDY BATTLE - API ROUTE: Stat Upgrades
// Points based on availability history
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { calculateUpgradeCost } from '@/lib/buddy-battle/game-logic';
import { StatType, BuddyStat } from '@/lib/buddy-battle/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Point values per availability status
const POINTS_PER_STATUS: Record<string, number> = {
  'available': 2,      // Full availability = 2 points
  'remote': 2,         // Remote work = 2 points
  'unavailable': 1,    // Unavailable but indicated = 1 point (effort for filling in)
  'need_to_check': 0,  // Uncertain = 0 points
  'absent': 1,         // Absent but indicated = 1 point
  'holiday': 1,        // Holiday = 1 point
  'maybe': 0,          // Maybe = 0 points
};

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// Create admin client for database operations (bypasses RLS)
function createAdminClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
}

// Helper to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  // First try SSR cookies approach
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log('[buddy-battle/upgrade] SSR auth check:', { 
    hasUser: !!user, 
    userId: user?.id,
    error: error?.message 
  });
  
  if (user) {
    return { user, adminClient: createAdminClient() };
  }
  
  // Fallback: try Authorization header with token verification
  const authHeader = request.headers.get('authorization');
  console.log('[buddy-battle/upgrade] Checking auth header:', { 
    hasHeader: !!authHeader,
    headerStart: authHeader?.substring(0, 30) 
  });
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
    // Create a new client and use the token directly for verification
    const supabaseWithToken = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    
    // Get the user using the token
    const { data: { user: tokenUser }, error: tokenError } = await supabaseWithToken.auth.getUser(token);
    
    console.log('[buddy-battle/upgrade] Token auth check:', { 
      hasUser: !!tokenUser, 
      userId: tokenUser?.id,
      error: tokenError?.message
    });
    
    if (tokenUser) {
      return { user: tokenUser, adminClient: createAdminClient() };
    }
  }
  
  console.log('[buddy-battle/upgrade] No authenticated user found');
  return null;
}

// Calculate total earned points from availability history (up to today)
async function calculatePointsFromAvailability(
  adminClient: ReturnType<typeof createAdminClient>,
  memberId: string
): Promise<{ totalEarned: number; breakdown: { status: string; count: number; points: number }[] }> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get all availability records for this member up to today
  const { data: availabilities, error } = await adminClient
    .from('availability')
    .select('status, date')
    .eq('member_id', memberId)
    .lte('date', today);
  
  if (error || !availabilities) {
    console.error('Error fetching availability:', error);
    return { totalEarned: 0, breakdown: [] };
  }
  
  // Count by status
  const statusCounts: Record<string, number> = {};
  for (const av of availabilities) {
    statusCounts[av.status] = (statusCounts[av.status] || 0) + 1;
  }
  
  // Calculate points
  const breakdown: { status: string; count: number; points: number }[] = [];
  let totalEarned = 0;
  
  for (const [status, count] of Object.entries(statusCounts)) {
    const pointsPerEntry = POINTS_PER_STATUS[status] ?? 0;
    const statusPoints = count * pointsPerEntry;
    totalEarned += statusPoints;
    breakdown.push({ status, count, points: statusPoints });
  }
  
  return { totalEarned, breakdown };
}

// GET /api/buddy-battle/upgrade - Get current user's buddy upgrade options
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }
    
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { user, adminClient } = auth;

    // Find user's member record for this specific team (using admin client to bypass RLS)
    const { data: member, error: memberError } = await adminClient
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('team_id', teamId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get user's buddy with buddy_type info
    const { data: buddy, error: buddyError } = await adminClient
      .from('player_buddies')
      .select('*, buddy_type:buddy_types(*)')
      .eq('member_id', member.id)
      .single();

    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'No buddy found', buddy: null }, { status: 200 });
    }

    // Calculate available upgrades for each stat
    const stats: BuddyStat[] = ['hp', 'attack', 'defense', 'speed', 'special_attack', 'special_defense', 'critical_chance'];
    const upgrades = stats.map(stat => {
      const currentValue = stat === 'hp' ? buddy.max_hp : buddy[stat];
      return calculateUpgradeCost(currentValue, stat, buddy.level);
    });

    // Calculate points from availability history
    const { totalEarned, breakdown } = await calculatePointsFromAvailability(adminClient, member.id);
    
    // Get total points spent from database
    const totalSpent = buddy.total_points_spent || 0;
    
    // Calculate available points (earned - spent)
    const availablePoints = Math.max(0, totalEarned - totalSpent);

    // Get today's upgrade count (daily limit check)
    const today = new Date().toISOString().split('T')[0];
    const { count: todayUpgrades } = await adminClient
      .from('buddy_stat_upgrades')
      .select('*', { count: 'exact', head: true })
      .eq('player_buddy_id', buddy.id)
      .gte('created_at', today);

    return NextResponse.json({
      buddy: {
        ...buddy,
        name: buddy.nickname,
        element: buddy.buddy_type?.element || 'fire',
      },
      // Points system
      available_points: availablePoints,
      total_earned: totalEarned,
      total_spent: totalSpent,
      points_breakdown: breakdown,
      // Upgrade info
      upgrades,
      total_upgrades_today: todayUpgrades || 0,
    });
  } catch (error) {
    console.error('Upgrade GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upgrade data' },
      { status: 500 }
    );
  }
}

// POST /api/buddy-battle/upgrade - Perform upgrade
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }
    
    const body = await request.json();
    const { stat } = body;

    // Validate stat type
    const validStats: BuddyStat[] = [
      'hp', 'attack', 'defense', 'speed',
      'special_attack', 'special_defense', 'critical_chance'
    ];
    if (!stat || !validStats.includes(stat)) {
      return NextResponse.json({ error: 'Invalid stat type' }, { status: 400 });
    }

    // Get authenticated user
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { user, adminClient } = auth;

    // Find user's member record for this specific team
    const { data: member, error: memberError } = await adminClient
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('team_id', teamId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get user's buddy
    const { data: buddy, error: buddyError } = await adminClient
      .from('player_buddies')
      .select('*, buddy_type:buddy_types(*)')
      .eq('member_id', member.id)
      .single();

    if (buddyError || !buddy) {
      return NextResponse.json({ error: 'No buddy found' }, { status: 404 });
    }

    // Calculate upgrade cost
    const currentValue = stat === 'hp' ? buddy.max_hp : buddy[stat];
    const upgradeInfo = calculateUpgradeCost(currentValue, stat, buddy.level);

    if (upgradeInfo.is_maxed) {
      return NextResponse.json({ 
        success: false, 
        message: 'Cannot upgrade this stat (maxed)' 
      }, { status: 400 });
    }

    // Calculate available points from availability history
    const { totalEarned } = await calculatePointsFromAvailability(adminClient, member.id);
    const totalSpent = buddy.total_points_spent || 0;
    const availablePoints = Math.max(0, totalEarned - totalSpent);
    
    if (availablePoints < upgradeInfo.point_cost) {
      return NextResponse.json({ 
        success: false, 
        message: `Not enough points. Need ${upgradeInfo.point_cost}, have ${availablePoints}` 
      }, { status: 400 });
    }

    // Perform the upgrade - update stat AND increment total_points_spent
    const columnToUpdate = stat === 'hp' ? 'max_hp' : stat;
    const newValue = upgradeInfo.next_value;
    const newTotalSpent = totalSpent + upgradeInfo.point_cost;

    const { error: updateError } = await adminClient
      .from('player_buddies')
      .update({
        [columnToUpdate]: newValue,
        total_points_spent: newTotalSpent,
        available_points: totalEarned - newTotalSpent, // Keep available_points in sync
      })
      .eq('id', buddy.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to update buddy stats' 
      }, { status: 500 });
    }

    // Log the upgrade for audit trail
    try {
      await adminClient
        .from('buddy_stat_upgrades')
        .insert({
          player_buddy_id: buddy.id,
          stat_type: stat,
          old_value: currentValue,
          new_value: newValue,
          points_spent: upgradeInfo.point_cost,
        });
      
      // Also log in point transactions
      await adminClient
        .from('buddy_point_transactions')
        .insert({
          player_buddy_id: buddy.id,
          amount: -upgradeInfo.point_cost,
          transaction_type: 'stat_upgrade',
          description: `Upgraded ${stat} from ${currentValue} to ${newValue}`,
        });
    } catch (e) {
      // Ignore logging errors - upgrade already succeeded
      console.error('Logging error:', e);
    }

    // Fetch fresh data for response
    const freshResponse = await GET(request);
    const freshData = await freshResponse.json();

    return NextResponse.json({
      success: true,
      message: `${stat.toUpperCase()} upgraded!`,
      new_value: newValue,
      data: freshData,
    });
  } catch (error) {
    console.error('Upgrade POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to perform upgrade' },
      { status: 500 }
    );
  }
}

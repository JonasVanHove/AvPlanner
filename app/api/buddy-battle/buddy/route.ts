// =====================================================
// BUDDY BATTLE - API ROUTE: Buddy Management
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import {
  getPlayerBuddy,
  createPlayerBuddy,
  updateBuddyColors,
  calculateAndAwardPoints,
  updateLoginStreak,
  getActiveQuests,
  getActiveTeamBuffs,
} from '@/lib/buddy-battle/api';
import { getCurrentQuarter, isBossBattleAvailable } from '@/lib/buddy-battle/game-logic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

// Create admin client for database operations
function createAdminClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
}

// Helper to get authenticated user from cookies or auth header
async function getAuthenticatedUser(request: NextRequest) {
  // First try SSR cookies approach
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log('[buddy-battle/buddy] Auth check:', { 
    hasUser: !!user, 
    userId: user?.id,
    error: error?.message 
  });
  
  if (user) {
    return { user, supabase, adminClient: createAdminClient() };
  }
  
  // Fallback: try Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const supabaseWithToken = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    const { data: { user: tokenUser }, error: tokenError } = await supabaseWithToken.auth.getUser(token);
    
    console.log('[buddy-battle/buddy] Auth header check:', { 
      hasUser: !!tokenUser, 
      userId: tokenUser?.id,
      error: tokenError?.message 
    });
    
    if (tokenUser) {
      return { user: tokenUser, supabase: supabaseWithToken, adminClient: createAdminClient() };
    }
  }
  
  return { user: null, supabase, adminClient: createAdminClient() };
}

// GET /api/buddy-battle/buddy?teamId=xxx
export async function GET(request: NextRequest) {
  try {
    const { user, adminClient } = await getAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    console.log('[buddy-battle/buddy GET] Request:', { 
      teamId, 
      hasUser: !!user, 
      userId: user?.id 
    });

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }

    // Get current user
    if (!user) {
      console.log('[buddy-battle/buddy GET] No user, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member for this team using admin client (bypass RLS)
    const { data: member, error: memberError } = await adminClient
      .from('members')
      .select('id')
      .eq('team_id', teamId)
      .eq('auth_user_id', user.id)
      .single();

    console.log('[buddy-battle/buddy GET] Member lookup:', { 
      found: !!member, 
      memberId: member?.id, 
      error: memberError?.message 
    });

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get buddy
    const buddy = await getPlayerBuddy(member.id, teamId);

    if (!buddy) {
      return NextResponse.json({ buddy: null, needsSetup: true });
    }

    // Calculate and award any pending points
    const pointsResult = await calculateAndAwardPoints(member.id, buddy.id, teamId);

    // Update login streak
    const trainerProfile = await updateLoginStreak(buddy.id);

    // Get active quests
    const activeQuests = await getActiveQuests(buddy.id);

    // Get team buffs
    const teamBuffs = await getActiveTeamBuffs(teamId);

    // Check boss availability using admin client
    const quarter = getCurrentQuarter();
    const { data: bossAttempts } = await adminClient
      .from('boss_battle_attempts')
      .select('*')
      .eq('player_buddy_id', buddy.id)
      .eq('quarter_year', quarter);

    const dashboard = {
      buddy: {
        ...buddy,
        points_awarded_today: pointsResult.pointsAwarded,
      },
      trainer: trainerProfile,
      active_quests: activeQuests,
      active_team_buffs: teamBuffs,
      next_level_xp: buddy.level < 100 ? (buddy.level * 10 + (buddy.level - 1) * 5) : 0,
      available_battles: {
        can_do_tutorial: !trainerProfile?.tutorial_completed,
        can_do_boss: isBossBattleAvailable() && (bossAttempts?.length || 0) < 2,
        boss_attempts_used: bossAttempts?.length || 0,
        max_boss_attempts: 2,
      },
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Buddy GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch buddy data' },
      { status: 500 }
    );
  }
}

// POST /api/buddy-battle/buddy - Create new buddy
export async function POST(request: NextRequest) {
  try {
    const { user, adminClient } = await getAuthenticatedUser(request);
    const body = await request.json();
    const { teamId, buddyTypeId, nickname, colors } = body;

    console.log('[buddy-battle/buddy POST] Request:', { 
      teamId, 
      buddyTypeId,
      hasUser: !!user, 
      userId: user?.id 
    });

    if (!teamId || !buddyTypeId) {
      return NextResponse.json(
        { error: 'Team ID and Buddy Type ID required' },
        { status: 400 }
      );
    }

    // Check authentication
    if (!user) {
      console.log('[buddy-battle/buddy POST] No user, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member for this team using admin client (bypass RLS)
    const { data: member, error: memberError } = await adminClient
      .from('members')
      .select('id')
      .eq('team_id', teamId)
      .eq('auth_user_id', user.id)
      .single();

    console.log('[buddy-battle/buddy POST] Member lookup:', { 
      found: !!member, 
      memberId: member?.id, 
      error: memberError?.message 
    });

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if already has a buddy using admin client
    const { data: existingBuddy } = await adminClient
      .from('player_buddies')
      .select('id')
      .eq('member_id', member.id)
      .eq('team_id', teamId)
      .single();
      
    if (existingBuddy) {
      return NextResponse.json(
        { error: 'Already have a buddy for this team' },
        { status: 400 }
      );
    }

    // Buddy type data with UUIDs
    const BUDDY_TYPES: Record<string, { 
      name: string; 
      uuid: string;
      base_hp: number; 
      base_attack: number; 
      base_defense: number; 
      base_speed: number;
      base_special_attack: number;
      base_special_defense: number;
    }> = {
      blazor: { name: 'Blazor', uuid: '11111111-1111-1111-1111-111111111111', base_hp: 85, base_attack: 95, base_defense: 70, base_speed: 85, base_special_attack: 90, base_special_defense: 65 },
      aquabit: { name: 'Aquabit', uuid: '22222222-2222-2222-2222-222222222222', base_hp: 100, base_attack: 75, base_defense: 90, base_speed: 70, base_special_attack: 80, base_special_defense: 95 },
      terrapix: { name: 'Terrapix', uuid: '33333333-3333-3333-3333-333333333333', base_hp: 120, base_attack: 80, base_defense: 100, base_speed: 50, base_special_attack: 60, base_special_defense: 90 },
      zephyron: { name: 'Zephyron', uuid: '44444444-4444-4444-4444-444444444444', base_hp: 70, base_attack: 85, base_defense: 60, base_speed: 110, base_special_attack: 85, base_special_defense: 55 },
      voltling: { name: 'Voltling', uuid: '55555555-5555-5555-5555-555555555555', base_hp: 80, base_attack: 90, base_defense: 75, base_speed: 95, base_special_attack: 95, base_special_defense: 70 },
    };

    const buddyType = BUDDY_TYPES[buddyTypeId];
    if (!buddyType) {
      return NextResponse.json({ error: `Unknown buddy type: ${buddyTypeId}` }, { status: 400 });
    }

    // Create buddy with admin client (bypass RLS)
    const { data: buddy, error: createError } = await adminClient
      .from('player_buddies')
      .insert({
        member_id: member.id,
        team_id: teamId,
        buddy_type_id: buddyType.uuid,
        nickname: nickname || null,
        max_hp: buddyType.base_hp,
        current_hp: buddyType.base_hp,
        attack: buddyType.base_attack,
        defense: buddyType.base_defense,
        speed: buddyType.base_speed,
        special_attack: buddyType.base_special_attack,
        special_defense: buddyType.base_special_defense,
        color_primary: colors?.primary || '#4CAF50',
        color_secondary: colors?.secondary || '#2196F3',
        color_accent: colors?.accent || '#FFC107',
      })
      .select()
      .single();

    if (createError) {
      console.error('Create buddy error:', createError);
      return NextResponse.json(
        { error: `Database error: ${createError.message}`, code: createError.code },
        { status: 500 }
      );
    }

    console.log('[buddy-battle/buddy POST] Buddy created:', buddy.id);

    // Create trainer profile with admin client
    await adminClient
      .from('buddy_trainer_profiles')
      .insert({
        player_buddy_id: buddy.id,
      });

    return NextResponse.json({ buddy }, { status: 201 });
  } catch (error) {
    console.error('Buddy POST error:', error);
    let errorMessage = 'Failed to create buddy';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    } else if (typeof error === 'object' && error !== null) {
      errorDetails = JSON.stringify(error, null, 2);
    } else {
      errorDetails = String(error);
    }
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}

// PATCH /api/buddy-battle/buddy - Update buddy
export async function PATCH(request: NextRequest) {
  try {
    const { user, adminClient } = await getAuthenticatedUser(request);
    const body = await request.json();
    const { buddyId, colors, nickname } = body;

    if (!buddyId) {
      return NextResponse.json({ error: 'Buddy ID required' }, { status: 400 });
    }

    // Check authentication
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership using admin client
    const { data: buddy, error: buddyError } = await adminClient
      .from('player_buddies')
      .select('id, member:members!inner(auth_user_id)')
      .eq('id', buddyId)
      .single();

    // Handle member as possibly array due to Supabase join
    const memberData = Array.isArray(buddy?.member) ? buddy.member[0] : buddy?.member;
    
    if (buddyError || !buddy || memberData?.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Buddy not found or unauthorized' }, { status: 404 });
    }

    // Update colors
    if (colors) {
      await updateBuddyColors(buddyId, colors);
    }

    // Update nickname using admin client
    if (nickname !== undefined) {
      await adminClient
        .from('player_buddies')
        .update({ nickname, updated_at: new Date().toISOString() })
        .eq('id', buddyId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Buddy PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update buddy' },
      { status: 500 }
    );
  }
}

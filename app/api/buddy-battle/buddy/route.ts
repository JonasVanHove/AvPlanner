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
// Use service role key if available, otherwise fall back to anon key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
const isAdminKeyAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== supabaseAnonKey;

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

    // Calculate and award any pending points (safe - don't crash if this fails)
    let pointsResult = { pointsAwarded: 0, breakdown: [] };
    try {
      pointsResult = await calculateAndAwardPoints(member.id, buddy.id, teamId);
    } catch (pointsError) {
      console.error('[buddy-battle/buddy] Points calculation failed:', pointsError);
    }

    // Update login streak (safe - returns null if fails)
    const trainerProfile = await updateLoginStreak(buddy.id);

    // Get active quests (safe - returns empty array)
    const activeQuests = await getActiveQuests(buddy.id);

    // Get team buffs (safe - returns empty array)
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

    // Use authenticated client if admin key is missing, otherwise use admin client
    // This ensures that if we don't have the service key, we rely on RLS policies for the user
    const dbClient = isAdminKeyAvailable ? adminClient : supabase;

    // Get member for this team using appropriate client
    const { data: member, error: memberError } = await dbClient
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

    // Check if already has a buddy using appropriate client
    const { data: existingBuddy } = await dbClient
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

    // Buddy types with LEVEL 1 starting stats (Pokemon-style)
    // These are the actual stats a buddy has at level 1 with 0 experience
    // Stats will grow through upgrades purchased with coins
    const BUDDY_TYPES: Record<string, { 
      name: string; 
      uuid: string;
      // Level 1 starting stats (low like real Pokemon starters)
      hp: number; 
      attack: number; 
      defense: number; 
      speed: number;
      special_attack: number;
      special_defense: number;
    }> = {
      // All buddies start weak but balanced - different strengths
      blazor: { 
        name: 'Blazor', 
        uuid: '11111111-1111-1111-1111-111111111111', 
        hp: 20, attack: 10, defense: 8, speed: 9, special_attack: 10, special_defense: 7 
      },
      aquabit: { 
        name: 'Aquabit', 
        uuid: '22222222-2222-2222-2222-222222222222', 
        hp: 22, attack: 8, defense: 10, speed: 8, special_attack: 9, special_defense: 11 
      },
      terrapix: { 
        name: 'Terrapix', 
        uuid: '33333333-3333-3333-3333-333333333333', 
        hp: 25, attack: 9, defense: 12, speed: 6, special_attack: 7, special_defense: 10 
      },
      zephyron: { 
        name: 'Zephyron', 
        uuid: '44444444-4444-4444-4444-444444444444', 
        hp: 18, attack: 9, defense: 7, speed: 12, special_attack: 9, special_defense: 6 
      },
      voltling: { 
        name: 'Voltling', 
        uuid: '55555555-5555-5555-5555-555555555555', 
        hp: 19, attack: 10, defense: 8, speed: 11, special_attack: 11, special_defense: 7 
      },
    };

    const buddyType = BUDDY_TYPES[buddyTypeId];
    if (!buddyType) {
      return NextResponse.json({ error: `Unknown buddy type: ${buddyTypeId}` }, { status: 400 });
    }

    // Create buddy with appropriate client
    // Start at level 1 - only use columns that exist in database
    const { data: buddy, error: createError } = await dbClient
      .from('player_buddies')
      .insert({
        member_id: member.id,
        team_id: teamId,
        buddy_type_id: buddyType.uuid,
        nickname: nickname || null,
        level: 1,
        max_hp: buddyType.hp,
        current_hp: buddyType.hp,
        attack: buddyType.attack,
        defense: buddyType.defense,
        speed: buddyType.speed,
        special_attack: buddyType.special_attack,
        special_defense: buddyType.special_defense,
        critical_chance: 5,
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

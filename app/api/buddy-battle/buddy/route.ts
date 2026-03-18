// =====================================================
// BUDDY BATTLE - API ROUTE: Buddy Management
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
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
import { getAuthenticatedUser, isAdminKeyAvailable } from '@/lib/buddy-battle/server-auth';

export const runtime = 'nodejs';

function getFetchFailedHint(error: any): string | undefined {
  const message = String(error?.message ?? '');
  const details = String(error?.details ?? '');

  if (!message.includes('fetch failed') && !details.includes('fetch failed')) {
    return undefined;
  }

  return 'Server-side Supabase request failed. On Windows dev, restart with the updated dev script so Node uses IPv4 first. If it still fails, add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart.';
}

// GET /api/buddy-battle/buddy?teamId=xxx
export async function GET(request: NextRequest) {
  try {
    console.log('[buddy GET] handler entered');
    const { user, adminClient, supabase } = await getAuthenticatedUser(request);
    console.log('[buddy GET] getAuthenticatedUser done', { hasUser: !!user, userId: user?.id });
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const summaryOnly = searchParams.get('summaryOnly') === '1';

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }

    // Get current user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client if available, otherwise fall back to authenticated client
    const dbClient = isAdminKeyAvailable ? adminClient : supabase;

    console.log('[buddy GET] auth ok, querying members', {
      teamId,
      userId: user.id,
      usingAdminKey: isAdminKeyAvailable,
      summaryOnly,
    });

    // Get member for this team using dbClient (admin or authenticated fallback)
    const { data: memberRows, error: memberError } = await dbClient
      .from('members')
      .select('id')
      .eq('team_id', teamId)
      .eq('auth_user_id', user.id)
      .limit(1);

    if (memberError) {
      console.error('[buddy GET] members query error:', { code: memberError.code, message: memberError.message, details: memberError.details, hint: memberError.hint });
      const tagged = new Error(`[members query] ${memberError.message}`);
      (tagged as any).code = memberError.code;
      (tagged as any).details = memberError.details;
      (tagged as any).hint = memberError.hint;
      throw tagged;
    }

    const member = memberRows?.[0];

    console.log('[buddy GET] member lookup result:', { found: !!member, rowCount: memberRows?.length });

    if (!member) {
      return NextResponse.json({
        buddy: null,
        needsSetup: false,
        membershipRequired: true,
        error: 'Join this team before using Buddy Battle.',
      });
    }

    // For summaryOnly we only need the buddy id — avoid complex joins that can fail
    // due to missing RLS grants, schema mismatches, or Supabase connection hiccups.
    const buddySelect = summaryOnly
      ? 'id'
      : `*, buddy_type:buddy_types(*), member:members(id, first_name, last_name, profile_image_url)`;

    // Get buddy using dbClient (admin or authenticated fallback)
    const { data: buddyRows, error: buddyError } = await dbClient
      .from('player_buddies')
      .select(buddySelect)
      .eq('member_id', member.id)
      .eq('team_id', teamId)
      .limit(1);

    if (buddyError) {
      const tagged = new Error(`[player_buddies query] ${buddyError.message}`);
      (tagged as any).code = buddyError.code;
      (tagged as any).details = buddyError.details;
      (tagged as any).hint = buddyError.hint;
      throw tagged;
    }

    const buddy = buddyRows?.[0];

    if (!buddy) {
      return NextResponse.json({ buddy: null, needsSetup: true });
    }

    // Fast path for page init checks to avoid expensive recalculation work.
    if (summaryOnly) {
      return NextResponse.json({
        buddy: { id: buddy.id },
        needsSetup: false,
        membershipRequired: false,
      });
    }

    // Calculate and award any pending points (safe - don't crash if this fails)
    let pointsResult: { pointsAwarded: number; availablePoints: number; totalEarned: number; totalSpent: number; breakdown: { date: string; points: number }[] } = { pointsAwarded: 0, availablePoints: buddy.available_points || 0, totalEarned: buddy.total_points_earned || 0, totalSpent: buddy.total_points_spent || 0, breakdown: [] };
    try {
      pointsResult = await calculateAndAwardPoints(member.id, buddy.id, teamId);
    } catch (pointsError) {
      console.error('[buddy-battle/buddy] Points calculation failed:', pointsError);
    }

    // Run non-critical reads in parallel and degrade gracefully.
    const [trainerProfileResult, activeQuestsResult, teamBuffsResult] = await Promise.allSettled([
      updateLoginStreak(buddy.id),
      getActiveQuests(buddy.id),
      getActiveTeamBuffs(teamId),
    ]);

    const trainerProfile = trainerProfileResult.status === 'fulfilled' ? trainerProfileResult.value : null;
    const activeQuests = activeQuestsResult.status === 'fulfilled' ? activeQuestsResult.value : [];
    const teamBuffs = teamBuffsResult.status === 'fulfilled' ? teamBuffsResult.value : [];

    // Check boss availability using dbClient
    const quarter = getCurrentQuarter();
    const { data: bossAttempts } = await dbClient
      .from('boss_battle_attempts')
      .select('*')
      .eq('player_buddy_id', buddy.id)
      .eq('quarter_year', quarter);

    const dashboard = {
      buddy: {
        ...buddy,
        // Override with freshly recalculated point values (buddy was fetched before recalculation)
        available_points: pointsResult.availablePoints,
        total_points_earned: pointsResult.totalEarned,
        total_points_spent: pointsResult.totalSpent,
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
  } catch (error: any) {
    console.error('Buddy GET error:', error);
    const isDev = process.env.NODE_ENV !== 'production';
    const fetchFailedHint = getFetchFailedHint(error);
    return NextResponse.json(
      {
        error: 'Failed to fetch buddy data',
        ...(isDev && {
          debug_message: error?.message ?? String(error),
          debug_code: error?.code,
          debug_details: error?.details,
          debug_hint: error?.hint ?? fetchFailedHint,
        }),
      },
      { status: 500 }
    );
  }
}

// POST /api/buddy-battle/buddy - Create new buddy
export async function POST(request: NextRequest) {
  try {
    const { user, adminClient, supabase } = await getAuthenticatedUser(request);
    const body = await request.json();
    const { teamId, buddyTypeId, nickname, colors } = body;

    if (!teamId || !buddyTypeId) {
      return NextResponse.json(
        { error: 'Team ID and Buddy Type ID required' },
        { status: 400 }
      );
    }

    // Check authentication
    if (!user) {
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

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if already has a buddy using appropriate client
    const { data: existingBuddy } = await dbClient
      .from('player_buddies')
      .select('id')
      .eq('member_id', member.id)
      .eq('team_id', teamId)
      .maybeSingle();
      
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

    // Create trainer profile with same DB client so auth context stays consistent
    const { error: trainerProfileError } = await dbClient
      .from('buddy_trainer_profiles')
      .insert({
        player_buddy_id: buddy.id,
      });

    if (trainerProfileError) {
      console.error('[buddy-battle/buddy POST] Trainer profile creation failed:', trainerProfileError);
    }

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
    const { user, adminClient, supabase } = await getAuthenticatedUser(request);
    const body = await request.json();
    const { buddyId, colors, nickname } = body;

    if (!buddyId) {
      return NextResponse.json({ error: 'Buddy ID required' }, { status: 400 });
    }

    // Check authentication
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdminKeyAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbClient = isAdminKeyAvailable ? adminClient : supabase;

    // Verify ownership
    const { data: buddy, error: buddyError } = await dbClient
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

    // Update nickname
    if (nickname !== undefined) {
      await dbClient
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

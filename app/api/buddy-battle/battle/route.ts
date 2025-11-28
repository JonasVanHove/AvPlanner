// =====================================================
// BUDDY BATTLE - API ROUTE: Battles
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import {
  getBattleHistory,
  checkBossBattleAvailability,
  getPlayerBuddy,
  logActivity,
  createPointTransaction,
} from '@/lib/buddy-battle/api';
import {
  createBattleState,
  createNPCBattleState,
  calculateDamage,
  checkAccuracy,
  determineFirstMover,
  applyHeal,
  chooseNPCAbility,
  calculateBattleXP,
  calculateAnxietyChange,
  getTutorialBoss,
  getQuarterlyBoss,
  getCurrentQuarter,
  generateBattleMessage,
} from '@/lib/buddy-battle/game-logic';
import {
  BattleState,
  BattleAction,
  BuddyAbility,
  ActiveEffect,
  BuddyBattle,
  NPCBoss,
} from '@/lib/buddy-battle/types';

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
  return createSupabaseClient(
    supabaseUrl,
    supabaseAnonKey,
    { auth: { persistSession: false } }
  );
}

// Helper to get authenticated user from cookies or auth header
async function getAuthenticatedUser(request: NextRequest) {
  const adminClient = createAdminClient();
  
  // First try SSR cookies approach
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (user) {
    return { user, supabase, adminClient };
  }
  
  // Fallback: try Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const supabaseWithToken = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    const { data: { user: tokenUser } } = await supabaseWithToken.auth.getUser(token);
    
    if (tokenUser) {
      return { user: tokenUser, supabase: supabaseWithToken, adminClient };
    }
  }
  
  return { user: null, supabase, adminClient };
}

// GET /api/buddy-battle/battle?buddyId=xxx - Get battle history
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const buddyId = searchParams.get('buddyId');

    if (!buddyId) {
      return NextResponse.json({ error: 'Buddy ID required' }, { status: 400 });
    }

    // Get current user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const battles = await getBattleHistory(buddyId);
    const quarter = getCurrentQuarter();
    const bossAvailability = await checkBossBattleAvailability(buddyId, quarter);

    return NextResponse.json({
      battles,
      boss_availability: bossAvailability,
      current_quarter: quarter,
    });
  } catch (error) {
    console.error('Battle GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch battle data' },
      { status: 500 }
    );
  }
}

// POST /api/buddy-battle/battle - Start or continue a battle
export async function POST(request: NextRequest) {
  try {
    const { user, adminClient } = await getAuthenticatedUser(request);
    const body = await request.json();
    const { action, buddyId, battleType, opponentBuddyId, battleId, abilityId, itemId, teamId } = body;

    console.log('[buddy-battle/battle] Auth check:', { found: !!user, userId: user?.id, action, buddyId });

    // Get current user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve 'current' buddyId to actual buddy
    let resolvedBuddyId = buddyId;
    let buddy: any = null;
    
    if (buddyId === 'current' && teamId) {
      // Find member for this user in this team
      const { data: member, error: memberError } = await adminClient
        .from('members')
        .select('id')
        .eq('team_id', teamId)
        .eq('auth_user_id', user.id)
        .single();
      
      if (memberError || !member) {
        console.error('[buddy-battle/battle] Member lookup failed:', memberError);
        return NextResponse.json({ error: 'Member not found in team' }, { status: 404 });
      }

      // Get buddy for this member
      const { data: currentBuddy, error: buddyLookupError } = await adminClient
        .from('player_buddies')
        .select(`
          *,
          buddy_type:buddy_types(*),
          member:members!inner(auth_user_id)
        `)
        .eq('member_id', member.id)
        .eq('team_id', teamId)
        .single();
      
      if (buddyLookupError || !currentBuddy) {
        console.error('[buddy-battle/battle] Buddy lookup failed:', buddyLookupError);
        return NextResponse.json({ error: 'Buddy not found' }, { status: 404 });
      }
      
      buddy = currentBuddy;
      resolvedBuddyId = currentBuddy.id;
      console.log('[buddy-battle/battle] Resolved current buddy:', resolvedBuddyId);
    } else {
      // Verify ownership with provided buddyId
      const { data: foundBuddy, error: buddyError } = await adminClient
        .from('player_buddies')
        .select(`
          *,
          buddy_type:buddy_types(*),
          member:members!inner(auth_user_id)
        `)
        .eq('id', buddyId)
        .single();

      if (buddyError || !foundBuddy) {
        return NextResponse.json({ error: 'Buddy not found' }, { status: 404 });
      }
      
      buddy = foundBuddy;
    }

    const memberData = Array.isArray(buddy.member) ? buddy.member[0] : buddy.member;
    if (memberData.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    switch (action) {
      case 'start':
        return handleStartBattle(adminClient, buddy, battleType, opponentBuddyId);
      case 'turn':
        return handleBattleTurn(adminClient, buddy, battleId, abilityId, itemId);
      case 'flee':
        return handleFleeBattle(adminClient, battleId, resolvedBuddyId);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Battle POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process battle' },
      { status: 500 }
    );
  }
}

async function handleStartBattle(
  supabase: any,
  buddy: any,
  battleType: string,
  opponentBuddyId?: string
) {
  console.log('[handleStartBattle] Starting:', { buddyId: buddy.id, battleType, hasBuddyType: !!buddy.buddy_type });
  
  let opponent: any;
  let opponentNpcName: string | null = null;

  if (battleType === 'tutorial') {
    // Check if already completed tutorial
    const { data: profile } = await supabase
      .from('buddy_trainer_profiles')
      .select('tutorial_completed')
      .eq('player_buddy_id', buddy.id)
      .single();

    console.log('[handleStartBattle] Tutorial profile:', profile);

    if (profile?.tutorial_completed) {
      return NextResponse.json({ error: 'Tutorial already completed' }, { status: 400 });
    }

    opponent = createNPCBattleState(getTutorialBoss());
    opponentNpcName = 'Nikita';
  } else if (battleType === 'boss') {
    const quarter = getCurrentQuarter();
    const availability = await checkBossBattleAvailability(buddy.id, quarter);

    if (!availability.canBattle) {
      return NextResponse.json({ error: 'Boss battle not available' }, { status: 400 });
    }

    opponent = createNPCBattleState(getQuarterlyBoss());
    opponentNpcName = 'Marie-Françoise';
  } else if (battleType === 'pvp' && opponentBuddyId) {
    // Get opponent buddy
    const { data: opponentBuddy, error } = await supabase
      .from('player_buddies')
      .select('*, buddy_type:buddy_types(*)')
      .eq('id', opponentBuddyId)
      .eq('team_id', buddy.team_id)
      .single();

    if (error || !opponentBuddy) {
      return NextResponse.json({ error: 'Opponent not found' }, { status: 404 });
    }

    opponent = createBattleState(
      opponentBuddy,
      opponentBuddy.buddy_type.name,
      opponentBuddy.buddy_type.element
    );
  } else {
    return NextResponse.json({ error: 'Invalid battle type or missing opponent' }, { status: 400 });
  }

  // Create battle record
  console.log('[handleStartBattle] Creating battle record...');
  const { data: battle, error: battleError } = await supabase
    .from('buddy_battles')
    .insert({
      team_id: buddy.team_id,
      battle_type: battleType,
      challenger_buddy_id: buddy.id,
      opponent_buddy_id: battleType === 'pvp' ? opponentBuddyId : null,
      opponent_npc_name: opponentNpcName,
      battle_log: [],
      quarter_year: battleType === 'boss' ? getCurrentQuarter() : null,
    })
    .select()
    .single();

  if (battleError) {
    console.error('[handleStartBattle] Battle insert error:', battleError);
    return NextResponse.json({ error: 'Failed to create battle: ' + battleError.message }, { status: 500 });
  }
  
  console.log('[handleStartBattle] Battle created:', battle?.id);

  // If boss battle, record attempt
  if (battleType === 'boss') {
    const quarter = getCurrentQuarter();
    const { data: attempts } = await supabase
      .from('boss_battle_attempts')
      .select('attempt_number')
      .eq('player_buddy_id', buddy.id)
      .eq('quarter_year', quarter)
      .order('attempt_number', { ascending: false })
      .limit(1);

    await supabase.from('boss_battle_attempts').insert({
      player_buddy_id: buddy.id,
      quarter_year: quarter,
      attempt_number: (attempts?.[0]?.attempt_number || 0) + 1,
      battle_id: battle.id,
    });
  }

  // Get abilities for player
  const { data: abilities } = await supabase
    .from('buddy_type_abilities')
    .select('ability:buddy_abilities(*)')
    .eq('buddy_type_id', buddy.buddy_type_id)
    .lte('unlock_level', buddy.level);

  const playerAbilities = abilities?.map((a: any) => a.ability) || [];

  // Create initial battle state
  const playerState = createBattleState(
    buddy,
    buddy.buddy_type.name,
    buddy.buddy_type.element
  );

  const battleState: BattleState = {
    battle_id: battle.id,
    current_turn: 0,
    player_buddy: playerState,
    opponent: opponent,
    is_player_turn: determineFirstMover(playerState.speed, opponent.speed, []) === 'player',
    active_effects: [],
    available_abilities: playerAbilities,
    available_items: [],
    battle_log: [],
    is_finished: false,
  };

  // Log activity
  await logActivity(buddy.id, buddy.team_id, 'battle_started', {
    battle_type: battleType,
    opponent: opponentNpcName || opponentBuddyId,
  });

  return NextResponse.json({
    battle: battleState,
    npc_dialogue: opponentNpcName 
      ? (battleType === 'tutorial' ? getTutorialBoss().pre_battle_dialogue : getQuarterlyBoss().pre_battle_dialogue)
      : null,
  });
}

async function handleBattleTurn(
  supabase: any,
  buddy: any,
  battleId: string,
  abilityId?: string,
  itemId?: string
) {
  // Get current battle
  const { data: battle, error: battleError } = await supabase
    .from('buddy_battles')
    .select('*')
    .eq('id', battleId)
    .single();

  if (battleError || !battle) {
    return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  }

  if (battle.ended_at) {
    return NextResponse.json({ error: 'Battle already ended' }, { status: 400 });
  }

  // This would be a full turn implementation
  // For brevity, returning a simplified response
  return NextResponse.json({
    message: 'Turn processed',
    battle_id: battleId,
  });
}

async function handleFleeBattle(supabase: any, battleId: string, buddyId: string) {
  const { error } = await supabase
    .from('buddy_battles')
    .update({
      ended_at: new Date().toISOString(),
      winner_is_npc: true,
    })
    .eq('id', battleId);

  if (error) throw error;

  return NextResponse.json({ message: 'Fled from battle' });
}

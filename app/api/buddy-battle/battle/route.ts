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
  BattleBuddyState,
} from '@/lib/buddy-battle/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Use service role key if available, otherwise fall back to anon key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

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
  return createSupabaseClient(
    supabaseUrl,
    supabaseServiceKey,
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
  
  // Get initial HP values
  const playerInitialHP = buddy.current_hp;
  const opponentInitialHP = opponent.max_hp;
  
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
      // HP tracking columns
      challenger_hp: playerInitialHP,
      opponent_hp: opponentInitialHP,
      current_turn: 0,
      active_effects: [],
      player_cooldowns: {},
      opponent_cooldowns: {},
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
  try {
    console.log('[handleBattleTurn] Starting turn:', { battleId, abilityId, buddyId: buddy.id });
    
    // Get current battle
    const { data: battle, error: battleError } = await supabase
      .from('buddy_battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      console.error('[handleBattleTurn] Battle not found:', battleError);
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    if (battle.ended_at) {
      return NextResponse.json({ error: 'Battle already ended' }, { status: 400 });
    }

    // Get ability used by player - try by ID first, then by name
    let abilityData = null;
    
    // First try to find by ID (UUID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(abilityId || '');
    
    if (isUUID) {
      const { data, error } = await supabase
        .from('buddy_abilities')
        .select('*')
        .eq('id', abilityId)
        .single();
      
      if (!error && data) {
        abilityData = data;
      }
    }
    
    // If not found by ID, try by name
    if (!abilityData) {
      const { data, error } = await supabase
        .from('buddy_abilities')
        .select('*')
        .ilike('name', abilityId || '')
        .single();
      
      if (!error && data) {
        abilityData = data;
      }
    }
    
    // If still not found, get the first ability available for this buddy type
    if (!abilityData) {
      console.log('[handleBattleTurn] Ability not found, getting default ability for buddy type:', buddy.buddy_type_id);
      const { data: defaultAbilities } = await supabase
        .from('buddy_type_abilities')
        .select('ability:buddy_abilities(*)')
        .eq('buddy_type_id', buddy.buddy_type_id)
        .lte('unlock_level', buddy.level)
        .limit(1);
      
      if (defaultAbilities && defaultAbilities.length > 0) {
        abilityData = defaultAbilities[0].ability;
      }
    }

    if (!abilityData) {
      console.error('[handleBattleTurn] No ability found');
      return NextResponse.json({ error: 'Ability not found', details: { abilityId } }, { status: 404 });
    }
    
    console.log('[handleBattleTurn] Using ability:', abilityData.name);

    // Reconstruct battle state from battle record and buddy
    const playerState: BattleBuddyState = {
      buddy_id: buddy.id,
      name: buddy.nickname || buddy.buddy_type?.name || 'Buddy',
      is_npc: false,
      current_hp: battle.challenger_hp ?? buddy.current_hp ?? buddy.max_hp,
      max_hp: buddy.max_hp,
      attack: buddy.attack,
      defense: buddy.defense,
      speed: buddy.speed,
      special_attack: buddy.special_attack,
      special_defense: buddy.special_defense,
      critical_chance: buddy.critical_chance,
      element: buddy.buddy_type?.element || 'productivity',
      ability_cooldowns: battle.player_cooldowns || {},
    };

    // Get opponent state (NPC or PvP)
    let opponentState: BattleBuddyState;
    let opponentAbilities: BuddyAbility[];
    
    if (battle.opponent_npc_name) {
      // NPC battle - get boss data
      const boss: NPCBoss = battle.opponent_npc_name === 'Nikita' ? getTutorialBoss() : getQuarterlyBoss();
      opponentState = {
        buddy_id: 'npc',
        name: boss.name,
        is_npc: true,
        current_hp: battle.opponent_hp ?? boss.hp,
        max_hp: boss.hp,
        attack: boss.attack,
        defense: boss.defense,
        speed: boss.speed,
        special_attack: boss.special_attack,
        special_defense: boss.special_defense,
        critical_chance: boss.critical_chance,
        element: boss.element,
        ability_cooldowns: battle.opponent_cooldowns || {},
      };
      
      // Boss abilities are stored as names, create simple ability objects
      // Scale damage based on boss level (Pokemon-style)
      const baseDamageForLevel = (level: number, isBasicAttack: boolean) => {
        // Basic attacks like Tackle start at 10, scale +3 per level
        // Special attacks start at 15, scale +4 per level
        if (isBasicAttack) {
          return 10 + Math.floor((level - 1) * 3);
        }
        return 15 + Math.floor((level - 1) * 4);
      };
      
      opponentAbilities = boss.abilities.map((abilityName: string) => {
        const isBasicAttack = abilityName === 'Tackle' || abilityName === 'Sand Attack';
        return {
          id: `npc-${abilityName.toLowerCase().replace(/\s+/g, '-')}`,
          name: abilityName,
          description: `${boss.name}'s ${abilityName} attack`,
          element: boss.element,
          damage_base: baseDamageForLevel(boss.level, isBasicAttack),
          accuracy: isBasicAttack ? 100 : 85,
          effect_type: 'damage' as const,
          cooldown: isBasicAttack ? 0 : 1,
          unlock_level: 1,
        };
      });
    } else if (battle.opponent_buddy_id) {
      // PvP battle - get opponent buddy
      const { data: opponentBuddy, error: oppError } = await supabase
        .from('player_buddies')
        .select('*, buddy_type:buddy_types(*)')
        .eq('id', battle.opponent_buddy_id)
        .single();
      
      if (oppError || !opponentBuddy) {
        return NextResponse.json({ error: 'Opponent not found' }, { status: 404 });
      }
      
      opponentState = {
        buddy_id: opponentBuddy.id,
        name: opponentBuddy.nickname || opponentBuddy.buddy_type?.name || 'Opponent',
        is_npc: false,
        current_hp: battle.opponent_hp ?? opponentBuddy.current_hp,
        max_hp: opponentBuddy.max_hp,
        attack: opponentBuddy.attack,
        defense: opponentBuddy.defense,
        speed: opponentBuddy.speed,
        special_attack: opponentBuddy.special_attack,
        special_defense: opponentBuddy.special_defense,
        critical_chance: opponentBuddy.critical_chance,
        element: opponentBuddy.buddy_type?.element || 'productivity',
        ability_cooldowns: battle.opponent_cooldowns || {},
      };
      
      // Get opponent abilities
      const { data: oppAbilities } = await supabase
        .from('buddy_type_abilities')
        .select('ability:buddy_abilities(*)')
        .eq('buddy_type_id', opponentBuddy.buddy_type_id)
        .lte('unlock_level', opponentBuddy.level);
      
      opponentAbilities = oppAbilities?.map((a: any) => a.ability) || [];
    } else {
      return NextResponse.json({ error: 'Invalid battle state' }, { status: 400 });
    }
    
    console.log('[handleBattleTurn] Player HP:', playerState.current_hp, '/', playerState.max_hp);
    console.log('[handleBattleTurn] Opponent HP:', opponentState.current_hp, '/', opponentState.max_hp);

    const activeEffects: ActiveEffect[] = battle.active_effects || [];
    let battleLog = battle.battle_log || [];
    const currentTurn = (battle.current_turn || 0) + 1;
    let message = '';
    let playerDamage = 0;
    let playerIsCritical = false;
    let opponentDamage = 0;
    let opponentIsCritical = false;

  // === PLAYER'S TURN ===
  // Check accuracy
  if (checkAccuracy(abilityData.accuracy)) {
    // Calculate damage
    const damageResult = calculateDamage(
      playerState,
      opponentState,
      abilityData,
      buddy.level,
      activeEffects
    );
    
    playerDamage = damageResult.damage;
    playerIsCritical = damageResult.isCritical;
    opponentState.current_hp = Math.max(0, opponentState.current_hp - playerDamage);
    
    const critText = playerIsCritical ? ' Critical hit!' : '';
    const effectivenessText = damageResult.effectiveness > 1 ? " It's super effective!" : 
                              damageResult.effectiveness < 1 ? " It's not very effective..." : '';
    message = `${playerState.name} used ${abilityData.name}! Dealt ${playerDamage} damage.${critText}${effectivenessText}`;
    
    battleLog.push({
      turn: currentTurn,
      actor: 'player',
      action: 'ability',
      ability_name: abilityData.name,
      damage: playerDamage,
      is_critical: playerIsCritical,
    });
  } else {
    message = `${playerState.name} used ${abilityData.name}, but it missed!`;
    battleLog.push({
      turn: currentTurn,
      actor: 'player',
      action: 'ability',
      ability_name: abilityData.name,
      missed: true,
    });
  }

  // Check if opponent is defeated
  let isFinished = false;
  let winner: 'player' | 'opponent' | null = null;
  
  if (opponentState.current_hp <= 0) {
    isFinished = true;
    winner = 'player';
    message += ` ${opponentState.name} fainted! You win!`;
  } else {
    // === OPPONENT'S TURN ===
    const opponentAbility = chooseNPCAbility(opponentState, playerState, opponentAbilities, activeEffects);
    
    if (checkAccuracy(opponentAbility.accuracy)) {
      const oppDamageResult = calculateDamage(
        opponentState,
        playerState,
        opponentAbility,
        battle.opponent_npc_name ? (battle.opponent_npc_name === 'Nikita' ? 5 : 50) : 10,
        activeEffects
      );
      
      opponentDamage = oppDamageResult.damage;
      opponentIsCritical = oppDamageResult.isCritical;
      playerState.current_hp = Math.max(0, playerState.current_hp - opponentDamage);
      
      const oppCritText = opponentIsCritical ? ' Critical hit!' : '';
      message += ` ${opponentState.name} used ${opponentAbility.name}! Dealt ${opponentDamage} damage.${oppCritText}`;
      
      battleLog.push({
        turn: currentTurn,
        actor: 'opponent',
        action: 'ability',
        ability_name: opponentAbility.name,
        damage: opponentDamage,
        is_critical: opponentIsCritical,
      });
    } else {
      message += ` ${opponentState.name} used ${opponentAbility.name}, but it missed!`;
      battleLog.push({
        turn: currentTurn,
        actor: 'opponent',
        action: 'ability',
        ability_name: opponentAbility.name,
        missed: true,
      });
    }
    
    // Check if player is defeated
    if (playerState.current_hp <= 0) {
      isFinished = true;
      winner = 'opponent';
      message += ` ${playerState.name} fainted! You lose!`;
    }
  }
  
  console.log('[handleBattleTurn] Turn result:', { 
    playerDamage, 
    opponentDamage, 
    playerHP: playerState.current_hp, 
    opponentHP: opponentState.current_hp,
    isFinished,
    winner 
  });

  // Update battle record with HP tracking
  const updateData: any = {
    battle_log: battleLog,
    challenger_hp: playerState.current_hp,
    opponent_hp: opponentState.current_hp,
    current_turn: currentTurn,
    player_cooldowns: playerState.ability_cooldowns || {},
    opponent_cooldowns: opponentState.ability_cooldowns || {},
    active_effects: activeEffects,
  };
  
  if (isFinished) {
    updateData.ended_at = new Date().toISOString();
    updateData.winner_is_npc = winner === 'opponent';
    
    // Handle battle end rewards/penalties
    if (winner === 'player') {
      const isBoss = !!battle.opponent_npc_name;
      const isTutorial = battle.battle_type === 'tutorial';
      // Tutorial boss is level 1, Quarterly boss is level 50, PvP opponents default to 10
      const opponentLevel = battle.opponent_npc_name === 'Nikita' ? 1 : (battle.opponent_npc_name ? 50 : 10);
      const xpGained = calculateBattleXP(opponentLevel, buddy.level, true, isBoss, isTutorial);
      const anxietyChange = calculateAnxietyChange(true, isBoss, buddy.anxiety_level);
      
      // Update buddy stats
      await supabase
        .from('player_buddies')
        .update({
          total_xp: buddy.total_xp + xpGained,
          current_hp: playerState.current_hp,
          anxiety_level: Math.max(0, buddy.anxiety_level + anxietyChange),
        })
        .eq('id', buddy.id);
      
      // Mark tutorial as completed if applicable
      if (battle.battle_type === 'tutorial') {
        await supabase
          .from('buddy_trainer_profiles')
          .update({ tutorial_completed: true })
          .eq('player_buddy_id', buddy.id);
      }
      
      // Log activity
      await logActivity(buddy.id, buddy.team_id, 'battle_won', {
        battle_type: battle.battle_type,
        opponent: battle.opponent_npc_name || battle.opponent_buddy_id,
        xp_gained: xpGained,
      });
    } else {
      // Loss - update HP and anxiety
      const anxietyChange = calculateAnxietyChange(false, !!battle.opponent_npc_name, buddy.anxiety_level);
      
      await supabase
        .from('player_buddies')
        .update({
          current_hp: Math.max(1, Math.floor(buddy.max_hp * 0.1)), // Restore to 10% HP
          anxiety_level: Math.min(100, buddy.anxiety_level + anxietyChange),
        })
        .eq('id', buddy.id);
      
      await logActivity(buddy.id, buddy.team_id, 'battle_lost', {
        battle_type: battle.battle_type,
        opponent: battle.opponent_npc_name || battle.opponent_buddy_id,
      });
    }
  } else {
    // Just update buddy's current HP
    await supabase
      .from('player_buddies')
      .update({ current_hp: playerState.current_hp })
      .eq('id', buddy.id);
  }
  
  // Save battle update
  const { error: updateError } = await supabase
    .from('buddy_battles')
    .update(updateData)
    .eq('id', battleId);
  
  if (updateError) {
    console.error('[handleBattleTurn] Update error:', updateError);
    return NextResponse.json({ error: 'Failed to update battle' }, { status: 500 });
  }

  // Get player abilities for response
  const { data: abilities } = await supabase
    .from('buddy_type_abilities')
    .select('ability:buddy_abilities(*)')
    .eq('buddy_type_id', buddy.buddy_type_id)
    .lte('unlock_level', buddy.level);

  const playerAbilities = abilities?.map((a: any) => a.ability) || [];

  // Return updated battle state
  const battleState: BattleState = {
    battle_id: battleId,
    current_turn: currentTurn,
    player_buddy: playerState,
    opponent: opponentState,
    is_player_turn: true, // Always player's turn after processing
    active_effects: activeEffects,
    available_abilities: playerAbilities,
    available_items: [],
    battle_log: battleLog,
    is_finished: isFinished,
    winner: winner,
  };

  return NextResponse.json({
    battle_state: battleState,
    message,
    damage: playerDamage,
    is_critical: playerIsCritical,
    opponent_damage: opponentDamage,
    opponent_is_critical: opponentIsCritical,
  });
  
  } catch (error) {
    console.error('[handleBattleTurn] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Battle turn failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
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

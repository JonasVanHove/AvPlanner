// =====================================================
// BUDDY BATTLE - API ROUTE: Battles
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, isAdminKeyAvailable } from '@/lib/buddy-battle/server-auth';
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

// =====================================================
// DEFAULT ABILITIES - Pokemon-style moves always available
// No cost, no points needed - just pick a move and attack!
// =====================================================
function getDefaultAbilities(element: string, level: number): BuddyAbility[] {
  // Element-specific signature move
  const elementMoves: Record<string, { name: string; damage: number; desc: string }> = {
    fire: { name: 'Flame Burst', damage: 18, desc: 'A burst of planning fire!' },
    water: { name: 'Time Splash', damage: 18, desc: 'A wave of scheduling power!' },
    earth: { name: 'Task Quake', damage: 18, desc: 'Shake the ground with productivity!' },
    air: { name: 'Notification Gust', damage: 18, desc: 'A gust of alert wind!' },
    electric: { name: 'Spark Reminder', damage: 18, desc: 'An electric jolt of reminders!' },
  };

  const elMove = elementMoves[element] || { name: 'Power Strike', damage: 18, desc: 'A powerful elemental strike!' };

  const abilities: BuddyAbility[] = [
    {
      id: `default-tackle`,
      name: 'Tackle',
      description: 'A basic physical attack.',
      element: 'neutral',
      damage_base: 12,
      accuracy: 95,
      cooldown_turns: 0,
      is_special: false,
      effect_type: 'damage',
      unlock_level: 1,
    },
    {
      id: `default-element-move`,
      name: elMove.name,
      description: elMove.desc,
      element: element as BuddyAbility['element'],
      damage_base: elMove.damage,
      accuracy: 85,
      cooldown_turns: 1,
      is_special: true,
      effect_type: 'damage',
      unlock_level: 1,
    },
    {
      id: `default-focus`,
      name: 'Focus Energy',
      description: 'Concentrate to boost next attack.',
      element: 'neutral',
      damage_base: 8,
      accuracy: 100,
      cooldown_turns: 0,
      is_special: false,
      effect_type: 'buff_attack',
      effect_value: 2,
      effect_duration: 2,
      unlock_level: 1,
    },
    {
      id: `default-heal`,
      name: 'Quick Rest',
      description: 'Take a breather to recover HP.',
      element: 'neutral',
      damage_base: 0,
      accuracy: 100,
      cooldown_turns: 3,
      is_special: false,
      effect_type: 'heal',
      effect_value: 10 + level * 2,
      unlock_level: 1,
    },
  ];

  return abilities;
}

// Auth utility imported from @/lib/buddy-battle/server-auth

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
    const { user, adminClient, supabase } = await getAuthenticatedUser(request);
    const body = await request.json();
    const { action, buddyId, battleType, opponentBuddyId, battleId, abilityId, itemId, teamId } = body;

    console.log('[buddy-battle/battle] Auth check:', { found: !!user, userId: user?.id, action, buddyId });

    // Get current user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbClient = isAdminKeyAvailable ? adminClient : supabase;

    // Resolve 'current' buddyId to actual buddy
    let resolvedBuddyId = buddyId;
    let buddy: any = null;
    
    if (buddyId === 'current' && teamId) {
      // Find member for this user in this team
      const { data: member, error: memberError } = await dbClient
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
      const { data: currentBuddy, error: buddyLookupError } = await dbClient
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
      const { data: foundBuddy, error: buddyError } = await dbClient
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
        return handleStartBattle(dbClient, buddy, battleType, opponentBuddyId);
      case 'turn':
        return handleBattleTurn(dbClient, buddy, battleId, abilityId, itemId);
      case 'flee':
        return handleFleeBattle(dbClient, battleId, resolvedBuddyId);
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
    // Tutorial is one-time only — check if already completed
    const { data: trainerProfile } = await supabase
      .from('buddy_trainer_profiles')
      .select('tutorial_completed')
      .eq('player_buddy_id', buddy.id)
      .single();
    
    if (trainerProfile?.tutorial_completed) {
      return NextResponse.json({ error: 'Tutorial already completed. Try training or boss battles!' }, { status: 400 });
    }
    
    console.log('[handleStartBattle] Starting tutorial battle...');
    
    opponent = createNPCBattleState(getTutorialBoss());
    opponentNpcName = 'Nick Eetah';
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
  } else if (battleType === 'training' || (battleType === 'pvp' && !opponentBuddyId)) {
    // Training battle - generate a level-matched NPC opponent
    const trainingLevel = Math.max(1, buddy.level - 1);
    const elements: Array<'fire' | 'water' | 'earth' | 'air' | 'electric'> = ['fire', 'water', 'earth', 'air', 'electric'];
    const randomElement = elements[Math.floor(Math.random() * elements.length)];
    const names = ['Sparring Bot', 'Training Dummy', 'Practice Pal', 'Drill Sergeant', 'Arena Guardian'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    
    const baseHP = 15 + trainingLevel * 2;
    const baseStat = 6 + Math.floor(trainingLevel * 0.8);
    
    opponent = {
      buddy_id: `training_${Date.now()}`,
      name: randomName,
      is_npc: true,
      current_hp: baseHP,
      max_hp: baseHP,
      attack: baseStat + Math.floor(Math.random() * 3),
      defense: baseStat + Math.floor(Math.random() * 3),
      speed: baseStat + Math.floor(Math.random() * 3),
      special_attack: baseStat + Math.floor(Math.random() * 3),
      special_defense: baseStat + Math.floor(Math.random() * 3),
      critical_chance: 5 + Math.floor(trainingLevel * 0.2),
      element: randomElement,
      ability_cooldowns: {},
    };
    opponentNpcName = randomName;
  } else {
    return NextResponse.json({ error: 'Invalid battle type or missing opponent' }, { status: 400 });
  }

  // Create battle record
  console.log('[handleStartBattle] Creating battle record...');
  
  // Always start battles at full HP (Pokemon-style: heal before battle)
  const playerInitialHP = buddy.max_hp;
  const opponentInitialHP = opponent.max_hp;
  
  // Restore buddy to full HP in the database
  await supabase
    .from('player_buddies')
    .update({ current_hp: buddy.max_hp })
    .eq('id', buddy.id);
  
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

  // Get abilities for player from DB, fallback to default Pokemon-style moves
  let playerAbilities: BuddyAbility[] = [];
  
  const { data: abilities, error: abilitiesError } = await supabase
    .from('buddy_type_abilities')
    .select('ability:buddy_abilities(*)')
    .eq('buddy_type_id', buddy.buddy_type.id)
    .lte('unlock_level', buddy.level);

  if (abilitiesError) {
    console.error('[handleStartBattle] Failed to fetch abilities from DB:', abilitiesError);
  }

  const dbAbilities = abilities?.map((a: any) => a.ability).filter(Boolean) || [];
  
  if (dbAbilities.length > 0) {
    playerAbilities = dbAbilities;
    console.log('[handleStartBattle] Using DB abilities:', dbAbilities.length);
  } else {
    // Fallback: generate default moves based on element (Pokemon-style)
    playerAbilities = getDefaultAbilities(buddy.buddy_type.element, buddy.level);
    console.log('[handleStartBattle] Using default abilities (DB empty), element:', buddy.buddy_type.element);
  }

  // Create initial battle state (override current_hp with max_hp for full health start)
  const playerState = createBattleState(
    { ...buddy, current_hp: buddy.max_hp },
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

    // Get ability used by player
    // First check if it's a default ability (starts with 'default-')
    let abilityData: BuddyAbility | null = null;
    
    if (abilityId?.startsWith('default-')) {
      // It's one of our Pokemon-style default moves
      const defaults = getDefaultAbilities(buddy.buddy_type?.element || 'earth', buddy.level);
      abilityData = defaults.find(a => a.id === abilityId) || null;
      console.log('[handleBattleTurn] Using default ability:', abilityData?.name);
    }
    
    // Try DB lookup if not a default ability
    if (!abilityData) {
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
    }
    
    // Ultimate fallback: use Tackle (always works)
    if (!abilityData) {
      console.log('[handleBattleTurn] No ability found, using Tackle fallback');
      const defaults = getDefaultAbilities(buddy.buddy_type?.element || 'earth', buddy.level);
      abilityData = defaults[0]; // Tackle is always first
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

    // Enforce cooldowns server-side (client already disables buttons, but never trust client state).
    const activeCooldown = playerState.ability_cooldowns[abilityData.id] || 0;
    if (activeCooldown > 0) {
      return NextResponse.json(
        { error: `${abilityData.name} is on cooldown for ${activeCooldown} more turn(s).` },
        { status: 400 }
      );
    }

    // Get opponent state (NPC or PvP)
    let opponentState: BattleBuddyState;
    let opponentAbilities: BuddyAbility[];
    
    if (battle.opponent_npc_name) {
      // NPC battle - determine type (boss, tutorial, or training)
      const isTutorial = battle.opponent_npc_name === 'Nick Eetah';
      const isBoss = battle.opponent_npc_name === 'Marie-Françoise';
      const isTraining = !isTutorial && !isBoss;
      
      if (isTraining) {
        // Training NPC - reconstruct from battle record data
        const trainingElement = battle.opponent_element || 'earth';
        opponentState = {
          buddy_id: `training_${battle.id}`,
          name: battle.opponent_npc_name,
          is_npc: true,
          current_hp: battle.opponent_hp ?? 20,
          max_hp: battle.opponent_max_hp ?? battle.opponent_hp ?? 20,
          attack: battle.opponent_attack ?? 8,
          defense: battle.opponent_defense ?? 8,
          speed: battle.opponent_speed ?? 8,
          special_attack: battle.opponent_special_attack ?? 8,
          special_defense: battle.opponent_special_defense ?? 8,
          critical_chance: battle.opponent_critical_chance ?? 5,
          element: trainingElement,
          ability_cooldowns: battle.opponent_cooldowns || {},
        };
        // Training NPC uses default abilities for its element
        opponentAbilities = getDefaultAbilities(trainingElement, buddy.level);
      } else {
        // Boss/tutorial NPC
        const boss: NPCBoss = isTutorial ? getTutorialBoss() : getQuarterlyBoss();
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
          cooldown_turns: isBasicAttack ? 0 : 1,
          is_special: !isBasicAttack,
          unlock_level: 1,
        };
      });
      }
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
      
      // Get opponent abilities (with default fallback)
      const { data: oppAbilities } = await supabase
        .from('buddy_type_abilities')
        .select('ability:buddy_abilities(*)')
        .eq('buddy_type_id', opponentBuddy.buddy_type.id)
        .lte('unlock_level', opponentBuddy.level);
      
      const dbOppAbilities = oppAbilities?.map((a: any) => a.ability).filter(Boolean) || [];
      opponentAbilities = dbOppAbilities.length > 0 
        ? dbOppAbilities 
        : getDefaultAbilities(opponentBuddy.buddy_type?.element || 'earth', opponentBuddy.level);
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
    let playerHeal = 0;
    let opponentHeal = 0;

  // === DECREMENT COOLDOWNS at start of turn ===
  for (const key in playerState.ability_cooldowns) {
    if (playerState.ability_cooldowns[key] > 0) {
      playerState.ability_cooldowns[key]--;
    }
  }
  for (const key in opponentState.ability_cooldowns) {
    if (opponentState.ability_cooldowns[key] > 0) {
      opponentState.ability_cooldowns[key]--;
    }
  }

  // === EXPIRE ACTIVE EFFECTS ===
  for (const effect of activeEffects) {
    if (effect.remaining_turns !== undefined) {
      effect.remaining_turns--;
    }
  }
  // Remove expired effects
  const updatedEffects = activeEffects.filter(e => e.remaining_turns === undefined || e.remaining_turns > 0);
  activeEffects.length = 0;
  activeEffects.push(...updatedEffects);

  // === PLAYER'S TURN ===
  if (abilityData.effect_type === 'heal') {
    // === HEAL ABILITY ===
    const healAmount = abilityData.effect_value || (10 + buddy.level * 2);
    const healResult = applyHeal(playerState.current_hp, playerState.max_hp, healAmount);
    playerState.current_hp = healResult.newHP;
    playerHeal = healResult.actualHeal;
    
    message = `${playerState.name} used ${abilityData.name}! Restored ${healResult.actualHeal} HP.`;
    battleLog.push({
      turn: currentTurn,
      actor: 'player',
      action: 'heal',
      ability_name: abilityData.name,
      heal: healResult.actualHeal,
    });
    
    // Set cooldown for heal ability
    if (abilityData.cooldown_turns > 0) {
      // +1 because cooldowns are decremented at the start of the next turn.
      // Without this, a 1-turn cooldown becomes immediately reusable.
      playerState.ability_cooldowns[abilityData.id] = abilityData.cooldown_turns + 1;
    }
  } else if (abilityData.effect_type === 'buff_attack' || abilityData.effect_type === 'buff_speed' || abilityData.effect_type === 'critical_boost') {
    // === BUFF ABILITY (may also deal minor damage) ===
    // Apply the buff effect
    activeEffects.push({
      effect_id: `buff-${Date.now()}`,
      effect_type: abilityData.effect_type === 'buff_attack' ? 'buff' : abilityData.effect_type,
      target: 'player',
      value: abilityData.effect_value || 25,
      remaining_turns: abilityData.effect_duration || 2,
      source: abilityData.name,
    });
    
    // Also deal damage if base damage > 0
    if (abilityData.damage_base > 0 && checkAccuracy(abilityData.accuracy)) {
      const damageResult = calculateDamage(playerState, opponentState, abilityData, buddy.level, activeEffects);
      playerDamage = damageResult.damage;
      playerIsCritical = damageResult.isCritical;
      opponentState.current_hp = Math.max(0, opponentState.current_hp - playerDamage);
      
      const critText = playerIsCritical ? ' Critical hit!' : '';
      message = `${playerState.name} used ${abilityData.name}! Attack power rose! Dealt ${playerDamage} damage.${critText}`;
    } else {
      message = `${playerState.name} used ${abilityData.name}! Attack power rose sharply!`;
    }
    
    battleLog.push({
      turn: currentTurn,
      actor: 'player',
      action: 'buff',
      ability_name: abilityData.name,
      damage: playerDamage,
      effect: abilityData.effect_type,
    });
    
    if (abilityData.cooldown_turns > 0) {
      // +1 because cooldowns are decremented at the start of the next turn.
      playerState.ability_cooldowns[abilityData.id] = abilityData.cooldown_turns + 1;
    }
  } else {
    // === DAMAGE ABILITY ===
    // Check accuracy
    if (checkAccuracy(abilityData.accuracy)) {
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
    
    // Set cooldown for damage ability
    if (abilityData.cooldown_turns > 0) {
      // +1 because cooldowns are decremented at the start of the next turn.
      playerState.ability_cooldowns[abilityData.id] = abilityData.cooldown_turns + 1;
    }
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
    // Scale NPC damage by battle type. Training NPCs should not use boss-level scaling.
    const opponentLevel =
      battle.battle_type === 'tutorial'
        ? 1
        : battle.battle_type === 'boss'
          ? 50
          : battle.battle_type === 'training'
            ? Math.max(1, buddy.level - 1)
            : 10;
    
    if (opponentAbility.effect_type === 'heal') {
      // Opponent heals
      const healAmt = opponentAbility.effect_value || 10;
      const healRes = applyHeal(opponentState.current_hp, opponentState.max_hp, healAmt);
      opponentState.current_hp = healRes.newHP;
      opponentHeal = healRes.actualHeal;
      message += ` ${opponentState.name} used ${opponentAbility.name}! Restored ${healRes.actualHeal} HP.`;
      battleLog.push({ turn: currentTurn, actor: 'opponent', action: 'heal', ability_name: opponentAbility.name, heal: healRes.actualHeal });
    } else if (opponentAbility.effect_type === 'buff_attack' || opponentAbility.effect_type === 'buff_speed') {
      // Opponent buffs
      activeEffects.push({
        effect_id: `opp-buff-${Date.now()}`,
        effect_type: opponentAbility.effect_type === 'buff_attack' ? 'buff' : opponentAbility.effect_type,
        target: 'opponent',
        value: opponentAbility.effect_value || 25,
        remaining_turns: opponentAbility.effect_duration || 2,
        source: opponentAbility.name,
      });
      message += ` ${opponentState.name} used ${opponentAbility.name}! Its power rose!`;
      battleLog.push({ turn: currentTurn, actor: 'opponent', action: 'buff', ability_name: opponentAbility.name });
    } else if (checkAccuracy(opponentAbility.accuracy)) {
      const oppDamageResult = calculateDamage(
        opponentState,
        playerState,
        opponentAbility,
        opponentLevel,
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
    
    // Set opponent cooldown
    if (opponentAbility.cooldown_turns > 0) {
      // Keep cooldown semantics consistent with player cooldown handling.
      opponentState.ability_cooldowns[opponentAbility.id] = opponentAbility.cooldown_turns + 1;
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
  
  // Track battle rewards for the response
  let xpGainedResult = 0;
  let anxietyChangeResult = 0;
  
  if (isFinished) {
    updateData.ended_at = new Date().toISOString();
    updateData.winner_is_npc = winner === 'opponent';
    
    // Handle battle end rewards/penalties
    if (winner === 'player') {
      const isBoss = !!battle.opponent_npc_name;
      const isTutorial = battle.battle_type === 'tutorial';
      // Tutorial boss is level 1, Quarterly boss is level 50, PvP opponents default to 10
      const opponentLevel = battle.opponent_npc_name === 'Nick Eetah' ? 1 : (battle.opponent_npc_name ? 50 : 10);
      const xpGained = calculateBattleXP(opponentLevel, buddy.level, true, isBoss, isTutorial);
      const anxietyChange = calculateAnxietyChange(true, isBoss, buddy.anxiety_level);
      xpGainedResult = xpGained;
      anxietyChangeResult = anxietyChange;
      
      // Update buddy stats — restore full HP after victory (Pokemon-style)
      await supabase
        .from('player_buddies')
        .update({
          experience: (buddy.experience || 0) + xpGained,
          current_hp: buddy.max_hp,
          anxiety_level: Math.max(0, buddy.anxiety_level + anxietyChange),
          updated_at: new Date().toISOString(),
        })
        .eq('id', buddy.id);
      
      // Check for level up
      const { getLevelFromXP } = await import('@/lib/buddy-battle/game-logic');
      const newXP = (buddy.experience || 0) + xpGained;
      const levelInfo = getLevelFromXP(newXP);
      if (levelInfo.level > buddy.level) {
        await supabase
          .from('player_buddies')
          .update({ level: levelInfo.level })
          .eq('id', buddy.id);
      }
      
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
      
      // Award trainer XP for battle victory
      try {
        const { awardTrainerXP } = await import('@/lib/buddy-battle/api');
        await awardTrainerXP(buddy.id, xpGained);
      } catch (trainerErr) {
        console.error('[handleBattleTurn] Trainer XP update failed:', trainerErr);
      }
      
      // Update trainer profile battle stats
      try {
        const { data: trainerProfile } = await supabase
          .from('buddy_trainer_profiles')
          .select('total_battles, battles_won, bosses_defeated')
          .eq('player_buddy_id', buddy.id)
          .single();
        
        if (trainerProfile) {
          const updates: Record<string, unknown> = {
            total_battles: (trainerProfile.total_battles || 0) + 1,
            battles_won: (trainerProfile.battles_won || 0) + 1,
            updated_at: new Date().toISOString(),
          };
          if (!!battle.opponent_npc_name && battle.battle_type !== 'tutorial') {
            updates.bosses_defeated = (trainerProfile.bosses_defeated || 0) + 1;
          }
          await supabase
            .from('buddy_trainer_profiles')
            .update(updates)
            .eq('player_buddy_id', buddy.id);
        }
      } catch (statsErr) {
        console.error('[handleBattleTurn] Trainer stats update failed:', statsErr);
      }
    } else {
      // Loss - update HP and anxiety
      const anxietyChange = calculateAnxietyChange(false, !!battle.opponent_npc_name, buddy.anxiety_level);
      anxietyChangeResult = anxietyChange;
      
      // On loss, restore to full HP (Pokemon-style: no permanent HP penalty)
      await supabase
        .from('player_buddies')
        .update({
          current_hp: buddy.max_hp,
          anxiety_level: Math.min(100, buddy.anxiety_level + anxietyChange),
        })
        .eq('id', buddy.id);
      
      await logActivity(buddy.id, buddy.team_id, 'battle_lost', {
        battle_type: battle.battle_type,
        opponent: battle.opponent_npc_name || battle.opponent_buddy_id,
      });
      
      // Update trainer profile battle stats (loss)
      try {
        const { data: trainerProfile } = await supabase
          .from('buddy_trainer_profiles')
          .select('total_battles')
          .eq('player_buddy_id', buddy.id)
          .single();
        
        if (trainerProfile) {
          await supabase
            .from('buddy_trainer_profiles')
            .update({
              total_battles: (trainerProfile.total_battles || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('player_buddy_id', buddy.id);
        }
      } catch (statsErr) {
        console.error('[handleBattleTurn] Trainer stats (loss) update failed:', statsErr);
      }
    }
    
    // Rewards tracked in outer scope variables
  } else {
    // Mid-battle: track current HP for battle state (will be restored on battle end)
    // Don't persist damaged HP to player_buddies — only the battle record tracks mid-fight HP
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

  // Get player abilities for response (DB or default fallback)
  let playerAbilities: BuddyAbility[] = [];
  
  const { data: respAbilities, error: respAbilitiesError } = await supabase
    .from('buddy_type_abilities')
    .select('ability:buddy_abilities(*)')
    .eq('buddy_type_id', buddy.buddy_type.id)
    .lte('unlock_level', buddy.level);

  const dbRespAbilities = respAbilities?.map((a: any) => a.ability).filter(Boolean) || [];
  
  if (dbRespAbilities.length > 0) {
    playerAbilities = dbRespAbilities;
  } else {
    playerAbilities = getDefaultAbilities(buddy.buddy_type?.element || 'earth', buddy.level);
    console.log('[handleBattleTurn] Using default abilities for response');
  }

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
    winner: winner || undefined,
  };

  return NextResponse.json({
    battle_state: battleState,
    message,
    damage: playerDamage,
    is_critical: playerIsCritical,
    player_heal: playerHeal,
    opponent_damage: opponentDamage,
    opponent_is_critical: opponentIsCritical,
    opponent_heal: opponentHeal,
    rewards: isFinished ? {
      xp_gained: xpGainedResult,
      anxiety_change: anxietyChangeResult,
    } : undefined,
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

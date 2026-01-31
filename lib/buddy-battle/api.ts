// =====================================================
// BUDDY BATTLE - SUPABASE API
// Database operations and queries
// =====================================================

import { createClient } from '@/lib/supabase/client';
import {
  PlayerBuddy,
  PlayerBuddyWithDetails,
  BuddyType,
  TrainerProfile,
  BuddyBattle,
  InventoryItem,
  ShopItem,
  QuestProgress,
  PlayerAchievement,
  TeamBuff,
  LeaderboardEntry,
  LeaderboardType,
  PointTransaction,
  StatType,
  TransactionType,
} from './types';
import { calculatePointsForRange } from './game-logic';

// ===================
// BUDDY OPERATIONS
// ===================

/**
 * Get all available buddy types
 */
export async function getBuddyTypes(): Promise<BuddyType[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('buddy_types')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
}

/**
 * Get player's buddy for a specific team
 */
export async function getPlayerBuddy(
  memberId: string,
  teamId: string
): Promise<PlayerBuddyWithDetails | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('player_buddies')
    .select(`
      *,
      buddy_type:buddy_types(*),
      member:members(id, first_name, last_name, profile_image_url)
    `)
    .eq('member_id', memberId)
    .eq('team_id', teamId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Create a new buddy for a player
 */

// Hardcoded buddy types (same as in types API)
const BUDDY_TYPES_DATA: Record<string, { 
  name: string; 
  element: string;
  base_hp: number; 
  base_attack: number; 
  base_defense: number; 
  base_speed: number;
  base_special_attack: number;
  base_special_defense: number;
  uuid: string; // UUID for database foreign key
}> = {
  blazor: { name: 'Blazor', element: 'fire', base_hp: 85, base_attack: 95, base_defense: 70, base_speed: 85, base_special_attack: 90, base_special_defense: 65, uuid: '11111111-1111-1111-1111-111111111111' },
  aquabit: { name: 'Aquabit', element: 'water', base_hp: 100, base_attack: 75, base_defense: 90, base_speed: 70, base_special_attack: 80, base_special_defense: 95, uuid: '22222222-2222-2222-2222-222222222222' },
  terrapix: { name: 'Terrapix', element: 'earth', base_hp: 120, base_attack: 80, base_defense: 100, base_speed: 50, base_special_attack: 60, base_special_defense: 90, uuid: '33333333-3333-3333-3333-333333333333' },
  zephyron: { name: 'Zephyron', element: 'air', base_hp: 70, base_attack: 85, base_defense: 60, base_speed: 110, base_special_attack: 85, base_special_defense: 55, uuid: '44444444-4444-4444-4444-444444444444' },
  voltling: { name: 'Voltling', element: 'electric', base_hp: 80, base_attack: 90, base_defense: 75, base_speed: 95, base_special_attack: 95, base_special_defense: 70, uuid: '55555555-5555-5555-5555-555555555555' },
};

export async function createPlayerBuddy(
  memberId: string,
  teamId: string,
  buddyTypeId: string,
  nickname?: string,
  colors?: { primary: string; secondary: string; accent: string }
): Promise<PlayerBuddy> {
  const supabase = createClient();
  
  // Get buddy type from hardcoded data
  const buddyType = BUDDY_TYPES_DATA[buddyTypeId];
  
  if (!buddyType) {
    throw new Error(`Unknown buddy type: ${buddyTypeId}`);
  }
  
  const { data, error } = await supabase
    .from('player_buddies')
    .insert({
      member_id: memberId,
      team_id: teamId,
      buddy_type_id: buddyType.uuid, // Use UUID instead of string ID
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
  
  if (error) {
    throw new Error(`Database error: ${error.message} (code: ${error.code}, details: ${error.details})`);
  }
  
  // Create trainer profile
  await supabase
    .from('buddy_trainer_profiles')
    .insert({
      player_buddy_id: data.id,
    });
  
  // Log activity
  await logActivity(data.id, teamId, 'buddy_created', {
    buddy_type: buddyType.name,
    nickname,
  });
  
  return data;
}

/**
 * Update buddy colors
 */
export async function updateBuddyColors(
  buddyId: string,
  colors: { primary: string; secondary: string; accent: string }
): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('player_buddies')
    .update({
      color_primary: colors.primary,
      color_secondary: colors.secondary,
      color_accent: colors.accent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', buddyId);
  
  if (error) throw error;
}

/**
 * Upgrade a buddy stat
 */
export async function upgradeBuddyStat(
  buddyId: string,
  statType: StatType,
  pointsCost: number,
  newValue: number
): Promise<PlayerBuddy> {
  const supabase = createClient();
  
  // Get current buddy
  const { data: buddy, error: fetchError } = await supabase
    .from('player_buddies')
    .select('*')
    .eq('id', buddyId)
    .single();
  
  if (fetchError) throw fetchError;
  
  if (buddy.available_points < pointsCost) {
    throw new Error('Not enough points');
  }
  
  // Map stat type to column name
  const statColumn = statType === 'hp' ? 'max_hp' : statType;
  const oldValue = statType === 'hp' ? buddy.max_hp : buddy[statType];
  
  // Update buddy
  const { data, error } = await supabase
    .from('player_buddies')
    .update({
      [statColumn]: newValue,
      available_points: buddy.available_points - pointsCost,
      total_points_spent: buddy.total_points_spent + pointsCost,
      updated_at: new Date().toISOString(),
    })
    .eq('id', buddyId)
    .select()
    .single();
  
  if (error) throw error;
  
  // Log upgrade
  await supabase.from('buddy_stat_upgrades').insert({
    player_buddy_id: buddyId,
    stat_type: statType,
    points_spent: pointsCost,
    old_value: oldValue,
    new_value: newValue,
  });
  
  // Log activity
  await logActivity(buddyId, buddy.team_id, 'stat_upgrade', {
    stat: statType,
    old_value: oldValue,
    new_value: newValue,
    points_spent: pointsCost,
  });
  
  // Create point transaction
  await createPointTransaction(buddyId, -pointsCost, 'stat_upgrade', `Upgraded ${statType}`);
  
  return data;
}

// ===================
// POINT SYSTEM
// ===================

/**
 * Calculate and award points for a buddy up to current date
 */
export async function calculateAndAwardPoints(
  memberId: string,
  buddyId: string,
  teamId: string
): Promise<{ pointsAwarded: number; breakdown: { date: string; points: number }[] }> {
  const supabase = createClient();
  
  // Get buddy's last calculated date
  const { data: buddy, error: buddyError } = await supabase
    .from('player_buddies')
    .select('last_points_calculated_date, available_points, total_points_earned')
    .eq('id', buddyId)
    .single();
  
  if (buddyError) throw buddyError;
  
  // Get member's country for holidays
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('country_code')
    .eq('id', memberId)
    .single();
  
  if (memberError) throw memberError;
  
  const startDate = buddy.last_points_calculated_date 
    ? new Date(buddy.last_points_calculated_date)
    : new Date(new Date().setMonth(new Date().getMonth() - 1)); // Default to 1 month ago
  
  startDate.setDate(startDate.getDate() + 1); // Start from day after last calculated
  
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  
  if (startDate > endDate) {
    return { pointsAwarded: 0, breakdown: [] };
  }
  
  // Get availabilities for date range
  const { data: availabilities, error: availError } = await supabase
    .from('availability')
    .select('date, status')
    .eq('member_id', memberId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0]);
  
  if (availError) throw availError;
  
  // Get holidays for date range
  const { data: holidays, error: holidayError } = await supabase
    .from('holidays')
    .select('date')
    .eq('country_code', member.country_code)
    .eq('is_official', true)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0]);
  
  if (holidayError) throw holidayError;
  
  const { total, breakdown } = calculatePointsForRange(
    availabilities || [],
    holidays || [],
    startDate,
    endDate
  );
  
  if (total > 0) {
    // Update buddy points
    const { error: updateError } = await supabase
      .from('player_buddies')
      .update({
        available_points: buddy.available_points + total,
        total_points_earned: buddy.total_points_earned + total,
        last_points_calculated_date: endDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', buddyId);
    
    if (updateError) throw updateError;
    
    // Create transactions for each day
    for (const day of breakdown) {
      if (day.points > 0) {
        await createPointTransaction(
          buddyId,
          day.points,
          day.isHoliday ? 'holiday_bonus' : 'daily_availability',
          `Points for ${day.date}`,
          day.date
        );
      }
    }
  }
  
  return { pointsAwarded: total, breakdown };
}

/**
 * Create a point transaction record
 */
export async function createPointTransaction(
  buddyId: string,
  amount: number,
  type: TransactionType,
  description?: string,
  referenceDate?: string
): Promise<PointTransaction> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('buddy_point_transactions')
    .insert({
      player_buddy_id: buddyId,
      amount,
      transaction_type: type,
      description,
      reference_date: referenceDate,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ===================
// TRAINER PROFILE
// ===================

/**
 * Get trainer profile for a buddy
 */
export async function getTrainerProfile(buddyId: string): Promise<TrainerProfile | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('buddy_trainer_profiles')
    .select('*')
    .eq('player_buddy_id', buddyId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Update login streak
 */
export async function updateLoginStreak(buddyId: string): Promise<TrainerProfile | null> {
  const supabase = createClient();
  
  const { data: profile, error: fetchError } = await supabase
    .from('buddy_trainer_profiles')
    .select('*')
    .eq('player_buddy_id', buddyId)
    .single();
  
  // If no profile exists, create one
  if (fetchError && fetchError.code === 'PGRST116') {
    const today = new Date().toISOString().split('T')[0];
    const { data: newProfile, error: createError } = await supabase
      .from('buddy_trainer_profiles')
      .insert({
        player_buddy_id: buddyId,
        trainer_title: 'Rookie Trainer',
        tutorial_completed: false,
        current_login_streak: 1,
        longest_login_streak: 1,
        last_login_date: today,
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Failed to create trainer profile:', createError);
      return null;
    }
    return newProfile;
  }
  
  if (fetchError) {
    console.error('Failed to fetch trainer profile:', fetchError);
    return null;
  }
  
  const today = new Date().toISOString().split('T')[0];
  const lastLogin = profile.last_login_date;
  
  let newStreak = 1;
  
  if (lastLogin) {
    const lastDate = new Date(lastLogin);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      // Consecutive day
      newStreak = profile.current_login_streak + 1;
    } else if (diffDays === 0) {
      // Same day, no change
      return profile;
    }
    // If more than 1 day, streak resets to 1
  }
  
  const { data, error } = await supabase
    .from('buddy_trainer_profiles')
    .update({
      current_login_streak: newStreak,
      longest_login_streak: Math.max(newStreak, profile.longest_login_streak),
      last_login_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('player_buddy_id', buddyId)
    .select()
    .single();
  
  if (error) {
    console.error('Failed to update login streak:', error);
    return profile; // Return existing profile if update fails
  }
  
  // Log activity
  const { data: buddy } = await supabase
    .from('player_buddies')
    .select('team_id')
    .eq('id', buddyId)
    .single();
  
  if (buddy) {
    await logActivity(buddyId, buddy.team_id, 'login', { streak: newStreak });
  }
  
  return data;
}

// ===================
// INVENTORY & SHOP
// ===================

/**
 * Get player's inventory
 */
export async function getPlayerInventory(buddyId: string): Promise<InventoryItem[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('buddy_player_inventory')
    .select(`
      *,
      item:buddy_items(*)
    `)
    .eq('player_buddy_id', buddyId)
    .gt('quantity', 0);
  
  if (error) throw error;
  return data || [];
}

/**
 * Get current shop items for a team
 */
export async function getShopItems(teamId: string): Promise<ShopItem[]> {
  const supabase = createClient();
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('buddy_shop_inventory')
    .select(`
      *,
      item:buddy_items(*)
    `)
    .eq('team_id', teamId)
    .lte('available_from', now)
    .gte('available_until', now);
  
  if (error) throw error;
  return data || [];
}

/**
 * Purchase an item
 */
export async function purchaseItem(
  buddyId: string,
  shopItemId: string
): Promise<InventoryItem> {
  const supabase = createClient();
  
  // Get shop item
  const { data: shopItem, error: shopError } = await supabase
    .from('buddy_shop_inventory')
    .select('*, item:buddy_items(*)')
    .eq('id', shopItemId)
    .single();
  
  if (shopError) throw shopError;
  
  // Get buddy
  const { data: buddy, error: buddyError } = await supabase
    .from('player_buddies')
    .select('available_points, team_id')
    .eq('id', buddyId)
    .single();
  
  if (buddyError) throw buddyError;
  
  if (buddy.available_points < shopItem.price) {
    throw new Error('Not enough points');
  }
  
  if (shopItem.quantity_available !== null && shopItem.quantity_available <= 0) {
    throw new Error('Item out of stock');
  }
  
  // Deduct points
  await supabase
    .from('player_buddies')
    .update({
      available_points: buddy.available_points - shopItem.price,
      total_points_spent: supabase.rpc('increment', { x: shopItem.price }),
    })
    .eq('id', buddyId);
  
  // Add to inventory (upsert)
  const { data: existingItem } = await supabase
    .from('buddy_player_inventory')
    .select('id, quantity')
    .eq('player_buddy_id', buddyId)
    .eq('item_id', shopItem.item_id)
    .single();
  
  let inventoryItem: InventoryItem;
  
  if (existingItem) {
    const { data, error } = await supabase
      .from('buddy_player_inventory')
      .update({ quantity: existingItem.quantity + 1 })
      .eq('id', existingItem.id)
      .select('*, item:buddy_items(*)')
      .single();
    
    if (error) throw error;
    inventoryItem = data;
  } else {
    const { data, error } = await supabase
      .from('buddy_player_inventory')
      .insert({
        player_buddy_id: buddyId,
        item_id: shopItem.item_id,
        quantity: 1,
        acquired_from: 'shop',
      })
      .select('*, item:buddy_items(*)')
      .single();
    
    if (error) throw error;
    inventoryItem = data;
  }
  
  // Update shop stock if limited
  if (shopItem.quantity_available !== null) {
    await supabase
      .from('buddy_shop_inventory')
      .update({ quantity_available: shopItem.quantity_available - 1 })
      .eq('id', shopItemId);
  }
  
  // Create transaction
  await createPointTransaction(
    buddyId,
    -shopItem.price,
    'item_purchase',
    `Purchased ${shopItem.item.name}`
  );
  
  // Log activity
  await logActivity(buddyId, buddy.team_id, 'item_purchased', {
    item_name: shopItem.item.name,
    price: shopItem.price,
  });
  
  return inventoryItem;
}

// ===================
// QUESTS
// ===================

/**
 * Get active quests for a buddy
 */
export async function getActiveQuests(buddyId: string): Promise<QuestProgress[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('buddy_quest_progress')
    .select(`
      *,
      quest:buddy_quests(*)
    `)
    .eq('player_buddy_id', buddyId)
    .eq('is_claimed', false);
  
  if (error) {
    console.error('Failed to get active quests:', error);
    return [];
  }
  return data || [];
}

/**
 * Claim quest reward
 */
export async function claimQuestReward(
  buddyId: string,
  questProgressId: string
): Promise<{ points: number; xp: number; item?: string }> {
  const supabase = createClient();
  
  const { data: progress, error: fetchError } = await supabase
    .from('buddy_quest_progress')
    .select('*, quest:buddy_quests(*)')
    .eq('id', questProgressId)
    .eq('player_buddy_id', buddyId)
    .single();
  
  if (fetchError) throw fetchError;
  
  if (!progress.is_completed || progress.is_claimed) {
    throw new Error('Quest not completed or already claimed');
  }
  
  const quest = progress.quest;
  
  // Award points
  if (quest.reward_points > 0) {
    await supabase.rpc('add_buddy_points', {
      p_buddy_id: buddyId,
      p_amount: quest.reward_points,
    });
    
    await createPointTransaction(
      buddyId,
      quest.reward_points,
      'quest_reward',
      `Quest reward: ${quest.name}`
    );
  }
  
  // Award item if any
  if (quest.reward_item_id) {
    const { data: existingItem } = await supabase
      .from('buddy_player_inventory')
      .select('id, quantity')
      .eq('player_buddy_id', buddyId)
      .eq('item_id', quest.reward_item_id)
      .single();
    
    if (existingItem) {
      await supabase
        .from('buddy_player_inventory')
        .update({ quantity: existingItem.quantity + quest.reward_item_quantity })
        .eq('id', existingItem.id);
    } else {
      await supabase.from('buddy_player_inventory').insert({
        player_buddy_id: buddyId,
        item_id: quest.reward_item_id,
        quantity: quest.reward_item_quantity,
        acquired_from: 'quest',
      });
    }
  }
  
  // Mark as claimed
  await supabase
    .from('buddy_quest_progress')
    .update({
      is_claimed: true,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', questProgressId);
  
  return {
    points: quest.reward_points,
    xp: quest.reward_xp,
    item: quest.reward_item_id ? 'Item received!' : undefined,
  };
}

// ===================
// LEADERBOARDS
// ===================

/**
 * Get leaderboard for a team
 */
export async function getLeaderboard(
  teamId: string,
  type: LeaderboardType,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('player_buddies')
    .select(`
      id,
      nickname,
      level,
      total_points_earned,
      buddy_type:buddy_types(name),
      member:members(first_name, last_name, profile_image_url),
      trainer_profile:buddy_trainer_profiles(
        trainer_level,
        battles_won,
        bosses_defeated,
        current_login_streak
      )
    `)
    .eq('team_id', teamId)
    .eq('is_active', true);
  
  // Order by the appropriate field
  switch (type) {
    case 'trainer_level':
      query = query.order('trainer_profile.trainer_level', { ascending: false });
      break;
    case 'buddy_level':
      query = query.order('level', { ascending: false });
      break;
    case 'battles_won':
      query = query.order('trainer_profile.battles_won', { ascending: false });
      break;
    case 'bosses_defeated':
      query = query.order('trainer_profile.bosses_defeated', { ascending: false });
      break;
    case 'total_points':
      query = query.order('total_points_earned', { ascending: false });
      break;
    case 'login_streak':
      query = query.order('trainer_profile.current_login_streak', { ascending: false });
      break;
  }
  
  query = query.limit(limit);
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map((entry: any, index: number) => {
    const profile = Array.isArray(entry.trainer_profile)
      ? entry.trainer_profile[0]
      : entry.trainer_profile;
    
    let value = 0;
    switch (type) {
      case 'trainer_level':
        value = profile?.trainer_level || 1;
        break;
      case 'buddy_level':
        value = entry.level;
        break;
      case 'battles_won':
        value = profile?.battles_won || 0;
        break;
      case 'bosses_defeated':
        value = profile?.bosses_defeated || 0;
        break;
      case 'total_points':
        value = entry.total_points_earned;
        break;
      case 'login_streak':
        value = profile?.current_login_streak || 0;
        break;
    }
    
    return {
      rank: index + 1,
      player_buddy_id: entry.id,
      user_id: entry.user_id || entry.member?.user_id || '',
      member_name: `${entry.member.first_name} ${entry.member.last_name || ''}`.trim(),
      buddy_nickname: entry.nickname,
      buddy_type_name: entry.buddy_type.name,
      buddy_element: entry.buddy_type.element,
      value,
      avatar_url: entry.member.profile_image_url,
      is_current_player: false, // Will be set by the caller
    };
  });
}

// ===================
// ACHIEVEMENTS
// ===================

/**
 * Get player achievements
 */
export async function getPlayerAchievements(buddyId: string): Promise<PlayerAchievement[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('buddy_player_achievements')
    .select(`
      *,
      achievement:buddy_achievements(*)
    `)
    .eq('player_buddy_id', buddyId)
    .order('earned_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Award achievement if not already earned
 */
export async function awardAchievement(
  buddyId: string,
  achievementId: string
): Promise<PlayerAchievement | null> {
  const supabase = createClient();
  
  // Check if already earned
  const { data: existing } = await supabase
    .from('buddy_player_achievements')
    .select('id')
    .eq('player_buddy_id', buddyId)
    .eq('achievement_id', achievementId)
    .single();
  
  if (existing) return null;
  
  const { data, error } = await supabase
    .from('buddy_player_achievements')
    .insert({
      player_buddy_id: buddyId,
      achievement_id: achievementId,
    })
    .select('*, achievement:buddy_achievements(*)')
    .single();
  
  if (error) throw error;
  
  // Log activity
  const { data: buddy } = await supabase
    .from('player_buddies')
    .select('team_id')
    .eq('id', buddyId)
    .single();
  
  if (buddy) {
    await logActivity(buddyId, buddy.team_id, 'achievement_earned', {
      achievement_name: data.achievement.name,
    });
  }
  
  return data;
}

// ===================
// TEAM FEATURES
// ===================

/**
 * Get active team buffs
 */
export async function getActiveTeamBuffs(teamId: string): Promise<TeamBuff[]> {
  const supabase = createClient();
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('buddy_team_buffs')
    .select('*')
    .eq('team_id', teamId)
    .lte('active_from', now)
    .gte('active_until', now);
  
  if (error) {
    console.error('Failed to get team buffs:', error);
    return [];
  }
  return data || [];
}

/**
 * Get team buddies
 */
export async function getTeamBuddies(teamId: string): Promise<PlayerBuddyWithDetails[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('player_buddies')
    .select(`
      *,
      buddy_type:buddy_types(*),
      member:members(id, first_name, last_name, profile_image_url)
    `)
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('level', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// ===================
// ACTIVITY LOGGING
// ===================

/**
 * Log an activity for audit trail
 */
export async function logActivity(
  buddyId: string | null,
  teamId: string | null,
  actionType: string,
  actionData: Record<string, unknown> = {}
): Promise<void> {
  const supabase = createClient();
  
  await supabase.from('buddy_activity_log').insert({
    player_buddy_id: buddyId,
    team_id: teamId,
    action_type: actionType,
    action_data: actionData,
  });
}

// ===================
// BATTLES
// ===================

/**
 * Get battle history for a buddy
 */
export async function getBattleHistory(
  buddyId: string,
  limit: number = 10
): Promise<BuddyBattle[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('buddy_battles')
    .select('*')
    .or(`challenger_buddy_id.eq.${buddyId},opponent_buddy_id.eq.${buddyId}`)
    .order('started_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

/**
 * Check if boss battle is available for a buddy
 */
export async function checkBossBattleAvailability(
  buddyId: string,
  quarter: string
): Promise<{ canBattle: boolean; attemptsUsed: number; maxAttempts: number }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('boss_battle_attempts')
    .select('*')
    .eq('player_buddy_id', buddyId)
    .eq('quarter_year', quarter);
  
  if (error) throw error;
  
  const attempts: any[] = data || [];
  const hasWon = attempts.some((a: any) => a.was_successful);
  const attemptsUsed = attempts.length;
  
  // Max 2 attempts (1 free + 1 retry)
  const maxAttempts = 2;
  
  return {
    canBattle: !hasWon && attemptsUsed < maxAttempts,
    attemptsUsed,
    maxAttempts,
  };
}
/**
 * Get HP reset countdown information for a buddy
 * Returns time until next HP reset (24-hour cycle)
 */
export async function getHPResetCountdown(memberId: string): Promise<{
  nextResetTime: Date;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  canResetNow: boolean;
}> {
  const supabase = createClient();
  
  const { data: buddy, error } = await supabase
    .from('player_buddies')
    .select('id, last_hp_reset_date')
    .eq('member_id', memberId)
    .single();
  
  if (error || !buddy) {
    throw new Error('Buddy not found');
  }

  let nextResetTime: Date;

  if (!buddy.last_hp_reset_date) {
    // First time, reset is available now
    nextResetTime = new Date(0);
  } else {
    // Next reset is 24 hours after last reset
    const lastReset = new Date(buddy.last_hp_reset_date);
    nextResetTime = new Date(lastReset.getTime() + 24 * 60 * 60 * 1000);

    // If already passed, next reset is now
    if (nextResetTime < new Date()) {
      nextResetTime = new Date(0);
    }
  }

  const now = new Date();
  const diff = nextResetTime.getTime() - now.getTime();
  
  let hoursRemaining = 0, minutesRemaining = 0, secondsRemaining = 0;
  
  if (diff > 0) {
    hoursRemaining = Math.floor(diff / (1000 * 60 * 60));
    minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    secondsRemaining = Math.floor((diff % (1000 * 60)) / 1000);
  }

  const canResetNow = diff <= 0;

  return {
    nextResetTime,
    hoursRemaining,
    minutesRemaining,
    secondsRemaining,
    canResetNow,
  };
}

/**
 * Reset buddy HP (only if 24+ hours since last reset)
 */
export async function resetBuddyHP(memberId: string): Promise<PlayerBuddy> {
  const supabase = createClient();
  
  const { data: buddy, error: fetchError } = await supabase
    .from('player_buddies')
    .select('id, max_hp, current_hp, last_hp_reset_date')
    .eq('member_id', memberId)
    .single();

  if (fetchError || !buddy) {
    throw new Error('Buddy not found');
  }

  // Check if HP has already been reset today
  const lastReset = buddy.last_hp_reset_date ? new Date(buddy.last_hp_reset_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lastReset) {
    const lastResetDate = new Date(lastReset);
    lastResetDate.setHours(0, 0, 0, 0);

    if (lastResetDate.getTime() === today.getTime()) {
      throw new Error('HP already reset today');
    }
  }

  // Reset the HP
  const { data: updated, error: updateError } = await supabase
    .from('player_buddies')
    .update({
      current_hp: buddy.max_hp,
      last_hp_reset_date: new Date().toISOString(),
    })
    .eq('id', buddy.id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to reset HP: ${updateError.message}`);
  }

  return updated;
}
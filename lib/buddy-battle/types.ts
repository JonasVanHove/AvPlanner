// =====================================================
// BUDDY BATTLE GAMIFICATION SYSTEM - TypeScript Types
// =====================================================

// ===================
// CORE TYPES
// ===================

export type BuddyElement = 'fire' | 'water' | 'earth' | 'air' | 'electric';

export type BattleType = 'tutorial' | 'boss' | 'pvp' | 'training';

export type ItemType = 'consumable' | 'equipment' | 'cosmetic' | 'special';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type QuestType = 'daily' | 'weekly' | 'special' | 'achievement';

export type TransactionType = 
  | 'daily_availability'
  | 'holiday_bonus'
  | 'stat_upgrade'
  | 'item_purchase'
  | 'boss_retry'
  | 'quest_reward'
  | 'battle_reward'
  | 'admin_adjustment';

export type StatType = 
  | 'hp'
  | 'attack'
  | 'defense'
  | 'speed'
  | 'special_attack'
  | 'special_defense'
  | 'critical_chance';

export type EffectType = 
  | 'damage'
  | 'heal'
  | 'buff'
  | 'debuff'
  | 'status'
  | 'buff_attack'
  | 'buff_defense'
  | 'buff_speed'
  | 'buff_all'
  | 'restore_anxiety'
  | 'critical_boost';

export type AchievementType =
  | 'first_battle'
  | 'boss_slayer'
  | 'win_streak'
  | 'level_milestone'
  | 'collector'
  | 'trader'
  | 'team_player'
  | 'perfect_attendance'
  | 'legend';

// ===================
// BUDDY TYPES
// ===================

export interface BuddyType {
  id: string;
  name: string;
  description: string;
  element: BuddyElement;
  base_hp: number;
  base_attack: number;
  base_defense: number;
  base_speed: number;
  base_special_attack: number;
  base_special_defense: number;
  sprite_base_url?: string;
  created_at: string;
}

// Type alias for stat names
export type BuddyStat = 'hp' | 'attack' | 'defense' | 'speed' | 'special_attack' | 'special_defense' | 'critical_chance';

export interface PlayerBuddy {
  id: string;
  member_id: string;
  user_id?: string;
  team_id: string;
  buddy_type_id: string;
  nickname?: string;
  name?: string; // Display name (nickname or type name)
  element?: BuddyElement; // From buddy_type
  // Stats
  current_hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  speed: number;
  special_attack: number;
  special_defense: number;
  critical_chance: number;
  // Leveling
  level: number;
  experience: number;
  // Points
  available_points: number;
  total_points_earned: number;
  total_points_spent: number;
  // Customization
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  // Status
  anxiety_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_points_calculated_date?: string;
  // Joined data
  buddy_type?: BuddyType;
  trainer_profile?: TrainerProfile;
}

export interface PlayerBuddyWithDetails extends PlayerBuddy {
  buddy_type: BuddyType;
  member: {
    id: string;
    first_name: string;
    last_name?: string;
    profile_image_url?: string;
  };
  points_awarded_today?: number;
}

// ===================
// BATTLE TYPES
// ===================

export interface BuddyAbility {
  id: string;
  name: string;
  description?: string;
  element: BuddyElement | 'neutral';
  damage_base: number;
  accuracy: number;
  cooldown_turns: number;
  is_special: boolean;
  effect_type: EffectType;
  effect_value?: number;
  effect_duration?: number;
  unlock_level: number;
}

export interface BattleAction {
  turn: number;
  actor: 'player' | 'opponent';
  action_type: 'ability' | 'item' | 'switch' | 'flee';
  ability_used?: string;
  item_used?: string;
  damage_dealt?: number;
  was_critical?: boolean;
  effects_applied?: string[];
  remaining_hp_player: number;
  remaining_hp_opponent: number;
  message: string;
}

export interface BuddyBattle {
  id: string;
  team_id: string;
  battle_type: BattleType;
  challenger_buddy_id: string;
  opponent_buddy_id?: string;
  opponent_npc_name?: string;
  winner_buddy_id?: string;
  winner_is_npc: boolean;
  total_turns?: number;
  battle_log: BattleAction[];
  started_at: string;
  ended_at?: string;
  quarter_year?: string;
  is_retry: boolean;
  retry_cost?: number;
}

export interface BattleState {
  battle_id: string;
  current_turn: number;
  player_buddy: BattleBuddyState;
  opponent: BattleBuddyState;
  is_player_turn: boolean;
  active_effects: ActiveEffect[];
  available_abilities: BuddyAbility[];
  available_items: InventoryItem[];
  battle_log: BattleAction[];
  is_finished: boolean;
  winner?: 'player' | 'opponent';
}

export interface BattleBuddyState {
  buddy_id: string;
  name: string;
  is_npc: boolean;
  current_hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  speed: number;
  special_attack: number;
  special_defense: number;
  critical_chance: number;
  element: BuddyElement;
  sprite_url?: string;
  ability_cooldowns: Record<string, number>;
}

export interface ActiveEffect {
  effect_id: string;
  effect_type: EffectType;
  target: 'player' | 'opponent';
  value: number;
  remaining_turns: number;
  source: string;
}

// ===================
// NPC BOSSES
// ===================

export interface NPCBoss {
  name: string;
  title: string;
  description: string;
  element: BuddyElement;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  special_attack: number;
  special_defense: number;
  critical_chance: number;
  abilities: string[];
  sprite_url: string;
  defeat_reward_points: number;
  defeat_reward_items: string[];
  defeat_title?: string;
  pre_battle_dialogue: string[];
  victory_dialogue: string[];
  defeat_dialogue: string[];
}

export const TUTORIAL_BOSS: NPCBoss = {
  name: 'Nikita',
  title: 'The Training Master',
  description: 'A friendly trainer here to teach you the basics of battle.',
  element: 'earth',
  level: 1,
  hp: 18,        // Slightly lower than player buddies
  attack: 7,     // Weaker attack
  defense: 6,    // Lower defense so player can do damage
  speed: 5,      // Slow so player usually goes first
  special_attack: 6,
  special_defense: 5,
  critical_chance: 3,
  abilities: ['Tackle', 'Sand Attack'],
  sprite_url: '/buddy-battle/npcs/nikita.png',
  defeat_reward_points: 15,  // Good reward for first win
  defeat_reward_items: ['Health Potion'],
  pre_battle_dialogue: [
    'Welcome, young trainer!',
    'I am Nikita, your training master.',
    "Let's see what you've got!",
    'Remember: type advantages matter!'
  ],
  victory_dialogue: [
    'Impressive!',
    'You have learned well.',
    'You are ready for real battles now!'
  ],
  defeat_dialogue: [
    "Don't give up!",
    'Practice makes perfect.',
    'Come back when you are ready.'
  ]
};

export const QUARTERLY_BOSS: NPCBoss = {
  name: 'Marie-Françoise',
  title: 'The Quarterly Nightmare',
  description: 'A fearsome opponent who appears at the end of each quarter. Only the brave dare challenge her.',
  element: 'fire',
  level: 50,
  hp: 500,
  attack: 45,
  defense: 40,
  speed: 35,
  special_attack: 50,
  special_defense: 38,
  critical_chance: 15,
  abilities: ['Inferno Blast', 'Fire Punch', 'Tackle', 'Focus Energy'],
  sprite_url: '/buddy-battle/npcs/marie-francoise.png',
  defeat_reward_points: 50,
  defeat_reward_items: ['Mystery Box Premium', 'Boss Key'],
  defeat_title: 'Quarter Conqueror',
  pre_battle_dialogue: [
    'So... you dare challenge ME?',
    'Many have tried. Few have succeeded.',
    'I am Marie-Françoise, the Quarterly Nightmare!',
    'Prepare for your PERFORMANCE REVIEW!'
  ],
  victory_dialogue: [
    'No... this cannot be!',
    'You have defeated me... for now.',
    "But I'll be back next quarter!",
    'Take your reward, champion.'
  ],
  defeat_dialogue: [
    'MWAHAHAHA!',
    'Did you really think you could beat me?',
    'Your anxiety increases...',
    'Come back when you are TRULY ready.'
  ]
};

// ===================
// ITEMS & INVENTORY
// ===================

export interface BuddyItem {
  id: string;
  name: string;
  description?: string;
  item_type: ItemType;
  type?: ItemType; // Alias for item_type
  rarity: ItemRarity;
  effect_type?: EffectType;
  effect_value?: number;
  effect_duration_turns?: number;
  base_price: number;
  is_purchasable: boolean;
  is_limited_time: boolean;
  sprite_url?: string;
  created_at: string;
  quantity?: number; // For inventory display
  stat_modifier?: {
    stat: string;
    amount: number;
  };
}

export interface InventoryItem {
  id: string;
  player_buddy_id: string;
  item_id: string;
  quantity: number;
  acquired_at: string;
  acquired_from: 'shop' | 'quest' | 'battle' | 'boss_loot' | 'mystery_box' | 'event' | 'admin';
  item?: BuddyItem;
}

export interface ShopItem {
  id: string;
  team_id: string;
  item_id: string;
  price: number;
  quantity_available?: number;
  week_year: string;
  is_featured: boolean;
  is_limited: boolean;
  available_from: string;
  available_until: string;
  item?: BuddyItem;
}

export interface MysteryBox {
  id: string;
  name: string;
  description?: string;
  price: number;
  sprite_url?: string;
  is_active: boolean;
}

// ===================
// QUESTS
// ===================

export type QuestRequirementType =
  | 'login_streak'
  | 'upgrade_buddy'
  | 'win_battle'
  | 'do_duel'
  | 'buy_item'
  | 'complete_availability'
  | 'defeat_boss'
  | 'reach_level';

export interface BuddyQuest {
  id: string;
  name: string;
  description?: string;
  quest_type: QuestType;
  requirement_type: QuestRequirementType;
  requirement_value: number;
  reward_points: number;
  reward_item_id?: string;
  reward_item_quantity: number;
  reward_xp: number;
  is_active: boolean;
  reward_item?: BuddyItem;
}

export interface QuestProgress {
  id: string;
  player_buddy_id: string;
  quest_id: string;
  current_progress: number;
  is_completed: boolean;
  is_claimed: boolean;
  period_identifier?: string;
  started_at: string;
  completed_at?: string;
  claimed_at?: string;
  quest?: BuddyQuest;
}

// ===================
// TRAINER & ACHIEVEMENTS
// ===================

export interface TrainerProfile {
  id: string;
  player_buddy_id: string;
  trainer_level: number;
  trainer_xp: number;
  total_battles: number;
  battles_won: number;
  battles_lost: number;
  bosses_defeated: number;
  tutorial_completed: boolean;
  current_login_streak: number;
  longest_login_streak: number;
  last_login_date?: string;
  avatar_sprite: string;
  avatar_color: string;
  trainer_title?: string;
  created_at: string;
  updated_at: string;
}

export interface BuddyAchievement {
  id: string;
  name: string;
  description?: string;
  icon_name?: string;
  achievement_type: AchievementType;
  requirement_value?: number;
  reward_title?: string;
  sprite_url?: string;
}

export interface PlayerAchievement {
  id: string;
  player_buddy_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: BuddyAchievement;
}

// ===================
// TEAM FEATURES
// ===================

export type TeamBuffType = 'xp_boost' | 'point_boost' | 'shop_discount' | 'crit_boost';

export interface TeamBuff {
  id: string;
  team_id: string;
  buff_type: TeamBuffType;
  buff_value: number;
  reason?: string;
  active_from: string;
  active_until: string;
}

export interface TeamEvent {
  id: string;
  team_id: string;
  event_type: 'boss_defeated' | 'team_milestone' | 'weekly_champion' | 'special_event';
  title: string;
  description?: string;
  event_data: Record<string, unknown>;
  created_at: string;
}

// ===================
// LEADERBOARDS
// ===================

export interface LeaderboardEntry {
  rank: number;
  position?: number;
  player_buddy_id: string;
  user_id: string;
  member_name: string;
  trainer_name?: string;
  buddy_nickname?: string;
  buddy_name?: string;
  buddy_type_name: string;
  buddy_element?: BuddyElement;
  value: number;
  avatar_url?: string;
  is_current_player: boolean;
  xp_progress?: {
    current: number;
    required: number;
  };
}

export type LeaderboardType = 
  | 'trainer_level'
  | 'buddy_level'
  | 'battles_won'
  | 'bosses_defeated'
  | 'total_points'
  | 'login_streak';

// ===================
// POINT SYSTEM
// ===================

export interface PointTransaction {
  id: string;
  player_buddy_id: string;
  amount: number;
  transaction_type: TransactionType;
  description?: string;
  reference_date?: string;
  created_at: string;
  created_by?: string;
}

export interface PointCalculation {
  date: string;
  points: number;
  is_holiday: boolean;
  availability_status?: string;
}

// ===================
// STAT UPGRADES
// ===================

export interface StatUpgrade {
  id: string;
  player_buddy_id: string;
  stat_type: StatType;
  points_spent: number;
  old_value: number;
  new_value: number;
  created_at: string;
}

export interface UpgradeCost {
  stat_type: StatType;
  current_value: number;
  next_value: number;
  point_cost: number;
  max_value: number;
  is_maxed: boolean;
}

// ===================
// ANALYTICS
// ===================

export interface DailyAnalytics {
  id: string;
  team_id: string;
  date: string;
  active_players: number;
  new_buddies_created: number;
  battles_fought: number;
  boss_attempts: number;
  boss_victories: number;
  points_earned: number;
  points_spent: number;
  items_purchased: number;
  total_upgrades: number;
  quests_completed: number;
  achievements_earned: number;
}

export interface ActivityLogEntry {
  id: string;
  player_buddy_id?: string;
  team_id?: string;
  action_type: string;
  action_data: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ===================
// MYSTERY BOX
// ===================

export interface MysteryBoxResult {
  success: boolean;
  box_type: string;
  items_received: BuddyItem[];
  total_value: number;
  is_jackpot: boolean;
  message: string;
  // Display properties
  name?: string;
  type?: string;
  rarity?: ItemRarity;
  is_duplicate?: boolean;
  refund_points?: number;
}

// ===================
// API RESPONSES
// ===================

export interface BuddyDashboard {
  buddy: PlayerBuddyWithDetails;
  trainer: TrainerProfile;
  active_quests: QuestProgress[];
  recent_achievements: PlayerAchievement[];
  active_team_buffs: TeamBuff[];
  next_level_xp: number;
  available_battles: {
    can_do_tutorial: boolean;
    can_do_boss: boolean;
    boss_attempts_used: number;
    max_boss_attempts: number;
  };
}

export interface ShopData {
  weekly_items: ShopItem[];
  featured_items: ShopItem[];
  limited_items: ShopItem[];
  mystery_boxes: MysteryBox[];
  player_points: number;
}

export interface BattleResult {
  battle: BuddyBattle;
  rewards: {
    xp_earned: number;
    points_earned: number;
    items_received: BuddyItem[];
    achievements_unlocked: BuddyAchievement[];
    title_earned?: string;
  };
  anxiety_change: number;
  level_up?: boolean;
  new_level?: number;
}

// ===================
// GAME CONSTANTS
// ===================

export const GAME_CONSTANTS = {
  MAX_LEVEL: 100,
  MAX_ANXIETY: 100,
  BOSS_RETRY_COST: 25,
  ANXIETY_LOSS_INCREASE: 10,
  XP_PER_LEVEL_BASE: 10,
  XP_PER_LEVEL_GROWTH: 5,
  STAT_UPGRADE_COST_BASE: 1,
  STAT_UPGRADE_COST_MULTIPLIER: 0.5,
  ELEMENT_ADVANTAGE_MULTIPLIER: 1.5,
  ELEMENT_DISADVANTAGE_MULTIPLIER: 0.5,
  CRITICAL_DAMAGE_MULTIPLIER: 1.5,
  DAILY_POINT_VALUE: 1,
  HOLIDAY_POINT_VALUE: 2,
  POINTS: {
    DAILY_AVAILABILITY: 1,
    HOLIDAY_AVAILABILITY: 2,
    STREAK_BONUS_7: 1,
    STREAK_BONUS_14: 2,
    STREAK_BONUS_30: 3,
  },
} as const;

export const ELEMENT_ADVANTAGES: Record<BuddyElement, BuddyElement> = {
  fire: 'air',
  water: 'fire',
  earth: 'electric',
  air: 'earth',
  electric: 'water',
};

export const ELEMENT_COLORS: Record<BuddyElement, string> = {
  fire: '#FF6B35',
  water: '#4ECDC4',
  earth: '#8B4513',
  air: '#87CEEB',
  electric: '#FFD93D',
};

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9E9E9E',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF9800',
};

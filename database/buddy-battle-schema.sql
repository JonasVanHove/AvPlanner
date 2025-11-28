-- =====================================================
-- BUDDY BATTLE GAMIFICATION SYSTEM
-- Complete Database Schema for AvPlanner
-- =====================================================

-- =====================================================
-- CORE BUDDY SYSTEM
-- =====================================================

-- Buddy Types - The 5 available buddy types with their base stats
CREATE TABLE public.buddy_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  base_hp integer NOT NULL DEFAULT 100,
  base_attack integer NOT NULL DEFAULT 10,
  base_defense integer NOT NULL DEFAULT 10,
  base_speed integer NOT NULL DEFAULT 10,
  base_special_attack integer NOT NULL DEFAULT 10,
  base_special_defense integer NOT NULL DEFAULT 10,
  element text NOT NULL CHECK (element IN ('fire', 'water', 'earth', 'air', 'electric')),
  sprite_base_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_types_pkey PRIMARY KEY (id)
);

-- Player Buddies - Each member can have one buddy per team
CREATE TABLE public.player_buddies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  team_id uuid NOT NULL,
  buddy_type_id uuid NOT NULL,
  nickname text,
  -- Current stats (can be upgraded)
  current_hp integer NOT NULL DEFAULT 100,
  max_hp integer NOT NULL DEFAULT 100,
  attack integer NOT NULL DEFAULT 10,
  defense integer NOT NULL DEFAULT 10,
  speed integer NOT NULL DEFAULT 10,
  special_attack integer NOT NULL DEFAULT 10,
  special_defense integer NOT NULL DEFAULT 10,
  critical_chance decimal(5,2) NOT NULL DEFAULT 5.00,
  -- Leveling
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 100),
  experience integer NOT NULL DEFAULT 0,
  -- Points system
  available_points integer NOT NULL DEFAULT 0,
  total_points_earned integer NOT NULL DEFAULT 0,
  total_points_spent integer NOT NULL DEFAULT 0,
  -- Customization (RGB colors for buddy parts)
  color_primary text DEFAULT '#4CAF50',
  color_secondary text DEFAULT '#2196F3',
  color_accent text DEFAULT '#FFC107',
  -- Status
  anxiety_level integer NOT NULL DEFAULT 0 CHECK (anxiety_level >= 0 AND anxiety_level <= 100),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_points_calculated_date date,
  CONSTRAINT player_buddies_pkey PRIMARY KEY (id),
  CONSTRAINT player_buddies_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE,
  CONSTRAINT player_buddies_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT player_buddies_buddy_type_id_fkey FOREIGN KEY (buddy_type_id) REFERENCES public.buddy_types(id),
  CONSTRAINT player_buddies_member_team_unique UNIQUE (member_id, team_id)
);

-- Point Transactions Log - Complete audit trail
CREATE TABLE public.buddy_point_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_buddy_id uuid NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN (
    'daily_availability',
    'holiday_bonus',
    'stat_upgrade',
    'item_purchase',
    'boss_retry',
    'quest_reward',
    'battle_reward',
    'admin_adjustment'
  )),
  description text,
  reference_date date,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT buddy_point_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_point_transactions_player_buddy_id_fkey FOREIGN KEY (player_buddy_id) REFERENCES public.player_buddies(id) ON DELETE CASCADE
);

-- Stat Upgrade History - Track all upgrades
CREATE TABLE public.buddy_stat_upgrades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_buddy_id uuid NOT NULL,
  stat_type text NOT NULL CHECK (stat_type IN ('hp', 'attack', 'defense', 'speed', 'special_attack', 'special_defense', 'critical_chance')),
  points_spent integer NOT NULL,
  old_value decimal(10,2) NOT NULL,
  new_value decimal(10,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_stat_upgrades_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_stat_upgrades_player_buddy_id_fkey FOREIGN KEY (player_buddy_id) REFERENCES public.player_buddies(id) ON DELETE CASCADE
);

-- =====================================================
-- BATTLE SYSTEM
-- =====================================================

-- Abilities that buddies can use in battle
CREATE TABLE public.buddy_abilities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  element text CHECK (element IN ('fire', 'water', 'earth', 'air', 'electric', 'neutral')),
  damage_base integer NOT NULL DEFAULT 10,
  accuracy decimal(5,2) NOT NULL DEFAULT 100.00,
  cooldown_turns integer NOT NULL DEFAULT 0,
  is_special boolean DEFAULT false,
  effect_type text CHECK (effect_type IN ('damage', 'heal', 'buff', 'debuff', 'status')),
  effect_value integer,
  effect_duration integer,
  unlock_level integer NOT NULL DEFAULT 1,
  CONSTRAINT buddy_abilities_pkey PRIMARY KEY (id)
);

-- Which abilities each buddy type can learn
CREATE TABLE public.buddy_type_abilities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buddy_type_id uuid NOT NULL,
  ability_id uuid NOT NULL,
  unlock_level integer NOT NULL DEFAULT 1,
  CONSTRAINT buddy_type_abilities_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_type_abilities_buddy_type_id_fkey FOREIGN KEY (buddy_type_id) REFERENCES public.buddy_types(id),
  CONSTRAINT buddy_type_abilities_ability_id_fkey FOREIGN KEY (ability_id) REFERENCES public.buddy_abilities(id),
  CONSTRAINT buddy_type_abilities_unique UNIQUE (buddy_type_id, ability_id)
);

-- Battle records
CREATE TABLE public.buddy_battles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  battle_type text NOT NULL CHECK (battle_type IN ('tutorial', 'boss', 'pvp', 'training')),
  -- Participants
  challenger_buddy_id uuid NOT NULL,
  opponent_buddy_id uuid,
  opponent_npc_name text,
  -- Results
  winner_buddy_id uuid,
  winner_is_npc boolean DEFAULT false,
  -- Battle data
  total_turns integer,
  battle_log jsonb DEFAULT '[]'::jsonb,
  -- Timing
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  -- Boss battle specifics
  quarter_year text,
  is_retry boolean DEFAULT false,
  retry_cost integer,
  CONSTRAINT buddy_battles_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_battles_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT buddy_battles_challenger_buddy_id_fkey FOREIGN KEY (challenger_buddy_id) REFERENCES public.player_buddies(id),
  CONSTRAINT buddy_battles_opponent_buddy_id_fkey FOREIGN KEY (opponent_buddy_id) REFERENCES public.player_buddies(id)
);

-- Boss battle attempts per quarter
CREATE TABLE public.boss_battle_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_buddy_id uuid NOT NULL,
  quarter_year text NOT NULL, -- e.g., '2025-Q1'
  attempt_number integer NOT NULL DEFAULT 1,
  battle_id uuid,
  was_successful boolean,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT boss_battle_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT boss_battle_attempts_player_buddy_id_fkey FOREIGN KEY (player_buddy_id) REFERENCES public.player_buddies(id),
  CONSTRAINT boss_battle_attempts_battle_id_fkey FOREIGN KEY (battle_id) REFERENCES public.buddy_battles(id),
  CONSTRAINT boss_battle_attempts_unique UNIQUE (player_buddy_id, quarter_year, attempt_number)
);

-- =====================================================
-- ITEM & SHOP SYSTEM
-- =====================================================

-- Item definitions
CREATE TABLE public.buddy_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  item_type text NOT NULL CHECK (item_type IN ('consumable', 'equipment', 'cosmetic', 'special')),
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  -- Effects
  effect_type text CHECK (effect_type IN ('heal', 'buff_attack', 'buff_defense', 'buff_speed', 'buff_all', 'restore_anxiety', 'critical_boost')),
  effect_value integer,
  effect_duration_turns integer,
  -- Shop info
  base_price integer NOT NULL DEFAULT 10,
  is_purchasable boolean DEFAULT true,
  is_limited_time boolean DEFAULT false,
  -- Visual
  sprite_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_items_pkey PRIMARY KEY (id)
);

-- Shop inventory (weekly rotation)
CREATE TABLE public.buddy_shop_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  item_id uuid NOT NULL,
  price integer NOT NULL,
  quantity_available integer, -- NULL = unlimited
  week_year text NOT NULL, -- e.g., '2025-W48'
  is_featured boolean DEFAULT false,
  is_limited boolean DEFAULT false,
  available_from timestamp with time zone NOT NULL,
  available_until timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_shop_inventory_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_shop_inventory_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT buddy_shop_inventory_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.buddy_items(id)
);

-- Player inventory
CREATE TABLE public.buddy_player_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_buddy_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  acquired_at timestamp with time zone DEFAULT now(),
  acquired_from text CHECK (acquired_from IN ('shop', 'quest', 'battle', 'boss_loot', 'mystery_box', 'event', 'admin')),
  CONSTRAINT buddy_player_inventory_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_player_inventory_player_buddy_id_fkey FOREIGN KEY (player_buddy_id) REFERENCES public.player_buddies(id) ON DELETE CASCADE,
  CONSTRAINT buddy_player_inventory_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.buddy_items(id),
  CONSTRAINT buddy_player_inventory_unique UNIQUE (player_buddy_id, item_id)
);

-- Mystery box definitions
CREATE TABLE public.buddy_mystery_boxes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  sprite_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_mystery_boxes_pkey PRIMARY KEY (id)
);

-- Mystery box contents (weighted random)
CREATE TABLE public.buddy_mystery_box_contents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mystery_box_id uuid NOT NULL,
  item_id uuid NOT NULL,
  weight integer NOT NULL DEFAULT 100, -- Higher = more common
  quantity_min integer NOT NULL DEFAULT 1,
  quantity_max integer NOT NULL DEFAULT 1,
  CONSTRAINT buddy_mystery_box_contents_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_mystery_box_contents_mystery_box_id_fkey FOREIGN KEY (mystery_box_id) REFERENCES public.buddy_mystery_boxes(id),
  CONSTRAINT buddy_mystery_box_contents_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.buddy_items(id)
);

-- =====================================================
-- QUEST SYSTEM
-- =====================================================

-- Quest definitions
CREATE TABLE public.buddy_quests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  quest_type text NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'special', 'achievement')),
  -- Requirements
  requirement_type text NOT NULL CHECK (requirement_type IN (
    'login_streak',
    'upgrade_buddy',
    'win_battle',
    'do_duel',
    'buy_item',
    'complete_availability',
    'defeat_boss',
    'reach_level'
  )),
  requirement_value integer NOT NULL DEFAULT 1,
  -- Rewards
  reward_points integer NOT NULL DEFAULT 0,
  reward_item_id uuid,
  reward_item_quantity integer DEFAULT 1,
  reward_xp integer NOT NULL DEFAULT 0,
  -- Availability
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_quests_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_quests_reward_item_id_fkey FOREIGN KEY (reward_item_id) REFERENCES public.buddy_items(id)
);

-- Player quest progress
CREATE TABLE public.buddy_quest_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_buddy_id uuid NOT NULL,
  quest_id uuid NOT NULL,
  current_progress integer NOT NULL DEFAULT 0,
  is_completed boolean DEFAULT false,
  is_claimed boolean DEFAULT false,
  period_identifier text, -- e.g., '2025-11-27' for daily, '2025-W48' for weekly
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  claimed_at timestamp with time zone,
  CONSTRAINT buddy_quest_progress_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_quest_progress_player_buddy_id_fkey FOREIGN KEY (player_buddy_id) REFERENCES public.player_buddies(id) ON DELETE CASCADE,
  CONSTRAINT buddy_quest_progress_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.buddy_quests(id)
);

-- =====================================================
-- TRAINER PROFILE & ACHIEVEMENTS
-- =====================================================

-- Trainer profile (extends player buddy)
CREATE TABLE public.buddy_trainer_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_buddy_id uuid NOT NULL UNIQUE,
  trainer_level integer NOT NULL DEFAULT 1,
  trainer_xp integer NOT NULL DEFAULT 0,
  -- Stats
  total_battles integer NOT NULL DEFAULT 0,
  battles_won integer NOT NULL DEFAULT 0,
  battles_lost integer NOT NULL DEFAULT 0,
  bosses_defeated integer NOT NULL DEFAULT 0,
  tutorial_completed boolean DEFAULT false,
  -- Streaks
  current_login_streak integer NOT NULL DEFAULT 0,
  longest_login_streak integer NOT NULL DEFAULT 0,
  last_login_date date,
  -- Avatar customization
  avatar_sprite text DEFAULT 'trainer_default',
  avatar_color text DEFAULT '#4CAF50',
  trainer_title text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_trainer_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_trainer_profiles_player_buddy_id_fkey FOREIGN KEY (player_buddy_id) REFERENCES public.player_buddies(id) ON DELETE CASCADE
);

-- Achievement definitions
CREATE TABLE public.buddy_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon_name text,
  achievement_type text NOT NULL CHECK (achievement_type IN (
    'first_battle',
    'boss_slayer',
    'win_streak',
    'level_milestone',
    'collector',
    'trader',
    'team_player',
    'perfect_attendance',
    'legend'
  )),
  requirement_value integer,
  reward_title text,
  sprite_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_achievements_pkey PRIMARY KEY (id)
);

-- Player achievements
CREATE TABLE public.buddy_player_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_buddy_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  earned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_player_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_player_achievements_player_buddy_id_fkey FOREIGN KEY (player_buddy_id) REFERENCES public.player_buddies(id) ON DELETE CASCADE,
  CONSTRAINT buddy_player_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.buddy_achievements(id),
  CONSTRAINT buddy_player_achievements_unique UNIQUE (player_buddy_id, achievement_id)
);

-- =====================================================
-- TEAM FEATURES
-- =====================================================

-- Team buffs (earned through collective performance)
CREATE TABLE public.buddy_team_buffs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  buff_type text NOT NULL CHECK (buff_type IN ('xp_boost', 'point_boost', 'shop_discount', 'crit_boost')),
  buff_value decimal(5,2) NOT NULL,
  reason text,
  active_from timestamp with time zone NOT NULL,
  active_until timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_team_buffs_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_team_buffs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- Team events
CREATE TABLE public.buddy_team_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('boss_defeated', 'team_milestone', 'weekly_champion', 'special_event')),
  title text NOT NULL,
  description text,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_team_events_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_team_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- =====================================================
-- ADMIN & ANALYTICS
-- =====================================================

-- Activity log for security/audit
CREATE TABLE public.buddy_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_buddy_id uuid,
  team_id uuid,
  action_type text NOT NULL CHECK (action_type IN (
    'buddy_created',
    'stat_upgrade',
    'battle_started',
    'battle_ended',
    'item_purchased',
    'item_used',
    'quest_completed',
    'achievement_earned',
    'points_earned',
    'points_spent',
    'login',
    'admin_action'
  )),
  action_data jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_activity_log_player_buddy_id_fkey FOREIGN KEY (player_buddy_id) REFERENCES public.player_buddies(id) ON DELETE SET NULL,
  CONSTRAINT buddy_activity_log_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL
);

-- Daily analytics snapshot
CREATE TABLE public.buddy_daily_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  date date NOT NULL,
  -- Player metrics
  active_players integer NOT NULL DEFAULT 0,
  new_buddies_created integer NOT NULL DEFAULT 0,
  -- Battle metrics
  battles_fought integer NOT NULL DEFAULT 0,
  boss_attempts integer NOT NULL DEFAULT 0,
  boss_victories integer NOT NULL DEFAULT 0,
  -- Economy metrics
  points_earned integer NOT NULL DEFAULT 0,
  points_spent integer NOT NULL DEFAULT 0,
  items_purchased integer NOT NULL DEFAULT 0,
  -- Upgrade metrics
  total_upgrades integer NOT NULL DEFAULT 0,
  -- Engagement
  quests_completed integer NOT NULL DEFAULT 0,
  achievements_earned integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_daily_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_daily_analytics_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT buddy_daily_analytics_unique UNIQUE (team_id, date)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_player_buddies_member_team ON public.player_buddies(member_id, team_id);
CREATE INDEX idx_player_buddies_team_level ON public.player_buddies(team_id, level DESC);
CREATE INDEX idx_buddy_battles_team_type ON public.buddy_battles(team_id, battle_type);
CREATE INDEX idx_buddy_battles_quarter ON public.buddy_battles(quarter_year) WHERE battle_type = 'boss';
CREATE INDEX idx_buddy_point_transactions_buddy_date ON public.buddy_point_transactions(player_buddy_id, created_at);
CREATE INDEX idx_buddy_quest_progress_buddy ON public.buddy_quest_progress(player_buddy_id, is_completed);
CREATE INDEX idx_buddy_activity_log_team_date ON public.buddy_activity_log(team_id, created_at);
CREATE INDEX idx_buddy_shop_inventory_availability ON public.buddy_shop_inventory(team_id, available_from, available_until);

-- =====================================================
-- INITIAL DATA: Buddy Types
-- =====================================================

INSERT INTO public.buddy_types (name, description, element, base_hp, base_attack, base_defense, base_speed, base_special_attack, base_special_defense) VALUES
('Blazor', 'A fiery companion with a burning spirit. Excels in attack power.', 'fire', 90, 15, 8, 12, 14, 7),
('Aquabit', 'A calm water creature with great defensive capabilities.', 'water', 110, 9, 14, 8, 11, 13),
('Terrapix', 'A sturdy earth buddy built like a rock. Maximum defense.', 'earth', 130, 8, 16, 6, 8, 14),
('Zephyron', 'A swift air spirit that strikes first. Speed is key.', 'air', 85, 11, 7, 18, 12, 8),
('Voltling', 'An electric dynamo with balanced stats and high crit chance.', 'electric', 95, 12, 10, 14, 13, 10);

-- =====================================================
-- INITIAL DATA: Base Abilities
-- =====================================================

INSERT INTO public.buddy_abilities (name, description, element, damage_base, accuracy, cooldown_turns, is_special, effect_type, unlock_level) VALUES
-- Basic attacks (all types)
('Tackle', 'A basic physical attack', 'neutral', 10, 100, 0, false, 'damage', 1),
('Quick Strike', 'A fast attack that always goes first', 'neutral', 8, 95, 0, false, 'damage', 1),
-- Fire abilities
('Ember', 'A small flame attack', 'fire', 15, 100, 0, true, 'damage', 1),
('Fire Punch', 'A fiery physical attack', 'fire', 20, 90, 1, false, 'damage', 5),
('Inferno Blast', 'A powerful fire special attack', 'fire', 35, 80, 3, true, 'damage', 15),
-- Water abilities
('Water Gun', 'A stream of water', 'water', 15, 100, 0, true, 'damage', 1),
('Aqua Barrier', 'Raises defense for 3 turns', 'water', 0, 100, 2, true, 'buff', 5),
('Tidal Wave', 'A massive water attack', 'water', 35, 85, 3, true, 'damage', 15),
-- Earth abilities
('Rock Throw', 'Throws a rock at the opponent', 'earth', 15, 95, 0, false, 'damage', 1),
('Fortify', 'Greatly increases defense', 'earth', 0, 100, 2, true, 'buff', 5),
('Earthquake', 'A devastating ground attack', 'earth', 40, 75, 4, false, 'damage', 20),
-- Air abilities
('Gust', 'A quick wind attack', 'air', 12, 100, 0, true, 'damage', 1),
('Tailwind', 'Increases speed for 3 turns', 'air', 0, 100, 2, true, 'buff', 5),
('Hurricane', 'A powerful wind storm', 'air', 35, 80, 3, true, 'damage', 15),
-- Electric abilities
('Spark', 'A small electric shock', 'electric', 15, 100, 0, true, 'damage', 1),
('Thunder Punch', 'An electrified punch', 'electric', 22, 90, 1, false, 'damage', 5),
('Lightning Storm', 'Calls down lightning', 'electric', 38, 75, 3, true, 'damage', 15),
-- Utility abilities
('Heal', 'Restores some HP', 'neutral', 0, 100, 2, true, 'heal', 10),
('Focus Energy', 'Increases critical hit chance', 'neutral', 0, 100, 3, true, 'buff', 8);

-- =====================================================
-- INITIAL DATA: Base Items
-- =====================================================

INSERT INTO public.buddy_items (name, description, item_type, rarity, effect_type, effect_value, effect_duration_turns, base_price) VALUES
-- Consumables
('Health Potion', 'Restores 30 HP during battle', 'consumable', 'common', 'heal', 30, null, 5),
('Super Health Potion', 'Restores 60 HP during battle', 'consumable', 'uncommon', 'heal', 60, null, 12),
('Max Health Potion', 'Fully restores HP during battle', 'consumable', 'rare', 'heal', 999, null, 25),
('Attack Boost', 'Increases attack by 20% for 3 turns', 'consumable', 'common', 'buff_attack', 20, 3, 8),
('Defense Boost', 'Increases defense by 20% for 3 turns', 'consumable', 'common', 'buff_defense', 20, 3, 8),
('Speed Boost', 'Increases speed by 30% for 3 turns', 'consumable', 'uncommon', 'buff_speed', 30, 3, 10),
('Power Pill', 'Increases all stats by 10% for 3 turns', 'consumable', 'rare', 'buff_all', 10, 3, 20),
('Critical Cookie', 'Doubles critical chance for 2 turns', 'consumable', 'uncommon', 'critical_boost', 100, 2, 15),
('Calm Tea', 'Reduces anxiety by 10 points', 'consumable', 'common', 'restore_anxiety', 10, null, 10),
-- Special items
('Boss Key', 'Grants a retry attempt against a boss', 'special', 'epic', null, null, null, 50),
('Mystery Box Standard', 'Contains random common/uncommon items', 'special', 'uncommon', null, null, null, 15),
('Mystery Box Premium', 'Contains random rare+ items', 'special', 'rare', null, null, null, 35);

-- =====================================================
-- INITIAL DATA: Quests
-- =====================================================

INSERT INTO public.buddy_quests (name, description, quest_type, requirement_type, requirement_value, reward_points, reward_xp) VALUES
-- Daily quests
('Daily Check-in', 'Log in to the buddy system', 'daily', 'login_streak', 1, 1, 5),
('Battle Ready', 'Complete 1 battle today', 'daily', 'win_battle', 1, 2, 10),
('Upgrade Time', 'Upgrade your buddy once', 'daily', 'upgrade_buddy', 1, 2, 10),
-- Weekly quests
('Dedication', 'Log in 3 days in a row', 'weekly', 'login_streak', 3, 5, 25),
('Weekly Upgrade', 'Upgrade your buddy once this week', 'weekly', 'upgrade_buddy', 1, 3, 15),
('Friendly Rivalry', 'Do 1 duel with a teammate', 'weekly', 'do_duel', 1, 5, 30),
('Battle Champion', 'Win 5 battles this week', 'weekly', 'win_battle', 5, 10, 50),
('Shopping Spree', 'Buy 3 items this week', 'weekly', 'buy_item', 3, 5, 25);

-- =====================================================
-- INITIAL DATA: Achievements
-- =====================================================

INSERT INTO public.buddy_achievements (name, description, achievement_type, requirement_value, reward_title) VALUES
('First Steps', 'Complete your first battle', 'first_battle', 1, 'Rookie'),
('Battle Tested', 'Win 10 battles', 'first_battle', 10, 'Fighter'),
('Veteran', 'Win 50 battles', 'first_battle', 50, 'Veteran'),
('Legend', 'Win 100 battles', 'legend', 100, 'Legend'),
('Boss Slayer', 'Defeat Marie-Françoise for the first time', 'boss_slayer', 1, 'Boss Slayer'),
('Boss Hunter', 'Defeat Marie-Françoise 4 times', 'boss_slayer', 4, 'Boss Hunter'),
('Rising Star', 'Reach level 10', 'level_milestone', 10, 'Rising Star'),
('Elite', 'Reach level 50', 'level_milestone', 50, 'Elite'),
('Master', 'Reach level 100', 'level_milestone', 100, 'Master'),
('Collector', 'Own 20 different items', 'collector', 20, 'Collector'),
('Team Player', 'Participate in 10 team battles', 'team_player', 10, 'Team Player'),
('Perfect Week', 'Complete all weekly quests', 'perfect_attendance', 1, 'Perfectionist'),
('Streak Master', 'Maintain a 30-day login streak', 'win_streak', 30, 'Streak Master');

-- =====================================================
-- INITIAL DATA: Mystery Boxes
-- =====================================================

INSERT INTO public.buddy_mystery_boxes (name, description, price) VALUES
('Standard Box', 'Contains 1-3 common or uncommon items', 15),
('Premium Box', 'Contains 1-2 rare or better items', 35),
('Legendary Box', 'Guaranteed legendary item!', 100);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate points from availability
CREATE OR REPLACE FUNCTION calculate_buddy_points_for_date(
  p_member_id uuid,
  p_date date
) RETURNS integer AS $$
DECLARE
  v_availability_count integer;
  v_is_holiday boolean;
  v_points integer := 0;
BEGIN
  -- Check if member has availability for this date
  SELECT COUNT(*) INTO v_availability_count
  FROM public.availability
  WHERE member_id = p_member_id
    AND date = p_date
    AND status IN ('available', 'remote', 'holiday');

  IF v_availability_count > 0 THEN
    v_points := 1;
    
    -- Check if it's a holiday (bonus point)
    SELECT EXISTS(
      SELECT 1 FROM public.holidays h
      JOIN public.members m ON m.country_code = h.country_code
      WHERE m.id = p_member_id
        AND h.date = p_date
        AND h.is_official = true
    ) INTO v_is_holiday;
    
    IF v_is_holiday THEN
      v_points := 2;
    END IF;
  END IF;
  
  RETURN v_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate XP needed for next level
CREATE OR REPLACE FUNCTION get_xp_for_level(p_level integer) RETURNS integer AS $$
BEGIN
  -- Using a balanced curve: ~365 days to reach level 100
  -- Formula: level * 10 + (level-1) * 5
  RETURN p_level * 10 + GREATEST(0, p_level - 1) * 5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get stat cap based on level
CREATE OR REPLACE FUNCTION get_stat_cap(p_level integer, p_stat_type text) RETURNS integer AS $$
BEGIN
  CASE p_stat_type
    WHEN 'hp' THEN RETURN 100 + (p_level * 5); -- Max 600 at level 100
    WHEN 'critical_chance' THEN RETURN LEAST(50, 5 + (p_level / 2)); -- Max 50%
    ELSE RETURN 10 + (p_level * 2); -- Max 210 at level 100 for other stats
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Enable RLS
ALTER TABLE public.buddy_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_buddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_stat_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boss_battle_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_shop_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_trainer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_team_buffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_team_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_daily_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic - expand as needed)
CREATE POLICY "Buddy types are viewable by everyone" ON public.buddy_types FOR SELECT USING (true);
CREATE POLICY "Items are viewable by everyone" ON public.buddy_items FOR SELECT USING (true);
CREATE POLICY "Quests are viewable by everyone" ON public.buddy_quests FOR SELECT USING (true);
CREATE POLICY "Achievements are viewable by everyone" ON public.buddy_achievements FOR SELECT USING (true);

-- Users can view their own buddy
CREATE POLICY "Users can view their own buddy" ON public.player_buddies FOR SELECT
USING (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
);

-- Users can view team buddies
CREATE POLICY "Users can view team buddies" ON public.player_buddies FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.members WHERE auth_user_id = auth.uid()
  )
);

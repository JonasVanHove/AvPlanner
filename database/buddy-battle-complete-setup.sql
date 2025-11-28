-- =====================================================
-- BUDDY BATTLE - COMPLETE SETUP SCRIPT
-- Run this ONE script to set up everything for the game
-- =====================================================

-- =====================================================
-- PART 1: SEED BUDDY TYPES (with fixed UUIDs)
-- =====================================================

-- First, delete existing buddy types and re-insert with correct UUIDs
DELETE FROM public.buddy_type_abilities WHERE buddy_type_id IN (
  SELECT id FROM public.buddy_types WHERE name IN ('Blazor', 'Aquabit', 'Terrapix', 'Zephyron', 'Voltling')
);
DELETE FROM public.buddy_types WHERE name IN ('Blazor', 'Aquabit', 'Terrapix', 'Zephyron', 'Voltling');

-- Seed the 5 buddy types with fixed UUIDs
INSERT INTO public.buddy_types (id, name, description, element, base_hp, base_attack, base_defense, base_speed, base_special_attack, base_special_defense)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Blazor', 'A fiery companion with explosive attack power. Strong against Air, weak against Water.', 'fire', 85, 95, 70, 85, 90, 65),
  ('22222222-2222-2222-2222-222222222222', 'Aquabit', 'A fluid defender with excellent survivability. Strong against Fire, weak against Electric.', 'water', 100, 75, 90, 70, 80, 95),
  ('33333333-3333-3333-3333-333333333333', 'Terrapix', 'A sturdy tank with unbreakable defenses. Strong against Electric, weak against Air.', 'earth', 120, 80, 100, 50, 60, 90),
  ('44444444-4444-4444-4444-444444444444', 'Zephyron', 'A swift attacker that strikes before others can react. Strong against Earth, weak against Fire.', 'air', 70, 85, 60, 110, 85, 55),
  ('55555555-5555-5555-5555-555555555555', 'Voltling', 'A balanced fighter with shocking critical hits. Strong against Water, weak against Earth.', 'electric', 80, 90, 75, 95, 95, 70)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  element = EXCLUDED.element,
  base_hp = EXCLUDED.base_hp,
  base_attack = EXCLUDED.base_attack,
  base_defense = EXCLUDED.base_defense,
  base_speed = EXCLUDED.base_speed,
  base_special_attack = EXCLUDED.base_special_attack,
  base_special_defense = EXCLUDED.base_special_defense;

-- =====================================================
-- PART 2: SEED ABILITIES
-- =====================================================

INSERT INTO public.buddy_abilities (id, name, description, element, damage_base, accuracy, cooldown_turns, is_special, effect_type, unlock_level)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Ember', 'A basic fire attack', 'fire', 15, 100, 0, false, 'damage', 1),
  ('a2222222-2222-2222-2222-222222222222', 'Flame Burst', 'A powerful fire blast', 'fire', 30, 90, 1, true, 'damage', 5),
  ('a3333333-3333-3333-3333-333333333333', 'Water Splash', 'A basic water attack', 'water', 15, 100, 0, false, 'damage', 1),
  ('a4444444-4444-4444-4444-444444444444', 'Tidal Wave', 'A massive water attack', 'water', 35, 85, 2, true, 'damage', 10),
  ('a5555555-5555-5555-5555-555555555555', 'Rock Throw', 'A basic earth attack', 'earth', 18, 95, 0, false, 'damage', 1),
  ('a6666666-6666-6666-6666-666666666666', 'Earthquake', 'A devastating ground attack', 'earth', 40, 80, 3, true, 'damage', 15),
  ('a7777777-7777-7777-7777-777777777777', 'Gust', 'A basic air attack', 'air', 12, 100, 0, false, 'damage', 1),
  ('a8888888-8888-8888-8888-888888888888', 'Tornado', 'A powerful wind attack', 'air', 28, 90, 1, true, 'damage', 8),
  ('a9999999-9999-9999-9999-999999999999', 'Spark', 'A basic electric attack', 'electric', 14, 100, 0, false, 'damage', 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Thunder Strike', 'A shocking attack', 'electric', 32, 88, 2, true, 'damage', 12),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tackle', 'A basic physical attack', 'neutral', 10, 100, 0, false, 'damage', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rest', 'Recover HP', 'neutral', 0, 100, 3, false, 'heal', 1)
ON CONFLICT (id) DO NOTHING;

-- Link abilities to buddy types
INSERT INTO public.buddy_type_abilities (buddy_type_id, ability_id, unlock_level)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 1),
  ('11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 5),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1),
  ('22222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', 1),
  ('22222222-2222-2222-2222-222222222222', 'a4444444-4444-4444-4444-444444444444', 10),
  ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1),
  ('33333333-3333-3333-3333-333333333333', 'a5555555-5555-5555-5555-555555555555', 1),
  ('33333333-3333-3333-3333-333333333333', 'a6666666-6666-6666-6666-666666666666', 15),
  ('33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1),
  ('44444444-4444-4444-4444-444444444444', 'a7777777-7777-7777-7777-777777777777', 1),
  ('44444444-4444-4444-4444-444444444444', 'a8888888-8888-8888-8888-888888888888', 8),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1),
  ('55555555-5555-5555-5555-555555555555', 'a9999999-9999-9999-9999-999999999999', 1),
  ('55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 12),
  ('55555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1)
ON CONFLICT (buddy_type_id, ability_id) DO NOTHING;

-- =====================================================
-- PART 3: RLS POLICIES FOR PLAYER_BUDDIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own buddy" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can update their own buddy" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can delete their own buddy" ON public.player_buddies;

-- INSERT policy
CREATE POLICY "Users can create their own buddy" ON public.player_buddies FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
);

-- UPDATE policy
CREATE POLICY "Users can update their own buddy" ON public.player_buddies FOR UPDATE
USING (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
);

-- DELETE policy
CREATE POLICY "Users can delete their own buddy" ON public.player_buddies FOR DELETE
USING (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
);

-- =====================================================
-- PART 4: RLS POLICIES FOR TRAINER PROFILES
-- =====================================================

DROP POLICY IF EXISTS "Users can create their trainer profile" ON public.buddy_trainer_profiles;
DROP POLICY IF EXISTS "Users can view their trainer profile" ON public.buddy_trainer_profiles;
DROP POLICY IF EXISTS "Users can update their trainer profile" ON public.buddy_trainer_profiles;

CREATE POLICY "Users can create their trainer profile" ON public.buddy_trainer_profiles FOR INSERT
WITH CHECK (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their trainer profile" ON public.buddy_trainer_profiles FOR SELECT
USING (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their trainer profile" ON public.buddy_trainer_profiles FOR UPDATE
USING (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- =====================================================
-- PART 5: RLS POLICIES FOR ACTIVITY LOG
-- =====================================================

DROP POLICY IF EXISTS "Users can create activity log entries" ON public.buddy_activity_log;
DROP POLICY IF EXISTS "Users can view team activity" ON public.buddy_activity_log;

CREATE POLICY "Users can create activity log entries" ON public.buddy_activity_log FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view team activity" ON public.buddy_activity_log FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.members WHERE auth_user_id = auth.uid()
  )
);

-- =====================================================
-- PART 6: RLS POLICIES FOR POINT TRANSACTIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their point transactions" ON public.buddy_point_transactions;
DROP POLICY IF EXISTS "Users can create point transactions" ON public.buddy_point_transactions;

CREATE POLICY "Users can view their point transactions" ON public.buddy_point_transactions FOR SELECT
USING (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can create point transactions" ON public.buddy_point_transactions FOR INSERT
WITH CHECK (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- =====================================================
-- PART 7: RLS POLICIES FOR STAT UPGRADES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their stat upgrades" ON public.buddy_stat_upgrades;
DROP POLICY IF EXISTS "Users can create stat upgrades" ON public.buddy_stat_upgrades;

CREATE POLICY "Users can view their stat upgrades" ON public.buddy_stat_upgrades FOR SELECT
USING (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can create stat upgrades" ON public.buddy_stat_upgrades FOR INSERT
WITH CHECK (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- =====================================================
-- DONE! Buddy Battle is ready to play!
-- =====================================================

-- =====================================================
-- BUDDY BATTLE - RLS Policies for Battle Tables
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable RLS on all buddy battle tables (if not already)
ALTER TABLE buddy_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boss_battle_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_trainer_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view battles in their team" ON buddy_battles;
DROP POLICY IF EXISTS "Users can create battles for their buddy" ON buddy_battles;
DROP POLICY IF EXISTS "Users can update their own battles" ON buddy_battles;

DROP POLICY IF EXISTS "Users can view their boss attempts" ON boss_battle_attempts;
DROP POLICY IF EXISTS "Users can create boss attempts" ON boss_battle_attempts;

DROP POLICY IF EXISTS "Users can view their trainer profile" ON buddy_trainer_profiles;
DROP POLICY IF EXISTS "Users can update their trainer profile" ON buddy_trainer_profiles;
DROP POLICY IF EXISTS "Users can create their trainer profile" ON buddy_trainer_profiles;

-- =====================================================
-- buddy_battles policies
-- =====================================================

-- SELECT: Users can view battles in teams they belong to
CREATE POLICY "Users can view battles in their team"
ON buddy_battles FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM members WHERE auth_user_id = auth.uid()
  )
);

-- INSERT: Users can create battles for buddies they own
CREATE POLICY "Users can create battles for their buddy"
ON buddy_battles FOR INSERT
WITH CHECK (
  challenger_buddy_id IN (
    SELECT pb.id FROM player_buddies pb
    JOIN members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- UPDATE: Users can update battles they're involved in
CREATE POLICY "Users can update their own battles"
ON buddy_battles FOR UPDATE
USING (
  challenger_buddy_id IN (
    SELECT pb.id FROM player_buddies pb
    JOIN members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- =====================================================
-- boss_battle_attempts policies
-- =====================================================

-- SELECT: Users can view their own boss attempts
CREATE POLICY "Users can view their boss attempts"
ON boss_battle_attempts FOR SELECT
USING (
  player_buddy_id IN (
    SELECT pb.id FROM player_buddies pb
    JOIN members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- INSERT: Users can create boss attempts for their buddies
CREATE POLICY "Users can create boss attempts"
ON boss_battle_attempts FOR INSERT
WITH CHECK (
  player_buddy_id IN (
    SELECT pb.id FROM player_buddies pb
    JOIN members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- =====================================================
-- buddy_trainer_profiles policies
-- =====================================================

-- SELECT: Users can view their own trainer profiles
CREATE POLICY "Users can view their trainer profile"
ON buddy_trainer_profiles FOR SELECT
USING (
  player_buddy_id IN (
    SELECT pb.id FROM player_buddies pb
    JOIN members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- INSERT: Users can create trainer profiles for their buddies
CREATE POLICY "Users can create their trainer profile"
ON buddy_trainer_profiles FOR INSERT
WITH CHECK (
  player_buddy_id IN (
    SELECT pb.id FROM player_buddies pb
    JOIN members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- UPDATE: Users can update their own trainer profiles
CREATE POLICY "Users can update their trainer profile"
ON buddy_trainer_profiles FOR UPDATE
USING (
  player_buddy_id IN (
    SELECT pb.id FROM player_buddies pb
    JOIN members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- =====================================================
-- Verify policies were created
-- =====================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('buddy_battles', 'boss_battle_attempts', 'buddy_trainer_profiles')
ORDER BY tablename, policyname;

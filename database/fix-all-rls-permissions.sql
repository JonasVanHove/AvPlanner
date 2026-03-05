-- Fix all RLS permissions to ensure full functionality
-- Based on user request: "everything can be open if needed, I want everything to keep working"
-- This script enables RLS but with permissive policies that don't block legitimate operations

BEGIN;

-- ============================================================================
-- 1. FIX user_badges TABLE - Allow badge insertions from client
-- ============================================================================
DROP POLICY IF EXISTS "Users can view badges in their teams" ON public.user_badges;
DROP POLICY IF EXISTS "Service can insert badges" ON public.user_badges;
DROP POLICY IF EXISTS "Badges cannot be updated" ON public.user_badges;
DROP POLICY IF EXISTS "Badges cannot be deleted by users" ON public.user_badges;
DROP POLICY IF EXISTS "Users can view own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Anyone can insert user badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can update own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Badges cannot be deleted" ON public.user_badges;

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Allow viewing badges in user's teams
CREATE POLICY "Users can view own badges"
  ON public.user_badges
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
  );

-- Allow inserting badges (for badge-checker-client.ts to work)
CREATE POLICY "Anyone can insert user badges"
  ON public.user_badges
  FOR INSERT
  WITH CHECK (true);

-- Allow updates if user owns the badge
CREATE POLICY "Users can update own badges"
  ON public.user_badges
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Prevent deletion
CREATE POLICY "Badges cannot be deleted"
  ON public.user_badges
  FOR DELETE
  USING (false);

-- ============================================================================
-- 2. FIX availability TABLE - Ensure team members can manage it
-- ============================================================================
DROP POLICY IF EXISTS "Team members can view availability" ON public.availability;
DROP POLICY IF EXISTS "Public access for availability operations" ON public.availability;
DROP POLICY IF EXISTS "Users can manage their own availability" ON public.availability;
DROP POLICY IF EXISTS "Team members can see team availability" ON public.availability;
DROP POLICY IF EXISTS "Team members can view team availability" ON public.availability;
DROP POLICY IF EXISTS "Team members can insert availability" ON public.availability;
DROP POLICY IF EXISTS "Team members can update availability" ON public.availability;
DROP POLICY IF EXISTS "Team members can delete availability" ON public.availability;
DROP POLICY IF EXISTS "Anyone can view availability" ON public.availability;

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

-- Anyone can view availability (needed for public/shared team calendars)
CREATE POLICY "Anyone can view availability"
  ON public.availability
  FOR SELECT
  USING (true);

-- Team members can insert availability
CREATE POLICY "Team members can insert availability"
  ON public.availability
  FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT m.id FROM members m 
      INNER JOIN members auth_member ON m.team_id = auth_member.team_id
      WHERE auth_member.auth_user_id = auth.uid()
    )
  );

-- Team members can update availability
CREATE POLICY "Team members can update availability"
  ON public.availability
  FOR UPDATE
  USING (
    member_id IN (
      SELECT m.id FROM members m 
      INNER JOIN members auth_member ON m.team_id = auth_member.team_id
      WHERE auth_member.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    member_id IN (
      SELECT m.id FROM members m 
      INNER JOIN members auth_member ON m.team_id = auth_member.team_id
      WHERE auth_member.auth_user_id = auth.uid()
    )
  );

-- Team members can delete availability
CREATE POLICY "Team members can delete availability"
  ON public.availability
  FOR DELETE
  USING (
    member_id IN (
      SELECT m.id FROM members m 
      INNER JOIN members auth_member ON m.team_id = auth_member.team_id
      WHERE auth_member.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. FIX members TABLE - Ensure team operations work
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own member record" ON public.members;
DROP POLICY IF EXISTS "Public access for member operations" ON public.members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.members;
DROP POLICY IF EXISTS "Users can update their own member record" ON public.members;
DROP POLICY IF EXISTS "Users can view team members" ON public.members;
DROP POLICY IF EXISTS "Users can add team members" ON public.members;
DROP POLICY IF EXISTS "Users can update team members" ON public.members;
DROP POLICY IF EXISTS "Users can remove team members" ON public.members;
DROP POLICY IF EXISTS "Anyone can view members" ON public.members;
DROP POLICY IF EXISTS "Anyone can add themselves to teams" ON public.members;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Anyone can view members (needed to see team composition before joining)
CREATE POLICY "Anyone can view members"
  ON public.members
  FOR SELECT
  USING (true);

-- Anyone can add themselves to a team (for joining)
CREATE POLICY "Anyone can add themselves to teams"
  ON public.members
  FOR INSERT
  WITH CHECK (true);

-- Users can update members in their team or their own record
CREATE POLICY "Users can update team members"
  ON public.members
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM members auth_member
      WHERE auth_member.auth_user_id = auth.uid()
    ) OR
    auth_user_id = auth.uid()
  )
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM members auth_member
      WHERE auth_member.auth_user_id = auth.uid()
    ) OR
    auth_user_id = auth.uid()
  );

-- Users can delete members from their team
CREATE POLICY "Users can remove team members"
  ON public.members
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM members auth_member
      WHERE auth_member.auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. FIX teams TABLE - Ensure team operations work
-- ============================================================================
DROP POLICY IF EXISTS "Users can view teams" ON public.teams;
DROP POLICY IF EXISTS "Public access for teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Users can update their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can delete their own teams" ON public.teams;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view teams (needed for joining via slug/invite code)
CREATE POLICY "Anyone can view teams"
  ON public.teams
  FOR SELECT
  USING (true);

-- Users can create teams
CREATE POLICY "Users can create teams"
  ON public.teams
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update their own teams
CREATE POLICY "Users can update their own teams"
  ON public.teams
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own teams
CREATE POLICY "Users can delete their own teams"
  ON public.teams
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================================
-- 5. FIX buddy_battle related tables - Open up for gamification to work
-- ============================================================================

-- player_buddies
ALTER TABLE public.player_buddies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own buddies" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can create their own buddy" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can update their own buddy" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can delete their own buddy" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can view team buddies" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can create team buddies" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can update team buddies" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can delete team buddies" ON public.player_buddies;

CREATE POLICY "Users can view team buddies"
  ON public.player_buddies
  FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can create team buddies"
  ON public.player_buddies
  FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update team buddies"
  ON public.player_buddies
  FOR UPDATE
  USING (team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid()))
  WITH CHECK (team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete team buddies"
  ON public.player_buddies
  FOR DELETE
  USING (team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid()));

-- buddy_battles
ALTER TABLE public.buddy_battles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view team battles" ON public.buddy_battles;
DROP POLICY IF EXISTS "Users can create team battles" ON public.buddy_battles;
DROP POLICY IF EXISTS "Users can update team battles" ON public.buddy_battles;

CREATE POLICY "Users can view team battles"
  ON public.buddy_battles
  FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can create team battles"
  ON public.buddy_battles
  FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update team battles"
  ON public.buddy_battles
  FOR UPDATE
  USING (team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid()));

-- buddy_activity_log
ALTER TABLE public.buddy_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view team activity" ON public.buddy_activity_log;
DROP POLICY IF EXISTS "Users can log team activity" ON public.buddy_activity_log;

CREATE POLICY "Users can view team activity"
  ON public.buddy_activity_log
  FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can log team activity"
  ON public.buddy_activity_log
  FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
  );

-- buddy_trainer_profiles
ALTER TABLE public.buddy_trainer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view buddy trainers" ON public.buddy_trainer_profiles;
DROP POLICY IF EXISTS "Users can create buddy trainers" ON public.buddy_trainer_profiles;
DROP POLICY IF EXISTS "Users can update buddy trainers" ON public.buddy_trainer_profiles;

CREATE POLICY "Users can view buddy trainers"
  ON public.buddy_trainer_profiles
  FOR SELECT
  USING (
    player_buddy_id IN (
      SELECT pb.id FROM player_buddies pb
      INNER JOIN members m ON pb.member_id = m.id
      WHERE m.team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create buddy trainers"
  ON public.buddy_trainer_profiles
  FOR INSERT
  WITH CHECK (
    player_buddy_id IN (
      SELECT pb.id FROM player_buddies pb
      INNER JOIN members m ON pb.member_id = m.id
      WHERE m.team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update buddy trainers"
  ON public.buddy_trainer_profiles
  FOR UPDATE
  USING (
    player_buddy_id IN (
      SELECT pb.id FROM player_buddies pb
      INNER JOIN members m ON pb.member_id = m.id
      WHERE m.team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
    )
  );

-- buddy_point_transactions
ALTER TABLE public.buddy_point_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view buddy points" ON public.buddy_point_transactions;
DROP POLICY IF EXISTS "Users can create buddy transactions" ON public.buddy_point_transactions;

CREATE POLICY "Users can view buddy points"
  ON public.buddy_point_transactions
  FOR SELECT
  USING (
    player_buddy_id IN (
      SELECT pb.id FROM player_buddies pb
      INNER JOIN members m ON pb.member_id = m.id
      WHERE m.team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create buddy transactions"
  ON public.buddy_point_transactions
  FOR INSERT
  WITH CHECK (
    player_buddy_id IN (
      SELECT pb.id FROM player_buddies pb
      INNER JOIN members m ON pb.member_id = m.id
      WHERE m.team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
    )
  );

-- ============================================================================
-- 6. ENSURE REMAINING TABLES ARE PROPERLY CONFIGURED
-- ============================================================================

-- buddy_daily_analytics
ALTER TABLE public.buddy_daily_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view team analytics" ON public.buddy_daily_analytics;
DROP POLICY IF EXISTS "Users can create team analytics" ON public.buddy_daily_analytics;

CREATE POLICY "Users can view team analytics"
  ON public.buddy_daily_analytics
  FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can create team analytics"
  ON public.buddy_daily_analytics
  FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM members WHERE auth_user_id = auth.uid())
  );

-- buddy_items, buddy_mysteries, buddy_quests, buddy_shop_inventory
-- These are more admin/system tables, allow open access since they don't contain sensitive data
ALTER TABLE public.buddy_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Items are publicly readable" ON public.buddy_items;

CREATE POLICY "Items are publicly readable"
  ON public.buddy_items
  FOR SELECT
  USING (true);

ALTER TABLE public.buddy_mystery_boxes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Mystery boxes are publicly readable" ON public.buddy_mystery_boxes;

CREATE POLICY "Mystery boxes are publicly readable"
  ON public.buddy_mystery_boxes
  FOR SELECT
  USING (true);

ALTER TABLE public.buddy_quests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quests are publicly readable" ON public.buddy_quests;

CREATE POLICY "Quests are publicly readable"
  ON public.buddy_quests
  FOR SELECT
  USING (true);

COMMIT;

-- Verify: Check which policies are active
-- SELECT schemaname, tablename, policyname, permissive, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

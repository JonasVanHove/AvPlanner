-- =====================================================
-- BUDDY BATTLE - RLS Policy Fix
-- Run this to add missing INSERT/UPDATE/DELETE policies
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can create their own buddy" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can update their own buddy" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can delete their own buddy" ON public.player_buddies;

-- Allow users to CREATE a buddy for themselves
CREATE POLICY "Users can create their own buddy" ON public.player_buddies FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
);

-- Allow users to UPDATE their own buddy
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

-- Allow users to DELETE their own buddy (if needed)
CREATE POLICY "Users can delete their own buddy" ON public.player_buddies FOR DELETE
USING (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
);

-- Also add INSERT policies for related tables

-- Trainer profiles
DROP POLICY IF EXISTS "Users can create their trainer profile" ON public.buddy_trainer_profiles;
CREATE POLICY "Users can create their trainer profile" ON public.buddy_trainer_profiles FOR INSERT
WITH CHECK (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their trainer profile" ON public.buddy_trainer_profiles;
CREATE POLICY "Users can view their trainer profile" ON public.buddy_trainer_profiles FOR SELECT
USING (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their trainer profile" ON public.buddy_trainer_profiles;
CREATE POLICY "Users can update their trainer profile" ON public.buddy_trainer_profiles FOR UPDATE
USING (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- Activity log
DROP POLICY IF EXISTS "Users can create activity log entries" ON public.buddy_activity_log;
CREATE POLICY "Users can create activity log entries" ON public.buddy_activity_log FOR INSERT
WITH CHECK (true);  -- Allow all inserts (activity logging)

DROP POLICY IF EXISTS "Users can view team activity" ON public.buddy_activity_log;
CREATE POLICY "Users can view team activity" ON public.buddy_activity_log FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.members WHERE auth_user_id = auth.uid()
  )
);

-- Point transactions
DROP POLICY IF EXISTS "Users can view their point transactions" ON public.buddy_point_transactions;
CREATE POLICY "Users can view their point transactions" ON public.buddy_point_transactions FOR SELECT
USING (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create point transactions" ON public.buddy_point_transactions;
CREATE POLICY "Users can create point transactions" ON public.buddy_point_transactions FOR INSERT
WITH CHECK (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- Stat upgrades
DROP POLICY IF EXISTS "Users can view their stat upgrades" ON public.buddy_stat_upgrades;
CREATE POLICY "Users can view their stat upgrades" ON public.buddy_stat_upgrades FOR SELECT
USING (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create stat upgrades" ON public.buddy_stat_upgrades;
CREATE POLICY "Users can create stat upgrades" ON public.buddy_stat_upgrades FOR INSERT
WITH CHECK (
  player_buddy_id IN (
    SELECT pb.id FROM public.player_buddies pb
    JOIN public.members m ON pb.member_id = m.id
    WHERE m.auth_user_id = auth.uid()
  )
);

-- Done! All RLS policies have been updated.

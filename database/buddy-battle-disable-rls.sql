-- =====================================================
-- BUDDY BATTLE - DISABLE RLS (QUICK FIX)
-- This disables RLS on player_buddies to allow inserts
-- =====================================================

-- Option 1: Disable RLS completely on player_buddies
ALTER TABLE public.player_buddies DISABLE ROW LEVEL SECURITY;

-- Also disable on related tables
ALTER TABLE public.buddy_trainer_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_point_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_stat_upgrades DISABLE ROW LEVEL SECURITY;

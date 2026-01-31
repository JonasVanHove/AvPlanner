-- =====================================================
-- BUDDY BATTLE - Disable RLS on all tables
-- Run this in Supabase SQL Editor to fix all RLS issues
-- =====================================================

-- Disable RLS on all buddy battle related tables
ALTER TABLE public.player_buddies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_battles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_trainer_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_point_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_stat_upgrades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.boss_battle_attempts DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'buddy%' OR tablename LIKE 'boss_%'
ORDER BY tablename;

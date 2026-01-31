-- =====================================================
-- DISABLE RLS for Buddy Battle Tables
-- =====================================================
-- Run this in Supabase SQL Editor to allow battle operations
-- without requiring a service role key.
-- 
-- NOTE: This is less secure but works for development/small teams.
-- For production with multiple teams, consider:
-- 1. Using a proper SUPABASE_SERVICE_ROLE_KEY 
-- 2. Or setting up proper RLS policies
-- =====================================================

-- Disable RLS on buddy_battles
ALTER TABLE buddy_battles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on boss_battle_attempts  
ALTER TABLE boss_battle_attempts DISABLE ROW LEVEL SECURITY;

-- Disable RLS on buddy_trainer_profiles
ALTER TABLE buddy_trainer_profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on player_buddies (if enabled)
ALTER TABLE player_buddies DISABLE ROW LEVEL SECURITY;

-- Disable RLS on buddy_types (if enabled)
ALTER TABLE buddy_types DISABLE ROW LEVEL SECURITY;

-- Disable RLS on buddy_abilities (if enabled)
ALTER TABLE buddy_abilities DISABLE ROW LEVEL SECURITY;

-- Disable RLS on buddy_type_abilities (if enabled)
ALTER TABLE buddy_type_abilities DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'buddy_battles',
    'boss_battle_attempts', 
    'buddy_trainer_profiles',
    'player_buddies',
    'buddy_types',
    'buddy_abilities',
    'buddy_type_abilities'
  );

-- Expected output: all tables should show 'f' (false) for rowsecurity

-- =====================================================
-- BUDDY BATTLE - Fix RLS on player_buddies table
-- =====================================================

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view their buddy" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can create their buddy" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can update their buddy" ON public.player_buddies;
DROP POLICY IF EXISTS "Users can delete their buddy" ON public.player_buddies;

-- OPTION 1: Disable RLS completely (EASIEST FOR TESTING)
ALTER TABLE public.player_buddies DISABLE ROW LEVEL SECURITY;

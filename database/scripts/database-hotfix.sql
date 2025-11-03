-- EMERGENCY HOTFIX: Immediate team access restoration
-- Execute this script RIGHT NOW in Supabase SQL Editor

-- 1. Allow public access to teams table (essential for invite code lookup)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Drop any restrictive team policies
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
DROP POLICY IF EXISTS "Teams can be viewed by authenticated users" ON teams;
DROP POLICY IF EXISTS "Allow public read access to teams" ON teams;
DROP POLICY IF EXISTS "authenticated_users_can_view_teams" ON teams;
DROP POLICY IF EXISTS "public_can_view_teams_for_joining" ON teams;

-- Create essential team access policy
CREATE POLICY "allow_team_access" ON teams
FOR SELECT
USING (true);

-- 2. Fix members table access
DROP POLICY IF EXISTS "view_team_members" ON members;
DROP POLICY IF EXISTS "view_team_members_simple" ON members;

-- Simple members access
CREATE POLICY "allow_member_access" ON members
FOR SELECT
USING (true);

-- 3. Grant essential permissions
GRANT ALL ON teams TO authenticated, anon;
GRANT ALL ON members TO authenticated, anon;

-- Success message
SELECT 'EMERGENCY FIX COMPLETE - Test your team access now!' as result;
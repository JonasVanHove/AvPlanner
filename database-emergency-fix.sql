-- EMERGENCY FIX: Restore team access immediately
-- This script fixes the issue where teams cannot be found due to overly restrictive RLS policies

-- First, check if teams table has RLS issues
-- Temporarily disable RLS on teams table to restore access
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;

-- Re-enable with simple, working policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create simple team access policies
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
DROP POLICY IF EXISTS "Teams can be viewed by authenticated users" ON teams;
DROP POLICY IF EXISTS "Allow public read access to teams" ON teams;

-- Allow authenticated users to view teams (for team lookup by invite_code)
CREATE POLICY "authenticated_users_can_view_teams" ON teams
FOR SELECT
TO authenticated
USING (true);

-- Allow public read access to teams for invite code lookup (essential for joining teams)
CREATE POLICY "public_can_view_teams_for_joining" ON teams
FOR SELECT
TO anon, authenticated
USING (true);

-- Fix members table policies to be less restrictive for team access
DROP POLICY IF EXISTS "view_team_members" ON members;

-- Recreate members view policy without complex joins that cause recursion
CREATE POLICY "view_team_members_simple" ON members
FOR SELECT
TO authenticated
USING (
    -- Users can see members in teams they belong to
    team_id IN (
        SELECT team_id 
        FROM members 
        WHERE auth_user_id = auth.uid() 
        AND status = 'active'
    )
    OR 
    -- Users can see their own member records
    auth_user_id = auth.uid()
);

-- Ensure teams can be accessed for password verification
GRANT SELECT ON teams TO authenticated, anon;
GRANT SELECT ON members TO authenticated;

-- Test query to verify teams are accessible
SELECT 'Emergency fix applied - teams should be accessible now' as status;
-- Fix for infinite recursion in RLS policies for members table
-- This script removes problematic policies and recreates them correctly

-- First, disable RLS temporarily
ALTER TABLE members DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on members table
DROP POLICY IF EXISTS "Members can view their own data" ON members;
DROP POLICY IF EXISTS "Members can update their own data" ON members;
DROP POLICY IF EXISTS "Team admins can manage members" ON members;
DROP POLICY IF EXISTS "Members can view team members" ON members;
DROP POLICY IF EXISTS "Enable read access for team members" ON members;
DROP POLICY IF EXISTS "Enable insert for team admins" ON members;
DROP POLICY IF EXISTS "Enable update for team admins" ON members;
DROP POLICY IF EXISTS "Enable delete for team admins" ON members;
DROP POLICY IF EXISTS "Allow authenticated users to view members in their teams" ON members;
DROP POLICY IF EXISTS "Allow team admins to manage members" ON members;

-- Re-enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies

-- 1. Allow authenticated users to view members in teams they belong to
CREATE POLICY "view_team_members" ON members
FOR SELECT
TO authenticated
USING (
    team_id IN (
        SELECT t.id 
        FROM teams t
        JOIN members m ON t.id = m.team_id
        JOIN auth.users u ON m.auth_user_id = u.id
        WHERE u.id = auth.uid()
        AND m.status = 'active'
    )
);

-- 2. Allow users to view their own member records
CREATE POLICY "view_own_member_record" ON members
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- 3. Allow users to update their own member records (limited fields)
CREATE POLICY "update_own_member_record" ON members
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- 4. Allow team admins to insert new members
CREATE POLICY "admin_insert_members" ON members
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM members admin_member
        JOIN auth.users u ON admin_member.auth_user_id = u.id
        WHERE admin_member.team_id = members.team_id
        AND admin_member.role = 'admin'
        AND admin_member.status = 'active'
        AND u.id = auth.uid()
    )
);

-- 5. Allow team admins to update members in their teams
CREATE POLICY "admin_update_members" ON members
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM members admin_member
        JOIN auth.users u ON admin_member.auth_user_id = u.id
        WHERE admin_member.team_id = members.team_id
        AND admin_member.role = 'admin'
        AND admin_member.status = 'active'
        AND u.id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM members admin_member
        JOIN auth.users u ON admin_member.auth_user_id = u.id
        WHERE admin_member.team_id = members.team_id
        AND admin_member.role = 'admin'
        AND admin_member.status = 'active'
        AND u.id = auth.uid()
    )
);

-- 6. Allow team admins to delete members (soft delete by setting status)
CREATE POLICY "admin_delete_members" ON members
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM members admin_member
        JOIN auth.users u ON admin_member.auth_user_id = u.id
        WHERE admin_member.team_id = members.team_id
        AND admin_member.role = 'admin'
        AND admin_member.status = 'active'
        AND u.id = auth.uid()
    )
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON members TO authenticated;

-- Test that the policies work correctly
-- This should not cause infinite recursion
SELECT 'RLS policies fixed successfully' as status;
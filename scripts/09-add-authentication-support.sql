-- Add user authentication support
-- This migration adds columns to link members to authenticated users
-- Run this in your Supabase SQL editor

-- First, add auth_user_id column to members table (nullable for existing members)
ALTER TABLE members ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_members_auth_user_id ON members(auth_user_id);

-- Create a function to get teams for a user
CREATE OR REPLACE FUNCTION get_user_teams(user_email TEXT)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  team_invite_code TEXT,
  team_is_password_protected BOOLEAN,
  team_created_at TIMESTAMP WITH TIME ZONE,
  user_role TEXT,
  member_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.invite_code,
    t.is_password_protected,
    t.created_at,
    'member'::TEXT as user_role,
    COUNT(m2.id) as member_count
  FROM teams t
  INNER JOIN members m ON t.id = m.team_id
  LEFT JOIN members m2 ON t.id = m2.team_id
  WHERE m.email = user_email
  GROUP BY t.id, t.name, t.slug, t.invite_code, t.is_password_protected, t.created_at
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for authenticated users
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Members can see their own data and team data
CREATE POLICY "Users can view their own memberships" ON members
  FOR SELECT USING (auth.uid() = auth_user_id OR email = auth.jwt() ->> 'email');

-- Teams can be viewed by their members
CREATE POLICY "Members can view their teams" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM members 
      WHERE auth_user_id = auth.uid() 
      OR email = auth.jwt() ->> 'email'
    )
  );

-- Availability can be viewed by team members
CREATE POLICY "Team members can view availability" ON availability
  FOR SELECT USING (
    member_id IN (
      SELECT m.id FROM members m
      INNER JOIN members m2 ON m.team_id = m2.team_id
      WHERE m2.auth_user_id = auth.uid() 
      OR m2.email = auth.jwt() ->> 'email'
    )
  );

-- Allow authenticated users to insert/update their own availability
CREATE POLICY "Users can manage their own availability" ON availability
  FOR ALL USING (
    member_id IN (
      SELECT id FROM members 
      WHERE auth_user_id = auth.uid() 
      OR email = auth.jwt() ->> 'email'
    )
  );

-- Allow authenticated users to update their own member record
CREATE POLICY "Users can update their own member record" ON members
  FOR UPDATE USING (auth_user_id = auth.uid() OR email = auth.jwt() ->> 'email');

-- Public access for team creation and joining (existing functionality)
CREATE POLICY "Public access for team operations" ON teams
  FOR ALL USING (true);

CREATE POLICY "Public access for member operations" ON members
  FOR ALL USING (true);

CREATE POLICY "Public access for availability operations" ON availability
  FOR ALL USING (true);

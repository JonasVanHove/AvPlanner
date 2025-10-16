-- VERIFICATION: Check if team 'efficiency-team' exists and test access
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. First, check if the team exists at all
SELECT 
    'Team existence check' as check_type,
    id, 
    name, 
    invite_code,
    created_at,
    password IS NOT NULL as has_password
FROM teams 
WHERE invite_code = 'efficiency-team';

-- 2. Check current RLS policies on teams table
SELECT 
    'Current teams policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'teams';

-- 3. Check table permissions
SELECT 
    'Teams table permissions' as check_type,
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'teams';

-- 4. Try direct API-style query to see what happens
SELECT 
    'Direct query test' as check_type,
    count(*) as total_teams,
    count(CASE WHEN invite_code = 'efficiency-team' THEN 1 END) as efficiency_team_count
FROM teams;

-- 5. Check if RLS is enabled
SELECT 
    'RLS status' as check_type,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'teams';
-- Verify current RLS policies on members and teams tables
-- Run this to see what policies are active

-- Check members policies
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
from pg_policies
where schemaname = 'public' 
  and tablename = 'members'
order by policyname;

-- Check teams policies  
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
from pg_policies
where schemaname = 'public' 
  and tablename = 'teams'
order by policyname;

-- Expected after running the emergency fix:
-- members: should have members_select_auth_read and members_select_anon_read with cmd='SELECT' and using_clause='true'
-- teams: should have teams_select_read with cmd='SELECT' and using_clause='true'

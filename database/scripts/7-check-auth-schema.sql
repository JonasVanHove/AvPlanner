-- Check Supabase Auth configuration issues that might cause signup to fail
-- Run these queries to diagnose auth-level problems

-- 1. Check if there are conflicting email addresses in auth.users
-- (Supabase might fail if email already exists in a soft-deleted state)
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  deleted_at,
  is_sso_user,
  banned_until
FROM auth.users
WHERE email ILIKE '%test%' OR deleted_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check for any auth schema triggers that might be failing
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
ORDER BY event_object_table, action_timing, trigger_name;

-- 3. Look for auth-related functions that might be failing
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'auth'
  AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- 4. Check if there's a email provider configuration issue
-- (This is a system catalog check - if this fails, it means auth schema has issues)
SELECT 
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'auth'
ORDER BY tablename;

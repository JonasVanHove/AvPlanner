-- EMERGENCY BYPASS: Temporarily disable RLS on public.users to unblock signup
-- This removes the RLS policies but keeps the trigger intact
-- Use this if you're stuck and need to get signups working immediately
-- You can re-enable and refine RLS later once signups work

-- 1. Disable Row Level Security on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. The trigger and function remain as-is; they will now insert without RLS checks
-- Verify trigger still exists:
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

-- 3. After this change, try signup again
-- Expected: signup succeeds and creates user profile in public.users

-- IMPORTANT: Once signup works, you can re-enable RLS and debug policies step-by-step:
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Then add back one policy at a time and test to find which one is blocking the trigger insert

-- To see current RLS status:
SELECT
  schemaname,
  tablename,
  tableowner,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

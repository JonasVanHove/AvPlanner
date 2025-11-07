-- NUCLEAR OPTION: Remove ALL triggers on auth.users to test if they're the problem
-- This will allow signup to proceed without any profile creation
-- If signup works after this, we know the trigger was causing the issue

-- Drop our trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function too
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verify no triggers remain on auth.users
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- Expected result: empty (no rows)
-- This means NO triggers will run when a user signs up

-- After running this:
-- 1. Try signup in your app
-- 2. If it WORKS -> the trigger was the problem, we need to fix the trigger logic
-- 3. If it FAILS -> the problem is in Supabase Auth itself (not related to our trigger)

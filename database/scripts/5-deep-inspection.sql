-- Deep inspection: Check if the function definition has any issues
-- Run this to see the exact function code and identify potential problems

-- 1. Get the complete function definition
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

-- 2. Check if there are any other triggers on auth.users that might conflict
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_orientation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
ORDER BY action_timing, trigger_name;

-- 3. Verify the users table structure matches what the function expects
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 4. Check if there are any constraints that might block the insert
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass;

-- 5. Test if we can manually insert a user (to rule out table-level issues)
-- UNCOMMENT AND MODIFY THE UUID/EMAIL BELOW TO TEST:
-- INSERT INTO public.users (id, email, first_name, last_name)
-- VALUES (
--   'test-uuid-here'::uuid,
--   'test@example.com',
--   'Test',
--   'User'
-- );

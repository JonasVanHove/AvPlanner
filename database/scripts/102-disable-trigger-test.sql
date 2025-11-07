-- NUCLEAR OPTION: Completely disable trigger to test if that's the blocker
-- This will allow signup to succeed, but won't create profiles automatically
-- Run this, try signup, then if it works we know the trigger was the problem

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Verify trigger is gone
SELECT COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE event_object_schema='auth' 
  AND event_object_table='users'
  AND trigger_name='on_auth_user_created';
-- Should return 0

-- Now try creating an account via the UI
-- If it WORKS: the trigger function is the problem
-- If it still FAILS: the problem is in Supabase Auth configuration itself

-- After testing, you can re-enable with:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

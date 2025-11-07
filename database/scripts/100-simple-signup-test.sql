-- Ultra-simple signup test: create auth user WITHOUT trigger to isolate the issue
-- This will tell us if the problem is in auth.users insert itself or in our trigger

-- STEP 1: Temporarily disable trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 2: Now try to create account via UI
-- If it WORKS now -> problem is in our trigger function
-- If it still FAILS -> problem is in Supabase Auth itself (before trigger)

-- STEP 3: Re-enable trigger after test
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Check trigger status
SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE event_object_schema='auth' AND event_object_table='users'
  AND trigger_name='on_auth_user_created';

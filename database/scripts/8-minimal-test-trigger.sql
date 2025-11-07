-- MINIMAL TEST: Create a trigger that does absolutely nothing except log
-- This helps us confirm if the trigger is even being called
-- If signup still fails after this, the problem is in Supabase Auth itself, not our trigger

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Just log that we were called, don't do ANY database operations
  RAISE NOTICE 'handle_new_user trigger called for email: %, user_id: %', 
                new.email, new.id;
  
  -- Return immediately without touching public.users at all
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- This should NEVER happen since we're doing nothing
    RAISE WARNING 'Impossible error in no-op trigger: %', SQLERRM;
    RETURN new;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Confirm
SELECT 'Minimal test trigger installed - does nothing except log' AS status;

-- After running this:
-- 1. Try signup again in your app
-- 2. If signup SUCCEEDS -> problem was in our public.users insert logic
-- 3. If signup still FAILS -> problem is in Supabase Auth itself, before trigger
-- 4. Check Logs → Database for the NOTICE message to confirm trigger was called

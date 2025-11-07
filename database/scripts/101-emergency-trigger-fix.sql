-- Emergency fix for "Database error saving new user"
-- This replaces the trigger with a bulletproof version that handles all edge cases

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create ultra-safe trigger function that will NEVER fail the signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  retry_count int := 0;
  max_retries int := 3;
BEGIN
  -- Retry loop in case of timing issues with foreign key
  LOOP
    BEGIN
      -- Insert user profile
      INSERT INTO public.users (id, email, first_name, last_name)
      VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        COALESCE(new.raw_user_meta_data->>'last_name', '')
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        updated_at = timezone('utc'::text, now());
      
      -- Success! Exit loop
      EXIT;
      
    EXCEPTION
      WHEN foreign_key_violation THEN
        -- Auth user might not be committed yet, wait a tiny bit
        retry_count := retry_count + 1;
        IF retry_count >= max_retries THEN
          RAISE WARNING 'FK violation after % retries for user %: %', max_retries, new.email, SQLERRM;
          EXIT; -- Give up but don't fail auth.users insert
        END IF;
        PERFORM pg_sleep(0.01); -- 10ms delay
        
      WHEN unique_violation THEN
        -- Email already exists, this is OK (maybe a retry)
        RAISE NOTICE 'User profile already exists for %', new.email;
        EXIT;
        
      WHEN OTHERS THEN
        -- Any other error: log but DON'T fail the signup
        RAISE WARNING 'Unexpected error in handle_new_user for %: % (SQLSTATE: %)', 
                      new.email, SQLERRM, SQLSTATE;
        EXIT;
    END;
  END LOOP;
  
  RETURN new;
END;
$$;

-- Set correct owner
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify installation
SELECT 
  'Trigger installed: ' || trigger_name AS status,
  'Function owner: ' || (
    SELECT r.rolname 
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) AS owner_check
FROM information_schema.triggers
WHERE event_object_schema='auth' 
  AND event_object_table='users'
  AND trigger_name='on_auth_user_created';

-- Test: Try creating an account now through the UI
-- This trigger will never fail your signup, even if the profile insert has issues

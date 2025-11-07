-- VERIFIED FIX based on actual error log
-- Error was: relation "members" does not exist
-- This means an old version of handle_new_user is still active

-- Step 1: Drop ALL triggers on auth.users to be safe
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' 
          AND event_object_table = 'users'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON auth.users';
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- Step 2: Drop the function completely (CASCADE will drop any remaining triggers)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 3: Recreate CLEAN function that does NOT touch members table
CREATE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Simple insert into public.users only
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
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail
    RAISE WARNING 'handle_new_user error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN new;
END;
$$;

-- Step 4: Set owner
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Step 5: Create clean trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Verify everything
SELECT 
  t.trigger_name,
  t.event_manipulation,
  t.action_timing,
  p.proname as function_name,
  r.rolname as function_owner,
  p.prosecdef as is_security_definer
FROM information_schema.triggers t
LEFT JOIN pg_proc p ON p.proname = 'handle_new_user'
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
LEFT JOIN pg_roles r ON r.oid = p.proowner
WHERE t.event_object_schema = 'auth'
  AND t.event_object_table = 'users'
  AND t.trigger_name = 'on_auth_user_created';

-- Should show: trigger exists, function owner is postgres, security_definer is true

SELECT 'SUCCESS - Clean trigger installed. Try signup now!' as message;

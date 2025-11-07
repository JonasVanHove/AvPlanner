-- Enhanced fix: guarantee trigger insert bypasses RLS completely
-- This replaces the handle_new_user function with a version that explicitly disables RLS during insert
-- Run this in Supabase SQL Editor after fix-user-signup.sql if still getting 500 errors

-- Drop the old trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Replace the function with a version that explicitly bypasses RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Explicitly set local role to bypass RLS (function owner is postgres)
  -- This ensures the INSERT happens with owner privileges
  PERFORM set_config('role', 'postgres', true);
  
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
    -- Log the error details for debugging
    RAISE WARNING 'Error in handle_new_user for user %: % (SQLSTATE: %)', 
                   new.id, SQLERRM, SQLSTATE;
    RETURN new;
END;
$$;

-- Ensure function owner is postgres
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Alternative approach: temporarily disable RLS during trigger execution
-- Uncomment below if the set_config approach doesn't work

-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger 
-- SECURITY DEFINER
-- SET search_path = public
-- LANGUAGE plpgsql
-- AS $$
-- DECLARE
--   rls_was_enabled boolean;
-- BEGIN
--   -- Store current RLS state and disable it
--   SELECT relrowsecurity INTO rls_was_enabled
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relname = 'users';
--   
--   -- Temporarily disable RLS
--   ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
--   
--   INSERT INTO public.users (id, email, first_name, last_name)
--   VALUES (
--     new.id,
--     new.email,
--     COALESCE(new.raw_user_meta_data->>'first_name', ''),
--     COALESCE(new.raw_user_meta_data->>'last_name', '')
--   )
--   ON CONFLICT (id) DO UPDATE SET
--     email = EXCLUDED.email,
--     first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
--     last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
--     updated_at = timezone('utc'::text, now());
--   
--   -- Re-enable RLS if it was enabled
--   IF rls_was_enabled THEN
--     ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
--   END IF;
--   
--   RETURN new;
-- EXCEPTION
--   WHEN OTHERS THEN
--     -- Ensure RLS is restored even on error
--     IF rls_was_enabled THEN
--       ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
--     END IF;
--     RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
--     RETURN new;
-- END;
-- $$;

-- Verify the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

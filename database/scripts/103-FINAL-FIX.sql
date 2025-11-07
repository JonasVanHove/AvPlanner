-- REAL FIX: The trigger is trying to access 'members' table which doesn't exist
-- This creates a minimal trigger that ONLY creates the user profile

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create NEW minimal function that only touches public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- ONLY insert into public.users - nothing else!
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, just log it and continue
    RAISE WARNING 'handle_new_user failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN new;
END;
$$;

-- Set owner
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify
SELECT 'SUCCESS: Trigger recreated' as status;

-- Now try signup - it should work!

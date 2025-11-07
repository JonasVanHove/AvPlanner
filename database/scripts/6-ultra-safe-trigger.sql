-- ULTRA-SAFE trigger: catches ALL errors and logs them without failing auth.users insert
-- This version will NEVER fail the signup, even if the insert to public.users fails
-- Run this to replace the current trigger function

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Try to insert, but catch ANY error and log it
  BEGIN
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
    
    -- Log success
    RAISE NOTICE 'Successfully created user profile for: %', new.email;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log detailed error but DON'T re-raise (so signup still succeeds)
      RAISE WARNING 'handle_new_user failed for % (%): % | SQLSTATE: % | DETAIL: %', 
                     new.email, 
                     new.id,
                     SQLERRM, 
                     SQLSTATE,
                     COALESCE(NULLIF(SQLERRM, ''), 'No detail available');
      -- Return new anyway so the auth.users insert succeeds
  END;
  
  RETURN new;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify
SELECT 'Trigger installed successfully' AS status;

-- After running this, check Supabase logs for the WARNING message
-- It will tell you exactly what's failing in the function

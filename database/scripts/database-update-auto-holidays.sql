-- Add auto_holidays_enabled field to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS auto_holidays_enabled boolean DEFAULT false;

-- Update existing teams to have auto_holidays_enabled = false by default
UPDATE public.teams 
SET auto_holidays_enabled = false 
WHERE auto_holidays_enabled IS NULL;

-- Update the get_user_teams function to include auto_holidays_enabled
-- Note: You might need to recreate this function if it exists
-- This is just a template - adjust based on your existing function
/*
Example update to get_user_teams function:
DROP FUNCTION IF EXISTS public.get_user_teams(text);
CREATE OR REPLACE FUNCTION public.get_user_teams(user_email_param text)
RETURNS TABLE (
  team_id uuid,
  team_name text,
  team_slug text,
  team_invite_code text,
  team_is_password_protected boolean,
  team_created_at timestamp with time zone,
  user_role text,
  member_count bigint,
  is_creator boolean,
  profile_image_url text,
  auto_holidays_enabled boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Your existing logic here, just add auto_holidays_enabled to SELECT
  -- This is a template - adjust based on your actual function
END;
$$;
*/
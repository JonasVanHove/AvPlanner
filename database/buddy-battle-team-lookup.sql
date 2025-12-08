-- Function to safely look up team info for the Buddy Battle page
-- This bypasses RLS to allow finding teams by ID, slug, or name without exposing sensitive data
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_team_public_info(lookup_value text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  invite_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_uuid boolean;
  decoded_value text;
BEGIN
  -- Decode URL encoded string (basic handling)
  -- In Postgres, we assume the input is already decoded by the application, 
  -- but if we need to handle spaces/special chars, we rely on the input.
  
  -- Check if input is UUID
  is_uuid := lookup_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF is_uuid THEN
    RETURN QUERY
    SELECT t.id, t.name, t.slug, t.invite_code
    FROM teams t
    WHERE t.id = lookup_value::uuid;
    
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Try invite_code
  RETURN QUERY
  SELECT t.id, t.name, t.slug, t.invite_code
  FROM teams t
  WHERE t.invite_code = lookup_value;
  
  IF FOUND THEN RETURN; END IF;

  -- Try slug
  RETURN QUERY
  SELECT t.id, t.name, t.slug, t.invite_code
  FROM teams t
  WHERE t.slug = lookup_value;
  
  IF FOUND THEN RETURN; END IF;

  -- Try name
  RETURN QUERY
  SELECT t.id, t.name, t.slug, t.invite_code
  FROM teams t
  WHERE t.name ILIKE lookup_value;
  
  IF FOUND THEN RETURN; END IF;

  -- Try name with spaces (replacing hyphens)
  IF lookup_value LIKE '%-%' THEN
    RETURN QUERY
    SELECT t.id, t.name, t.slug, t.invite_code
    FROM teams t
    WHERE t.name ILIKE replace(lookup_value, '-', ' ');
  END IF;
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION get_team_public_info(text) TO anon, authenticated, service_role;

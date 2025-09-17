-- VEILIGE ADMIN MIGRATIE - Voegt alleen admin functionaliteit toe
-- Deze versie overschrijft geen bestaande functies
-- Kopieer dit in je Supabase SQL Editor

-- Stap 1: Maak admin_users tabel (alleen als deze nog niet bestaat)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  granted_by TEXT,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Stap 2: Voeg indexen toe voor betere prestaties
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- Stap 3: Admin functionaliteit functies
-- Functie om te controleren of een user admin is
CREATE OR REPLACE FUNCTION is_user_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_active INTO admin_status
  FROM admin_users
  WHERE email = user_email AND is_active = TRUE;
  
  RETURN COALESCE(admin_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om een user admin te maken
CREATE OR REPLACE FUNCTION grant_admin_access(user_email TEXT, granted_by_email TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Vind de user ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Voeg toe aan admin_users tabel
  INSERT INTO admin_users (user_id, email, granted_by)
  VALUES (target_user_id, user_email, granted_by_email)
  ON CONFLICT (email) DO UPDATE SET
    is_active = TRUE,
    granted_by = granted_by_email,
    granted_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om admin toegang in te trekken
CREATE OR REPLACE FUNCTION revoke_admin_access(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE admin_users
  SET is_active = FALSE
  WHERE email = user_email;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om admin users op te halen (alleen voor admins)
CREATE OR REPLACE FUNCTION get_admin_users(user_email TEXT)
RETURNS TABLE (
  admin_email TEXT,
  admin_name TEXT,
  granted_by TEXT,
  granted_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(user_email) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT 
    au.email,
    COALESCE(
      CONCAT(u.raw_user_meta_data->>'first_name', ' ', u.raw_user_meta_data->>'last_name'),
      au.email
    ) as admin_name,
    au.granted_by,
    au.granted_at,
    au.is_active
  FROM admin_users au
  JOIN auth.users u ON au.user_id = u.id
  ORDER BY au.granted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om alle teams op te halen (alleen voor admins)
CREATE OR REPLACE FUNCTION get_all_teams_admin(user_email TEXT)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  team_invite_code TEXT,
  team_is_password_protected BOOLEAN,
  team_created_at TIMESTAMP WITH TIME ZONE,
  member_count BIGINT,
  creator_email TEXT,
  creator_name TEXT
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(user_email) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.invite_code,
    t.is_password_protected,
    t.created_at,
    COUNT(m.id) as member_count,
    au.email as creator_email,
    COALESCE(
      CONCAT(au.raw_user_meta_data->>'first_name', ' ', au.raw_user_meta_data->>'last_name'),
      au.email
    ) as creator_name
  FROM teams t
  LEFT JOIN members m ON t.id = m.team_id
  LEFT JOIN auth.users au ON t.created_by = au.id
  GROUP BY t.id, t.name, t.slug, t.invite_code, t.is_password_protected, t.created_at, au.email, au.raw_user_meta_data
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om een team te verwijderen (alleen voor admins)
CREATE OR REPLACE FUNCTION delete_team_admin(team_id_param UUID, user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  team_name TEXT;
  member_count INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT is_user_admin(user_email) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  -- Get team info for logging
  SELECT name INTO team_name
  FROM teams
  WHERE id = team_id_param;
  
  IF team_name IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Get member count
  SELECT COUNT(*) INTO member_count
  FROM members
  WHERE team_id = team_id_param;

  -- Delete team (CASCADE will handle members and availability)
  DELETE FROM teams WHERE id = team_id_param;
  
  -- Log the deletion (you might want to add a log table later)
  RAISE NOTICE 'Admin % deleted team "%" (ID: %, Members: %)', user_email, team_name, team_id_param, member_count;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Geef jezelf admin rechten (vervang email!)
-- SELECT grant_admin_access('jouw-email@example.com', 'system');

-- Test admin functionaliteit
-- SELECT is_user_admin('jouw-email@example.com');
-- SELECT * FROM get_admin_users('jouw-email@example.com');
-- SELECT * FROM get_all_teams_admin('jouw-email@example.com');

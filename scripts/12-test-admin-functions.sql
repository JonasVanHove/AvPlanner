-- Test script voor admin functionaliteit
-- Kopieer dit in je Supabase SQL Editor om te testen

-- Stap 1: Maak een test user admin (vervang 'admin@example.com' met echte email)
SELECT grant_admin_access('admin@example.com', 'system');

-- Stap 2: Test admin status check
SELECT is_user_admin('admin@example.com');

-- Stap 3: Test get_admin_users functie
SELECT * FROM get_admin_users('admin@example.com');

-- Stap 4: Test get_all_teams_admin functie
SELECT * FROM get_all_teams_admin('admin@example.com');

-- Stap 5: Test team deletion (vervang team-id met een echte UUID)
-- LET OP: Dit verwijdert echt een team! Gebruik voorzichtig.
-- SELECT delete_team_admin('your-team-id-here', 'admin@example.com');

-- Stap 6: Controleer welke users admin zijn
SELECT 
  au.email,
  au.is_active,
  au.granted_by,
  au.granted_at,
  u.created_at as user_created_at,
  u.raw_user_meta_data->>'first_name' as first_name,
  u.raw_user_meta_data->>'last_name' as last_name
FROM admin_users au
JOIN auth.users u ON au.user_id = u.id
WHERE au.is_active = TRUE
ORDER BY au.granted_at DESC;

-- Stap 6: Admin rechten intrekken (indien nodig)
-- SELECT revoke_admin_access('admin@example.com');

-- Stap 7: Controleer admin_users tabel
SELECT * FROM admin_users ORDER BY granted_at DESC;

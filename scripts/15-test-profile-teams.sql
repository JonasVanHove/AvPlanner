-- Test script voor profiel en team management functionaliteit
-- Vervang 'test-user@example.com' met een echte email

-- Stap 1: Test user profiel ophalen
SELECT * FROM get_user_profile('test-user@example.com');

-- Stap 2: Test user profiel updaten
SELECT update_user_profile(
  'test-user@example.com',
  'https://example.com/profile.jpg',
  'John',
  'Doe'
);

-- Stap 3: Test user teams ophalen met status
SELECT * FROM get_user_teams_with_status('test-user@example.com');

-- Stap 4: Test team status toggle (vervang team_id met echte UUID)
-- SELECT toggle_team_status('your-team-id-here', 'test-user@example.com');

-- Stap 5: Test team verlaten (vervang team_id met echte UUID)
-- LET OP: Dit verwijdert de user uit het team!
-- SELECT leave_team('your-team-id-here', 'test-user@example.com');

-- Stap 6: Test team members ophalen met profielen
-- SELECT * FROM get_team_members_with_profiles('your-team-id-here', 'test-user@example.com');

-- Stap 7: Controleer members tabel structuur
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'members' 
AND column_name IN ('profile_image_url', 'status', 'last_active')
ORDER BY ordinal_position;

-- Stap 8: Test query om alle statussen te zien
SELECT 
  email,
  first_name,
  last_name,
  status,
  role,
  profile_image_url,
  last_active
FROM members
WHERE email = 'test-user@example.com'
ORDER BY last_active DESC;

-- Stap 9: Test team statistieken
SELECT 
  t.name as team_name,
  COUNT(m.id) as total_members,
  COUNT(m.id) FILTER (WHERE m.status = 'active') as active_members,
  COUNT(m.id) FILTER (WHERE m.status = 'inactive') as inactive_members,
  COUNT(m.id) FILTER (WHERE m.status = 'left') as left_members
FROM teams t
LEFT JOIN members m ON t.id = m.team_id
GROUP BY t.id, t.name
ORDER BY t.created_at DESC;

-- Instructies:
-- 1. Vervang 'test-user@example.com' met een echte email uit je auth.users tabel
-- 2. Run migration-profile-teams.sql eerst
-- 3. Test stap voor stap om te controleren of alles werkt
-- 4. Voor team-specifieke functies, vervang 'your-team-id-here' met echte UUIDs

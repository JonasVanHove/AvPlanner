-- Quick test om te controleren of admin dashboard data correct ophaalt
-- Vervang 'jouw-email@example.com' met je eigen email

-- 1. Test admin status
SELECT 'Admin Status Test' as test_type, is_user_admin('jouw-email@example.com') as result;

-- 2. Test teams data (dit is wat het dashboard gebruikt)
SELECT 'Teams Data Test' as test_type, COUNT(*) as team_count 
FROM get_all_teams_admin('jouw-email@example.com');

-- 3. Bekijk alle teams met details
SELECT 
  team_name,
  team_slug,
  team_invite_code,
  team_is_password_protected,
  member_count,
  creator_email,
  creator_name,
  team_created_at
FROM get_all_teams_admin('jouw-email@example.com')
ORDER BY team_created_at DESC;

-- 4. Test admin users data
SELECT 'Admin Users Test' as test_type, COUNT(*) as admin_count
FROM get_admin_users('jouw-email@example.com');

-- 5. Bekijk admin users
SELECT 
  admin_email,
  admin_name,
  granted_by,
  granted_at,
  is_active
FROM get_admin_users('jouw-email@example.com')
ORDER BY granted_at DESC;

-- 6. Statistieken voor dashboard
SELECT 
  'Dashboard Stats' as info,
  (SELECT COUNT(*) FROM teams) as total_teams,
  (SELECT COUNT(*) FROM teams WHERE is_password_protected = true) as protected_teams,
  (SELECT COUNT(*) FROM members) as total_members,
  (SELECT COUNT(*) FROM admin_users WHERE is_active = true) as active_admins;

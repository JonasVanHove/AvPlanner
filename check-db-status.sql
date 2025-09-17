-- Quick test to verify if our new columns and functions exist

-- Check if is_hidden column exists in members table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'members' AND column_name = 'is_hidden';

-- Check if our new functions exist
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name IN ('get_team_settings', 'toggle_member_visibility')
AND routine_schema = 'public';

-- Sample check for teams and members (first 3 records)
SELECT t.id, t.name, t.invite_code, 
       COUNT(m.id) as member_count
FROM teams t
LEFT JOIN members m ON t.id = m.team_id AND m.status = 'active'
GROUP BY t.id, t.name, t.invite_code
LIMIT 3;

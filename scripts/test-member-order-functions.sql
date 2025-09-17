-- Test script om te controleren of de member order functies bestaan en werken
-- Voer deze uit in Supabase SQL Editor

-- 1. Controleer of de functies bestaan
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('move_member_up', 'move_member_down', 'update_member_order')
ORDER BY routine_name;

-- 2. Controleer of de order_index kolom bestaat
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'members' 
AND column_name = 'order_index';

-- 3. Test functie om een specifieke member te checken (vervang email en team_id)
-- SELECT id, first_name, last_name, order_index, role, status 
-- FROM members 
-- WHERE team_id = 'jouw-team-id-hier' 
-- ORDER BY order_index ASC;

-- 4. Test update bestaande members met order_index (alleen uitvoeren als order_index = 0)
-- UPDATE members SET order_index = (
--   SELECT ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY created_at) - 1
--   FROM members m2 
--   WHERE m2.id = members.id
-- ) WHERE order_index = 0 OR order_index IS NULL;

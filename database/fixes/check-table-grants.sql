-- Check table-level grants for members table
-- This will show if anon/authenticated can SELECT from the table at all

select 
  grantee,
  privilege_type,
  is_grantable
from information_schema.table_privileges
where table_schema = 'public' 
  and table_name = 'members'
  and privilege_type = 'SELECT'
order by grantee;

-- Expected: Should show SELECT grants for anon and authenticated
-- If missing, that's why birth_date returns null even though column grants exist

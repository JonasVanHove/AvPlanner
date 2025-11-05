-- Quick verification query to check if birth_date is visible after RLS fix
-- Run this in Supabase SQL Editor AFTER running the emergency fix

-- Test 1: Check raw data exists
select 
  id, 
  first_name, 
  last_name, 
  email,
  birth_date,
  case 
    when birth_date is null then '❌ NULL'
    else '✅ ' || birth_date::text
  end as birth_date_status
from public.members
where birth_date is not null
limit 5;

-- Test 2: Simulate what PostgREST (Supabase JS client) sees
-- This uses the same SELECT columns as your app code
select 
  id, 
  first_name, 
  last_name, 
  email, 
  role, 
  status, 
  is_hidden, 
  profile_image, 
  profile_image_url, 
  created_at, 
  last_active, 
  order_index, 
  birth_date
from public.members
limit 3;

-- Test 3: Check column grants
select 
  grantee, 
  privilege_type,
  is_grantable
from information_schema.column_privileges
where table_schema = 'public' 
  and table_name = 'members' 
  and column_name = 'birth_date';

-- Expected results:
-- Test 1: Should show rows with birth_date values and ✅ status
-- Test 2: Should return all columns including birth_date (not null for members who have it)
-- Test 3: Should show SELECT grants for authenticated and/or anon roles
--
-- If birth_date is still NULL in Test 2, run the emergency fix SQL again and check grants.

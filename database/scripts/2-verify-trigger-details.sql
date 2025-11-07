-- Verify trigger function definition and owner in detail
-- Run this to diagnose why the trigger is still failing

-- 1. Show the actual function source code
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

-- 2. Show function owner
SELECT
  n.nspname as schema,
  p.proname as function_name,
  r.rolname as owner,
  p.prosecdef as security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

-- 3. Show table owner and RLS status
SELECT
  schemaname,
  tablename,
  tableowner,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

-- 4. Check if table has FORCE RLS enabled (this overrides owner bypass)
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'users';

-- 5. List all policies again for reference
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

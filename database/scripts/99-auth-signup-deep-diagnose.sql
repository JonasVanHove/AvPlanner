-- Deep diagnose for persistent "Database error saving new user" during Supabase signup
-- Run sections individually. Collect outputs to narrow root cause.

-- 1. Basic health: auth.users writable by anon key?
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema='auth' AND table_name='users'
ORDER BY grantee, privilege_type;

-- Expect anon & authenticated roles to have INSERT/SELECT/UPDATE on auth schema tables via internal grants.
-- Absence of privileges may indicate a broken auth schema migration.

-- 2. Extensions required for password hashing present?
SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto','uuid-ossp');
-- pgcrypto is required for crypt() if manual password operations occur.

-- 3. Check for invalid or duplicate emails lingering (soft delete scenario)
SELECT email, deleted_at, banned_until
FROM auth.users
WHERE email = 'joneke39@hotmail.com'
ORDER BY deleted_at IS NULL, deleted_at DESC;

-- 4. Validate trigger existence and linkage
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema='auth' AND event_object_table='users'
  AND trigger_name='on_auth_user_created';

-- 5. Show function definition & owner (should be SECURITY DEFINER by postgres)
SELECT p.proname, r.rolname AS owner, p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN pg_roles r ON r.oid=p.proowner
WHERE n.nspname='public' AND p.proname='handle_new_user';

-- 6. Force RLS status (should be false while debugging)
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='users';

-- 7. Detect conflicting constraint problems in public.users
SELECT conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='public' AND t.relname='users';

-- 8. Inspect recent failed inserts (requires log access) - run in Logs UI, not SQL.
-- Filter for "Database error saving new user" and capture any internal failure details.

-- 9. Manual insert test (UNCOMMENT to run after replacing email):
-- INSERT INTO auth.users (
--   instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data, created_at, updated_at
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated','authenticated','REPLACE_TEST_EMAIL',
--   crypt('temporary123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Diag","last_name":"User"}', now(), now()
-- ) ON CONFLICT DO NOTHING;
-- SELECT au.email, pu.id AS profile_id FROM auth.users au LEFT JOIN public.users pu ON pu.id=au.id WHERE au.email='REPLACE_TEST_EMAIL';

-- 10. If manual insert works and profile created but API still 500s: open a Support ticket; include outputs above.

-- End of diagnose script.

-- Inspect RLS and fix updates for members.profile_image

-- 1) Inspect current RLS flags and policies
SELECT n.nspname AS schema,
       c.relname AS table,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'members';

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'members';

-- 2) Ensure profile_image column can hold large base64 strings
ALTER TABLE public.members
ALTER COLUMN profile_image TYPE TEXT;

-- 3) TEMPORARY: Allow authenticated users to update members rows (all columns)
-- NOTE: This is permissive to unblock your flow; we'll tighten later based on your team-role schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'allow_authenticated_update_members'
  ) THEN
    CREATE POLICY "allow_authenticated_update_members"
    ON public.members
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END$$;

-- 4) (Optional) If you still hit 0-rows on update, also allow SELECT to authenticated (needed when using .select() after update)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'allow_authenticated_select_members'
  ) THEN
    CREATE POLICY "allow_authenticated_select_members"
    ON public.members
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END$$;

-- TEMPORARY: Allow anon updates on members to unblock image saves when user is not signed in
-- WARNING: This makes the table writable by anyone with your anon key. Use only for short debugging/testing.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'allow_anon_update_members'
  ) THEN
    CREATE POLICY "allow_anon_update_members"
    ON public.members
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);
  END IF;
END$$;

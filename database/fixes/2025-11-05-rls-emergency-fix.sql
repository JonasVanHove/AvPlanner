-- AvPlanner emergency fix: resolve 500 errors caused by recursive/mutually recursive RLS policies
-- Date: 2025-11-05
-- Context:
--   Browser shows 500 (Internal Server Error) from PostgREST for queries on teams and members.
--   Postgres error observed: "infinite recursion detected in policy for relation \"members\"".
--   This happens when a policy on a table queries the same table (directly or indirectly via mutual references),
--   which causes recursive policy evaluation.
--
-- Strategy:
--   1) Drop existing policies on public.members and public.teams (do NOT drop tables or data)
--   2) Recreate minimal, non-recursive SELECT policies to unblock the app
--   3) Provide a safe baseline you can tighten later
--
-- IMPORTANT: Review and adapt for your security model after unblocking.
--            This script focuses on SELECT to fix read paths that currently fail with 500s.

set local role postgres; -- ensure we can manage policies; run as an owner/superuser in Supabase SQL editor

-- 1) Ensure RLS is enabled (no-op if already enabled)
alter table if exists public.members enable row level security;
alter table if exists public.teams   enable row level security;

-- 2) Drop ALL existing policies on the affected tables to remove recursive definitions
--    Uses a DO block to dynamically drop whatever policies exist.

do $$
declare
  pol record;
begin
  for pol in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename in ('members','teams')
  ) loop
    execute format('drop policy if exists %I on %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- 3) Recreate minimal, NON-RECURSIVE policies
-- NOTE: Keep these simple and self-contained. Do NOT reference the same table inside USING/ WITH CHECK clauses.

-- TEAMS: allow read access to fetch a team by invite_code or slug (public read, adjust as needed)
create policy teams_select_read on public.teams
  for select
  using (true);

-- MEMBERS: allow read access needed by the app (homepage avatar lookup by own email + team listings)
-- If you want to restrict further, start with self-read then tighten team listing via a separate function.
-- For immediate unblock, allow authenticated users to read members. Adjust later.

-- Option A: authenticated-only read (recommended as an emergency unblock)
create policy members_select_auth_read on public.members
  for select
  to authenticated
  using (true);

-- Option B: anon read (for public team pages accessed without login)
-- Allows anon users to read members (including birth_date) for public team views
create policy members_select_anon_read on public.members
  for select
  to anon
  using (true);

-- NOTE: This is wide open for emergency unblock. After verifying birth_date appears,
-- tighten to check team visibility or password protection status via a SECURITY DEFINER function.

-- 4) (Optional) Allow inserts/updates only to authenticated users for now (kept simple, non-recursive)
-- Comment out if you already manage write policies elsewhere.
-- create policy members_insert_auth on public.members for insert to authenticated with check (true);
-- create policy members_update_auth on public.members for update to authenticated using (true) with check (true);

-- 5) Grant table-level SELECT access (required for RLS to work properly)
-- Without table-level grants, RLS policies are ineffective
grant select on public.members to authenticated, anon;
grant select on public.teams to authenticated, anon;

-- 5b) Grant column-level access to birth_date (extra safety, though table grant should cover it)
-- Supabase may hide columns without explicit grants even if RLS allows row access
grant select (birth_date) on public.members to authenticated, anon;

-- 6) Verify
-- After running this script, try simple selects:
--   select id, name from public.teams limit 1;
--   select id, email, birth_date from public.members limit 1;
-- If these run without error, the 500s caused by recursive policies should be resolved.

-- 7) Next steps (after unblocking)
-- - Replace the broad members read policy with a SECURITY DEFINER helper to check access without recursion.
-- - Example pattern (pseudocode):
--   create or replace function public.user_can_read_member(m_id uuid) returns boolean
--   language plpgsql security definer set search_path = public as $$
--   begin
--     -- Check via other tables (e.g., team_members) using owner rights to avoid RLS recursion
--     return exists (
--       select 1
--       from team_members tm
--       join members m on m.id = m_id and m.team_id = tm.team_id
--       where tm.user_id = auth.uid()
--     );
--   end; $$;
--   revoke all on function public.user_can_read_member(uuid) from public;
--   grant execute on function public.user_can_read_member(uuid) to authenticated;
--   -- Then use: using (public.user_can_read_member(id)) in a members SELECT policy.

reset role;
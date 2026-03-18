-- =====================================================
-- BUDDY BATTLE - Security Linter RLS Fix
-- Fixes: policy_exists_rls_disabled + rls_disabled_in_public
-- =====================================================

-- Re-enable RLS on tables that have policies defined.
ALTER TABLE public.boss_battle_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_stat_upgrades ENABLE ROW LEVEL SECURITY;

-- Optional hardening in production:
-- ALTER TABLE public.boss_battle_attempts FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.buddy_stat_upgrades FORCE ROW LEVEL SECURITY;

-- Verify state (should be rowsecurity = true for both)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('boss_battle_attempts', 'buddy_stat_upgrades');

-- Check which tables exist in your Supabase database
-- Run this first to see what's missing

SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Also check for any tables that might have different names
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if members table exists with a different name or schema
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    c.relkind as table_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname LIKE '%member%'
OR c.relname LIKE '%user%'
OR c.relname LIKE '%team%'
ORDER BY n.nspname, c.relname;
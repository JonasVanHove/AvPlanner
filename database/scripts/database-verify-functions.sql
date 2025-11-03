-- Database Functions Verification Script
-- Run this in Supabase SQL Editor to verify all functions exist

-- Check if all required functions exist
SELECT 
    'is_user_admin' as function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'is_user_admin'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'manual_link_auth_user',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'manual_link_auth_user'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END
UNION ALL
SELECT 
    'get_user_teams',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'get_user_teams'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END
UNION ALL
SELECT 
    'get_user_teams_with_status',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'get_user_teams_with_status'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END
UNION ALL
SELECT 
    'validate_profile_image_url',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'validate_profile_image_url'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END;

-- Also check table structure
SELECT 
    'Tables Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') AND
             EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') AND
             EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'availability') AND
             EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'holidays') AND
             EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'countries')
        THEN '✅ All tables exist'
        ELSE '❌ Some tables missing'
    END as status;

-- Test admin function with a placeholder email
-- UNCOMMENT AND MODIFY the line below to test with your actual email
-- SELECT is_user_admin('your-email@example.com') as is_admin_test;
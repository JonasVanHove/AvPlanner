-- Check for orphaned/deleted users that might block signup
-- Run this to see if there are existing users with your test email

-- 1. Check for ALL users (including soft-deleted)
SELECT 
  id,
  email,
  created_at,
  deleted_at,
  email_confirmed_at,
  confirmation_sent_at,
  banned_until,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check specifically for your test email (replace with the email you're trying)
-- UNCOMMENT AND EDIT THE EMAIL BELOW:
-- SELECT 
--   id,
--   email,
--   created_at,
--   deleted_at,
--   email_confirmed_at
-- FROM auth.users
-- WHERE email = 'your-test-email@example.com';

-- 3. If you find a deleted user, clean it up with:
-- DELETE FROM auth.users WHERE email = 'your-test-email@example.com' AND deleted_at IS NOT NULL;

-- 4. Count total users (check if you hit quota)
SELECT COUNT(*) as total_users FROM auth.users WHERE deleted_at IS NULL;

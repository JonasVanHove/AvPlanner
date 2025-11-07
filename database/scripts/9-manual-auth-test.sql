-- Alternative theory: Maybe Supabase Auth is trying to send a confirmation email and failing
-- This creates a user WITHOUT email confirmation requirement (for testing)
-- Run this in Supabase SQL Editor to manually test if auth.users insert works

-- Test 1: Can we directly insert into auth.users? (bypasses the API entirely)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) 
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'manual-test@example.com',
  crypt('test123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Manual","last_name":"Test"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'manual-test@example.com'
);

-- Check if it worked and if our trigger created a profile
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created,
  pu.id as profile_id,
  pu.first_name,
  pu.last_name,
  pu.created_at as profile_created
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE au.email = 'manual-test@example.com';

-- Cleanup (run this after checking results)
-- DELETE FROM auth.users WHERE email = 'manual-test@example.com';

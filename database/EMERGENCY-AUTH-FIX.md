# Emergency Auth Signup Fix - Complete Diagnostic & Solution

## Problem
All signup attempts (public + admin) return 500 "Database error saving new user"

## Root Cause Analysis

Based on the symptoms:
1. Public signup fails with 500
2. Retry without options fails with 500  
3. Admin API signup also fails with 500
4. Trigger exists and is well-formed
5. RLS is disabled
6. Constraints are correct

This points to **one of these issues**:

### Most Likely: Trigger Function Crashes BEFORE Returning
The trigger function is being called but crashes in a way that rollbacks the entire auth.users transaction.

### Other Possibilities:
- Supabase project has corrupted auth schema
- Email confirmation flow is broken (SMTP/mailer issue)
- Project quota exceeded or abuse protection triggered
- auth.users table has a conflicting trigger/constraint we don't see

## IMMEDIATE FIX - Try in Order:

### Fix 1: Disable Trigger Completely (Test)
```sql
-- In Supabase SQL Editor:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

Then try signup. If it works → problem is trigger function. If still fails → problem is deeper.

### Fix 2: Check Email Confirmation Settings
In Supabase Dashboard:
1. Go to Authentication → Settings
2. Find "Enable email confirmations"
3. **Temporarily DISABLE it**
4. Save
5. Try signup again

If this works, the problem is in your email provider config.

### Fix 3: Check Project Quotas
In Supabase Dashboard:
1. Go to Settings → Billing & Usage
2. Check if you've hit any limits on:
   - Database writes
   - Auth signups
   - Storage

### Fix 4: Check Auth Logs for Detail
In Supabase Dashboard:
1. Go to Logs → Auth
2. Filter for last 10 minutes
3. Look for ERROR or WARN entries
4. Share the exact error message

### Fix 5: Recreate Auth User Manually (Bypass Everything)
```sql
-- In Supabase SQL Editor, replace the email:
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',  -- CHANGE THIS
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Test","last_name":"User"}',
  now(),
  now(),
  ''
);

-- Check if user was created:
SELECT email, created_at FROM auth.users WHERE email = 'test@example.com';

-- Create profile manually:
INSERT INTO public.users (id, email, first_name, last_name)
SELECT id, email, 'Test', 'User'
FROM auth.users 
WHERE email = 'test@example.com';
```

If this manual insert works, you can create a temporary UI workaround.

## What to Share

Please share:
1. Result of disabling trigger (Fix 1)
2. Screenshot or text from Auth Logs showing the error detail
3. Your email confirmation setting (enabled/disabled)
4. Whether manual SQL insert (Fix 5) works

Then I can provide the definitive solution.

## Temporary Workaround

If nothing works, you can:
1. Disable email confirmation
2. Create users manually via SQL
3. Or use a custom signup endpoint that bypasses Supabase Auth entirely

Let me know what you find!

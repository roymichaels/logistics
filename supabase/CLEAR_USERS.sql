/*
  # Clear All Users and Registrations

  INSTRUCTIONS:
  1. Open Supabase Dashboard → SQL Editor
  2. Create a new query
  3. Copy and paste this entire SQL script
  4. Click "Run" to execute

  This will:
  - Delete all user registrations
  - Delete all users from the application
  - Delete all auth users
  - Give you a clean slate for TWA authentication
*/

-- Step 1: Delete all user registrations
DELETE FROM user_registrations;

-- Step 2: Delete all users from the application users table
-- This will cascade to related tables due to foreign key constraints
DELETE FROM users;

-- Step 3: Delete all users from Supabase auth
-- Note: This requires running in SQL Editor with service role
DELETE FROM auth.users;

-- Step 4: Verify the cleanup
SELECT
  'users' as table_name,
  COUNT(*) as remaining_records
FROM users
UNION ALL
SELECT
  'user_registrations' as table_name,
  COUNT(*) as remaining_records
FROM user_registrations
UNION ALL
SELECT
  'auth.users' as table_name,
  COUNT(*) as remaining_records
FROM auth.users;

-- You should see 0 for all three tables

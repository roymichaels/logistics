/*
  # Clear All Users from Database

  1. Purpose
    - Remove all existing users from the system
    - Clean slate for fresh user registration
    - Reset both application users and auth users

  2. Actions
    - Delete all records from `users` table
    - Delete all auth users from `auth.users`
    - Cascade deletions will handle related records

  3. Notes
    - This is a destructive operation
    - All user data will be permanently deleted
    - Run only when you want to completely reset the user base
*/

-- Delete all users from the application users table
-- This will cascade to related tables due to foreign key constraints
DELETE FROM users;

-- Delete all users from Supabase auth
-- Note: This requires service role privileges
DELETE FROM auth.users;

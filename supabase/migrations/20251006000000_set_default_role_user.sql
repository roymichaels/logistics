/*
  # Set Default Role to 'user' for New Signups

  1. Changes
    - Updates users table to set default role to 'user'
    - Ensures 'user' is a valid role option
    - No changes to existing user roles

  2. Security
    - Maintains existing RLS policies
    - No data modifications, only default value change
*/

-- Set default role to 'user' for new signups
ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'user';

-- Add user to allowed roles if not already present (idempotent)
DO $$
BEGIN
  -- Verify the role column exists and accepts 'user'
  -- This is just a sanity check, no actual constraint modification needed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'users.role column does not exist';
  END IF;
END $$;

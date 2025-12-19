/*
  # Fix Users Table - Add Missing Columns

  1. Changes
    - Add `name` column for user display name
    - Add `photo_url` column for user avatar
    - Add `global_role` column if not exists (for role management)
    - Add indexes for better query performance
    
  2. Security
    - No RLS changes, existing policies remain active
*/

-- Add name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'name'
  ) THEN
    ALTER TABLE users ADD COLUMN name TEXT;
  END IF;
END $$;

-- Add photo_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE users ADD COLUMN photo_url TEXT;
  END IF;
END $$;

-- Add global_role column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'global_role'
  ) THEN
    ALTER TABLE users ADD COLUMN global_role TEXT DEFAULT 'user';
  END IF;
END $$;

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_global_role ON users(global_role);

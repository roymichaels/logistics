/*
  # Align User Schema for Web3 Authentication

  ## Overview
  This migration adds missing columns to the users table to support Web3 authentication
  and aligns the schema with application expectations.

  ## Changes Made

  1. **New Columns Added to users table**
     - `name` (text, nullable) - Simplified display name for users (derived from display_name or wallet)
     - `username` (text, nullable) - Optional username field for users
     - `role` (text, default 'user') - Primary role field that mirrors global_role for easier access
     - `phone` (text, nullable) - User phone number for auth compatibility
     - `email` (text, nullable) - User email address for auth compatibility

  2. **Data Migration**
     - Populate `name` from existing `display_name` for existing users
     - Populate `role` from existing `global_role` for existing users

  3. **Triggers**
     - Auto-sync `role` with `global_role` to keep them in sync
     - Auto-populate `name` from `display_name` if not provided

  4. **Index Updates**
     - Add index on `name` for efficient lookups
     - Add index on `username` for efficient lookups

  ## Security Notes
  - All existing RLS policies continue to work
  - New columns use the same security model as existing columns
*/

-- Add name column (simplified display name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN name TEXT;
    COMMENT ON COLUMN public.users.name IS 'Simplified display name for users';
  END IF;
END $$;

-- Add username column (optional username)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.users ADD COLUMN username TEXT;
    COMMENT ON COLUMN public.users.username IS 'Optional username for users';
  END IF;
END $$;

-- Add role column (mirrors global_role for easier access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'user';
    COMMENT ON COLUMN public.users.role IS 'Primary role field (synced with global_role)';
  END IF;
END $$;

-- Add phone column (for auth compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.users ADD COLUMN phone TEXT;
    COMMENT ON COLUMN public.users.phone IS 'User phone number';
  END IF;
END $$;

-- Add email column (for auth compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.users ADD COLUMN email TEXT;
    COMMENT ON COLUMN public.users.email IS 'User email address';
  END IF;
END $$;

-- Migrate existing data: populate name from display_name
UPDATE public.users
SET name = COALESCE(display_name, first_name || ' ' || last_name, 'User')
WHERE name IS NULL;

-- Migrate existing data: populate role from global_role
UPDATE public.users
SET role = global_role::text
WHERE role IS NULL OR role = 'user';

-- Create trigger to keep role and global_role in sync
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is being updated, update global_role to match
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.global_role := NEW.role::user_role;
  END IF;

  -- If global_role is being updated, update role to match
  IF NEW.global_role IS DISTINCT FROM OLD.global_role THEN
    NEW.role := NEW.global_role::text;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_user_role_trigger ON public.users;
CREATE TRIGGER sync_user_role_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role();

-- Create trigger to auto-populate name from display_name on insert
CREATE OR REPLACE FUNCTION auto_populate_user_name()
RETURNS TRIGGER AS $$
BEGIN
  -- If name is not provided, derive it from display_name or first/last name
  IF NEW.name IS NULL THEN
    NEW.name := COALESCE(
      NEW.display_name,
      NULLIF(CONCAT_WS(' ', NEW.first_name, NEW.last_name), ''),
      'User'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS auto_populate_user_name_trigger ON public.users;
CREATE TRIGGER auto_populate_user_name_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_user_name();

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role) WHERE role IS NOT NULL;

-- Grant necessary permissions
GRANT SELECT ON public.users TO authenticated;

/*
  # Remove User Role and Default to Owner

  1. Changes
    - Remove 'user' from role constraint
    - Update any existing 'user' roles to 'owner'
    - Set default role to 'owner' for new users

  2. Security
    - Existing RLS policies will work with the updated roles
    - Owner has full access by default
*/

-- Update any existing users with 'user' role to 'owner'
UPDATE users
SET role = 'owner'
WHERE role = 'user';

-- Update any registrations with 'user' assigned_role to 'owner'
UPDATE user_registrations
SET assigned_role = 'owner'
WHERE assigned_role = 'user';

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint without 'user'
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'));

-- Set default role to 'owner'
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'owner';

-- Update user_registrations constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_registrations'
    AND column_name = 'assigned_role'
  ) THEN
    ALTER TABLE user_registrations DROP CONSTRAINT IF EXISTS user_registrations_assigned_role_check;
    ALTER TABLE user_registrations ADD CONSTRAINT user_registrations_assigned_role_check
      CHECK (assigned_role IN ('owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'));
  END IF;
END $$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'User role removed successfully!';
  RAISE NOTICE 'All existing user roles updated to owner';
  RAISE NOTICE 'Default role for new users set to owner';
END $$;

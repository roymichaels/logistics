/*
  # Restore 'user' Role as Default

  1. Changes
    - Add 'user' back to role constraint
    - Set default role to 'user' for new users
    - This is the correct default - users should start unassigned

  2. Security
    - Existing RLS policies continue to work
    - Users with 'user' role have minimal permissions
    - Requires promotion to access system features
*/

-- Add 'user' back to the role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'));

-- Set default role to 'user'
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';

-- Update user_registrations constraint to include 'user'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_registrations'
    AND column_name = 'assigned_role'
  ) THEN
    ALTER TABLE user_registrations DROP CONSTRAINT IF EXISTS user_registrations_assigned_role_check;
    ALTER TABLE user_registrations ADD CONSTRAINT user_registrations_assigned_role_check
      CHECK (assigned_role IN ('user', 'owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'));
  END IF;
END $$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ User role restored to schema!';
  RAISE NOTICE '✅ Default role for new users set to: user';
  RAISE NOTICE 'ℹ️  Existing users keep their current roles';
END $$;

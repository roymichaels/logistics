/*
  # Set Default Role to Manager for All New Users

  1. Changes
    - Alter users table to set DEFAULT role = 'manager'
    - Update any existing 'user' role to 'manager'
    - Ensures all new users automatically get manager access

  2. Security
    - Maintains existing RLS policies
    - Only affects role assignment, not permissions structure
*/

-- Set default role for new users to 'manager'
ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'manager';

-- Update all existing users with role 'user' to 'manager'
UPDATE users
SET role = 'manager', updated_at = now()
WHERE role = 'user';

-- Log the change
DO $$
BEGIN
  RAISE NOTICE '✅ Default user role changed to: manager';
  RAISE NOTICE '✅ All existing "user" roles updated to: manager';
END $$;

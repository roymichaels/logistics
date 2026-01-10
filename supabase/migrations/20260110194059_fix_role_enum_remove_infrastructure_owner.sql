/*
  # Fix Role Enum - Remove infrastructure_owner

  1. Changes
    - Remove infrastructure_owner from profiles role check constraint
    - Update to canonical role model: superadmin, admin, business_owner, manager, warehouse, dispatcher, sales, customer_service, driver, customer, guest
    - Update any existing infrastructure_owner profiles to superadmin

  2. Security
    - Maintains all existing RLS policies
    - No data loss - migrates existing infrastructure_owner users to superadmin
*/

-- Update any existing infrastructure_owner users to superadmin
UPDATE profiles
SET role = 'superadmin'
WHERE role = 'infrastructure_owner';

-- Drop the old constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new constraint with the correct role enum
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('superadmin', 'admin', 'business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service', 'driver', 'customer', 'guest'));

-- Update the default value
ALTER TABLE profiles
ALTER COLUMN role SET DEFAULT 'customer';

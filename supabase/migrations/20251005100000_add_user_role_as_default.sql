/*
  # Add 'user' Role as Default for New Users

  1. Problem
    - New users launching the app have no appropriate starting role
    - 'driver' role has specific permissions that may not apply to all users
    - Need a generic 'user' role for new sign-ups

  2. Changes
    - Add 'user' to the valid roles list
    - This becomes the default role for auto-registration
    - Users can be promoted to specific roles (driver, manager, etc.) later

  3. Role Hierarchy
    - 'user' - Default role for all new users (lowest privilege)
    - 'driver', 'warehouse', 'sales', 'customer_service' - Operational roles
    - 'dispatcher', 'manager' - Management roles
    - 'business_owner' - Business equity holder
    - 'infrastructure_owner' - Platform administrator
*/

-- Update users table role constraint to include 'user'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'));

-- Update business_users table role constraint to include 'user'
ALTER TABLE business_users DROP CONSTRAINT IF EXISTS business_users_role_check;
ALTER TABLE business_users ADD CONSTRAINT business_users_role_check
  CHECK (role IN ('user', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'));

-- Note: New users will be auto-created with role='user' by the application
-- Managers/Owners can then promote users to appropriate roles

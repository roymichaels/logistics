/*
  # Add Owner Role to Users Table

  1. Changes
    - Update the role constraint on users table to include 'owner' role
    - This allows users to be assigned as system owners/administrators
    
  2. Security
    - No changes to RLS policies
    - Existing policies will work with the new role
*/

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with 'owner' included
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('user', 'owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'));
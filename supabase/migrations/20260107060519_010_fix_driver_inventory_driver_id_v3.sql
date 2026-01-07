/*
  # Fix driver_inventory table driver_id column

  ## Problem
  The driver_inventory table still references profiles(id) as UUID,
  but drivers are now identified by wallet addresses (TEXT).

  ## Changes
  - Drop all RLS policies on driver_inventory
  - Drop foreign key constraint from driver_inventory
  - Change driver_id from UUID to TEXT  
  - Add foreign key to driver_profiles(id)
  - Recreate RLS policies

  ## Notes
  - This completes the driver_id migration across all driver-related tables
*/

-- Step 1: Drop ALL RLS policies on driver_inventory
DROP POLICY IF EXISTS "Drivers can view own inventory" ON driver_inventory;
DROP POLICY IF EXISTS "Warehouse staff can manage driver inventory" ON driver_inventory;
DROP POLICY IF EXISTS "Drivers can manage own inventory" ON driver_inventory;
DROP POLICY IF EXISTS "Drivers can update own inventory" ON driver_inventory;
DROP POLICY IF EXISTS "Business owners can view driver inventory" ON driver_inventory;
DROP POLICY IF EXISTS "Business staff can manage driver inventory" ON driver_inventory;

-- Step 2: Drop existing foreign key
ALTER TABLE driver_inventory DROP CONSTRAINT IF EXISTS driver_inventory_driver_id_fkey;

-- Step 3: Change column type
ALTER TABLE driver_inventory ALTER COLUMN driver_id TYPE text USING driver_id::text;

-- Step 4: Add new foreign key to driver_profiles
ALTER TABLE driver_inventory ADD CONSTRAINT driver_inventory_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

-- Step 5: Recreate indexes
DROP INDEX IF EXISTS driver_inventory_driver_id_idx;
CREATE INDEX driver_inventory_driver_id_idx ON driver_inventory(driver_id);

-- Step 6: Recreate RLS policies
CREATE POLICY "Drivers can view own inventory"
  ON driver_inventory FOR SELECT
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Warehouse staff can manage driver inventory"
  ON driver_inventory FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM driver_profiles dp
      JOIN businesses b ON dp.business_id = b.id
      JOIN user_business_roles ubr ON ubr.business_id = b.id
      WHERE dp.id = driver_inventory.driver_id
      AND ubr.user_id = auth.uid()
      AND ubr.role = 'warehouse'
      AND ubr.active = true
    )
  );

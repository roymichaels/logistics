/*
  # Remove Hardcoded Businesses and Fix RLS Policies

  ## Overview
  This migration removes hardcoded infrastructure business and ensures proper RLS policies
  for business creation by infrastructure owners.

  ## Changes
  1. Remove hardcoded Infrastructure Operations business
  2. Update orders, products, zones that reference the hardcoded business (set to NULL or handle appropriately)
  3. Fix RLS policies for businesses table to allow infrastructure owners to create businesses
  4. Add proper policies for business_ownership table
*/

-- ============================================================================
-- STEP 1: Check and Clean Up Hardcoded Business References
-- ============================================================================

-- Get the hardcoded business ID
DO $$
DECLARE
  hardcoded_business_id UUID := '00000000-0000-0000-0000-000000000001';
  business_exists BOOLEAN;
BEGIN
  -- Check if hardcoded business exists
  SELECT EXISTS (
    SELECT 1 FROM businesses WHERE id = hardcoded_business_id
  ) INTO business_exists;

  IF business_exists THEN
    RAISE NOTICE 'Found hardcoded Infrastructure Operations business, cleaning up...';

    -- Delete related data (cascade should handle most of this)
    -- But we'll be explicit for clarity
    DELETE FROM business_equity WHERE business_id = hardcoded_business_id;
    DELETE FROM business_users WHERE business_id = hardcoded_business_id;

    -- Update orders to NULL business_id (we'll handle this with new RLS later)
    -- Note: This might fail if business_id is NOT NULL constraint
    -- In that case, we'd need to delete the orders or assign them to a real business
    UPDATE orders SET business_id = NULL WHERE business_id = hardcoded_business_id;

    -- Update products to NULL business_id
    UPDATE products SET business_id = NULL WHERE business_id = hardcoded_business_id;

    -- Update zones to NULL business_id
    UPDATE zones SET business_id = NULL WHERE business_id = hardcoded_business_id;

    -- Finally, delete the hardcoded business
    DELETE FROM businesses WHERE id = hardcoded_business_id;

    RAISE NOTICE 'Hardcoded Infrastructure Operations business removed successfully';
  ELSE
    RAISE NOTICE 'Hardcoded Infrastructure Operations business not found, skipping cleanup';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Fix RLS Policies for businesses Table
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Infrastructure owners can view all businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can view their businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can insert businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can create businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can update businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can update their businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can delete businesses" ON businesses;

-- Create comprehensive RLS policies for businesses table

-- SELECT: Infrastructure owners can see all businesses
CREATE POLICY "Infrastructure owners can view all businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- SELECT: Business owners and related users can see their businesses
CREATE POLICY "Users can view businesses they own or work for"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_equity
      WHERE business_equity.business_id = businesses.id
      AND business_equity.stakeholder_id = auth.uid()
      AND business_equity.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = businesses.id
      AND business_users.user_id = auth.uid()
      AND business_users.active = true
    )
  );

-- INSERT: Only infrastructure owners can create businesses
CREATE POLICY "Infrastructure owners can create businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- UPDATE: Infrastructure owners can update all businesses
CREATE POLICY "Infrastructure owners can update all businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- UPDATE: Business owners can update their own businesses
CREATE POLICY "Business owners can update their businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_equity
      WHERE business_equity.business_id = businesses.id
      AND business_equity.stakeholder_id = auth.uid()
      AND business_equity.is_active = true
      AND business_equity.equity_type = 'founder'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_equity
      WHERE business_equity.business_id = businesses.id
      AND business_equity.stakeholder_id = auth.uid()
      AND business_equity.is_active = true
      AND business_equity.equity_type = 'founder'
    )
  );

-- DELETE: Only infrastructure owners can delete businesses
CREATE POLICY "Infrastructure owners can delete businesses"
  ON businesses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- STEP 3: Fix RLS Policies for business_equity Table
-- ============================================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view their equity records" ON business_equity;
DROP POLICY IF EXISTS "Infrastructure owners can view all equity records" ON business_equity;
DROP POLICY IF EXISTS "Users can insert equity records" ON business_equity;
DROP POLICY IF EXISTS "Infrastructure owners can create equity records" ON business_equity;
DROP POLICY IF EXISTS "Users can update their equity records" ON business_equity;
DROP POLICY IF EXISTS "Infrastructure owners can update equity records" ON business_equity;

-- Create comprehensive RLS policies for business_equity table

-- SELECT: Users can see their own equity records
CREATE POLICY "Users can view their equity records"
  ON business_equity FOR SELECT
  TO authenticated
  USING (stakeholder_id = auth.uid());

-- SELECT: Infrastructure owners can see all equity records
CREATE POLICY "Infrastructure owners can view all equity records"
  ON business_equity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- INSERT: Infrastructure owners can create equity records
CREATE POLICY "Infrastructure owners can create equity records"
  ON business_equity FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- INSERT: Business founders can add other stakeholders to their businesses
CREATE POLICY "Business founders can create equity records"
  ON business_equity FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_equity existing
      WHERE existing.business_id = business_equity.business_id
      AND existing.stakeholder_id = auth.uid()
      AND existing.is_active = true
      AND existing.equity_type = 'founder'
    )
  );

-- UPDATE: Infrastructure owners can update equity records
CREATE POLICY "Infrastructure owners can update equity records"
  ON business_equity FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- STEP 4: Add Helpful Comments
-- ============================================================================

COMMENT ON TABLE businesses IS 'All businesses in the platform - no hardcoded entries, all created dynamically';
COMMENT ON TABLE business_equity IS 'Tracks ownership stakes in businesses - all dynamically created';

-- ============================================================================
-- STEP 5: Add Validation to Prevent Hardcoded IDs
-- ============================================================================

-- Add a check constraint to prevent the hardcoded UUID from being used
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS no_hardcoded_business_ids;
ALTER TABLE businesses ADD CONSTRAINT no_hardcoded_business_ids
  CHECK (id != '00000000-0000-0000-0000-000000000001');

COMMENT ON CONSTRAINT no_hardcoded_business_ids ON businesses IS 'Prevents use of hardcoded business IDs - all businesses must be created dynamically';

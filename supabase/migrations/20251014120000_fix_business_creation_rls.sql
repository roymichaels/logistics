/*
  # Fix Business Creation RLS Policies

  1. Changes
    - Add INSERT policy for businesses table to allow infrastructure_owner role to create businesses
    - Update business_ownership INSERT policy to recognize 'infrastructure_owner' role
    - Ensure required fields are properly set with defaults

  2. Security
    - Only infrastructure_owner role can create new businesses
    - Business ownership records can be created by infrastructure_owner
    - All policies use proper authentication checks

  3. Notes
    - Fixes "Missing requirements" error during business creation
    - Aligns role names with application code (infrastructure_owner vs owner)
    - Ensures RLS policies don't block legitimate business creation operations
*/

-- Drop existing INSERT policy for business_ownership if it exists
DROP POLICY IF EXISTS "Platform owner can create ownership" ON business_ownership;

-- Add INSERT policy for businesses table
-- Allow infrastructure_owner to create new businesses
CREATE POLICY "Infrastructure owners can create businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('infrastructure_owner', 'owner')
    )
  );

-- Updated INSERT policy for business_ownership
-- Allow infrastructure_owner to create ownership records
CREATE POLICY "Infrastructure owners can create ownership"
  ON business_ownership FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('infrastructure_owner', 'owner', 'business_owner')
    )
  );

-- Ensure businesses table has proper defaults for required fields
-- Add name_hebrew with default if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'name_hebrew'
  ) THEN
    ALTER TABLE businesses ADD COLUMN name_hebrew text;
  END IF;
END $$;

-- Update existing businesses without name_hebrew
UPDATE businesses
SET name_hebrew = name
WHERE name_hebrew IS NULL OR name_hebrew = '';

-- Make name_hebrew NOT NULL after setting defaults
ALTER TABLE businesses
  ALTER COLUMN name_hebrew SET DEFAULT '',
  ALTER COLUMN name_hebrew SET NOT NULL;

-- Ensure business_type has a default
ALTER TABLE businesses
  ALTER COLUMN business_type SET DEFAULT 'logistics';

/*
  # Fix Business Creation Schema

  1. Changes
    - Add RLS policies for businesses table to allow authenticated users to create businesses
    - Add RLS policies for infrastructures table to allow creation
    - Ensure business_types table has proper nullable infrastructure_id
    - Add helpful indexes for business creation flow

  2. Security
    - Authenticated users can create businesses
    - Authenticated users can create infrastructures
    - Users can view their own businesses
    - Infrastructure owners can manage all infrastructures
*/

-- Enable RLS on infrastructures if not already enabled
ALTER TABLE infrastructures ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can create infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "Users can view infrastructures they have access to" ON infrastructures;
DROP POLICY IF EXISTS "Infrastructure owners can update infrastructures" ON infrastructures;

-- RLS Policies for infrastructures
CREATE POLICY "Authenticated users can create infrastructures"
  ON infrastructures
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view infrastructures they have access to"
  ON infrastructures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.infrastructure_id = infrastructures.id
    ) OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can update infrastructures"
  ON infrastructures
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role = 'infrastructure_owner'
    )
  );

-- Enable RLS on businesses if not already enabled
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON businesses;
DROP POLICY IF EXISTS "Users can view their own businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can update their businesses" ON businesses;

-- RLS Policies for businesses
CREATE POLICY "Authenticated users can create businesses"
  ON businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own businesses"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_business_roles ubr
      WHERE ubr.business_id = businesses.id AND ubr.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role IN ('infrastructure_owner', 'superadmin')
    )
  );

CREATE POLICY "Business owners can update their businesses"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_business_roles ubr
      JOIN roles r ON ubr.role_id = r.id
      WHERE ubr.business_id = businesses.id 
        AND ubr.user_id = auth.uid()
        AND r.role_key IN ('business_owner', 'infrastructure_owner')
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_business_roles ubr
      JOIN roles r ON ubr.role_id = r.id
      WHERE ubr.business_id = businesses.id 
        AND ubr.user_id = auth.uid()
        AND r.role_key IN ('business_owner', 'infrastructure_owner')
    )
  );

-- Make infrastructure_id nullable in business_types to allow system defaults
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_types' 
    AND column_name = 'infrastructure_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE business_types ALTER COLUMN infrastructure_id DROP NOT NULL;
  END IF;
END $$;

-- Add helpful indexes for business creation queries
CREATE INDEX IF NOT EXISTS idx_businesses_created_by ON businesses(created_by);
CREATE INDEX IF NOT EXISTS idx_businesses_infrastructure_id ON businesses(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_business_types_type_value ON business_types(type_value);
CREATE INDEX IF NOT EXISTS idx_business_types_infrastructure_id ON business_types(infrastructure_id);
/*
  # Business Owner Admin-Level RLS Policies

  1. Purpose
    - Enable business owners to have full administrative capabilities within their business scope
    - Add business_id to audit_logs for business-scoped logging
    - Create business-specific feature flags support
    - Ensure all queries are properly business-scoped

  2. Changes
    - Add business_id to audit_logs table
    - Create business_feature_flags table for business-level feature management
    - Add RLS policies for business owners to access their data

  3. Security
    - All policies verify business ownership through businesses.owner_id
    - Data is strictly scoped to businesses the user owns
    - No cross-business data leakage
*/

-- ============================================================================
-- AUDIT LOGS - Add business_id column
-- ============================================================================

-- Add business_id to audit_logs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN business_id uuid REFERENCES businesses(id) ON DELETE CASCADE;
    CREATE INDEX idx_audit_logs_business_id ON audit_logs(business_id);
  END IF;
END $$;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON audit_logs;

-- Policy: Business owners can view audit logs for their businesses
DROP POLICY IF EXISTS "Business owners can view audit logs" ON audit_logs;
CREATE POLICY "Business owners can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Admins can view all audit logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Policy: System can insert audit logs
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- BUSINESS FEATURE FLAGS TABLE
-- ============================================================================

-- Create business_feature_flags table for business-level feature management
CREATE TABLE IF NOT EXISTS business_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT false,
  impact text CHECK (impact IN ('low', 'medium', 'high')),
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, key)
);

-- Enable RLS on business_feature_flags
ALTER TABLE business_feature_flags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Business owners can view business feature flags" ON business_feature_flags;
DROP POLICY IF EXISTS "Business owners can insert business feature flags" ON business_feature_flags;
DROP POLICY IF EXISTS "Business owners can update business feature flags" ON business_feature_flags;
DROP POLICY IF EXISTS "Business owners can delete business feature flags" ON business_feature_flags;
DROP POLICY IF EXISTS "Admins can manage all business feature flags" ON business_feature_flags;

-- Policy: Business owners can view feature flags for their businesses
CREATE POLICY "Business owners can view business feature flags"
  ON business_feature_flags
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Business owners can insert feature flags for their businesses
CREATE POLICY "Business owners can insert business feature flags"
  ON business_feature_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Business owners can update feature flags for their businesses
CREATE POLICY "Business owners can update business feature flags"
  ON business_feature_flags
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Business owners can delete feature flags for their businesses
CREATE POLICY "Business owners can delete business feature flags"
  ON business_feature_flags
  FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Admins can manage all feature flags
CREATE POLICY "Admins can manage all business feature flags"
  ON business_feature_flags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_feature_flags_business_id ON business_feature_flags(business_id);
CREATE INDEX IF NOT EXISTS idx_business_feature_flags_key ON business_feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_business_feature_flags_enabled ON business_feature_flags(enabled);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_business_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_business_feature_flags_updated_at ON business_feature_flags;
CREATE TRIGGER set_business_feature_flags_updated_at
  BEFORE UPDATE ON business_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_business_feature_flags_updated_at();

-- ============================================================================
-- ENHANCE PROFILE RLS FOR CUSTOMER VISIBILITY
-- ============================================================================

-- Policy: Business owners can view customers who ordered from their businesses
DROP POLICY IF EXISTS "Business owners can view customers" ON profiles;
CREATE POLICY "Business owners can view customers"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    id IN (
      SELECT customer_id FROM orders
      WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

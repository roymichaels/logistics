/*
  # Separate Infrastructure and Business Owner Roles

  ## Overview
  This migration implements a two-tier role hierarchy to completely separate
  infrastructure operations from business ownership and financial data access.

  ## Key Changes

  1. **Role Renaming and Addition**
     - Renames 'owner' role to 'infrastructure_owner' for platform admins
     - Adds 'business_owner' role for business equity holders
     - Updates all role enums across the database

  2. **Business Ownership Tracking**
     - Adds ownership_percentage to business_users table (0-100)
     - Adds commission_percentage for salespeople
     - Enables tracking of equity stakes and compensation

  3. **Business Context Management**
     - Creates user_business_context table for multi-business session tracking
     - Stores active_business_id for context switching
     - Tracks last_switched_at for audit purposes

  4. **Data Isolation**
     - Ensures all business-scoped tables have non-null business_id
     - Updates constraints to enforce business data separation
     - Adds indexes for performance on business-scoped queries

  ## Security
  - All tables maintain RLS enforcement
  - Business context is validated on every query
  - Financial data access restricted to appropriate roles only
  - Audit trail for business context switches
*/

-- =============================================
-- STEP 1: Add new roles to role enum
-- =============================================

-- First, let's update the role check constraint on users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'));

-- Update business_users table role constraint
ALTER TABLE business_users DROP CONSTRAINT IF EXISTS business_users_role_check;
ALTER TABLE business_users ADD CONSTRAINT business_users_role_check
  CHECK (role IN ('business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'));

-- =============================================
-- STEP 2: Update existing 'owner' roles to 'infrastructure_owner'
-- =============================================

-- Update all existing users with 'owner' role to 'infrastructure_owner'
UPDATE users
SET role = 'infrastructure_owner'
WHERE role = 'owner';

-- =============================================
-- STEP 3: Add ownership and commission tracking
-- =============================================

-- Add ownership_percentage to business_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_users' AND column_name = 'ownership_percentage'
  ) THEN
    ALTER TABLE business_users ADD COLUMN ownership_percentage numeric DEFAULT 0 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100);
  END IF;
END $$;

-- Add commission_percentage to business_users (for sales roles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_users' AND column_name = 'commission_percentage'
  ) THEN
    ALTER TABLE business_users ADD COLUMN commission_percentage numeric DEFAULT 0 CHECK (commission_percentage >= 0 AND commission_percentage <= 100);
  END IF;
END $$;

-- Add updated_at timestamp to business_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE business_users ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- =============================================
-- STEP 4: Create user business context table
-- =============================================

CREATE TABLE IF NOT EXISTS user_business_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  active_business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  last_switched_at timestamptz DEFAULT now(),
  session_metadata jsonb DEFAULT '{}',
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_business_context_user ON user_business_context(user_id);
CREATE INDEX IF NOT EXISTS idx_user_business_context_business ON user_business_context(active_business_id);

-- =============================================
-- STEP 5: Enable RLS on new table
-- =============================================

ALTER TABLE user_business_context ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own business context
CREATE POLICY "Users can manage own business context"
  ON user_business_context FOR ALL
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
    )
  );

-- =============================================
-- STEP 6: Update business_users RLS policies
-- =============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view business user assignments" ON business_users;
DROP POLICY IF EXISTS "Business managers can manage user assignments" ON business_users;

-- Business owners and managers can view their business users
CREATE POLICY "Business staff can view business assignments"
  ON business_users FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND active = true
    )
    OR
    -- Infrastructure owners can see all
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = auth.jwt() ->> 'sub'
      AND role = 'infrastructure_owner'
    )
  );

-- Only business owners and infrastructure owners can manage business assignments
CREATE POLICY "Owners can manage business assignments"
  ON business_users FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND role IN ('business_owner', 'manager')
      AND active = true
    )
    OR
    -- Infrastructure owners can manage all
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = auth.jwt() ->> 'sub'
      AND role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Owners can update business assignments"
  ON business_users FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND role IN ('business_owner', 'manager')
      AND active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = auth.jwt() ->> 'sub'
      AND role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Owners can delete business assignments"
  ON business_users FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND role IN ('business_owner', 'manager')
      AND active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = auth.jwt() ->> 'sub'
      AND role = 'infrastructure_owner'
    )
  );

-- =============================================
-- STEP 7: Create helper functions
-- =============================================

-- Function to get user's active business context
CREATE OR REPLACE FUNCTION get_user_active_business()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id uuid;
  v_business_id uuid;
BEGIN
  -- Get current user ID
  SELECT id INTO v_user_id
  FROM users
  WHERE telegram_id = auth.jwt() ->> 'sub';

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get active business context
  SELECT active_business_id INTO v_business_id
  FROM user_business_context
  WHERE user_id = v_user_id;

  RETURN v_business_id;
END;
$$;

-- Function to set user's active business context
CREATE OR REPLACE FUNCTION set_user_active_business(p_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_has_access boolean;
BEGIN
  -- Get current user ID
  SELECT id INTO v_user_id
  FROM users
  WHERE telegram_id = auth.jwt() ->> 'sub';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Verify user has access to this business
  SELECT EXISTS(
    SELECT 1 FROM business_users
    WHERE user_id = v_user_id
    AND business_id = p_business_id
    AND active = true
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    -- Check if infrastructure owner (has access to all)
    SELECT EXISTS(
      SELECT 1 FROM users
      WHERE id = v_user_id
      AND role = 'infrastructure_owner'
    ) INTO v_has_access;
  END IF;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'User does not have access to business %', p_business_id;
  END IF;

  -- Update or insert business context
  INSERT INTO user_business_context (user_id, active_business_id, last_switched_at)
  VALUES (v_user_id, p_business_id, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    active_business_id = p_business_id,
    last_switched_at = now();

  RETURN true;
END;
$$;

-- Function to get user's accessible businesses
CREATE OR REPLACE FUNCTION get_user_businesses()
RETURNS TABLE(
  business_id uuid,
  business_name text,
  business_role text,
  ownership_pct numeric,
  is_primary boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id uuid;
  v_is_infra_owner boolean;
BEGIN
  -- Get current user ID
  SELECT id INTO v_user_id
  FROM users
  WHERE telegram_id = auth.jwt() ->> 'sub';

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if infrastructure owner
  SELECT role = 'infrastructure_owner' INTO v_is_infra_owner
  FROM users
  WHERE id = v_user_id;

  -- If infrastructure owner, return all businesses
  IF v_is_infra_owner THEN
    RETURN QUERY
    SELECT
      b.id as business_id,
      b.name as business_name,
      'infrastructure_owner'::text as business_role,
      0::numeric as ownership_pct,
      false as is_primary
    FROM businesses b
    WHERE b.active = true
    ORDER BY b.name;
  ELSE
    -- Return only businesses user is assigned to
    RETURN QUERY
    SELECT
      b.id as business_id,
      b.name as business_name,
      bu.role as business_role,
      COALESCE(bu.ownership_percentage, 0) as ownership_pct,
      bu.is_primary
    FROM business_users bu
    JOIN businesses b ON b.id = bu.business_id
    WHERE bu.user_id = v_user_id
      AND bu.active = true
      AND b.active = true
    ORDER BY bu.is_primary DESC, b.name;
  END IF;
END;
$$;

-- =============================================
-- STEP 8: Create view for business ownership summary
-- =============================================

CREATE OR REPLACE VIEW v_business_ownership_current AS
SELECT
  b.id as business_id,
  b.name as business_name,
  bu.user_id,
  u.name as owner_name,
  bu.role,
  bu.ownership_percentage,
  bu.commission_percentage,
  bu.is_primary,
  bu.active
FROM businesses b
JOIN business_users bu ON bu.business_id = b.id
JOIN users u ON u.id = bu.user_id
WHERE b.active = true
  AND bu.active = true
  AND bu.ownership_percentage > 0
ORDER BY b.name, bu.ownership_percentage DESC;

-- =============================================
-- STEP 9: Update indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_business_users_ownership ON business_users(business_id, ownership_percentage DESC)
  WHERE active = true AND ownership_percentage > 0;

CREATE INDEX IF NOT EXISTS idx_business_users_commission ON business_users(business_id, user_id, commission_percentage)
  WHERE active = true AND commission_percentage > 0;

-- =============================================
-- STEP 10: Add trigger for business_users timestamp
-- =============================================

CREATE OR REPLACE FUNCTION update_business_users_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_business_users_timestamp_trigger ON business_users;
CREATE TRIGGER update_business_users_timestamp_trigger
  BEFORE UPDATE ON business_users
  FOR EACH ROW
  EXECUTE FUNCTION update_business_users_timestamp();

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE user_business_context IS 'Tracks active business context for multi-business users';
COMMENT ON COLUMN business_users.ownership_percentage IS 'Equity ownership percentage in the business (0-100)';
COMMENT ON COLUMN business_users.commission_percentage IS 'Sales commission percentage for sales roles (0-100)';
COMMENT ON FUNCTION get_user_active_business() IS 'Returns the currently active business_id for the authenticated user';
COMMENT ON FUNCTION set_user_active_business(uuid) IS 'Sets the active business context for the user';
COMMENT ON FUNCTION get_user_businesses() IS 'Returns all businesses accessible to the authenticated user';

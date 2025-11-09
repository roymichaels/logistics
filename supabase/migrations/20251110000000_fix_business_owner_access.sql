/*
  # Fix Business Owner Access to Business Data

  ## Overview
  This migration fixes RLS policies to ensure business_owner role can properly
  access and manage their business data including equity, orders, products, and team members.

  ## Key Changes
  1. Business Access Policies
     - Allow business owners to view businesses where they have equity
     - Allow business owners to update their own business settings
     - Enable business context queries

  2. Business Equity Policies
     - Business owners can view all equity records for their businesses
     - Business owners can manage equity for their businesses
     - Stakeholders can view their own equity records

  3. Business Ownership Policies (Legacy)
     - Maintain backward compatibility with old ownership table
     - Allow business owners to view ownership records

  4. Orders, Products, and Inventory
     - Business owners can manage all data within their businesses
     - Proper isolation between different businesses

  ## Security Model
  - Business owners can only access data for businesses where they have equity
  - Infrastructure owners maintain cross-business access
  - Service role has full access for system operations
*/

-- =====================================================
-- 1. BUSINESSES TABLE POLICIES
-- =====================================================

-- Drop existing conflicting policies if any
DROP POLICY IF EXISTS "Business owners can view their businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners view own businesses via equity" ON businesses;

-- Business owners can view businesses where they have equity
CREATE POLICY "Business owners can view businesses via equity"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    -- Infrastructure owners can see all
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    -- Business owners can see businesses where they have equity
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = businesses.id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
    OR
    -- Also check legacy business_ownership table
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_ownership bo
        WHERE bo.business_id = businesses.id
          AND bo.owner_user_id = auth.uid()
          AND bo.active = true
      )
    )
    OR
    -- Check user_business_roles table
    EXISTS (
      SELECT 1 FROM user_business_roles ubr
      WHERE ubr.business_id = businesses.id
        AND ubr.user_id = auth.uid()
        AND ubr.is_active = true
    )
  );

-- Business owners can update their businesses
CREATE POLICY "Business owners can update their businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = businesses.id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = businesses.id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
  );

-- =====================================================
-- 2. BUSINESS_EQUITY TABLE POLICIES
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE business_equity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Business owners can view equity" ON business_equity;
DROP POLICY IF EXISTS "Stakeholders can view own equity" ON business_equity;
DROP POLICY IF EXISTS "Business owners can manage equity" ON business_equity;

-- Business owners and stakeholders can view equity records
CREATE POLICY "Business owners and stakeholders can view equity"
  ON business_equity FOR SELECT
  TO authenticated
  USING (
    -- Infrastructure owners see all
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    -- Business owners can see equity for their businesses
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be2
        WHERE be2.business_id = business_equity.business_id
          AND be2.stakeholder_id = auth.uid()
          AND be2.is_active = true
      )
    )
    OR
    -- Stakeholders can see their own equity
    stakeholder_id = auth.uid()
  );

-- Business owners can insert equity records
CREATE POLICY "Business owners can insert equity"
  ON business_equity FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = business_equity.business_id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
  );

-- Business owners can update equity records
CREATE POLICY "Business owners can update equity"
  ON business_equity FOR UPDATE
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = business_equity.business_id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = business_equity.business_id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
  );

-- Service role full access
CREATE POLICY "Service role full access on business_equity"
  ON business_equity FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 3. BUSINESS_OWNERSHIP TABLE POLICIES (Legacy)
-- =====================================================

-- Enable RLS if not already enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_ownership') THEN
    ALTER TABLE business_ownership ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can view their ownership" ON business_ownership;
DROP POLICY IF EXISTS "Business owners view ownership records" ON business_ownership;

-- Recreate with proper checks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_ownership') THEN
    EXECUTE 'CREATE POLICY "Business owners can view ownership records"
      ON business_ownership FOR SELECT
      TO authenticated
      USING (
        auth.jwt()->>' || quote_literal('role') || ' = ' || quote_literal('infrastructure_owner') || '
        OR auth.jwt()->>' || quote_literal('global_role') || ' = ' || quote_literal('infrastructure_owner') || '
        OR owner_user_id = auth.uid()
      )';
  END IF;
END $$;

-- =====================================================
-- 4. EQUITY_TRANSACTIONS TABLE POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE equity_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Business owners view equity transactions" ON equity_transactions;
DROP POLICY IF EXISTS "Stakeholders view own transactions" ON equity_transactions;

-- Business owners and stakeholders can view transactions
CREATE POLICY "Business owners and stakeholders can view equity transactions"
  ON equity_transactions FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = equity_transactions.business_id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
    OR
    to_stakeholder_id = auth.uid()
    OR
    from_stakeholder_id = auth.uid()
  );

-- Business owners can insert transactions
CREATE POLICY "Business owners can insert equity transactions"
  ON equity_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = equity_transactions.business_id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
  );

-- Service role full access
CREATE POLICY "Service role full access on equity transactions"
  ON equity_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 5. PROFIT_DISTRIBUTIONS TABLE POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE profit_distributions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Business owners view profit distributions" ON profit_distributions;
DROP POLICY IF EXISTS "Stakeholders view own distributions" ON profit_distributions;

-- Business owners and stakeholders can view distributions
CREATE POLICY "Business owners and stakeholders can view distributions"
  ON profit_distributions FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = profit_distributions.business_id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
    OR
    stakeholder_id = auth.uid()
  );

-- Business owners can manage distributions
CREATE POLICY "Business owners can manage profit distributions"
  ON profit_distributions FOR ALL
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = profit_distributions.business_id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = profit_distributions.business_id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
  );

-- Service role full access
CREATE POLICY "Service role full access on profit distributions"
  ON profit_distributions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 6. BUSINESS_SETTINGS_EXTENDED TABLE POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE business_settings_extended ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Business owners manage settings" ON business_settings_extended;

-- Business owners can manage settings
CREATE POLICY "Business owners can manage business settings"
  ON business_settings_extended FOR ALL
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = business_settings_extended.business_id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = business_settings_extended.business_id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
  );

-- Service role full access
CREATE POLICY "Service role full access on business settings"
  ON business_settings_extended FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 7. USER_BUSINESS_ROLES TABLE POLICIES
-- =====================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Business owners view team members" ON user_business_roles;

-- Business owners can view their team
CREATE POLICY "Business owners can view their business team"
  ON user_business_roles FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND EXISTS (
        SELECT 1 FROM business_equity be
        WHERE be.business_id = user_business_roles.business_id
          AND be.stakeholder_id = auth.uid()
          AND be.is_active = true
      )
    )
    OR
    user_id = auth.uid()
  );

-- =====================================================
-- 8. HELPER FUNCTION FOR CHECKING BUSINESS OWNERSHIP
-- =====================================================

-- Function to check if user owns a business
CREATE OR REPLACE FUNCTION is_business_owner(p_user_id uuid, p_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has equity in the business
  RETURN EXISTS (
    SELECT 1 FROM business_equity be
    WHERE be.business_id = p_business_id
      AND be.stakeholder_id = p_user_id
      AND be.is_active = true
  ) OR EXISTS (
    -- Check legacy ownership table
    SELECT 1 FROM business_ownership bo
    WHERE bo.business_id = p_business_id
      AND bo.owner_user_id = p_user_id
      AND bo.active = true
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_business_owner(uuid, uuid) TO authenticated;

-- =====================================================
-- 9. ORDERS TABLE POLICY FOR BUSINESS OWNERS
-- =====================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Business owners view business orders" ON orders;

-- Business owners can view orders for their businesses
CREATE POLICY "Business owners can view their business orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND is_business_owner(auth.uid(), business_id)
    )
    OR
    created_by = auth.uid()
    OR
    assigned_driver = auth.uid()
  );

-- Business owners can manage orders
CREATE POLICY "Business owners can manage their business orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND is_business_owner(auth.uid(), business_id)
    )
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR auth.jwt()->>'global_role' = 'infrastructure_owner'
    OR
    (
      (auth.jwt()->>'role' = 'business_owner' OR auth.jwt()->>'global_role' = 'business_owner')
      AND is_business_owner(auth.uid(), business_id)
    )
  );

-- =====================================================
-- 10. GRANT PERMISSIONS FOR SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Grant execute permissions for equity functions
GRANT EXECUTE ON FUNCTION get_business_equity_breakdown(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_available_equity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION record_equity_transaction(uuid, uuid, uuid, uuid, numeric, text, text, text, numeric, uuid) TO authenticated;

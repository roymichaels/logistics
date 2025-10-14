/*
  # Fix Remaining Recursive Policies

  ## Problem
  Some policies on orders and stock_allocations still query the users table directly,
  which can cause recursion issues.

  ## Solution
  Replace direct users table queries with JWT-based checks using is_infra_owner_from_jwt()

  ## Security
  - Maintains same security level
  - Uses JWT claims which are cryptographically signed
*/

-- ============================================================================
-- Fix orders table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view orders in their business context" ON orders;

CREATE POLICY "orders_select_business_context"
  ON orders FOR SELECT
  TO authenticated
  USING (
    -- Infrastructure owner can see all
    is_infra_owner_from_jwt() OR
    -- Users in the business can see orders
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      WHERE ubr.user_id = auth.uid() AND ubr.is_active = true
    ) OR
    -- Assigned driver can see their orders
    assigned_driver = (
      SELECT telegram_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- Fix stock_allocations table policies
-- ============================================================================

DROP POLICY IF EXISTS "Business users can view their allocations" ON stock_allocations;

CREATE POLICY "allocations_select_business_context"
  ON stock_allocations FOR SELECT
  TO authenticated
  USING (
    -- Infrastructure owner/manager/warehouse can see all
    is_infra_owner_from_jwt() OR
    -- Check role from JWT metadata for infrastructure roles
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('infrastructure_manager', 'infrastructure_warehouse') OR
    -- Business users can see their allocations
    to_business_id IN (
      SELECT user_business_roles.business_id
      FROM user_business_roles
      WHERE user_business_roles.user_id = auth.uid() AND user_business_roles.is_active = true
    )
  );

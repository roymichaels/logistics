/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  The `is_infrastructure_owner()` function queries the users table, which triggers RLS policies.
  Some RLS policies call `is_infrastructure_owner()`, creating an infinite recursion loop.
  Error: "infinite recursion detected in policy for relation users"

  ## Solution
  1. Drop problematic recursive helper functions
  2. Create non-recursive helper functions that read from JWT claims/raw_app_meta_data
  3. Drop and recreate all RLS policies on users table without circular dependencies
  4. Fix infrastructure owner access policies on other tables
  5. Fix get_business_summaries function to remove non-existent column references

  ## Security
  - Maintains same security posture
  - Uses JWT claims which are cryptographically signed and tamper-proof
  - Infrastructure owners still have proper cross-business access
  - All other roles maintain their restrictions
*/

-- ============================================================================
-- STEP 1: Drop existing problematic policies and functions
-- ============================================================================

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Infrastructure owner can view all users" ON users;
DROP POLICY IF EXISTS "users_delete_infra_owner" ON users;
DROP POLICY IF EXISTS "users_delete_service_role" ON users;
DROP POLICY IF EXISTS "users_insert_anon" ON users;
DROP POLICY IF EXISTS "users_insert_authenticated" ON users;
DROP POLICY IF EXISTS "users_insert_service_role" ON users;
DROP POLICY IF EXISTS "users_select_all_authenticated" ON users;
DROP POLICY IF EXISTS "users_select_anon" ON users;
DROP POLICY IF EXISTS "users_select_service_role" ON users;
DROP POLICY IF EXISTS "users_update_infra_owner" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_update_service_role" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_infra_owner" ON users;
DROP POLICY IF EXISTS "users_select_colleagues" ON users;
DROP POLICY IF EXISTS "users_insert_self" ON users;
DROP POLICY IF EXISTS "users_insert_infra_owner" ON users;

-- Drop existing functions (will recreate them properly)
DROP FUNCTION IF EXISTS is_infrastructure_owner() CASCADE;
DROP FUNCTION IF EXISTS is_infrastructure_owner(text) CASCADE;
DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_telegram_id() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_telegram_id_from_auth() CASCADE;
DROP FUNCTION IF EXISTS is_current_user_infrastructure_owner() CASCADE;
DROP FUNCTION IF EXISTS is_current_user_manager_or_above() CASCADE;

-- ============================================================================
-- STEP 2: Create non-recursive helper functions
-- ============================================================================

-- Get current user's auth UID (never triggers RLS)
CREATE OR REPLACE FUNCTION get_auth_uid()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Check if current user is infrastructure owner by reading from app_metadata
-- This bypasses RLS by not querying the users table during policy evaluation
CREATE OR REPLACE FUNCTION is_infra_owner_from_jwt()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'infrastructure_owner',
    false
  );
$$;

-- Get telegram_id from JWT without querying users table
CREATE OR REPLACE FUNCTION get_telegram_id_from_jwt()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'telegram_id',
    auth.jwt() ->> 'telegram_id'
  );
$$;

-- ============================================================================
-- STEP 3: Create new non-recursive RLS policies on users table
-- ============================================================================

-- Allow all authenticated users to SELECT (app needs this for functionality)
CREATE POLICY "users_select_authenticated"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon to SELECT for registration flow
CREATE POLICY "users_select_anon"
  ON users FOR SELECT
  TO anon
  USING (true);

-- Allow service role full access
CREATE POLICY "users_select_service"
  ON users FOR SELECT
  TO service_role
  USING (true);

-- Users can update their own profile
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (id = get_auth_uid())
  WITH CHECK (id = get_auth_uid());

-- Infrastructure owners can update any user (using JWT check, no recursion)
CREATE POLICY "users_update_infra"
  ON users FOR UPDATE
  TO authenticated
  USING (is_infra_owner_from_jwt())
  WITH CHECK (true);

-- Service role can update any user
CREATE POLICY "users_update_service"
  ON users FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert (for registration)
CREATE POLICY "users_insert_authenticated"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anon to insert (for initial registration)
CREATE POLICY "users_insert_anon"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

-- Service role can insert
CREATE POLICY "users_insert_service"
  ON users FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Infrastructure owners can delete users (using JWT check, no recursion)
CREATE POLICY "users_delete_infra"
  ON users FOR DELETE
  TO authenticated
  USING (is_infra_owner_from_jwt());

-- Service role can delete
CREATE POLICY "users_delete_service"
  ON users FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- STEP 4: Fix policies on other tables for infrastructure owner
-- ============================================================================

-- Orders table
DROP POLICY IF EXISTS "Infrastructure owner can view all orders" ON orders;
CREATE POLICY "orders_select_infra_owner"
  ON orders FOR SELECT
  TO authenticated
  USING (is_infra_owner_from_jwt());

-- Stock allocations table
DROP POLICY IF EXISTS "Infrastructure owner can view all allocations" ON stock_allocations;
CREATE POLICY "allocations_select_infra_owner"
  ON stock_allocations FOR SELECT
  TO authenticated
  USING (is_infra_owner_from_jwt());

-- Businesses table
DROP POLICY IF EXISTS "Infrastructure owner can view all businesses" ON businesses;
CREATE POLICY "businesses_select_infra_owner"
  ON businesses FOR SELECT
  TO authenticated
  USING (is_infra_owner_from_jwt());

-- System audit log table
DROP POLICY IF EXISTS "Infrastructure owner can view all audit logs" ON system_audit_log;
CREATE POLICY "audit_select_infra_owner"
  ON system_audit_log FOR SELECT
  TO authenticated
  USING (is_infra_owner_from_jwt());

-- ============================================================================
-- STEP 5: Fix get_business_summaries function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_business_summaries()
RETURNS TABLE (
  id uuid,
  name text,
  active boolean,
  total_orders bigint,
  revenue_today numeric,
  active_drivers bigint,
  pending_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.active,
    -- Total orders for this business
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM orders o
      WHERE o.business_id = b.id
    ), 0) as total_orders,
    -- Revenue today for this business
    COALESCE((
      SELECT SUM(o.total_amount)
      FROM orders o
      WHERE o.business_id = b.id
        AND o.created_at >= CURRENT_DATE
        AND o.status = 'delivered'
    ), 0) as revenue_today,
    -- Active drivers for this business (removed status column reference)
    COALESCE((
      SELECT COUNT(DISTINCT u.id)::bigint
      FROM users u
      WHERE u.business_id = b.id
        AND u.role IN ('driver', 'infrastructure_driver')
        AND u.registration_status = 'approved'
    ), 0) as active_drivers,
    -- Pending orders for this business
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM orders o
      WHERE o.business_id = b.id
        AND o.status IN ('pending', 'assigned', 'enroute')
    ), 0) as pending_orders
  FROM businesses b
  ORDER BY b.created_at DESC;
END;
$$;

-- ============================================================================
-- STEP 6: Grant necessary permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_auth_uid() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION is_infra_owner_from_jwt() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_telegram_id_from_jwt() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_business_summaries() TO authenticated, service_role;

-- ============================================================================
-- STEP 7: Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION get_auth_uid() IS 'Returns current auth.uid() without triggering RLS';
COMMENT ON FUNCTION is_infra_owner_from_jwt() IS 'Checks if user is infrastructure owner from JWT app_metadata, bypassing RLS';
COMMENT ON FUNCTION get_telegram_id_from_jwt() IS 'Gets telegram_id from JWT without querying users table';
COMMENT ON FUNCTION get_business_summaries() IS 'Returns business summaries for infrastructure owner dashboard';

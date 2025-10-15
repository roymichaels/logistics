/*
  # Fix RLS Policies for Infrastructure Owner
  
  1. Changes
    - Allow infrastructure_owner to SELECT all orders across all businesses
    - Allow infrastructure_owner to SELECT all stock_allocations across all businesses
    - Allow infrastructure_owner to SELECT all users across all businesses
    - Allow infrastructure_owner to SELECT all businesses
  
  2. Security
    - Policies remain restrictive for other roles
    - Only infrastructure_owner role gets cross-business access
    - All policies check against users.role column
*/

-- ============================================================================
-- ORDERS TABLE - Infrastructure Owner Access
-- ============================================================================

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Infrastructure owner can view all orders" ON orders;

-- Create policy for infrastructure owner to view all orders
CREATE POLICY "Infrastructure owner can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- STOCK_ALLOCATIONS TABLE - Infrastructure Owner Access
-- ============================================================================

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Infrastructure owner can view all allocations" ON stock_allocations;

-- Create policy for infrastructure owner to view all stock allocations
CREATE POLICY "Infrastructure owner can view all allocations"
  ON stock_allocations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- USERS TABLE - Infrastructure Owner Access
-- ============================================================================

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Infrastructure owner can view all users" ON users;

-- Create policy for infrastructure owner to view all users
CREATE POLICY "Infrastructure owner can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- BUSINESSES TABLE - Infrastructure Owner Access
-- ============================================================================

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Infrastructure owner can view all businesses" ON businesses;

-- Create policy for infrastructure owner to view all businesses
CREATE POLICY "Infrastructure owner can view all businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- SYSTEM_AUDIT_LOG TABLE - Fix Business Relation Query
-- ============================================================================

-- Ensure system_audit_log has proper foreign key to businesses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'system_audit_log_business_id_fkey'
  ) THEN
    ALTER TABLE system_audit_log
    ADD CONSTRAINT system_audit_log_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES businesses(id);
  END IF;
END $$;

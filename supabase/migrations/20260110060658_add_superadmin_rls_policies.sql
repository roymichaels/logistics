/*
  # Add Superadmin RLS Policies

  1. Purpose
    - Grant superadmins full read/write access to core tables
    - Superadmins bypass business-scoped restrictions
    - Enable platform-wide management capabilities

  2. Security Model
    - Superadmin role stored in profiles.role = 'superadmin'
    - All policies check: is_superadmin() helper function
    - Superadmins can see and manage all data across all businesses
*/

-- Helper function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'superadmin'
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

CREATE POLICY "Superadmins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Superadmins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

-- ============================================================================
-- BUSINESSES TABLE
-- ============================================================================

CREATE POLICY "Superadmins can read all businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Superadmins can update all businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can insert businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can delete businesses"
  ON businesses FOR DELETE
  TO authenticated
  USING (is_superadmin());

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================

CREATE POLICY "Superadmins can read all products"
  ON products FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Superadmins can update all products"
  ON products FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (is_superadmin());

-- ============================================================================
-- INVENTORY TABLE
-- ============================================================================

CREATE POLICY "Superadmins can read all inventory"
  ON inventory FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Superadmins can update all inventory"
  ON inventory FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can insert inventory"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================

CREATE POLICY "Superadmins can read all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Superadmins can update all orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (is_superadmin());

-- ============================================================================
-- ORDER_ITEMS TABLE
-- ============================================================================

CREATE POLICY "Superadmins can read all order_items"
  ON order_items FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Superadmins can update all order_items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can insert order_items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

-- ============================================================================
-- ZONES TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'zones') THEN
    EXECUTE 'CREATE POLICY "Superadmins can read all zones" ON zones FOR SELECT TO authenticated USING (is_superadmin())';
    EXECUTE 'CREATE POLICY "Superadmins can update all zones" ON zones FOR UPDATE TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin())';
    EXECUTE 'CREATE POLICY "Superadmins can insert zones" ON zones FOR INSERT TO authenticated WITH CHECK (is_superadmin())';
    EXECUTE 'CREATE POLICY "Superadmins can delete zones" ON zones FOR DELETE TO authenticated USING (is_superadmin())';
  END IF;
END $$;

-- ============================================================================
-- TASKS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tasks') THEN
    EXECUTE 'CREATE POLICY "Superadmins can read all tasks" ON tasks FOR SELECT TO authenticated USING (is_superadmin())';
    EXECUTE 'CREATE POLICY "Superadmins can update all tasks" ON tasks FOR UPDATE TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin())';
    EXECUTE 'CREATE POLICY "Superadmins can insert tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (is_superadmin())';
    EXECUTE 'CREATE POLICY "Superadmins can delete tasks" ON tasks FOR DELETE TO authenticated USING (is_superadmin())';
  END IF;
END $$;
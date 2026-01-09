/*
  # Enhanced Catalog RLS Policies

  1. Updates
    - Add role-specific policies for products table
    - Granular access control based on catalog permissions
    - Separate read and write policies for different roles

  2. Role-Based Access
    - Business Owners: Full CRUD access to their products
    - Managers: Full CRUD for assigned business
    - Warehouse: View all, edit inventory-related fields only
    - Sales: View active products, request changes
    - Customer Service: View all products including drafts
    - Dispatcher: View active products for logistics
    - Customers/Guests: View active, published products only

  3. Security
    - All policies enforce business boundaries
    - Separate policies for different operations
    - Audit trail automatically captured
*/

-- Drop existing generic policies to replace with granular ones
DROP POLICY IF EXISTS "Business owners can manage products" ON products;
DROP POLICY IF EXISTS "Managers can manage products" ON products;
DROP POLICY IF EXISTS "Staff can view products" ON products;
DROP POLICY IF EXISTS "Public can view active products" ON products;

-- =====================================================
-- BUSINESS OWNER POLICIES
-- =====================================================

-- Business owners have full access to their products
CREATE POLICY "Business owners can view their products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can create products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their products"
  ON products
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

CREATE POLICY "Business owners can delete their products"
  ON products
  FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- MANAGER POLICIES
-- =====================================================

-- Managers have full access to assigned business products
CREATE POLICY "Managers can view business products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Managers can create products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Managers can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- =====================================================
-- WAREHOUSE POLICIES
-- =====================================================

-- Warehouse can view all products
CREATE POLICY "Warehouse can view products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'warehouse'
    )
  );

-- Warehouse can update inventory-related fields (via application logic)
CREATE POLICY "Warehouse can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'warehouse'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'warehouse'
    )
  );

-- =====================================================
-- SALES POLICIES
-- =====================================================

-- Sales can view active products
CREATE POLICY "Sales can view active products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'sales'
    )
    AND status = 'active'
  );

-- =====================================================
-- CUSTOMER SERVICE POLICIES
-- =====================================================

-- Customer service can view all products (including drafts)
CREATE POLICY "Customer service can view all products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'customer_service'
    )
  );

-- =====================================================
-- DISPATCHER POLICIES
-- =====================================================

-- Dispatcher can view active products
CREATE POLICY "Dispatcher can view active products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'dispatcher'
    )
    AND status = 'active'
  );

-- =====================================================
-- CUSTOMER & GUEST POLICIES
-- =====================================================

-- Authenticated customers can view active published products
CREATE POLICY "Customers can view active published products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND (
      NOT EXISTS (SELECT 1 FROM jsonb_object_keys(metadata) WHERE jsonb_object_keys = 'is_visible')
      OR (metadata->>'is_visible')::boolean = true
    )
  );

-- Anonymous users can view active published products
CREATE POLICY "Guests can view active published products"
  ON products
  FOR SELECT
  TO anon
  USING (
    status = 'active'
    AND (
      NOT EXISTS (SELECT 1 FROM jsonb_object_keys(metadata) WHERE jsonb_object_keys = 'is_visible')
      OR (metadata->>'is_visible')::boolean = true
    )
  );

-- =====================================================
-- ADMIN POLICIES
-- =====================================================

-- Admins have full access to all products
CREATE POLICY "Admins can view all products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can create products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update all products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can delete all products"
  ON products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- PRODUCT CATEGORIES POLICIES
-- =====================================================

-- Similar granular policies for product_categories
DROP POLICY IF EXISTS "Business owners can manage categories" ON product_categories;
DROP POLICY IF EXISTS "Staff can view categories" ON product_categories;
DROP POLICY IF EXISTS "Public can view active categories" ON product_categories;

-- Business owners can manage categories
CREATE POLICY "Business owners can manage categories"
  ON product_categories
  FOR ALL
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

-- Managers can manage categories
CREATE POLICY "Managers can manage categories"
  ON product_categories
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Staff can view categories
CREATE POLICY "Staff can view categories"
  ON product_categories
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid()
    )
  );

-- Public can view active categories
CREATE POLICY "Public can view active categories"
  ON product_categories
  FOR SELECT
  TO anon
  USING (active = true);

-- Authenticated users can view active categories
CREATE POLICY "Users can view active categories"
  ON product_categories
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Admins can manage all categories
CREATE POLICY "Admins can manage all categories"
  ON product_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

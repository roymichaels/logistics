/*
  # Fix Dashboard Dependencies

  1. New Tables
    - `user_presence` - Track online/offline status
    - `orders` - Core order management (if not exists)
    - `products` - Product catalog (if not exists)
    - `inventory_locations` - Storage locations (if not exists)

  2. New Functions
    - `get_business_metrics` - Calculate business KPIs
    - `update_updated_at_column` - Auto-update timestamps

  3. Security
    - Enable RLS on all new tables
    - Add comprehensive access policies
    - Ensure proper tenant isolation

  4. Performance
    - Add indexes for frequently queried columns
    - Optimize for dashboard queries
*/

-- =====================================================
-- 1. USER PRESENCE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('online', 'offline', 'away', 'busy')),
  last_seen timestamptz NOT NULL DEFAULT now(),
  current_page text,
  device_info jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own presence"
  ON user_presence FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Business members can view presence of other members"
  ON user_presence FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_business_id ON user_presence(business_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen DESC);

-- =====================================================
-- 2. ORDERS TABLE (IF NOT EXISTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  customer_address text,
  customer_location point,
  assigned_driver uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'failed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  notes text,
  special_instructions text,
  estimated_delivery_time timestamptz,
  actual_delivery_time timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on orders if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'orders'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view orders in their business" ON orders;
DROP POLICY IF EXISTS "Users can create orders in their business" ON orders;
DROP POLICY IF EXISTS "Users can update orders in their business" ON orders;
DROP POLICY IF EXISTS "Drivers can view assigned orders" ON orders;

-- Recreate policies
CREATE POLICY "Users can view orders in their business"
  ON orders FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
    OR assigned_driver = auth.uid()
    OR customer_id = auth.uid()
  );

CREATE POLICY "Users can create orders in their business"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update orders in their business"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
    OR assigned_driver = auth.uid()
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
    OR assigned_driver = auth.uid()
  );

CREATE POLICY "Drivers can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (assigned_driver = auth.uid());

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_infrastructure_id ON orders(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver ON orders(assigned_driver);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

-- =====================================================
-- 3. PRODUCTS TABLE (IF NOT EXISTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sku text,
  barcode text,
  category text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  cost numeric(10,2) DEFAULT 0,
  unit text DEFAULT 'unit',
  is_active boolean NOT NULL DEFAULT true,
  low_stock_threshold integer DEFAULT 10,
  image_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'products'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Policies for products
DROP POLICY IF EXISTS "Users can view products in their business" ON products;
DROP POLICY IF EXISTS "Managers can manage products" ON products;

CREATE POLICY "Users can view products in their business"
  ON products FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager')
    )
  );

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- =====================================================
-- 4. INVENTORY LOCATIONS TABLE (IF NOT EXISTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  type text NOT NULL CHECK (type IN ('warehouse', 'store', 'vehicle', 'other')),
  address text,
  location point,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'inventory_locations'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Policies
DROP POLICY IF EXISTS "Users can view locations in their business" ON inventory_locations;
DROP POLICY IF EXISTS "Managers can manage locations" ON inventory_locations;

CREATE POLICY "Users can view locations in their business"
  ON inventory_locations FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage locations"
  ON inventory_locations FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager', 'infrastructure_warehouse')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager', 'infrastructure_warehouse')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_locations_business_id ON inventory_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_is_active ON inventory_locations(is_active) WHERE is_active = true;

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. GET BUSINESS METRICS RPC FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_business_metrics(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_revenue_today numeric;
  v_revenue_month numeric;
  v_orders_today integer;
  v_orders_month integer;
  v_average_order_value numeric;
BEGIN
  -- Check if user has access to this business
  IF NOT EXISTS (
    SELECT 1 FROM business_memberships
    WHERE business_id = p_business_id
    AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('infrastructure_owner', 'infrastructure_manager')
  ) THEN
    RAISE EXCEPTION 'Access denied to business metrics';
  END IF;

  -- Calculate today's revenue
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_revenue_today
  FROM orders
  WHERE business_id = p_business_id
  AND DATE(created_at) = CURRENT_DATE
  AND status NOT IN ('cancelled', 'failed');

  -- Calculate month's revenue
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_revenue_month
  FROM orders
  WHERE business_id = p_business_id
  AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
  AND status NOT IN ('cancelled', 'failed');

  -- Count today's orders
  SELECT COUNT(*)
  INTO v_orders_today
  FROM orders
  WHERE business_id = p_business_id
  AND DATE(created_at) = CURRENT_DATE;

  -- Count month's orders
  SELECT COUNT(*)
  INTO v_orders_month
  FROM orders
  WHERE business_id = p_business_id
  AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

  -- Calculate average order value
  v_average_order_value := CASE
    WHEN v_orders_month > 0 THEN v_revenue_month / v_orders_month
    ELSE 0
  END;

  -- Build result
  v_result := jsonb_build_object(
    'revenue_today', v_revenue_today,
    'revenue_month', v_revenue_month,
    'orders_today', v_orders_today,
    'orders_month', v_orders_month,
    'average_order_value', v_average_order_value,
    'calculated_at', now()
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_business_metrics(uuid) TO authenticated;

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- User presence
DROP TRIGGER IF EXISTS update_user_presence_updated_at ON user_presence;
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Products
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inventory locations
DROP TRIGGER IF EXISTS update_inventory_locations_updated_at ON inventory_locations;
CREATE TRIGGER update_inventory_locations_updated_at
  BEFORE UPDATE ON inventory_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

/*
  # Add Missing Operational Tables

  1. New Tables
    - `notifications` - User notifications system
    - `zones` - Delivery zones management
    - `driver_status` - Real-time driver status tracking
    - `inventory_low_stock_alerts` - Low stock alerts view/table
    - `restock_requests` - Inventory restock requests
    - `driver_profiles` - Driver profile information
    - `driver_statuses` - Driver availability status

  2. Security
    - Enable RLS on all new tables
    - Add comprehensive access policies
    - Ensure proper tenant isolation

  3. Performance
    - Add indexes for frequently queried columns
    - Optimize for real-time queries
*/

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'order', 'driver', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  action_label text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Business members can send notifications to other members"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- 2. ZONES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  color text DEFAULT '#1DA1F2',
  description text,
  boundary jsonb, -- GeoJSON polygon
  is_active boolean NOT NULL DEFAULT true,
  delivery_fee numeric(10,2) DEFAULT 0,
  min_order_amount numeric(10,2) DEFAULT 0,
  estimated_delivery_time_minutes integer DEFAULT 30,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view zones in their business"
  ON zones FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
    OR infrastructure_id IN (
      SELECT infrastructure_id FROM users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage zones"
  ON zones FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager', 'dispatcher')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager', 'dispatcher')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zones_business_id ON zones(business_id);
CREATE INDEX IF NOT EXISTS idx_zones_active ON zones(active) WHERE active = true;

-- =====================================================
-- 3. DRIVER PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  license_number text,
  license_expiry date,
  vehicle_type text,
  vehicle_plate text,
  vehicle_model text,
  vehicle_year integer,
  rating numeric(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  total_deliveries integer NOT NULL DEFAULT 0,
  successful_deliveries integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT false,
  max_orders_capacity integer DEFAULT 5,
  current_zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Drivers can view and update their own profile"
  ON driver_profiles FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Business members can view driver profiles"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage driver profiles"
  ON driver_profiles FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager', 'dispatcher')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager', 'dispatcher')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_business_id ON driver_profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_available ON driver_profiles(is_available) WHERE is_available = true;

-- =====================================================
-- 4. DRIVER STATUS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('off_shift', 'available', 'busy', 'on_break', 'unavailable')),
  is_online boolean NOT NULL DEFAULT false,
  current_location point,
  current_zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  last_location_update timestamptz,
  last_updated timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(driver_id)
);

-- Enable RLS
ALTER TABLE driver_status ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Drivers can manage their own status"
  ON driver_status FOR ALL
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Business members can view driver status"
  ON driver_status FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_driver_status_driver_id ON driver_status(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_status_business_id ON driver_status(business_id);
CREATE INDEX IF NOT EXISTS idx_driver_status_online ON driver_status(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_driver_status_last_updated ON driver_status(last_updated DESC);

-- =====================================================
-- 5. RESTOCK REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS restock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL,
  to_location_id uuid NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  requested_quantity integer NOT NULL CHECK (requested_quantity > 0),
  approved_quantity integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'completed', 'cancelled')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes text,
  approved_at timestamptz,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view restock requests in their business"
  ON restock_requests FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Warehouse users can create restock requests"
  ON restock_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('warehouse', 'manager', 'business_owner')
    )
  );

CREATE POLICY "Managers can update restock requests"
  ON restock_requests FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'business_owner', 'infrastructure_warehouse')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'business_owner', 'infrastructure_warehouse')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_restock_requests_business_id ON restock_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_product_id ON restock_requests(product_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_status ON restock_requests(status);
CREATE INDEX IF NOT EXISTS idx_restock_requests_created_at ON restock_requests(created_at DESC);

-- =====================================================
-- 6. INVENTORY LOW STOCK ALERTS VIEW
-- =====================================================

-- First, ensure we have an inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  on_hand_quantity integer NOT NULL DEFAULT 0,
  allocated_quantity integer NOT NULL DEFAULT 0,
  available_quantity integer GENERATED ALWAYS AS (on_hand_quantity - allocated_quantity) STORED,
  reorder_point integer DEFAULT 10,
  metadata jsonb DEFAULT '{}'::jsonb,
  last_counted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, location_id)
);

-- Enable RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Policies for inventory
CREATE POLICY "Users can view inventory in their business"
  ON inventory FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Warehouse users can manage inventory"
  ON inventory FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('warehouse', 'manager', 'business_owner')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('warehouse', 'manager', 'business_owner')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_business_id ON inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON inventory(location_id);

-- Create view for low stock alerts
CREATE OR REPLACE VIEW inventory_low_stock_alerts AS
SELECT
  i.id,
  i.product_id,
  p.name as product_name,
  i.location_id,
  l.name as location_name,
  i.on_hand_quantity,
  p.low_stock_threshold,
  i.business_id,
  i.infrastructure_id,
  now() as triggered_at
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN inventory_locations l ON i.location_id = l.id
WHERE i.available_quantity <= p.low_stock_threshold
  AND p.is_active = true
  AND l.is_active = true;

-- Grant access to view
GRANT SELECT ON inventory_low_stock_alerts TO authenticated;

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Zones
DROP TRIGGER IF EXISTS update_zones_updated_at ON zones;
CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Driver profiles
DROP TRIGGER IF EXISTS update_driver_profiles_updated_at ON driver_profiles;
CREATE TRIGGER update_driver_profiles_updated_at
  BEFORE UPDATE ON driver_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Restock requests
DROP TRIGGER IF EXISTS update_restock_requests_updated_at ON restock_requests;
CREATE TRIGGER update_restock_requests_updated_at
  BEFORE UPDATE ON restock_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inventory
DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to get infrastructure overview
CREATE OR REPLACE FUNCTION get_infrastructure_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_infra_id uuid;
BEGIN
  -- Get user's infrastructure_id
  SELECT infrastructure_id INTO v_infra_id
  FROM users
  WHERE id = auth.uid();

  -- Check if user is infrastructure owner/manager
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('infrastructure_owner', 'infrastructure_manager')
  ) THEN
    RAISE EXCEPTION 'Access denied to infrastructure overview';
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'infrastructure_id', v_infra_id,
    'total_businesses', (
      SELECT COUNT(*) FROM businesses
      WHERE infrastructure_id = v_infra_id
    ),
    'active_businesses', (
      SELECT COUNT(*) FROM businesses
      WHERE infrastructure_id = v_infra_id
      AND active = true
    ),
    'total_users', (
      SELECT COUNT(*) FROM users
      WHERE infrastructure_id = v_infra_id
    ),
    'total_orders_30_days', (
      SELECT COUNT(*) FROM orders
      WHERE infrastructure_id = v_infra_id
      AND created_at >= (CURRENT_DATE - INTERVAL '30 days')
    ),
    'revenue_today', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM orders
      WHERE infrastructure_id = v_infra_id
      AND DATE(created_at) = CURRENT_DATE
      AND status NOT IN ('cancelled', 'failed')
    ),
    'revenue_month', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM orders
      WHERE infrastructure_id = v_infra_id
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
      AND status NOT IN ('cancelled', 'failed')
    ),
    'active_drivers', (
      SELECT COUNT(*) FROM driver_status
      WHERE infrastructure_id = v_infra_id
      AND is_online = true
    ),
    'calculated_at', now()
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_infrastructure_overview() TO authenticated;

/*
  # Roy Michaels Command System - Complete Architecture

  This migration creates the full infrastructure for the Roy Michaels logistics command system:

  1. **Zone-Based Dispatch System**
     - `zones` - Geographic zones for delivery operations
     - `driver_zones` - Driver assignments to zones
     - `driver_status` - Real-time driver availability tracking
     - `driver_movement_logs` - Movement history and tracking

  2. **Multi-Location Inventory Control**
     - `inventory_locations` - Warehouse, driver, and reserved stock locations
     - `driver_inventory` - Per-driver inventory tracking
     - `inventory_logs` - Complete movement audit trail
     - `inventory_alerts` - Low stock alerts and notifications

  3. **Restock Management**
     - `restock_requests` - Restock workflow from sales to warehouse
     - Approval chain and fulfillment tracking

  4. **Revenue Intelligence**
     - `sales_logs` - Sales attribution and revenue tracking
     - Per-salesperson performance metrics

  5. **Security**
     - Row Level Security (RLS) enabled on all tables
     - Role-based access policies
     - Audit trails for all operations
*/

-- ========================================
-- ZONE-BASED DISPATCH SYSTEM
-- ========================================

CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  region TEXT,
  polygon JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_telegram_id TEXT NOT NULL,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by TEXT,
  UNIQUE(driver_telegram_id, zone_id)
);

CREATE TABLE IF NOT EXISTS driver_status (
  driver_telegram_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'busy', 'break')) DEFAULT 'offline',
  last_seen TIMESTAMPTZ DEFAULT now(),
  current_location JSONB,
  active_orders INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_movement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_telegram_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('went_online', 'went_offline', 'accepted_order', 'completed_delivery', 'took_break')),
  zone_id UUID REFERENCES zones(id),
  order_id UUID REFERENCES orders(id),
  location JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- MULTI-LOCATION INVENTORY SYSTEM
-- ========================================

CREATE TABLE IF NOT EXISTS inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('warehouse', 'driver', 'reserved', 'transit')),
  owner_telegram_id TEXT,
  address TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_telegram_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  last_restock_at TIMESTAMPTZ,
  low_stock_threshold INTEGER DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_telegram_id, product_id)
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  from_location_id UUID REFERENCES inventory_locations(id),
  to_location_id UUID REFERENCES inventory_locations(id),
  quantity INTEGER NOT NULL,
  log_type TEXT NOT NULL CHECK (log_type IN ('transfer', 'sale', 'restock', 'adjustment', 'loss')),
  reference_type TEXT CHECK (reference_type IN ('order', 'restock_request', 'manual')),
  reference_id UUID,
  performed_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  location_id UUID REFERENCES inventory_locations(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstocked')),
  current_quantity INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  notified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- RESTOCK MANAGEMENT
-- ========================================

CREATE TABLE IF NOT EXISTS restock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  from_location_id UUID REFERENCES inventory_locations(id),
  to_location_id UUID NOT NULL REFERENCES inventory_locations(id),
  requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
  approved_quantity INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'in_transit', 'fulfilled')) DEFAULT 'pending',
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  fulfilled_by TEXT,
  fulfilled_at TIMESTAMPTZ,
  notes TEXT,
  rejection_reason TEXT
);

-- ========================================
-- REVENUE INTELLIGENCE
-- ========================================

CREATE TABLE IF NOT EXISTS sales_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  salesperson_telegram_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  sale_timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_zones_city ON zones(city);
CREATE INDEX IF NOT EXISTS idx_zones_active ON zones(active);
CREATE INDEX IF NOT EXISTS idx_driver_zones_driver ON driver_zones(driver_telegram_id);
CREATE INDEX IF NOT EXISTS idx_driver_zones_zone ON driver_zones(zone_id);
CREATE INDEX IF NOT EXISTS idx_driver_status_status ON driver_status(status);
CREATE INDEX IF NOT EXISTS idx_driver_movement_logs_driver ON driver_movement_logs(driver_telegram_id);
CREATE INDEX IF NOT EXISTS idx_driver_movement_logs_created ON driver_movement_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_type ON inventory_locations(type);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_owner ON inventory_locations(owner_telegram_id);
CREATE INDEX IF NOT EXISTS idx_driver_inventory_driver ON driver_inventory(driver_telegram_id);
CREATE INDEX IF NOT EXISTS idx_driver_inventory_product ON driver_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created ON inventory_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_product ON inventory_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_resolved ON inventory_alerts(resolved_at);
CREATE INDEX IF NOT EXISTS idx_restock_requests_status ON restock_requests(status);
CREATE INDEX IF NOT EXISTS idx_restock_requests_requested_by ON restock_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_restock_requests_product ON restock_requests(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_logs_salesperson ON sales_logs(salesperson_telegram_id);
CREATE INDEX IF NOT EXISTS idx_sales_logs_order ON sales_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_logs_timestamp ON sales_logs(sale_timestamp DESC);

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_movement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;

-- Zones policies
CREATE POLICY "All authenticated users can read zones"
  ON zones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage zones"
  ON zones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner')
    )
  );

-- Driver zones policies
CREATE POLICY "Drivers can read own zone assignments"
  ON driver_zones FOR SELECT
  TO authenticated
  USING (
    driver_telegram_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner', 'dispatcher')
    )
  );

CREATE POLICY "Managers and dispatchers can manage driver zones"
  ON driver_zones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner', 'dispatcher')
    )
  );

-- Driver status policies
CREATE POLICY "Drivers can manage own status"
  ON driver_status FOR ALL
  TO authenticated
  USING (
    driver_telegram_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner', 'dispatcher')
    )
  );

-- Driver movement logs policies
CREATE POLICY "Drivers can read own movement logs"
  ON driver_movement_logs FOR SELECT
  TO authenticated
  USING (
    driver_telegram_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner', 'dispatcher')
    )
  );

CREATE POLICY "System can create movement logs"
  ON driver_movement_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Inventory locations policies
CREATE POLICY "All staff can read inventory locations"
  ON inventory_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role != 'user'
    )
  );

CREATE POLICY "Managers and warehouse can manage locations"
  ON inventory_locations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner', 'warehouse')
    )
  );

-- Driver inventory policies
CREATE POLICY "Drivers can read own inventory"
  ON driver_inventory FOR SELECT
  TO authenticated
  USING (
    driver_telegram_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner', 'warehouse', 'dispatcher')
    )
  );

CREATE POLICY "System can update driver inventory"
  ON driver_inventory FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner', 'warehouse', 'dispatcher')
    )
  );

-- Inventory logs policies (read-only audit trail)
CREATE POLICY "Staff can read inventory logs"
  ON inventory_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner', 'warehouse', 'dispatcher')
    )
  );

CREATE POLICY "System can create inventory logs"
  ON inventory_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Inventory alerts policies
CREATE POLICY "Staff can read inventory alerts"
  ON inventory_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner', 'warehouse', 'sales')
    )
  );

CREATE POLICY "System can manage inventory alerts"
  ON inventory_alerts FOR ALL
  TO authenticated
  USING (true);

-- Restock requests policies
CREATE POLICY "Staff can read restock requests"
  ON restock_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner', 'warehouse')
    )
  );

CREATE POLICY "Sales and drivers can create restock requests"
  ON restock_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = (auth.jwt() ->> 'telegram_id')
    AND EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('sales', 'driver', 'warehouse')
    )
  );

CREATE POLICY "Managers and warehouse can manage restock requests"
  ON restock_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner', 'warehouse')
    )
  );

-- Sales logs policies (read-only audit trail)
CREATE POLICY "Salespeople can read own sales logs"
  ON sales_logs FOR SELECT
  TO authenticated
  USING (
    salesperson_telegram_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'owner')
    )
  );

CREATE POLICY "System can create sales logs"
  ON sales_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ========================================
-- DEFAULT DATA
-- ========================================

-- Insert default warehouse location
INSERT INTO inventory_locations (name, type, address, active)
VALUES
  ('מחסן ראשי תל אביב', 'warehouse', 'תל אביב', true),
  ('מחסן רזרבה', 'reserved', 'תל אביב', true)
ON CONFLICT (name) DO NOTHING;

-- Insert sample zones
INSERT INTO zones (name, city, region, active)
VALUES
  ('צפון תל אביב', 'תל אביב', 'מרכז', true),
  ('מרכז תל אביב', 'תל אביב', 'מרכז', true),
  ('דרום תל אביב', 'תל אביב', 'מרכז', true),
  ('חולון', 'חולון', 'מרכז', true),
  ('בת ים', 'בת ים', 'מרכז', true)
ON CONFLICT (name) DO NOTHING;

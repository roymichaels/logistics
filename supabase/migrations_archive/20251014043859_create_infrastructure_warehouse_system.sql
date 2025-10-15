/*
  # Infrastructure Warehouse and Inventory Pipeline

  ## Overview
  Implements the infrastructure-first inventory management system where all stock control
  originates from infrastructure warehouses and flows down to business warehouses and driver vehicles.

  ## New Tables

  ### 1. `warehouses`
  Physical or virtual storage locations with scope differentiation.
  - Infrastructure warehouses: Owned and controlled by infrastructure_owner
  - Business warehouses: Assigned to specific businesses, receive allocations from infrastructure
  - Includes capacity limits, operating hours, and contact information
  - Tracks active/inactive status for operational control

  ### 2. `inventory_movements`
  Complete audit trail of all inventory transfers across the system.
  - Tracks every movement from infrastructure → business → driver → customer
  - Records from_location, to_location, quantity, and business context
  - Includes movement type (allocation, transfer, delivery, return, adjustment)
  - Immutable audit record with actor and timestamp
  - Enables full traceability of stock throughout the supply chain

  ### 3. `stock_allocations`
  Infrastructure-controlled allocation of stock to business warehouses.
  - Defines allocation rules and quotas per business
  - Tracks allocation status (pending, approved, fulfilled, rejected)
  - Includes approval workflow for large allocations
  - Records allocated vs delivered quantities for reconciliation

  ### 4. `driver_vehicle_inventory`
  Enhanced driver inventory with vehicle and zone context.
  - Links inventory to specific driver and their assigned vehicle
  - Tracks current zone_id for location-aware inventory management
  - Includes loading_at and last_sync timestamps
  - Supports partial deliveries and returns

  ### 5. `inventory_reconciliation`
  Periodic reconciliation reports comparing system vs physical counts.
  - Scheduled reconciliation cycles per warehouse
  - Records expected vs actual quantities with variance tracking
  - Includes reconciliation status and approver information
  - Generates adjustments to correct discrepancies

  ### 6. `warehouse_capacity_limits`
  Capacity management preventing over-allocation.
  - Defines maximum stock levels per product per warehouse
  - Tracks current utilization percentage
  - Triggers alerts when approaching capacity limits
  - Supports seasonal capacity adjustments

  ## Security Features
  - Infrastructure warehouses: Only infrastructure_owner and infrastructure_warehouse can modify
  - Business warehouses: Business owners can view but only infrastructure can allocate
  - Inventory movements: Immutable audit trail, no deletions allowed
  - Stock allocations: Require infrastructure approval for amounts exceeding thresholds
  - Driver inventory: Only assigned driver and managers can modify

  ## Key Principles
  1. Infrastructure control: All stock originates from infrastructure warehouses
  2. Chain of custody: Every movement is logged with from/to locations
  3. No orphan inventory: All stock must be assigned to a warehouse or driver
  4. Allocation-based: Businesses receive stock through formal allocation process
  5. Reconciliation: Regular physical counts ensure data integrity
*/

-- ============================================================================
-- WAREHOUSES TABLE - Infrastructure and Business storage locations
-- ============================================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_code TEXT UNIQUE NOT NULL,
  warehouse_name TEXT NOT NULL,
  warehouse_type TEXT NOT NULL CHECK (warehouse_type IN ('infrastructure_central', 'infrastructure_regional', 'business_main', 'business_satellite')),
  scope_level TEXT NOT NULL CHECK (scope_level IN ('infrastructure', 'business')),
  business_id UUID REFERENCES businesses(id) ON DELETE RESTRICT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'IL',
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  max_capacity_cubic_meters NUMERIC(10,2),
  operating_hours JSONB DEFAULT '{"monday": "08:00-18:00", "tuesday": "08:00-18:00", "wednesday": "08:00-18:00", "thursday": "08:00-18:00", "friday": "08:00-14:00", "saturday": "closed", "sunday": "closed"}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_receiving_enabled BOOLEAN NOT NULL DEFAULT true,
  is_shipping_enabled BOOLEAN NOT NULL DEFAULT true,
  managed_by UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (scope_level = 'infrastructure' AND business_id IS NULL) OR
    (scope_level = 'business' AND business_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_warehouses_type ON warehouses(warehouse_type);
CREATE INDEX IF NOT EXISTS idx_warehouses_scope ON warehouses(scope_level, is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_business ON warehouses(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_managed_by ON warehouses(managed_by);

COMMENT ON TABLE warehouses IS 'Physical and virtual storage locations with infrastructure vs business scope distinction';
COMMENT ON COLUMN warehouses.scope_level IS 'infrastructure warehouses = global stock control, business warehouses = operational branches';

-- ============================================================================
-- INVENTORY_MOVEMENTS TABLE - Complete movement audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'infrastructure_allocation',
    'business_transfer',
    'driver_loading',
    'delivery_fulfillment',
    'return_to_warehouse',
    'adjustment',
    'damaged_write_off',
    'theft_loss'
  )),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
  from_driver_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  to_driver_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit_of_measure TEXT DEFAULT 'units',
  business_id UUID REFERENCES businesses(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  reference_number TEXT,
  movement_reason TEXT,
  notes TEXT,
  moved_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  moved_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  CHECK (
    (from_warehouse_id IS NOT NULL OR from_driver_id IS NOT NULL) AND
    (to_warehouse_id IS NOT NULL OR to_driver_id IS NOT NULL) AND
    (from_warehouse_id IS NULL OR from_driver_id IS NULL) AND
    (to_warehouse_id IS NULL OR to_driver_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_inv_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_from_warehouse ON inventory_movements(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_to_warehouse ON inventory_movements(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_business ON inventory_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_moved_at ON inventory_movements(moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_movements_type ON inventory_movements(movement_type);

COMMENT ON TABLE inventory_movements IS 'Immutable audit trail of all inventory transfers in the system';
COMMENT ON COLUMN inventory_movements.movement_type IS 'infrastructure_allocation = infra→business, driver_loading = warehouse→driver, delivery_fulfillment = driver→customer';

-- ============================================================================
-- STOCK_ALLOCATIONS TABLE - Infrastructure to Business allocations
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_number TEXT UNIQUE NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  requested_quantity NUMERIC(10,2) NOT NULL CHECK (requested_quantity > 0),
  approved_quantity NUMERIC(10,2) CHECK (approved_quantity >= 0),
  delivered_quantity NUMERIC(10,2) DEFAULT 0 CHECK (delivered_quantity >= 0),
  allocation_status TEXT NOT NULL DEFAULT 'pending' CHECK (allocation_status IN ('pending', 'approved', 'in_transit', 'delivered', 'partial', 'rejected', 'cancelled')),
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  delivered_by UUID REFERENCES users(id),
  delivered_at TIMESTAMPTZ,
  rejection_reason TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  CHECK (approved_quantity IS NULL OR approved_quantity <= requested_quantity),
  CHECK (delivered_quantity <= COALESCE(approved_quantity, requested_quantity))
);

CREATE INDEX IF NOT EXISTS idx_stock_alloc_from_warehouse ON stock_allocations(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_alloc_to_warehouse ON stock_allocations(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_alloc_business ON stock_allocations(to_business_id);
CREATE INDEX IF NOT EXISTS idx_stock_alloc_status ON stock_allocations(allocation_status);
CREATE INDEX IF NOT EXISTS idx_stock_alloc_requested_at ON stock_allocations(requested_at DESC);

COMMENT ON TABLE stock_allocations IS 'Infrastructure-controlled stock allocation workflow to business warehouses';

-- ============================================================================
-- DRIVER_VEHICLE_INVENTORY TABLE - Enhanced driver mobile inventory
-- ============================================================================

CREATE TABLE IF NOT EXISTS driver_vehicle_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  vehicle_identifier TEXT,
  current_quantity NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  reserved_quantity NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  damaged_quantity NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  current_zone_id UUID REFERENCES zones(id),
  source_warehouse_id UUID REFERENCES warehouses(id),
  business_id UUID REFERENCES businesses(id) ON DELETE RESTRICT,
  loaded_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE(driver_id, product_id, vehicle_identifier),
  CHECK (current_quantity >= reserved_quantity)
);

CREATE INDEX IF NOT EXISTS idx_driver_vehicle_inv_driver ON driver_vehicle_inventory(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_inv_product ON driver_vehicle_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_inv_zone ON driver_vehicle_inventory(current_zone_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_inv_business ON driver_vehicle_inventory(business_id);

COMMENT ON TABLE driver_vehicle_inventory IS 'Mobile inventory tracking with vehicle, zone, and business context';

-- ============================================================================
-- INVENTORY_RECONCILIATION TABLE - Physical count vs system
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_number TEXT UNIQUE NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  reconciliation_date DATE NOT NULL,
  reconciliation_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (reconciliation_status IN ('scheduled', 'in_progress', 'completed', 'approved', 'rejected')),
  initiated_by UUID NOT NULL REFERENCES users(id),
  initiated_at TIMESTAMPTZ DEFAULT now(),
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  total_items_counted INTEGER DEFAULT 0,
  total_discrepancies INTEGER DEFAULT 0,
  total_variance_value NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_inv_recon_warehouse ON inventory_reconciliation(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_recon_date ON inventory_reconciliation(reconciliation_date DESC);
CREATE INDEX IF NOT EXISTS idx_inv_recon_status ON inventory_reconciliation(reconciliation_status);

-- ============================================================================
-- RECONCILIATION_ITEMS TABLE - Line items for each reconciliation
-- ============================================================================

CREATE TABLE IF NOT EXISTS reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES inventory_reconciliation(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  system_quantity NUMERIC(10,2) NOT NULL,
  physical_count NUMERIC(10,2),
  variance_quantity NUMERIC(10,2) GENERATED ALWAYS AS (COALESCE(physical_count, 0) - system_quantity) STORED,
  variance_value NUMERIC(12,2),
  variance_reason TEXT CHECK (variance_reason IN ('damaged', 'theft', 'miscount', 'system_error', 'expired', 'other')),
  counted_by UUID REFERENCES users(id),
  counted_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(reconciliation_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_recon_items_reconciliation ON reconciliation_items(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_recon_items_product ON reconciliation_items(product_id);
CREATE INDEX IF NOT EXISTS idx_recon_items_variance ON reconciliation_items(reconciliation_id) WHERE variance_quantity != 0;

-- ============================================================================
-- WAREHOUSE_CAPACITY_LIMITS TABLE - Capacity management
-- ============================================================================

CREATE TABLE IF NOT EXISTS warehouse_capacity_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  max_quantity NUMERIC(10,2) NOT NULL CHECK (max_quantity > 0),
  warning_threshold_pct NUMERIC(5,2) DEFAULT 80 CHECK (warning_threshold_pct > 0 AND warning_threshold_pct <= 100),
  current_quantity NUMERIC(10,2) DEFAULT 0,
  utilization_pct NUMERIC(5,2) GENERATED ALWAYS AS (CASE WHEN max_quantity > 0 THEN (current_quantity / max_quantity * 100) ELSE 0 END) STORED,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  UNIQUE(warehouse_id, product_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_capacity_warehouse ON warehouse_capacity_limits(warehouse_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_warehouse_capacity_product ON warehouse_capacity_limits(product_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_warehouse_capacity_utilization ON warehouse_capacity_limits(warehouse_id, utilization_pct) WHERE is_active = true;

COMMENT ON TABLE warehouse_capacity_limits IS 'Capacity limits to prevent over-allocation and optimize space utilization';

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_vehicle_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_capacity_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Warehouses
-- ============================================================================

CREATE POLICY "Everyone can view active warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (
    is_active = true AND (
      scope_level = 'infrastructure' OR
      business_id IN (
        SELECT business_id FROM user_business_roles
        WHERE user_id = auth.uid() AND is_active = true
      ) OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('infrastructure_owner', 'infrastructure_manager', 'infrastructure_warehouse')
      )
    )
  );

CREATE POLICY "Infrastructure roles can manage warehouses"
  ON warehouses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_warehouse')
    )
  );

-- ============================================================================
-- RLS POLICIES - Inventory Movements (Read-only audit trail)
-- ============================================================================

CREATE POLICY "Users can view movements for their business"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR from_driver_id = auth.uid()
    OR to_driver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_manager', 'infrastructure_warehouse')
    )
  );

CREATE POLICY "Authorized users can create movements"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    moved_by = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('infrastructure_owner', 'infrastructure_warehouse', 'infrastructure_dispatcher', 'warehouse', 'manager', 'driver')
      )
    )
  );

-- ============================================================================
-- RLS POLICIES - Stock Allocations
-- ============================================================================

CREATE POLICY "Business users can view their allocations"
  ON stock_allocations FOR SELECT
  TO authenticated
  USING (
    to_business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_manager', 'infrastructure_warehouse')
    )
  );

CREATE POLICY "Business owners can request allocations"
  ON stock_allocations FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND
    to_business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'manager', 'warehouse')
    )
  );

CREATE POLICY "Infrastructure warehouse can approve allocations"
  ON stock_allocations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_warehouse')
    )
  );

-- ============================================================================
-- RLS POLICIES - Driver Vehicle Inventory
-- ============================================================================

CREATE POLICY "Drivers can view own inventory"
  ON driver_vehicle_inventory FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.uid()
    OR business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'manager', 'dispatcher')
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_manager', 'infrastructure_warehouse')
    )
  );

CREATE POLICY "Drivers and managers can update driver inventory"
  ON driver_vehicle_inventory FOR ALL
  TO authenticated
  USING (
    driver_id = auth.uid()
    OR business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'manager', 'warehouse')
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_warehouse')
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate allocation number
CREATE OR REPLACE FUNCTION generate_allocation_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ALLOC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('allocation_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create sequence for allocation numbers
CREATE SEQUENCE IF NOT EXISTS allocation_number_seq START 1;

-- Function to automatically set allocation number
CREATE OR REPLACE FUNCTION set_allocation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.allocation_number IS NULL THEN
    NEW.allocation_number := generate_allocation_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_allocation_number_trigger
  BEFORE INSERT ON stock_allocations
  FOR EACH ROW
  EXECUTE FUNCTION set_allocation_number();

-- Function to validate warehouse scope on allocations
CREATE OR REPLACE FUNCTION validate_allocation_scope()
RETURNS TRIGGER AS $$
DECLARE
  v_from_scope TEXT;
  v_to_scope TEXT;
BEGIN
  SELECT scope_level INTO v_from_scope FROM warehouses WHERE id = NEW.from_warehouse_id;
  SELECT scope_level INTO v_to_scope FROM warehouses WHERE id = NEW.to_warehouse_id;
  
  IF v_from_scope != 'infrastructure' THEN
    RAISE EXCEPTION 'Allocations must originate from infrastructure warehouses';
  END IF;
  
  IF v_to_scope != 'business' THEN
    RAISE EXCEPTION 'Allocations must be destined for business warehouses';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_allocation_scope_trigger
  BEFORE INSERT ON stock_allocations
  FOR EACH ROW
  EXECUTE FUNCTION validate_allocation_scope();

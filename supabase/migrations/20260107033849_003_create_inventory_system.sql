-- Inventory & Warehouse Management
--
-- 1. New Tables
--    - inventory_locations: Warehouses, stores, driver vehicles
--    - inventory: Stock levels per location and product
--    - inventory_logs: All inventory movements
--    - restock_requests: Requests for inventory replenishment
--
-- 2. Security
--    - Warehouse staff can manage inventory
--    - Drivers can view their assigned inventory
--    - Business owners have full access

-- Create inventory_locations table
CREATE TABLE IF NOT EXISTS inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('warehouse', 'store', 'vehicle', 'supplier', 'customer', 'other')),
  address text,
  city text,
  region text,
  postal_code text,
  country text DEFAULT 'US',
  contact_name text,
  contact_phone text,
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  quantity_on_hand int DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_reserved int DEFAULT 0 CHECK (quantity_reserved >= 0),
  quantity_available int GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  reorder_point int DEFAULT 0,
  reorder_quantity int DEFAULT 0,
  last_counted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, location_id)
);

-- Create inventory_logs table
CREATE TABLE IF NOT EXISTS inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('receive', 'ship', 'adjust', 'count', 'transfer', 'damage', 'return')),
  quantity_change int NOT NULL,
  quantity_before int NOT NULL,
  quantity_after int NOT NULL,
  reference_id uuid,
  reference_type text,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create restock_requests table
CREATE TABLE IF NOT EXISTS restock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_quantity int NOT NULL CHECK (requested_quantity > 0),
  from_location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL,
  to_location_id uuid NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled')),
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  approved_quantity int,
  fulfilled_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  fulfilled_at timestamptz,
  fulfilled_quantity int,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create driver_inventory table (for drivers carrying products)
CREATE TABLE IF NOT EXISTS driver_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity int DEFAULT 0 CHECK (quantity >= 0),
  location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, product_id)
);

-- Enable RLS
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_inventory ENABLE ROW LEVEL SECURITY;

-- Inventory locations policies
CREATE POLICY "Business owners can manage locations"
  ON inventory_locations FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view locations"
  ON inventory_locations FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles WHERE user_id = auth.uid() AND active = true
    )
  );

-- Inventory policies
CREATE POLICY "Business owners can manage inventory"
  ON inventory FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Warehouse staff can manage inventory"
  ON inventory FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles 
      WHERE user_id = auth.uid() 
      AND role = 'warehouse'
      AND active = true
    )
  );

CREATE POLICY "Staff can view inventory"
  ON inventory FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles WHERE user_id = auth.uid() AND active = true
    )
  );

-- Inventory logs policies
CREATE POLICY "Business owners can view logs"
  ON inventory_logs FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Warehouse staff can create logs"
  ON inventory_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_business_roles 
      WHERE user_id = auth.uid() 
      AND role = 'warehouse'
      AND active = true
    )
  );

-- Restock requests policies
CREATE POLICY "Business owners can manage restock requests"
  ON restock_requests FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can create restock requests"
  ON restock_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_business_roles WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Staff can view restock requests"
  ON restock_requests FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles WHERE user_id = auth.uid() AND active = true
    )
  );

-- Driver inventory policies
CREATE POLICY "Drivers can view own inventory"
  ON driver_inventory FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Warehouse staff can manage driver inventory"
  ON driver_inventory FOR ALL
  TO authenticated
  USING (
    driver_id IN (
      SELECT user_id FROM user_business_roles 
      WHERE business_id IN (
        SELECT business_id FROM user_business_roles 
        WHERE user_id = auth.uid() 
        AND role = 'warehouse'
        AND active = true
      )
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS inventory_locations_business_id_idx ON inventory_locations(business_id);
CREATE INDEX IF NOT EXISTS inventory_business_id_idx ON inventory(business_id);
CREATE INDEX IF NOT EXISTS inventory_product_id_idx ON inventory(product_id);
CREATE INDEX IF NOT EXISTS inventory_location_id_idx ON inventory(location_id);
CREATE INDEX IF NOT EXISTS inventory_logs_business_id_idx ON inventory_logs(business_id);
CREATE INDEX IF NOT EXISTS inventory_logs_product_id_idx ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS inventory_logs_created_at_idx ON inventory_logs(created_at);
CREATE INDEX IF NOT EXISTS restock_requests_business_id_idx ON restock_requests(business_id);
CREATE INDEX IF NOT EXISTS restock_requests_status_idx ON restock_requests(status);
CREATE INDEX IF NOT EXISTS driver_inventory_driver_id_idx ON driver_inventory(driver_id);

-- Create function to update inventory automatically
CREATE OR REPLACE FUNCTION update_inventory_from_log()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inventory
  SET 
    quantity_on_hand = quantity_on_hand + NEW.quantity_change,
    updated_at = now()
  WHERE product_id = NEW.product_id AND location_id = NEW.location_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory logs
CREATE TRIGGER inventory_log_update_stock
  AFTER INSERT ON inventory_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_from_log();
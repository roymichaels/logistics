-- Orders & Delivery Management
--
-- 1. New Tables
--    - orders: Customer orders
--    - order_items: Line items in orders
--    - order_status_history: Status change tracking
--    - zones: Delivery zones
--    - driver_profiles: Driver-specific data
--    - driver_status: Current driver status
--    - order_assignments: Driver assignments
--
-- 2. Security
--    - Customers can view own orders
--    - Business staff can manage orders
--    - Drivers can view assigned orders

-- Create zones table
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  color text DEFAULT '#3b82f6',
  city text,
  region text,
  polygon jsonb,
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer_addresses table
CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label text DEFAULT 'Home',
  street_address text NOT NULL,
  apartment text,
  city text NOT NULL,
  region text,
  postal_code text,
  country text DEFAULT 'US',
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  is_default boolean DEFAULT false,
  delivery_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  delivery_address_id uuid REFERENCES customer_addresses(id) ON DELETE SET NULL,
  delivery_address jsonb,
  delivery_zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  subtotal decimal(10, 2) DEFAULT 0,
  tax decimal(10, 2) DEFAULT 0,
  delivery_fee decimal(10, 2) DEFAULT 0,
  discount decimal(10, 2) DEFAULT 0,
  total decimal(10, 2) NOT NULL,
  currency text DEFAULT 'USD',
  payment_method text,
  notes text,
  customer_notes text,
  estimated_delivery_at timestamptz,
  confirmed_at timestamptz,
  prepared_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, order_number)
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price decimal(10, 2) NOT NULL,
  subtotal decimal(10, 2) NOT NULL,
  discount decimal(10, 2) DEFAULT 0,
  total decimal(10, 2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create order_status_history table
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create driver_profiles table
CREATE TABLE IF NOT EXISTS driver_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  vehicle_type text,
  vehicle_plate text,
  license_number text,
  phone text,
  rating decimal(3, 2) DEFAULT 5.00,
  total_deliveries int DEFAULT 0,
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create driver_status table
CREATE TABLE IF NOT EXISTS driver_status (
  driver_id uuid PRIMARY KEY REFERENCES driver_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'offline' CHECK (status IN ('online', 'busy', 'offline', 'break')),
  current_zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  last_location_update timestamptz,
  last_updated timestamptz DEFAULT now()
);

-- Create driver_zones table (many-to-many)
CREATE TABLE IF NOT EXISTS driver_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  active boolean DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, zone_id)
);

-- Create order_assignments table
CREATE TABLE IF NOT EXISTS order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'rejected', 'completed', 'cancelled')),
  assigned_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  rejected_at timestamptz,
  completed_at timestamptz,
  notes text,
  UNIQUE(order_id, driver_id, assigned_at)
);

-- Enable RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;

-- Zones policies
CREATE POLICY "Business owners can manage zones"
  ON zones FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view zones"
  ON zones FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles WHERE user_id = auth.uid() AND active = true
    )
  );

-- Customer addresses policies
CREATE POLICY "Users can manage own addresses"
  ON customer_addresses FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Orders policies
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Business owners can manage orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Drivers can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT order_id FROM order_assignments WHERE driver_id = auth.uid()
    )
  );

-- Order items policies
CREATE POLICY "Customers can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage order items"
  ON order_items FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE business_id IN (
        SELECT business_id FROM user_business_roles WHERE user_id = auth.uid() AND active = true
      )
    )
  );

-- Driver profiles policies
CREATE POLICY "Drivers can view own profile"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Business owners can manage driver profiles"
  ON driver_profiles FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Driver status policies
CREATE POLICY "Drivers can manage own status"
  ON driver_status FOR ALL
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Dispatchers can view driver status"
  ON driver_status FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM driver_profiles WHERE business_id IN (
        SELECT business_id FROM user_business_roles 
        WHERE user_id = auth.uid() 
        AND role = 'dispatcher'
        AND active = true
      )
    )
  );

-- Order assignments policies
CREATE POLICY "Drivers can view own assignments"
  ON order_assignments FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Drivers can update own assignments"
  ON order_assignments FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Dispatchers can manage assignments"
  ON order_assignments FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE business_id IN (
        SELECT business_id FROM user_business_roles 
        WHERE user_id = auth.uid() 
        AND role = 'dispatcher'
        AND active = true
      )
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS zones_business_id_idx ON zones(business_id);
CREATE INDEX IF NOT EXISTS customer_addresses_user_id_idx ON customer_addresses(user_id);
CREATE INDEX IF NOT EXISTS orders_business_id_idx ON orders(business_id);
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_status_history_order_id_idx ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS driver_profiles_business_id_idx ON driver_profiles(business_id);
CREATE INDEX IF NOT EXISTS driver_zones_driver_id_idx ON driver_zones(driver_id);
CREATE INDEX IF NOT EXISTS order_assignments_order_id_idx ON order_assignments(order_id);
CREATE INDEX IF NOT EXISTS order_assignments_driver_id_idx ON order_assignments(driver_id);
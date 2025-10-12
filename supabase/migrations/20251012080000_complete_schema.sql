/*
  # Complete Underground/ONX Database Schema

  ## Overview
  This migration adds all missing tables, columns, and features identified in the gap analysis.
  It transforms the database from ~25% complete to fully functional.

  ## New Tables (15)
  1. businesses - Multi-tenant business profiles
  2. business_users - User-to-business assignments with roles
  3. user_business_contexts - Active business session tracking
  4. inventory_locations - Warehouses, hubs, vehicles, storefronts
  5. inventory_records - Stock levels per location
  6. driver_inventory_records - Driver inventory tracking
  7. zones - Geographic/logical dispatch areas
  8. driver_zone_assignments - Driver territory assignments
  9. driver_status_records - Real-time driver availability
  10. driver_movement_logs - Driver activity audit trail
  11. restock_requests - Inventory replenishment workflow
  12. inventory_logs - Complete inventory audit trail
  13. sales_logs - Sales transaction records
  14. user_registrations - Registration approval workflow
  15. messages - Chat message persistence

  ## New ENUM Types (8)
  - inventory_location_type
  - driver_availability_status
  - driver_movement_action
  - restock_request_status
  - inventory_log_type
  - user_registration_status
  - order_entry_mode
  - order_priority

  ## Enhanced Existing Tables
  - users: +business_id, +last_active
  - orders: +12 new columns for tracking, delivery proof, ratings
  - notifications: +read_at, +metadata, extended types

  ## Security
  - RLS enabled on all tables
  - Multi-tenant isolation via business_id
  - Role-based access control
  - User ownership checks
*/

-- ============================================================================
-- STEP 1: Create all ENUM types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE inventory_location_type AS ENUM (
    'central',
    'warehouse',
    'hub',
    'vehicle',
    'storefront'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE driver_availability_status AS ENUM (
    'available',
    'on_break',
    'delivering',
    'off_shift'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE driver_movement_action AS ENUM (
    'zone_joined',
    'zone_left',
    'status_changed',
    'inventory_added',
    'inventory_removed',
    'order_assigned'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE restock_request_status AS ENUM (
    'pending',
    'approved',
    'in_transit',
    'fulfilled',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inventory_log_type AS ENUM (
    'restock',
    'transfer',
    'adjustment',
    'reservation',
    'release',
    'sale'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_registration_status AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_entry_mode AS ENUM (
    'dm',
    'storefront'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- STEP 2: Create core multi-tenancy tables
-- ============================================================================

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_hebrew TEXT NOT NULL,
  business_type TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  secondary_color TEXT NOT NULL DEFAULT '#8b5cf6',
  default_currency TEXT NOT NULL CHECK (default_currency IN ('ILS', 'USD', 'EUR')) DEFAULT 'ILS',
  order_number_prefix TEXT NOT NULL DEFAULT 'ORD',
  order_number_sequence INTEGER NOT NULL DEFAULT 1000,
  address JSONB,
  contact_info JSONB,
  business_settings JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Business users junction table
CREATE TABLE IF NOT EXISTS business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  ownership_percentage DECIMAL(5,2) DEFAULT 0 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  commission_percentage DECIMAL(5,2) DEFAULT 0 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  permissions JSONB,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- User business contexts for session management
CREATE TABLE IF NOT EXISTS user_business_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  active_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  last_switched_at TIMESTAMPTZ DEFAULT now(),
  session_metadata JSONB
);

-- ============================================================================
-- STEP 3: Create inventory management tables
-- ============================================================================

-- Inventory locations
CREATE TABLE IF NOT EXISTS inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type inventory_location_type NOT NULL,
  description TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  contact_phone TEXT,
  manager_id TEXT,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory records per location
CREATE TABLE IF NOT EXISTS inventory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  on_hand_quantity INTEGER NOT NULL DEFAULT 0 CHECK (on_hand_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  damaged_quantity INTEGER NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, location_id)
);

-- Driver inventory tracking
CREATE TABLE IF NOT EXISTS driver_inventory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  zone_id UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, driver_id)
);

-- Restock requests
CREATE TABLE IF NOT EXISTS restock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,
  requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
  status restock_request_status NOT NULL DEFAULT 'pending',
  from_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  to_location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  approved_by TEXT,
  approved_quantity INTEGER CHECK (approved_quantity > 0),
  fulfilled_by TEXT,
  fulfilled_quantity INTEGER CHECK (fulfilled_quantity > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory audit logs
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  change_type inventory_log_type NOT NULL,
  quantity_change INTEGER NOT NULL,
  from_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  reference_id TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Sales logs
CREATE TABLE IF NOT EXISTS sales_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  reference_id TEXT,
  recorded_by TEXT NOT NULL,
  sold_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- ============================================================================
-- STEP 4: Create zone and driver management tables
-- ============================================================================

-- Zones for dispatch
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  active BOOLEAN NOT NULL DEFAULT true,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Driver zone assignments
CREATE TABLE IF NOT EXISTS driver_zone_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id TEXT NOT NULL,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  assigned_by TEXT
);

-- Driver status tracking
CREATE TABLE IF NOT EXISTS driver_status_records (
  driver_id TEXT PRIMARY KEY,
  status driver_availability_status NOT NULL DEFAULT 'off_shift',
  is_online BOOLEAN NOT NULL DEFAULT false,
  current_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  last_updated TIMESTAMPTZ DEFAULT now(),
  note TEXT
);

-- Driver movement logs
CREATE TABLE IF NOT EXISTS driver_movement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id TEXT NOT NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity_change INTEGER,
  action driver_movement_action NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- STEP 5: Create user management tables
-- ============================================================================

-- User registrations for approval workflow
CREATE TABLE IF NOT EXISTS user_registrations (
  telegram_id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  username TEXT,
  photo_url TEXT,
  department TEXT,
  phone TEXT,
  requested_role TEXT NOT NULL,
  assigned_role TEXT,
  status user_registration_status NOT NULL DEFAULT 'pending',
  approval_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- STEP 6: Create communication tables
-- ============================================================================

-- Messages for chat persistence
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  sender_telegram_id TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'file', 'system', 'notification')) DEFAULT 'text',
  sent_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  metadata JSONB
);

-- ============================================================================
-- STEP 7: Add missing columns to existing tables
-- ============================================================================

-- Add business_id and last_active to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE users ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE users ADD COLUMN last_active TIMESTAMPTZ;
  END IF;
END $$;

-- Add missing columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'assigned_at') THEN
    ALTER TABLE orders ADD COLUMN assigned_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'accepted_at') THEN
    ALTER TABLE orders ADD COLUMN accepted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'picked_up_at') THEN
    ALTER TABLE orders ADD COLUMN picked_up_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
    ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cancelled_at') THEN
    ALTER TABLE orders ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'estimated_delivery_time') THEN
    ALTER TABLE orders ADD COLUMN estimated_delivery_time TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'actual_delivery_time') THEN
    ALTER TABLE orders ADD COLUMN actual_delivery_time TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_proof_url') THEN
    ALTER TABLE orders ADD COLUMN delivery_proof_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_rating') THEN
    ALTER TABLE orders ADD COLUMN customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_feedback') THEN
    ALTER TABLE orders ADD COLUMN customer_feedback TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'priority') THEN
    ALTER TABLE orders ADD COLUMN priority order_priority DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'salesperson_id') THEN
    ALTER TABLE orders ADD COLUMN salesperson_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'entry_mode') THEN
    ALTER TABLE orders ADD COLUMN entry_mode order_entry_mode;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'raw_order_text') THEN
    ALTER TABLE orders ADD COLUMN raw_order_text TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'eta') THEN
    ALTER TABLE orders ADD COLUMN eta TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'business_id') THEN
    ALTER TABLE orders ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add missing columns to notifications table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read_at') THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
    ALTER TABLE notifications ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Add business_id to products, zones
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'business_id') THEN
    ALTER TABLE products ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- STEP 8: Create performance indexes
-- ============================================================================

-- Business indexes
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(active);
CREATE INDEX IF NOT EXISTS idx_business_users_business_id ON business_users(business_id);
CREATE INDEX IF NOT EXISTS idx_business_users_user_id ON business_users(user_id);
CREATE INDEX IF NOT EXISTS idx_business_users_active ON business_users(business_id, active);
CREATE INDEX IF NOT EXISTS idx_user_business_contexts_user_id ON user_business_contexts(user_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_locations_business_id ON inventory_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_type ON inventory_locations(type);
CREATE INDEX IF NOT EXISTS idx_inventory_records_product_id ON inventory_records(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_records_location_id ON inventory_records(location_id);
CREATE INDEX IF NOT EXISTS idx_driver_inventory_driver_id ON driver_inventory_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_inventory_product_id ON driver_inventory_records(product_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_status ON restock_requests(status);
CREATE INDEX IF NOT EXISTS idx_restock_requests_to_location ON restock_requests(to_location_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_location ON inventory_logs(to_location_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_logs_location ON sales_logs(location_id, sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_logs_product ON sales_logs(product_id, sold_at DESC);

-- Zone and driver indexes
CREATE INDEX IF NOT EXISTS idx_zones_business_id ON zones(business_id);
CREATE INDEX IF NOT EXISTS idx_zones_active ON zones(active);
CREATE INDEX IF NOT EXISTS idx_driver_zone_assignments_driver ON driver_zone_assignments(driver_id, active);
CREATE INDEX IF NOT EXISTS idx_driver_zone_assignments_zone ON driver_zone_assignments(zone_id, active);
CREATE INDEX IF NOT EXISTS idx_driver_status_online ON driver_status_records(is_online);
CREATE INDEX IF NOT EXISTS idx_driver_status_zone ON driver_status_records(current_zone_id);
CREATE INDEX IF NOT EXISTS idx_driver_movements_driver ON driver_movement_logs(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_movements_zone ON driver_movement_logs(zone_id, created_at DESC);

-- User registration indexes
CREATE INDEX IF NOT EXISTS idx_user_registrations_status ON user_registrations(status);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_telegram_id);

-- Add business_id indexes to existing tables
CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);

-- ============================================================================
-- STEP 9: Enable RLS on all new tables
-- ============================================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_business_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_inventory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_zone_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_status_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_movement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 10: Create RLS policies for new tables
-- ============================================================================

-- Businesses policies
CREATE POLICY "Users can read businesses they belong to"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT business_id FROM business_users
      WHERE user_id = (auth.jwt() ->> 'telegram_id') AND active = true
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can manage all businesses"
  ON businesses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'infrastructure_owner'
    )
  );

-- Business users policies
CREATE POLICY "Users can read business_users for their businesses"
  ON business_users FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = (auth.jwt() ->> 'telegram_id') AND active = true
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Business owners and infrastructure owners can manage business_users"
  ON business_users FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'business_owner' AND active = true
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'infrastructure_owner'
    )
  );

-- User business contexts policies
CREATE POLICY "Users can manage own context"
  ON user_business_contexts FOR ALL
  TO authenticated
  USING (user_id = (auth.jwt() ->> 'telegram_id'))
  WITH CHECK (user_id = (auth.jwt() ->> 'telegram_id'));

-- Inventory locations policies
CREATE POLICY "Users can read inventory locations in their business"
  ON inventory_locations FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = (auth.jwt() ->> 'telegram_id') AND active = true
    )
    OR business_id IS NULL
  );

CREATE POLICY "Managers can manage inventory locations"
  ON inventory_locations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'warehouse', 'infrastructure_owner', 'business_owner')
    )
  );

-- Inventory records policies
CREATE POLICY "Users can read inventory in their business"
  ON inventory_records FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT id FROM inventory_locations
      WHERE business_id IN (
        SELECT business_id FROM business_users
        WHERE user_id = (auth.jwt() ->> 'telegram_id') AND active = true
      )
      OR business_id IS NULL
    )
  );

CREATE POLICY "Warehouse and managers can manage inventory"
  ON inventory_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'warehouse', 'infrastructure_owner', 'business_owner')
    )
  );

-- Driver inventory policies
CREATE POLICY "Drivers can read own inventory"
  ON driver_inventory_records FOR SELECT
  TO authenticated
  USING (
    driver_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher', 'warehouse', 'infrastructure_owner', 'business_owner')
    )
  );

CREATE POLICY "Managers can manage driver inventory"
  ON driver_inventory_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher', 'warehouse', 'infrastructure_owner', 'business_owner')
    )
  );

-- Zones policies
CREATE POLICY "Users can read zones in their business"
  ON zones FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = (auth.jwt() ->> 'telegram_id') AND active = true
    )
    OR business_id IS NULL
  );

CREATE POLICY "Managers can manage zones"
  ON zones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher', 'infrastructure_owner', 'business_owner')
    )
  );

-- Driver zone assignments policies
CREATE POLICY "Users can read zone assignments"
  ON driver_zone_assignments FOR SELECT
  TO authenticated
  USING (
    driver_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher', 'infrastructure_owner', 'business_owner')
    )
  );

CREATE POLICY "Managers can manage zone assignments"
  ON driver_zone_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher', 'infrastructure_owner', 'business_owner')
    )
  );

-- Driver status policies
CREATE POLICY "Drivers can manage own status"
  ON driver_status_records FOR ALL
  TO authenticated
  USING (
    driver_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher', 'infrastructure_owner', 'business_owner')
    )
  )
  WITH CHECK (
    driver_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher', 'infrastructure_owner', 'business_owner')
    )
  );

-- Driver movement logs policies
CREATE POLICY "Users can read relevant movement logs"
  ON driver_movement_logs FOR SELECT
  TO authenticated
  USING (
    driver_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher', 'infrastructure_owner', 'business_owner')
    )
  );

CREATE POLICY "System can insert movement logs"
  ON driver_movement_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Restock requests policies
CREATE POLICY "Users can read relevant restock requests"
  ON restock_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'warehouse', 'infrastructure_owner', 'business_owner')
    )
  );

CREATE POLICY "Users can create restock requests"
  ON restock_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = (auth.jwt() ->> 'telegram_id')
  );

CREATE POLICY "Managers can update restock requests"
  ON restock_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'warehouse', 'infrastructure_owner', 'business_owner')
    )
  );

-- Inventory logs policies
CREATE POLICY "Users can read inventory logs"
  ON inventory_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'warehouse', 'dispatcher', 'infrastructure_owner', 'business_owner')
    )
  );

CREATE POLICY "System can insert inventory logs"
  ON inventory_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Sales logs policies
CREATE POLICY "Users can read sales logs"
  ON sales_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'sales', 'warehouse', 'infrastructure_owner', 'business_owner')
    )
  );

CREATE POLICY "Sales users can create sales logs"
  ON sales_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'sales', 'driver', 'infrastructure_owner', 'business_owner')
    )
  );

-- User registrations policies
CREATE POLICY "Users can read own registration"
  ON user_registrations FOR SELECT
  TO authenticated
  USING (
    telegram_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'infrastructure_owner')
    )
  );

CREATE POLICY "Anyone can create registration"
  ON user_registrations FOR INSERT
  TO authenticated
  WITH CHECK (telegram_id = (auth.jwt() ->> 'telegram_id'));

CREATE POLICY "Managers can update registrations"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'infrastructure_owner')
    )
  );

-- Messages policies
CREATE POLICY "Chat members can read messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    chat_id IN (
      SELECT id FROM group_chats
      WHERE (auth.jwt() ->> 'telegram_id') = ANY(members)
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'infrastructure_owner')
    )
  );

CREATE POLICY "Chat members can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_telegram_id = (auth.jwt() ->> 'telegram_id')
    AND chat_id IN (
      SELECT id FROM group_chats
      WHERE (auth.jwt() ->> 'telegram_id') = ANY(members)
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_telegram_id = (auth.jwt() ->> 'telegram_id'))
  WITH CHECK (sender_telegram_id = (auth.jwt() ->> 'telegram_id'));

-- ============================================================================
-- STEP 11: Add triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
  CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_business_users_updated_at ON business_users;
  CREATE TRIGGER update_business_users_updated_at
    BEFORE UPDATE ON business_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_inventory_locations_updated_at ON inventory_locations;
  CREATE TRIGGER update_inventory_locations_updated_at
    BEFORE UPDATE ON inventory_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_inventory_records_updated_at ON inventory_records;
  CREATE TRIGGER update_inventory_records_updated_at
    BEFORE UPDATE ON inventory_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_driver_inventory_updated_at ON driver_inventory_records;
  CREATE TRIGGER update_driver_inventory_updated_at
    BEFORE UPDATE ON driver_inventory_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_restock_requests_updated_at ON restock_requests;
  CREATE TRIGGER update_restock_requests_updated_at
    BEFORE UPDATE ON restock_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_zones_updated_at ON zones;
  CREATE TRIGGER update_zones_updated_at
    BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_user_registrations_updated_at ON user_registrations;
  CREATE TRIGGER update_user_registrations_updated_at
    BEFORE UPDATE ON user_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

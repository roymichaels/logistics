-- Add Missing Operational Tables Migration
-- This migration adds all the missing tables that are causing 404 errors

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid,
  business_id uuid,
  recipient_id uuid NOT NULL,
  sender_id uuid,
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

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;

-- 2. ZONES TABLE
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid,
  business_id uuid,
  name text NOT NULL,
  code text,
  color text DEFAULT '#1DA1F2',
  description text,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view zones"
  ON zones FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_zones_business_id ON zones(business_id);

-- 3. DRIVER STATUS TABLE
CREATE TABLE IF NOT EXISTS driver_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL UNIQUE,
  infrastructure_id uuid,
  business_id uuid,
  status text NOT NULL CHECK (status IN ('off_shift', 'available', 'busy', 'on_break', 'unavailable')),
  is_online boolean NOT NULL DEFAULT false,
  current_zone_id uuid,
  last_updated timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE driver_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view driver status"
  ON driver_status FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_driver_status_driver_id ON driver_status(driver_id);

-- 4. INVENTORY LOW STOCK ALERTS TABLE
CREATE TABLE IF NOT EXISTS inventory_low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_name text,
  location_id uuid,
  location_name text,
  on_hand_quantity integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 10,
  business_id uuid,
  infrastructure_id uuid,
  triggered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory_low_stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view low stock alerts"
  ON inventory_low_stock_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_low_stock_business_id ON inventory_low_stock_alerts(business_id);

-- 5. RESTOCK REQUESTS TABLE
CREATE TABLE IF NOT EXISTS restock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid,
  business_id uuid,
  product_id uuid NOT NULL,
  from_location_id uuid,
  to_location_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  requested_quantity integer NOT NULL CHECK (requested_quantity > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view restock requests"
  ON restock_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_restock_requests_business_id ON restock_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_status ON restock_requests(status);

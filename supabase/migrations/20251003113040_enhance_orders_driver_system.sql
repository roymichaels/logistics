/*
  # Enhanced Orders and Driver Management System
  
  ## Overview
  Complete orders management system with driver assignment, real-time tracking, and notifications.
  
  ## New Tables Created
  
  ### 1. driver_profiles
  - id (uuid, primary key)
  - user_id (text, references users.telegram_id)
  - vehicle_type (text)
  - vehicle_plate (text)
  - rating (numeric, default 5.0)
  - total_deliveries (integer, default 0)
  - successful_deliveries (integer, default 0)
  - current_latitude (numeric)
  - current_longitude (numeric)
  - location_updated_at (timestamptz)
  - is_available (boolean, default true)
  - max_orders_capacity (integer, default 5)
  - created_at (timestamptz)
  - updated_at (timestamptz)
  
  ### 2. order_assignments
  - id (uuid, primary key)
  - order_id (uuid, references orders.id)
  - driver_id (text, references users.telegram_id)
  - assigned_by (text)
  - assigned_at (timestamptz)
  - response_status (enum: pending, accepted, declined, timeout)
  - responded_at (timestamptz)
  - timeout_at (timestamptz)
  - notes (text)
  
  ### 3. order_status_history
  - id (uuid, primary key)
  - order_id (uuid, references orders.id)
  - status (text)
  - changed_by (text)
  - changed_at (timestamptz)
  - notes (text)
  - metadata (jsonb)
  
  ### 4. driver_locations
  - id (uuid, primary key)
  - driver_id (text, references users.telegram_id)
  - latitude (numeric)
  - longitude (numeric)
  - accuracy (numeric)
  - heading (numeric)
  - speed (numeric)
  - recorded_at (timestamptz)
  
  ### 5. order_notifications
  - id (uuid, primary key)
  - order_id (uuid, references orders.id)
  - driver_id (text)
  - notification_type (enum: assignment, reminder, timeout)
  - sent_at (timestamptz)
  - read_at (timestamptz)
  - responded_at (timestamptz)
  - response (text)
  
  ## Modified Tables
  
  ### orders
  - Added: assigned_at (timestamptz)
  - Added: accepted_at (timestamptz)
  - Added: picked_up_at (timestamptz)
  - Added: delivered_at (timestamptz)
  - Added: cancelled_at (timestamptz)
  - Added: estimated_delivery_time (timestamptz)
  - Added: actual_delivery_time (timestamptz)
  - Added: delivery_proof_url (text)
  - Added: customer_rating (integer)
  - Added: customer_feedback (text)
  - Added: priority (text, enum: low, medium, high, urgent)
  
  ## Security
  - RLS enabled on all tables
  - Policies for role-based access (owner, manager, dispatcher, driver)
  - Driver can only view/update their own data
  - Managers and dispatchers have full access
*/

-- Create driver_profiles table
CREATE TABLE IF NOT EXISTS driver_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE REFERENCES users(telegram_id) ON DELETE CASCADE,
  vehicle_type text,
  vehicle_plate text,
  rating numeric DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  total_deliveries integer DEFAULT 0 CHECK (total_deliveries >= 0),
  successful_deliveries integer DEFAULT 0 CHECK (successful_deliveries >= 0),
  current_latitude numeric,
  current_longitude numeric,
  location_updated_at timestamptz,
  is_available boolean DEFAULT true,
  max_orders_capacity integer DEFAULT 5 CHECK (max_orders_capacity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_assignments table
CREATE TABLE IF NOT EXISTS order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  assigned_by text NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  response_status text DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined', 'timeout')),
  responded_at timestamptz,
  timeout_at timestamptz,
  notes text
);

-- Create order_status_history table
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create driver_locations table
CREATE TABLE IF NOT EXISTS driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  accuracy numeric,
  heading numeric,
  speed numeric,
  recorded_at timestamptz DEFAULT now()
);

-- Create order_notifications table
CREATE TABLE IF NOT EXISTS order_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('assignment', 'reminder', 'timeout')),
  sent_at timestamptz DEFAULT now(),
  read_at timestamptz,
  responded_at timestamptz,
  response text
);

-- Add new columns to orders table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'assigned_at') THEN
    ALTER TABLE orders ADD COLUMN assigned_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'accepted_at') THEN
    ALTER TABLE orders ADD COLUMN accepted_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'picked_up_at') THEN
    ALTER TABLE orders ADD COLUMN picked_up_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
    ALTER TABLE orders ADD COLUMN delivered_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cancelled_at') THEN
    ALTER TABLE orders ADD COLUMN cancelled_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'estimated_delivery_time') THEN
    ALTER TABLE orders ADD COLUMN estimated_delivery_time timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'actual_delivery_time') THEN
    ALTER TABLE orders ADD COLUMN actual_delivery_time timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_proof_url') THEN
    ALTER TABLE orders ADD COLUMN delivery_proof_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_rating') THEN
    ALTER TABLE orders ADD COLUMN customer_rating integer CHECK (customer_rating >= 1 AND customer_rating <= 5);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_feedback') THEN
    ALTER TABLE orders ADD COLUMN customer_feedback text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'priority') THEN
    ALTER TABLE orders ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_available ON driver_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_order_assignments_order_id ON order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_driver_id ON order_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_response_status ON order_assignments(response_status);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_recorded_at ON driver_locations(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_notifications_driver_id ON order_notifications(driver_id);
CREATE INDEX IF NOT EXISTS idx_order_notifications_order_id ON order_notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver ON orders(assigned_driver);
CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);

-- Enable RLS on all new tables
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_profiles
CREATE POLICY "Drivers can view own profile"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (
    user_id = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.telegram_id = current_setting('app.current_user_id', true)
      AND users.role IN ('owner', 'manager', 'dispatcher')
    )
  );

CREATE POLICY "Drivers can update own profile"
  ON driver_profiles FOR UPDATE
  TO authenticated
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Managers can manage driver profiles"
  ON driver_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.telegram_id = current_setting('app.current_user_id', true)
      AND users.role IN ('owner', 'manager')
    )
  );

-- RLS Policies for order_assignments
CREATE POLICY "Drivers can view own assignments"
  ON order_assignments FOR SELECT
  TO authenticated
  USING (
    driver_id = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.telegram_id = current_setting('app.current_user_id', true)
      AND users.role IN ('owner', 'manager', 'dispatcher')
    )
  );

CREATE POLICY "Drivers can update own assignment responses"
  ON order_assignments FOR UPDATE
  TO authenticated
  USING (driver_id = current_setting('app.current_user_id', true))
  WITH CHECK (driver_id = current_setting('app.current_user_id', true));

CREATE POLICY "Managers can manage order assignments"
  ON order_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.telegram_id = current_setting('app.current_user_id', true)
      AND users.role IN ('owner', 'manager', 'dispatcher')
    )
  );

-- RLS Policies for order_status_history
CREATE POLICY "Users can view order status history"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.telegram_id = current_setting('app.current_user_id', true)
      AND users.role IN ('owner', 'manager', 'dispatcher', 'driver', 'sales')
    )
  );

CREATE POLICY "Authorized users can insert order status history"
  ON order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.telegram_id = current_setting('app.current_user_id', true)
      AND users.role IN ('owner', 'manager', 'dispatcher', 'driver', 'sales')
    )
  );

-- RLS Policies for driver_locations
CREATE POLICY "Drivers can insert own locations"
  ON driver_locations FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = current_setting('app.current_user_id', true));

CREATE POLICY "Drivers can view own locations"
  ON driver_locations FOR SELECT
  TO authenticated
  USING (
    driver_id = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.telegram_id = current_setting('app.current_user_id', true)
      AND users.role IN ('owner', 'manager', 'dispatcher')
    )
  );

-- RLS Policies for order_notifications
CREATE POLICY "Drivers can view own notifications"
  ON order_notifications FOR SELECT
  TO authenticated
  USING (
    driver_id = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.telegram_id = current_setting('app.current_user_id', true)
      AND users.role IN ('owner', 'manager', 'dispatcher')
    )
  );

CREATE POLICY "Drivers can update own notifications"
  ON order_notifications FOR UPDATE
  TO authenticated
  USING (driver_id = current_setting('app.current_user_id', true))
  WITH CHECK (driver_id = current_setting('app.current_user_id', true));

CREATE POLICY "System can insert order notifications"
  ON order_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.telegram_id = current_setting('app.current_user_id', true)
      AND users.role IN ('owner', 'manager', 'dispatcher')
    )
  );

-- Create function to automatically create driver profile when user role is set to driver
CREATE OR REPLACE FUNCTION create_driver_profile_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'driver' AND OLD.role != 'driver' THEN
    INSERT INTO driver_profiles (user_id)
    VALUES (NEW.telegram_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_driver_profile
  AFTER UPDATE OF role ON users
  FOR EACH ROW
  WHEN (NEW.role = 'driver')
  EXECUTE FUNCTION create_driver_profile_on_role_change();

-- Create function to log order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, status, changed_by, notes)
    VALUES (
      NEW.id,
      NEW.status,
      current_setting('app.current_user_id', true),
      CASE
        WHEN NEW.status = 'confirmed' THEN 'Order confirmed by system'
        WHEN NEW.status = 'preparing' THEN 'Order preparation started'
        WHEN NEW.status = 'ready' THEN 'Order ready for pickup'
        WHEN NEW.status = 'out_for_delivery' THEN 'Order out for delivery'
        WHEN NEW.status = 'delivered' THEN 'Order delivered successfully'
        WHEN NEW.status = 'cancelled' THEN 'Order cancelled'
        ELSE 'Status changed to ' || NEW.status
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

-- Create function to update driver profile stats on delivery completion
CREATE OR REPLACE FUNCTION update_driver_stats_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.assigned_driver IS NOT NULL THEN
    UPDATE driver_profiles
    SET 
      total_deliveries = total_deliveries + 1,
      successful_deliveries = successful_deliveries + 1,
      rating = CASE
        WHEN NEW.customer_rating IS NOT NULL THEN
          (rating * total_deliveries + NEW.customer_rating) / (total_deliveries + 1)
        ELSE rating
      END,
      updated_at = now()
    WHERE user_id = NEW.assigned_driver;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_stats
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered')
  EXECUTE FUNCTION update_driver_stats_on_delivery();

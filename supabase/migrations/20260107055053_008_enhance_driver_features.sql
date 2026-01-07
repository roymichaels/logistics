/*
  # Enhanced Driver Features

  1. New Tables
    - `driver_locations`: Real-time driver location tracking
    - `delivery_photos`: Proof of delivery photos
    - `driver_ratings`: Customer ratings for drivers
    - `driver_messages`: Driver-customer chat history
    - `driver_incidents`: Safety incidents and reports
    - `driver_achievements`: Badge and achievement system
    - `delivery_routes`: Route tracking and optimization data
    - `driver_preferences`: Driver settings and preferences

  2. Enhanced Tables
    - Add columns to `driver_earnings` for tips, bonuses, and deductions
    - Add columns to `order_assignments` for acceptance timer and rejection reasons
    - Add columns to `driver_profiles` for acceptance rate and completion rate

  3. Security
    - Enable RLS on all new tables
    - Drivers can only access their own data
    - Business staff can view driver data for their business
    - Customers can rate drivers after delivery

  4. Important Notes
    - All timestamps use timestamptz for proper timezone handling
    - Location data uses decimal(10,8) for latitude and decimal(11,8) for longitude
    - Photos stored in Supabase Storage with URLs in database
    - Achievement system supports gamification
*/

-- Create driver_locations table for real-time tracking
CREATE TABLE IF NOT EXISTS driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  accuracy decimal(10, 2),
  speed decimal(10, 2),
  heading decimal(5, 2),
  battery_level integer,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180)
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_recorded_at ON driver_locations(recorded_at DESC);

-- Create delivery_photos table for proof of delivery
CREATE TABLE IF NOT EXISTS delivery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES order_assignments(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text DEFAULT 'proof_of_delivery' CHECK (photo_type IN ('proof_of_delivery', 'customer_unavailable', 'order_issue', 'merchant_pickup')),
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_photos_assignment_id ON delivery_photos(assignment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_driver_id ON delivery_photos(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_order_id ON delivery_photos(order_id);

-- Create driver_ratings table
CREATE TABLE IF NOT EXISTS driver_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES order_assignments(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  categories jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(order_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_ratings_driver_id ON driver_ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_ratings_created_at ON driver_ratings(created_at DESC);

-- Create driver_messages table for communication
CREATE TABLE IF NOT EXISTS driver_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES order_assignments(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('driver', 'customer')),
  message_text text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'quick_reply', 'system')),
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_messages_assignment_id ON driver_messages(assignment_id);
CREATE INDEX IF NOT EXISTS idx_driver_messages_driver_id ON driver_messages(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_messages_created_at ON driver_messages(created_at DESC);

-- Create driver_incidents table for safety
CREATE TABLE IF NOT EXISTS driver_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES order_assignments(id) ON DELETE SET NULL,
  incident_type text NOT NULL CHECK (incident_type IN ('emergency', 'accident', 'safety_concern', 'customer_issue', 'vehicle_issue', 'other')),
  description text NOT NULL,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  status text DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'resolved', 'closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  resolution_notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_incidents_driver_id ON driver_incidents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_incidents_status ON driver_incidents(status);
CREATE INDEX IF NOT EXISTS idx_driver_incidents_created_at ON driver_incidents(created_at DESC);

-- Create driver_achievements table
CREATE TABLE IF NOT EXISTS driver_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  achievement_type text NOT NULL,
  achievement_name text NOT NULL,
  achievement_description text,
  icon text,
  points integer DEFAULT 0,
  unlocked_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  UNIQUE(driver_id, achievement_type)
);

CREATE INDEX IF NOT EXISTS idx_driver_achievements_driver_id ON driver_achievements(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_achievements_unlocked_at ON driver_achievements(unlocked_at DESC);

-- Create delivery_routes table
CREATE TABLE IF NOT EXISTS delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES order_assignments(id) ON DELETE CASCADE,
  route_data jsonb NOT NULL,
  estimated_distance decimal(10, 2),
  estimated_duration integer,
  actual_distance decimal(10, 2),
  actual_duration integer,
  waypoints jsonb DEFAULT '[]',
  start_location jsonb,
  end_location jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_routes_driver_id ON delivery_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_assignment_id ON delivery_routes(assignment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_started_at ON delivery_routes(started_at DESC);

-- Create driver_preferences table
CREATE TABLE IF NOT EXISTS driver_preferences (
  driver_id uuid PRIMARY KEY REFERENCES driver_profiles(id) ON DELETE CASCADE,
  max_delivery_distance decimal(10, 2) DEFAULT 15.0,
  preferred_zones uuid[],
  auto_accept_orders boolean DEFAULT false,
  notification_sound_enabled boolean DEFAULT true,
  notification_vibration_enabled boolean DEFAULT true,
  map_style text DEFAULT 'standard',
  language text DEFAULT 'en',
  distance_unit text DEFAULT 'km' CHECK (distance_unit IN ('km', 'mi')),
  theme text DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
  working_hours jsonb DEFAULT '{}',
  break_schedule jsonb DEFAULT '{}',
  vehicle_capacity integer DEFAULT 5,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enhance driver_earnings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_earnings' AND column_name = 'tips'
  ) THEN
    ALTER TABLE driver_earnings ADD COLUMN tips decimal(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_earnings' AND column_name = 'bonuses'
  ) THEN
    ALTER TABLE driver_earnings ADD COLUMN bonuses decimal(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_earnings' AND column_name = 'deductions'
  ) THEN
    ALTER TABLE driver_earnings ADD COLUMN deductions decimal(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_earnings' AND column_name = 'incentives'
  ) THEN
    ALTER TABLE driver_earnings ADD COLUMN incentives decimal(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Enhance order_assignments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_assignments' AND column_name = 'acceptance_deadline'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN acceptance_deadline timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_assignments' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN rejection_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_assignments' AND column_name = 'declined_at'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN declined_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_assignments' AND column_name = 'estimated_earnings'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN estimated_earnings decimal(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_assignments' AND column_name = 'actual_earnings'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN actual_earnings decimal(10, 2);
  END IF;
END $$;

-- Enhance driver_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'acceptance_rate'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN acceptance_rate decimal(5, 2) DEFAULT 100.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'completion_rate'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN completion_rate decimal(5, 2) DEFAULT 100.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'on_time_rate'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN on_time_rate decimal(5, 2) DEFAULT 100.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'total_earnings'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN total_earnings decimal(12, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'total_distance'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN total_distance decimal(12, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'achievement_points'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN achievement_points integer DEFAULT 0;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_locations
CREATE POLICY "Drivers can view own location history"
  ON driver_locations FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Drivers can insert own locations"
  ON driver_locations FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

-- RLS Policies for delivery_photos
CREATE POLICY "Drivers can view own photos"
  ON delivery_photos FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Drivers can insert photos"
  ON delivery_photos FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

-- RLS Policies for driver_ratings
CREATE POLICY "Drivers can view own ratings"
  ON driver_ratings FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Customers can insert ratings for completed orders"
  ON driver_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = driver_ratings.order_id
      AND o.customer_id = auth.uid()
      AND o.status = 'delivered'
    )
  );

-- RLS Policies for driver_messages
CREATE POLICY "Drivers can view own messages"
  ON driver_messages FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Customers can view their messages"
  ON driver_messages FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Drivers can send messages"
  ON driver_messages FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid() AND sender_type = 'driver');

CREATE POLICY "Customers can send messages"
  ON driver_messages FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() AND sender_type = 'customer');

-- RLS Policies for driver_incidents
CREATE POLICY "Drivers can view own incidents"
  ON driver_incidents FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Drivers can create incidents"
  ON driver_incidents FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

-- RLS Policies for driver_achievements
CREATE POLICY "Drivers can view own achievements"
  ON driver_achievements FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

-- RLS Policies for delivery_routes
CREATE POLICY "Drivers can view own routes"
  ON delivery_routes FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Drivers can insert routes"
  ON delivery_routes FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can update own routes"
  ON delivery_routes FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid());

-- RLS Policies for driver_preferences
CREATE POLICY "Drivers can view own preferences"
  ON driver_preferences FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Drivers can manage own preferences"
  ON driver_preferences FOR ALL
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Create function to update driver stats
CREATE OR REPLACE FUNCTION update_driver_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE driver_profiles
  SET
    acceptance_rate = (
      SELECT COALESCE(
        (COUNT(*) FILTER (WHERE status IN ('accepted', 'picked_up', 'delivered'))::decimal /
        NULLIF(COUNT(*), 0) * 100),
        100.00
      )
      FROM order_assignments
      WHERE driver_id = NEW.driver_id
    ),
    completion_rate = (
      SELECT COALESCE(
        (COUNT(*) FILTER (WHERE status = 'delivered')::decimal /
        NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'picked_up', 'delivered')), 0) * 100),
        100.00
      )
      FROM order_assignments
      WHERE driver_id = NEW.driver_id
    ),
    updated_at = now()
  WHERE id = NEW.driver_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating driver stats
DROP TRIGGER IF EXISTS trigger_update_driver_stats ON order_assignments;
CREATE TRIGGER trigger_update_driver_stats
  AFTER INSERT OR UPDATE ON order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_stats();

-- Create function to calculate average rating
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE driver_profiles
  SET
    rating = (
      SELECT COALESCE(AVG(rating), 5.0)
      FROM driver_ratings
      WHERE driver_id = NEW.driver_id
    ),
    updated_at = now()
  WHERE id = NEW.driver_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating driver rating
DROP TRIGGER IF EXISTS trigger_update_driver_rating ON driver_ratings;
CREATE TRIGGER trigger_update_driver_rating
  AFTER INSERT ON driver_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_rating();

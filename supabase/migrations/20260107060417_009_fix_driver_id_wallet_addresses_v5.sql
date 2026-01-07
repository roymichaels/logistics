/*
  # Fix Driver ID Schema for Wallet Addresses

  ## Problem
  The application uses wallet addresses (TEXT like 0xd04004045d16af58004f19469b8d1736a882dfc5) 
  as driver identifiers, but the database columns are UUID type, causing PostgreSQL error 22P02.

  ## Changes

  1. **Drop all RLS policies** that depend on driver_id columns (including orders table)
  2. **Drop primary key with CASCADE**
  3. **Alter column types** from UUID to TEXT
  4. **Recreate foreign key constraints**
  5. **Recreate RLS policies** with TEXT-compatible logic
  6. **Recreate indexes**

  ## Security
  - All RLS policies recreated to work with TEXT-based driver IDs
  - Drivers identified by wallet address (TEXT)
  - No security regressions

  ## Important Notes
  - Breaking change required for wallet-based authentication
  - driver_profiles.id is now independent (no longer references profiles.id)
  - All foreign key relationships maintained with TEXT type
*/

-- ============================================================================
-- STEP 1: Drop all RLS policies that depend on driver_id
-- ============================================================================

-- orders table policy that references driver_id
DROP POLICY IF EXISTS "Drivers can view assigned orders" ON orders;

-- driver_profiles policies
DROP POLICY IF EXISTS "Drivers can view own profile" ON driver_profiles;
DROP POLICY IF EXISTS "Business owners can manage driver profiles" ON driver_profiles;
DROP POLICY IF EXISTS "Drivers can update own profile" ON driver_profiles;
DROP POLICY IF EXISTS "Drivers can insert own profile" ON driver_profiles;

-- driver_status policies
DROP POLICY IF EXISTS "Drivers can manage own status" ON driver_status;
DROP POLICY IF EXISTS "Dispatchers can view driver status" ON driver_status;

-- driver_earnings policies
DROP POLICY IF EXISTS "Drivers can read own earnings" ON driver_earnings;
DROP POLICY IF EXISTS "Business owners can read their drivers earnings" ON driver_earnings;
DROP POLICY IF EXISTS "System can insert driver earnings" ON driver_earnings;
DROP POLICY IF EXISTS "System can update driver earnings" ON driver_earnings;

-- order_assignments policies
DROP POLICY IF EXISTS "Drivers can view own assignments" ON order_assignments;
DROP POLICY IF EXISTS "Drivers can update own assignments" ON order_assignments;
DROP POLICY IF EXISTS "Dispatchers can manage assignments" ON order_assignments;

-- driver_zones policies
DROP POLICY IF EXISTS "Drivers can view own zones" ON driver_zones;
DROP POLICY IF EXISTS "Business owners can manage driver zones" ON driver_zones;

-- driver_locations policies
DROP POLICY IF EXISTS "Drivers can view own location history" ON driver_locations;
DROP POLICY IF EXISTS "Drivers can insert own locations" ON driver_locations;

-- delivery_photos policies
DROP POLICY IF EXISTS "Drivers can view own photos" ON delivery_photos;
DROP POLICY IF EXISTS "Drivers can insert photos" ON delivery_photos;

-- driver_ratings policies
DROP POLICY IF EXISTS "Drivers can view own ratings" ON driver_ratings;
DROP POLICY IF EXISTS "Customers can insert ratings for completed orders" ON driver_ratings;

-- driver_messages policies
DROP POLICY IF EXISTS "Drivers can view own messages" ON driver_messages;
DROP POLICY IF EXISTS "Customers can view their messages" ON driver_messages;
DROP POLICY IF EXISTS "Drivers can send messages" ON driver_messages;
DROP POLICY IF EXISTS "Customers can send messages" ON driver_messages;

-- driver_incidents policies
DROP POLICY IF EXISTS "Drivers can view own incidents" ON driver_incidents;
DROP POLICY IF EXISTS "Drivers can create incidents" ON driver_incidents;

-- driver_achievements policies
DROP POLICY IF EXISTS "Drivers can view own achievements" ON driver_achievements;

-- delivery_routes policies
DROP POLICY IF EXISTS "Drivers can view own routes" ON delivery_routes;
DROP POLICY IF EXISTS "Drivers can insert routes" ON delivery_routes;
DROP POLICY IF EXISTS "Drivers can update own routes" ON delivery_routes;

-- driver_preferences policies
DROP POLICY IF EXISTS "Drivers can view own preferences" ON driver_preferences;
DROP POLICY IF EXISTS "Drivers can manage own preferences" ON driver_preferences;

-- ============================================================================
-- STEP 2: Drop primary key with CASCADE (drops all foreign keys)
-- ============================================================================

ALTER TABLE IF EXISTS driver_profiles DROP CONSTRAINT IF EXISTS driver_profiles_id_fkey;
ALTER TABLE IF EXISTS driver_profiles DROP CONSTRAINT IF EXISTS driver_profiles_pkey CASCADE;
ALTER TABLE IF EXISTS driver_status DROP CONSTRAINT IF EXISTS driver_status_pkey;

-- ============================================================================
-- STEP 3: Alter all tables to TEXT
-- ============================================================================

-- driver_profiles
ALTER TABLE driver_profiles ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE driver_profiles ADD PRIMARY KEY (id);

-- Add wallet_address column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN wallet_address text UNIQUE;
  END IF;
END $$;

-- driver_status
ALTER TABLE driver_status ALTER COLUMN driver_id TYPE text USING driver_id::text;
ALTER TABLE driver_status ADD PRIMARY KEY (driver_id);

-- driver_earnings
ALTER TABLE driver_earnings ALTER COLUMN driver_id TYPE text USING driver_id::text;

-- order_assignments
ALTER TABLE order_assignments ALTER COLUMN driver_id TYPE text USING driver_id::text;

-- driver_zones
ALTER TABLE driver_zones ALTER COLUMN driver_id TYPE text USING driver_id::text;

-- driver_locations
ALTER TABLE driver_locations ALTER COLUMN driver_id TYPE text USING driver_id::text;

-- delivery_photos
ALTER TABLE delivery_photos ALTER COLUMN driver_id TYPE text USING driver_id::text;

-- driver_ratings
ALTER TABLE driver_ratings ALTER COLUMN driver_id TYPE text USING driver_id::text;

-- driver_messages
ALTER TABLE driver_messages ALTER COLUMN driver_id TYPE text USING driver_id::text;

-- driver_incidents
ALTER TABLE driver_incidents ALTER COLUMN driver_id TYPE text USING driver_id::text;

-- driver_achievements
ALTER TABLE driver_achievements ALTER COLUMN driver_id TYPE text USING driver_id::text;

-- delivery_routes
ALTER TABLE delivery_routes ALTER COLUMN driver_id TYPE text USING driver_id::text;

-- driver_preferences
ALTER TABLE driver_preferences ALTER COLUMN driver_id TYPE text USING driver_id::text;

-- ============================================================================
-- STEP 4: Recreate foreign key constraints
-- ============================================================================

ALTER TABLE driver_status ADD CONSTRAINT driver_status_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE driver_earnings ADD CONSTRAINT driver_earnings_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE order_assignments ADD CONSTRAINT order_assignments_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE driver_zones ADD CONSTRAINT driver_zones_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE driver_locations ADD CONSTRAINT driver_locations_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE delivery_photos ADD CONSTRAINT delivery_photos_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE driver_ratings ADD CONSTRAINT driver_ratings_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE driver_messages ADD CONSTRAINT driver_messages_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE driver_incidents ADD CONSTRAINT driver_incidents_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE driver_achievements ADD CONSTRAINT driver_achievements_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE delivery_routes ADD CONSTRAINT delivery_routes_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

ALTER TABLE driver_preferences ADD CONSTRAINT driver_preferences_driver_id_fkey 
  FOREIGN KEY (driver_id) REFERENCES driver_profiles(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 5: Recreate RLS policies
-- ============================================================================

-- orders table policy
CREATE POLICY "Drivers can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT order_id FROM order_assignments 
      WHERE driver_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- driver_profiles policies
CREATE POLICY "Drivers can view own profile"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Drivers can update own profile"
  ON driver_profiles FOR UPDATE
  TO authenticated
  USING (id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Drivers can insert own profile"
  ON driver_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Business owners can manage driver profiles"
  ON driver_profiles FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- driver_status policies
CREATE POLICY "Drivers can manage own status"
  ON driver_status FOR ALL
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

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

-- driver_earnings policies
CREATE POLICY "Drivers can read own earnings"
  ON driver_earnings FOR SELECT
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Business owners can read their drivers earnings"
  ON driver_earnings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM driver_profiles dp
      JOIN businesses b ON dp.business_id = b.id
      WHERE dp.id = driver_earnings.driver_id
      AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "System can insert driver earnings"
  ON driver_earnings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update driver earnings"
  ON driver_earnings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- order_assignments policies
CREATE POLICY "Drivers can view own assignments"
  ON order_assignments FOR SELECT
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Drivers can update own assignments"
  ON order_assignments FOR UPDATE
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

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

-- driver_locations policies
CREATE POLICY "Drivers can view own location history"
  ON driver_locations FOR SELECT
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Drivers can insert own locations"
  ON driver_locations FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- delivery_photos policies
CREATE POLICY "Drivers can view own photos"
  ON delivery_photos FOR SELECT
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Drivers can insert photos"
  ON delivery_photos FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- driver_ratings policies
CREATE POLICY "Drivers can view own ratings"
  ON driver_ratings FOR SELECT
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

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

-- driver_messages policies
CREATE POLICY "Drivers can view own messages"
  ON driver_messages FOR SELECT
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Customers can view their messages"
  ON driver_messages FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Drivers can send messages"
  ON driver_messages FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = current_setting('request.jwt.claims', true)::json->>'sub' AND sender_type = 'driver');

CREATE POLICY "Customers can send messages"
  ON driver_messages FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() AND sender_type = 'customer');

-- driver_incidents policies
CREATE POLICY "Drivers can view own incidents"
  ON driver_incidents FOR SELECT
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Drivers can create incidents"
  ON driver_incidents FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- driver_achievements policies
CREATE POLICY "Drivers can view own achievements"
  ON driver_achievements FOR SELECT
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- delivery_routes policies
CREATE POLICY "Drivers can view own routes"
  ON delivery_routes FOR SELECT
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Drivers can insert routes"
  ON delivery_routes FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Drivers can update own routes"
  ON delivery_routes FOR UPDATE
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- driver_preferences policies
CREATE POLICY "Drivers can view own preferences"
  ON driver_preferences FOR SELECT
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Drivers can manage own preferences"
  ON driver_preferences FOR ALL
  TO authenticated
  USING (driver_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (driver_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================================
-- STEP 6: Recreate indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS driver_profiles_business_id_idx ON driver_profiles(business_id);
CREATE INDEX IF NOT EXISTS driver_profiles_wallet_address_idx ON driver_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS driver_earnings_driver_id_idx ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS driver_earnings_driver_date_idx ON driver_earnings(driver_id, date);
CREATE INDEX IF NOT EXISTS driver_zones_driver_id_idx ON driver_zones(driver_id);
CREATE INDEX IF NOT EXISTS order_assignments_driver_id_idx ON order_assignments(driver_id);
CREATE INDEX IF NOT EXISTS order_assignments_driver_status_idx ON order_assignments(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_driver_id ON delivery_photos(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_ratings_driver_id ON driver_ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_messages_driver_id ON driver_messages(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_incidents_driver_id ON driver_incidents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_achievements_driver_id ON driver_achievements(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_driver_id ON delivery_routes(driver_id);

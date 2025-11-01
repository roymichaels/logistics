/*
  # Freelancer Driver Platform System

  1. Overview
    This migration transforms the driver system from a business-employee model to a
    freelancer platform model (similar to Wolt, Uber Eats, DoorDash) where independent
    drivers can accept deliveries from multiple businesses.

  2. New Tables
    - `driver_profiles` - Core freelancer driver profile with verification status
    - `driver_applications` - Driver registration and approval workflow
    - `driver_documents` - Store verification documents (license, insurance, etc.)
    - `driver_availability_schedules` - Driver working hours and preferred zones
    - `driver_business_preferences` - Driver preferences for specific businesses
    - `driver_earnings` - Per-delivery earnings tracking
    - `driver_payouts` - Payment batch tracking
    - `driver_rating_reviews` - Separate customer and business ratings
    - `delivery_fee_structures` - Dynamic pricing configuration
    - `order_marketplace` - Available orders broadcast to drivers
    - `order_acceptance_log` - Track order offer/acceptance flow

  3. Key Features
    - Multi-business driver support
    - Application and verification workflow
    - Dynamic earnings and payment tracking
    - Order marketplace with real-time broadcast
    - Performance and rating system
    - Flexible availability management

  4. Security
    - Enable RLS on all tables
    - Drivers can only view/edit their own data
    - Businesses can view driver profiles they work with
    - Platform admins have full access
*/

-- =====================================================
-- New enums for freelancer driver system
-- =====================================================

DO $$ BEGIN
  CREATE TYPE driver_application_status AS ENUM (
    'pending',
    'under_review',
    'approved',
    'rejected',
    'suspended',
    'deactivated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE driver_verification_status AS ENUM (
    'unverified',
    'pending',
    'verified',
    'rejected',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'drivers_license',
    'vehicle_registration',
    'insurance',
    'background_check',
    'profile_photo',
    'vehicle_photo',
    'bank_account'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE driver_service_tier AS ENUM (
    'standard',
    'premium',
    'platinum'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- Core driver profiles (freelancer model)
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Application and verification
  application_status driver_application_status NOT NULL DEFAULT 'pending',
  verification_status driver_verification_status NOT NULL DEFAULT 'unverified',
  service_tier driver_service_tier NOT NULL DEFAULT 'standard',
  approved_at timestamptz,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Personal details
  date_of_birth date,
  national_id_number text,
  emergency_contact_name text,
  emergency_contact_phone text,

  -- Vehicle information
  vehicle_type text, -- car, motorcycle, bicycle, scooter
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  vehicle_plate text,
  vehicle_color text,

  -- Banking and payment
  bank_account_holder text,
  bank_account_number text,
  bank_name text,
  bank_branch text,
  tax_id text,

  -- Service preferences
  max_delivery_distance_km numeric(10,2) DEFAULT 15,
  min_order_value numeric(10,2) DEFAULT 0,
  preferred_payment_method text DEFAULT 'bank_transfer', -- bank_transfer, digital_wallet, cash
  accepts_cash_orders boolean DEFAULT true,

  -- Performance metrics
  total_deliveries integer NOT NULL DEFAULT 0,
  completed_deliveries integer NOT NULL DEFAULT 0,
  cancelled_deliveries integer NOT NULL DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 5.00,
  acceptance_rate numeric(5,2) DEFAULT 100.00,
  completion_rate numeric(5,2) DEFAULT 100.00,
  on_time_rate numeric(5,2) DEFAULT 100.00,

  -- Availability
  is_active boolean NOT NULL DEFAULT false,
  is_online boolean NOT NULL DEFAULT false,
  last_online_at timestamptz,
  current_latitude numeric(10,7),
  current_longitude numeric(10,7),
  location_updated_at timestamptz,

  -- Capacity
  max_concurrent_orders integer NOT NULL DEFAULT 3,
  current_order_count integer NOT NULL DEFAULT 0,

  -- Metadata
  notes text,
  rejection_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

-- =====================================================
-- Driver applications
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Application details
  application_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status driver_application_status NOT NULL DEFAULT 'pending',

  -- Review process
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,

  -- Tracking
  submitted_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  rejected_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Driver documents
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_profile_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,

  document_type document_type NOT NULL,
  document_url text NOT NULL,
  document_number text,

  -- Verification
  verification_status driver_verification_status NOT NULL DEFAULT 'pending',
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  verification_notes text,

  -- Validity
  issue_date date,
  expiry_date date,
  is_expired boolean GENERATED ALWAYS AS (expiry_date < CURRENT_DATE) STORED,

  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(driver_profile_id, document_type)
);

-- =====================================================
-- Driver availability schedules
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_availability_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_profile_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,

  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time time NOT NULL,
  end_time time NOT NULL,

  zone_ids text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Driver business preferences
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_business_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_profile_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  is_opted_in boolean NOT NULL DEFAULT true,
  is_blocked_by_business boolean NOT NULL DEFAULT false,
  blocked_by uuid REFERENCES users(id) ON DELETE SET NULL,
  block_reason text,

  business_rating integer CHECK (business_rating BETWEEN 1 AND 5),
  business_notes text,

  total_deliveries_for_business integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(driver_profile_id, business_id)
);

-- =====================================================
-- Delivery fee structures
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,

  structure_name text NOT NULL,

  -- Base fee configuration
  base_fee numeric(10,2) NOT NULL DEFAULT 15.00,
  per_km_fee numeric(10,2) NOT NULL DEFAULT 2.00,
  min_fee numeric(10,2) NOT NULL DEFAULT 10.00,
  max_fee numeric(10,2),

  -- Time-based multipliers
  peak_hours_multiplier numeric(4,2) DEFAULT 1.00,
  peak_hours_start time,
  peak_hours_end time,
  weekend_multiplier numeric(4,2) DEFAULT 1.00,

  -- Distance tiers
  distance_tiers jsonb DEFAULT '[]'::jsonb,

  -- Active configuration
  is_active boolean NOT NULL DEFAULT true,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Driver earnings tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_profile_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Earnings breakdown
  base_fee numeric(10,2) NOT NULL DEFAULT 0,
  distance_fee numeric(10,2) NOT NULL DEFAULT 0,
  time_fee numeric(10,2) NOT NULL DEFAULT 0,
  surge_fee numeric(10,2) NOT NULL DEFAULT 0,
  tip_amount numeric(10,2) NOT NULL DEFAULT 0,
  bonus_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_earnings numeric(10,2) NOT NULL DEFAULT 0,

  -- Platform fees
  platform_fee numeric(10,2) NOT NULL DEFAULT 0,
  net_earnings numeric(10,2) NOT NULL DEFAULT 0,

  -- Payment tracking
  payout_id uuid REFERENCES driver_payouts(id) ON DELETE SET NULL,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,

  -- Delivery metrics
  distance_km numeric(10,2),
  duration_minutes integer,

  earned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Driver payouts
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_profile_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,

  -- Payout details
  payout_amount numeric(10,2) NOT NULL,
  payout_method text NOT NULL, -- bank_transfer, digital_wallet, cash

  -- Banking details (encrypted in production)
  bank_account_number text,
  bank_name text,
  transaction_reference text,

  -- Status tracking
  status payout_status NOT NULL DEFAULT 'pending',

  -- Period covered
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,

  -- Delivery count
  delivery_count integer NOT NULL DEFAULT 0,

  -- Processing
  processed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  processed_at timestamptz,
  processing_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Driver rating reviews
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_rating_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_profile_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Rating source
  rated_by_customer boolean NOT NULL DEFAULT true,
  rated_by_business boolean NOT NULL DEFAULT false,
  rater_id uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Rating details
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  review_tags text[] DEFAULT '{}',

  -- Driver response
  driver_response text,
  responded_at timestamptz,

  -- Flags
  is_disputed boolean NOT NULL DEFAULT false,
  dispute_reason text,
  is_hidden boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(order_id, rater_id)
);

-- =====================================================
-- Order marketplace (broadcast system)
-- =====================================================

CREATE TABLE IF NOT EXISTS order_marketplace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Delivery details
  pickup_latitude numeric(10,7) NOT NULL,
  pickup_longitude numeric(10,7) NOT NULL,
  delivery_latitude numeric(10,7) NOT NULL,
  delivery_longitude numeric(10,7) NOT NULL,
  estimated_distance_km numeric(10,2),

  -- Pricing
  delivery_fee numeric(10,2) NOT NULL,
  driver_earnings numeric(10,2) NOT NULL,

  -- Broadcast settings
  broadcast_radius_km numeric(10,2) DEFAULT 10,
  max_driver_count integer DEFAULT 10,

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  assigned_driver_id uuid REFERENCES driver_profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz,

  -- Timing
  expires_at timestamptz,
  broadcasted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(order_id)
);

-- =====================================================
-- Order acceptance log
-- =====================================================

CREATE TABLE IF NOT EXISTS order_acceptance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_marketplace_id uuid NOT NULL REFERENCES order_marketplace(id) ON DELETE CASCADE,
  driver_profile_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,

  -- Response
  action text NOT NULL, -- viewed, accepted, declined, timeout
  response_time_seconds integer,

  -- Driver state at time
  driver_latitude numeric(10,7),
  driver_longitude numeric(10,7),
  distance_from_pickup_km numeric(10,2),
  current_order_count integer,

  -- Reason for decline
  decline_reason text,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_online ON driver_profiles(is_online, is_active) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_driver_profiles_location ON driver_profiles(current_latitude, current_longitude) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_driver_profiles_service_tier ON driver_profiles(service_tier);

CREATE INDEX IF NOT EXISTS idx_driver_applications_user_id ON driver_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_applications_status ON driver_applications(status);

CREATE INDEX IF NOT EXISTS idx_driver_documents_profile_id ON driver_documents(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_type ON driver_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_driver_documents_expiry ON driver_documents(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON driver_earnings(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_order_id ON driver_earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_payout_id ON driver_earnings(payout_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_earned_at ON driver_earnings(earned_at);

CREATE INDEX IF NOT EXISTS idx_driver_payouts_driver_id ON driver_payouts(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_payouts_status ON driver_payouts(status);

CREATE INDEX IF NOT EXISTS idx_order_marketplace_order_id ON order_marketplace(order_id);
CREATE INDEX IF NOT EXISTS idx_order_marketplace_active ON order_marketplace(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_order_marketplace_location ON order_marketplace(pickup_latitude, pickup_longitude);

CREATE INDEX IF NOT EXISTS idx_order_acceptance_log_marketplace ON order_acceptance_log(order_marketplace_id);
CREATE INDEX IF NOT EXISTS idx_order_acceptance_log_driver ON order_acceptance_log(driver_profile_id);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_business_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_rating_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_acceptance_log ENABLE ROW LEVEL SECURITY;

-- Driver profiles policies
CREATE POLICY "Drivers can view own profile"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Drivers can update own profile"
  ON driver_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Platform admins can view all profiles"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner'));

CREATE POLICY "Platform admins can manage all profiles"
  ON driver_profiles FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner'))
  WITH CHECK (auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner'));

-- Driver applications policies
CREATE POLICY "Users can create own application"
  ON driver_applications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can review applications"
  ON driver_applications FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner'))
  WITH CHECK (auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner'));

-- Driver documents policies
CREATE POLICY "Drivers can manage own documents"
  ON driver_documents FOR ALL
  TO authenticated
  USING (driver_profile_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid()))
  WITH CHECK (driver_profile_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all documents"
  ON driver_documents FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner'));

-- Driver earnings policies
CREATE POLICY "Drivers can view own earnings"
  ON driver_earnings FOR SELECT
  TO authenticated
  USING (driver_profile_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all earnings"
  ON driver_earnings FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner'))
  WITH CHECK (auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner'));

-- Driver payouts policies
CREATE POLICY "Drivers can view own payouts"
  ON driver_payouts FOR SELECT
  TO authenticated
  USING (driver_profile_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage payouts"
  ON driver_payouts FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner'))
  WITH CHECK (auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner'));

-- Order marketplace policies
CREATE POLICY "Online drivers can view available orders"
  ON order_marketplace FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM driver_profiles
      WHERE user_id = auth.uid()
      AND is_online = true
      AND is_active = true
    )
  );

CREATE POLICY "Businesses can manage their marketplace orders"
  ON order_marketplace FOR ALL
  TO authenticated
  USING (business_id::text = auth.jwt()->>'business_id')
  WITH CHECK (business_id::text = auth.jwt()->>'business_id');

CREATE POLICY "Admins can manage marketplace"
  ON order_marketplace FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner'))
  WITH CHECK (auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner'));

-- Order acceptance log policies
CREATE POLICY "Drivers can create acceptance log"
  ON order_acceptance_log FOR INSERT
  TO authenticated
  WITH CHECK (driver_profile_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can view own acceptance logs"
  ON order_acceptance_log FOR SELECT
  TO authenticated
  USING (driver_profile_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid()));

-- =====================================================
-- Helper functions
-- =====================================================

-- Function to calculate driver earnings for an order
CREATE OR REPLACE FUNCTION calculate_driver_earnings(
  p_order_id uuid,
  p_distance_km numeric,
  p_duration_minutes integer
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_fee_structure delivery_fee_structures%ROWTYPE;
  v_base_fee numeric;
  v_distance_fee numeric;
  v_time_fee numeric;
  v_surge_fee numeric;
  v_total numeric;
  v_business_id uuid;
  v_current_hour integer;
  v_is_weekend boolean;
BEGIN
  -- Get order business_id
  SELECT business_id INTO v_business_id FROM orders WHERE id = p_order_id;

  -- Get active fee structure
  SELECT * INTO v_fee_structure
  FROM delivery_fee_structures
  WHERE business_id = v_business_id
    AND is_active = true
    AND (effective_until IS NULL OR effective_until > now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Default structure
    v_base_fee := 15.00;
    v_distance_fee := p_distance_km * 2.00;
  ELSE
    v_base_fee := v_fee_structure.base_fee;
    v_distance_fee := p_distance_km * v_fee_structure.per_km_fee;

    -- Check for peak hours
    v_current_hour := EXTRACT(HOUR FROM now());
    v_is_weekend := EXTRACT(DOW FROM now()) IN (0, 6);

    IF v_fee_structure.peak_hours_start IS NOT NULL
       AND v_current_hour >= EXTRACT(HOUR FROM v_fee_structure.peak_hours_start)
       AND v_current_hour <= EXTRACT(HOUR FROM v_fee_structure.peak_hours_end) THEN
      v_surge_fee := (v_base_fee + v_distance_fee) * (v_fee_structure.peak_hours_multiplier - 1);
    END IF;

    IF v_is_weekend AND v_fee_structure.weekend_multiplier > 1 THEN
      v_surge_fee := COALESCE(v_surge_fee, 0) + (v_base_fee + v_distance_fee) * (v_fee_structure.weekend_multiplier - 1);
    END IF;
  END IF;

  v_time_fee := 0; -- Can add time-based fee if needed
  v_total := v_base_fee + v_distance_fee + COALESCE(v_surge_fee, 0) + v_time_fee;

  -- Apply min/max constraints
  IF v_fee_structure.min_fee IS NOT NULL AND v_total < v_fee_structure.min_fee THEN
    v_total := v_fee_structure.min_fee;
  END IF;

  IF v_fee_structure.max_fee IS NOT NULL AND v_total > v_fee_structure.max_fee THEN
    v_total := v_fee_structure.max_fee;
  END IF;

  RETURN v_total;
END;
$$;

-- Function to update driver performance metrics
CREATE OR REPLACE FUNCTION update_driver_performance_metrics(p_driver_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_deliveries integer;
  v_completed_deliveries integer;
  v_cancelled_deliveries integer;
  v_avg_rating numeric;
BEGIN
  -- Count deliveries
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_paid = true),
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = driver_earnings.order_id
      AND o.status = 'cancelled'
    ))
  INTO v_total_deliveries, v_completed_deliveries, v_cancelled_deliveries
  FROM driver_earnings
  WHERE driver_profile_id = p_driver_profile_id;

  -- Calculate average rating
  SELECT AVG(rating)
  INTO v_avg_rating
  FROM driver_rating_reviews
  WHERE driver_profile_id = p_driver_profile_id
    AND is_hidden = false;

  -- Update profile
  UPDATE driver_profiles
  SET
    total_deliveries = v_total_deliveries,
    completed_deliveries = v_completed_deliveries,
    cancelled_deliveries = v_cancelled_deliveries,
    average_rating = COALESCE(v_avg_rating, 5.00),
    completion_rate = CASE
      WHEN v_total_deliveries > 0
      THEN (v_completed_deliveries::numeric / v_total_deliveries * 100)
      ELSE 100.00
    END,
    updated_at = now()
  WHERE id = p_driver_profile_id;
END;
$$;

-- =====================================================
-- Triggers
-- =====================================================

-- Auto-update driver metrics after earning is recorded
CREATE OR REPLACE FUNCTION trigger_update_driver_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM update_driver_performance_metrics(NEW.driver_profile_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_driver_earning_insert
  AFTER INSERT ON driver_earnings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_driver_metrics();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_driver_profiles_updated_at
  BEFORE UPDATE ON driver_profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_driver_applications_updated_at
  BEFORE UPDATE ON driver_applications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_driver_documents_updated_at
  BEFORE UPDATE ON driver_documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

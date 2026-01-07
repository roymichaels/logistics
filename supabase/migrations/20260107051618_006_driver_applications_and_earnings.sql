/*
  # Driver Applications and Earnings System

  ## New Tables

  1. `driver_applications`
     - Stores driver application submissions
     - Tracks application status (pending, approved, rejected)
     - Links to user who applied
     - Contains vehicle and license information
     - Includes review information

  2. `driver_earnings`
     - Tracks daily earnings per driver
     - Stores delivery count, earnings, tips, bonuses
     - Calculates net earnings after fees
     - Indexed by driver and date for efficient queries

  ## Security

  - Enable RLS on both tables
  - Drivers can read their own applications and earnings
  - Business owners can view their drivers' data
  - Admins can manage all applications
  - Platform admins can approve/reject applications

  ## Important Notes

  - Driver applications are platform-wide (not business-specific)
  - Once approved, driver_profiles entry is created
  - Earnings are calculated daily and stored for historical tracking
*/

-- Create driver_applications table
CREATE TABLE IF NOT EXISTS driver_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL,
  vehicle_plate text NOT NULL,
  license_number text NOT NULL,
  phone text NOT NULL,
  availability text NOT NULL,
  notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create driver_earnings table
CREATE TABLE IF NOT EXISTS driver_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_deliveries int DEFAULT 0,
  total_earnings decimal(10, 2) DEFAULT 0,
  tips decimal(10, 2) DEFAULT 0,
  bonuses decimal(10, 2) DEFAULT 0,
  fees decimal(10, 2) DEFAULT 0,
  net_earnings decimal(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, date)
);

-- Enable RLS
ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_applications

-- Users can read their own applications
CREATE POLICY "Users can read own driver applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own applications
CREATE POLICY "Users can create driver applications"
  ON driver_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins and platform managers can read all applications
CREATE POLICY "Admins can read all driver applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin')
    )
  );

-- Admins can update application status (approve/reject)
CREATE POLICY "Admins can update driver applications"
  ON driver_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin')
    )
  );

-- RLS Policies for driver_earnings

-- Drivers can read their own earnings
CREATE POLICY "Drivers can read own earnings"
  ON driver_earnings FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.uid()
  );

-- Business owners can read earnings of their drivers
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

-- System can insert earnings records
CREATE POLICY "System can insert driver earnings"
  ON driver_earnings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System can update earnings records
CREATE POLICY "System can update driver earnings"
  ON driver_earnings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS driver_applications_user_id_idx ON driver_applications(user_id);
CREATE INDEX IF NOT EXISTS driver_applications_status_idx ON driver_applications(status);
CREATE INDEX IF NOT EXISTS driver_applications_submitted_at_idx ON driver_applications(submitted_at);

CREATE INDEX IF NOT EXISTS driver_earnings_driver_id_idx ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS driver_earnings_date_idx ON driver_earnings(date);
CREATE INDEX IF NOT EXISTS driver_earnings_driver_date_idx ON driver_earnings(driver_id, date);

-- Function to update earnings net amount
CREATE OR REPLACE FUNCTION calculate_driver_net_earnings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_earnings = NEW.total_earnings + NEW.tips + NEW.bonuses - NEW.fees;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate net earnings
CREATE TRIGGER driver_earnings_calculate_net
  BEFORE INSERT OR UPDATE ON driver_earnings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_driver_net_earnings();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_tables_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER driver_applications_updated_at
  BEFORE UPDATE ON driver_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_tables_timestamp();

CREATE TRIGGER driver_earnings_updated_at
  BEFORE UPDATE ON driver_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_tables_timestamp();

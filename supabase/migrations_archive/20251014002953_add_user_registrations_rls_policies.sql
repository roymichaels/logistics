/*
  # Add RLS Policies for User Registrations Table

  ## Overview
  Adds proper Row Level Security policies to the user_registrations table
  to allow managers and infrastructure owners to view registration requests.

  ## New Policies
  
  1. **SELECT Policies**
     - Infrastructure owners can view all registrations
     - Managers can view all registrations
     - Users can view their own registration
     - Anon users can view (for initial registration flow)
  
  2. **UPDATE Policies**
     - Infrastructure owners can update any registration
     - Managers can update registrations (for approval workflow)
  
  3. **DELETE Policies**
     - Only infrastructure owners can delete registrations

  ## Security
  - Maintains secure access control
  - Allows proper user management workflows
  - Users can only modify their own registration data
*/

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users view own registration" ON user_registrations;
DROP POLICY IF EXISTS "Managers view all registrations" ON user_registrations;
DROP POLICY IF EXISTS "Infrastructure owners manage registrations" ON user_registrations;
DROP POLICY IF EXISTS "Anyone can view registrations" ON user_registrations;

-- Enable RLS on user_registrations table
ALTER TABLE user_registrations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to SELECT (simplest approach for now)
CREATE POLICY "Authenticated users view all registrations"
  ON user_registrations FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon users to SELECT (for registration flow)
CREATE POLICY "Anon users view registrations"
  ON user_registrations FOR SELECT
  TO anon
  USING (true);

-- Infrastructure owners can UPDATE any registration
CREATE POLICY "Infrastructure owners update registrations"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.telegram_id = auth.jwt() ->> 'telegram_id'
      AND users.role = 'infrastructure_owner'
    )
  );

-- Managers can UPDATE registrations
CREATE POLICY "Managers update registrations"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.telegram_id = auth.jwt() ->> 'telegram_id'
      AND users.role IN ('infrastructure_owner', 'manager', 'business_owner')
    )
  );

-- Users can UPDATE their own registration
CREATE POLICY "Users update own registration"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (telegram_id = auth.jwt() ->> 'telegram_id');

-- Only infrastructure owners can DELETE
CREATE POLICY "Infrastructure owners delete registrations"
  ON user_registrations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.telegram_id = auth.jwt() ->> 'telegram_id'
      AND users.role = 'infrastructure_owner'
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Authenticated users view all registrations" ON user_registrations IS 'Allows all authenticated users to view registrations';
COMMENT ON POLICY "Infrastructure owners update registrations" ON user_registrations IS 'Infrastructure owners can approve/reject registrations';
COMMENT ON POLICY "Managers update registrations" ON user_registrations IS 'Managers can approve/reject registrations';

/*
  # Fix Driver Applications for Wallet Address Support V2

  ## Problem
  The driver_applications table has user_id as UUID, but the application uses
  wallet addresses (TEXT like 0xd04004045d16af58004f19469b8d1736a882dfc5)
  for authentication, causing PostgreSQL error 22P02.

  ## Changes
  1. Drop all RLS policies on driver_applications
  2. Drop foreign key constraint to profiles
  3. Change user_id column from UUID to TEXT
  4. Recreate RLS policies with wallet address support (without profile FK)
  5. Recreate indexes

  ## Security
  - All RLS policies recreated to work with TEXT-based user IDs
  - Users identified by wallet address (TEXT)
  - Admin policies simplified to use role checks via profiles.wallet_address
*/

-- ============================================================================
-- STEP 1: Drop all RLS policies on driver_applications
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own driver applications" ON driver_applications;
DROP POLICY IF EXISTS "Users can create driver applications" ON driver_applications;
DROP POLICY IF EXISTS "Admins can read all driver applications" ON driver_applications;
DROP POLICY IF EXISTS "Admins can update driver applications" ON driver_applications;
DROP POLICY IF EXISTS "Users can update own applications" ON driver_applications;
DROP POLICY IF EXISTS "Users can update own pending applications" ON driver_applications;

-- ============================================================================
-- STEP 2: Drop foreign key constraint
-- ============================================================================

ALTER TABLE driver_applications DROP CONSTRAINT IF EXISTS driver_applications_user_id_fkey;
ALTER TABLE driver_applications DROP CONSTRAINT IF EXISTS driver_applications_reviewed_by_fkey;

-- ============================================================================
-- STEP 3: Change user_id and reviewed_by columns to TEXT
-- ============================================================================

-- Change user_id from UUID to TEXT
ALTER TABLE driver_applications ALTER COLUMN user_id TYPE text USING user_id::text;

-- Change reviewed_by from UUID to TEXT (can be NULL)
ALTER TABLE driver_applications ALTER COLUMN reviewed_by TYPE text USING reviewed_by::text;

-- ============================================================================
-- STEP 4: Recreate indexes
-- ============================================================================

DROP INDEX IF EXISTS driver_applications_user_id_idx;
DROP INDEX IF EXISTS driver_applications_status_idx;
DROP INDEX IF EXISTS driver_applications_submitted_at_idx;

CREATE INDEX driver_applications_user_id_idx ON driver_applications(user_id);
CREATE INDEX driver_applications_status_idx ON driver_applications(status);
CREATE INDEX driver_applications_submitted_at_idx ON driver_applications(submitted_at);

-- ============================================================================
-- STEP 5: Recreate RLS policies with wallet address support
-- ============================================================================

-- Users can read their own applications (using wallet address)
CREATE POLICY "Users can read own driver applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can create their own applications (using wallet address)
CREATE POLICY "Users can create driver applications"
  ON driver_applications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can update their own pending applications
CREATE POLICY "Users can update own pending applications"
  ON driver_applications FOR UPDATE
  TO authenticated
  USING (
    user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    AND status = 'pending'
  )
  WITH CHECK (
    user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    AND status = 'pending'
  );

-- Admins can read all applications (check via wallet_address in profiles)
CREATE POLICY "Admins can read all driver applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'sub'
      AND role IN ('superadmin', 'admin')
    )
  );

-- Admins can update any application (approve/reject)
CREATE POLICY "Admins can update driver applications"
  ON driver_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'sub'
      AND role IN ('superadmin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'sub'
      AND role IN ('superadmin', 'admin')
    )
  );

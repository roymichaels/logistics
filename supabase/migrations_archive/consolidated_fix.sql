/*
  # Consolidated User Table Fix Migration

  This single migration fixes the user_role ENUM issue and consolidates the users table.
  Copy and paste this entire file into your Supabase SQL Editor.

  What it does:
  1. Ensures user_role ENUM exists
  2. Backs up existing data
  3. Drops and recreates users table with proper ENUMs
  4. Migrates all data back
  5. Creates indexes and RLS policies
*/

-- ============================================================================
-- STEP 1: Ensure ENUM types exist
-- ============================================================================

-- Create or verify user_role ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'user',
      'infrastructure_owner',
      'business_owner',
      'manager',
      'dispatcher',
      'driver',
      'warehouse',
      'sales',
      'customer_service'
    );
  END IF;
END $$;

-- Create or verify user_registration_status ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_registration_status') THEN
    CREATE TYPE user_registration_status AS ENUM (
      'pending',
      'approved',
      'rejected'
    );
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Backup existing data to temp tables
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    DROP TABLE IF EXISTS users_backup;
    CREATE TEMP TABLE users_backup AS SELECT * FROM users;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_registrations' AND table_schema = 'public') THEN
    DROP TABLE IF EXISTS user_registrations_backup;
    CREATE TEMP TABLE user_registrations_backup AS SELECT * FROM user_registrations;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Drop old tables and policies
-- ============================================================================

DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_registrations CASCADE;

-- Recreate ENUMs after CASCADE
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM (
  'user',
  'infrastructure_owner',
  'business_owner',
  'manager',
  'dispatcher',
  'driver',
  'warehouse',
  'sales',
  'customer_service'
);

DROP TYPE IF EXISTS user_registration_status CASCADE;
CREATE TYPE user_registration_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- ============================================================================
-- STEP 4: Create consolidated users table
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  business_id UUID,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  photo_url TEXT,
  department TEXT,
  phone TEXT,
  email TEXT,
  registration_status user_registration_status NOT NULL DEFAULT 'approved',
  requested_role user_role,
  assigned_role user_role,
  approval_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  last_active TIMESTAMPTZ DEFAULT now(),
  is_online BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR length(phone) >= 9)
);

-- ============================================================================
-- STEP 5: Restore data from backups
-- ============================================================================

-- Restore from users_backup
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_backup') THEN
    INSERT INTO users (
      id, telegram_id, role, business_id, name, username,
      photo_url, department, phone, registration_status,
      last_active, created_at, updated_at
    )
    SELECT
      id, telegram_id,
      CASE
        WHEN role::text = ANY(ARRAY['user', 'infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'])
        THEN role::text::user_role
        ELSE 'user'::user_role
      END,
      business_id, name, username, photo_url, department, phone,
      'approved'::user_registration_status,
      COALESCE(last_active, now()), created_at, updated_at
    FROM users_backup
    ON CONFLICT (telegram_id) DO NOTHING;
  END IF;
END $$;

-- Restore from user_registrations_backup
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_registrations_backup') THEN
    INSERT INTO users (
      telegram_id, role, name, first_name, last_name, username,
      photo_url, department, phone, registration_status,
      requested_role, assigned_role, approval_history,
      approved_by, approved_at, approval_notes,
      created_at, updated_at
    )
    SELECT
      telegram_id,
      COALESCE(
        CASE WHEN assigned_role::text = ANY(ARRAY['user', 'infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'])
             THEN assigned_role::text::user_role END,
        CASE WHEN requested_role::text = ANY(ARRAY['user', 'infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'])
             THEN requested_role::text::user_role END,
        'user'::user_role
      ),
      CONCAT_WS(' ', first_name, last_name),
      first_name, last_name, username, photo_url, department, phone,
      CASE
        WHEN status::text = ANY(ARRAY['pending', 'approved', 'rejected'])
        THEN status::text::user_registration_status
        ELSE 'pending'::user_registration_status
      END,
      CASE WHEN requested_role::text = ANY(ARRAY['user', 'infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'])
           THEN requested_role::text::user_role END,
      CASE WHEN assigned_role::text = ANY(ARRAY['user', 'infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'])
           THEN assigned_role::text::user_role END,
      approval_history,
      approved_by, approved_at, approval_notes,
      created_at, updated_at
    FROM user_registrations_backup
    ON CONFLICT (telegram_id) DO UPDATE SET
      registration_status = EXCLUDED.registration_status,
      requested_role = EXCLUDED.requested_role,
      assigned_role = EXCLUDED.assigned_role,
      approval_history = EXCLUDED.approval_history;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Create indexes
-- ============================================================================

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_business_id ON users(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX idx_users_registration_status ON users(registration_status);
CREATE INDEX idx_users_business_role ON users(business_id, role) WHERE business_id IS NOT NULL;
CREATE INDEX idx_users_last_active ON users(last_active DESC);
CREATE INDEX idx_users_is_online ON users(is_online) WHERE is_online = true;
CREATE INDEX idx_users_pending_registrations ON users(registration_status, created_at DESC) WHERE registration_status = 'pending';

-- ============================================================================
-- STEP 7: Create helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION is_infrastructure_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE telegram_id = COALESCE(auth.jwt() ->> 'telegram_id', current_setting('request.jwt.claims', true)::json ->> 'telegram_id')
    AND role = 'infrastructure_owner'
    AND registration_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_user_telegram_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt() ->> 'telegram_id',
    current_setting('request.jwt.claims', true)::json ->> 'telegram_id'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 8: Enable RLS and create policies
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (telegram_id = get_current_user_telegram_id());

-- Infrastructure owners can view all
CREATE POLICY "users_select_infra_owner"
  ON users FOR SELECT
  TO authenticated
  USING (is_infrastructure_owner());

-- Users can view colleagues in same business
CREATE POLICY "users_select_colleagues"
  ON users FOR SELECT
  TO authenticated
  USING (
    business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.telegram_id = get_current_user_telegram_id()
      AND u.business_id = users.business_id
    )
  );

-- Users can update own profile (limited)
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (telegram_id = get_current_user_telegram_id());

-- Infrastructure owners can update any
CREATE POLICY "users_update_infra_owner"
  ON users FOR UPDATE
  TO authenticated
  USING (is_infrastructure_owner());

-- Users can insert self-registration
CREATE POLICY "users_insert_self"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    telegram_id = get_current_user_telegram_id()
    AND registration_status = 'pending'
  );

-- Infrastructure owners can insert any
CREATE POLICY "users_insert_infra_owner"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (is_infrastructure_owner());

-- Only infrastructure owners can delete
CREATE POLICY "users_delete_infra_owner"
  ON users FOR DELETE
  TO authenticated
  USING (is_infrastructure_owner());

-- ============================================================================
-- STEP 9: Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 10: Create audit log
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_by TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_audit_log_user ON user_audit_log(user_telegram_id, created_at DESC);
CREATE INDEX idx_user_audit_log_action ON user_audit_log(action, created_at DESC);

ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_own"
  ON user_audit_log FOR SELECT
  TO authenticated
  USING (user_telegram_id = get_current_user_telegram_id());

CREATE POLICY "audit_select_infra_owner"
  ON user_audit_log FOR SELECT
  TO authenticated
  USING (is_infrastructure_owner());

-- ============================================================================
-- Cleanup temp tables
-- ============================================================================

DROP TABLE IF EXISTS users_backup;
DROP TABLE IF EXISTS user_registrations_backup;

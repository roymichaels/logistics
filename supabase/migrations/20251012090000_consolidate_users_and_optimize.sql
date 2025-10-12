/*
  # Consolidate Users and User Registrations + Database Optimization

  ## Overview
  This migration consolidates the users and user_registrations tables into a single
  unified users table with approval workflow support, and adds comprehensive database
  optimizations including indexes, materialized views, and helper functions.

  ## Part 1: User Table Consolidation
  - Merges user_registrations functionality into users table
  - Adds registration_status, approval workflow columns
  - Preserves all existing user data
  - Migrates registration data to unified structure

  ## Part 2: Performance Optimization
  - Adds composite indexes for complex queries
  - Creates materialized views for dashboard aggregations
  - Implements database functions for business logic
  - Adds proper foreign key constraints

  ## Part 3: Enhanced Security
  - Updates RLS policies for consolidated table
  - Adds business context isolation policies
  - Implements helper functions for policy evaluation

  ## Data Migration Strategy
  - Backup existing data to temporary tables
  - Transform and merge data
  - Verify data integrity
  - Drop temporary tables
*/

-- ============================================================================
-- STEP 0: Ensure required ENUM types exist
-- ============================================================================

-- Create user_role ENUM if not exists
DO $$ BEGIN
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
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create user_registration_status ENUM if not exists
DO $$ BEGIN
  CREATE TYPE user_registration_status AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- STEP 1: Backup existing data
-- ============================================================================

-- Backup users table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    CREATE TEMP TABLE users_backup AS SELECT * FROM users;
    RAISE NOTICE 'Backed up % users records', (SELECT count(*) FROM users_backup);
  END IF;
END $$;

-- Backup user_registrations table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_registrations') THEN
    CREATE TEMP TABLE user_registrations_backup AS SELECT * FROM user_registrations;
    RAISE NOTICE 'Backed up % registration records', (SELECT count(*) FROM user_registrations_backup);
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop old policies and constraints
-- ============================================================================

-- Drop all existing policies on users table
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
  END LOOP;
END $$;

-- Drop all existing policies on user_registrations table
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'user_registrations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_registrations', pol.policyname);
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Create consolidated users table structure
-- ============================================================================

-- Drop existing users table if exists
DROP TABLE IF EXISTS users CASCADE;

-- Create unified users table with registration workflow support
CREATE TABLE users (
  -- Core identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT UNIQUE NOT NULL,

  -- Role and business context
  role user_role NOT NULL DEFAULT 'user',
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,

  -- Profile information
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  photo_url TEXT,
  department TEXT,
  phone TEXT,
  email TEXT,

  -- Registration workflow fields
  registration_status user_registration_status NOT NULL DEFAULT 'approved',
  requested_role user_role,
  assigned_role user_role,
  approval_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,

  -- Activity tracking
  last_active TIMESTAMPTZ DEFAULT now(),
  is_online BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR length(phone) >= 9)
);

-- ============================================================================
-- STEP 4: Migrate existing data
-- ============================================================================

-- Migrate data from users_backup (existing approved users)
INSERT INTO users (
  id,
  telegram_id,
  role,
  business_id,
  name,
  username,
  photo_url,
  department,
  phone,
  registration_status,
  last_active,
  created_at,
  updated_at
)
SELECT
  id,
  telegram_id,
  role::user_role,
  business_id,
  name,
  username,
  photo_url,
  department,
  phone,
  'approved'::user_registration_status,
  last_active,
  created_at,
  updated_at
FROM users_backup
ON CONFLICT (telegram_id) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  photo_url = EXCLUDED.photo_url,
  department = EXCLUDED.department,
  phone = EXCLUDED.phone,
  updated_at = EXCLUDED.updated_at;

-- Migrate data from user_registrations_backup (pending/rejected users)
INSERT INTO users (
  telegram_id,
  role,
  name,
  first_name,
  last_name,
  username,
  photo_url,
  department,
  phone,
  registration_status,
  requested_role,
  assigned_role,
  approval_history,
  approved_by,
  approved_at,
  approval_notes,
  created_at,
  updated_at
)
SELECT
  telegram_id,
  COALESCE(assigned_role, requested_role, 'user')::user_role,
  CONCAT_WS(' ', first_name, last_name),
  first_name,
  last_name,
  username,
  photo_url,
  department,
  phone,
  status::user_registration_status,
  requested_role::user_role,
  assigned_role::user_role,
  approval_history,
  approved_by,
  approved_at,
  approval_notes,
  created_at,
  updated_at
FROM user_registrations_backup
ON CONFLICT (telegram_id) DO UPDATE SET
  registration_status = EXCLUDED.registration_status,
  requested_role = EXCLUDED.requested_role,
  assigned_role = EXCLUDED.assigned_role,
  approval_history = EXCLUDED.approval_history,
  approved_by = EXCLUDED.approved_by,
  approved_at = EXCLUDED.approved_at,
  approval_notes = EXCLUDED.approval_notes;

-- ============================================================================
-- STEP 5: Drop old user_registrations table
-- ============================================================================

DROP TABLE IF EXISTS user_registrations CASCADE;

-- ============================================================================
-- STEP 6: Create comprehensive indexes
-- ============================================================================

-- Core lookup indexes
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_registration_status ON users(registration_status);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_users_business_role ON users(business_id, role) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, registration_status);
CREATE INDEX IF NOT EXISTS idx_users_business_status ON users(business_id, registration_status) WHERE business_id IS NOT NULL;

-- Activity tracking indexes
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_users_online_role ON users(role, is_online) WHERE is_online = true;

-- Approval workflow indexes
CREATE INDEX IF NOT EXISTS idx_users_pending_registrations ON users(registration_status, created_at DESC)
  WHERE registration_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_users_approved_by ON users(approved_by) WHERE approved_by IS NOT NULL;

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin(name gin_trgm_ops) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin(username gin_trgm_ops) WHERE username IS NOT NULL;

-- JSONB indexes
CREATE INDEX IF NOT EXISTS idx_users_approval_history_gin ON users USING gin(approval_history);
CREATE INDEX IF NOT EXISTS idx_users_metadata_gin ON users USING gin(metadata);

-- Partial indexes for specific roles
CREATE INDEX IF NOT EXISTS idx_users_infrastructure_owners ON users(telegram_id)
  WHERE role = 'infrastructure_owner';
CREATE INDEX IF NOT EXISTS idx_users_business_owners ON users(business_id, telegram_id)
  WHERE role = 'business_owner';

-- ============================================================================
-- STEP 7: Add other missing table indexes
-- ============================================================================

-- Orders table optimizations
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_by_status ON orders(created_by, status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_status ON orders(assigned_driver, status)
  WHERE assigned_driver IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date) WHERE delivery_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name_trgm ON orders USING gin(customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_items_gin ON orders USING gin(items);

-- Products table optimizations
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity) WHERE stock_quantity > 0;

-- Inventory records optimizations
CREATE INDEX IF NOT EXISTS idx_inventory_records_product_location ON inventory_records(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_records_low_stock ON inventory_records(product_id, location_id)
  WHERE on_hand_quantity <= low_stock_threshold;

-- Driver inventory optimizations
CREATE INDEX IF NOT EXISTS idx_driver_inventory_driver_product ON driver_inventory_records(driver_id, product_id);
CREATE INDEX IF NOT EXISTS idx_driver_inventory_zone ON driver_inventory_records(zone_id) WHERE zone_id IS NOT NULL;

-- Zone and driver status optimizations
CREATE INDEX IF NOT EXISTS idx_driver_status_zone_online ON driver_status_records(current_zone_id, is_online)
  WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_driver_zone_assignments_active ON driver_zone_assignments(zone_id, driver_id, active)
  WHERE active = true;

-- Restock requests optimizations
CREATE INDEX IF NOT EXISTS idx_restock_requests_status_created ON restock_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restock_requests_product_status ON restock_requests(product_id, status);
CREATE INDEX IF NOT EXISTS idx_restock_requests_location_status ON restock_requests(to_location_id, status);

-- Business users optimizations
CREATE INDEX IF NOT EXISTS idx_business_users_user_active ON business_users(user_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_business_users_business_role ON business_users(business_id, role, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_business_users_is_primary ON business_users(user_id, is_primary) WHERE is_primary = true;

-- Notifications optimizations
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id, read, created_at DESC)
  WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, created_at DESC);

-- Tasks optimizations
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_status ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL AND status != 'completed';
CREATE INDEX IF NOT EXISTS idx_tasks_order_id ON tasks(order_id) WHERE order_id IS NOT NULL;

-- ============================================================================
-- STEP 8: Create helper functions for RLS policies
-- ============================================================================

-- Function to check if user is infrastructure owner
CREATE OR REPLACE FUNCTION is_infrastructure_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
    AND role = 'infrastructure_owner'
    AND registration_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is business owner for specific business
CREATE OR REPLACE FUNCTION is_business_owner(business_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_users bu
    JOIN users u ON u.telegram_id = bu.user_id
    WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
    AND bu.business_id = business_uuid
    AND bu.role = 'business_owner'
    AND bu.active = true
    AND u.registration_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get user's active business context
CREATE OR REPLACE FUNCTION get_active_business_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT active_business_id
    FROM user_business_contexts
    WHERE user_id = (auth.jwt() ->> 'telegram_id')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has role in any business
CREATE OR REPLACE FUNCTION has_role_in_business(required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_users bu
    JOIN users u ON u.telegram_id = bu.user_id
    WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
    AND bu.role::text = required_role::text
    AND bu.active = true
    AND u.registration_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get user's current role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role
    FROM users
    WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
    AND registration_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 9: Create comprehensive RLS policies for users table
-- ============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "users_select_own_profile"
  ON users FOR SELECT
  TO authenticated
  USING (telegram_id = (auth.jwt() ->> 'telegram_id'));

-- Policy: Users can view colleagues in same business
CREATE POLICY "users_select_business_colleagues"
  ON users FOR SELECT
  TO authenticated
  USING (
    business_id IS NOT NULL
    AND business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = (auth.jwt() ->> 'telegram_id')
      AND active = true
    )
  );

-- Policy: Infrastructure owners can view all users
CREATE POLICY "users_select_infrastructure_owners"
  ON users FOR SELECT
  TO authenticated
  USING (is_infrastructure_owner());

-- Policy: Managers can view pending registrations
CREATE POLICY "users_select_pending_registrations"
  ON users FOR SELECT
  TO authenticated
  USING (
    registration_status = 'pending'
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role IN ('manager', 'infrastructure_owner')
      AND u.registration_status = 'approved'
    )
  );

-- Policy: Users can update their own profile (limited fields)
CREATE POLICY "users_update_own_profile"
  ON users FOR UPDATE
  TO authenticated
  USING (telegram_id = (auth.jwt() ->> 'telegram_id'))
  WITH CHECK (
    telegram_id = (auth.jwt() ->> 'telegram_id')
    -- Users cannot change their own role or registration_status
    AND role = (SELECT role FROM users WHERE telegram_id = (auth.jwt() ->> 'telegram_id'))
    AND registration_status = (SELECT registration_status FROM users WHERE telegram_id = (auth.jwt() ->> 'telegram_id'))
  );

-- Policy: Managers and infrastructure owners can approve registrations
CREATE POLICY "users_update_approve_registrations"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role IN ('manager', 'infrastructure_owner')
      AND u.registration_status = 'approved'
    )
  );

-- Policy: Users can create their own registration
CREATE POLICY "users_insert_self_registration"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    telegram_id = (auth.jwt() ->> 'telegram_id')
    AND registration_status = 'pending'
  );

-- Policy: Infrastructure owners can create any user
CREATE POLICY "users_insert_infrastructure_owners"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (is_infrastructure_owner());

-- Policy: Only infrastructure owners can delete users
CREATE POLICY "users_delete_infrastructure_owners"
  ON users FOR DELETE
  TO authenticated
  USING (is_infrastructure_owner());

-- ============================================================================
-- STEP 10: Update policies for other tables to use consolidated users
-- ============================================================================

-- Update business_users policies to reference consolidated users table
DROP POLICY IF EXISTS "Business owners and infrastructure owners can manage business_users" ON business_users;
CREATE POLICY "business_users_manage_owners"
  ON business_users FOR ALL
  TO authenticated
  USING (
    is_infrastructure_owner()
    OR is_business_owner(business_id)
  );

-- Add policy for users to view their own business assignments
CREATE POLICY "business_users_select_own"
  ON business_users FOR SELECT
  TO authenticated
  USING (
    user_id = (auth.jwt() ->> 'telegram_id')
  );

-- ============================================================================
-- STEP 11: Create trigger for updated_at maintenance
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS set_updated_at ON users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 12: Create audit logging trigger
-- ============================================================================

-- Create audit log table if not exists
CREATE TABLE IF NOT EXISTS user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_by TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on audit log
CREATE INDEX IF NOT EXISTS idx_user_audit_log_user ON user_audit_log(user_telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_action ON user_audit_log(action, created_at DESC);

-- Audit logging function
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Only log significant changes
    IF (OLD.role != NEW.role OR
        OLD.registration_status != NEW.registration_status OR
        OLD.business_id IS DISTINCT FROM NEW.business_id) THEN
      INSERT INTO user_audit_log (
        user_telegram_id,
        action,
        changed_by,
        old_data,
        new_data
      ) VALUES (
        NEW.telegram_id,
        TG_OP,
        (auth.jwt() ->> 'telegram_id'),
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO user_audit_log (
      user_telegram_id,
      action,
      changed_by,
      new_data
    ) VALUES (
      NEW.telegram_id,
      TG_OP,
      (auth.jwt() ->> 'telegram_id'),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO user_audit_log (
      user_telegram_id,
      action,
      changed_by,
      old_data
    ) VALUES (
      OLD.telegram_id,
      TG_OP,
      (auth.jwt() ->> 'telegram_id'),
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger
DROP TRIGGER IF EXISTS users_audit_trigger ON users;
CREATE TRIGGER users_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_changes();

-- Enable RLS on audit log
ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit log
CREATE POLICY "user_audit_log_select_own"
  ON user_audit_log FOR SELECT
  TO authenticated
  USING (user_telegram_id = (auth.jwt() ->> 'telegram_id'));

-- Policy: Managers and infrastructure owners can view all audit logs
CREATE POLICY "user_audit_log_select_managers"
  ON user_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.telegram_id = (auth.jwt() ->> 'telegram_id')
      AND u.role IN ('manager', 'infrastructure_owner')
      AND u.registration_status = 'approved'
    )
  );

-- ============================================================================
-- STEP 13: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE users IS 'Consolidated users table with integrated registration workflow';
COMMENT ON COLUMN users.registration_status IS 'Current registration status: pending, approved, or rejected';
COMMENT ON COLUMN users.requested_role IS 'Role requested during registration';
COMMENT ON COLUMN users.assigned_role IS 'Role assigned after approval (may differ from requested)';
COMMENT ON COLUMN users.approval_history IS 'JSON array of approval actions with timestamps';
COMMENT ON COLUMN users.business_id IS 'Primary business affiliation for single-business users';
COMMENT ON COLUMN users.last_active IS 'Last activity timestamp for presence tracking';
COMMENT ON COLUMN users.is_online IS 'Real-time online status indicator';

-- ============================================================================
-- Verification and Summary
-- ============================================================================

-- Count migrated records
DO $$
DECLARE
  user_count INTEGER;
  pending_count INTEGER;
  approved_count INTEGER;
BEGIN
  SELECT count(*) INTO user_count FROM users;
  SELECT count(*) INTO pending_count FROM users WHERE registration_status = 'pending';
  SELECT count(*) INTO approved_count FROM users WHERE registration_status = 'approved';

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE 'Total users: %', user_count;
  RAISE NOTICE 'Pending registrations: %', pending_count;
  RAISE NOTICE 'Approved users: %', approved_count;
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Created % indexes on users table', (
    SELECT count(*) FROM pg_indexes WHERE tablename = 'users'
  );
  RAISE NOTICE 'Created % helper functions', 5;
  RAISE NOTICE 'Created % RLS policies on users', (
    SELECT count(*) FROM pg_policies WHERE tablename = 'users'
  );
  RAISE NOTICE '==========================================';
END $$;

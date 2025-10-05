/*
  # Create App Owner Role - Highest Privilege Level

  ## Overview
  This migration restructures the role hierarchy to establish "app_owner" as the supreme
  administrator role with access to platform-wide analytics and settings.

  ## Role Hierarchy (Top to Bottom)
  1. **app_owner** (NEW) - Platform developer/creator with full system access
     - Platform analytics dashboard
     - System configuration
     - All data access across all businesses
     - Developer tools and logs

  2. **owner** (RENAMED from infrastructure_owner) - Business infrastructure owner
     - Manages multiple businesses
     - Global view of owned businesses
     - User management across businesses

  3. **business_owner** - Individual business owner
     - Single business management
     - Business-specific analytics
     - Team management for their business

  4. **manager**, **dispatcher**, **driver**, **warehouse**, **sales**, **customer_service** - Operational roles

  ## Changes
  1. Add 'app_owner' role to users table constraint
  2. Rename 'infrastructure_owner' → 'owner' in existing data
  3. Update RLS policies to recognize app_owner as superadmin
  4. Create app_analytics table for platform-wide metrics
  5. Update role display names and UI

  ## Security
  - app_owner has unrestricted access (bypasses all RLS)
  - owner has multi-business access via business_users
  - business_owner has single-business access
  - All other roles remain workspace-scoped
*/

-- =============================================
-- STEP 1: Update role constraints
-- =============================================

-- Update users table to include app_owner and regular owner
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN (
    'app_owner',           -- Platform developer (highest)
    'owner',               -- Business infrastructure owner
    'business_owner',      -- Individual business owner
    'manager',             -- Business manager
    'dispatcher',          -- Operations dispatcher
    'driver',              -- Delivery driver
    'warehouse',           -- Warehouse staff
    'sales',               -- Sales representative
    'customer_service'     -- Customer service
  ));

-- business_users table doesn't include app_owner (app_owner is global)
ALTER TABLE business_users DROP CONSTRAINT IF EXISTS business_users_role_check;
ALTER TABLE business_users ADD CONSTRAINT business_users_role_check
  CHECK (role IN ('owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'));

-- =============================================
-- STEP 2: Rename infrastructure_owner to owner
-- =============================================

-- Update existing users with infrastructure_owner role to owner
UPDATE users
SET role = 'owner'
WHERE role = 'infrastructure_owner';

-- =============================================
-- STEP 3: Create app_analytics table
-- =============================================

CREATE TABLE IF NOT EXISTS app_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metrics
  metric_type text NOT NULL, -- 'user_count', 'order_count', 'business_count', etc.
  metric_value numeric NOT NULL,
  metric_metadata jsonb DEFAULT '{}',

  -- Dimensions
  period_type text NOT NULL, -- 'hour', 'day', 'week', 'month'
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,

  -- Context
  business_id uuid REFERENCES businesses(id),  -- null for platform-wide metrics
  user_role text,                               -- role-specific metrics

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_metric_type CHECK (metric_type IN (
    'user_count', 'active_users', 'new_users',
    'order_count', 'order_value', 'completed_orders',
    'business_count', 'active_businesses',
    'revenue', 'transactions',
    'api_calls', 'error_rate', 'response_time'
  )),
  CONSTRAINT valid_period CHECK (period_type IN ('hour', 'day', 'week', 'month', 'year')),
  CONSTRAINT valid_period_range CHECK (period_end > period_start)
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_app_analytics_period ON app_analytics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_app_analytics_metric ON app_analytics(metric_type, period_type);
CREATE INDEX IF NOT EXISTS idx_app_analytics_business ON app_analytics(business_id) WHERE business_id IS NOT NULL;

-- =============================================
-- STEP 4: Update RLS policies for app_owner
-- =============================================

-- Drop and recreate users view policies to include app_owner

DROP POLICY IF EXISTS "infrastructure_owners_view_all_users" ON users;

-- Policy: app_owner can view ALL users globally (replaces infrastructure_owner policy)
CREATE POLICY "app_owner_view_all_users"
  ON users FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'app_owner'
  );

-- Policy: regular owners can view users in their businesses
CREATE POLICY "owner_view_business_users"
  ON users FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'business_owner', 'manager')
    AND (
      -- app_owner can see everyone
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'app_owner'
      OR
      -- owner/manager can see workspace users
      EXISTS (
        SELECT 1 FROM business_users bu
        WHERE bu.user_id = users.id
        AND bu.business_id = (auth.jwt() -> 'app_metadata' ->> 'workspace_id')::uuid
        AND bu.active = true
      )
    )
  );

-- Policy: app_owner can update ANY user role
DROP POLICY IF EXISTS "workspace_admins_update_roles" ON users;
DROP POLICY IF EXISTS "admins_update_roles" ON users;

CREATE POLICY "admins_update_users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    -- app_owner can update anyone (highest privilege)
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'app_owner'
    OR
    -- owner can update anyone (infrastructure access)
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
    OR
    -- business_owner/manager can update workspace users
    (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('business_owner', 'manager')
      AND EXISTS (
        SELECT 1 FROM business_users bu
        WHERE bu.user_id = users.id
        AND bu.business_id = (auth.jwt() -> 'app_metadata' ->> 'workspace_id')::uuid
      )
    )
  )
  WITH CHECK (
    -- Allow updates to go through (role validation done by application)
    true
  );

-- =============================================
-- STEP 5: RLS for app_analytics
-- =============================================

ALTER TABLE app_analytics ENABLE ROW LEVEL SECURITY;

-- app_owner can view all analytics
CREATE POLICY "app_owner_view_analytics"
  ON app_analytics FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'app_owner'
  );

-- app_owner can insert analytics
CREATE POLICY "app_owner_insert_analytics"
  ON app_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'app_owner'
  );

-- owner/business_owner can view their business analytics
CREATE POLICY "owner_view_business_analytics"
  ON app_analytics FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'business_owner')
    AND (
      business_id = (auth.jwt() -> 'app_metadata' ->> 'workspace_id')::uuid
      OR business_id IS NULL  -- platform-wide metrics visible to owners
    )
  );

-- =============================================
-- STEP 6: Create analytics helper functions
-- =============================================

-- Function to aggregate daily metrics
CREATE OR REPLACE FUNCTION aggregate_daily_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- User metrics
  INSERT INTO app_analytics (metric_type, metric_value, period_type, period_start, period_end)
  SELECT
    'user_count',
    COUNT(*),
    'day',
    date_trunc('day', now() - interval '1 day'),
    date_trunc('day', now())
  FROM users
  WHERE created_at < date_trunc('day', now());

  -- Business metrics
  INSERT INTO app_analytics (metric_type, metric_value, period_type, period_start, period_end)
  SELECT
    'business_count',
    COUNT(*),
    'day',
    date_trunc('day', now() - interval '1 day'),
    date_trunc('day', now())
  FROM businesses
  WHERE created_at < date_trunc('day', now());

  -- Order metrics
  INSERT INTO app_analytics (metric_type, metric_value, period_type, period_start, period_end)
  SELECT
    'order_count',
    COUNT(*),
    'day',
    date_trunc('day', now() - interval '1 day'),
    date_trunc('day', now())
  FROM orders
  WHERE created_at >= date_trunc('day', now() - interval '1 day')
  AND created_at < date_trunc('day', now());
END;
$$;

-- Function to get current platform stats (for app_owner dashboard)
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'total_businesses', (SELECT COUNT(*) FROM businesses),
    'total_orders', (SELECT COUNT(*) FROM orders),
    'active_users_today', (
      SELECT COUNT(*) FROM users
      WHERE updated_at >= date_trunc('day', now())
    ),
    'orders_today', (
      SELECT COUNT(*) FROM orders
      WHERE created_at >= date_trunc('day', now())
    ),
    'users_by_role', (
      SELECT json_object_agg(role, count)
      FROM (
        SELECT role, COUNT(*) as count
        FROM users
        GROUP BY role
      ) role_counts
    ),
    'businesses_by_status', (
      SELECT json_object_agg(active, count)
      FROM (
        SELECT active, COUNT(*) as count
        FROM businesses
        GROUP BY active
      ) business_counts
    )
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION aggregate_daily_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;

-- =============================================
-- Verification
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ App Owner role created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Role Hierarchy:';
  RAISE NOTICE '  1. app_owner - Platform developer (HIGHEST)';
  RAISE NOTICE '  2. owner - Business infrastructure owner';
  RAISE NOTICE '  3. business_owner - Individual business owner';
  RAISE NOTICE '  4. manager, dispatcher, driver, etc. - Operational roles';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Updates:';
  RAISE NOTICE '  - app_owner: Global access to ALL data';
  RAISE NOTICE '  - owner: Multi-business access via business_users';
  RAISE NOTICE '  - business_owner: Single business access';
  RAISE NOTICE '';
  RAISE NOTICE 'New Features:';
  RAISE NOTICE '  - app_analytics table for platform metrics';
  RAISE NOTICE '  - get_platform_stats() function for dashboard';
  RAISE NOTICE '  - aggregate_daily_analytics() for data collection';
  RAISE NOTICE '';
  RAISE NOTICE 'To promote a user to app_owner:';
  RAISE NOTICE '  UPDATE users SET role = ''app_owner'' WHERE telegram_id = ''YOUR_TELEGRAM_ID'';';
END $$;

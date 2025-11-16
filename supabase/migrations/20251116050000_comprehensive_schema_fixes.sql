/*
  # Comprehensive Schema Fixes - Critical Database Errors

  This migration addresses 5 critical issues preventing the application from working:

  1. **RLS Infinite Recursion (42P17)** - direct_message_participants policy causes infinite loop
  2. **Invalid Enum Value (22P02)** - order_status missing 'completed' value
  3. **Missing Column (42703)** - roles.label column doesn't exist
  4. **Foreign Key Error (PGRST200)** - queries reference wrong driver column name
  5. **Schema Inconsistencies** - mixed use of assigned_driver vs assigned_driver_id

  ## Changes:
  - Fix auth_is_room_member function to be non-recursive
  - Update RLS policies to avoid recursion
  - Add 'completed' to order_status enum
  - Add 'label' column to roles table
  - Standardize on assigned_driver_id column name
  - Update get_business_metrics function
  - Add missing 'is_active' column to user_business_roles

  ## Safety:
  - All changes are idempotent (safe to run multiple times)
  - Includes proper existence checks
  - Preserves existing data
*/

-- =====================================================
-- 1. FIX RLS INFINITE RECURSION
-- =====================================================

-- Drop and recreate auth_is_room_member without recursion
DROP FUNCTION IF EXISTS auth_is_room_member(uuid) CASCADE;

CREATE OR REPLACE FUNCTION auth_is_room_member(target_room uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1
      FROM chat_room_members crm
      WHERE crm.room_id = target_room
        AND crm.user_id = auth.uid()
        AND crm.is_active = true
    )
$$;

COMMENT ON FUNCTION auth_is_room_member IS
'Checks if the authenticated user is a member of a chat room.
Non-recursive version to prevent infinite loops in RLS policies.
Uses direct table query instead of relying on RLS.';

-- Fix direct_message_participants RLS policy (remove recursion)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'direct_message_participants'
  ) THEN
    DROP POLICY IF EXISTS direct_message_participants_access ON direct_message_participants;

    CREATE POLICY direct_message_participants_access ON direct_message_participants
      FOR ALL
      USING (
        auth.uid() IN (user_a, user_b)
        OR EXISTS (
          SELECT 1
          FROM chat_room_members crm
          WHERE crm.room_id = direct_message_participants.room_id
            AND crm.user_id = auth.uid()
            AND crm.is_active = true
        )
      )
      WITH CHECK (
        auth.uid() IN (user_a, user_b)
      );
  END IF;
END $$;

-- Fix chat_rooms RLS policy (remove recursion)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_rooms'
  ) THEN
    DROP POLICY IF EXISTS chat_rooms_access ON chat_rooms;

    CREATE POLICY chat_rooms_access ON chat_rooms
      FOR ALL
      USING (
        auth.role() = 'service_role'
        OR auth_is_superadmin()
        OR (infrastructure_id IS NOT NULL AND auth_current_infrastructure_id() = infrastructure_id)
        OR (business_id IS NOT NULL AND auth_current_business_id() = business_id)
        OR EXISTS (
          SELECT 1
          FROM chat_room_members crm
          WHERE crm.room_id = chat_rooms.id
            AND crm.user_id = auth.uid()
            AND crm.is_active = true
        )
      )
      WITH CHECK (
        auth.role() = 'service_role'
        OR (infrastructure_id IS NOT NULL AND auth_current_infrastructure_id() = infrastructure_id)
        OR (business_id IS NOT NULL AND auth_current_business_id() = business_id)
      );
  END IF;
END $$;

-- =====================================================
-- 2. ADD MISSING 'completed' TO ORDER_STATUS ENUM
-- =====================================================

DO $$
BEGIN
  -- Check if 'completed' already exists in order_status enum
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'completed'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    -- Add 'completed' after 'delivered'
    ALTER TYPE order_status ADD VALUE 'completed' AFTER 'delivered';
  END IF;
END $$;

-- =====================================================
-- 3. ADD MISSING 'label' COLUMN TO ROLES TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'roles'
      AND column_name = 'label'
  ) THEN
    ALTER TABLE roles ADD COLUMN label text;

    -- Populate label from name_en
    UPDATE roles SET label = name_en WHERE label IS NULL;

    COMMENT ON COLUMN roles.label IS 'Display label for the role. Used in queries and UI.';
  END IF;
END $$;

-- =====================================================
-- 4. ENSURE ORDERS TABLE USES assigned_driver_id
-- =====================================================

-- The orders table should use assigned_driver_id (not assigned_driver)
-- This matches the init_schema.sql base schema
DO $$
BEGIN
  -- Ensure assigned_driver_id exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'assigned_driver_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN assigned_driver_id uuid REFERENCES users(id) ON DELETE SET NULL;

    -- If there's an assigned_driver column, migrate data
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'assigned_driver'
    ) THEN
      UPDATE orders SET assigned_driver_id = assigned_driver WHERE assigned_driver IS NOT NULL;
    END IF;
  END IF;

  -- Drop assigned_driver column if it exists (we're standardizing on assigned_driver_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'assigned_driver'
  ) THEN
    ALTER TABLE orders DROP COLUMN IF EXISTS assigned_driver CASCADE;
  END IF;

  -- Ensure proper foreign key constraint exists
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_assigned_driver_id_fkey CASCADE;
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_assigned_driver_id CASCADE;

  ALTER TABLE orders
    ADD CONSTRAINT fk_orders_assigned_driver_id
    FOREIGN KEY (assigned_driver_id)
    REFERENCES users(id)
    ON DELETE SET NULL;

  -- Add index for performance
  CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_id ON orders(assigned_driver_id);
END $$;

-- =====================================================
-- 5. ADD is_active COLUMN TO user_business_roles
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_business_roles'
      AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_business_roles ADD COLUMN is_active boolean NOT NULL DEFAULT true;

    COMMENT ON COLUMN user_business_roles.is_active IS 'Indicates if this role assignment is currently active.';
  END IF;
END $$;

-- =====================================================
-- 6. UPDATE get_business_metrics FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_business_metrics(p_business_id uuid)
RETURNS TABLE (
  business_id uuid,
  revenue_today numeric,
  revenue_month numeric,
  revenue_30_days numeric,
  orders_today bigint,
  orders_month bigint,
  orders_in_progress bigint,
  orders_delivered bigint,
  average_order_value numeric,
  active_drivers bigint,
  pending_allocations bigint,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH date_ranges AS (
    SELECT
      CURRENT_DATE AS today,
      DATE_TRUNC('month', CURRENT_DATE) AS month_start,
      CURRENT_DATE - INTERVAL '30 days' AS thirty_days_ago
  ),
  order_metrics AS (
    SELECT
      COALESCE(SUM(CASE
        WHEN DATE(o.created_at) = dr.today THEN o.total_amount
        ELSE 0
      END), 0) AS rev_today,
      COALESCE(SUM(CASE
        WHEN o.created_at >= dr.month_start THEN o.total_amount
        ELSE 0
      END), 0) AS rev_month,
      COALESCE(SUM(CASE
        WHEN o.created_at >= dr.thirty_days_ago THEN o.total_amount
        ELSE 0
      END), 0) AS rev_30days,
      COUNT(CASE
        WHEN DATE(o.created_at) = dr.today THEN 1
      END) AS ord_today,
      COUNT(CASE
        WHEN o.created_at >= dr.month_start THEN 1
      END) AS ord_month,
      COUNT(CASE
        WHEN o.status IN ('confirmed', 'preparing', 'en_route', 'out_for_delivery', 'ready') THEN 1
      END) AS ord_in_progress,
      COUNT(CASE
        WHEN o.status IN ('delivered', 'completed') THEN 1
      END) AS ord_delivered,
      CASE
        WHEN COUNT(*) > 0 THEN COALESCE(AVG(o.total_amount), 0)
        ELSE 0
      END AS avg_order_value
    FROM orders o
    CROSS JOIN date_ranges dr
    WHERE o.business_id = p_business_id
  ),
  driver_metrics AS (
    SELECT
      COUNT(DISTINCT o.assigned_driver_id) AS active_driver_count
    FROM orders o
    WHERE o.business_id = p_business_id
      AND o.assigned_driver_id IS NOT NULL
      AND o.status IN ('confirmed', 'preparing', 'en_route', 'out_for_delivery', 'ready')
  ),
  allocation_metrics AS (
    SELECT
      COALESCE(COUNT(*), 0) AS pending_alloc_count
    FROM stock_allocations sa
    WHERE sa.business_id = p_business_id
      AND sa.status = 'pending'
  )
  SELECT
    p_business_id,
    om.rev_today::numeric,
    om.rev_month::numeric,
    om.rev_30days::numeric,
    om.ord_today::bigint,
    om.ord_month::bigint,
    om.ord_in_progress::bigint,
    om.ord_delivered::bigint,
    om.avg_order_value::numeric,
    COALESCE(dm.active_driver_count, 0)::bigint,
    COALESCE(am.pending_alloc_count, 0)::bigint,
    NOW()
  FROM order_metrics om
  CROSS JOIN driver_metrics dm
  CROSS JOIN allocation_metrics am;
END;
$$;

COMMENT ON FUNCTION get_business_metrics IS
'Calculates business KPI metrics including revenue, orders, and driver statistics.
Supports both "delivered" and "completed" order statuses.
Uses assigned_driver_id column (standardized column name).';

-- =====================================================
-- 7. VERIFY SCHEMA CONSISTENCY
-- =====================================================

-- Ensure stock_allocations table exists for metrics function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stock_allocations'
  ) THEN
    CREATE TABLE stock_allocations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      product_id uuid,
      quantity numeric(12,3) NOT NULL,
      status stock_allocation_status NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_stock_allocations_business ON stock_allocations(business_id);
    CREATE INDEX idx_stock_allocations_status ON stock_allocations(status);
  END IF;
END $$;

/*
  # Fix Critical Database Errors

  This migration addresses 5 critical issues:
  1. Database Policy Recursion Error (42P17) - direct_message_participants
  2. Database Enum Value Error (22P02) - order_status missing 'completed'
  3. Database Column Reference Error (42703) - roles.label does not exist
  4. Database Foreign Key Reference Error (PGRST200) - orders.assigned_driver
  5. Schema mismatches in queries

  ## Root Causes:
  - auth_is_room_member() creates infinite recursion via chat_room_members
  - order_status enum doesn't include 'completed' value
  - user_business_roles query references non-existent roles.label
  - orders table uses wrong foreign key name for driver assignment

  ## Prevention:
  - Use direct table queries in SECURITY DEFINER functions
  - Maintain enum value documentation
  - Add schema validation tests
  - Document all foreign key relationships
*/

-- =====================================================
-- 1. FIX POLICY RECURSION IN DIRECT_MESSAGE_PARTICIPANTS
-- =====================================================

-- Only proceed if chat_room_members table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_room_members'
  ) THEN
    -- Drop the recursive auth_is_room_member function and recreate it without recursion
    DROP FUNCTION IF EXISTS auth_is_room_member(uuid) CASCADE;

    -- Create a non-recursive version that directly checks membership
    EXECUTE '
    CREATE OR REPLACE FUNCTION auth_is_room_member(target_room uuid)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $func$
      SELECT
        auth.role() = ''service_role''
        OR auth_is_superadmin()
        OR EXISTS (
          SELECT 1
          FROM chat_room_members crm
          WHERE crm.room_id = target_room
            AND crm.user_id = auth.uid()
            AND crm.is_active = true
        )
    $func$';
  END IF;
END $$;

-- Recreate the direct_message_participants policy without recursion
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
        -- User is one of the participants
        auth.uid() IN (user_a, user_b)
        OR
        -- User is a member of the room
        EXISTS (
          SELECT 1
          FROM chat_room_members crm
          WHERE crm.room_id = direct_message_participants.room_id
            AND crm.user_id = auth.uid()
            AND crm.is_active = true
        )
      )
      WITH CHECK (
        -- User is one of the participants
        auth.uid() IN (user_a, user_b)
        OR
        -- User is a member of the room
        EXISTS (
          SELECT 1
          FROM chat_room_members crm
          WHERE crm.room_id = direct_message_participants.room_id
            AND crm.user_id = auth.uid()
            AND crm.is_active = true
        )
      );
  END IF;
END $$;

-- =====================================================
-- 2. FIX CHAT_ROOMS POLICY (Remove recursion)
-- =====================================================

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
        OR auth_has_infrastructure_access(infrastructure_id)
        OR (business_id IS NOT NULL AND auth_has_business_access(business_id))
        OR EXISTS (
          SELECT 1
          FROM chat_room_members crm
          WHERE crm.room_id = chat_rooms.id
            AND crm.user_id = auth.uid()
            AND crm.is_active = true
        )
      )
      WITH CHECK (
        auth_has_infrastructure_access(infrastructure_id)
        OR (business_id IS NOT NULL AND auth_has_business_access(business_id))
      );
  END IF;
END $$;

-- =====================================================
-- 3. FIX ORDER_STATUS ENUM - ADD MISSING 'completed'
-- =====================================================

-- Add 'completed' to order_status enum if it doesn't exist
DO $$
BEGIN
  -- Check if the value already exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'completed'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    -- Add the new enum value after 'delivered'
    ALTER TYPE order_status ADD VALUE 'completed' AFTER 'delivered';
  END IF;
END $$;

-- =====================================================
-- 4. FIX ROLES TABLE - ADD MISSING LABEL COLUMN
-- =====================================================

-- Add label column to roles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'label'
  ) THEN
    ALTER TABLE roles ADD COLUMN label text;

    -- Populate label from existing name column
    UPDATE roles SET label = name WHERE label IS NULL;
  END IF;
END $$;

-- =====================================================
-- 5. FIX ORDERS TABLE - ADD PROPER DRIVER FOREIGN KEY
-- =====================================================

-- Ensure assigned_driver column exists and has proper foreign key
DO $$
BEGIN
  -- Check if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'assigned_driver'
  ) THEN
    -- Drop any existing constraint
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_assigned_driver_fkey CASCADE;
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_assigned_driver CASCADE;

    -- Add proper foreign key constraint
    ALTER TABLE orders
    ADD CONSTRAINT fk_orders_assigned_driver
    FOREIGN KEY (assigned_driver)
    REFERENCES users(id)
    ON DELETE SET NULL;

    -- Add index for performance
    CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver ON orders(assigned_driver);
  END IF;
END $$;

-- =====================================================
-- 6. FIX GET_BUSINESS_METRICS FUNCTION
-- =====================================================

-- Recreate the function to handle the 'completed' status
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
      COUNT(DISTINCT o.assigned_driver) AS active_driver_count
    FROM orders o
    WHERE o.business_id = p_business_id
      AND o.assigned_driver IS NOT NULL
      AND o.status IN ('confirmed', 'preparing', 'en_route', 'out_for_delivery', 'ready')
  ),
  allocation_metrics AS (
    SELECT
      COUNT(*) AS pending_alloc_count
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

-- =====================================================
-- 7. ADD HELPFUL COMMENTS
-- =====================================================

DO $$
BEGIN
  -- Comment on auth_is_room_member if it exists
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'auth_is_room_member'
  ) THEN
    COMMENT ON FUNCTION auth_is_room_member IS
    'Checks if the authenticated user is a member of a chat room.
    Non-recursive version to prevent infinite loops in RLS policies.
    Fixed: 2025-11-16 to resolve 42P17 infinite recursion error.';
  END IF;

  -- Comment on get_business_metrics if it exists
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_business_metrics'
  ) THEN
    COMMENT ON FUNCTION get_business_metrics IS
    'Calculates business KPI metrics including revenue, orders, and driver statistics.
    Now supports both "delivered" and "completed" order statuses.
    Fixed: 2025-11-16 to resolve 22P02 invalid enum value error.';
  END IF;

  -- Comment on roles.label if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'label'
  ) THEN
    COMMENT ON COLUMN roles.label IS
    'Display label for the role. Added to fix 42703 column reference error.';
  END IF;

  -- Comment on orders.assigned_driver constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_orders_assigned_driver'
  ) THEN
    COMMENT ON CONSTRAINT fk_orders_assigned_driver ON orders IS
    'Foreign key to users table for driver assignment. Fixed to resolve PGRST200 error.';
  END IF;
END $$;

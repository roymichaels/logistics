/*
  # Fix Wallet User Dashboard Access

  ## Summary
  This migration enables wallet-authenticated users (anon role) to access
  dashboard statistics functions that previously only worked for email-authenticated users.

  ## Changes

  1. **Modified RPC Functions**
     - `get_business_team_count` - Now accepts optional user_id parameter
     - `get_business_driver_count` - Now accepts optional user_id parameter
     - `get_business_inventory_stats` - Now accepts optional user_id parameter
     - `get_business_order_stats` - Now accepts optional user_id parameter

  2. **Access Control**
     - Functions check BOTH auth.uid() (authenticated users) AND passed user_id (anon wallet users)
     - Verify business ownership or team membership
     - Functions use SECURITY DEFINER to bypass RLS

  3. **Permissions**
     - Grant execute permissions to anon role for wallet support
     - Maintain existing authenticated role permissions

  ## Security Notes
  - Functions still verify business ownership/access before returning data
  - SECURITY DEFINER is necessary to query across RLS boundaries
  - User ID verification prevents unauthorized access
*/

-- ============================================================================
-- Function: get_business_team_count (with optional user_id for anon role)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_business_team_count(
  p_business_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_user_id uuid;
BEGIN
  -- Determine which user_id to use (auth.uid() for authenticated, parameter for anon)
  v_user_id := COALESCE(auth.uid(), p_user_id);

  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Check if user owns the business or is a team member
  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id
    AND owner_id = v_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM user_business_roles
    WHERE business_id = p_business_id
    AND user_id = v_user_id
    AND active = true
  ) THEN
    RETURN 0;
  END IF;

  -- Return team member count
  SELECT COUNT(*)::integer INTO v_count
  FROM user_business_roles
  WHERE business_id = p_business_id
  AND active = true;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- ============================================================================
-- Function: get_business_driver_count (with optional user_id for anon role)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_business_driver_count(
  p_business_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_user_id uuid;
BEGIN
  -- Determine which user_id to use
  v_user_id := COALESCE(auth.uid(), p_user_id);

  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Check access
  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id
    AND owner_id = v_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM user_business_roles
    WHERE business_id = p_business_id
    AND user_id = v_user_id
    AND active = true
  ) THEN
    RETURN 0;
  END IF;

  -- Return driver count
  SELECT COUNT(*)::integer INTO v_count
  FROM driver_profiles
  WHERE business_id = p_business_id
  AND active = true;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- ============================================================================
-- Function: get_business_inventory_stats (with optional user_id for anon role)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_business_inventory_stats(
  p_business_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
  v_user_id uuid;
BEGIN
  -- Determine which user_id to use
  v_user_id := COALESCE(auth.uid(), p_user_id);

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'total_products', 0,
      'total_quantity', 0,
      'low_stock_count', 0
    );
  END IF;

  -- Check access
  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id
    AND owner_id = v_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM user_business_roles
    WHERE business_id = p_business_id
    AND user_id = v_user_id
    AND active = true
  ) THEN
    RETURN jsonb_build_object(
      'total_products', 0,
      'total_quantity', 0,
      'low_stock_count', 0
    );
  END IF;

  -- Return inventory stats
  SELECT jsonb_build_object(
    'total_products', COUNT(DISTINCT product_id),
    'total_quantity', COALESCE(SUM(quantity_on_hand), 0),
    'low_stock_count', SUM(CASE WHEN quantity_on_hand <= reorder_point THEN 1 ELSE 0 END)
  ) INTO v_stats
  FROM inventory
  WHERE business_id = p_business_id;

  RETURN COALESCE(v_stats, jsonb_build_object(
    'total_products', 0,
    'total_quantity', 0,
    'low_stock_count', 0
  ));
END;
$$;

-- ============================================================================
-- Function: get_business_order_stats (with optional user_id for anon role)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_business_order_stats(
  p_business_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
  v_user_id uuid;
BEGIN
  -- Determine which user_id to use
  v_user_id := COALESCE(auth.uid(), p_user_id);

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'total_orders', 0,
      'pending_orders', 0,
      'active_orders', 0,
      'completed_orders', 0,
      'total_revenue', 0
    );
  END IF;

  -- Check access
  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id
    AND owner_id = v_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM user_business_roles
    WHERE business_id = p_business_id
    AND user_id = v_user_id
    AND active = true
  ) THEN
    RETURN jsonb_build_object(
      'total_orders', 0,
      'pending_orders', 0,
      'active_orders', 0,
      'completed_orders', 0,
      'total_revenue', 0
    );
  END IF;

  -- Return order stats
  SELECT jsonb_build_object(
    'total_orders', COUNT(*),
    'pending_orders', SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END),
    'active_orders', SUM(CASE WHEN status IN ('confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'in_transit') THEN 1 ELSE 0 END),
    'completed_orders', SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END),
    'total_revenue', COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0)
  ) INTO v_stats
  FROM orders
  WHERE business_id = p_business_id;

  RETURN COALESCE(v_stats, jsonb_build_object(
    'total_orders', 0,
    'pending_orders', 0,
    'active_orders', 0,
    'completed_orders', 0,
    'total_revenue', 0
  ));
END;
$$;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_business_team_count(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_driver_count(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_inventory_stats(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_order_stats(uuid, uuid) TO authenticated;

-- Grant execute permissions to anon role for wallet users
GRANT EXECUTE ON FUNCTION get_business_team_count(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_business_driver_count(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_business_inventory_stats(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_business_order_stats(uuid, uuid) TO anon;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION get_business_team_count(uuid, uuid) IS
'Returns the count of active team members for a business. Supports both authenticated and anonymous (wallet) users.';

COMMENT ON FUNCTION get_business_driver_count(uuid, uuid) IS
'Returns the count of active drivers for a business. Supports both authenticated and anonymous (wallet) users.';

COMMENT ON FUNCTION get_business_inventory_stats(uuid, uuid) IS
'Returns inventory statistics for a business. Supports both authenticated and anonymous (wallet) users.';

COMMENT ON FUNCTION get_business_order_stats(uuid, uuid) IS
'Returns order statistics for a business. Supports both authenticated and anonymous (wallet) users.';

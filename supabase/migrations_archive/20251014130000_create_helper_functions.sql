/*
  # Database Helper Functions

  1. New Functions
    - `get_business_metrics` - Returns comprehensive business metrics
    - `get_infrastructure_overview` - Returns system-wide overview
    - `get_user_active_roles` - Returns all active roles for a user
    - `get_inventory_chain` - Traces inventory movement chain
    - `validate_allocation_request` - Validates stock allocation feasibility
    - `get_audit_trail` - Returns audit trail for specific entity

  2. Performance
    - All functions use efficient queries with proper indexing
    - Results are cacheable where appropriate
    - Minimal database roundtrips
*/

-- Business metrics function
CREATE OR REPLACE FUNCTION get_business_metrics(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_revenue', COALESCE(SUM(CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN o.total_price ELSE 0 END), 0),
    'total_orders', COUNT(o.id),
    'active_drivers', (
      SELECT COUNT(DISTINCT user_id)
      FROM user_business_roles
      WHERE business_id = p_business_id
        AND role = 'driver'
        AND effective_to IS NULL
    ),
    'pending_allocations', (
      SELECT COUNT(*)
      FROM stock_allocations
      WHERE business_id = p_business_id
        AND status = 'pending'
    ),
    'orders_today', COUNT(CASE WHEN o.created_at >= CURRENT_DATE THEN 1 END),
    'orders_this_month', COUNT(CASE WHEN o.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END),
    'average_order_value', COALESCE(AVG(o.total_price), 0)
  ) INTO v_result
  FROM orders o
  WHERE o.business_id = p_business_id
    AND o.created_at >= CURRENT_DATE - INTERVAL '30 days';

  RETURN v_result;
END;
$$;

-- Infrastructure overview function
CREATE OR REPLACE FUNCTION get_infrastructure_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_businesses', (SELECT COUNT(*) FROM businesses WHERE active = true),
    'total_users', (SELECT COUNT(*) FROM users WHERE status = 'active'),
    'total_warehouses', (SELECT COUNT(*) FROM warehouses WHERE is_active = true),
    'total_inventory_value', COALESCE((
      SELECT SUM(im.quantity * p.price)
      FROM inventory_movements im
      JOIN products p ON p.id = im.product_id
      WHERE im.movement_type = 'in'
    ), 0),
    'active_orders_count', (SELECT COUNT(*) FROM orders WHERE status IN ('pending', 'processing', 'in_transit')),
    'total_drivers', (
      SELECT COUNT(DISTINCT user_id)
      FROM user_business_roles
      WHERE role = 'driver'
        AND effective_to IS NULL
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Get user active roles function
CREATE OR REPLACE FUNCTION get_user_active_roles(p_user_id uuid)
RETURNS TABLE (
  business_id uuid,
  business_name text,
  role text,
  assigned_at timestamptz,
  permissions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ubr.business_id,
    b.name as business_name,
    ubr.role,
    ubr.created_at as assigned_at,
    COALESCE(
      (
        SELECT jsonb_agg(p.name)
        FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role = ubr.role
      ),
      '[]'::jsonb
    ) as permissions
  FROM user_business_roles ubr
  JOIN businesses b ON b.id = ubr.business_id
  WHERE ubr.user_id = p_user_id
    AND ubr.effective_to IS NULL
  ORDER BY ubr.created_at DESC;
END;
$$;

-- Get inventory chain function
CREATE OR REPLACE FUNCTION get_inventory_chain(p_product_id uuid, p_limit int DEFAULT 50)
RETURNS TABLE (
  movement_id uuid,
  movement_type text,
  quantity numeric,
  from_location text,
  to_location text,
  performed_by uuid,
  performed_at timestamptz,
  business_id uuid,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    im.id as movement_id,
    im.movement_type,
    im.quantity,
    im.from_location,
    im.to_location,
    im.performed_by,
    im.created_at as performed_at,
    im.business_id,
    im.notes
  FROM inventory_movements im
  WHERE im.product_id = p_product_id
  ORDER BY im.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Validate allocation request function
CREATE OR REPLACE FUNCTION validate_allocation_request(
  p_product_id uuid,
  p_quantity numeric,
  p_warehouse_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available numeric;
  v_result jsonb;
BEGIN
  -- Calculate available stock
  SELECT COALESCE(SUM(
    CASE
      WHEN movement_type = 'in' THEN quantity
      WHEN movement_type = 'out' THEN -quantity
      ELSE 0
    END
  ), 0) INTO v_available
  FROM inventory_movements
  WHERE product_id = p_product_id
    AND (from_location = 'warehouse_' || p_warehouse_id::text
         OR to_location = 'warehouse_' || p_warehouse_id::text);

  -- Build result
  v_result := jsonb_build_object(
    'is_valid', v_available >= p_quantity,
    'available_quantity', v_available,
    'requested_quantity', p_quantity,
    'shortage', CASE WHEN v_available < p_quantity THEN p_quantity - v_available ELSE 0 END
  );

  RETURN v_result;
END;
$$;

-- Get audit trail function
CREATE OR REPLACE FUNCTION get_audit_trail(
  p_entity_type text,
  p_entity_id uuid,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  audit_id uuid,
  action text,
  performed_by uuid,
  performed_at timestamptz,
  details jsonb,
  ip_address text,
  user_agent text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sal.id as audit_id,
    sal.action,
    sal.user_id as performed_by,
    sal.timestamp as performed_at,
    sal.details,
    sal.ip_address,
    sal.user_agent
  FROM system_audit_log sal
  WHERE sal.entity_type = p_entity_type
    AND sal.entity_id = p_entity_id
  ORDER BY sal.timestamp DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_business_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_infrastructure_overview TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_roles TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_chain TO authenticated;
GRANT EXECUTE ON FUNCTION validate_allocation_request TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_trail TO authenticated;

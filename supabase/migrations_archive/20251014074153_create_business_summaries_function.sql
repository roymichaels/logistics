/*
  # Create get_business_summaries Function
  
  1. New Functions
    - `get_business_summaries` - Returns aggregated business metrics for infrastructure owner dashboard
      - Business name, active status
      - Total orders, revenue today
      - Active drivers, pending orders
  
  2. Security
    - SECURITY DEFINER to bypass RLS restrictions
    - Allows infrastructure_owner to view cross-business aggregated data
    - Returns meaningful fallback values when no data exists
*/

-- Create the get_business_summaries function
CREATE OR REPLACE FUNCTION get_business_summaries()
RETURNS TABLE (
  id uuid,
  name text,
  active boolean,
  total_orders bigint,
  revenue_today numeric,
  active_drivers bigint,
  pending_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.active,
    -- Total orders for this business
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM orders o
      WHERE o.business_id = b.id
    ), 0) as total_orders,
    -- Revenue today for this business
    COALESCE((
      SELECT SUM(o.total_amount)
      FROM orders o
      WHERE o.business_id = b.id
        AND o.created_at >= CURRENT_DATE
        AND o.status = 'delivered'
    ), 0) as revenue_today,
    -- Active drivers for this business
    COALESCE((
      SELECT COUNT(DISTINCT u.id)::bigint
      FROM users u
      WHERE u.business_id = b.id
        AND u.role IN ('driver', 'infrastructure_driver')
        AND u.status = 'active'
    ), 0) as active_drivers,
    -- Pending orders for this business
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM orders o
      WHERE o.business_id = b.id
        AND o.status IN ('pending', 'assigned', 'enroute')
    ), 0) as pending_orders
  FROM businesses b
  ORDER BY b.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_business_summaries TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_business_summaries IS 'Returns aggregated business metrics for infrastructure owner dashboard';

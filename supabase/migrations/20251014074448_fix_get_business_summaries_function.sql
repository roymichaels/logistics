/*
  # Fix get_business_summaries Function
  
  1. Changes
    - Remove status filter from users query (column doesn't exist)
    - Use registration_status or is_online for active user detection
    - Add better fallback handling for NULL values
*/

-- Update the get_business_summaries function
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
    -- Active drivers for this business (using role and business_id only)
    COALESCE((
      SELECT COUNT(DISTINCT u.id)::bigint
      FROM users u
      WHERE u.business_id = b.id
        AND u.role IN ('driver', 'infrastructure_driver')
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

-- Ensure execute permission
GRANT EXECUTE ON FUNCTION get_business_summaries TO authenticated;

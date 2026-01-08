/*
  # Fix Dashboard Query Issues

  ## Changes

  1. Create helper views for easier querying
     - `business_team_members` - All team members for a business
     - `business_drivers` - All drivers for a business
     - `business_inventory_summary` - Inventory counts by business

  2. Add database functions
     - `get_business_team_count` - Count team members
     - `get_business_driver_count` - Count drivers
     - `get_business_inventory_stats` - Get inventory statistics
     - `get_business_order_stats` - Get order statistics

  3. Security
     - Views use RLS from underlying tables
     - Functions check business ownership/access
*/

-- Drop existing views if they exist
DROP VIEW IF EXISTS business_team_members CASCADE;
DROP VIEW IF EXISTS business_drivers CASCADE;
DROP VIEW IF EXISTS business_inventory_summary CASCADE;

-- Create view for business team members
CREATE VIEW business_team_members AS
SELECT
  ubr.business_id,
  ubr.user_id,
  p.name,
  p.email,
  p.phone,
  p.avatar_url,
  ubr.role,
  ubr.active,
  ubr.created_at
FROM user_business_roles ubr
JOIN profiles p ON p.id = ubr.user_id
WHERE ubr.active = true;

-- Create view for business drivers (driver_profiles has TEXT id)
CREATE VIEW business_drivers AS
SELECT
  dp.id,
  dp.business_id,
  CAST(dp.id AS uuid) as user_id,
  p.name,
  p.email,
  p.phone,
  dp.vehicle_type,
  dp.vehicle_plate,
  dp.rating,
  dp.total_deliveries,
  dp.active,
  ds.status,
  ds.current_zone_id,
  dp.created_at,
  dp.updated_at
FROM driver_profiles dp
LEFT JOIN profiles p ON p.id = CAST(dp.id AS uuid)
LEFT JOIN driver_status ds ON ds.driver_id = dp.id
WHERE dp.active = true;

-- Create view for inventory summary
CREATE VIEW business_inventory_summary AS
SELECT
  i.business_id,
  COUNT(DISTINCT i.product_id) as total_products,
  COUNT(DISTINCT i.location_id) as total_locations,
  SUM(i.quantity_on_hand) as total_quantity,
  SUM(CASE WHEN i.quantity_on_hand <= i.reorder_point THEN 1 ELSE 0 END) as low_stock_count
FROM inventory i
GROUP BY i.business_id;

-- Function to get team member count for a business
CREATE OR REPLACE FUNCTION get_business_team_count(p_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Check access
  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id
    AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM user_business_roles
    WHERE business_id = p_business_id
    AND user_id = auth.uid()
    AND active = true
  ) THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::integer INTO v_count
  FROM user_business_roles
  WHERE business_id = p_business_id
  AND active = true;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to get driver count for a business
CREATE OR REPLACE FUNCTION get_business_driver_count(p_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Check access
  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id
    AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM user_business_roles
    WHERE business_id = p_business_id
    AND user_id = auth.uid()
    AND active = true
  ) THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::integer INTO v_count
  FROM driver_profiles
  WHERE business_id = p_business_id
  AND active = true;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to get inventory statistics for a business
CREATE OR REPLACE FUNCTION get_business_inventory_stats(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  -- Check access
  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id
    AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM user_business_roles
    WHERE business_id = p_business_id
    AND user_id = auth.uid()
    AND active = true
  ) THEN
    RETURN jsonb_build_object(
      'total_products', 0,
      'total_quantity', 0,
      'low_stock_count', 0
    );
  END IF;

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

-- Function to get order statistics for a business
CREATE OR REPLACE FUNCTION get_business_order_stats(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  -- Check access
  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id
    AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM user_business_roles
    WHERE business_id = p_business_id
    AND user_id = auth.uid()
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_business_roles_business_id ON user_business_roles(business_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_user_business_roles_user_id ON user_business_roles(user_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_driver_profiles_business_id ON driver_profiles(business_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_business_id ON inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_business_id_status ON orders(business_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_business_id_created_at ON orders(business_id, created_at DESC);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_business_team_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_driver_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_inventory_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_order_stats(uuid) TO authenticated;

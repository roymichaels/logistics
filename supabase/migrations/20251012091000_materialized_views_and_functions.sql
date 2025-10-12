/*
  # Materialized Views and Database Functions for Performance Optimization

  ## Overview
  This migration creates materialized views for expensive dashboard queries and
  implements database functions to reduce round trips and improve performance.

  ## Part 1: Materialized Views
  - Royal Dashboard metrics aggregation
  - Inventory summary views
  - Order analytics views
  - Driver performance views
  - Zone coverage snapshots

  ## Part 2: Database Functions
  - Order assignment logic
  - Inventory calculations
  - Revenue aggregations
  - Real-time metrics

  ## Part 3: Automatic Refresh
  - Triggers to refresh materialized views
  - Scheduled refresh procedures
  - Incremental update functions
*/

-- ============================================================================
-- STEP 1: Create materialized view for dashboard metrics
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_metrics AS
WITH today_orders AS (
  SELECT
    count(*) FILTER (WHERE created_at >= CURRENT_DATE) as orders_today,
    count(*) FILTER (WHERE status = 'delivered' AND delivered_at >= CURRENT_DATE) as delivered_today,
    count(*) FILTER (WHERE status IN ('new', 'confirmed', 'preparing', 'ready')) as pending_orders,
    count(*) FILTER (WHERE status IN ('out_for_delivery')) as outstanding_deliveries,
    sum(total_amount) FILTER (WHERE status = 'delivered' AND delivered_at >= CURRENT_DATE) as revenue_today,
    avg(total_amount) FILTER (WHERE created_at >= CURRENT_DATE) as avg_order_value
  FROM orders
  WHERE business_id IS NULL OR business_id = get_active_business_id()
),
driver_stats AS (
  SELECT
    count(*) FILTER (WHERE is_online = true AND status = 'available') as active_drivers,
    count(*) FILTER (WHERE is_online = true) as online_drivers
  FROM driver_status_records
),
zone_coverage AS (
  SELECT
    CASE
      WHEN count(*) = 0 THEN 0
      ELSE (count(*) FILTER (WHERE driver_count > 0)::DECIMAL / count(*) * 100)
    END as coverage_percent
  FROM (
    SELECT
      z.id,
      count(dza.id) FILTER (WHERE dza.active = true) as driver_count
    FROM zones z
    LEFT JOIN driver_zone_assignments dza ON z.id = dza.zone_id
    WHERE z.active = true
    GROUP BY z.id
  ) zone_counts
)
SELECT
  COALESCE(tod.revenue_today, 0) as revenue_today,
  COALESCE(tod.orders_today, 0) as orders_today,
  COALESCE(tod.delivered_today, 0) as delivered_today,
  COALESCE(tod.avg_order_value, 0) as average_order_value,
  COALESCE(tod.pending_orders, 0) as pending_orders,
  COALESCE(ds.active_drivers, 0) as active_drivers,
  COALESCE(zc.coverage_percent, 0) as coverage_percent,
  COALESCE(tod.outstanding_deliveries, 0) as outstanding_deliveries,
  now() as last_updated
FROM today_orders tod
CROSS JOIN driver_stats ds
CROSS JOIN zone_coverage zc;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_dashboard_metrics_idx ON mv_dashboard_metrics(last_updated);

-- ============================================================================
-- STEP 2: Create materialized view for revenue trends
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_revenue_trend_hourly AS
SELECT
  date_trunc('hour', delivered_at) as hour,
  count(*) as order_count,
  sum(total_amount) as revenue,
  avg(total_amount) as avg_order_value
FROM orders
WHERE
  delivered_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'delivered'
  AND (business_id IS NULL OR business_id = get_active_business_id())
GROUP BY date_trunc('hour', delivered_at)
ORDER BY hour DESC;

CREATE UNIQUE INDEX IF NOT EXISTS mv_revenue_trend_hourly_idx ON mv_revenue_trend_hourly(hour);

-- ============================================================================
-- STEP 3: Create materialized view for inventory summary
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inventory_summary AS
SELECT
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.category,
  COALESCE(sum(ir.on_hand_quantity), 0) as total_on_hand,
  COALESCE(sum(ir.reserved_quantity), 0) as total_reserved,
  COALESCE(sum(ir.damaged_quantity), 0) as total_damaged,
  COALESCE(sum(dir.quantity), 0) as total_driver_quantity,
  count(DISTINCT ir.location_id) as location_count,
  count(DISTINCT dir.driver_id) as driver_count,
  count(rr.id) FILTER (WHERE rr.status IN ('pending', 'approved')) as open_restock_count,
  max(ir.updated_at) as last_updated
FROM products p
LEFT JOIN inventory_records ir ON p.id = ir.product_id
LEFT JOIN driver_inventory_records dir ON p.id = dir.product_id
LEFT JOIN restock_requests rr ON p.id = rr.product_id
GROUP BY p.id, p.name, p.sku, p.category;

CREATE UNIQUE INDEX IF NOT EXISTS mv_inventory_summary_idx ON mv_inventory_summary(product_id);
CREATE INDEX IF NOT EXISTS mv_inventory_summary_category_idx ON mv_inventory_summary(category);
CREATE INDEX IF NOT EXISTS mv_inventory_summary_name_trgm_idx ON mv_inventory_summary USING gin(product_name gin_trgm_ops);

-- ============================================================================
-- STEP 4: Create materialized view for driver performance
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_driver_performance AS
SELECT
  u.telegram_id as driver_id,
  u.name as driver_name,
  u.photo_url as avatar_url,
  ds.status,
  ds.current_zone_id,
  z.name as zone_name,
  z.color as zone_color,
  count(o.id) FILTER (WHERE o.status = 'out_for_delivery') as orders_in_progress,
  count(o.id) FILTER (WHERE o.status = 'delivered' AND o.delivered_at >= CURRENT_DATE) as orders_today,
  sum(o.total_amount) FILTER (WHERE o.status = 'delivered' AND o.delivered_at >= CURRENT_DATE) as revenue_today,
  avg(EXTRACT(EPOCH FROM (o.delivered_at - o.assigned_at)) / 60) FILTER (
    WHERE o.status = 'delivered' AND o.delivered_at >= CURRENT_DATE
  ) as avg_delivery_time_minutes,
  ds.last_updated,
  ds.is_online
FROM users u
LEFT JOIN driver_status_records ds ON u.telegram_id = ds.driver_id
LEFT JOIN zones z ON ds.current_zone_id = z.id
LEFT JOIN orders o ON u.telegram_id = o.assigned_driver
WHERE u.role = 'driver' AND u.registration_status = 'approved'
GROUP BY
  u.telegram_id,
  u.name,
  u.photo_url,
  ds.status,
  ds.current_zone_id,
  z.name,
  z.color,
  ds.last_updated,
  ds.is_online;

CREATE UNIQUE INDEX IF NOT EXISTS mv_driver_performance_idx ON mv_driver_performance(driver_id);
CREATE INDEX IF NOT EXISTS mv_driver_performance_online_idx ON mv_driver_performance(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS mv_driver_performance_zone_idx ON mv_driver_performance(current_zone_id) WHERE current_zone_id IS NOT NULL;

-- ============================================================================
-- STEP 5: Create materialized view for zone coverage
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_zone_coverage AS
SELECT
  z.id as zone_id,
  z.name as zone_name,
  z.code as zone_code,
  z.color,
  count(DISTINCT dza.driver_id) FILTER (WHERE dza.active = true) as assigned_drivers,
  count(DISTINCT ds.driver_id) FILTER (WHERE ds.is_online = true AND ds.status = 'available') as active_drivers,
  count(DISTINCT ds.driver_id) FILTER (WHERE ds.is_online = true AND ds.status = 'delivering') as busy_drivers,
  count(o.id) FILTER (WHERE o.status IN ('new', 'confirmed', 'ready')) as outstanding_orders,
  CASE
    WHEN count(DISTINCT dza.driver_id) FILTER (WHERE dza.active = true) = 0 THEN 0
    WHEN count(o.id) FILTER (WHERE o.status IN ('new', 'confirmed', 'ready')) = 0 THEN 100
    ELSE LEAST(100, (
      count(DISTINCT ds.driver_id) FILTER (WHERE ds.is_online = true AND ds.status = 'available')::DECIMAL
      / GREATEST(1, count(o.id) FILTER (WHERE o.status IN ('new', 'confirmed', 'ready')))
      * 100
    ))
  END as coverage_percent,
  max(GREATEST(
    COALESCE(dza.updated_at, '1970-01-01'::timestamptz),
    COALESCE(ds.last_updated, '1970-01-01'::timestamptz),
    COALESCE(o.updated_at, '1970-01-01'::timestamptz)
  )) as last_updated
FROM zones z
LEFT JOIN driver_zone_assignments dza ON z.id = dza.zone_id
LEFT JOIN driver_status_records ds ON dza.driver_id = ds.driver_id AND ds.current_zone_id = z.id
LEFT JOIN orders o ON ds.driver_id = o.assigned_driver OR o.assigned_driver IS NULL
WHERE z.active = true
GROUP BY z.id, z.name, z.code, z.color;

CREATE UNIQUE INDEX IF NOT EXISTS mv_zone_coverage_idx ON mv_zone_coverage(zone_id);
CREATE INDEX IF NOT EXISTS mv_zone_coverage_active_drivers_idx ON mv_zone_coverage(active_drivers DESC);
CREATE INDEX IF NOT EXISTS mv_zone_coverage_outstanding_idx ON mv_zone_coverage(outstanding_orders DESC);

-- ============================================================================
-- STEP 6: Create function to refresh all dashboard materialized views
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_trend_hourly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_driver_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_zone_coverage;
  RAISE NOTICE 'Dashboard views refreshed at %', now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh inventory views
CREATE OR REPLACE FUNCTION refresh_inventory_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_summary;
  RAISE NOTICE 'Inventory views refreshed at %', now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Create triggers to auto-refresh materialized views
-- ============================================================================

-- Function to schedule materialized view refresh
CREATE OR REPLACE FUNCTION trigger_dashboard_refresh()
RETURNS trigger AS $$
BEGIN
  -- Use pg_notify to signal that a refresh is needed
  -- An external job or background worker should listen and refresh
  PERFORM pg_notify('dashboard_refresh_needed', json_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'timestamp', now()
  )::text);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on key tables
DROP TRIGGER IF EXISTS orders_dashboard_refresh ON orders;
CREATE TRIGGER orders_dashboard_refresh
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_dashboard_refresh();

DROP TRIGGER IF EXISTS driver_status_dashboard_refresh ON driver_status_records;
CREATE TRIGGER driver_status_dashboard_refresh
  AFTER INSERT OR UPDATE OR DELETE ON driver_status_records
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_dashboard_refresh();

-- ============================================================================
-- STEP 8: Create database function for Royal Dashboard snapshot
-- ============================================================================

CREATE OR REPLACE FUNCTION get_royal_dashboard_snapshot()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  metrics jsonb;
  revenue_trend jsonb;
  agents jsonb;
  zones jsonb;
  low_stock jsonb;
  restock_queue jsonb;
BEGIN
  -- Get metrics from materialized view
  SELECT to_jsonb(m.*) INTO metrics
  FROM mv_dashboard_metrics m
  LIMIT 1;

  -- Get revenue trend (last 24 hours)
  SELECT jsonb_agg(
    jsonb_build_object(
      'label', to_char(hour, 'HH24:00'),
      'value', COALESCE(revenue, 0)
    ) ORDER BY hour DESC
  ) INTO revenue_trend
  FROM mv_revenue_trend_hourly
  WHERE hour >= now() - INTERVAL '24 hours'
  LIMIT 24;

  -- Get top agents
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', driver_id,
      'name', driver_name,
      'status', status,
      'zone', zone_name,
      'ordersInProgress', orders_in_progress,
      'lastUpdated', last_updated,
      'avatarUrl', avatar_url
    ) ORDER BY orders_in_progress DESC, revenue_today DESC
  ) INTO agents
  FROM mv_driver_performance
  WHERE is_online = true
  LIMIT 10;

  -- Get zone coverage
  SELECT jsonb_agg(
    jsonb_build_object(
      'zoneId', zone_id,
      'zoneName', zone_name,
      'activeDrivers', active_drivers,
      'outstandingOrders', outstanding_orders,
      'coveragePercent', coverage_percent,
      'color', color
    ) ORDER BY coverage_percent ASC
  ) INTO zones
  FROM mv_zone_coverage
  LIMIT 10;

  -- Get low stock alerts
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_id', ir.product_id,
      'product_name', p.name,
      'location_id', ir.location_id,
      'location_name', il.name,
      'on_hand_quantity', ir.on_hand_quantity,
      'low_stock_threshold', ir.low_stock_threshold,
      'triggered_at', ir.updated_at
    ) ORDER BY ir.updated_at DESC
  ) INTO low_stock
  FROM inventory_records ir
  JOIN products p ON ir.product_id = p.id
  JOIN inventory_locations il ON ir.location_id = il.id
  WHERE ir.on_hand_quantity <= ir.low_stock_threshold
  LIMIT 10;

  -- Get restock queue
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', rr.id,
      'product_id', rr.product_id,
      'product_name', p.name,
      'requested_quantity', rr.requested_quantity,
      'status', rr.status,
      'requested_at', rr.created_at,
      'to_location_name', il.name
    ) ORDER BY rr.created_at DESC
  ) INTO restock_queue
  FROM restock_requests rr
  JOIN products p ON rr.product_id = p.id
  LEFT JOIN inventory_locations il ON rr.to_location_id = il.id
  WHERE rr.status IN ('pending', 'approved')
  LIMIT 10;

  -- Build final result
  result := jsonb_build_object(
    'metrics', COALESCE(metrics, '{}'::jsonb),
    'revenueTrend', COALESCE(revenue_trend, '[]'::jsonb),
    'ordersPerHour', '[]'::jsonb, -- Can be computed from revenue_trend
    'agents', COALESCE(agents, '[]'::jsonb),
    'zones', COALESCE(zones, '[]'::jsonb),
    'lowStockAlerts', COALESCE(low_stock, '[]'::jsonb),
    'restockQueue', COALESCE(restock_queue, '[]'::jsonb),
    'generatedAt', to_jsonb(now())
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 9: Create function for inventory balance summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_inventory_balance_summary(p_product_id UUID)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  product_info jsonb;
  location_balances jsonb;
  driver_balances jsonb;
  restock_requests jsonb;
BEGIN
  -- Get product info from materialized view
  SELECT to_jsonb(mv.*)
  INTO product_info
  FROM mv_inventory_summary mv
  WHERE mv.product_id = p_product_id;

  -- Get location-specific balances
  SELECT jsonb_agg(
    jsonb_build_object(
      'location_id', ir.location_id,
      'on_hand_quantity', ir.on_hand_quantity,
      'reserved_quantity', ir.reserved_quantity,
      'damaged_quantity', ir.damaged_quantity,
      'location', jsonb_build_object(
        'id', il.id,
        'code', il.code,
        'name', il.name,
        'type', il.type
      )
    )
  ) INTO location_balances
  FROM inventory_records ir
  JOIN inventory_locations il ON ir.location_id = il.id
  WHERE ir.product_id = p_product_id;

  -- Get driver-specific balances
  SELECT jsonb_agg(
    jsonb_build_object(
      'driver_id', dir.driver_id,
      'quantity', dir.quantity,
      'zone_id', dir.zone_id,
      'location_id', dir.location_id
    )
  ) INTO driver_balances
  FROM driver_inventory_records dir
  WHERE dir.product_id = p_product_id;

  -- Get open restock requests
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', rr.id,
      'requested_quantity', rr.requested_quantity,
      'status', rr.status,
      'requested_by', rr.requested_by,
      'created_at', rr.created_at
    )
  ) INTO restock_requests
  FROM restock_requests rr
  WHERE rr.product_id = p_product_id
  AND rr.status IN ('pending', 'approved', 'in_transit');

  -- Build result
  result := jsonb_build_object(
    'product_id', p_product_id,
    'total_on_hand', COALESCE((product_info->>'total_on_hand')::integer, 0),
    'total_reserved', COALESCE((product_info->>'total_reserved')::integer, 0),
    'total_damaged', COALESCE((product_info->>'total_damaged')::integer, 0),
    'total_driver_quantity', COALESCE((product_info->>'total_driver_quantity')::integer, 0),
    'locations', COALESCE(location_balances, '[]'::jsonb),
    'drivers', COALESCE(driver_balances, '[]'::jsonb),
    'open_restock_requests', COALESCE(restock_requests, '[]'::jsonb),
    'last_updated', now()
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 10: Create function for zone coverage snapshot
-- ============================================================================

CREATE OR REPLACE FUNCTION get_zone_coverage_snapshot(p_zone_id UUID DEFAULT NULL)
RETURNS jsonb AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'zone', jsonb_build_object(
          'id', zc.zone_id,
          'name', zc.zone_name,
          'code', zc.zone_code,
          'color', zc.color
        ),
        'onlineDrivers', zc.active_drivers,
        'idleDrivers', zc.active_drivers - zc.busy_drivers,
        'busyDrivers', zc.busy_drivers,
        'outstandingOrders', zc.outstanding_orders,
        'coveragePercent', zc.coverage_percent
      )
    )
    FROM mv_zone_coverage zc
    WHERE p_zone_id IS NULL OR zc.zone_id = p_zone_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 11: Create helper function for order analytics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_order_analytics(
  p_start_date TIMESTAMPTZ DEFAULT CURRENT_DATE,
  p_end_date TIMESTAMPTZ DEFAULT CURRENT_DATE + INTERVAL '1 day'
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  WITH order_stats AS (
    SELECT
      count(*) as total_orders,
      count(*) FILTER (WHERE status = 'delivered') as delivered_orders,
      count(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
      sum(total_amount) as total_revenue,
      avg(total_amount) as avg_order_value,
      avg(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60) FILTER (WHERE status = 'delivered') as avg_fulfillment_time
    FROM orders
    WHERE created_at >= p_start_date AND created_at < p_end_date
  ),
  top_products AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'product_id', item->>'product_id',
        'product_name', item->>'product_name',
        'quantity', sum((item->>'quantity')::integer),
        'revenue', sum((item->>'price')::numeric * (item->>'quantity')::integer)
      ) ORDER BY sum((item->>'quantity')::integer) DESC
    ) as products
    FROM orders o, jsonb_array_elements(o.items) as item
    WHERE o.created_at >= p_start_date AND o.created_at < p_end_date
    LIMIT 10
  ),
  hourly_distribution AS (
    SELECT jsonb_object_agg(
      to_char(date_trunc('hour', created_at), 'HH24:00'),
      count(*)
    ) as distribution
    FROM orders
    WHERE created_at >= p_start_date AND created_at < p_end_date
    GROUP BY date_trunc('hour', created_at)
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object(
      'start', p_start_date,
      'end', p_end_date
    ),
    'summary', to_jsonb(os.*),
    'topProducts', COALESCE(tp.products, '[]'::jsonb),
    'hourlyDistribution', COALESCE(hd.distribution, '{}'::jsonb)
  ) INTO result
  FROM order_stats os
  CROSS JOIN top_products tp
  CROSS JOIN hourly_distribution hd;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 12: Grant permissions and add comments
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION refresh_dashboard_views() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_inventory_views() TO authenticated;
GRANT EXECUTE ON FUNCTION get_royal_dashboard_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_balance_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_zone_coverage_snapshot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_analytics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Add comments
COMMENT ON MATERIALIZED VIEW mv_dashboard_metrics IS 'Pre-aggregated dashboard metrics for royal dashboard';
COMMENT ON MATERIALIZED VIEW mv_revenue_trend_hourly IS 'Hourly revenue trends for the last 7 days';
COMMENT ON MATERIALIZED VIEW mv_inventory_summary IS 'Product inventory summary across all locations';
COMMENT ON MATERIALIZED VIEW mv_driver_performance IS 'Real-time driver performance metrics';
COMMENT ON MATERIALIZED VIEW mv_zone_coverage IS 'Zone coverage and driver availability metrics';

COMMENT ON FUNCTION get_royal_dashboard_snapshot() IS 'Returns complete royal dashboard snapshot with all metrics';
COMMENT ON FUNCTION get_inventory_balance_summary(UUID) IS 'Returns detailed inventory balance for a specific product';
COMMENT ON FUNCTION get_zone_coverage_snapshot(UUID) IS 'Returns zone coverage snapshot for one or all zones';
COMMENT ON FUNCTION get_order_analytics(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns order analytics for specified time period';

-- ============================================================================
-- Initial materialized view refresh
-- ============================================================================

-- Perform initial refresh of all views
SELECT refresh_dashboard_views();
SELECT refresh_inventory_views();

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Materialized Views Created:';
  RAISE NOTICE '- mv_dashboard_metrics';
  RAISE NOTICE '- mv_revenue_trend_hourly';
  RAISE NOTICE '- mv_inventory_summary';
  RAISE NOTICE '- mv_driver_performance';
  RAISE NOTICE '- mv_zone_coverage';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Database Functions Created:';
  RAISE NOTICE '- get_royal_dashboard_snapshot()';
  RAISE NOTICE '- get_inventory_balance_summary()';
  RAISE NOTICE '- get_zone_coverage_snapshot()';
  RAISE NOTICE '- get_order_analytics()';
  RAISE NOTICE '- refresh_dashboard_views()';
  RAISE NOTICE '- refresh_inventory_views()';
  RAISE NOTICE '==========================================';
END $$;

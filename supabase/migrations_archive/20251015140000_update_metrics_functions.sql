BEGIN;

SET search_path TO public;

CREATE OR REPLACE FUNCTION public.get_business_metrics(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_infrastructure_id uuid := public.current_infrastructure_id();
  v_result jsonb;
BEGIN
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'business id is required';
  END IF;

  WITH scoped_orders AS (
    SELECT
      o.total_amount,
      o.status,
      o.created_at,
      o.delivered_at
    FROM public.orders o
    WHERE o.business_id = p_business_id
      AND (v_infrastructure_id IS NULL OR o.infrastructure_id = v_infrastructure_id)
  ),
  order_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_at::date = CURRENT_DATE THEN total_amount ELSE 0 END), 0) AS revenue_today,
      COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_at >= DATE_TRUNC('month', CURRENT_DATE) THEN total_amount ELSE 0 END), 0) AS revenue_month,
      COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_at >= CURRENT_DATE - INTERVAL '30 days' THEN total_amount ELSE 0 END), 0) AS revenue_30_days,
      COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS orders_today,
      COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS orders_month,
      COUNT(*) FILTER (WHERE status IN ('confirmed','preparing','ready','out_for_delivery')) AS orders_in_progress,
      COUNT(*) FILTER (WHERE status = 'delivered') AS orders_delivered,
      COALESCE(AVG(total_amount) FILTER (WHERE status = 'delivered'), 0) AS average_order_value
    FROM scoped_orders
  ),
  driver_counts AS (
    SELECT COUNT(DISTINCT ubr.user_id) AS active_drivers
    FROM public.user_business_roles ubr
    JOIN public.roles r ON r.id = ubr.role_id
    JOIN public.businesses b ON b.id = ubr.business_id
    WHERE ubr.business_id = p_business_id
      AND ubr.is_active = true
      AND r.role_key = 'driver'
      AND (v_infrastructure_id IS NULL OR b.infrastructure_id = v_infrastructure_id)
  ),
  allocation_counts AS (
    SELECT COUNT(*) AS pending_allocations
    FROM public.stock_allocations sa
    WHERE sa.to_business_id = p_business_id
      AND sa.allocation_status IN ('pending','approved')
      AND (v_infrastructure_id IS NULL OR sa.infrastructure_id = v_infrastructure_id)
  )
  SELECT jsonb_build_object(
      'business_id', p_business_id,
      'revenue_today', os.revenue_today,
      'revenue_month', os.revenue_month,
      'revenue_30_days', os.revenue_30_days,
      'orders_today', os.orders_today,
      'orders_month', os.orders_month,
      'orders_in_progress', os.orders_in_progress,
      'orders_delivered', os.orders_delivered,
      'average_order_value', os.average_order_value,
      'active_drivers', dc.active_drivers,
      'pending_allocations', ac.pending_allocations,
      'last_updated', NOW()
    )
  INTO v_result
  FROM order_stats os
  CROSS JOIN driver_counts dc
  CROSS JOIN allocation_counts ac;

  RETURN COALESCE(
    v_result,
    jsonb_build_object(
      'business_id', p_business_id,
      'revenue_today', 0,
      'revenue_month', 0,
      'revenue_30_days', 0,
      'orders_today', 0,
      'orders_month', 0,
      'orders_in_progress', 0,
      'orders_delivered', 0,
      'average_order_value', 0,
      'active_drivers', 0,
      'pending_allocations', 0,
      'last_updated', NOW()
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_metrics(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_infrastructure_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_infrastructure_id uuid := public.current_infrastructure_id();
  v_result jsonb;
BEGIN
  WITH scoped_businesses AS (
    SELECT id, active
    FROM public.businesses
    WHERE v_infrastructure_id IS NULL OR infrastructure_id = v_infrastructure_id
  ),
  business_counts AS (
    SELECT
      COUNT(*) AS total_businesses,
      COUNT(*) FILTER (WHERE active) AS active_businesses
    FROM scoped_businesses
  ),
  user_counts AS (
    SELECT COUNT(*) AS total_users
    FROM public.users u
    WHERE v_infrastructure_id IS NULL OR u.infrastructure_id = v_infrastructure_id
  ),
  scoped_orders AS (
    SELECT total_amount, status, created_at, delivered_at
    FROM public.orders o
    WHERE (v_infrastructure_id IS NULL OR o.infrastructure_id = v_infrastructure_id)
      AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ),
  order_counts AS (
    SELECT
      COUNT(*) AS total_orders_30_days,
      COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_at::date = CURRENT_DATE THEN total_amount ELSE 0 END), 0) AS revenue_today,
      COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_at >= DATE_TRUNC('month', CURRENT_DATE) THEN total_amount ELSE 0 END), 0) AS revenue_month
    FROM scoped_orders
  ),
  driver_counts AS (
    SELECT COUNT(DISTINCT ubr.user_id) AS active_drivers
    FROM public.user_business_roles ubr
    JOIN public.roles r ON r.id = ubr.role_id
    JOIN public.businesses b ON b.id = ubr.business_id
    WHERE ubr.is_active = true
      AND r.role_key = 'driver'
      AND (v_infrastructure_id IS NULL OR b.infrastructure_id = v_infrastructure_id)
  ),
  allocation_counts AS (
    SELECT COUNT(*) AS pending_allocations
    FROM public.stock_allocations sa
    WHERE sa.allocation_status IN ('pending','approved')
      AND (v_infrastructure_id IS NULL OR sa.infrastructure_id = v_infrastructure_id)
  )
  SELECT jsonb_build_object(
      'infrastructure_id', v_infrastructure_id,
      'total_businesses', COALESCE(bc.total_businesses, 0),
      'active_businesses', COALESCE(bc.active_businesses, 0),
      'total_users', COALESCE(uc.total_users, 0),
      'total_orders_30_days', COALESCE(oc.total_orders_30_days, 0),
      'revenue_today', COALESCE(oc.revenue_today, 0),
      'revenue_month', COALESCE(oc.revenue_month, 0),
      'active_drivers', COALESCE(dc.active_drivers, 0),
      'pending_allocations', COALESCE(ac.pending_allocations, 0),
      'system_health', CASE
        WHEN COALESCE(ac.pending_allocations, 0) > 20 THEN 'critical'
        WHEN COALESCE(ac.pending_allocations, 0) > 10 THEN 'warning'
        ELSE 'healthy'
      END,
      'last_updated', NOW()
    )
  INTO v_result
  FROM business_counts bc
  CROSS JOIN user_counts uc
  CROSS JOIN order_counts oc
  CROSS JOIN driver_counts dc
  CROSS JOIN allocation_counts ac;

  RETURN COALESCE(v_result, jsonb_build_object(
    'infrastructure_id', v_infrastructure_id,
    'total_businesses', 0,
    'active_businesses', 0,
    'total_users', 0,
    'total_orders_30_days', 0,
    'revenue_today', 0,
    'revenue_month', 0,
    'active_drivers', 0,
    'pending_allocations', 0,
    'system_health', 'healthy',
    'last_updated', NOW()
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_infrastructure_overview() TO authenticated;

COMMIT;

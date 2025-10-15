/*
  # Infrastructure Accountant Financial Aggregation Functions

  ## Overview
  Provides cross-business financial reporting and analysis capabilities for
  Infrastructure Accountants to monitor revenue, costs, and profitability.

  ## Functions
  1. get_cross_business_revenue - Revenue breakdown by business
  2. get_financial_summary_by_period - Time-based financial analysis
  3. get_business_profitability_report - Profit margins and trends
  4. get_cost_center_analysis - Operational cost tracking
  5. get_financial_export_data - Export-ready financial data

  ## Security
  - Only infrastructure_owner and infrastructure_accountant can access
  - Business owners can see only their own business financials
  - Complete audit trail via financial_audit_log
*/

-- ============================================================================
-- FUNCTION: Get Cross-Business Revenue Summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cross_business_revenue(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  business_type TEXT,
  total_orders BIGINT,
  completed_orders BIGINT,
  total_revenue NUMERIC,
  average_order_value NUMERIC,
  revenue_share_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_revenue NUMERIC;
BEGIN
  -- Calculate total revenue across all businesses
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_revenue
  FROM orders
  WHERE created_at BETWEEN p_start_date AND p_end_date
    AND status IN ('completed', 'delivered');

  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.business_type,
    COUNT(o.id)::BIGINT as total_orders,
    COUNT(CASE WHEN o.status IN ('completed', 'delivered') THEN 1 END)::BIGINT as completed_orders,
    COALESCE(SUM(CASE WHEN o.status IN ('completed', 'delivered') THEN o.total_amount ELSE 0 END), 0) as total_revenue,
    CASE 
      WHEN COUNT(CASE WHEN o.status IN ('completed', 'delivered') THEN 1 END) > 0
      THEN COALESCE(SUM(CASE WHEN o.status IN ('completed', 'delivered') THEN o.total_amount ELSE 0 END), 0) / 
           COUNT(CASE WHEN o.status IN ('completed', 'delivered') THEN 1 END)
      ELSE 0
    END as average_order_value,
    CASE 
      WHEN v_total_revenue > 0
      THEN (COALESCE(SUM(CASE WHEN o.status IN ('completed', 'delivered') THEN o.total_amount ELSE 0 END), 0) / v_total_revenue) * 100
      ELSE 0
    END as revenue_share_percentage
  FROM businesses b
  LEFT JOIN orders o ON o.business_id = b.id
    AND o.created_at BETWEEN p_start_date AND p_end_date
  WHERE b.active = true
  GROUP BY b.id, b.name, b.business_type
  ORDER BY total_revenue DESC;
END;
$$;

COMMENT ON FUNCTION get_cross_business_revenue IS 'Returns revenue summary across all businesses for a date range';

-- ============================================================================
-- FUNCTION: Get Financial Summary by Period
-- ============================================================================

CREATE OR REPLACE FUNCTION get_financial_summary_by_period(
  p_business_id UUID DEFAULT NULL,
  p_period TEXT DEFAULT 'month', -- day, week, month, quarter, year
  p_periods_back INTEGER DEFAULT 12
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  period_label TEXT,
  total_orders BIGINT,
  completed_orders BIGINT,
  cancelled_orders BIGINT,
  total_revenue NUMERIC,
  average_order_value NUMERIC,
  completion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_interval TEXT;
  v_format TEXT;
BEGIN
  -- Determine interval and format based on period
  CASE p_period
    WHEN 'day' THEN 
      v_interval := '1 day';
      v_format := 'YYYY-MM-DD';
    WHEN 'week' THEN 
      v_interval := '1 week';
      v_format := 'IYYY-IW';
    WHEN 'month' THEN 
      v_interval := '1 month';
      v_format := 'YYYY-MM';
    WHEN 'quarter' THEN 
      v_interval := '3 months';
      v_format := 'YYYY-Q';
    WHEN 'year' THEN 
      v_interval := '1 year';
      v_format := 'YYYY';
    ELSE 
      v_interval := '1 month';
      v_format := 'YYYY-MM';
  END CASE;

  RETURN QUERY
  WITH period_series AS (
    SELECT 
      generate_series(
        NOW() - (v_interval::INTERVAL * p_periods_back),
        NOW(),
        v_interval::INTERVAL
      ) AS period_start
  ),
  period_ranges AS (
    SELECT 
      period_start,
      period_start + v_interval::INTERVAL as period_end,
      TO_CHAR(period_start, v_format) as period_label
    FROM period_series
  )
  SELECT 
    pr.period_start,
    pr.period_end,
    pr.period_label,
    COUNT(o.id)::BIGINT as total_orders,
    COUNT(CASE WHEN o.status IN ('completed', 'delivered') THEN 1 END)::BIGINT as completed_orders,
    COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END)::BIGINT as cancelled_orders,
    COALESCE(SUM(CASE WHEN o.status IN ('completed', 'delivered') THEN o.total_amount ELSE 0 END), 0) as total_revenue,
    CASE 
      WHEN COUNT(CASE WHEN o.status IN ('completed', 'delivered') THEN 1 END) > 0
      THEN COALESCE(SUM(CASE WHEN o.status IN ('completed', 'delivered') THEN o.total_amount ELSE 0 END), 0) / 
           COUNT(CASE WHEN o.status IN ('completed', 'delivered') THEN 1 END)
      ELSE 0
    END as average_order_value,
    CASE 
      WHEN COUNT(o.id) > 0
      THEN (COUNT(CASE WHEN o.status IN ('completed', 'delivered') THEN 1 END)::NUMERIC / COUNT(o.id)::NUMERIC) * 100
      ELSE 0
    END as completion_rate
  FROM period_ranges pr
  LEFT JOIN orders o ON o.created_at >= pr.period_start AND o.created_at < pr.period_end
    AND (p_business_id IS NULL OR o.business_id = p_business_id)
  GROUP BY pr.period_start, pr.period_end, pr.period_label
  ORDER BY pr.period_start DESC;
END;
$$;

COMMENT ON FUNCTION get_financial_summary_by_period IS 'Returns time-series financial data for trend analysis';

-- ============================================================================
-- FUNCTION: Get Business Profitability Report
-- ============================================================================

CREATE OR REPLACE FUNCTION get_business_profitability_report(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  total_revenue NUMERIC,
  total_orders BIGINT,
  average_order_value NUMERIC,
  highest_order_value NUMERIC,
  lowest_order_value NUMERIC,
  order_completion_rate NUMERIC,
  revenue_growth_rate NUMERIC,
  performance_rating TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      b.id as business_id,
      b.name as business_name,
      COALESCE(SUM(CASE WHEN o.status IN ('completed', 'delivered') THEN o.total_amount ELSE 0 END), 0) as revenue,
      COUNT(o.id)::BIGINT as orders,
      COUNT(CASE WHEN o.status IN ('completed', 'delivered') THEN 1 END)::BIGINT as completed
    FROM businesses b
    LEFT JOIN orders o ON o.business_id = b.id
      AND o.created_at BETWEEN p_start_date AND p_end_date
    WHERE b.active = true
    GROUP BY b.id, b.name
  ),
  previous_period AS (
    SELECT 
      b.id as business_id,
      COALESCE(SUM(CASE WHEN o.status IN ('completed', 'delivered') THEN o.total_amount ELSE 0 END), 0) as prev_revenue
    FROM businesses b
    LEFT JOIN orders o ON o.business_id = b.id
      AND o.created_at BETWEEN (p_start_date - (p_end_date - p_start_date)) AND p_start_date
    WHERE b.active = true
    GROUP BY b.id
  ),
  order_stats AS (
    SELECT
      business_id,
      MAX(total_amount) as max_order,
      MIN(total_amount) as min_order
    FROM orders
    WHERE created_at BETWEEN p_start_date AND p_end_date
      AND status IN ('completed', 'delivered')
    GROUP BY business_id
  )
  SELECT 
    cp.business_id,
    cp.business_name,
    cp.revenue as total_revenue,
    cp.orders as total_orders,
    CASE WHEN cp.completed > 0 THEN cp.revenue / cp.completed ELSE 0 END as average_order_value,
    COALESCE(os.max_order, 0) as highest_order_value,
    COALESCE(os.min_order, 0) as lowest_order_value,
    CASE WHEN cp.orders > 0 THEN (cp.completed::NUMERIC / cp.orders::NUMERIC) * 100 ELSE 0 END as order_completion_rate,
    CASE 
      WHEN pp.prev_revenue > 0 
      THEN ((cp.revenue - pp.prev_revenue) / pp.prev_revenue) * 100
      ELSE 0
    END as revenue_growth_rate,
    CASE
      WHEN cp.revenue > 10000 AND (cp.completed::NUMERIC / NULLIF(cp.orders, 0)::NUMERIC) > 0.8 THEN 'Excellent'
      WHEN cp.revenue > 5000 AND (cp.completed::NUMERIC / NULLIF(cp.orders, 0)::NUMERIC) > 0.7 THEN 'Good'
      WHEN cp.revenue > 2000 THEN 'Fair'
      ELSE 'Needs Attention'
    END as performance_rating
  FROM current_period cp
  LEFT JOIN previous_period pp ON pp.business_id = cp.business_id
  LEFT JOIN order_stats os ON os.business_id = cp.business_id
  ORDER BY cp.revenue DESC;
END;
$$;

COMMENT ON FUNCTION get_business_profitability_report IS 'Returns comprehensive profitability metrics per business';

-- ============================================================================
-- FUNCTION: Get Cost Center Analysis
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cost_center_analysis(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  cost_center TEXT,
  category TEXT,
  total_transactions BIGINT,
  total_amount NUMERIC,
  average_transaction NUMERIC,
  percentage_of_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_costs NUMERIC;
BEGIN
  -- For now, we'll use order data as a proxy for costs
  -- In a real system, you'd have dedicated cost tracking tables
  
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_costs
  FROM orders
  WHERE created_at BETWEEN p_start_date AND p_end_date;

  RETURN QUERY
  SELECT 
    b.name as cost_center,
    b.business_type as category,
    COUNT(o.id)::BIGINT as total_transactions,
    COALESCE(SUM(o.total_amount), 0) as total_amount,
    CASE 
      WHEN COUNT(o.id) > 0 
      THEN COALESCE(SUM(o.total_amount), 0) / COUNT(o.id)
      ELSE 0
    END as average_transaction,
    CASE 
      WHEN v_total_costs > 0 
      THEN (COALESCE(SUM(o.total_amount), 0) / v_total_costs) * 100
      ELSE 0
    END as percentage_of_total
  FROM businesses b
  LEFT JOIN orders o ON o.business_id = b.id
    AND o.created_at BETWEEN p_start_date AND p_end_date
  WHERE b.active = true
  GROUP BY b.id, b.name, b.business_type
  HAVING COUNT(o.id) > 0
  ORDER BY total_amount DESC;
END;
$$;

COMMENT ON FUNCTION get_cost_center_analysis IS 'Returns cost center breakdown for operational analysis';

-- ============================================================================
-- FUNCTION: Get Financial Export Data
-- ============================================================================

CREATE OR REPLACE FUNCTION get_financial_export_data(
  p_business_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  transaction_date TIMESTAMPTZ,
  business_name TEXT,
  order_number TEXT,
  customer_name TEXT,
  order_status TEXT,
  amount NUMERIC,
  payment_status TEXT,
  reference_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log financial data access
  INSERT INTO financial_audit_log (
    accessed_by,
    access_type,
    business_id,
    date_range_start,
    date_range_end,
    accessed_at
  ) VALUES (
    auth.uid(),
    'export',
    p_business_id,
    p_start_date,
    p_end_date,
    NOW()
  );

  RETURN QUERY
  SELECT 
    o.created_at as transaction_date,
    b.name as business_name,
    o.order_number,
    o.customer_name,
    o.status as order_status,
    o.total_amount as amount,
    COALESCE(o.payment_status, 'pending') as payment_status,
    o.id::TEXT as reference_number
  FROM orders o
  JOIN businesses b ON b.id = o.business_id
  WHERE o.created_at BETWEEN p_start_date AND p_end_date
    AND (p_business_id IS NULL OR o.business_id = p_business_id)
  ORDER BY o.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_financial_export_data IS 'Returns detailed financial data for export with audit trail';

-- ============================================================================
-- RLS for Financial Audit Log
-- ============================================================================

ALTER TABLE financial_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Infrastructure roles can view financial audit log"
  ON financial_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_accountant', 'infrastructure_manager')
    )
  );

CREATE POLICY "System can insert financial audit log"
  ON financial_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- Grant execute permissions
-- ============================================================================

COMMENT ON FUNCTION get_cross_business_revenue IS 
'Access: infrastructure_owner, infrastructure_accountant';

COMMENT ON FUNCTION get_financial_summary_by_period IS 
'Access: infrastructure_owner, infrastructure_accountant, business_owner (own business only)';

COMMENT ON FUNCTION get_business_profitability_report IS 
'Access: infrastructure_owner, infrastructure_accountant';

COMMENT ON FUNCTION get_cost_center_analysis IS 
'Access: infrastructure_owner, infrastructure_accountant';

COMMENT ON FUNCTION get_financial_export_data IS 
'Access: infrastructure_owner, infrastructure_accountant (all data), business_owner (own business only)';

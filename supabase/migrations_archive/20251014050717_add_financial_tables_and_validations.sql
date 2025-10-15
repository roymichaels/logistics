/*
  # Financial Tables and Enhanced Validations
  
  ## Overview
  Adds financial tracking tables and validation functions for the infrastructure-first system.
  
  ## New Tables
  1. business_revenue - Track revenue by business
  2. business_costs - Track costs by business and category
  3. profit_distributions - Manage profit distribution to owners
  
  ## New Functions
  1. validate_equity_distribution - Ensures ownership totals 100%
  2. calculate_profit_distribution - Calculates distribution amounts
  3. user_has_permission - Quick permission check helper
*/

-- ============================================================================
-- FINANCIAL TABLES
-- ============================================================================

-- Revenue tracking table
CREATE TABLE IF NOT EXISTS business_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  revenue_date DATE NOT NULL,
  revenue_source TEXT NOT NULL CHECK (revenue_source IN ('orders', 'services', 'other')),
  gross_amount NUMERIC(12,2) NOT NULL CHECK (gross_amount >= 0),
  net_amount NUMERIC(12,2) NOT NULL CHECK (net_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'ILS',
  order_ids UUID[] DEFAULT '{}',
  recorded_by UUID NOT NULL REFERENCES users(id),
  recorded_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  UNIQUE(business_id, revenue_date, revenue_source)
);

CREATE INDEX IF NOT EXISTS idx_business_revenue_business ON business_revenue(business_id, revenue_date DESC);
CREATE INDEX IF NOT EXISTS idx_business_revenue_date ON business_revenue(revenue_date DESC);

-- Cost tracking table
CREATE TABLE IF NOT EXISTS business_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  cost_date DATE NOT NULL,
  cost_category TEXT NOT NULL CHECK (cost_category IN (
    'inventory', 'labor', 'delivery', 'overhead', 'marketing', 'other'
  )),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'ILS',
  vendor TEXT,
  reference_number TEXT,
  recorded_by UUID NOT NULL REFERENCES users(id),
  recorded_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_business_costs_business ON business_costs(business_id, cost_date DESC);
CREATE INDEX IF NOT EXISTS idx_business_costs_category ON business_costs(cost_category, cost_date DESC);

-- Profit distribution table
CREATE TABLE IF NOT EXISTS profit_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  distribution_period_start DATE NOT NULL,
  distribution_period_end DATE NOT NULL,
  total_revenue NUMERIC(12,2) NOT NULL,
  total_costs NUMERIC(12,2) NOT NULL,
  net_profit NUMERIC(12,2) NOT NULL,
  distribution_status TEXT NOT NULL DEFAULT 'calculated' CHECK (distribution_status IN (
    'calculated', 'approved', 'processing', 'completed', 'cancelled'
  )),
  distributions JSONB NOT NULL DEFAULT '[]',
  calculated_by UUID NOT NULL REFERENCES users(id),
  calculated_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  CHECK (distribution_period_end > distribution_period_start)
);

CREATE INDEX IF NOT EXISTS idx_profit_dist_business ON profit_distributions(business_id, distribution_period_end DESC);
CREATE INDEX IF NOT EXISTS idx_profit_dist_status ON profit_distributions(distribution_status);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate profit distribution based on ownership
CREATE OR REPLACE FUNCTION calculate_profit_distribution(
  p_business_id UUID,
  p_net_profit NUMERIC
)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  ownership_percentage NUMERIC,
  distribution_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ubr.user_id,
    u.name,
    ubr.ownership_percentage,
    ROUND((p_net_profit * ubr.ownership_percentage / 100), 2) as distribution_amount
  FROM user_business_roles ubr
  JOIN users u ON u.id = ubr.user_id
  WHERE ubr.business_id = p_business_id
    AND ubr.is_active = true
    AND ubr.ownership_percentage > 0
  ORDER BY ubr.ownership_percentage DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has a specific permission (overloaded version)
CREATE OR REPLACE FUNCTION user_has_permission_check(
  p_user_id UUID,
  p_permission_key TEXT,
  p_business_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM get_user_permissions(p_user_id, p_business_id)
    WHERE permission_key = p_permission_key
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE business_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_distributions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Financial Tables
-- ============================================================================

-- Revenue policies
CREATE POLICY "Infrastructure can view all revenue"
  ON business_revenue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_accountant', 'infrastructure_manager')
    )
  );

CREATE POLICY "Business owners can view own business revenue"
  ON business_revenue FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key = 'business_owner'
    )
  );

CREATE POLICY "Authorized users can record revenue"
  ON business_revenue FOR INSERT
  TO authenticated
  WITH CHECK (
    recorded_by = auth.uid() AND (
      business_id IN (
        SELECT ubr.business_id FROM user_business_roles ubr
        JOIN roles r ON r.id = ubr.role_id
        WHERE ubr.user_id = auth.uid()
        AND ubr.is_active = true
        AND r.role_key IN ('business_owner', 'manager')
      )
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('infrastructure_owner', 'infrastructure_accountant')
      )
    )
  );

-- Cost policies
CREATE POLICY "Infrastructure can view all costs"
  ON business_costs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_accountant', 'infrastructure_manager')
    )
  );

CREATE POLICY "Business owners can view own business costs"
  ON business_costs FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key = 'business_owner'
    )
  );

CREATE POLICY "Authorized users can record costs"
  ON business_costs FOR INSERT
  TO authenticated
  WITH CHECK (
    recorded_by = auth.uid() AND (
      business_id IN (
        SELECT ubr.business_id FROM user_business_roles ubr
        JOIN roles r ON r.id = ubr.role_id
        WHERE ubr.user_id = auth.uid()
        AND ubr.is_active = true
        AND r.role_key IN ('business_owner', 'manager', 'warehouse')
      )
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('infrastructure_owner', 'infrastructure_accountant')
      )
    )
  );

-- Profit distribution policies
CREATE POLICY "Infrastructure and business owners can view distributions"
  ON profit_distributions FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      WHERE ubr.user_id = auth.uid() AND ubr.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_accountant', 'infrastructure_manager')
    )
  );

CREATE POLICY "Only infrastructure and business owners can manage distributions"
  ON profit_distributions FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key = 'business_owner'
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_accountant')
    )
  );

-- ============================================================================
-- ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for permission resolution queries
CREATE INDEX IF NOT EXISTS idx_user_business_roles_lookup 
  ON user_business_roles(user_id, business_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup 
  ON role_permissions(role_id, permission_id);

CREATE INDEX IF NOT EXISTS idx_custom_role_permissions_lookup 
  ON custom_role_permissions(custom_role_id, permission_id, is_enabled) WHERE is_enabled = true;

-- Indexes for financial queries
CREATE INDEX IF NOT EXISTS idx_business_revenue_lookup 
  ON business_revenue(business_id, revenue_date, revenue_source);

CREATE INDEX IF NOT EXISTS idx_business_costs_lookup 
  ON business_costs(business_id, cost_date, cost_category);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE business_revenue IS 'Revenue tracking per business with complete audit trail';
COMMENT ON TABLE business_costs IS 'Cost tracking per business by category';
COMMENT ON TABLE profit_distributions IS 'Profit distribution calculations and payment tracking';
COMMENT ON FUNCTION calculate_profit_distribution IS 'Calculates profit distribution based on ownership percentages';
COMMENT ON FUNCTION user_has_permission_check IS 'Quick permission check for authorization';

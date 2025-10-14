/*
  # Business Equity Management System

  Creates tables for tracking business ownership and equity distribution
*/

-- ============================================================================
-- BUSINESS_EQUITY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_equity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  equity_percentage NUMERIC(5,2) NOT NULL CHECK (equity_percentage > 0 AND equity_percentage <= 100),
  equity_type TEXT NOT NULL DEFAULT 'common' CHECK (equity_type IN ('common', 'preferred', 'founder', 'employee')),
  vesting_start_date DATE,
  vesting_end_date DATE,
  vested_percentage NUMERIC(5,2) DEFAULT 100 CHECK (vested_percentage >= 0 AND vested_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, stakeholder_id, equity_type)
);

CREATE INDEX IF NOT EXISTS idx_business_equity_business ON business_equity(business_id);
CREATE INDEX IF NOT EXISTS idx_business_equity_stakeholder ON business_equity(stakeholder_id);

-- ============================================================================
-- EQUITY_TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS equity_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  from_stakeholder_id UUID REFERENCES users(id),
  to_stakeholder_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  equity_percentage NUMERIC(5,2) NOT NULL CHECK (equity_percentage > 0),
  equity_type TEXT NOT NULL CHECK (equity_type IN ('common', 'preferred', 'founder', 'employee')),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('grant', 'transfer', 'buyback', 'dilution', 'vesting')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  price_per_percentage NUMERIC(12,2),
  total_value NUMERIC(14,2),
  reason TEXT,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equity_transactions_business ON equity_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_equity_transactions_stakeholder ON equity_transactions(to_stakeholder_id);

-- ============================================================================
-- VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_business_equity_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_equity NUMERIC;
  v_error_msg TEXT;
BEGIN
  SELECT COALESCE(SUM(equity_percentage), 0)
  INTO v_total_equity
  FROM business_equity
  WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
    AND is_active = true
    AND id != COALESCE(NEW.id, OLD.id);

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.is_active THEN
    v_total_equity := v_total_equity + NEW.equity_percentage;
  END IF;

  IF v_total_equity > 100 THEN
    v_error_msg := 'Total equity percentage cannot exceed 100%. Current total would be: ' || v_total_equity::TEXT;
    RAISE EXCEPTION '%', v_error_msg;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_equity_validation_trigger ON business_equity;
CREATE TRIGGER business_equity_validation_trigger
  BEFORE INSERT OR UPDATE ON business_equity
  FOR EACH ROW
  EXECUTE FUNCTION validate_business_equity_total();

-- ============================================================================
-- HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_business_equity_breakdown(
  p_business_id UUID
)
RETURNS TABLE (
  stakeholder_id UUID,
  stakeholder_name TEXT,
  equity_percentage NUMERIC,
  equity_type TEXT,
  vested_percentage NUMERIC,
  effective_percentage NUMERIC,
  is_fully_vested BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    be.stakeholder_id,
    u.name as stakeholder_name,
    be.equity_percentage,
    be.equity_type,
    be.vested_percentage,
    (be.equity_percentage * be.vested_percentage / 100) as effective_percentage,
    (be.vested_percentage = 100) as is_fully_vested
  FROM business_equity be
  JOIN users u ON u.id = be.stakeholder_id
  WHERE be.business_id = p_business_id
    AND be.is_active = true
  ORDER BY be.equity_percentage DESC;
END;
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE business_equity ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View business equity"
  ON business_equity FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'infrastructure_owner')
    OR business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid() AND r.role_key = 'business_owner' AND ubr.is_active = true
    )
    OR stakeholder_id = auth.uid()
  );

CREATE POLICY "Manage business equity"
  ON business_equity FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'infrastructure_owner')
    OR business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid() AND r.role_key = 'business_owner' AND ubr.is_active = true
    )
  );

CREATE POLICY "View equity transactions"
  ON equity_transactions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('infrastructure_owner', 'infrastructure_accountant'))
    OR to_stakeholder_id = auth.uid()
    OR from_stakeholder_id = auth.uid()
  );

/*
  # Business Ownership System

  ## Overview
  Implements a comprehensive ownership percentage system for multi-tenant businesses.
  Supports multiple owners per business with configurable ownership percentages,
  profit sharing, voting rights, and vesting schedules.

  ## New Tables

  1. **business_ownership**
     - Tracks ownership stakes in businesses
     - Supports percentage-based ownership (0-100%)
     - Includes vesting schedules and voting rights
     - Enforces total ownership cannot exceed 100%

  2. **ownership_transfers**
     - Audit trail for ownership transfers
     - Requires multi-party approval
     - Tracks transfer history

  3. **business_decisions**
     - Tracks major business decisions requiring owner votes
     - Weighted voting based on ownership percentage
     - Configurable approval thresholds

  4. **financial_distributions**
     - Tracks profit distributions to owners
     - Calculated based on ownership percentage
     - Monthly/quarterly distribution records

  ## Security
  - Row Level Security enforces access control
  - Only owners can view ownership structure
  - Transfers require multi-party approval
  - All changes logged in audit trail
*/

-- =============================================
-- BUSINESS OWNERSHIP TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS business_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ownership_percentage numeric NOT NULL CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  equity_type text NOT NULL DEFAULT 'founder' CHECK (equity_type IN ('founder', 'investor', 'employee', 'partner')),
  profit_share_percentage numeric CHECK (profit_share_percentage >= 0 AND profit_share_percentage <= 100),
  voting_rights boolean DEFAULT true,
  vesting_schedule jsonb DEFAULT '{"type": "immediate", "total_months": 0, "cliff_months": 0}',
  vested_percentage numeric DEFAULT 100 CHECK (vested_percentage >= 0 AND vested_percentage <= 100),
  granted_date timestamptz DEFAULT now(),
  vested_date timestamptz,
  notes text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  UNIQUE(business_id, owner_user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_ownership_business ON business_ownership(business_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_business_ownership_owner ON business_ownership(owner_user_id) WHERE active = true;

-- =============================================
-- OWNERSHIP TRANSFERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS ownership_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES users(id),
  to_user_id uuid NOT NULL REFERENCES users(id),
  percentage_transferred numeric NOT NULL CHECK (percentage_transferred > 0 AND percentage_transferred <= 100),
  transfer_type text NOT NULL CHECK (transfer_type IN ('sale', 'gift', 'inheritance', 'vesting', 'forfeiture')),
  sale_amount numeric,
  currency text DEFAULT 'ILS' CHECK (currency IN ('ILS', 'USD', 'EUR')),
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  approved_by_from boolean DEFAULT false,
  approved_by_to boolean DEFAULT false,
  approved_by_platform boolean DEFAULT false,
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ownership_transfers_business ON ownership_transfers(business_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_status ON ownership_transfers(status);

-- =============================================
-- BUSINESS DECISIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS business_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  decision_type text NOT NULL CHECK (decision_type IN ('operational', 'structural', 'financial', 'strategic')),
  title text NOT NULL,
  description text,
  proposed_by uuid NOT NULL REFERENCES users(id),
  approval_threshold numeric NOT NULL DEFAULT 50 CHECK (approval_threshold > 0 AND approval_threshold <= 100),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  votes jsonb DEFAULT '[]',
  total_votes_for numeric DEFAULT 0,
  total_votes_against numeric DEFAULT 0,
  voting_deadline timestamptz,
  resolved_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_decisions_business ON business_decisions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_decisions_status ON business_decisions(status);

-- =============================================
-- FINANCIAL DISTRIBUTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS financial_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES users(id),
  distribution_period text NOT NULL,
  period_start_date date NOT NULL,
  period_end_date date NOT NULL,
  total_business_revenue numeric NOT NULL DEFAULT 0,
  total_business_costs numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  ownership_percentage numeric NOT NULL,
  profit_share_percentage numeric NOT NULL,
  distribution_amount numeric NOT NULL DEFAULT 0,
  distribution_date date,
  payment_method text CHECK (payment_method IN ('bank_transfer', 'check', 'cash', 'crypto')),
  payment_reference text,
  status text NOT NULL DEFAULT 'calculated' CHECK (status IN ('calculated', 'approved', 'paid', 'failed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_financial_distributions_business ON financial_distributions(business_id);
CREATE INDEX IF NOT EXISTS idx_financial_distributions_owner ON financial_distributions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_financial_distributions_period ON financial_distributions(period_start_date, period_end_date);

-- =============================================
-- VALIDATION FUNCTIONS
-- =============================================

-- Function to validate total ownership doesn't exceed 100%
CREATE OR REPLACE FUNCTION validate_ownership_percentage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_ownership numeric;
  current_ownership numeric;
BEGIN
  -- Get current total ownership for this business (excluding the row being modified)
  SELECT COALESCE(SUM(ownership_percentage), 0)
  INTO total_ownership
  FROM business_ownership
  WHERE business_id = NEW.business_id
    AND active = true
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Add the new/updated percentage
  total_ownership := total_ownership + NEW.ownership_percentage;

  -- Check if it exceeds 100%
  IF total_ownership > 100 THEN
    RAISE EXCEPTION 'Total ownership for business % would exceed 100%% (current: %%, attempting to add: %%)',
      NEW.business_id, total_ownership - NEW.ownership_percentage, NEW.ownership_percentage;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to calculate vested percentage based on schedule
CREATE OR REPLACE FUNCTION calculate_vested_percentage(
  p_ownership_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_schedule jsonb;
  v_granted_date timestamptz;
  v_total_months integer;
  v_cliff_months integer;
  v_months_elapsed numeric;
  v_vested_pct numeric;
BEGIN
  -- Get ownership details
  SELECT vesting_schedule, granted_date
  INTO v_schedule, v_granted_date
  FROM business_ownership
  WHERE id = p_ownership_id;

  -- Extract schedule parameters
  v_total_months := (v_schedule->>'total_months')::integer;
  v_cliff_months := (v_schedule->>'cliff_months')::integer;

  -- Calculate months elapsed since grant
  v_months_elapsed := EXTRACT(EPOCH FROM (now() - v_granted_date)) / (30.44 * 24 * 60 * 60);

  -- If immediate vesting or no schedule
  IF v_total_months = 0 THEN
    RETURN 100;
  END IF;

  -- If before cliff, nothing vested
  IF v_months_elapsed < v_cliff_months THEN
    RETURN 0;
  END IF;

  -- If past total vesting period, fully vested
  IF v_months_elapsed >= v_total_months THEN
    RETURN 100;
  END IF;

  -- Linear vesting calculation
  v_vested_pct := (v_months_elapsed / v_total_months) * 100;

  RETURN ROUND(v_vested_pct, 2);
END;
$$;

-- Function to process ownership transfer
CREATE OR REPLACE FUNCTION process_ownership_transfer(
  p_transfer_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer ownership_transfers%ROWTYPE;
  v_from_ownership numeric;
BEGIN
  -- Get transfer details
  SELECT * INTO v_transfer
  FROM ownership_transfers
  WHERE id = p_transfer_id;

  -- Verify all approvals are in place
  IF NOT (v_transfer.approved_by_from AND v_transfer.approved_by_to AND v_transfer.approved_by_platform) THEN
    RAISE EXCEPTION 'Transfer requires all parties to approve';
  END IF;

  -- Get current ownership of from_user
  SELECT ownership_percentage INTO v_from_ownership
  FROM business_ownership
  WHERE business_id = v_transfer.business_id
    AND owner_user_id = v_transfer.from_user_id
    AND active = true;

  -- Verify from_user has enough ownership to transfer
  IF v_from_ownership < v_transfer.percentage_transferred THEN
    RAISE EXCEPTION 'Insufficient ownership to transfer';
  END IF;

  -- Reduce from_user ownership
  UPDATE business_ownership
  SET ownership_percentage = ownership_percentage - v_transfer.percentage_transferred,
      updated_at = now()
  WHERE business_id = v_transfer.business_id
    AND owner_user_id = v_transfer.from_user_id
    AND active = true;

  -- Add or update to_user ownership
  INSERT INTO business_ownership (
    business_id,
    owner_user_id,
    ownership_percentage,
    equity_type,
    profit_share_percentage,
    created_by
  )
  VALUES (
    v_transfer.business_id,
    v_transfer.to_user_id,
    v_transfer.percentage_transferred,
    'partner',
    v_transfer.percentage_transferred,
    v_transfer.created_by
  )
  ON CONFLICT (business_id, owner_user_id)
  DO UPDATE SET
    ownership_percentage = business_ownership.ownership_percentage + v_transfer.percentage_transferred,
    updated_at = now();

  -- Mark transfer as completed
  UPDATE ownership_transfers
  SET status = 'completed',
      completed_at = now()
  WHERE id = p_transfer_id;

  RETURN true;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to validate ownership percentage
DROP TRIGGER IF EXISTS validate_ownership_percentage_trigger ON business_ownership;
CREATE TRIGGER validate_ownership_percentage_trigger
  BEFORE INSERT OR UPDATE ON business_ownership
  FOR EACH ROW
  EXECUTE FUNCTION validate_ownership_percentage();

-- Trigger to update timestamps
DROP TRIGGER IF EXISTS update_business_ownership_timestamp ON business_ownership;
CREATE TRIGGER update_business_ownership_timestamp
  BEFORE UPDATE ON business_ownership
  FOR EACH ROW
  EXECUTE FUNCTION update_order_timestamp();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE business_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_distributions ENABLE ROW LEVEL SECURITY;

-- Business owners can view ownership structure of their business
CREATE POLICY "Owners can view business ownership"
  ON business_ownership FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT bo.business_id
      FROM business_ownership bo
      WHERE bo.owner_user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND bo.active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'owner'
    )
  );

-- Only platform owner can create ownership records
CREATE POLICY "Platform owner can create ownership"
  ON business_ownership FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = auth.jwt() ->> 'sub'
      AND role = 'owner'
    )
  );

-- Business owners can view transfers related to their business
CREATE POLICY "Owners can view ownership transfers"
  ON ownership_transfers FOR SELECT
  TO authenticated
  USING (
    from_user_id IN (SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub')
    OR to_user_id IN (SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub')
    OR business_id IN (
      SELECT bo.business_id
      FROM business_ownership bo
      WHERE bo.owner_user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
    )
  );

-- Business owners can propose transfers
CREATE POLICY "Owners can propose transfers"
  ON ownership_transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id IN (SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub')
  );

-- Business owners can approve transfers
CREATE POLICY "Owners can approve transfers"
  ON ownership_transfers FOR UPDATE
  TO authenticated
  USING (
    from_user_id IN (SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub')
    OR to_user_id IN (SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub')
  );

-- Business owners can view and create decisions
CREATE POLICY "Owners can manage business decisions"
  ON business_decisions FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT bo.business_id
      FROM business_ownership bo
      WHERE bo.owner_user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND bo.active = true
    )
  );

-- Owners can view their financial distributions
CREATE POLICY "Owners can view own distributions"
  ON financial_distributions FOR SELECT
  TO authenticated
  USING (
    owner_user_id IN (SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub')
    OR
    business_id IN (
      SELECT bo.business_id
      FROM business_ownership bo
      WHERE bo.owner_user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND bo.active = true
    )
  );

-- Platform owner can create distributions
CREATE POLICY "Platform owner can create distributions"
  ON financial_distributions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = auth.jwt() ->> 'sub'
      AND role = 'owner'
    )
  );

-- =============================================
-- HELPER VIEWS
-- =============================================

-- View to see current ownership structure per business
CREATE OR REPLACE VIEW v_business_ownership_summary AS
SELECT
  b.id as business_id,
  b.name as business_name,
  COUNT(DISTINCT bo.owner_user_id) as total_owners,
  SUM(bo.ownership_percentage) as total_allocated_ownership,
  100 - COALESCE(SUM(bo.ownership_percentage), 0) as available_ownership,
  jsonb_agg(
    jsonb_build_object(
      'owner_id', u.id,
      'owner_name', u.name,
      'ownership_pct', bo.ownership_percentage,
      'profit_share_pct', bo.profit_share_percentage,
      'voting_rights', bo.voting_rights,
      'vested_pct', bo.vested_percentage,
      'equity_type', bo.equity_type
    )
  ) as owners
FROM businesses b
LEFT JOIN business_ownership bo ON bo.business_id = b.id AND bo.active = true
LEFT JOIN users u ON u.id = bo.owner_user_id
WHERE b.active = true
GROUP BY b.id, b.name;

-- View to calculate pending financial distributions
CREATE OR REPLACE VIEW v_pending_distributions AS
SELECT
  b.id as business_id,
  b.name as business_name,
  bo.owner_user_id,
  u.name as owner_name,
  bo.ownership_percentage,
  bo.profit_share_percentage,
  COALESCE(SUM(o.total_amount), 0) as period_revenue,
  COALESCE(SUM(o.total_amount), 0) * 0.3 as estimated_profit,
  (COALESCE(SUM(o.total_amount), 0) * 0.3 * bo.profit_share_percentage / 100) as owner_share
FROM businesses b
INNER JOIN business_ownership bo ON bo.business_id = b.id AND bo.active = true
INNER JOIN users u ON u.id = bo.owner_user_id
LEFT JOIN orders o ON o.business_id = b.id
  AND o.created_at >= date_trunc('month', CURRENT_DATE)
  AND o.status = 'delivered'
WHERE b.active = true
GROUP BY b.id, b.name, bo.owner_user_id, u.name, bo.ownership_percentage, bo.profit_share_percentage;

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Note: Sample data should be added via separate seed migration
-- This is just the schema

COMMENT ON TABLE business_ownership IS 'Tracks ownership stakes in businesses with percentage-based equity';
COMMENT ON TABLE ownership_transfers IS 'Audit trail for ownership transfers between parties';
COMMENT ON TABLE business_decisions IS 'Major business decisions requiring owner votes';
COMMENT ON TABLE financial_distributions IS 'Profit distributions to business owners';

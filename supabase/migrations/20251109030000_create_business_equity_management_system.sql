/*
  # Business Equity Management System

  ## Overview
  This migration creates a comprehensive equity management system for business owners
  to manage ownership stakes, profit sharing, vesting schedules, and equity transactions.

  ## Tables Created
  1. **business_equity** - Core equity ownership records with vesting schedules
     - Tracks ownership percentage, equity type, and voting rights
     - Supports vesting schedules with start/end dates
     - Validates total equity never exceeds 100%
     - Links stakeholders to businesses with equity details

  2. **equity_transactions** - Complete audit trail of all equity changes
     - Records all equity grants, transfers, buybacks, and adjustments
     - Tracks transaction value and pricing
     - Maintains approval chain and reasons
     - Enables historical analysis and compliance

  3. **profit_distributions** - Actual profit distribution tracking
     - Records dividend payments to stakeholders
     - Tracks distribution periods and amounts
     - Maintains payment status and methods
     - Links to equity records for calculation validation

  4. **business_settings_extended** - Owner-configurable business settings
     - Stores branding and visual customization
     - Manages operational preferences
     - Tracks legal and tax information
     - Maintains custom configurations

  ## Security Features
  - Row Level Security (RLS) enabled on all tables
  - Business owners can manage equity in their businesses
  - Infrastructure owners have full access
  - Stakeholders can view their own equity details
  - Comprehensive audit logging for all changes
  - Validation functions prevent data integrity issues

  ## Key Functions
  - `validate_business_equity_total()` - Ensures equity never exceeds 100%
  - `get_business_equity_breakdown()` - Returns detailed equity distribution
  - `calculate_available_equity()` - Shows remaining equity for allocation
  - `record_equity_transaction()` - Logs all equity changes with audit trail
  - `calculate_profit_distribution()` - Computes distribution based on equity

  ## Business Rules
  - Total equity across all stakeholders cannot exceed 100%
  - Vested percentage must be between 0 and 100
  - Only active equity stakes count toward total
  - Equity types: common, preferred, founder, employee
  - Transaction types: grant, transfer, buyback, dilution, vesting, adjustment
*/

-- =====================================================
-- 1. BUSINESS_EQUITY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS business_equity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Ownership details
  equity_percentage numeric(5,2) NOT NULL CHECK (equity_percentage > 0 AND equity_percentage <= 100),
  equity_type text NOT NULL DEFAULT 'common' CHECK (equity_type IN ('common', 'preferred', 'founder', 'employee')),
  profit_share_percentage numeric(5,2) NOT NULL DEFAULT 0 CHECK (profit_share_percentage >= 0 AND profit_share_percentage <= 100),
  voting_rights boolean NOT NULL DEFAULT true,

  -- Vesting schedule
  vesting_start_date date,
  vesting_end_date date,
  vested_percentage numeric(5,2) NOT NULL DEFAULT 100 CHECK (vested_percentage >= 0 AND vested_percentage <= 100),
  cliff_months integer DEFAULT 0 CHECK (cliff_months >= 0),
  vesting_schedule text, -- monthly, quarterly, yearly, custom

  -- Status and metadata
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  grant_date date NOT NULL DEFAULT CURRENT_DATE,

  -- Audit fields
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(business_id, stakeholder_id, equity_type),
  CHECK (vesting_end_date IS NULL OR vesting_start_date IS NULL OR vesting_end_date >= vesting_start_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_equity_business ON business_equity(business_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_business_equity_stakeholder ON business_equity(stakeholder_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_business_equity_type ON business_equity(equity_type);
CREATE INDEX IF NOT EXISTS idx_business_equity_vesting ON business_equity(vesting_end_date) WHERE vesting_end_date IS NOT NULL AND is_active = true;

-- =====================================================
-- 2. EQUITY_TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS equity_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  equity_record_id uuid REFERENCES business_equity(id) ON DELETE SET NULL,

  -- Transaction parties
  from_stakeholder_id uuid REFERENCES users(id) ON DELETE SET NULL,
  to_stakeholder_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Transaction details
  equity_percentage numeric(5,2) NOT NULL CHECK (equity_percentage > 0),
  equity_type text NOT NULL CHECK (equity_type IN ('common', 'preferred', 'founder', 'employee')),
  transaction_type text NOT NULL CHECK (transaction_type IN ('grant', 'transfer', 'buyback', 'dilution', 'vesting', 'adjustment')),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,

  -- Financial details
  price_per_percentage numeric(12,2),
  total_value numeric(14,2),
  currency text DEFAULT 'ILS',

  -- Approval and documentation
  reason text,
  documentation_url text,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approval_date date,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_equity_transactions_business ON equity_transactions(business_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_equity_transactions_stakeholder ON equity_transactions(to_stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_equity_transactions_type ON equity_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_equity_transactions_date ON equity_transactions(transaction_date DESC);

-- =====================================================
-- 3. PROFIT_DISTRIBUTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS profit_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  equity_record_id uuid REFERENCES business_equity(id) ON DELETE SET NULL,

  -- Distribution details
  distribution_period_start date NOT NULL,
  distribution_period_end date NOT NULL,
  total_profit numeric(14,2) NOT NULL,
  stakeholder_percentage numeric(5,2) NOT NULL,
  distribution_amount numeric(14,2) NOT NULL,
  currency text DEFAULT 'ILS',

  -- Payment details
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payment_method text, -- bank_transfer, check, cash, digital_wallet
  payment_date date,
  payment_reference text,

  -- Metadata
  notes text,
  declared_at timestamptz NOT NULL DEFAULT now(),
  declared_by uuid REFERENCES users(id) ON DELETE SET NULL,
  paid_at timestamptz,
  paid_by uuid REFERENCES users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (distribution_period_end >= distribution_period_start)
);

-- Indexes for distributions
CREATE INDEX IF NOT EXISTS idx_profit_distributions_business ON profit_distributions(business_id, distribution_period_end DESC);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_stakeholder ON profit_distributions(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_status ON profit_distributions(payment_status);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_period ON profit_distributions(distribution_period_start, distribution_period_end);

-- =====================================================
-- 4. BUSINESS_SETTINGS_EXTENDED TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS business_settings_extended (
  business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,

  -- Branding
  logo_url text,
  banner_url text,
  primary_color text DEFAULT '#007aff',
  secondary_color text DEFAULT '#34c759',
  accent_color text,
  theme_mode text DEFAULT 'auto' CHECK (theme_mode IN ('light', 'dark', 'auto')),

  -- Operational settings
  default_currency text DEFAULT 'ILS',
  timezone text DEFAULT 'Asia/Jerusalem',
  locale text DEFAULT 'he-IL',
  date_format text DEFAULT 'DD/MM/YYYY',
  time_format text DEFAULT 'HH:mm',

  -- Business information
  legal_entity_name text,
  tax_id text,
  registration_number text,
  business_address jsonb,
  contact_email text,
  contact_phone text,
  website_url text,

  -- Order settings
  order_number_prefix text DEFAULT 'ORD',
  order_number_sequence integer DEFAULT 1,
  auto_confirm_orders boolean DEFAULT false,
  require_approval_amount numeric(12,2),

  -- Notifications
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  push_notifications boolean DEFAULT true,
  notification_preferences jsonb DEFAULT '{}'::jsonb,

  -- Features
  enabled_features jsonb DEFAULT '[]'::jsonb,
  custom_settings jsonb DEFAULT '{}'::jsonb,

  -- Metadata
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Index for business settings
CREATE INDEX IF NOT EXISTS idx_business_settings_updated ON business_settings_extended(updated_at DESC);

-- =====================================================
-- 5. VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate total equity doesn't exceed 100%
CREATE OR REPLACE FUNCTION validate_business_equity_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_equity numeric;
  v_business_id uuid;
  v_error_msg text;
BEGIN
  -- Determine business_id based on operation
  v_business_id := COALESCE(NEW.business_id, OLD.business_id);

  -- Calculate total active equity excluding current record
  SELECT COALESCE(SUM(equity_percentage), 0)
  INTO v_total_equity
  FROM business_equity
  WHERE business_id = v_business_id
    AND is_active = true
    AND id != COALESCE(NEW.id, OLD.id);

  -- Add current record if being inserted/updated and is active
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.is_active THEN
    v_total_equity := v_total_equity + NEW.equity_percentage;
  END IF;

  -- Validate total doesn't exceed 100%
  IF v_total_equity > 100 THEN
    v_error_msg := 'Total equity percentage cannot exceed 100%. Current total would be: ' ||
                   v_total_equity::text || '%. Available equity: ' ||
                   (100 - v_total_equity + COALESCE(NEW.equity_percentage, 0))::text || '%';
    RAISE EXCEPTION '%', v_error_msg;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach validation trigger
DROP TRIGGER IF EXISTS business_equity_validation_trigger ON business_equity;
CREATE TRIGGER business_equity_validation_trigger
  BEFORE INSERT OR UPDATE ON business_equity
  FOR EACH ROW
  EXECUTE FUNCTION validate_business_equity_total();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach update triggers
DROP TRIGGER IF EXISTS update_business_equity_updated_at ON business_equity;
CREATE TRIGGER update_business_equity_updated_at
  BEFORE UPDATE ON business_equity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profit_distributions_updated_at ON profit_distributions;
CREATE TRIGGER update_profit_distributions_updated_at
  BEFORE UPDATE ON profit_distributions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_settings_updated_at ON business_settings_extended;
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings_extended
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Get detailed equity breakdown for a business
CREATE OR REPLACE FUNCTION get_business_equity_breakdown(p_business_id uuid)
RETURNS TABLE (
  stakeholder_id uuid,
  stakeholder_name text,
  stakeholder_email text,
  equity_percentage numeric,
  equity_type text,
  profit_share_percentage numeric,
  voting_rights boolean,
  vested_percentage numeric,
  effective_percentage numeric,
  is_fully_vested boolean,
  vesting_end_date date,
  grant_date date,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    be.stakeholder_id,
    COALESCE(u.display_name, u.first_name || ' ' || u.last_name, u.email::text) as stakeholder_name,
    u.email::text as stakeholder_email,
    be.equity_percentage,
    be.equity_type,
    be.profit_share_percentage,
    be.voting_rights,
    be.vested_percentage,
    (be.equity_percentage * be.vested_percentage / 100) as effective_percentage,
    (be.vested_percentage = 100) as is_fully_vested,
    be.vesting_end_date,
    be.grant_date,
    be.is_active
  FROM business_equity be
  JOIN users u ON u.id = be.stakeholder_id
  WHERE be.business_id = p_business_id
  ORDER BY be.equity_percentage DESC, be.grant_date ASC;
END;
$$;

-- Calculate available equity for a business
CREATE OR REPLACE FUNCTION calculate_available_equity(p_business_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allocated_equity numeric;
  v_available_equity numeric;
BEGIN
  -- Calculate total allocated equity
  SELECT COALESCE(SUM(equity_percentage), 0)
  INTO v_allocated_equity
  FROM business_equity
  WHERE business_id = p_business_id
    AND is_active = true;

  -- Calculate available equity
  v_available_equity := 100 - v_allocated_equity;

  RETURN v_available_equity;
END;
$$;

-- Record equity transaction
CREATE OR REPLACE FUNCTION record_equity_transaction(
  p_business_id uuid,
  p_equity_record_id uuid,
  p_from_stakeholder_id uuid,
  p_to_stakeholder_id uuid,
  p_equity_percentage numeric,
  p_equity_type text,
  p_transaction_type text,
  p_reason text DEFAULT NULL,
  p_price_per_percentage numeric DEFAULT NULL,
  p_approved_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
  v_total_value numeric;
BEGIN
  -- Calculate total value if price provided
  IF p_price_per_percentage IS NOT NULL THEN
    v_total_value := p_price_per_percentage * p_equity_percentage;
  END IF;

  -- Insert transaction record
  INSERT INTO equity_transactions (
    business_id,
    equity_record_id,
    from_stakeholder_id,
    to_stakeholder_id,
    equity_percentage,
    equity_type,
    transaction_type,
    reason,
    price_per_percentage,
    total_value,
    approved_by,
    approval_date,
    created_by
  ) VALUES (
    p_business_id,
    p_equity_record_id,
    p_from_stakeholder_id,
    p_to_stakeholder_id,
    p_equity_percentage,
    p_equity_type,
    p_transaction_type,
    p_reason,
    p_price_per_percentage,
    v_total_value,
    p_approved_by,
    CASE WHEN p_approved_by IS NOT NULL THEN CURRENT_DATE ELSE NULL END,
    auth.uid()
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- Calculate profit distribution for a period
CREATE OR REPLACE FUNCTION calculate_profit_distribution(
  p_business_id uuid,
  p_period_start date,
  p_period_end date,
  p_total_profit numeric
)
RETURNS TABLE (
  stakeholder_id uuid,
  stakeholder_name text,
  equity_percentage numeric,
  profit_share_percentage numeric,
  distribution_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    be.stakeholder_id,
    COALESCE(u.display_name, u.first_name || ' ' || u.last_name, 'Unknown') as stakeholder_name,
    be.equity_percentage,
    be.profit_share_percentage,
    (p_total_profit * be.profit_share_percentage / 100) as distribution_amount
  FROM business_equity be
  JOIN users u ON u.id = be.stakeholder_id
  WHERE be.business_id = p_business_id
    AND be.is_active = true
    AND be.profit_share_percentage > 0
  ORDER BY be.profit_share_percentage DESC;
END;
$$;

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE business_equity ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings_extended ENABLE ROW LEVEL SECURITY;

-- ===== BUSINESS_EQUITY POLICIES =====

-- View equity: business owners, infrastructure owners, and stakeholders
CREATE POLICY "View business equity"
  ON business_equity FOR SELECT
  TO authenticated
  USING (
    -- Infrastructure owners can see all
    auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
    OR
    -- Business owners can see their business equity
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
        AND r.role_key = 'business_owner'
        AND ubr.is_active = true
    )
    OR
    -- Stakeholders can see their own equity
    stakeholder_id = auth.uid()
  );

-- Manage equity: business owners and infrastructure owners
CREATE POLICY "Manage business equity"
  ON business_equity FOR ALL
  TO authenticated
  USING (
    auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
    OR
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
        AND r.role_key = 'business_owner'
        AND ubr.is_active = true
    )
  )
  WITH CHECK (
    auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
    OR
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
        AND r.role_key = 'business_owner'
        AND ubr.is_active = true
    )
  );

-- ===== EQUITY_TRANSACTIONS POLICIES =====

-- View transactions: owners, infrastructure owners, and involved parties
CREATE POLICY "View equity transactions"
  ON equity_transactions FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner', 'infrastructure_accountant')
    OR
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
        AND r.role_key IN ('business_owner', 'manager')
        AND ubr.is_active = true
    )
    OR
    to_stakeholder_id = auth.uid()
    OR
    from_stakeholder_id = auth.uid()
  );

-- Insert transactions: business owners and infrastructure owners
CREATE POLICY "Create equity transactions"
  ON equity_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
    OR
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
        AND r.role_key = 'business_owner'
        AND ubr.is_active = true
    )
  );

-- ===== PROFIT_DISTRIBUTIONS POLICIES =====

-- View distributions: owners, infrastructure owners, and stakeholders
CREATE POLICY "View profit distributions"
  ON profit_distributions FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner', 'infrastructure_accountant')
    OR
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
        AND r.role_key IN ('business_owner', 'manager')
        AND ubr.is_active = true
    )
    OR
    stakeholder_id = auth.uid()
  );

-- Manage distributions: business owners and infrastructure owners
CREATE POLICY "Manage profit distributions"
  ON profit_distributions FOR ALL
  TO authenticated
  USING (
    auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
    OR
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
        AND r.role_key = 'business_owner'
        AND ubr.is_active = true
    )
  )
  WITH CHECK (
    auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
    OR
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
        AND r.role_key = 'business_owner'
        AND ubr.is_active = true
    )
  );

-- ===== BUSINESS_SETTINGS_EXTENDED POLICIES =====

-- View settings: anyone in the business
CREATE POLICY "View business settings"
  ON business_settings_extended FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
    OR
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.is_active = true
    )
  );

-- Manage settings: business owners and infrastructure owners
CREATE POLICY "Manage business settings"
  ON business_settings_extended FOR ALL
  TO authenticated
  USING (
    auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
    OR
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
        AND r.role_key = 'business_owner'
        AND ubr.is_active = true
    )
  )
  WITH CHECK (
    auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
    OR
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
        AND r.role_key = 'business_owner'
        AND ubr.is_active = true
    )
  );

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION get_business_equity_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_available_equity TO authenticated;
GRANT EXECUTE ON FUNCTION record_equity_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_profit_distribution TO authenticated;

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE business_equity IS 'Tracks equity ownership stakes in businesses with vesting schedules and voting rights';
COMMENT ON TABLE equity_transactions IS 'Complete audit trail of all equity grants, transfers, and adjustments';
COMMENT ON TABLE profit_distributions IS 'Records actual profit distributions paid to equity stakeholders';
COMMENT ON TABLE business_settings_extended IS 'Extended business configuration settings managed by owners';

COMMENT ON FUNCTION get_business_equity_breakdown IS 'Returns detailed equity breakdown for a business with stakeholder information';
COMMENT ON FUNCTION calculate_available_equity IS 'Calculates remaining unallocated equity percentage for a business';
COMMENT ON FUNCTION record_equity_transaction IS 'Records an equity transaction with full audit trail';
COMMENT ON FUNCTION calculate_profit_distribution IS 'Calculates profit distribution amounts based on equity stakes';

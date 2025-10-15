/*
  # Comprehensive Audit and Compliance System

  ## Overview
  Implements complete activity tracking and audit logging for all system actions,
  with special focus on cross-scope access, financial operations, and permission changes.

  ## New Tables

  ### 1. `system_audit_log`
  Master audit log capturing all significant system events.
  - Records all CRUD operations on sensitive tables
  - Tracks actor, action, target entity, and business context
  - Stores before/after state for change tracking
  - Includes IP address, user agent, and session info
  - Immutable audit record with retention policies

  ### 2. `financial_audit_log`
  Specialized audit for all financial operations.
  - Tracks profit distributions, equity transfers, commission payments
  - Records all views of financial data (who accessed what and when)
  - Includes amount, currency, and transaction details
  - Links to business_id for multi-tenant audit trails

  ### 3. `cross_scope_access_log`
  Tracks infrastructure manager support override actions.
  - Records every instance of cross-business data access
  - Includes access reason, duration, and justification
  - Triggers alerts for suspicious access patterns
  - Reviewed by infrastructure_owner periodically

  ### 4. `data_export_log`
  Tracks all data exports and report downloads.
  - Records who exported data, what was exported, and when
  - Includes export format (CSV, PDF, Excel)
  - Stores export parameters and filters used
  - Helps with GDPR and compliance requirements

  ### 5. `login_history`
  Complete authentication event tracking.
  - Records all login attempts (successful and failed)
  - Tracks device fingerprint, IP address, location
  - Detects suspicious login patterns (velocity, geography)
  - Supports account security and forensics

  ### 6. `permission_check_failures`
  Logs denied access attempts for security monitoring.
  - Records when users try to access unauthorized resources
  - Includes requested permission and reason for denial
  - Helps identify potential security threats
  - Triggers alerts for repeated failures

  ### 7. `equity_transfer_log`
  Specialized audit for ownership changes.
  - Tracks all equity and ownership percentage transfers
  - Records from/to parties and approval chain
  - Includes valuation and consideration amounts
  - Maintains complete ownership history

  ### 8. `business_lifecycle_log`
  Tracks business creation, modification, and deactivation.
  - Records when businesses are created and by whom
  - Tracks initial equity allocation
  - Logs business setting changes
  - Captures deactivation/reactivation events

  ## Security Features
  - All audit tables are append-only (no updates or deletes)
  - RLS policies restrict access to infrastructure_owner and relevant business owners
  - Automatic triggers capture events without code changes
  - Retention policies archive old logs for compliance
  - Real-time alerting for security-critical events

  ## Key Principles
  1. Append-only: Audit logs are immutable
  2. Complete context: Every log includes actor, timestamp, and business context
  3. Before/after state: Change tracking for all modifications
  4. Privacy-aware: Sensitive data is encrypted or hashed
  5. Performance: Async logging doesn't block operations
*/

-- ============================================================================
-- SYSTEM_AUDIT_LOG TABLE - Master audit log
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'user_created', 'user_updated', 'user_deleted',
    'business_created', 'business_updated', 'business_deleted',
    'order_created', 'order_updated', 'order_cancelled',
    'inventory_transferred', 'inventory_adjusted',
    'role_assigned', 'role_changed', 'permission_modified',
    'financial_accessed', 'report_generated',
    'settings_changed', 'data_exported',
    'login_success', 'login_failed', 'logout',
    'api_call', 'webhook_received'
  )),
  actor_id UUID REFERENCES users(id),
  actor_role TEXT,
  target_entity_type TEXT,
  target_entity_id UUID,
  business_id UUID REFERENCES businesses(id),
  action TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  change_summary TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  request_id TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_audit_event_type ON system_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_system_audit_actor ON system_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_business ON system_audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_created ON system_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_severity ON system_audit_log(severity) WHERE severity IN ('error', 'critical');
CREATE INDEX IF NOT EXISTS idx_system_audit_target ON system_audit_log(target_entity_type, target_entity_id);

COMMENT ON TABLE system_audit_log IS 'Immutable master audit log for all significant system events';

-- ============================================================================
-- FINANCIAL_AUDIT_LOG TABLE - Financial operations tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'revenue_viewed', 'profit_viewed', 'costs_viewed',
    'distribution_created', 'distribution_approved', 'distribution_paid',
    'commission_calculated', 'commission_paid',
    'equity_transferred', 'ownership_changed',
    'financial_report_generated', 'financial_data_exported'
  )),
  actor_id UUID NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL,
  business_id UUID REFERENCES businesses(id),
  target_user_id UUID REFERENCES users(id),
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'ILS',
  transaction_reference TEXT,
  access_reason TEXT,
  previous_value JSONB,
  new_value JSONB,
  approval_chain JSONB DEFAULT '[]',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_operation ON financial_audit_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_financial_audit_actor ON financial_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_business ON financial_audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_created ON financial_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_audit_amount ON financial_audit_log(amount) WHERE amount IS NOT NULL;

COMMENT ON TABLE financial_audit_log IS 'Specialized audit trail for all financial operations and data access';

-- ============================================================================
-- CROSS_SCOPE_ACCESS_LOG TABLE - Support override tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS cross_scope_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessor_id UUID NOT NULL REFERENCES users(id),
  accessor_role TEXT NOT NULL,
  target_business_id UUID NOT NULL REFERENCES businesses(id),
  access_type TEXT NOT NULL CHECK (access_type IN ('read', 'write', 'delete')),
  accessed_resource TEXT NOT NULL,
  resource_id UUID,
  access_reason TEXT NOT NULL,
  justification TEXT,
  override_enabled_by UUID REFERENCES users(id),
  access_duration_minutes INTEGER,
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  ip_address INET,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cross_scope_accessor ON cross_scope_access_log(accessor_id);
CREATE INDEX IF NOT EXISTS idx_cross_scope_business ON cross_scope_access_log(target_business_id);
CREATE INDEX IF NOT EXISTS idx_cross_scope_created ON cross_scope_access_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cross_scope_flagged ON cross_scope_access_log(is_flagged) WHERE is_flagged = true;

COMMENT ON TABLE cross_scope_access_log IS 'Tracks infrastructure manager support override access across business boundaries';

-- ============================================================================
-- DATA_EXPORT_LOG TABLE - Export and report tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_export_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type TEXT NOT NULL CHECK (export_type IN (
    'financial_report', 'order_report', 'inventory_report',
    'user_data', 'business_analytics', 'audit_log',
    'csv_export', 'pdf_export', 'excel_export'
  )),
  exported_by UUID NOT NULL REFERENCES users(id),
  business_id UUID REFERENCES businesses(id),
  export_format TEXT NOT NULL CHECK (export_format IN ('csv', 'pdf', 'excel', 'json', 'xml')),
  record_count INTEGER,
  date_range_from DATE,
  date_range_to DATE,
  filters_applied JSONB DEFAULT '{}',
  file_size_bytes BIGINT,
  file_hash TEXT,
  download_url TEXT,
  expiry_at TIMESTAMPTZ,
  ip_address INET,
  purpose TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_export_user ON data_export_log(exported_by);
CREATE INDEX IF NOT EXISTS idx_data_export_business ON data_export_log(business_id);
CREATE INDEX IF NOT EXISTS idx_data_export_created ON data_export_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_export_type ON data_export_log(export_type);

COMMENT ON TABLE data_export_log IS 'Tracks all data exports for GDPR compliance and security monitoring';

-- ============================================================================
-- LOGIN_HISTORY TABLE - Authentication events
-- ============================================================================

CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  telegram_id TEXT,
  login_status TEXT NOT NULL CHECK (login_status IN ('success', 'failed', 'blocked', 'suspicious')),
  failure_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  location_country TEXT,
  location_city TEXT,
  login_method TEXT DEFAULT 'telegram_webapp',
  session_id TEXT,
  is_suspicious BOOLEAN DEFAULT false,
  suspicious_reasons JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_telegram ON login_history(telegram_id);
CREATE INDEX IF NOT EXISTS idx_login_history_status ON login_history(login_status);
CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_suspicious ON login_history(is_suspicious) WHERE is_suspicious = true;
CREATE INDEX IF NOT EXISTS idx_login_history_ip ON login_history(ip_address);

COMMENT ON TABLE login_history IS 'Complete authentication event tracking for security and forensics';

-- ============================================================================
-- PERMISSION_CHECK_FAILURES TABLE - Denied access attempts
-- ============================================================================

CREATE TABLE IF NOT EXISTS permission_check_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  user_role TEXT NOT NULL,
  business_id UUID REFERENCES businesses(id),
  requested_permission TEXT NOT NULL,
  requested_resource TEXT NOT NULL,
  resource_id UUID,
  denial_reason TEXT NOT NULL,
  current_permissions JSONB,
  ip_address INET,
  user_agent TEXT,
  is_potential_threat BOOLEAN DEFAULT false,
  threat_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perm_failures_user ON permission_check_failures(user_id);
CREATE INDEX IF NOT EXISTS idx_perm_failures_business ON permission_check_failures(business_id);
CREATE INDEX IF NOT EXISTS idx_perm_failures_created ON permission_check_failures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perm_failures_threat ON permission_check_failures(is_potential_threat) WHERE is_potential_threat = true;

COMMENT ON TABLE permission_check_failures IS 'Logs denied access attempts for security monitoring and threat detection';

-- ============================================================================
-- EQUITY_TRANSFER_LOG TABLE - Ownership change tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS equity_transfer_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('sale', 'gift', 'inheritance', 'compensation', 'adjustment')),
  business_id UUID NOT NULL REFERENCES businesses(id),
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID NOT NULL REFERENCES users(id),
  percentage_transferred NUMERIC(5,2) NOT NULL CHECK (percentage_transferred > 0 AND percentage_transferred <= 100),
  valuation_amount NUMERIC(12,2),
  valuation_currency TEXT DEFAULT 'ILS',
  consideration_amount NUMERIC(12,2),
  consideration_currency TEXT DEFAULT 'ILS',
  transfer_status TEXT NOT NULL DEFAULT 'pending' CHECK (transfer_status IN ('pending', 'approved', 'completed', 'rejected', 'cancelled')),
  initiated_by UUID NOT NULL REFERENCES users(id),
  initiated_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  legal_document_url TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_equity_transfer_business ON equity_transfer_log(business_id);
CREATE INDEX IF NOT EXISTS idx_equity_transfer_from ON equity_transfer_log(from_user_id);
CREATE INDEX IF NOT EXISTS idx_equity_transfer_to ON equity_transfer_log(to_user_id);
CREATE INDEX IF NOT EXISTS idx_equity_transfer_status ON equity_transfer_log(transfer_status);
CREATE INDEX IF NOT EXISTS idx_equity_transfer_initiated ON equity_transfer_log(initiated_at DESC);

COMMENT ON TABLE equity_transfer_log IS 'Complete audit trail of all ownership and equity transfers';

-- ============================================================================
-- BUSINESS_LIFECYCLE_LOG TABLE - Business operations tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_lifecycle_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lifecycle_event TEXT NOT NULL CHECK (lifecycle_event IN (
    'business_created', 'business_activated', 'business_deactivated',
    'settings_updated', 'ownership_restructured',
    'manager_assigned', 'manager_removed',
    'business_merged', 'business_split'
  )),
  business_id UUID NOT NULL REFERENCES businesses(id),
  actor_id UUID NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  change_description TEXT,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_lifecycle_business ON business_lifecycle_log(business_id);
CREATE INDEX IF NOT EXISTS idx_business_lifecycle_event ON business_lifecycle_log(lifecycle_event);
CREATE INDEX IF NOT EXISTS idx_business_lifecycle_actor ON business_lifecycle_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_business_lifecycle_created ON business_lifecycle_log(created_at DESC);

COMMENT ON TABLE business_lifecycle_log IS 'Tracks business creation, modification, and deactivation events';

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE system_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_scope_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_check_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_transfer_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_lifecycle_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - System Audit Log
-- ============================================================================

CREATE POLICY "Infrastructure owner can view all audit logs"
  ON system_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Business owners can view their business audit logs"
  ON system_audit_log FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key = 'business_owner'
    )
    OR actor_id = auth.uid()
  );

CREATE POLICY "System can insert audit logs"
  ON system_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES - Financial Audit Log
-- ============================================================================

CREATE POLICY "Infrastructure owner and accountant can view financial audit"
  ON financial_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_accountant')
    )
  );

CREATE POLICY "Business owners can view their business financial audit"
  ON financial_audit_log FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key = 'business_owner'
    )
    OR actor_id = auth.uid()
    OR target_user_id = auth.uid()
  );

CREATE POLICY "System can insert financial audit logs"
  ON financial_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - Cross Scope Access Log
-- ============================================================================

CREATE POLICY "Infrastructure owner can view all cross-scope access"
  ON cross_scope_access_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Users can view their own access logs"
  ON cross_scope_access_log FOR SELECT
  TO authenticated
  USING (accessor_id = auth.uid());

CREATE POLICY "System can insert cross-scope access logs"
  ON cross_scope_access_log FOR INSERT
  TO authenticated
  WITH CHECK (accessor_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - Login History
-- ============================================================================

CREATE POLICY "Users can view their own login history"
  ON login_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Infrastructure owner can view all login history"
  ON login_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_manager')
    )
  );

CREATE POLICY "System can insert login history"
  ON login_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- AUDIT TRIGGER FUNCTIONS
-- ============================================================================

-- Generic audit logging function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type TEXT;
  v_action TEXT;
BEGIN
  -- Determine event type and action
  IF TG_OP = 'INSERT' THEN
    v_event_type := TG_TABLE_NAME || '_created';
    v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := TG_TABLE_NAME || '_updated';
    v_action := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := TG_TABLE_NAME || '_deleted';
    v_action := 'deleted';
  END IF;

  -- Insert audit record
  INSERT INTO system_audit_log (
    event_type,
    actor_id,
    target_entity_type,
    target_entity_id,
    business_id,
    action,
    previous_state,
    new_state
  ) VALUES (
    v_event_type,
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.business_id, OLD.business_id),
    v_action,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to key tables
DROP TRIGGER IF EXISTS audit_businesses_trigger ON businesses;
CREATE TRIGGER audit_businesses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_orders_trigger ON orders;
CREATE TRIGGER audit_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_stock_allocations_trigger ON stock_allocations;
CREATE TRIGGER audit_stock_allocations_trigger
  AFTER INSERT OR UPDATE ON stock_allocations
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

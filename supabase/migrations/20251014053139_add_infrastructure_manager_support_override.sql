/*
  # Infrastructure Manager Support Override System

  ## Overview
  Implements temporary privilege escalation for Infrastructure Managers to provide support
  across businesses. All override actions are fully audited and time-limited.

  ## New Tables

  ### 1. support_override_sessions
  Tracks active and historical support override sessions with:
  - Time-limited activation (default 30 minutes)
  - Business scope restriction
  - Reason requirement for audit trail
  - Auto-expiration
  - Manual deactivation capability

  ### 2. support_override_actions
  Logs every action taken during an override session:
  - What was accessed/modified
  - Entity type and ID
  - Action taken (read, update, create, delete)
  - Before/after state for modifications
  - Timestamp and business context

  ## Security Features
  - Only infrastructure_manager role can activate overrides
  - Must provide business_id and reason
  - Automatic expiration after time limit
  - Cannot override into infrastructure_owner permissions
  - Complete audit trail of all actions
  - Infrastructure Owner can view all override sessions

  ## Key Principles
  1. Support override is temporary and time-boxed
  2. All actions are logged for compliance
  3. Business owners are notified of override activations
  4. Override cannot be used for financial operations
  5. Sessions auto-expire and require re-activation
*/

-- ============================================================================
-- SUPPORT_OVERRIDE_SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_override_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  override_scope TEXT[] DEFAULT ARRAY['read', 'update', 'support'],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'deactivated', 'revoked')),
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES users(id),
  deactivation_reason TEXT,
  actions_count INTEGER DEFAULT 0,
  last_action_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (expires_at > activated_at)
);

CREATE INDEX IF NOT EXISTS idx_support_override_manager ON support_override_sessions(manager_id);
CREATE INDEX IF NOT EXISTS idx_support_override_business ON support_override_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_support_override_status ON support_override_sessions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_support_override_active ON support_override_sessions(manager_id, status) 
  WHERE status = 'active';

COMMENT ON TABLE support_override_sessions IS 'Time-limited privilege escalation sessions for Infrastructure Manager support';
COMMENT ON COLUMN support_override_sessions.override_scope IS 'Allowed actions during override: read, update, support (no financial, no delete)';

-- ============================================================================
-- SUPPORT_OVERRIDE_ACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_override_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES support_override_sessions(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('read', 'update', 'create', 'support_assist')),
  target_entity_type TEXT NOT NULL,
  target_entity_id UUID,
  query_performed TEXT,
  previous_state JSONB,
  new_state JSONB,
  action_details TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_override_actions_session ON support_override_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_override_actions_manager ON support_override_actions(manager_id);
CREATE INDEX IF NOT EXISTS idx_override_actions_business ON support_override_actions(business_id);
CREATE INDEX IF NOT EXISTS idx_override_actions_performed ON support_override_actions(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_override_actions_entity ON support_override_actions(target_entity_type, target_entity_id);

COMMENT ON TABLE support_override_actions IS 'Audit log of all actions performed during support override sessions';

-- ============================================================================
-- SUPPORT OVERRIDE HELPER FUNCTIONS
-- ============================================================================

-- Function to activate support override session
CREATE OR REPLACE FUNCTION activate_support_override(
  p_business_id UUID,
  p_reason TEXT,
  p_duration_minutes INTEGER DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_manager_id UUID;
  v_manager_role TEXT;
  v_session_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get and validate manager
  SELECT id, role INTO v_manager_id, v_manager_role
  FROM users
  WHERE id = auth.uid();

  IF v_manager_role != 'infrastructure_manager' THEN
    RAISE EXCEPTION 'Only Infrastructure Managers can activate support override';
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Support override reason must be at least 10 characters';
  END IF;

  -- Validate duration (max 2 hours)
  IF p_duration_minutes > 120 OR p_duration_minutes < 5 THEN
    RAISE EXCEPTION 'Duration must be between 5 and 120 minutes';
  END IF;

  -- Calculate expiration
  v_expires_at := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;

  -- Create session
  INSERT INTO support_override_sessions (
    manager_id,
    business_id,
    reason,
    expires_at,
    override_scope,
    metadata
  ) VALUES (
    v_manager_id,
    p_business_id,
    p_reason,
    v_expires_at,
    ARRAY['read', 'update', 'support'],
    jsonb_build_object(
      'duration_minutes', p_duration_minutes,
      'activated_by_role', v_manager_role
    )
  )
  RETURNING id INTO v_session_id;

  -- Notify business owner
  INSERT INTO notifications (
    recipient_id,
    title,
    message,
    type,
    metadata
  )
  SELECT 
    u.telegram_id,
    'Support Override Activated',
    'Infrastructure Manager has activated support access to your business: ' || p_reason,
    'info',
    jsonb_build_object(
      'session_id', v_session_id,
      'manager_id', v_manager_id,
      'business_id', p_business_id,
      'expires_at', v_expires_at
    )
  FROM users u
  JOIN user_business_roles ubr ON ubr.user_id = u.id
  JOIN roles r ON r.id = ubr.role_id
  WHERE ubr.business_id = p_business_id
    AND r.role_key = 'business_owner'
    AND ubr.is_active = true;

  RETURN v_session_id;
END;
$$;

COMMENT ON FUNCTION activate_support_override IS 'Activates a time-limited support override session for Infrastructure Manager';

-- Function to deactivate support override
CREATE OR REPLACE FUNCTION deactivate_support_override(
  p_session_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_manager_id UUID;
BEGIN
  v_manager_id := auth.uid();

  UPDATE support_override_sessions
  SET 
    status = 'deactivated',
    deactivated_at = NOW(),
    deactivated_by = v_manager_id,
    deactivation_reason = p_reason
  WHERE id = p_session_id
    AND manager_id = v_manager_id
    AND status = 'active';

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION deactivate_support_override IS 'Manually deactivates an active support override session';

-- Function to check if manager has active override for business
CREATE OR REPLACE FUNCTION has_active_support_override(
  p_manager_id UUID,
  p_business_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM support_override_sessions
    WHERE manager_id = p_manager_id
      AND business_id = p_business_id
      AND status = 'active'
      AND expires_at > NOW()
  );
END;
$$;

COMMENT ON FUNCTION has_active_support_override IS 'Checks if manager has an active override session for business';

-- Function to log support override action
CREATE OR REPLACE FUNCTION log_support_override_action(
  p_session_id UUID,
  p_action_type TEXT,
  p_target_entity_type TEXT,
  p_target_entity_id UUID DEFAULT NULL,
  p_action_details TEXT DEFAULT NULL,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action_id UUID;
  v_manager_id UUID;
  v_business_id UUID;
BEGIN
  -- Get session details
  SELECT manager_id, business_id
  INTO v_manager_id, v_business_id
  FROM support_override_sessions
  WHERE id = p_session_id
    AND status = 'active'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active override session found';
  END IF;

  -- Log action
  INSERT INTO support_override_actions (
    session_id,
    manager_id,
    business_id,
    action_type,
    target_entity_type,
    target_entity_id,
    action_details,
    previous_state,
    new_state
  ) VALUES (
    p_session_id,
    v_manager_id,
    v_business_id,
    p_action_type,
    p_target_entity_type,
    p_target_entity_id,
    p_action_details,
    p_previous_state,
    p_new_state
  )
  RETURNING id INTO v_action_id;

  -- Update session action count
  UPDATE support_override_sessions
  SET 
    actions_count = actions_count + 1,
    last_action_at = NOW()
  WHERE id = p_session_id;

  RETURN v_action_id;
END;
$$;

COMMENT ON FUNCTION log_support_override_action IS 'Logs an action performed during support override session';

-- Function to auto-expire old sessions
CREATE OR REPLACE FUNCTION expire_old_support_override_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE support_override_sessions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at <= NOW();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN v_expired_count;
END;
$$;

COMMENT ON FUNCTION expire_old_support_override_sessions IS 'Automatically expires support override sessions past their time limit';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE support_override_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_override_actions ENABLE ROW LEVEL SECURITY;

-- Sessions: Managers can view own sessions, Infra Owner sees all
CREATE POLICY "Managers can view own override sessions"
  ON support_override_sessions FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
    OR business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND r.role_key = 'business_owner'
      AND ubr.is_active = true
    )
  );

-- Sessions: Only managers can create own sessions
CREATE POLICY "Managers can create override sessions"
  ON support_override_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_manager'
    )
  );

-- Sessions: Managers can deactivate own sessions
CREATE POLICY "Managers can update own override sessions"
  ON support_override_sessions FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- Actions: View same as sessions
CREATE POLICY "View support override actions"
  ON support_override_actions FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_manager')
    )
    OR business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND r.role_key = 'business_owner'
      AND ubr.is_active = true
    )
  );

-- Actions: System can insert (via function)
CREATE POLICY "System can log override actions"
  ON support_override_actions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- SCHEDULED JOB (Note: Requires pg_cron extension in production)
-- ============================================================================

COMMENT ON FUNCTION expire_old_support_override_sessions IS 
'Run this function periodically (e.g., every 5 minutes) to auto-expire sessions. 
In production, use pg_cron:
SELECT cron.schedule(''expire-support-overrides'', ''*/5 * * * *'', ''SELECT expire_old_support_override_sessions()'');';

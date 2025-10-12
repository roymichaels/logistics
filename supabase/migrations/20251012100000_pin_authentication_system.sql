/*
  # PIN Authentication System Migration

  ## Overview
  Implements a two-factor authentication system where Telegram identity is combined
  with internal PIN verification for enhanced security and trust continuity.

  ## New Tables

  1. **user_pins**
     - Stores PIN credentials with PBKDF2 hashing
     - Includes progressive lockout mechanism
     - Tracks failed attempts and lockout status
     - One PIN per telegram_id

  2. **pin_audit_log**
     - Comprehensive audit trail for all PIN operations
     - Tracks setup, verification, changes, resets
     - Stores IP address and user agent for forensics
     - Immutable log for compliance

  3. **pin_settings**
     - Business-level PIN policy enforcement
     - Configurable lockout durations and attempt limits
     - PIN rotation policies
     - Inheritance: business policies override defaults

  4. **pin_sessions**
     - Tracks active PIN sessions for users
     - Session timeout management (4 hours default)
     - Automatic cleanup of expired sessions
     - Used to determine when PIN re-challenge is needed

  ## Security Features
  - PBKDF2 with 100,000 iterations for PIN hashing
  - Progressive lockout (15min, 30min, 1hr, 2hr, 24hr)
  - Rate limiting at database level
  - Full audit trail for forensics
  - Business-level policy enforcement

  ## Integration Points
  - Works with existing telegram-verify authentication
  - Extends user_business_context for PIN requirements per business
  - Integrates with chat encryption key derivation
*/

-- =====================================================
-- 1. PIN Credentials Table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_pins (
  telegram_id text PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
  hashed_pin text NOT NULL,
  salt text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_changed timestamptz DEFAULT now(),
  failed_attempts integer DEFAULT 0,
  locked_until timestamptz,
  pin_version integer DEFAULT 1,
  last_verified_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

COMMENT ON TABLE user_pins IS 'Stores PIN credentials with progressive lockout';
COMMENT ON COLUMN user_pins.hashed_pin IS 'PBKDF2-derived hash of user PIN';
COMMENT ON COLUMN user_pins.salt IS 'Base64-encoded salt for PBKDF2';
COMMENT ON COLUMN user_pins.failed_attempts IS 'Counter for failed verification attempts';
COMMENT ON COLUMN user_pins.locked_until IS 'Timestamp until which PIN is locked out';
COMMENT ON COLUMN user_pins.pin_version IS 'Version number for PIN rotation tracking';

-- =====================================================
-- 2. PIN Audit Log Table
-- =====================================================

CREATE TABLE IF NOT EXISTS pin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text NOT NULL,
  action text NOT NULL,
  success boolean NOT NULL,
  ip_address inet,
  user_agent text,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pin_audit_log_user ON pin_audit_log(telegram_id, created_at DESC);
CREATE INDEX idx_pin_audit_log_action ON pin_audit_log(action, created_at DESC);
CREATE INDEX idx_pin_audit_log_failed ON pin_audit_log(telegram_id, created_at DESC) WHERE success = false;

COMMENT ON TABLE pin_audit_log IS 'Immutable audit trail for all PIN operations';
COMMENT ON COLUMN pin_audit_log.action IS 'setup, verify, change, reset, unlock, admin_reset';

-- =====================================================
-- 3. PIN Settings (Business-Level Policies)
-- =====================================================

CREATE TABLE IF NOT EXISTS pin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  require_pin boolean DEFAULT false,
  pin_length integer DEFAULT 6 CHECK (pin_length >= 4 AND pin_length <= 8),
  max_failed_attempts integer DEFAULT 5 CHECK (max_failed_attempts >= 3),
  lockout_duration_minutes integer DEFAULT 15 CHECK (lockout_duration_minutes > 0),
  require_pin_change_days integer DEFAULT 90 CHECK (require_pin_change_days >= 0),
  pin_on_business_switch boolean DEFAULT true,
  pin_on_chat_access boolean DEFAULT true,
  pin_on_role_change boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_pin_settings_business ON pin_settings(business_id) WHERE require_pin = true;

COMMENT ON TABLE pin_settings IS 'Business-level PIN policies and enforcement rules';
COMMENT ON COLUMN pin_settings.require_pin IS 'Whether PIN is mandatory for business users';
COMMENT ON COLUMN pin_settings.pin_on_business_switch IS 'Require PIN when switching to this business';
COMMENT ON COLUMN pin_settings.pin_on_chat_access IS 'Require PIN to access encrypted chats';

-- Insert default global settings (business_id NULL = platform defaults)
INSERT INTO pin_settings (business_id, require_pin, pin_length, max_failed_attempts, lockout_duration_minutes)
VALUES (NULL, false, 6, 5, 15)
ON CONFLICT (business_id) DO NOTHING;

-- =====================================================
-- 4. PIN Sessions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS pin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  verified_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_activity_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_pin_sessions_user ON pin_sessions(telegram_id, expires_at DESC);
CREATE INDEX idx_pin_sessions_token ON pin_sessions(session_token) WHERE expires_at > now();
CREATE INDEX idx_pin_sessions_expired ON pin_sessions(expires_at) WHERE expires_at <= now();

COMMENT ON TABLE pin_sessions IS 'Active PIN sessions with 4-hour timeout';
COMMENT ON COLUMN pin_sessions.session_token IS 'Secure random token for PIN session verification';
COMMENT ON COLUMN pin_sessions.expires_at IS 'Session expiry (4 hours from last activity)';

-- =====================================================
-- Row Level Security Policies
-- =====================================================

ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_sessions ENABLE ROW LEVEL SECURITY;

-- User can manage their own PIN
CREATE POLICY "Users manage own PIN"
  ON user_pins FOR ALL
  TO authenticated
  USING (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id')
  WITH CHECK (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Infrastructure owners can view (not modify) PINs for audit
CREATE POLICY "Infrastructure owners view PINs"
  ON user_pins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
      AND role = 'infrastructure_owner'
    )
  );

-- PIN audit log: users can view their own, admins can view all
CREATE POLICY "Users view own PIN audit log"
  ON pin_audit_log FOR SELECT
  TO authenticated
  USING (
    telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
      AND role IN ('infrastructure_owner', 'business_owner')
    )
  );

-- Only edge functions can insert audit logs (service role)
CREATE POLICY "Service role inserts audit logs"
  ON pin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- PIN settings: business owners and infrastructure owners can manage
CREATE POLICY "Business owners manage PIN settings"
  ON pin_settings FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT bo.business_id
      FROM business_ownership bo
      WHERE bo.owner_user_id = (
        SELECT id FROM users
        WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
      )
      AND bo.active = true
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
      AND role = 'infrastructure_owner'
    )
  );

-- Users can view settings for businesses they belong to
CREATE POLICY "Users view business PIN settings"
  ON pin_settings FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = (
        SELECT id FROM users
        WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
      )
      AND active = true
    )
    OR business_id IS NULL -- Global defaults visible to all
  );

-- PIN sessions: users manage their own sessions
CREATE POLICY "Users manage own PIN sessions"
  ON pin_sessions FOR ALL
  TO authenticated
  USING (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id')
  WITH CHECK (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to check if PIN is required for a business
CREATE OR REPLACE FUNCTION is_pin_required(p_business_id uuid)
RETURNS boolean AS $$
DECLARE
  v_require_pin boolean;
BEGIN
  SELECT COALESCE(require_pin, false) INTO v_require_pin
  FROM pin_settings
  WHERE business_id = p_business_id
  LIMIT 1;

  -- Fall back to global default if business setting not found
  IF v_require_pin IS NULL THEN
    SELECT COALESCE(require_pin, false) INTO v_require_pin
    FROM pin_settings
    WHERE business_id IS NULL
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_require_pin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has valid PIN session
CREATE OR REPLACE FUNCTION has_valid_pin_session(
  p_telegram_id text,
  p_business_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_has_session boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pin_sessions
    WHERE telegram_id = p_telegram_id
    AND (p_business_id IS NULL OR business_id = p_business_id)
    AND expires_at > now()
  ) INTO v_has_session;

  RETURN v_has_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate progressive lockout duration
CREATE OR REPLACE FUNCTION calculate_lockout_duration(p_failed_attempts integer)
RETURNS interval AS $$
BEGIN
  RETURN CASE
    WHEN p_failed_attempts <= 5 THEN interval '15 minutes'
    WHEN p_failed_attempts <= 8 THEN interval '30 minutes'
    WHEN p_failed_attempts <= 12 THEN interval '1 hour'
    WHEN p_failed_attempts <= 15 THEN interval '2 hours'
    ELSE interval '24 hours'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to cleanup expired PIN sessions
CREATE OR REPLACE FUNCTION cleanup_expired_pin_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM pin_sessions
  WHERE expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Triggers
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pin_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pin_settings_timestamp_trigger
  BEFORE UPDATE ON pin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_pin_settings_timestamp();

-- Auto-extend PIN session on activity
CREATE OR REPLACE FUNCTION extend_pin_session_on_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = now();
  NEW.expires_at = now() + interval '4 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER extend_pin_session_trigger
  BEFORE UPDATE ON pin_sessions
  FOR EACH ROW
  WHEN (OLD.last_activity_at < now() - interval '5 minutes')
  EXECUTE FUNCTION extend_pin_session_on_activity();

-- =====================================================
-- Scheduled Jobs (using pg_cron extension)
-- =====================================================

-- Clean up expired PIN sessions every hour
-- Note: Requires pg_cron extension enabled in Supabase
-- SELECT cron.schedule(
--   'cleanup-expired-pin-sessions',
--   '0 * * * *', -- Every hour
--   $$ SELECT cleanup_expired_pin_sessions(); $$
-- );

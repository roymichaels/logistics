/*
  # PIN Authentication System Migration

  ## New Tables
  1. user_pins - PIN credentials with PBKDF2 hashing
  2. pin_audit_log - Audit trail for PIN operations
  3. pin_settings - Business-level PIN policies
  4. pin_sessions - Active PIN session tracking

  ## Security
  - PBKDF2 with 100,000 iterations
  - Progressive lockout mechanism
  - Full RLS policies
*/

-- PIN Credentials Table
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

-- PIN Audit Log
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

CREATE INDEX IF NOT EXISTS idx_pin_audit_log_user ON pin_audit_log(telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pin_audit_log_action ON pin_audit_log(action, created_at DESC);

-- PIN Settings
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

INSERT INTO pin_settings (business_id, require_pin, pin_length, max_failed_attempts, lockout_duration_minutes)
VALUES (NULL, false, 6, 5, 15)
ON CONFLICT (business_id) DO NOTHING;

-- PIN Sessions
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

CREATE INDEX IF NOT EXISTS idx_pin_sessions_user ON pin_sessions(telegram_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_pin_sessions_token ON pin_sessions(session_token);

-- RLS
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_sessions ENABLE ROW LEVEL SECURITY;

-- Users manage own PIN
DROP POLICY IF EXISTS "Users manage own PIN" ON user_pins;
CREATE POLICY "Users manage own PIN"
  ON user_pins FOR ALL
  TO authenticated
  USING (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id')
  WITH CHECK (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Infrastructure owners view PINs
DROP POLICY IF EXISTS "Infrastructure owners view PINs" ON user_pins;
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

-- Users view own audit log
DROP POLICY IF EXISTS "Users view own PIN audit log" ON pin_audit_log;
CREATE POLICY "Users view own PIN audit log"
  ON pin_audit_log FOR SELECT
  TO authenticated
  USING (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Service inserts audit logs
DROP POLICY IF EXISTS "Service role inserts audit logs" ON pin_audit_log;
CREATE POLICY "Service role inserts audit logs"
  ON pin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Business owners manage PIN settings
DROP POLICY IF EXISTS "Business owners manage PIN settings" ON pin_settings;
CREATE POLICY "Business owners manage PIN settings"
  ON pin_settings FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id
      FROM business_users
      WHERE user_id = (
        SELECT telegram_id FROM users
        WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
      )
      AND role = 'business_owner'
      AND active = true
    )
  );

-- Users view business PIN settings
DROP POLICY IF EXISTS "Users view business PIN settings" ON pin_settings;
CREATE POLICY "Users view business PIN settings"
  ON pin_settings FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = (
        SELECT telegram_id FROM users
        WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
      )
      AND active = true
    )
    OR business_id IS NULL
  );

-- Users manage own sessions
DROP POLICY IF EXISTS "Users manage own PIN sessions" ON pin_sessions;
CREATE POLICY "Users manage own PIN sessions"
  ON pin_sessions FOR ALL
  TO authenticated
  USING (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id')
  WITH CHECK (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Helper Functions
CREATE OR REPLACE FUNCTION is_pin_required(p_business_id uuid)
RETURNS boolean AS $$
DECLARE
  v_require_pin boolean;
BEGIN
  SELECT COALESCE(require_pin, false) INTO v_require_pin
  FROM pin_settings
  WHERE business_id = p_business_id;
  
  IF v_require_pin IS NULL THEN
    SELECT COALESCE(require_pin, false) INTO v_require_pin
    FROM pin_settings
    WHERE business_id IS NULL;
  END IF;
  
  RETURN COALESCE(v_require_pin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_valid_pin_session(p_telegram_id text, p_business_id uuid DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pin_sessions
    WHERE telegram_id = p_telegram_id
    AND (p_business_id IS NULL OR business_id = p_business_id)
    AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
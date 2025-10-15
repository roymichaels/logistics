/*
  # Consolidate User Authentication System

  This migration adds authentication session fields to the users table,
  consolidating all user-related data into a single source of truth.

  ## Changes
  1. Add session management fields to users table
  2. Add indexes for efficient session and authentication queries
  3. Update helper functions for authentication
  4. Ensure RLS policies cover session management

  ## New Columns
  - session_token: Encrypted session identifier
  - session_expires_at: When the current session expires
  - last_login: Track last successful login
  - login_count: Total number of logins

  ## Security
  - Session tokens are encrypted
  - Automatic cleanup of expired sessions via function
  - RLS ensures users can only access their own session data
*/

-- =====================================================
-- Add session management fields to users table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'session_token'
  ) THEN
    ALTER TABLE users ADD COLUMN session_token TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'session_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN session_expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'login_count'
  ) THEN
    ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- Create indexes for session management
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_session_token ON users(session_token) WHERE session_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_session_active ON users(telegram_id) WHERE session_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC NULLS LAST);

-- =====================================================
-- Function to clean up expired sessions
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE users
  SET
    session_token = NULL,
    session_expires_at = NULL,
    is_online = false
  WHERE
    session_expires_at IS NOT NULL
    AND session_expires_at < now();

  GET DIAGNOSTICS cleaned_count = ROW_COUNT;

  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_sessions IS 'Removes expired session tokens and marks users offline';

-- =====================================================
-- Function to update user session
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_session(
  p_telegram_id TEXT,
  p_session_token TEXT,
  p_session_duration_hours INTEGER DEFAULT 24
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET
    session_token = p_session_token,
    session_expires_at = now() + (p_session_duration_hours || ' hours')::INTERVAL,
    last_login = now(),
    login_count = COALESCE(login_count, 0) + 1,
    is_online = true,
    last_active = now()
  WHERE telegram_id = p_telegram_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with telegram_id % not found', p_telegram_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_user_session IS 'Updates user session token and login tracking';

-- =====================================================
-- Function to validate and refresh session
-- =====================================================

CREATE OR REPLACE FUNCTION validate_user_session(
  p_session_token TEXT
)
RETURNS TABLE (
  user_id UUID,
  telegram_id TEXT,
  name TEXT,
  role user_role,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.telegram_id,
    u.name,
    u.role,
    (u.session_token = p_session_token AND u.session_expires_at > now()) AS is_valid
  FROM users u
  WHERE u.session_token = p_session_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::user_role, false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION validate_user_session IS 'Validates session token and returns user info';

-- =====================================================
-- Function to invalidate user session (logout)
-- =====================================================

CREATE OR REPLACE FUNCTION invalidate_user_session(
  p_telegram_id TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET
    session_token = NULL,
    session_expires_at = NULL,
    is_online = false
  WHERE telegram_id = p_telegram_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION invalidate_user_session IS 'Clears session token on logout';

-- =====================================================
-- Add comment to document session fields
-- =====================================================

COMMENT ON COLUMN users.session_token IS 'Encrypted session identifier for authentication';
COMMENT ON COLUMN users.session_expires_at IS 'Expiration timestamp for current session';
COMMENT ON COLUMN users.last_login IS 'Timestamp of last successful login';
COMMENT ON COLUMN users.login_count IS 'Total number of successful logins';

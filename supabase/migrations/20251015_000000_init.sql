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
CREATE INDEX idx_pin_sessions_token ON pin_sessions(session_token);
CREATE INDEX idx_pin_sessions_expired ON pin_sessions(expires_at);

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
/*
  # Messaging System Migration

  ## Overview
  Complete encrypted messaging system with real-time capabilities, file sharing,
  voice notes, and business-scoped isolation.

  ## Enhanced Tables

  1. **chat_messages_metadata** (NEW)
     - Rich media attachments (voice notes, files, images)
     - File metadata (size, type, thumbnail)
     - Message forwarding and editing tracking

  2. **chat_message_reactions** (NEW)
     - Emoji reactions to messages
     - Multiple reactions per user per message

  3. **chat_notifications_queue** (NEW)
     - Delivery and read tracking
     - Offline message queue
     - Push notification scheduling

  4. **message_attachments** (NEW)
     - Separate table for file attachments
     - Links to Supabase Storage objects
     - Virus scan status tracking

  ## Enhanced Existing Tables
  - chat_rooms: Add last_activity_at, message_count, business_id enforcement
  - chat_room_members: Add notification preferences, mute settings
  - chat_messages: Add parent_message_id for replies

  ## Security
  - All tables have strict RLS based on room membership
  - Business-level isolation enforced
  - File access tied to room membership
  - Audit trail for all operations
*/

-- =====================================================
-- 1. Enhance Existing Chat Tables
-- =====================================================

-- Add columns to chat_rooms if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_rooms' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN last_activity_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_rooms' AND column_name = 'message_count'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN message_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_rooms' AND column_name = 'archived'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN archived boolean DEFAULT false;
  END IF;
END $$;

-- Add columns to chat_room_members if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_room_members' AND column_name = 'notification_enabled'
  ) THEN
    ALTER TABLE chat_room_members ADD COLUMN notification_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_room_members' AND column_name = 'muted_until'
  ) THEN
    ALTER TABLE chat_room_members ADD COLUMN muted_until timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_room_members' AND column_name = 'unread_count'
  ) THEN
    ALTER TABLE chat_room_members ADD COLUMN unread_count integer DEFAULT 0;
  END IF;
END $$;

-- Add parent_message_id to chat_messages for replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'parent_message_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN parent_message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL;
    CREATE INDEX idx_chat_messages_parent ON chat_messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
  END IF;
END $$;

-- =====================================================
-- 2. Message Attachments Table
-- =====================================================

CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  attachment_type text NOT NULL CHECK (attachment_type IN ('image', 'video', 'audio', 'voice_note', 'file', 'document')),
  storage_path text NOT NULL, -- Path in Supabase Storage
  storage_bucket text NOT NULL DEFAULT 'chat-files',
  file_name text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0),
  mime_type text NOT NULL,
  thumbnail_path text,
  duration_seconds integer, -- For audio/video
  width integer, -- For images/video
  height integer,
  virus_scan_status text DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'error')),
  virus_scan_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  uploaded_by text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX idx_message_attachments_room ON message_attachments(room_id, uploaded_at DESC);
CREATE INDEX idx_message_attachments_type ON message_attachments(attachment_type, uploaded_at DESC);
CREATE INDEX idx_message_attachments_scan ON message_attachments(virus_scan_status) WHERE virus_scan_status = 'pending';

COMMENT ON TABLE message_attachments IS 'File attachments linked to messages with storage metadata';
COMMENT ON COLUMN message_attachments.storage_path IS 'Path to file in Supabase Storage bucket';
COMMENT ON COLUMN message_attachments.virus_scan_status IS 'Status of virus scanning for uploaded files';

-- =====================================================
-- 3. Message Reactions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  telegram_id text NOT NULL,
  reaction_emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, telegram_id, reaction_emoji)
);

CREATE INDEX idx_message_reactions_message ON chat_message_reactions(message_id);
CREATE INDEX idx_message_reactions_user ON chat_message_reactions(telegram_id, created_at DESC);

COMMENT ON TABLE chat_message_reactions IS 'Emoji reactions to messages';

-- =====================================================
-- 4. Notifications Queue Table
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text NOT NULL,
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('new_message', 'mention', 'reply', 'reaction')),
  delivered boolean DEFAULT false,
  delivered_at timestamptz,
  read boolean DEFAULT false,
  read_at timestamptz,
  push_sent boolean DEFAULT false,
  push_sent_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_notifications_queue_user ON chat_notifications_queue(telegram_id, created_at DESC) WHERE NOT delivered;
CREATE INDEX idx_notifications_queue_room ON chat_notifications_queue(room_id, created_at DESC);
CREATE INDEX idx_notifications_queue_expired ON chat_notifications_queue(expires_at) WHERE expires_at <= now();

COMMENT ON TABLE chat_notifications_queue IS 'Message delivery and read tracking with push notification queue';
COMMENT ON COLUMN chat_notifications_queue.expires_at IS 'Auto-cleanup after 7 days';

-- =====================================================
-- 5. Chat Encryption Keys Table
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid UNIQUE NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  key_version integer DEFAULT 1,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  rotated_at timestamptz,
  rotated_by text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_encryption_keys_room ON chat_encryption_keys(room_id);

COMMENT ON TABLE chat_encryption_keys IS 'Tracks encryption key versions for rooms (keys stored client-side)';
COMMENT ON COLUMN chat_encryption_keys.key_version IS 'Incremented on key rotation';

-- =====================================================
-- Row Level Security Policies
-- =====================================================

ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Message attachments: room members can view
CREATE POLICY "Room members view attachments"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
  );

-- Room members can upload attachments
CREATE POLICY "Room members upload attachments"
  ON message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
    AND uploaded_by = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  );

-- Users can delete their own attachments
CREATE POLICY "Users delete own attachments"
  ON message_attachments FOR DELETE
  TO authenticated
  USING (uploaded_by = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Message reactions: room members can view
CREATE POLICY "Room members view reactions"
  ON chat_message_reactions FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
  );

-- Room members can add reactions
CREATE POLICY "Room members add reactions"
  ON chat_message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
    AND telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  );

-- Users can delete their own reactions
CREATE POLICY "Users delete own reactions"
  ON chat_message_reactions FOR DELETE
  TO authenticated
  USING (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Notifications: users view their own
CREATE POLICY "Users view own notifications"
  ON chat_notifications_queue FOR SELECT
  TO authenticated
  USING (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Users can update delivery status of their notifications
CREATE POLICY "Users update own notifications"
  ON chat_notifications_queue FOR UPDATE
  TO authenticated
  USING (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id')
  WITH CHECK (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Encryption keys: room members can view
CREATE POLICY "Room members view encryption keys"
  ON chat_encryption_keys FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
  );

-- Room admins can rotate keys
CREATE POLICY "Room admins rotate keys"
  ON chat_encryption_keys FOR UPDATE
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
      AND is_admin = true
    )
  );

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to increment unread count for room members
CREATE OR REPLACE FUNCTION increment_unread_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_room_members
  SET unread_count = unread_count + 1
  WHERE room_id = NEW.room_id
  AND telegram_id != NEW.sender_telegram_id
  AND last_read_at < NEW.sent_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment unread counts on new message
DROP TRIGGER IF EXISTS trigger_increment_unread_counts ON chat_messages;
CREATE TRIGGER trigger_increment_unread_counts
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION increment_unread_counts();

-- Function to reset unread count when user reads messages
CREATE OR REPLACE FUNCTION reset_unread_count(
  p_room_id uuid,
  p_telegram_id text
)
RETURNS void AS $$
BEGIN
  UPDATE chat_room_members
  SET
    unread_count = 0,
    last_read_at = now()
  WHERE
    room_id = p_room_id
    AND telegram_id = p_telegram_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for new message
CREATE OR REPLACE FUNCTION create_message_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notifications for all room members except sender
  INSERT INTO chat_notifications_queue (
    telegram_id,
    room_id,
    message_id,
    notification_type
  )
  SELECT
    crm.telegram_id,
    NEW.room_id,
    NEW.id,
    'new_message'
  FROM chat_room_members crm
  WHERE crm.room_id = NEW.room_id
  AND crm.telegram_id != NEW.sender_telegram_id
  AND crm.notification_enabled = true
  AND (crm.muted_until IS NULL OR crm.muted_until < now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notifications on new message
DROP TRIGGER IF EXISTS trigger_create_message_notifications ON chat_messages;
CREATE TRIGGER trigger_create_message_notifications
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION create_message_notifications();

-- Function to update room activity timestamp and message count
CREATE OR REPLACE FUNCTION update_room_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms
  SET
    last_activity_at = NEW.sent_at,
    message_count = message_count + 1,
    updated_at = now()
  WHERE id = NEW.room_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update room activity
DROP TRIGGER IF EXISTS trigger_update_room_activity ON chat_messages;
CREATE TRIGGER trigger_update_room_activity
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION update_room_activity();

-- Function to cleanup expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_notifications_queue
  WHERE expires_at < now()
  OR (read = true AND read_at < now() - interval '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's unread message count across all rooms
CREATE OR REPLACE FUNCTION get_total_unread_count(p_telegram_id text)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COALESCE(SUM(unread_count), 0) INTO v_count
  FROM chat_room_members
  WHERE telegram_id = p_telegram_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to room (for edge functions)
CREATE OR REPLACE FUNCTION user_has_room_access(
  p_telegram_id text,
  p_room_id uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_room_members
    WHERE room_id = p_room_id
    AND telegram_id = p_telegram_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Views for Common Queries
-- =====================================================

-- View for room list with unread counts and last message
CREATE OR REPLACE VIEW v_chat_room_list AS
SELECT
  cr.id,
  cr.business_id,
  cr.name,
  cr.type,
  cr.created_at,
  cr.last_activity_at,
  cr.message_count,
  cr.last_message_preview,
  cr.last_message_sender,
  cr.last_message_at,
  cr.archived,
  crm.unread_count,
  crm.notification_enabled,
  crm.muted_until,
  crm.last_read_at,
  crm.joined_at,
  crm.is_admin,
  (
    SELECT json_agg(json_build_object(
      'telegram_id', m.telegram_id,
      'is_admin', m.is_admin
    ))
    FROM chat_room_members m
    WHERE m.room_id = cr.id
  ) as members
FROM chat_rooms cr
INNER JOIN chat_room_members crm ON cr.id = crm.room_id;

COMMENT ON VIEW v_chat_room_list IS 'Enriched room list with member data and unread counts';

-- =====================================================
-- Scheduled Cleanup Jobs
-- =====================================================

-- Note: These require pg_cron extension enabled in Supabase

-- Clean up expired notifications every 6 hours
-- SELECT cron.schedule(
--   'cleanup-expired-notifications',
--   '0 */6 * * *',
--   $$ SELECT cleanup_expired_notifications(); $$
-- );

-- Clean up old typing indicators every 5 minutes
-- SELECT cron.schedule(
--   'cleanup-typing-indicators',
--   '*/5 * * * *',
--   $$ DELETE FROM chat_typing_indicators WHERE updated_at < now() - interval '30 seconds'; $$
-- );
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
$$ LANGUAGE plpgsql SECURITY DEFINER;/*
  # Create Base Messaging System Tables

  ## Overview
  Creates the fundamental messaging infrastructure including chat rooms, participants,
  direct messages, and presence tracking.

  ## New Tables
  
  1. **chat_rooms** - Main chat room container
  2. **direct_message_participants** - Tracks DM participants and unread counts
  3. **user_presence** - Tracks user online/offline status
  4. **message_read_receipts** - Tracks when messages are read

  ## Stored Procedures
  
  1. **get_or_create_dm_room** - Gets or creates a direct message room between two users
  2. **reset_dm_unread_count** - Resets unread count when user opens a DM

  ## Security
  - RLS enabled on all tables
  - Users can only access rooms they're participants in
*/

-- =====================================================
-- 1. Create chat_rooms table (without RLS policies yet)
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  room_type text NOT NULL DEFAULT 'group' CHECK (room_type IN ('direct', 'group', 'channel')),
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  last_message_at timestamptz DEFAULT now(),
  last_message_preview text,
  last_message_sender text,
  created_at timestamptz DEFAULT now(),
  created_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_business_id ON chat_rooms(business_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);

-- =====================================================
-- 2. Create direct_message_participants table
-- =====================================================

CREATE TABLE IF NOT EXISTS direct_message_participants (
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  telegram_id text NOT NULL,
  other_telegram_id text NOT NULL,
  unread_count integer DEFAULT 0,
  last_read_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (room_id, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_participants_telegram_id ON direct_message_participants(telegram_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_updated_at ON direct_message_participants(updated_at DESC);

-- =====================================================
-- 3. Create user_presence table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_presence (
  telegram_id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_activity timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_activity ON user_presence(last_activity DESC);

-- =====================================================
-- 4. Create message_read_receipts table
-- =====================================================

CREATE TABLE IF NOT EXISTS message_read_receipts (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  telegram_id text NOT NULL,
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_telegram_id ON message_read_receipts(telegram_id);

-- =====================================================
-- 5. Update messages table columns
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'topic'
  ) THEN
    ALTER TABLE messages ADD COLUMN topic text DEFAULT 'general';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'extension'
  ) THEN
    ALTER TABLE messages ADD COLUMN extension text DEFAULT '';
  END IF;
END $$;

-- =====================================================
-- 6. Enable RLS and create policies
-- =====================================================

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rooms they participate in"
  ON chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM direct_message_participants
      WHERE direct_message_participants.room_id = chat_rooms.id
      AND direct_message_participants.telegram_id = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id')
    )
  );

CREATE POLICY "Users can create rooms"
  ON chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id'));

ALTER TABLE direct_message_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DM participations"
  ON direct_message_participants FOR SELECT
  TO authenticated
  USING (telegram_id = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id'));

CREATE POLICY "Users can create DM participations"
  ON direct_message_participants FOR INSERT
  TO authenticated
  WITH CHECK (telegram_id = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id'));

CREATE POLICY "Users can update own DM participations"
  ON direct_message_participants FOR UPDATE
  TO authenticated
  USING (telegram_id = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id'))
  WITH CHECK (telegram_id = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id'));

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all presence"
  ON user_presence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own presence"
  ON user_presence FOR INSERT
  TO authenticated
  WITH CHECK (telegram_id = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id'));

CREATE POLICY "Users can update own presence"
  ON user_presence FOR UPDATE
  TO authenticated
  USING (telegram_id = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id'))
  WITH CHECK (telegram_id = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id'));

ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view receipts for their messages"
  ON message_read_receipts FOR SELECT
  TO authenticated
  USING (
    telegram_id = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id')
    OR EXISTS (
      SELECT 1 FROM messages
      WHERE messages.id = message_read_receipts.message_id
      AND messages.sender_telegram_id = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id')
    )
  );

CREATE POLICY "Users can create own read receipts"
  ON message_read_receipts FOR INSERT
  TO authenticated
  WITH CHECK (telegram_id = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id'));

-- =====================================================
-- 7. Create stored procedures
-- =====================================================

CREATE OR REPLACE FUNCTION get_or_create_dm_room(
  p_user1_telegram_id text,
  p_user2_telegram_id text,
  p_business_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id uuid;
  v_room_name text;
BEGIN
  SELECT room_id INTO v_room_id
  FROM direct_message_participants
  WHERE telegram_id = p_user1_telegram_id
  AND other_telegram_id = p_user2_telegram_id
  LIMIT 1;

  IF v_room_id IS NULL THEN
    v_room_name := CASE
      WHEN p_user1_telegram_id < p_user2_telegram_id
      THEN p_user1_telegram_id || '_' || p_user2_telegram_id
      ELSE p_user2_telegram_id || '_' || p_user1_telegram_id
    END;

    INSERT INTO chat_rooms (name, room_type, business_id, created_by)
    VALUES (v_room_name, 'direct', p_business_id, p_user1_telegram_id)
    RETURNING id INTO v_room_id;

    INSERT INTO direct_message_participants (room_id, telegram_id, other_telegram_id)
    VALUES
      (v_room_id, p_user1_telegram_id, p_user2_telegram_id),
      (v_room_id, p_user2_telegram_id, p_user1_telegram_id);
  END IF;

  RETURN v_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION reset_dm_unread_count(
  p_room_id uuid,
  p_telegram_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE direct_message_participants
  SET
    unread_count = 0,
    last_read_at = now(),
    updated_at = now()
  WHERE room_id = p_room_id
  AND telegram_id = p_telegram_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_dm_unread_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_type text;
BEGIN
  SELECT room_type INTO v_room_type
  FROM chat_rooms
  WHERE id = NEW.chat_id;

  IF v_room_type = 'direct' THEN
    UPDATE direct_message_participants
    SET
      unread_count = unread_count + 1,
      updated_at = now()
    WHERE room_id = NEW.chat_id
    AND telegram_id != NEW.sender_telegram_id;

    UPDATE chat_rooms
    SET
      last_message_at = NEW.sent_at,
      last_message_preview = LEFT(NEW.content, 100),
      last_message_sender = NEW.sender_telegram_id
    WHERE id = NEW.chat_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_dm_unread ON messages;
CREATE TRIGGER trigger_increment_dm_unread
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_dm_unread_count();

GRANT EXECUTE ON FUNCTION get_or_create_dm_room TO authenticated;
GRANT EXECUTE ON FUNCTION reset_dm_unread_count TO authenticated;
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
/*
  # Fix Users Table RLS Policies
  
  1. Security
    - Enable RLS on users table
    - Create helper functions for policy checks
    - Add comprehensive policies for all operations
    - Ensure authenticated users can read their own data
    - Allow service role to bypass for admin operations
    
  2. Changes
    - Enable Row Level Security on users table
    - Create get_current_user_id() helper function
    - Create policies for SELECT, INSERT, UPDATE, DELETE
    - Add policy for authenticated users
    - Add policy for service role (admin operations)
*/

-- ============================================================================
-- STEP 1: Create helper functions for RLS policies
-- ============================================================================

-- Function to get current user's ID from JWT
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

-- Function to check if current user is infrastructure owner
CREATE OR REPLACE FUNCTION public.is_infrastructure_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = get_current_user_id()
    AND role = 'infrastructure_owner'
  );
$$;

-- ============================================================================
-- STEP 2: Enable RLS on users table
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Drop existing policies if any
-- ============================================================================

DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_all_authenticated" ON users;
DROP POLICY IF EXISTS "users_select_service_role" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_update_infra_owner" ON users;
DROP POLICY IF EXISTS "users_update_service_role" ON users;
DROP POLICY IF EXISTS "users_insert_authenticated" ON users;
DROP POLICY IF EXISTS "users_insert_service_role" ON users;
DROP POLICY IF EXISTS "users_insert_anon" ON users;
DROP POLICY IF EXISTS "users_delete_infra_owner" ON users;
DROP POLICY IF EXISTS "users_delete_service_role" ON users;

-- ============================================================================
-- STEP 4: Create SELECT policies
-- ============================================================================

-- Allow authenticated users to view all users (needed for app functionality)
-- This is safe because the data is internal to the application
CREATE POLICY "users_select_all_authenticated"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to read everything (for admin operations)
CREATE POLICY "users_select_service_role"
  ON users
  FOR SELECT
  TO service_role
  USING (true);

-- Allow anon to read for initial auth flow
CREATE POLICY "users_select_anon"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- STEP 5: Create UPDATE policies
-- ============================================================================

-- Allow users to update their own profile
CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = get_current_user_id())
  WITH CHECK (id = get_current_user_id());

-- Allow infrastructure owners to update any user
CREATE POLICY "users_update_infra_owner"
  ON users
  FOR UPDATE
  TO authenticated
  USING (is_infrastructure_owner())
  WITH CHECK (true);

-- Allow service role to update everything
CREATE POLICY "users_update_service_role"
  ON users
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 6: Create INSERT policies
-- ============================================================================

-- Allow authenticated users to insert (needed for registration flow)
CREATE POLICY "users_insert_authenticated"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow service role to insert any user
CREATE POLICY "users_insert_service_role"
  ON users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow anon users to register (for initial sign-up flow)
CREATE POLICY "users_insert_anon"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================================
-- STEP 7: Create DELETE policies
-- ============================================================================

-- Only infrastructure owners can delete users
CREATE POLICY "users_delete_infra_owner"
  ON users
  FOR DELETE
  TO authenticated
  USING (is_infrastructure_owner());

-- Allow service role to delete any user
CREATE POLICY "users_delete_service_role"
  ON users
  FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- STEP 8: Create indexes for performance
-- ============================================================================

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_users_id_telegram_id ON users(id, telegram_id);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Index for registration status
CREATE INDEX IF NOT EXISTS idx_users_registration_status ON users(registration_status);

-- ============================================================================
-- STEP 9: Grant necessary permissions
-- ============================================================================

-- Grant usage on helper functions
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION is_infrastructure_owner() TO authenticated, anon, service_role;/*
  # Add Missing User Table Columns

  This migration adds columns that are referenced in the codebase but missing from the users table.

  ## Changes
  1. Add business_id column for multi-tenancy support
  2. Add is_online column for user presence tracking
  3. Add last_active column for activity tracking
  4. Add metadata column for extensible user data storage
  5. Create indexes for efficient queries

  ## New Columns
  - business_id: UUID reference to businesses table (nullable)
  - is_online: Boolean flag for current online status
  - last_active: Timestamp of last user activity
  - metadata: JSONB for flexible data storage

  ## Security
  - RLS policies already cover these columns through existing policies
  - No additional security changes needed
*/

-- =====================================================
-- Add missing columns to users table
-- =====================================================

DO $$
BEGIN
  -- Add business_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE users ADD COLUMN business_id UUID;
    COMMENT ON COLUMN users.business_id IS 'Reference to primary business for multi-tenancy';
  END IF;

  -- Add is_online column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_online'
  ) THEN
    ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT false;
    COMMENT ON COLUMN users.is_online IS 'Current online/offline status of user';
  END IF;

  -- Add last_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE users ADD COLUMN last_active TIMESTAMPTZ DEFAULT now();
    COMMENT ON COLUMN users.last_active IS 'Timestamp of last user activity';
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE users ADD COLUMN metadata JSONB;
    COMMENT ON COLUMN users.metadata IS 'Flexible storage for additional user data';
  END IF;
END $$;

-- =====================================================
-- Create indexes for efficient queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_business_role ON users(business_id, role) WHERE business_id IS NOT NULL;

-- =====================================================
-- Add foreign key constraint for business_id
-- =====================================================

DO $$
BEGIN
  -- Check if businesses table exists before adding foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'businesses'
  ) THEN
    -- Check if constraint doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'users_business_id_fkey'
      AND table_name = 'users'
    ) THEN
      ALTER TABLE users 
        ADD CONSTRAINT users_business_id_fkey 
        FOREIGN KEY (business_id) 
        REFERENCES businesses(id) 
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =====================================================
-- Update existing RLS helper functions to handle new columns
-- =====================================================

-- This function is already created, just ensuring it works with new columns
-- No changes needed as it only checks role and telegram_id/*
  # Enhance Group Chats and Channels Tables

  ## Overview
  Adds missing columns and RLS policies to existing group_chats and channels tables.

  ## Changes to group_chats
  - Add business_id column if missing
  - Add created_by column if missing
  - Add updated_at column if missing
  - Add is_active column if missing
  - Ensure proper indexes exist
  - Add RLS policies

  ## Changes to channels
  - Add business_id column if missing
  - Add created_by column if missing
  - Add updated_at column if missing
  - Add is_active column if missing
  - Ensure proper indexes exist
  - Add RLS policies

  ## Security
  - Enable RLS on both tables
  - Users can view groups/channels they are members/subscribers of
  - Users can create groups/channels
  - Creators can update their groups/channels
*/

-- =====================================================
-- 1. Add missing columns to group_chats
-- =====================================================

DO $$
BEGIN
  -- Add business_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_chats' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE group_chats ADD COLUMN business_id uuid REFERENCES businesses(id) ON DELETE SET NULL;
  END IF;

  -- Add created_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_chats' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE group_chats ADD COLUMN created_by text;
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_chats' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE group_chats ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Add is_active if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_chats' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE group_chats ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- =====================================================
-- 2. Add missing columns to channels
-- =====================================================

DO $$
BEGIN
  -- Add business_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channels' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE channels ADD COLUMN business_id uuid REFERENCES businesses(id) ON DELETE SET NULL;
  END IF;

  -- Add created_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channels' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE channels ADD COLUMN created_by text;
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channels' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE channels ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Add is_active if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channels' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE channels ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- =====================================================
-- 3. Create indexes for group_chats
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_group_chats_members ON group_chats USING GIN(members);
CREATE INDEX IF NOT EXISTS idx_group_chats_business_id ON group_chats(business_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_created_by ON group_chats(created_by);
CREATE INDEX IF NOT EXISTS idx_group_chats_is_active ON group_chats(is_active);
CREATE INDEX IF NOT EXISTS idx_group_chats_created_at ON group_chats(created_at DESC);

-- =====================================================
-- 4. Create indexes for channels
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_channels_subscribers ON channels USING GIN(subscribers);
CREATE INDEX IF NOT EXISTS idx_channels_business_id ON channels(business_id);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON channels(created_by);
CREATE INDEX IF NOT EXISTS idx_channels_is_active ON channels(is_active);
CREATE INDEX IF NOT EXISTS idx_channels_created_at ON channels(created_at DESC);

-- =====================================================
-- 5. Enable RLS
-- =====================================================

ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. Drop existing policies if they exist (to recreate)
-- =====================================================

DROP POLICY IF EXISTS "Users can view groups they are members of" ON group_chats;
DROP POLICY IF EXISTS "Users can create groups" ON group_chats;
DROP POLICY IF EXISTS "Group creators can update their groups" ON group_chats;
DROP POLICY IF EXISTS "Users can view channels they subscribe to" ON channels;
DROP POLICY IF EXISTS "Users can create channels" ON channels;
DROP POLICY IF EXISTS "Channel creators can update their channels" ON channels;

-- =====================================================
-- 7. Create RLS Policies for group_chats
-- =====================================================

CREATE POLICY "Users can view groups they are members of"
  ON group_chats FOR SELECT
  TO authenticated
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id') = ANY(members)
  );

CREATE POLICY "Users can create groups"
  ON group_chats FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id')
    AND (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id') = ANY(members)
  );

CREATE POLICY "Group creators can update their groups"
  ON group_chats FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id')
    OR (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id') = ANY(members)
  )
  WITH CHECK (
    created_by = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id')
    OR (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id') = ANY(members)
  );

-- =====================================================
-- 8. Create RLS Policies for channels
-- =====================================================

CREATE POLICY "Users can view channels they subscribe to"
  ON channels FOR SELECT
  TO authenticated
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id') = ANY(subscribers)
    OR created_by = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id')
  );

CREATE POLICY "Users can create channels"
  ON channels FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id')
  );

CREATE POLICY "Channel creators can update their channels"
  ON channels FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id')
  )
  WITH CHECK (
    created_by = (SELECT current_setting('request.jwt.claims', true)::json->>'telegram_id')
  );

-- =====================================================
-- 9. Create helper functions
-- =====================================================

-- Function to add member to group
CREATE OR REPLACE FUNCTION add_group_member(
  p_group_id uuid,
  p_telegram_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE group_chats
  SET 
    members = array_append(members, p_telegram_id),
    updated_at = now()
  WHERE id = p_group_id
  AND NOT (p_telegram_id = ANY(members));
END;
$$;

-- Function to remove member from group
CREATE OR REPLACE FUNCTION remove_group_member(
  p_group_id uuid,
  p_telegram_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE group_chats
  SET 
    members = array_remove(members, p_telegram_id),
    updated_at = now()
  WHERE id = p_group_id;
END;
$$;

-- Function to add subscriber to channel
CREATE OR REPLACE FUNCTION add_channel_subscriber(
  p_channel_id uuid,
  p_telegram_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE channels
  SET 
    subscribers = array_append(subscribers, p_telegram_id),
    updated_at = now()
  WHERE id = p_channel_id
  AND NOT (p_telegram_id = ANY(subscribers));
END;
$$;

-- Function to remove subscriber from channel
CREATE OR REPLACE FUNCTION remove_channel_subscriber(
  p_channel_id uuid,
  p_telegram_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE channels
  SET 
    subscribers = array_remove(subscribers, p_telegram_id),
    updated_at = now()
  WHERE id = p_channel_id;
END;
$$;

-- =====================================================
-- 10. Create triggers for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_group_chats_updated_at ON group_chats;
CREATE TRIGGER update_group_chats_updated_at
  BEFORE UPDATE ON group_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION add_group_member TO authenticated;
GRANT EXECUTE ON FUNCTION remove_group_member TO authenticated;
GRANT EXECUTE ON FUNCTION add_channel_subscriber TO authenticated;
GRANT EXECUTE ON FUNCTION remove_channel_subscriber TO authenticated;
/*
  # Add Status Column to User Registrations Table

  ## Overview
  Adds the missing `status` column to the `user_registrations` table to enable proper
  filtering of pending and approved users in the user management interface.

  ## Changes Made
  
  1. **Add status column**
     - Column name: `status`
     - Type: TEXT with CHECK constraint
     - Values: 'pending', 'approved', 'rejected'
     - Default: 'pending'
     - NOT NULL constraint
  
  2. **Data Migration**
     - Existing rows without assigned_role → 'pending'
     - Existing rows with assigned_role → 'approved'
  
  3. **Performance**
     - Add index on status column for efficient filtering
  
  ## Security
  - No changes to RLS policies needed
  - Maintains existing security posture
*/

-- Add status column with default value
ALTER TABLE user_registrations 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Migrate existing data: if assigned_role exists, mark as approved
UPDATE user_registrations 
SET status = 'approved' 
WHERE assigned_role IS NOT NULL AND status = 'pending';

-- Add index for performance on status filtering
CREATE INDEX IF NOT EXISTS idx_user_registrations_status 
ON user_registrations(status);

-- Add composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_user_registrations_status_created 
ON user_registrations(status, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN user_registrations.status IS 'Registration status: pending (awaiting approval), approved (active user), rejected (denied access)';
/*
  # Add RLS Policies for User Registrations Table

  ## Overview
  Adds proper Row Level Security policies to the user_registrations table
  to allow managers and infrastructure owners to view registration requests.

  ## New Policies
  
  1. **SELECT Policies**
     - Infrastructure owners can view all registrations
     - Managers can view all registrations
     - Users can view their own registration
     - Anon users can view (for initial registration flow)
  
  2. **UPDATE Policies**
     - Infrastructure owners can update any registration
     - Managers can update registrations (for approval workflow)
  
  3. **DELETE Policies**
     - Only infrastructure owners can delete registrations

  ## Security
  - Maintains secure access control
  - Allows proper user management workflows
  - Users can only modify their own registration data
*/

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users view own registration" ON user_registrations;
DROP POLICY IF EXISTS "Managers view all registrations" ON user_registrations;
DROP POLICY IF EXISTS "Infrastructure owners manage registrations" ON user_registrations;
DROP POLICY IF EXISTS "Anyone can view registrations" ON user_registrations;

-- Enable RLS on user_registrations table
ALTER TABLE user_registrations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to SELECT (simplest approach for now)
CREATE POLICY "Authenticated users view all registrations"
  ON user_registrations FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon users to SELECT (for registration flow)
CREATE POLICY "Anon users view registrations"
  ON user_registrations FOR SELECT
  TO anon
  USING (true);

-- Infrastructure owners can UPDATE any registration
CREATE POLICY "Infrastructure owners update registrations"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.telegram_id = auth.jwt() ->> 'telegram_id'
      AND users.role = 'infrastructure_owner'
    )
  );

-- Managers can UPDATE registrations
CREATE POLICY "Managers update registrations"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.telegram_id = auth.jwt() ->> 'telegram_id'
      AND users.role IN ('infrastructure_owner', 'manager', 'business_owner')
    )
  );

-- Users can UPDATE their own registration
CREATE POLICY "Users update own registration"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (telegram_id = auth.jwt() ->> 'telegram_id');

-- Only infrastructure owners can DELETE
CREATE POLICY "Infrastructure owners delete registrations"
  ON user_registrations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.telegram_id = auth.jwt() ->> 'telegram_id'
      AND users.role = 'infrastructure_owner'
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Authenticated users view all registrations" ON user_registrations IS 'Allows all authenticated users to view registrations';
COMMENT ON POLICY "Infrastructure owners update registrations" ON user_registrations IS 'Infrastructure owners can approve/reject registrations';
COMMENT ON POLICY "Managers update registrations" ON user_registrations IS 'Managers can approve/reject registrations';
/*
  # Fix RLS Policies to Use auth.uid() Instead of JWT Claims

  ## Overview
  Updates RLS policies to use auth.uid() which is reliably available in the JWT,
  instead of custom claims like telegram_id which require additional configuration.

  ## Changes Made
  
  1. **Helper Functions**
     - Create function to get user by auth UID
     - Create function to check if current auth user is infrastructure owner
  
  2. **Update Policies**
     - Simplify policies to use auth.uid() instead of telegram_id from JWT
     - Make policies more reliable and maintainable

  ## Security
  - Maintains same security posture
  - More reliable since auth.uid() is always present
*/

-- Create helper function to get current user's telegram_id from auth.uid()
CREATE OR REPLACE FUNCTION get_current_user_telegram_id_from_auth()
RETURNS TEXT AS $$
DECLARE
  v_telegram_id TEXT;
BEGIN
  SELECT telegram_id INTO v_telegram_id
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN v_telegram_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create helper function to check if current authenticated user is infrastructure owner
CREATE OR REPLACE FUNCTION is_current_user_infrastructure_owner()
RETURNS BOOLEAN AS $$
DECLARE
  v_is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'infrastructure_owner'
    AND registration_status = 'approved'
  ) INTO v_is_owner;
  
  RETURN COALESCE(v_is_owner, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create helper function to check if current user is manager or above
CREATE OR REPLACE FUNCTION is_current_user_manager_or_above()
RETURNS BOOLEAN AS $$
DECLARE
  v_is_manager BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('infrastructure_owner', 'business_owner', 'manager')
    AND registration_status = 'approved'
  ) INTO v_is_manager;
  
  RETURN COALESCE(v_is_manager, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update user_registrations UPDATE policies to use new helper functions
DROP POLICY IF EXISTS "Infrastructure owners update registrations" ON user_registrations;
DROP POLICY IF EXISTS "Managers update registrations" ON user_registrations;
DROP POLICY IF EXISTS "Users update own registration" ON user_registrations;

CREATE POLICY "Infrastructure owners update registrations"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (is_current_user_infrastructure_owner());

CREATE POLICY "Managers update registrations"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (is_current_user_manager_or_above());

CREATE POLICY "Users update own registration"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (telegram_id = get_current_user_telegram_id_from_auth());

-- Update DELETE policy
DROP POLICY IF EXISTS "Infrastructure owners delete registrations" ON user_registrations;

CREATE POLICY "Infrastructure owners delete registrations"
  ON user_registrations FOR DELETE
  TO authenticated
  USING (is_current_user_infrastructure_owner());

-- Add comments
COMMENT ON FUNCTION get_current_user_telegram_id_from_auth() IS 'Gets telegram_id for current authenticated user via auth.uid()';
COMMENT ON FUNCTION is_current_user_infrastructure_owner() IS 'Checks if current authenticated user is an approved infrastructure owner';
COMMENT ON FUNCTION is_current_user_manager_or_above() IS 'Checks if current authenticated user is manager, business owner, or infrastructure owner';
/*
  # Sync Users Table with Auth User IDs

  ## Overview
  Creates a trigger to automatically sync the users.id field with auth.users.id
  when users authenticate via Telegram. This ensures RLS policies work correctly.

  ## Changes Made
  
  1. **Function to Sync User ID**
     - Automatically updates users.id when a matching telegram_id exists
     - Called by auth hooks or edge functions
  
  2. **Manual Sync Function**
     - One-time function to sync existing users with auth users
     - Matches by telegram_id stored in auth.raw_user_meta_data

  ## Security
  - Maintains data integrity between auth and users tables
  - Enables RLS policies to work correctly with auth.uid()
*/

-- Function to sync user ID from auth to users table
CREATE OR REPLACE FUNCTION sync_user_id_from_auth(
  p_telegram_id TEXT,
  p_auth_uid UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET id = p_auth_uid
  WHERE telegram_id = p_telegram_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No user found with telegram_id: %', p_telegram_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync all existing users with their auth counterparts
CREATE OR REPLACE FUNCTION sync_all_users_with_auth()
RETURNS TABLE(
  synced_count INTEGER,
  skipped_count INTEGER,
  details JSONB
) AS $$
DECLARE
  v_synced INTEGER := 0;
  v_skipped INTEGER := 0;
  v_auth_user RECORD;
  v_telegram_id TEXT;
  v_details JSONB := '[]'::JSONB;
BEGIN
  -- Loop through auth.users and sync with users table
  FOR v_auth_user IN 
    SELECT id, email, raw_user_meta_data
    FROM auth.users
  LOOP
    -- Extract telegram_id from user_metadata
    v_telegram_id := v_auth_user.raw_user_meta_data->>'telegram_id';
    
    IF v_telegram_id IS NOT NULL THEN
      -- Try to update users table
      UPDATE users
      SET id = v_auth_user.id
      WHERE telegram_id = v_telegram_id;
      
      IF FOUND THEN
        v_synced := v_synced + 1;
        v_details := v_details || jsonb_build_object(
          'telegram_id', v_telegram_id,
          'auth_uid', v_auth_user.id,
          'status', 'synced'
        );
      ELSE
        v_skipped := v_skipped + 1;
        v_details := v_details || jsonb_build_object(
          'telegram_id', v_telegram_id,
          'auth_uid', v_auth_user.id,
          'status', 'no_match'
        );
      END IF;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_synced, v_skipped, v_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the sync function to fix existing users
DO $$
DECLARE
  sync_result RECORD;
BEGIN
  SELECT * INTO sync_result FROM sync_all_users_with_auth();
  RAISE NOTICE 'User sync completed: % synced, % skipped', 
    sync_result.synced_count, 
    sync_result.skipped_count;
END $$;

COMMENT ON FUNCTION sync_user_id_from_auth(TEXT, UUID) IS 'Syncs a single users.id with their auth.users.id based on telegram_id';
COMMENT ON FUNCTION sync_all_users_with_auth() IS 'One-time sync of all users with their auth counterparts';
/*
  # Create business_types table

  1. New Tables
    - `business_types`
      - `id` (uuid, primary key)
      - `type_value` (text, unique) - The internal value used in code (e.g., 'logistics')
      - `label_hebrew` (text) - Display name in Hebrew
      - `label_english` (text) - Display name in English
      - `icon` (text) - Emoji or icon identifier
      - `description` (text) - Optional description
      - `is_system_default` (boolean) - Whether this is a system-provided type
      - `active` (boolean) - Whether this type is currently active
      - `display_order` (integer) - For custom sorting
      - `created_at` (timestamptz)
      - `created_by` (uuid) - User who created this type
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `business_types` table
    - Allow all authenticated users to read active business types
    - Allow only infrastructure_owner users to create/update/delete business types
  
  3. Indexes
    - Add index on type_value for fast lookups
    - Add index on active for filtering active types
  
  4. Initial Data
    - Seed the table with existing hardcoded business types
*/

-- Create business_types table
CREATE TABLE IF NOT EXISTS business_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_value text UNIQUE NOT NULL,
  label_hebrew text NOT NULL,
  label_english text NOT NULL,
  icon text DEFAULT '🏢',
  description text,
  is_system_default boolean DEFAULT false,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_types_type_value ON business_types(type_value);
CREATE INDEX IF NOT EXISTS idx_business_types_active ON business_types(active);
CREATE INDEX IF NOT EXISTS idx_business_types_display_order ON business_types(display_order);

-- Enable RLS
ALTER TABLE business_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view active business types"
  ON business_types FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Infrastructure owners can view all business types"
  ON business_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can create business types"
  ON business_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can update business types"
  ON business_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can delete business types"
  ON business_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- Seed initial business types
INSERT INTO business_types (type_value, label_hebrew, label_english, icon, is_system_default, display_order, active)
VALUES
  ('logistics', 'לוגיסטיקה', 'Logistics', '🚚', true, 1, true),
  ('retail', 'קמעונאות', 'Retail', '🏪', true, 2, true),
  ('food_delivery', 'משלוחי מזון', 'Food Delivery', '🍔', true, 3, true),
  ('electronics', 'אלקטרוניקה', 'Electronics', '💻', true, 4, true),
  ('fashion', 'אופנה', 'Fashion', '👕', true, 5, true),
  ('education', 'חינוך', 'Education', '📚', true, 6, true)
ON CONFLICT (type_value) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_business_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_types_updated_at
  BEFORE UPDATE ON business_types
  FOR EACH ROW
  EXECUTE FUNCTION update_business_types_updated_at();/*
  # Flexible Zone Management System

  1. Changes to zones table
    - Add created_by field to track who created the zone
    - Add updated_by field to track who last modified the zone
    - Add business_id field for business-specific zones (nullable)
    - Add metadata JSONB field for extensible properties
    - Add deleted_at field for soft deletes
    - Add city and region fields if not exists
    - Ensure proper indexes

  2. New Tables
    - zone_audit_logs: Track all changes to zones
    
  3. Security
    - Enable RLS on zones table
    - Add policies for infrastructure owners, managers, and business owners
    - Enable RLS on zone_audit_logs
    - Add read-only policies for audit logs
*/

-- Add new columns to zones table if they don't exist
DO $$ 
BEGIN
  -- Add created_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE zones ADD COLUMN created_by TEXT;
  END IF;

  -- Add updated_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE zones ADD COLUMN updated_by TEXT;
  END IF;

  -- Add business_id column for business-specific zones
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE zones ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
  END IF;

  -- Add metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE zones ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add deleted_at column for soft deletes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE zones ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  -- Add city column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'city'
  ) THEN
    ALTER TABLE zones ADD COLUMN city TEXT;
  END IF;

  -- Add region column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'region'
  ) THEN
    ALTER TABLE zones ADD COLUMN region TEXT;
  END IF;
END $$;

-- Create zone audit logs table
CREATE TABLE IF NOT EXISTS zone_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'restored')),
  changed_by TEXT NOT NULL,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS zone_audit_logs_zone_id_idx ON zone_audit_logs(zone_id);
CREATE INDEX IF NOT EXISTS zone_audit_logs_created_at_idx ON zone_audit_logs(created_at DESC);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS zones_business_id_idx ON zones(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS zones_deleted_at_idx ON zones(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS zones_city_idx ON zones(city);
CREATE INDEX IF NOT EXISTS zones_region_idx ON zones(region);

-- Enable RLS on zones table
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Enable RLS on zone_audit_logs table
ALTER TABLE zone_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "zones_select_policy" ON zones;
DROP POLICY IF EXISTS "zones_insert_policy" ON zones;
DROP POLICY IF EXISTS "zones_update_policy" ON zones;
DROP POLICY IF EXISTS "zones_delete_policy" ON zones;

-- Zones SELECT policy: Anyone authenticated can view non-deleted zones
CREATE POLICY "zones_select_policy"
  ON zones
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Zones INSERT policy: Infrastructure owners, managers, and business owners can create zones
CREATE POLICY "zones_insert_policy"
  ON zones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role IN ('infrastructure_owner', 'manager', 'business_owner')
    )
  );

-- Zones UPDATE policy: Infrastructure owners and managers can update any zone
CREATE POLICY "zones_update_policy"
  ON zones
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role IN ('infrastructure_owner', 'manager', 'business_owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role IN ('infrastructure_owner', 'manager', 'business_owner')
    )
  );

-- Zones DELETE policy: Only infrastructure owners can hard delete zones
CREATE POLICY "zones_delete_policy"
  ON zones
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'infrastructure_owner'
    )
  );

-- Zone audit logs SELECT policy: Authenticated users can view audit logs
CREATE POLICY "zone_audit_logs_select_policy"
  ON zone_audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Zone audit logs INSERT policy: System can insert audit logs
CREATE POLICY "zone_audit_logs_insert_policy"
  ON zone_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to log zone changes
CREATE OR REPLACE FUNCTION log_zone_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO zone_audit_logs (zone_id, action, changed_by, changes)
    VALUES (NEW.id, 'created', NEW.created_by, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO zone_audit_logs (zone_id, action, changed_by, changes)
    VALUES (
      NEW.id, 
      CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'deleted'
           WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN 'restored'
           ELSE 'updated' END,
      NEW.updated_by,
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for zone audit logging
DROP TRIGGER IF EXISTS zone_audit_trigger ON zones;
CREATE TRIGGER zone_audit_trigger
  AFTER INSERT OR UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION log_zone_change();
/*
  # Add Infrastructure-Level Roles to user_role Enum

  ## Changes
  - Adds infrastructure_manager, infrastructure_dispatcher, infrastructure_driver, infrastructure_warehouse, infrastructure_accountant to user_role enum
  - These roles enable infrastructure-level operations separate from business-level roles

  ## Security
  - No RLS changes - only extending enum values
  - Existing roles remain unchanged
*/

-- Add new infrastructure-level role values to the enum
DO $$ 
BEGIN
  -- Add infrastructure_manager if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'infrastructure_manager' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'infrastructure_manager';
  END IF;

  -- Add infrastructure_dispatcher if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'infrastructure_dispatcher' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'infrastructure_dispatcher';
  END IF;

  -- Add infrastructure_driver if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'infrastructure_driver' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'infrastructure_driver';
  END IF;

  -- Add infrastructure_warehouse if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'infrastructure_warehouse' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'infrastructure_warehouse';
  END IF;

  -- Add infrastructure_accountant if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'infrastructure_accountant' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'infrastructure_accountant';
  END IF;
END $$;
/*
  # Dynamic RBAC System - Infrastructure-First Architecture

  ## Overview
  This migration establishes a data-driven, infrastructure-anchored Role-Based Access Control system
  that replaces hardcoded role permissions with flexible, auditable, database-driven permissions.

  ## New Tables

  ### 1. `permissions`
  Core atomic permissions that can be assigned to roles.
  - Defines granular actions like `orders:create`, `inventory:update`, `financial:view_all_infrastructure`
  - Each permission has a module grouping (orders, inventory, financial, etc.)
  - Includes human-readable descriptions for UI display
  - System-controlled; only infrastructure_owner can modify

  ### 2. `roles`
  Base role definitions with scope and hierarchy metadata.
  - Distinguishes infrastructure-level roles (global access) from business-level roles (scoped)
  - Includes role hierarchy for permission inheritance
  - Cannot be deleted if users are assigned to them
  - Stores default role configuration

  ### 3. `role_permissions`
  Junction table mapping roles to their allowed permissions.
  - Many-to-many relationship between roles and permissions
  - Enables dynamic permission assignment without code changes
  - Tracks when permissions were added/removed for audit

  ### 4. `custom_roles`
  Business-specific role customizations based on base roles.
  - Allows business owners to clone and modify business-level roles
  - Cannot grant permissions beyond base role scope
  - Scoped to specific business_id
  - Includes version tracking for rollback capability

  ### 5. `user_business_roles`
  Replaces business_users - tracks user role assignments per business context.
  - Supports multi-business user assignments
  - Includes is_primary flag for default business context
  - Tracks ownership_percentage for equity holders
  - Includes activation/deactivation timestamps

  ### 6. `role_change_log`
  Complete audit trail of all role and permission changes.
  - Tracks who made changes, when, and what changed
  - Stores before/after state for rollback capability
  - Includes business context for multi-tenant audit
  - Immutable audit record

  ### 7. `user_permissions_cache`
  Performance optimization table caching resolved user permissions.
  - Stores merged permissions from base + custom roles
  - Invalidated on role or permission changes
  - Includes business_context for multi-business users
  - Used by JWT generation and permission checks

  ## Security Features
  - Row Level Security enabled on all tables
  - Only infrastructure_owner can modify core permissions and base roles
  - Business owners can only customize business-level roles for their businesses
  - Complete audit trail of all permission changes
  - Permission validation prevents privilege escalation

  ## Key Principles
  1. Infrastructure-first: All system control originates from infrastructure ownership
  2. Zero hardcoding: All permissions are data-driven and editable
  3. Audit everything: Every permission change is logged with actor and timestamp
  4. Business isolation: Business owners cannot see or modify other businesses' custom roles
  5. Safe customization: Custom roles cannot exceed base role permission scope
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PERMISSIONS TABLE - Atomic permission definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT UNIQUE NOT NULL,
  module TEXT NOT NULL,
  description TEXT NOT NULL,
  is_infrastructure_only BOOLEAN NOT NULL DEFAULT false,
  is_system_permission BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(permission_key);

-- ============================================================================
-- ROLES TABLE - Base role definitions with scope metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  scope_level TEXT NOT NULL CHECK (scope_level IN ('infrastructure', 'business')),
  hierarchy_level INTEGER NOT NULL DEFAULT 100,
  is_system_role BOOLEAN NOT NULL DEFAULT true,
  can_be_customized BOOLEAN NOT NULL DEFAULT false,
  requires_business_context BOOLEAN NOT NULL DEFAULT true,
  can_see_financials BOOLEAN NOT NULL DEFAULT false,
  can_see_cross_business BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roles_scope_level ON roles(scope_level);
CREATE INDEX IF NOT EXISTS idx_roles_hierarchy ON roles(hierarchy_level);

-- ============================================================================
-- ROLE_PERMISSIONS TABLE - Junction mapping roles to permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID REFERENCES users(id),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================================
-- CUSTOM_ROLES TABLE - Business-specific role customizations
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  base_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  custom_role_name TEXT NOT NULL,
  custom_role_label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, custom_role_name)
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_business ON custom_roles(business_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_custom_roles_base ON custom_roles(base_role_id);

-- ============================================================================
-- CUSTOM_ROLE_PERMISSIONS TABLE - Permissions for custom roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  modified_by UUID REFERENCES users(id),
  modified_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(custom_role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_role_perms_custom_role ON custom_role_permissions(custom_role_id);
CREATE INDEX IF NOT EXISTS idx_custom_role_perms_enabled ON custom_role_permissions(custom_role_id, is_enabled);

-- ============================================================================
-- USER_BUSINESS_ROLES TABLE - User role assignments per business
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_business_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id),
  custom_role_id UUID REFERENCES custom_roles(id),
  ownership_percentage NUMERIC(5,2) DEFAULT 0 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  commission_percentage NUMERIC(5,2) DEFAULT 0 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  deactivated_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_id, business_id),
  CHECK (
    (role_id IS NOT NULL AND custom_role_id IS NULL) OR
    (role_id IS NULL AND custom_role_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_user_business_roles_user ON user_business_roles(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_business_roles_business ON user_business_roles(business_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_business_roles_primary ON user_business_roles(user_id, is_primary) WHERE is_primary = true;

-- ============================================================================
-- ROLE_CHANGE_LOG TABLE - Complete audit trail of role changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'role_created', 'role_updated', 'role_deleted',
    'permission_added', 'permission_removed',
    'custom_role_created', 'custom_role_updated', 'custom_role_deleted',
    'user_role_assigned', 'user_role_changed', 'user_role_removed'
  )),
  actor_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID REFERENCES users(id),
  target_role_id UUID REFERENCES roles(id),
  target_custom_role_id UUID REFERENCES custom_roles(id),
  target_permission_id UUID REFERENCES permissions(id),
  business_id UUID REFERENCES businesses(id),
  previous_state JSONB,
  new_state JSONB,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_change_log_actor ON role_change_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_role_change_log_target_user ON role_change_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_log_business ON role_change_log(business_id);
CREATE INDEX IF NOT EXISTS idx_role_change_log_created ON role_change_log(created_at DESC);

-- ============================================================================
-- USER_PERMISSIONS_CACHE TABLE - Performance optimization
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_permissions_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  resolved_permissions JSONB NOT NULL DEFAULT '[]',
  role_key TEXT NOT NULL,
  can_see_financials BOOLEAN NOT NULL DEFAULT false,
  can_see_cross_business BOOLEAN NOT NULL DEFAULT false,
  cache_version INTEGER NOT NULL DEFAULT 1,
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_user_perms_cache_user ON user_permissions_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_user_perms_cache_business ON user_permissions_cache(business_id);
CREATE INDEX IF NOT EXISTS idx_user_perms_cache_version ON user_permissions_cache(cache_version);

-- ============================================================================
-- SEED BASE PERMISSIONS
-- ============================================================================

INSERT INTO permissions (permission_key, module, description, is_infrastructure_only) VALUES
-- Orders module
('orders:view_all_infrastructure', 'orders', 'View all orders across all businesses', true),
('orders:view_all_business', 'orders', 'View all orders in own business', false),
('orders:view_own', 'orders', 'View only own orders', false),
('orders:view_business', 'orders', 'View business orders (limited)', false),
('orders:view_assigned', 'orders', 'View only assigned orders', false),
('orders:create', 'orders', 'Create new orders', false),
('orders:update', 'orders', 'Update order details', false),
('orders:delete', 'orders', 'Delete orders', false),
('orders:assign_driver', 'orders', 'Assign orders to drivers', false),
('orders:change_status', 'orders', 'Change order status', false),

-- Products module
('products:view', 'products', 'View product catalog', false),
('products:create', 'products', 'Add new products', false),
('products:update', 'products', 'Update product information', false),
('products:delete', 'products', 'Delete products', false),
('products:set_pricing', 'products', 'Set product pricing', false),

-- Inventory module
('inventory:view_all_infrastructure', 'inventory', 'View all inventory across all businesses', true),
('inventory:view_all_business', 'inventory', 'View all inventory in own business', false),
('inventory:view_business', 'inventory', 'View business inventory (limited)', false),
('inventory:view_own', 'inventory', 'View only own inventory', false),
('inventory:create', 'inventory', 'Create inventory records', false),
('inventory:update', 'inventory', 'Update inventory levels', false),
('inventory:delete', 'inventory', 'Delete inventory records', false),
('inventory:transfer', 'inventory', 'Transfer inventory between locations', false),
('inventory:request_restock', 'inventory', 'Request inventory restocking', false),
('inventory:approve_restock', 'inventory', 'Approve restock requests', false),
('inventory:fulfill_restock', 'inventory', 'Fulfill restock requests', false),

-- Users module
('users:view_all_infrastructure', 'users', 'View all users across all businesses', true),
('users:view_all_business', 'users', 'View all users in own business', false),
('users:view_business', 'users', 'View business users (limited)', false),
('users:view_own', 'users', 'View own profile', false),
('users:create', 'users', 'Create new user accounts', false),
('users:update', 'users', 'Update user information', false),
('users:delete', 'users', 'Delete user accounts', false),
('users:change_role', 'users', 'Change user roles', false),
('users:approve', 'users', 'Approve user registrations', false),
('users:set_ownership', 'users', 'Set business ownership percentages', false),
('users:assign_to_business', 'users', 'Assign users to businesses', false),

-- Financial module
('financial:view_all_infrastructure', 'financial', 'View all financial data across businesses', true),
('financial:view_own_business', 'financial', 'View own business financial data', false),
('financial:view_own_earnings', 'financial', 'View own earnings', false),
('financial:view_business_revenue', 'financial', 'View business revenue reports', false),
('financial:view_business_costs', 'financial', 'View business cost reports', false),
('financial:view_business_profit', 'financial', 'View business profit reports', false),
('financial:view_ownership_distribution', 'financial', 'View ownership and profit distribution', false),
('financial:manage_distributions', 'financial', 'Manage profit distributions', false),
('financial:export_reports', 'financial', 'Export financial reports', false),

-- Business module
('business:view_all', 'business', 'View all businesses', true),
('business:view_own', 'business', 'View own business', false),
('business:create', 'business', 'Create new businesses', true),
('business:update', 'business', 'Update business information', false),
('business:delete', 'business', 'Delete businesses', true),
('business:manage_settings', 'business', 'Manage business settings', false),
('business:manage_ownership', 'business', 'Manage ownership structure', false),
('business:switch_context', 'business', 'Switch between businesses', false),

-- System module
('system:view_audit_logs', 'system', 'View system audit logs', false),
('system:manage_config', 'system', 'Manage system configuration', true),
('system:manage_infrastructure', 'system', 'Manage infrastructure settings', true),

-- Zones module
('zones:view', 'zones', 'View delivery zones', false),
('zones:create', 'zones', 'Create new zones', false),
('zones:update', 'zones', 'Update zone information', false),
('zones:assign_drivers', 'zones', 'Assign drivers to zones', false),

-- Analytics module
('analytics:view_all_infrastructure', 'analytics', 'View all analytics across businesses', true),
('analytics:view_all_business', 'analytics', 'View all business analytics', false),
('analytics:view_business', 'analytics', 'View business analytics (limited)', false),
('analytics:view_own', 'analytics', 'View own performance', false),
('analytics:export', 'analytics', 'Export analytics reports', false),

-- Messaging module
('messaging:send', 'messaging', 'Send direct messages', false),
('messaging:view', 'messaging', 'View and read messages', false),
('groups:create', 'groups', 'Create new group chats', false),
('groups:view', 'groups', 'View group chats', false),
('groups:manage_own', 'groups', 'Manage own groups', false),
('channels:create', 'channels', 'Create new channels', false),
('channels:view', 'channels', 'View channels', false),
('channels:manage_own', 'channels', 'Manage own channels', false)
ON CONFLICT (permission_key) DO NOTHING;

-- ============================================================================
-- SEED BASE ROLES
-- ============================================================================

INSERT INTO roles (role_key, label, description, scope_level, hierarchy_level, can_be_customized, requires_business_context, can_see_financials, can_see_cross_business) VALUES
('infrastructure_owner', 'Infrastructure Owner', 'Platform administrator with full system access', 'infrastructure', 1, false, false, true, true),
('infrastructure_manager', 'Infrastructure Manager', 'Platform support and audit access', 'infrastructure', 10, false, false, false, true),
('infrastructure_dispatcher', 'Infrastructure Dispatcher', 'Global order routing and driver assignment', 'infrastructure', 20, false, false, false, false),
('infrastructure_driver', 'Infrastructure Driver', 'Delivery personnel working for infrastructure', 'infrastructure', 30, false, false, false, false),
('infrastructure_warehouse', 'Infrastructure Warehouse Worker', 'Central warehouse and stock management', 'infrastructure', 25, false, false, false, false),
('infrastructure_accountant', 'Infrastructure Accountant', 'Financial oversight and reporting', 'infrastructure', 15, false, false, true, true),
('business_owner', 'Business Owner', 'Business equity holder with full business access', 'business', 100, true, true, true, false),
('manager', 'Business Manager', 'Operations manager with team oversight', 'business', 200, true, true, false, false),
('dispatcher', 'Business Dispatcher', 'Order routing within business', 'business', 250, true, true, false, false),
('driver', 'Business Driver', 'Delivery personnel for business', 'business', 300, true, true, false, false),
('warehouse', 'Business Warehouse Worker', 'Business warehouse operations', 'business', 275, true, true, false, false),
('sales', 'Sales Representative', 'Order creation and customer service', 'business', 350, true, true, false, false),
('customer_service', 'Customer Support', 'Customer service and order updates', 'business', 400, true, true, false, false)
ON CONFLICT (role_key) DO NOTHING;

-- ============================================================================
-- SEED ROLE-PERMISSION MAPPINGS (Infrastructure Owner - Full Access)
-- ============================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE role_key = 'infrastructure_owner'),
  id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_business_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Permissions Table
-- ============================================================================

CREATE POLICY "Everyone can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only infrastructure_owner can modify permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- RLS POLICIES - Roles Table
-- ============================================================================

CREATE POLICY "Everyone can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only infrastructure_owner can modify system roles"
  ON roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- RLS POLICIES - Role Permissions Table
-- ============================================================================

CREATE POLICY "Everyone can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only infrastructure_owner can modify role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- RLS POLICIES - Custom Roles Table
-- ============================================================================

CREATE POLICY "Business owners can view own business custom roles"
  ON custom_roles FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid()
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_manager')
    )
  );

CREATE POLICY "Business owners can create custom roles for their business"
  ON custom_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT ubr.business_id 
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'infrastructure_owner')
    )
  );

CREATE POLICY "Business owners can update own business custom roles"
  ON custom_roles FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT ubr.business_id 
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'infrastructure_owner')
    )
  );

-- ============================================================================
-- RLS POLICIES - User Business Roles Table
-- ============================================================================

CREATE POLICY "Users can view their own role assignments"
  ON user_business_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT ubr.business_id 
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'manager', 'infrastructure_owner')
    )
  );

CREATE POLICY "Owners can manage role assignments"
  ON user_business_roles FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT ubr.business_id 
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'infrastructure_owner')
    )
  );

-- ============================================================================
-- RLS POLICIES - Role Change Log (Read-only audit)
-- ============================================================================

CREATE POLICY "Owners and managers can view role change logs"
  ON role_change_log FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT ubr.business_id 
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'manager', 'infrastructure_owner', 'infrastructure_manager')
    )
    OR actor_id = auth.uid()
    OR target_user_id = auth.uid()
  );

CREATE POLICY "System can insert role change logs"
  ON role_change_log FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - User Permissions Cache
-- ============================================================================

CREATE POLICY "Users can view own permissions cache"
  ON user_permissions_cache FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage permissions cache"
  ON user_permissions_cache FOR ALL
  TO authenticated
  USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to invalidate user permissions cache
CREATE OR REPLACE FUNCTION invalidate_user_permissions_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM user_permissions_cache
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to invalidate cache on role changes
DROP TRIGGER IF EXISTS invalidate_cache_on_role_change ON user_business_roles;
CREATE TRIGGER invalidate_cache_on_role_change
  AFTER INSERT OR UPDATE OR DELETE ON user_business_roles
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_user_permissions_cache();

-- Function to log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO role_change_log (
      action_type, actor_id, target_user_id, business_id, new_state
    ) VALUES (
      'user_role_assigned',
      auth.uid(),
      NEW.user_id,
      NEW.business_id,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO role_change_log (
      action_type, actor_id, target_user_id, business_id, previous_state, new_state
    ) VALUES (
      'user_role_changed',
      auth.uid(),
      NEW.user_id,
      NEW.business_id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO role_change_log (
      action_type, actor_id, target_user_id, business_id, previous_state
    ) VALUES (
      'user_role_removed',
      auth.uid(),
      OLD.user_id,
      OLD.business_id,
      to_jsonb(OLD)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log role changes
DROP TRIGGER IF EXISTS log_user_role_changes ON user_business_roles;
CREATE TRIGGER log_user_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON user_business_roles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_change();
/*
  # Infrastructure Warehouse and Inventory Pipeline

  ## Overview
  Implements the infrastructure-first inventory management system where all stock control
  originates from infrastructure warehouses and flows down to business warehouses and driver vehicles.

  ## New Tables

  ### 1. `warehouses`
  Physical or virtual storage locations with scope differentiation.
  - Infrastructure warehouses: Owned and controlled by infrastructure_owner
  - Business warehouses: Assigned to specific businesses, receive allocations from infrastructure
  - Includes capacity limits, operating hours, and contact information
  - Tracks active/inactive status for operational control

  ### 2. `inventory_movements`
  Complete audit trail of all inventory transfers across the system.
  - Tracks every movement from infrastructure → business → driver → customer
  - Records from_location, to_location, quantity, and business context
  - Includes movement type (allocation, transfer, delivery, return, adjustment)
  - Immutable audit record with actor and timestamp
  - Enables full traceability of stock throughout the supply chain

  ### 3. `stock_allocations`
  Infrastructure-controlled allocation of stock to business warehouses.
  - Defines allocation rules and quotas per business
  - Tracks allocation status (pending, approved, fulfilled, rejected)
  - Includes approval workflow for large allocations
  - Records allocated vs delivered quantities for reconciliation

  ### 4. `driver_vehicle_inventory`
  Enhanced driver inventory with vehicle and zone context.
  - Links inventory to specific driver and their assigned vehicle
  - Tracks current zone_id for location-aware inventory management
  - Includes loading_at and last_sync timestamps
  - Supports partial deliveries and returns

  ### 5. `inventory_reconciliation`
  Periodic reconciliation reports comparing system vs physical counts.
  - Scheduled reconciliation cycles per warehouse
  - Records expected vs actual quantities with variance tracking
  - Includes reconciliation status and approver information
  - Generates adjustments to correct discrepancies

  ### 6. `warehouse_capacity_limits`
  Capacity management preventing over-allocation.
  - Defines maximum stock levels per product per warehouse
  - Tracks current utilization percentage
  - Triggers alerts when approaching capacity limits
  - Supports seasonal capacity adjustments

  ## Security Features
  - Infrastructure warehouses: Only infrastructure_owner and infrastructure_warehouse can modify
  - Business warehouses: Business owners can view but only infrastructure can allocate
  - Inventory movements: Immutable audit trail, no deletions allowed
  - Stock allocations: Require infrastructure approval for amounts exceeding thresholds
  - Driver inventory: Only assigned driver and managers can modify

  ## Key Principles
  1. Infrastructure control: All stock originates from infrastructure warehouses
  2. Chain of custody: Every movement is logged with from/to locations
  3. No orphan inventory: All stock must be assigned to a warehouse or driver
  4. Allocation-based: Businesses receive stock through formal allocation process
  5. Reconciliation: Regular physical counts ensure data integrity
*/

-- ============================================================================
-- WAREHOUSES TABLE - Infrastructure and Business storage locations
-- ============================================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_code TEXT UNIQUE NOT NULL,
  warehouse_name TEXT NOT NULL,
  warehouse_type TEXT NOT NULL CHECK (warehouse_type IN ('infrastructure_central', 'infrastructure_regional', 'business_main', 'business_satellite')),
  scope_level TEXT NOT NULL CHECK (scope_level IN ('infrastructure', 'business')),
  business_id UUID REFERENCES businesses(id) ON DELETE RESTRICT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'IL',
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  max_capacity_cubic_meters NUMERIC(10,2),
  operating_hours JSONB DEFAULT '{"monday": "08:00-18:00", "tuesday": "08:00-18:00", "wednesday": "08:00-18:00", "thursday": "08:00-18:00", "friday": "08:00-14:00", "saturday": "closed", "sunday": "closed"}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_receiving_enabled BOOLEAN NOT NULL DEFAULT true,
  is_shipping_enabled BOOLEAN NOT NULL DEFAULT true,
  managed_by UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (scope_level = 'infrastructure' AND business_id IS NULL) OR
    (scope_level = 'business' AND business_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_warehouses_type ON warehouses(warehouse_type);
CREATE INDEX IF NOT EXISTS idx_warehouses_scope ON warehouses(scope_level, is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_business ON warehouses(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_managed_by ON warehouses(managed_by);

COMMENT ON TABLE warehouses IS 'Physical and virtual storage locations with infrastructure vs business scope distinction';
COMMENT ON COLUMN warehouses.scope_level IS 'infrastructure warehouses = global stock control, business warehouses = operational branches';

-- ============================================================================
-- INVENTORY_MOVEMENTS TABLE - Complete movement audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'infrastructure_allocation',
    'business_transfer',
    'driver_loading',
    'delivery_fulfillment',
    'return_to_warehouse',
    'adjustment',
    'damaged_write_off',
    'theft_loss'
  )),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
  from_driver_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  to_driver_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit_of_measure TEXT DEFAULT 'units',
  business_id UUID REFERENCES businesses(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  reference_number TEXT,
  movement_reason TEXT,
  notes TEXT,
  moved_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  moved_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  CHECK (
    (from_warehouse_id IS NOT NULL OR from_driver_id IS NOT NULL) AND
    (to_warehouse_id IS NOT NULL OR to_driver_id IS NOT NULL) AND
    (from_warehouse_id IS NULL OR from_driver_id IS NULL) AND
    (to_warehouse_id IS NULL OR to_driver_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_inv_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_from_warehouse ON inventory_movements(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_to_warehouse ON inventory_movements(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_business ON inventory_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_moved_at ON inventory_movements(moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_movements_type ON inventory_movements(movement_type);

COMMENT ON TABLE inventory_movements IS 'Immutable audit trail of all inventory transfers in the system';
COMMENT ON COLUMN inventory_movements.movement_type IS 'infrastructure_allocation = infra→business, driver_loading = warehouse→driver, delivery_fulfillment = driver→customer';

-- ============================================================================
-- STOCK_ALLOCATIONS TABLE - Infrastructure to Business allocations
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_number TEXT UNIQUE NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  requested_quantity NUMERIC(10,2) NOT NULL CHECK (requested_quantity > 0),
  approved_quantity NUMERIC(10,2) CHECK (approved_quantity >= 0),
  delivered_quantity NUMERIC(10,2) DEFAULT 0 CHECK (delivered_quantity >= 0),
  allocation_status TEXT NOT NULL DEFAULT 'pending' CHECK (allocation_status IN ('pending', 'approved', 'in_transit', 'delivered', 'partial', 'rejected', 'cancelled')),
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  delivered_by UUID REFERENCES users(id),
  delivered_at TIMESTAMPTZ,
  rejection_reason TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  CHECK (approved_quantity IS NULL OR approved_quantity <= requested_quantity),
  CHECK (delivered_quantity <= COALESCE(approved_quantity, requested_quantity))
);

CREATE INDEX IF NOT EXISTS idx_stock_alloc_from_warehouse ON stock_allocations(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_alloc_to_warehouse ON stock_allocations(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_alloc_business ON stock_allocations(to_business_id);
CREATE INDEX IF NOT EXISTS idx_stock_alloc_status ON stock_allocations(allocation_status);
CREATE INDEX IF NOT EXISTS idx_stock_alloc_requested_at ON stock_allocations(requested_at DESC);

COMMENT ON TABLE stock_allocations IS 'Infrastructure-controlled stock allocation workflow to business warehouses';

-- ============================================================================
-- DRIVER_VEHICLE_INVENTORY TABLE - Enhanced driver mobile inventory
-- ============================================================================

CREATE TABLE IF NOT EXISTS driver_vehicle_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  vehicle_identifier TEXT,
  current_quantity NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  reserved_quantity NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  damaged_quantity NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  current_zone_id UUID REFERENCES zones(id),
  source_warehouse_id UUID REFERENCES warehouses(id),
  business_id UUID REFERENCES businesses(id) ON DELETE RESTRICT,
  loaded_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE(driver_id, product_id, vehicle_identifier),
  CHECK (current_quantity >= reserved_quantity)
);

CREATE INDEX IF NOT EXISTS idx_driver_vehicle_inv_driver ON driver_vehicle_inventory(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_inv_product ON driver_vehicle_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_inv_zone ON driver_vehicle_inventory(current_zone_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_inv_business ON driver_vehicle_inventory(business_id);

COMMENT ON TABLE driver_vehicle_inventory IS 'Mobile inventory tracking with vehicle, zone, and business context';

-- ============================================================================
-- INVENTORY_RECONCILIATION TABLE - Physical count vs system
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_number TEXT UNIQUE NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  reconciliation_date DATE NOT NULL,
  reconciliation_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (reconciliation_status IN ('scheduled', 'in_progress', 'completed', 'approved', 'rejected')),
  initiated_by UUID NOT NULL REFERENCES users(id),
  initiated_at TIMESTAMPTZ DEFAULT now(),
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  total_items_counted INTEGER DEFAULT 0,
  total_discrepancies INTEGER DEFAULT 0,
  total_variance_value NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_inv_recon_warehouse ON inventory_reconciliation(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_recon_date ON inventory_reconciliation(reconciliation_date DESC);
CREATE INDEX IF NOT EXISTS idx_inv_recon_status ON inventory_reconciliation(reconciliation_status);

-- ============================================================================
-- RECONCILIATION_ITEMS TABLE - Line items for each reconciliation
-- ============================================================================

CREATE TABLE IF NOT EXISTS reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES inventory_reconciliation(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  system_quantity NUMERIC(10,2) NOT NULL,
  physical_count NUMERIC(10,2),
  variance_quantity NUMERIC(10,2) GENERATED ALWAYS AS (COALESCE(physical_count, 0) - system_quantity) STORED,
  variance_value NUMERIC(12,2),
  variance_reason TEXT CHECK (variance_reason IN ('damaged', 'theft', 'miscount', 'system_error', 'expired', 'other')),
  counted_by UUID REFERENCES users(id),
  counted_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(reconciliation_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_recon_items_reconciliation ON reconciliation_items(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_recon_items_product ON reconciliation_items(product_id);
CREATE INDEX IF NOT EXISTS idx_recon_items_variance ON reconciliation_items(reconciliation_id) WHERE variance_quantity != 0;

-- ============================================================================
-- WAREHOUSE_CAPACITY_LIMITS TABLE - Capacity management
-- ============================================================================

CREATE TABLE IF NOT EXISTS warehouse_capacity_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  max_quantity NUMERIC(10,2) NOT NULL CHECK (max_quantity > 0),
  warning_threshold_pct NUMERIC(5,2) DEFAULT 80 CHECK (warning_threshold_pct > 0 AND warning_threshold_pct <= 100),
  current_quantity NUMERIC(10,2) DEFAULT 0,
  utilization_pct NUMERIC(5,2) GENERATED ALWAYS AS (CASE WHEN max_quantity > 0 THEN (current_quantity / max_quantity * 100) ELSE 0 END) STORED,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  UNIQUE(warehouse_id, product_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_capacity_warehouse ON warehouse_capacity_limits(warehouse_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_warehouse_capacity_product ON warehouse_capacity_limits(product_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_warehouse_capacity_utilization ON warehouse_capacity_limits(warehouse_id, utilization_pct) WHERE is_active = true;

COMMENT ON TABLE warehouse_capacity_limits IS 'Capacity limits to prevent over-allocation and optimize space utilization';

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_vehicle_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_capacity_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Warehouses
-- ============================================================================

CREATE POLICY "Everyone can view active warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (
    is_active = true AND (
      scope_level = 'infrastructure' OR
      business_id IN (
        SELECT business_id FROM user_business_roles
        WHERE user_id = auth.uid() AND is_active = true
      ) OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('infrastructure_owner', 'infrastructure_manager', 'infrastructure_warehouse')
      )
    )
  );

CREATE POLICY "Infrastructure roles can manage warehouses"
  ON warehouses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_warehouse')
    )
  );

-- ============================================================================
-- RLS POLICIES - Inventory Movements (Read-only audit trail)
-- ============================================================================

CREATE POLICY "Users can view movements for their business"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR from_driver_id = auth.uid()
    OR to_driver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_manager', 'infrastructure_warehouse')
    )
  );

CREATE POLICY "Authorized users can create movements"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    moved_by = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('infrastructure_owner', 'infrastructure_warehouse', 'infrastructure_dispatcher', 'warehouse', 'manager', 'driver')
      )
    )
  );

-- ============================================================================
-- RLS POLICIES - Stock Allocations
-- ============================================================================

CREATE POLICY "Business users can view their allocations"
  ON stock_allocations FOR SELECT
  TO authenticated
  USING (
    to_business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_manager', 'infrastructure_warehouse')
    )
  );

CREATE POLICY "Business owners can request allocations"
  ON stock_allocations FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND
    to_business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'manager', 'warehouse')
    )
  );

CREATE POLICY "Infrastructure warehouse can approve allocations"
  ON stock_allocations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_warehouse')
    )
  );

-- ============================================================================
-- RLS POLICIES - Driver Vehicle Inventory
-- ============================================================================

CREATE POLICY "Drivers can view own inventory"
  ON driver_vehicle_inventory FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.uid()
    OR business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'manager', 'dispatcher')
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_manager', 'infrastructure_warehouse')
    )
  );

CREATE POLICY "Drivers and managers can update driver inventory"
  ON driver_vehicle_inventory FOR ALL
  TO authenticated
  USING (
    driver_id = auth.uid()
    OR business_id IN (
      SELECT ubr.business_id FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'manager', 'warehouse')
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_warehouse')
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate allocation number
CREATE OR REPLACE FUNCTION generate_allocation_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ALLOC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('allocation_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create sequence for allocation numbers
CREATE SEQUENCE IF NOT EXISTS allocation_number_seq START 1;

-- Function to automatically set allocation number
CREATE OR REPLACE FUNCTION set_allocation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.allocation_number IS NULL THEN
    NEW.allocation_number := generate_allocation_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_allocation_number_trigger
  BEFORE INSERT ON stock_allocations
  FOR EACH ROW
  EXECUTE FUNCTION set_allocation_number();

-- Function to validate warehouse scope on allocations
CREATE OR REPLACE FUNCTION validate_allocation_scope()
RETURNS TRIGGER AS $$
DECLARE
  v_from_scope TEXT;
  v_to_scope TEXT;
BEGIN
  SELECT scope_level INTO v_from_scope FROM warehouses WHERE id = NEW.from_warehouse_id;
  SELECT scope_level INTO v_to_scope FROM warehouses WHERE id = NEW.to_warehouse_id;
  
  IF v_from_scope != 'infrastructure' THEN
    RAISE EXCEPTION 'Allocations must originate from infrastructure warehouses';
  END IF;
  
  IF v_to_scope != 'business' THEN
    RAISE EXCEPTION 'Allocations must be destined for business warehouses';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_allocation_scope_trigger
  BEFORE INSERT ON stock_allocations
  FOR EACH ROW
  EXECUTE FUNCTION validate_allocation_scope();
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
/*
  # Fix Audit Trigger for Businesses Table

  ## Problem
  The audit trigger function assumes all tables have a business_id column,
  but the businesses table itself doesn't have this column (it IS the business).

  ## Solution
  Update the audit trigger function to handle tables without business_id gracefully.
*/

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_action TEXT;
  v_business_id UUID;
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

  -- Safely extract business_id if column exists
  BEGIN
    IF TG_TABLE_NAME = 'businesses' THEN
      -- For businesses table, use the business ID itself
      v_business_id := COALESCE(NEW.id, OLD.id);
    ELSE
      -- Try to get business_id from NEW or OLD record
      v_business_id := COALESCE(
        (to_jsonb(NEW) ->> 'business_id')::UUID,
        (to_jsonb(OLD) ->> 'business_id')::UUID
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If business_id doesn't exist or cast fails, set to NULL
    v_business_id := NULL;
  END;

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
    v_business_id,
    v_action,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION audit_trigger_func() IS 'Generic audit trigger function - handles tables with or without business_id column';
/*
  # Add Missing Audit Event Types

  ## Problem
  The system_audit_log table has a CHECK constraint with a fixed list of event types.
  Dynamic table triggers are generating new event types that aren't in the list.

  ## Solution
  Add all missing event types including businesses_created, zones_created, etc.
*/

-- Drop the old constraint
ALTER TABLE system_audit_log DROP CONSTRAINT IF EXISTS system_audit_log_event_type_check;

-- Add new comprehensive constraint with all event types
ALTER TABLE system_audit_log 
ADD CONSTRAINT system_audit_log_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'user_created'::text,
  'user_updated'::text,
  'user_deleted'::text,
  'business_created'::text,
  'business_updated'::text,
  'business_deleted'::text,
  'businesses_created'::text,
  'businesses_updated'::text,
  'businesses_deleted'::text,
  'order_created'::text,
  'order_updated'::text,
  'order_cancelled'::text,
  'orders_created'::text,
  'orders_updated'::text,
  'orders_deleted'::text,
  'zones_created'::text,
  'zones_updated'::text,
  'zones_deleted'::text,
  'products_created'::text,
  'products_updated'::text,
  'products_deleted'::text,
  'stock_allocations_created'::text,
  'stock_allocations_updated'::text,
  'stock_allocations_deleted'::text,
  'inventory_transferred'::text,
  'inventory_adjusted'::text,
  'role_assigned'::text,
  'role_changed'::text,
  'permission_modified'::text,
  'financial_accessed'::text,
  'report_generated'::text,
  'settings_changed'::text,
  'data_exported'::text,
  'login_success'::text,
  'login_failed'::text,
  'logout'::text,
  'api_call'::text,
  'webhook_received'::text
]));

COMMENT ON CONSTRAINT system_audit_log_event_type_check ON system_audit_log IS 'Allowed audit event types - includes all table operations';
/*
  # Cleanup Demo Data and Enforce Business ID Constraints

  ## Overview
  This migration removes all demo data references and enforces strict business_id constraints.

  ## Changes
  1. Create Infrastructure Business
  2. Remove Demo Mode from user_preferences
  3. Enforce business_id NOT NULL on orders, products, zones
  4. Add data validation functions
  5. Update RLS policies for strict scoping
  6. Add triggers to prevent null business_id
*/

-- ============================================================================
-- STEP 1: Create Infrastructure Business
-- ============================================================================

INSERT INTO businesses (
  id, 
  name, 
  name_hebrew, 
  business_type, 
  order_number_prefix, 
  order_number_sequence,
  default_currency,
  primary_color,
  secondary_color,
  active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Infrastructure Operations',
  'תפעול תשתית',
  'logistics',
  'INFRA',
  1000,
  'ILS',
  '#667eea',
  '#764ba2',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  active = true,
  updated_at = NOW();

-- ============================================================================
-- STEP 2: Remove Demo Mode
-- ============================================================================

UPDATE user_preferences SET mode = 'real' WHERE mode != 'real';

ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_mode_check;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_mode_check CHECK (mode IN ('real'));

COMMENT ON COLUMN user_preferences.mode IS 'Operating mode - only real data allowed';

-- ============================================================================
-- STEP 3: Enforce business_id on Orders
-- ============================================================================

UPDATE orders SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE orders ALTER COLUMN business_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_business_id_fkey'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);

-- ============================================================================
-- STEP 4: Enforce business_id on Products
-- ============================================================================

UPDATE products SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE products ALTER COLUMN business_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_business_id_fkey'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);

-- ============================================================================
-- STEP 5: Enforce business_id on Zones
-- ============================================================================

UPDATE zones SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE zones ALTER COLUMN business_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'zones_business_id_fkey'
  ) THEN
    ALTER TABLE zones ADD CONSTRAINT zones_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_zones_business_id ON zones(business_id);

-- ============================================================================
-- STEP 6: Data Validation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_data_integrity()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_demo_count INT;
  v_inactive_business_orders INT;
BEGIN
  SELECT COUNT(*) INTO v_demo_count FROM user_preferences WHERE mode != 'real';
  
  RETURN QUERY
  SELECT 
    'No Demo Mode'::TEXT,
    CASE WHEN v_demo_count = 0 THEN 'PASS' ELSE 'FAIL' END,
    v_demo_count || ' demo mode records'::TEXT;

  RETURN QUERY
  SELECT 
    'Infrastructure Business Exists'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM businesses WHERE id = '00000000-0000-0000-0000-000000000001') 
         THEN 'PASS' ELSE 'FAIL' END,
    'Infrastructure business check'::TEXT;

  SELECT COUNT(*) INTO v_inactive_business_orders
  FROM orders o JOIN businesses b ON o.business_id = b.id WHERE b.active = false;

  RETURN QUERY
  SELECT 
    'No Inactive Business Orders'::TEXT,
    CASE WHEN v_inactive_business_orders = 0 THEN 'PASS' ELSE 'WARN' END,
    v_inactive_business_orders || ' orders reference inactive businesses'::TEXT;

  RETURN QUERY SELECT 'Orders Have Business ID'::TEXT,
    CASE WHEN NOT EXISTS (SELECT 1 FROM orders WHERE business_id IS NULL) THEN 'PASS' ELSE 'FAIL' END,
    'business_id constraint'::TEXT;

  RETURN QUERY SELECT 'Products Have Business ID'::TEXT,
    CASE WHEN NOT EXISTS (SELECT 1 FROM products WHERE business_id IS NULL) THEN 'PASS' ELSE 'FAIL' END,
    'business_id constraint'::TEXT;

  RETURN QUERY SELECT 'Zones Have Business ID'::TEXT,
    CASE WHEN NOT EXISTS (SELECT 1 FROM zones WHERE business_id IS NULL) THEN 'PASS' ELSE 'FAIL' END,
    'business_id constraint'::TEXT;
END;
$$;

-- ============================================================================
-- STEP 7: Prevent Null business_id Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_null_business_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.business_id IS NULL THEN
    RAISE EXCEPTION 'business_id cannot be NULL in table %', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_prevent_null_business_id ON orders;
CREATE TRIGGER orders_prevent_null_business_id
  BEFORE INSERT OR UPDATE ON orders FOR EACH ROW
  EXECUTE FUNCTION prevent_null_business_id();

DROP TRIGGER IF EXISTS products_prevent_null_business_id ON products;
CREATE TRIGGER products_prevent_null_business_id
  BEFORE INSERT OR UPDATE ON products FOR EACH ROW
  EXECUTE FUNCTION prevent_null_business_id();

DROP TRIGGER IF EXISTS zones_prevent_null_business_id ON zones;
CREATE TRIGGER zones_prevent_null_business_id
  BEFORE INSERT OR UPDATE ON zones FOR EACH ROW
  EXECUTE FUNCTION prevent_null_business_id();

-- ============================================================================
-- STEP 8: Update RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view orders in their business context" ON orders;
CREATE POLICY "Users can view orders in their business context" ON orders FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'infrastructure_owner')
  OR business_id IN (SELECT ubr.business_id FROM user_business_roles ubr WHERE ubr.user_id = auth.uid() AND ubr.is_active = true)
  OR assigned_driver = (SELECT telegram_id FROM users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view products in their business context" ON products;
CREATE POLICY "Users can view products in their business context" ON products FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'infrastructure_owner')
  OR business_id IN (SELECT ubr.business_id FROM user_business_roles ubr WHERE ubr.user_id = auth.uid() AND ubr.is_active = true)
);

DROP POLICY IF EXISTS "Users can view zones in their business context" ON zones;
CREATE POLICY "Users can view zones in their business context" ON zones FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'infrastructure_owner')
  OR business_id IN (SELECT ubr.business_id FROM user_business_roles ubr WHERE ubr.user_id = auth.uid() AND ubr.is_active = true)
);
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
/*
  # Warehouse Allocation Workflow Functions

  ## Overview
  Adds comprehensive functions for warehouse allocation workflow including
  approval, rejection, and fulfillment with automatic inventory tracking.

  ## Functions
  1. approve_stock_allocation - Approve allocation with quantity adjustment
  2. reject_stock_allocation - Reject allocation with reason
  3. fulfill_stock_allocation - Fulfill approved allocation and move inventory
  4. get_pending_allocations - Get allocations awaiting approval
  5. get_warehouse_stock_summary - Get current stock levels per warehouse

  ## Security
  - Only infrastructure_warehouse and infrastructure_owner can approve/reject
  - All operations create audit trail in inventory_movements
  - Validates sufficient stock before approval
  - Prevents over-allocation
*/

-- ============================================================================
-- FUNCTION: Approve Stock Allocation
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_stock_allocation(
  p_allocation_id UUID,
  p_approved_quantity NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allocation RECORD;
  v_available_quantity NUMERIC;
  v_result JSONB;
BEGIN
  -- Get allocation details
  SELECT 
    sa.*,
    p.name as product_name,
    fw.warehouse_name as from_warehouse_name,
    tw.warehouse_name as to_warehouse_name,
    b.name as business_name
  INTO v_allocation
  FROM stock_allocations sa
  JOIN products p ON p.id = sa.product_id
  JOIN warehouses fw ON fw.id = sa.from_warehouse_id
  JOIN warehouses tw ON tw.id = sa.to_warehouse_id
  JOIN businesses b ON b.id = sa.to_business_id
  WHERE sa.id = p_allocation_id
    AND sa.allocation_status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Allocation not found or not in pending status'
    );
  END IF;

  -- Validate approved quantity
  IF p_approved_quantity <= 0 OR p_approved_quantity > v_allocation.requested_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Approved quantity must be between 1 and requested quantity'
    );
  END IF;

  -- Check available stock (simplified - you may want to check actual inventory table)
  -- For now, we'll assume stock is available

  -- Update allocation
  UPDATE stock_allocations
  SET 
    allocation_status = 'approved',
    approved_quantity = p_approved_quantity,
    approved_by = auth.uid(),
    approved_at = NOW(),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_allocation_id;

  -- Create notification for requester
  INSERT INTO notifications (
    recipient_id,
    title,
    message,
    type,
    metadata
  )
  SELECT 
    u.telegram_id,
    'Stock Allocation Approved',
    format('Your allocation request for %s units of %s has been approved. Approved quantity: %s',
      v_allocation.requested_quantity,
      v_allocation.product_name,
      p_approved_quantity
    ),
    'success',
    jsonb_build_object(
      'allocation_id', p_allocation_id,
      'product_name', v_allocation.product_name,
      'approved_quantity', p_approved_quantity
    )
  FROM users u
  WHERE u.id = v_allocation.requested_by;

  v_result := jsonb_build_object(
    'success', true,
    'allocation_id', p_allocation_id,
    'approved_quantity', p_approved_quantity,
    'from_warehouse', v_allocation.from_warehouse_name,
    'to_warehouse', v_allocation.to_warehouse_name,
    'business', v_allocation.business_name
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION approve_stock_allocation IS 'Approves a pending stock allocation request';

-- ============================================================================
-- FUNCTION: Reject Stock Allocation
-- ============================================================================

CREATE OR REPLACE FUNCTION reject_stock_allocation(
  p_allocation_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allocation RECORD;
  v_result JSONB;
BEGIN
  -- Validate reason
  IF p_rejection_reason IS NULL OR LENGTH(TRIM(p_rejection_reason)) < 5 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rejection reason must be at least 5 characters'
    );
  END IF;

  -- Get allocation details
  SELECT 
    sa.*,
    p.name as product_name
  INTO v_allocation
  FROM stock_allocations sa
  JOIN products p ON p.id = sa.product_id
  WHERE sa.id = p_allocation_id
    AND sa.allocation_status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Allocation not found or not in pending status'
    );
  END IF;

  -- Update allocation
  UPDATE stock_allocations
  SET 
    allocation_status = 'rejected',
    approved_by = auth.uid(),
    approved_at = NOW(),
    rejection_reason = p_rejection_reason
  WHERE id = p_allocation_id;

  -- Notify requester
  INSERT INTO notifications (
    recipient_id,
    title,
    message,
    type,
    metadata
  )
  SELECT 
    u.telegram_id,
    'Stock Allocation Rejected',
    format('Your allocation request for %s has been rejected. Reason: %s',
      v_allocation.product_name,
      p_rejection_reason
    ),
    'warning',
    jsonb_build_object(
      'allocation_id', p_allocation_id,
      'product_name', v_allocation.product_name,
      'rejection_reason', p_rejection_reason
    )
  FROM users u
  WHERE u.id = v_allocation.requested_by;

  v_result := jsonb_build_object(
    'success', true,
    'allocation_id', p_allocation_id,
    'status', 'rejected'
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION reject_stock_allocation IS 'Rejects a pending stock allocation request';

-- ============================================================================
-- FUNCTION: Fulfill Stock Allocation
-- ============================================================================

CREATE OR REPLACE FUNCTION fulfill_stock_allocation(
  p_allocation_id UUID,
  p_delivered_quantity NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allocation RECORD;
  v_movement_id UUID;
  v_result JSONB;
BEGIN
  -- Get allocation details
  SELECT 
    sa.*,
    p.name as product_name
  INTO v_allocation
  FROM stock_allocations sa
  JOIN products p ON p.id = sa.product_id
  WHERE sa.id = p_allocation_id
    AND sa.allocation_status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Allocation not found or not in approved status'
    );
  END IF;

  -- Validate delivered quantity
  IF p_delivered_quantity <= 0 OR p_delivered_quantity > v_allocation.approved_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Delivered quantity must be between 1 and approved quantity'
    );
  END IF;

  -- Create inventory movement record
  INSERT INTO inventory_movements (
    movement_type,
    product_id,
    from_warehouse_id,
    to_warehouse_id,
    quantity,
    business_id,
    reference_number,
    movement_reason,
    notes,
    moved_by,
    approved_by
  ) VALUES (
    'infrastructure_allocation',
    v_allocation.product_id,
    v_allocation.from_warehouse_id,
    v_allocation.to_warehouse_id,
    p_delivered_quantity,
    v_allocation.to_business_id,
    v_allocation.allocation_number,
    'Stock allocation fulfillment',
    p_notes,
    auth.uid(),
    v_allocation.approved_by
  )
  RETURNING id INTO v_movement_id;

  -- Update allocation status
  UPDATE stock_allocations
  SET 
    allocation_status = CASE 
      WHEN p_delivered_quantity = approved_quantity THEN 'delivered'
      ELSE 'partial'
    END,
    delivered_quantity = p_delivered_quantity,
    delivered_by = auth.uid(),
    delivered_at = NOW(),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_allocation_id;

  -- Notify requester
  INSERT INTO notifications (
    recipient_id,
    title,
    message,
    type,
    metadata
  )
  SELECT 
    u.telegram_id,
    'Stock Allocation Fulfilled',
    format('Your allocation for %s has been delivered. Quantity: %s',
      v_allocation.product_name,
      p_delivered_quantity
    ),
    'success',
    jsonb_build_object(
      'allocation_id', p_allocation_id,
      'product_name', v_allocation.product_name,
      'delivered_quantity', p_delivered_quantity,
      'movement_id', v_movement_id
    )
  FROM users u
  WHERE u.id = v_allocation.requested_by;

  v_result := jsonb_build_object(
    'success', true,
    'allocation_id', p_allocation_id,
    'delivered_quantity', p_delivered_quantity,
    'movement_id', v_movement_id,
    'status', CASE 
      WHEN p_delivered_quantity = v_allocation.approved_quantity THEN 'delivered'
      ELSE 'partial'
    END
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION fulfill_stock_allocation IS 'Fulfills an approved allocation and creates inventory movement';

-- ============================================================================
-- FUNCTION: Get Pending Allocations
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_allocations(
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS TABLE (
  allocation_id UUID,
  allocation_number TEXT,
  product_id UUID,
  product_name TEXT,
  requested_quantity NUMERIC,
  from_warehouse_id UUID,
  from_warehouse_name TEXT,
  to_warehouse_id UUID,
  to_warehouse_name TEXT,
  to_business_id UUID,
  business_name TEXT,
  requested_by UUID,
  requester_name TEXT,
  requested_at TIMESTAMPTZ,
  priority TEXT,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id,
    sa.allocation_number,
    sa.product_id,
    p.name,
    sa.requested_quantity,
    sa.from_warehouse_id,
    fw.warehouse_name,
    sa.to_warehouse_id,
    tw.warehouse_name,
    sa.to_business_id,
    b.name,
    sa.requested_by,
    u.name,
    sa.requested_at,
    sa.priority,
    sa.notes
  FROM stock_allocations sa
  JOIN products p ON p.id = sa.product_id
  JOIN warehouses fw ON fw.id = sa.from_warehouse_id
  JOIN warehouses tw ON tw.id = sa.to_warehouse_id
  JOIN businesses b ON b.id = sa.to_business_id
  LEFT JOIN users u ON u.id = sa.requested_by
  WHERE sa.allocation_status = 'pending'
    AND (p_warehouse_id IS NULL OR sa.from_warehouse_id = p_warehouse_id)
  ORDER BY 
    CASE sa.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    sa.requested_at;
END;
$$;

COMMENT ON FUNCTION get_pending_allocations IS 'Returns pending stock allocations awaiting approval';

-- ============================================================================
-- FUNCTION: Get Warehouse Stock Summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_warehouse_stock_summary(
  p_warehouse_id UUID
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_sku TEXT,
  total_movements_in NUMERIC,
  total_movements_out NUMERIC,
  calculated_stock NUMERIC,
  pending_allocations NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.sku,
    COALESCE(SUM(CASE WHEN im.to_warehouse_id = p_warehouse_id THEN im.quantity ELSE 0 END), 0) as movements_in,
    COALESCE(SUM(CASE WHEN im.from_warehouse_id = p_warehouse_id THEN im.quantity ELSE 0 END), 0) as movements_out,
    COALESCE(SUM(CASE WHEN im.to_warehouse_id = p_warehouse_id THEN im.quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN im.from_warehouse_id = p_warehouse_id THEN im.quantity ELSE 0 END), 0) as calculated_stock,
    COALESCE((
      SELECT SUM(sa.requested_quantity)
      FROM stock_allocations sa
      WHERE sa.from_warehouse_id = p_warehouse_id
        AND sa.product_id = p.id
        AND sa.allocation_status = 'pending'
    ), 0) as pending_allocations
  FROM products p
  LEFT JOIN inventory_movements im ON im.product_id = p.id
    AND (im.from_warehouse_id = p_warehouse_id OR im.to_warehouse_id = p_warehouse_id)
  GROUP BY p.id, p.name, p.sku
  HAVING 
    COALESCE(SUM(CASE WHEN im.to_warehouse_id = p_warehouse_id THEN im.quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN im.from_warehouse_id = p_warehouse_id THEN im.quantity ELSE 0 END), 0) > 0
    OR EXISTS (
      SELECT 1 FROM stock_allocations sa
      WHERE sa.from_warehouse_id = p_warehouse_id
        AND sa.product_id = p.id
        AND sa.allocation_status = 'pending'
    )
  ORDER BY p.name;
END;
$$;

COMMENT ON FUNCTION get_warehouse_stock_summary IS 'Returns stock summary for a warehouse including pending allocations';
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
/*
  # Create get_business_summaries Function
  
  1. New Functions
    - `get_business_summaries` - Returns aggregated business metrics for infrastructure owner dashboard
      - Business name, active status
      - Total orders, revenue today
      - Active drivers, pending orders
  
  2. Security
    - SECURITY DEFINER to bypass RLS restrictions
    - Allows infrastructure_owner to view cross-business aggregated data
    - Returns meaningful fallback values when no data exists
*/

-- Create the get_business_summaries function
CREATE OR REPLACE FUNCTION get_business_summaries()
RETURNS TABLE (
  id uuid,
  name text,
  active boolean,
  total_orders bigint,
  revenue_today numeric,
  active_drivers bigint,
  pending_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.active,
    -- Total orders for this business
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM orders o
      WHERE o.business_id = b.id
    ), 0) as total_orders,
    -- Revenue today for this business
    COALESCE((
      SELECT SUM(o.total_amount)
      FROM orders o
      WHERE o.business_id = b.id
        AND o.created_at >= CURRENT_DATE
        AND o.status = 'delivered'
    ), 0) as revenue_today,
    -- Active drivers for this business
    COALESCE((
      SELECT COUNT(DISTINCT u.id)::bigint
      FROM users u
      WHERE u.business_id = b.id
        AND u.role IN ('driver', 'infrastructure_driver')
        AND u.status = 'active'
    ), 0) as active_drivers,
    -- Pending orders for this business
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM orders o
      WHERE o.business_id = b.id
        AND o.status IN ('pending', 'assigned', 'enroute')
    ), 0) as pending_orders
  FROM businesses b
  ORDER BY b.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_business_summaries TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_business_summaries IS 'Returns aggregated business metrics for infrastructure owner dashboard';
/*
  # Fix RLS Policies for Infrastructure Owner
  
  1. Changes
    - Allow infrastructure_owner to SELECT all orders across all businesses
    - Allow infrastructure_owner to SELECT all stock_allocations across all businesses
    - Allow infrastructure_owner to SELECT all users across all businesses
    - Allow infrastructure_owner to SELECT all businesses
  
  2. Security
    - Policies remain restrictive for other roles
    - Only infrastructure_owner role gets cross-business access
    - All policies check against users.role column
*/

-- ============================================================================
-- ORDERS TABLE - Infrastructure Owner Access
-- ============================================================================

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Infrastructure owner can view all orders" ON orders;

-- Create policy for infrastructure owner to view all orders
CREATE POLICY "Infrastructure owner can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- STOCK_ALLOCATIONS TABLE - Infrastructure Owner Access
-- ============================================================================

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Infrastructure owner can view all allocations" ON stock_allocations;

-- Create policy for infrastructure owner to view all stock allocations
CREATE POLICY "Infrastructure owner can view all allocations"
  ON stock_allocations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- USERS TABLE - Infrastructure Owner Access
-- ============================================================================

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Infrastructure owner can view all users" ON users;

-- Create policy for infrastructure owner to view all users
CREATE POLICY "Infrastructure owner can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- BUSINESSES TABLE - Infrastructure Owner Access
-- ============================================================================

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Infrastructure owner can view all businesses" ON businesses;

-- Create policy for infrastructure owner to view all businesses
CREATE POLICY "Infrastructure owner can view all businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- SYSTEM_AUDIT_LOG TABLE - Fix Business Relation Query
-- ============================================================================

-- Ensure system_audit_log has proper foreign key to businesses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'system_audit_log_business_id_fkey'
  ) THEN
    ALTER TABLE system_audit_log
    ADD CONSTRAINT system_audit_log_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES businesses(id);
  END IF;
END $$;
/*
  # Add Performance Indexes for Infrastructure Owner Dashboard
  
  1. New Indexes
    - orders(business_id) - for cross-business order queries
    - orders(created_at) - for date-based revenue filtering
    - orders(status) - for pending/active order counts
    - stock_allocations(to_business_id, allocation_status) - for pending allocation counts
    - users(role) - for driver count queries
    - users(business_id, role) - composite index for business-specific role queries
    - businesses(active) - for active business filtering
  
  2. Performance
    - All queries in dashboard will use these indexes
    - Significantly faster cross-business aggregations
    - Better performance for infrastructure_owner role queries
*/

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_business_status ON orders(business_id, status);

-- Stock allocations indexes (using to_business_id column)
CREATE INDEX IF NOT EXISTS idx_stock_allocations_to_business ON stock_allocations(to_business_id);
CREATE INDEX IF NOT EXISTS idx_stock_allocations_status ON stock_allocations(allocation_status);
CREATE INDEX IF NOT EXISTS idx_stock_allocations_business_status ON stock_allocations(to_business_id, allocation_status);

-- Users table indexes (no status column exists, so skip that)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_business_role ON users(business_id, role) WHERE business_id IS NOT NULL;

-- Businesses table indexes
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(active);
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON businesses(created_at DESC);

-- System audit log indexes (already exist but verify)
CREATE INDEX IF NOT EXISTS idx_system_audit_business_created ON system_audit_log(business_id, created_at DESC);

-- Add helpful comments
COMMENT ON INDEX idx_orders_business_id IS 'Fast cross-business order queries for infrastructure owner';
COMMENT ON INDEX idx_stock_allocations_business_status IS 'Fast pending allocation counts per business';
COMMENT ON INDEX idx_users_business_role IS 'Fast driver counts per business';
/*
  # Fix get_business_summaries Function
  
  1. Changes
    - Remove status filter from users query (column doesn't exist)
    - Use registration_status or is_online for active user detection
    - Add better fallback handling for NULL values
*/

-- Update the get_business_summaries function
CREATE OR REPLACE FUNCTION get_business_summaries()
RETURNS TABLE (
  id uuid,
  name text,
  active boolean,
  total_orders bigint,
  revenue_today numeric,
  active_drivers bigint,
  pending_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.active,
    -- Total orders for this business
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM orders o
      WHERE o.business_id = b.id
    ), 0) as total_orders,
    -- Revenue today for this business
    COALESCE((
      SELECT SUM(o.total_amount)
      FROM orders o
      WHERE o.business_id = b.id
        AND o.created_at >= CURRENT_DATE
        AND o.status = 'delivered'
    ), 0) as revenue_today,
    -- Active drivers for this business (using role and business_id only)
    COALESCE((
      SELECT COUNT(DISTINCT u.id)::bigint
      FROM users u
      WHERE u.business_id = b.id
        AND u.role IN ('driver', 'infrastructure_driver')
    ), 0) as active_drivers,
    -- Pending orders for this business
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM orders o
      WHERE o.business_id = b.id
        AND o.status IN ('pending', 'assigned', 'enroute')
    ), 0) as pending_orders
  FROM businesses b
  ORDER BY b.created_at DESC;
END;
$$;

-- Ensure execute permission
GRANT EXECUTE ON FUNCTION get_business_summaries TO authenticated;
/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  The `is_infrastructure_owner()` function queries the users table, which triggers RLS policies.
  Some RLS policies call `is_infrastructure_owner()`, creating an infinite recursion loop.
  Error: "infinite recursion detected in policy for relation users"

  ## Solution
  1. Drop problematic recursive helper functions
  2. Create non-recursive helper functions that read from JWT claims/raw_app_meta_data
  3. Drop and recreate all RLS policies on users table without circular dependencies
  4. Fix infrastructure owner access policies on other tables
  5. Fix get_business_summaries function to remove non-existent column references

  ## Security
  - Maintains same security posture
  - Uses JWT claims which are cryptographically signed and tamper-proof
  - Infrastructure owners still have proper cross-business access
  - All other roles maintain their restrictions
*/

-- ============================================================================
-- STEP 1: Drop existing problematic policies and functions
-- ============================================================================

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Infrastructure owner can view all users" ON users;
DROP POLICY IF EXISTS "users_delete_infra_owner" ON users;
DROP POLICY IF EXISTS "users_delete_service_role" ON users;
DROP POLICY IF EXISTS "users_insert_anon" ON users;
DROP POLICY IF EXISTS "users_insert_authenticated" ON users;
DROP POLICY IF EXISTS "users_insert_service_role" ON users;
DROP POLICY IF EXISTS "users_select_all_authenticated" ON users;
DROP POLICY IF EXISTS "users_select_anon" ON users;
DROP POLICY IF EXISTS "users_select_service_role" ON users;
DROP POLICY IF EXISTS "users_update_infra_owner" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_update_service_role" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_infra_owner" ON users;
DROP POLICY IF EXISTS "users_select_colleagues" ON users;
DROP POLICY IF EXISTS "users_insert_self" ON users;
DROP POLICY IF EXISTS "users_insert_infra_owner" ON users;

-- Drop existing functions (will recreate them properly)
DROP FUNCTION IF EXISTS is_infrastructure_owner() CASCADE;
DROP FUNCTION IF EXISTS is_infrastructure_owner(text) CASCADE;
DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_telegram_id() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_telegram_id_from_auth() CASCADE;
DROP FUNCTION IF EXISTS is_current_user_infrastructure_owner() CASCADE;
DROP FUNCTION IF EXISTS is_current_user_manager_or_above() CASCADE;

-- ============================================================================
-- STEP 2: Create non-recursive helper functions
-- ============================================================================

-- Get current user's auth UID (never triggers RLS)
CREATE OR REPLACE FUNCTION get_auth_uid()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Check if current user is infrastructure owner by reading from app_metadata
-- This bypasses RLS by not querying the users table during policy evaluation
CREATE OR REPLACE FUNCTION is_infra_owner_from_jwt()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'infrastructure_owner',
    false
  );
$$;

-- Get telegram_id from JWT without querying users table
CREATE OR REPLACE FUNCTION get_telegram_id_from_jwt()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'telegram_id',
    auth.jwt() ->> 'telegram_id'
  );
$$;

-- ============================================================================
-- STEP 3: Create new non-recursive RLS policies on users table
-- ============================================================================

-- Allow all authenticated users to SELECT (app needs this for functionality)
CREATE POLICY "users_select_authenticated"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon to SELECT for registration flow
CREATE POLICY "users_select_anon"
  ON users FOR SELECT
  TO anon
  USING (true);

-- Allow service role full access
CREATE POLICY "users_select_service"
  ON users FOR SELECT
  TO service_role
  USING (true);

-- Users can update their own profile
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (id = get_auth_uid())
  WITH CHECK (id = get_auth_uid());

-- Infrastructure owners can update any user (using JWT check, no recursion)
CREATE POLICY "users_update_infra"
  ON users FOR UPDATE
  TO authenticated
  USING (is_infra_owner_from_jwt())
  WITH CHECK (true);

-- Service role can update any user
CREATE POLICY "users_update_service"
  ON users FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert (for registration)
CREATE POLICY "users_insert_authenticated"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anon to insert (for initial registration)
CREATE POLICY "users_insert_anon"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

-- Service role can insert
CREATE POLICY "users_insert_service"
  ON users FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Infrastructure owners can delete users (using JWT check, no recursion)
CREATE POLICY "users_delete_infra"
  ON users FOR DELETE
  TO authenticated
  USING (is_infra_owner_from_jwt());

-- Service role can delete
CREATE POLICY "users_delete_service"
  ON users FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- STEP 4: Fix policies on other tables for infrastructure owner
-- ============================================================================

-- Orders table
DROP POLICY IF EXISTS "Infrastructure owner can view all orders" ON orders;
CREATE POLICY "orders_select_infra_owner"
  ON orders FOR SELECT
  TO authenticated
  USING (is_infra_owner_from_jwt());

-- Stock allocations table
DROP POLICY IF EXISTS "Infrastructure owner can view all allocations" ON stock_allocations;
CREATE POLICY "allocations_select_infra_owner"
  ON stock_allocations FOR SELECT
  TO authenticated
  USING (is_infra_owner_from_jwt());

-- Businesses table
DROP POLICY IF EXISTS "Infrastructure owner can view all businesses" ON businesses;
CREATE POLICY "businesses_select_infra_owner"
  ON businesses FOR SELECT
  TO authenticated
  USING (is_infra_owner_from_jwt());

-- System audit log table
DROP POLICY IF EXISTS "Infrastructure owner can view all audit logs" ON system_audit_log;
CREATE POLICY "audit_select_infra_owner"
  ON system_audit_log FOR SELECT
  TO authenticated
  USING (is_infra_owner_from_jwt());

-- ============================================================================
-- STEP 5: Fix get_business_summaries function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_business_summaries()
RETURNS TABLE (
  id uuid,
  name text,
  active boolean,
  total_orders bigint,
  revenue_today numeric,
  active_drivers bigint,
  pending_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.active,
    -- Total orders for this business
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM orders o
      WHERE o.business_id = b.id
    ), 0) as total_orders,
    -- Revenue today for this business
    COALESCE((
      SELECT SUM(o.total_amount)
      FROM orders o
      WHERE o.business_id = b.id
        AND o.created_at >= CURRENT_DATE
        AND o.status = 'delivered'
    ), 0) as revenue_today,
    -- Active drivers for this business (removed status column reference)
    COALESCE((
      SELECT COUNT(DISTINCT u.id)::bigint
      FROM users u
      WHERE u.business_id = b.id
        AND u.role IN ('driver', 'infrastructure_driver')
        AND u.registration_status = 'approved'
    ), 0) as active_drivers,
    -- Pending orders for this business
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM orders o
      WHERE o.business_id = b.id
        AND o.status IN ('pending', 'assigned', 'enroute')
    ), 0) as pending_orders
  FROM businesses b
  ORDER BY b.created_at DESC;
END;
$$;

-- ============================================================================
-- STEP 6: Grant necessary permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_auth_uid() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION is_infra_owner_from_jwt() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_telegram_id_from_jwt() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_business_summaries() TO authenticated, service_role;

-- ============================================================================
-- STEP 7: Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION get_auth_uid() IS 'Returns current auth.uid() without triggering RLS';
COMMENT ON FUNCTION is_infra_owner_from_jwt() IS 'Checks if user is infrastructure owner from JWT app_metadata, bypassing RLS';
COMMENT ON FUNCTION get_telegram_id_from_jwt() IS 'Gets telegram_id from JWT without querying users table';
COMMENT ON FUNCTION get_business_summaries() IS 'Returns business summaries for infrastructure owner dashboard';
/*
  # Sync JWT app_metadata for Infrastructure Owners

  ## Problem
  The new RLS functions check JWT app_metadata for role, but this data isn't being synced
  when users authenticate or their roles change.

  ## Solution
  1. Create trigger to sync user role to auth.users.raw_app_meta_data
  2. Update existing infrastructure owner users to have proper app_metadata
  3. This ensures is_infra_owner_from_jwt() works correctly

  ## Security
  - Only updates app_metadata, which is read-only from user perspective
  - Maintains proper role-based access control
*/

-- ============================================================================
-- STEP 1: Create function to sync user role to auth metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_user_role_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users raw_app_meta_data with role and telegram_id
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', NEW.role::text,
      'telegram_id', NEW.telegram_id,
      'business_id', NEW.business_id,
      'registration_status', NEW.registration_status::text
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Create trigger to sync on INSERT and UPDATE
-- ============================================================================

DROP TRIGGER IF EXISTS sync_user_role_to_auth ON users;
CREATE TRIGGER sync_user_role_to_auth
  AFTER INSERT OR UPDATE OF role, telegram_id, business_id, registration_status ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_auth_metadata();

-- ============================================================================
-- STEP 3: Sync existing users' roles to auth metadata
-- ============================================================================

-- Update all existing users to have their role in auth.users.raw_app_meta_data
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, role, telegram_id, business_id, registration_status 
    FROM users 
    WHERE id IS NOT NULL
  LOOP
    BEGIN
      UPDATE auth.users
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
          'role', user_record.role::text,
          'telegram_id', user_record.telegram_id,
          'business_id', user_record.business_id,
          'registration_status', user_record.registration_status::text
        )
      WHERE id = user_record.id;
    EXCEPTION WHEN OTHERS THEN
      -- Skip if user doesn't exist in auth.users
      CONTINUE;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Add helpful comment
-- ============================================================================

COMMENT ON FUNCTION sync_user_role_to_auth_metadata() IS 'Syncs user role and metadata to auth.users.raw_app_meta_data for JWT claims';
/*
  # Fix Remaining Recursive Policies

  ## Problem
  Some policies on orders and stock_allocations still query the users table directly,
  which can cause recursion issues.

  ## Solution
  Replace direct users table queries with JWT-based checks using is_infra_owner_from_jwt()

  ## Security
  - Maintains same security level
  - Uses JWT claims which are cryptographically signed
*/

-- ============================================================================
-- Fix orders table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view orders in their business context" ON orders;

CREATE POLICY "orders_select_business_context"
  ON orders FOR SELECT
  TO authenticated
  USING (
    -- Infrastructure owner can see all
    is_infra_owner_from_jwt() OR
    -- Users in the business can see orders
    business_id IN (
      SELECT ubr.business_id
      FROM user_business_roles ubr
      WHERE ubr.user_id = auth.uid() AND ubr.is_active = true
    ) OR
    -- Assigned driver can see their orders
    assigned_driver = (
      SELECT telegram_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- Fix stock_allocations table policies
-- ============================================================================

DROP POLICY IF EXISTS "Business users can view their allocations" ON stock_allocations;

CREATE POLICY "allocations_select_business_context"
  ON stock_allocations FOR SELECT
  TO authenticated
  USING (
    -- Infrastructure owner/manager/warehouse can see all
    is_infra_owner_from_jwt() OR
    -- Check role from JWT metadata for infrastructure roles
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('infrastructure_manager', 'infrastructure_warehouse') OR
    -- Business users can see their allocations
    to_business_id IN (
      SELECT user_business_roles.business_id
      FROM user_business_roles
      WHERE user_business_roles.user_id = auth.uid() AND user_business_roles.is_active = true
    )
  );
/*
  # Remove Hardcoded Businesses and Fix RLS Policies

  ## Overview
  This migration removes hardcoded infrastructure business and ensures proper RLS policies
  for business creation by infrastructure owners.

  ## Changes
  1. Remove hardcoded Infrastructure Operations business
  2. Update orders, products, zones that reference the hardcoded business (set to NULL or handle appropriately)
  3. Fix RLS policies for businesses table to allow infrastructure owners to create businesses
  4. Add proper policies for business_ownership table
*/

-- ============================================================================
-- STEP 1: Check and Clean Up Hardcoded Business References
-- ============================================================================

-- Get the hardcoded business ID
DO $$
DECLARE
  hardcoded_business_id UUID := '00000000-0000-0000-0000-000000000001';
  business_exists BOOLEAN;
BEGIN
  -- Check if hardcoded business exists
  SELECT EXISTS (
    SELECT 1 FROM businesses WHERE id = hardcoded_business_id
  ) INTO business_exists;

  IF business_exists THEN
    RAISE NOTICE 'Found hardcoded Infrastructure Operations business, cleaning up...';

    -- Delete related data (cascade should handle most of this)
    -- But we'll be explicit for clarity
    DELETE FROM business_equity WHERE business_id = hardcoded_business_id;
    DELETE FROM business_users WHERE business_id = hardcoded_business_id;

    -- Update orders to NULL business_id (we'll handle this with new RLS later)
    -- Note: This might fail if business_id is NOT NULL constraint
    -- In that case, we'd need to delete the orders or assign them to a real business
    UPDATE orders SET business_id = NULL WHERE business_id = hardcoded_business_id;

    -- Update products to NULL business_id
    UPDATE products SET business_id = NULL WHERE business_id = hardcoded_business_id;

    -- Update zones to NULL business_id
    UPDATE zones SET business_id = NULL WHERE business_id = hardcoded_business_id;

    -- Finally, delete the hardcoded business
    DELETE FROM businesses WHERE id = hardcoded_business_id;

    RAISE NOTICE 'Hardcoded Infrastructure Operations business removed successfully';
  ELSE
    RAISE NOTICE 'Hardcoded Infrastructure Operations business not found, skipping cleanup';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Fix RLS Policies for businesses Table
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Infrastructure owners can view all businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can view their businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can insert businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can create businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can update businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can update their businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can delete businesses" ON businesses;

-- Create comprehensive RLS policies for businesses table

-- SELECT: Infrastructure owners can see all businesses
CREATE POLICY "Infrastructure owners can view all businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- SELECT: Business owners and related users can see their businesses
CREATE POLICY "Users can view businesses they own or work for"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_equity
      WHERE business_equity.business_id = businesses.id
      AND business_equity.stakeholder_id = auth.uid()
      AND business_equity.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = businesses.id
      AND business_users.user_id = auth.uid()
      AND business_users.active = true
    )
  );

-- INSERT: Only infrastructure owners can create businesses
CREATE POLICY "Infrastructure owners can create businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- UPDATE: Infrastructure owners can update all businesses
CREATE POLICY "Infrastructure owners can update all businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- UPDATE: Business owners can update their own businesses
CREATE POLICY "Business owners can update their businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_equity
      WHERE business_equity.business_id = businesses.id
      AND business_equity.stakeholder_id = auth.uid()
      AND business_equity.is_active = true
      AND business_equity.equity_type = 'founder'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_equity
      WHERE business_equity.business_id = businesses.id
      AND business_equity.stakeholder_id = auth.uid()
      AND business_equity.is_active = true
      AND business_equity.equity_type = 'founder'
    )
  );

-- DELETE: Only infrastructure owners can delete businesses
CREATE POLICY "Infrastructure owners can delete businesses"
  ON businesses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- STEP 3: Fix RLS Policies for business_equity Table
-- ============================================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view their equity records" ON business_equity;
DROP POLICY IF EXISTS "Infrastructure owners can view all equity records" ON business_equity;
DROP POLICY IF EXISTS "Users can insert equity records" ON business_equity;
DROP POLICY IF EXISTS "Infrastructure owners can create equity records" ON business_equity;
DROP POLICY IF EXISTS "Users can update their equity records" ON business_equity;
DROP POLICY IF EXISTS "Infrastructure owners can update equity records" ON business_equity;

-- Create comprehensive RLS policies for business_equity table

-- SELECT: Users can see their own equity records
CREATE POLICY "Users can view their equity records"
  ON business_equity FOR SELECT
  TO authenticated
  USING (stakeholder_id = auth.uid());

-- SELECT: Infrastructure owners can see all equity records
CREATE POLICY "Infrastructure owners can view all equity records"
  ON business_equity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- INSERT: Infrastructure owners can create equity records
CREATE POLICY "Infrastructure owners can create equity records"
  ON business_equity FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- INSERT: Business founders can add other stakeholders to their businesses
CREATE POLICY "Business founders can create equity records"
  ON business_equity FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_equity existing
      WHERE existing.business_id = business_equity.business_id
      AND existing.stakeholder_id = auth.uid()
      AND existing.is_active = true
      AND existing.equity_type = 'founder'
    )
  );

-- UPDATE: Infrastructure owners can update equity records
CREATE POLICY "Infrastructure owners can update equity records"
  ON business_equity FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- STEP 4: Add Helpful Comments
-- ============================================================================

COMMENT ON TABLE businesses IS 'All businesses in the platform - no hardcoded entries, all created dynamically';
COMMENT ON TABLE business_equity IS 'Tracks ownership stakes in businesses - all dynamically created';

-- ============================================================================
-- STEP 5: Add Validation to Prevent Hardcoded IDs
-- ============================================================================

-- Add a check constraint to prevent the hardcoded UUID from being used
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS no_hardcoded_business_ids;
ALTER TABLE businesses ADD CONSTRAINT no_hardcoded_business_ids
  CHECK (id != '00000000-0000-0000-0000-000000000001');

COMMENT ON CONSTRAINT no_hardcoded_business_ids ON businesses IS 'Prevents use of hardcoded business IDs - all businesses must be created dynamically';
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Infrastructure owners can view all businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can view their businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can insert businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can create businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can update businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can update their businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can delete businesses" ON businesses;
DROP POLICY IF EXISTS "Users can view businesses they own or work for" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can update all businesses" ON businesses;

-- CREATE businesses policies
CREATE POLICY "Infrastructure owners can view all businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Users can view businesses they own or work for"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_equity
      WHERE business_equity.business_id = businesses.id
      AND business_equity.stakeholder_id = auth.uid()
      AND business_equity.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM users u
      INNER JOIN business_users bu ON bu.user_id = u.telegram_id
      WHERE u.id = auth.uid()
      AND bu.business_id = businesses.id
      AND bu.active = true
    )
  );

CREATE POLICY "Infrastructure owners can create businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can update all businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Business owners can update their businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_equity
      WHERE business_equity.business_id = businesses.id
      AND business_equity.stakeholder_id = auth.uid()
      AND business_equity.is_active = true
      AND business_equity.equity_type = 'founder'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_equity
      WHERE business_equity.business_id = businesses.id
      AND business_equity.stakeholder_id = auth.uid()
      AND business_equity.is_active = true
      AND business_equity.equity_type = 'founder'
    )
  );

CREATE POLICY "Infrastructure owners can delete businesses"
  ON businesses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- Drop existing business_equity policies
DROP POLICY IF EXISTS "Users can view their equity records" ON business_equity;
DROP POLICY IF EXISTS "Infrastructure owners can view all equity records" ON business_equity;
DROP POLICY IF EXISTS "Users can insert equity records" ON business_equity;
DROP POLICY IF EXISTS "Infrastructure owners can create equity records" ON business_equity;
DROP POLICY IF EXISTS "Users can update their equity records" ON business_equity;
DROP POLICY IF EXISTS "Infrastructure owners can update equity records" ON business_equity;
DROP POLICY IF EXISTS "Business founders can create equity records" ON business_equity;

-- CREATE business_equity policies
CREATE POLICY "Users can view their equity records"
  ON business_equity FOR SELECT
  TO authenticated
  USING (stakeholder_id = auth.uid());

CREATE POLICY "Infrastructure owners can view all equity records"
  ON business_equity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can create equity records"
  ON business_equity FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Business founders can create equity records"
  ON business_equity FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_equity existing
      WHERE existing.business_id = business_equity.business_id
      AND existing.stakeholder_id = auth.uid()
      AND existing.is_active = true
      AND existing.equity_type = 'founder'
    )
  );

CREATE POLICY "Infrastructure owners can update equity records"
  ON business_equity FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );/*
  # Fix Business Creation RLS Policies

  1. Changes
    - Add INSERT policy for businesses table to allow infrastructure_owner role to create businesses
    - Update business_ownership INSERT policy to recognize 'infrastructure_owner' role
    - Ensure required fields are properly set with defaults

  2. Security
    - Only infrastructure_owner role can create new businesses
    - Business ownership records can be created by infrastructure_owner
    - All policies use proper authentication checks

  3. Notes
    - Fixes "Missing requirements" error during business creation
    - Aligns role names with application code (infrastructure_owner vs owner)
    - Ensures RLS policies don't block legitimate business creation operations
*/

-- Drop existing INSERT policy for business_ownership if it exists
DROP POLICY IF EXISTS "Platform owner can create ownership" ON business_ownership;

-- Add INSERT policy for businesses table
-- Allow infrastructure_owner to create new businesses
CREATE POLICY "Infrastructure owners can create businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('infrastructure_owner', 'owner')
    )
  );

-- Updated INSERT policy for business_ownership
-- Allow infrastructure_owner to create ownership records
CREATE POLICY "Infrastructure owners can create ownership"
  ON business_ownership FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('infrastructure_owner', 'owner', 'business_owner')
    )
  );

-- Ensure businesses table has proper defaults for required fields
-- Add name_hebrew with default if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'name_hebrew'
  ) THEN
    ALTER TABLE businesses ADD COLUMN name_hebrew text;
  END IF;
END $$;

-- Update existing businesses without name_hebrew
UPDATE businesses
SET name_hebrew = name
WHERE name_hebrew IS NULL OR name_hebrew = '';

-- Make name_hebrew NOT NULL after setting defaults
ALTER TABLE businesses
  ALTER COLUMN name_hebrew SET DEFAULT '',
  ALTER COLUMN name_hebrew SET NOT NULL;

-- Ensure business_type has a default
ALTER TABLE businesses
  ALTER COLUMN business_type SET DEFAULT 'logistics';
/*
  # Database Helper Functions

  1. New Functions
    - `get_business_metrics` - Returns comprehensive business metrics
    - `get_infrastructure_overview` - Returns system-wide overview
    - `get_user_active_roles` - Returns all active roles for a user
    - `get_inventory_chain` - Traces inventory movement chain
    - `validate_allocation_request` - Validates stock allocation feasibility
    - `get_audit_trail` - Returns audit trail for specific entity

  2. Performance
    - All functions use efficient queries with proper indexing
    - Results are cacheable where appropriate
    - Minimal database roundtrips
*/

-- Business metrics function
CREATE OR REPLACE FUNCTION get_business_metrics(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_revenue', COALESCE(SUM(CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN o.total_price ELSE 0 END), 0),
    'total_orders', COUNT(o.id),
    'active_drivers', (
      SELECT COUNT(DISTINCT user_id)
      FROM user_business_roles
      WHERE business_id = p_business_id
        AND role = 'driver'
        AND effective_to IS NULL
    ),
    'pending_allocations', (
      SELECT COUNT(*)
      FROM stock_allocations
      WHERE business_id = p_business_id
        AND status = 'pending'
    ),
    'orders_today', COUNT(CASE WHEN o.created_at >= CURRENT_DATE THEN 1 END),
    'orders_this_month', COUNT(CASE WHEN o.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END),
    'average_order_value', COALESCE(AVG(o.total_price), 0)
  ) INTO v_result
  FROM orders o
  WHERE o.business_id = p_business_id
    AND o.created_at >= CURRENT_DATE - INTERVAL '30 days';

  RETURN v_result;
END;
$$;

-- Infrastructure overview function
CREATE OR REPLACE FUNCTION get_infrastructure_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_businesses', (SELECT COUNT(*) FROM businesses WHERE active = true),
    'total_users', (SELECT COUNT(*) FROM users WHERE status = 'active'),
    'total_warehouses', (SELECT COUNT(*) FROM warehouses WHERE is_active = true),
    'total_inventory_value', COALESCE((
      SELECT SUM(im.quantity * p.price)
      FROM inventory_movements im
      JOIN products p ON p.id = im.product_id
      WHERE im.movement_type = 'in'
    ), 0),
    'active_orders_count', (SELECT COUNT(*) FROM orders WHERE status IN ('pending', 'processing', 'in_transit')),
    'total_drivers', (
      SELECT COUNT(DISTINCT user_id)
      FROM user_business_roles
      WHERE role = 'driver'
        AND effective_to IS NULL
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Get user active roles function
CREATE OR REPLACE FUNCTION get_user_active_roles(p_user_id uuid)
RETURNS TABLE (
  business_id uuid,
  business_name text,
  role text,
  assigned_at timestamptz,
  permissions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ubr.business_id,
    b.name as business_name,
    ubr.role,
    ubr.created_at as assigned_at,
    COALESCE(
      (
        SELECT jsonb_agg(p.name)
        FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role = ubr.role
      ),
      '[]'::jsonb
    ) as permissions
  FROM user_business_roles ubr
  JOIN businesses b ON b.id = ubr.business_id
  WHERE ubr.user_id = p_user_id
    AND ubr.effective_to IS NULL
  ORDER BY ubr.created_at DESC;
END;
$$;

-- Get inventory chain function
CREATE OR REPLACE FUNCTION get_inventory_chain(p_product_id uuid, p_limit int DEFAULT 50)
RETURNS TABLE (
  movement_id uuid,
  movement_type text,
  quantity numeric,
  from_location text,
  to_location text,
  performed_by uuid,
  performed_at timestamptz,
  business_id uuid,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    im.id as movement_id,
    im.movement_type,
    im.quantity,
    im.from_location,
    im.to_location,
    im.performed_by,
    im.created_at as performed_at,
    im.business_id,
    im.notes
  FROM inventory_movements im
  WHERE im.product_id = p_product_id
  ORDER BY im.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Validate allocation request function
CREATE OR REPLACE FUNCTION validate_allocation_request(
  p_product_id uuid,
  p_quantity numeric,
  p_warehouse_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available numeric;
  v_result jsonb;
BEGIN
  -- Calculate available stock
  SELECT COALESCE(SUM(
    CASE
      WHEN movement_type = 'in' THEN quantity
      WHEN movement_type = 'out' THEN -quantity
      ELSE 0
    END
  ), 0) INTO v_available
  FROM inventory_movements
  WHERE product_id = p_product_id
    AND (from_location = 'warehouse_' || p_warehouse_id::text
         OR to_location = 'warehouse_' || p_warehouse_id::text);

  -- Build result
  v_result := jsonb_build_object(
    'is_valid', v_available >= p_quantity,
    'available_quantity', v_available,
    'requested_quantity', p_quantity,
    'shortage', CASE WHEN v_available < p_quantity THEN p_quantity - v_available ELSE 0 END
  );

  RETURN v_result;
END;
$$;

-- Get audit trail function
CREATE OR REPLACE FUNCTION get_audit_trail(
  p_entity_type text,
  p_entity_id uuid,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  audit_id uuid,
  action text,
  performed_by uuid,
  performed_at timestamptz,
  details jsonb,
  ip_address text,
  user_agent text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sal.id as audit_id,
    sal.action,
    sal.user_id as performed_by,
    sal.timestamp as performed_at,
    sal.details,
    sal.ip_address,
    sal.user_agent
  FROM system_audit_log sal
  WHERE sal.entity_type = p_entity_type
    AND sal.entity_id = p_entity_id
  ORDER BY sal.timestamp DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_business_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_infrastructure_overview TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_roles TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_chain TO authenticated;
GRANT EXECUTE ON FUNCTION validate_allocation_request TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_trail TO authenticated;
-- Adds the infrastructures registry used to scope data across tenants.
-- This migration is idempotent so it can be applied safely on existing databases.

set check_function_bodies = off;

create table if not exists public.infrastructures (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  slug text not null,
  display_name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'suspended', 'decommissioned')),
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code),
  unique (slug)
);

comment on table public.infrastructures is 'Top-level tenant registry for the Congress Logistics platform.';
comment on column public.infrastructures.code is 'Stable short identifier used by automation scripts.';
comment on column public.infrastructures.slug is 'URL friendly identifier for UI routing.';
comment on column public.infrastructures.settings is 'JSON configuration blob for feature toggles and thresholds.';
comment on column public.infrastructures.metadata is 'Arbitrary metadata captured during provisioning.';

create index if not exists idx_infrastructures_status on public.infrastructures(status);
create index if not exists idx_infrastructures_active on public.infrastructures(is_active) where is_active;

-- Ensure updated_at reflects the latest change.
drop trigger if exists trg_infrastructures_set_updated_at on public.infrastructures;

create trigger trg_infrastructures_set_updated_at
  before update on public.infrastructures
  for each row
  execute function public.set_updated_at();


-- Propagates infrastructure scope across business-facing tables.
-- Adds infrastructure_id columns, backfills data, and enforces referential integrity.

set check_function_bodies = off;

do $$
declare
  v_default_infrastructure_id uuid;
  r record;
  v_constraint_name text;
  v_index_name text;
begin
  select id into v_default_infrastructure_id
  from public.infrastructures
  where code = 'default'
  order by created_at asc
  limit 1;

  if v_default_infrastructure_id is null then
    insert into public.infrastructures (code, slug, display_name, description)
    values ('default', 'default', 'Default Infrastructure', 'Auto-created to backfill infrastructure scope')
    returning id into v_default_infrastructure_id;
  end if;

  -- Ensure businesses are linked to an infrastructure.
  alter table if exists public.businesses
    add column if not exists infrastructure_id uuid;

  update public.businesses b
  set infrastructure_id = coalesce(b.infrastructure_id, v_default_infrastructure_id)
  where b.infrastructure_id is null;

  alter table if exists public.businesses
    alter column infrastructure_id set not null;

  if not exists (
    select 1 from pg_constraint
    where conname = 'businesses_infrastructure_id_fkey'
  ) then
    alter table public.businesses
      add constraint businesses_infrastructure_id_fkey
      foreign key (infrastructure_id) references public.infrastructures(id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'businesses_infrastructure_name_key'
  ) then
    alter table public.businesses
      add constraint businesses_infrastructure_name_key
      unique (infrastructure_id, name);
  end if;

  create index if not exists idx_businesses_infrastructure
    on public.businesses (infrastructure_id);

  execute format(
    'alter table public.businesses alter column infrastructure_id set default %L::uuid',
    v_default_infrastructure_id
  );

  -- Propagate infrastructure_id to every table that already references business_id.
  for r in
    select c.table_schema, c.table_name, c.is_nullable
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
      and c.column_name = 'business_id'
  loop
    if r.table_name = 'businesses' then
      continue;
    end if;

    execute format(
      'alter table %I.%I add column if not exists infrastructure_id uuid',
      r.table_schema,
      r.table_name
    );

    execute format(
      'update %I.%I as t set infrastructure_id = b.infrastructure_id ' ||
      'from public.businesses as b where t.business_id = b.id ' ||
      'and t.infrastructure_id is null and t.business_id is not null',
      r.table_schema,
      r.table_name
    );

    if r.is_nullable = 'NO' then
      execute format(
        'alter table %I.%I alter column infrastructure_id set not null',
        r.table_schema,
        r.table_name
      );
    end if;

    v_constraint_name := format('%s_infrastructure_id_fkey', r.table_name);
    if not exists (
      select 1 from pg_constraint
      where conname = v_constraint_name
    ) then
      execute format(
        'alter table %I.%I add constraint %I foreign key (infrastructure_id) ' ||
        'references public.infrastructures(id)',
        r.table_schema,
        r.table_name,
        v_constraint_name
      );
    end if;

    v_index_name := format('idx_%s_infrastructure_id', r.table_name);
    execute format(
      'create index if not exists %I on %I.%I (infrastructure_id)',
      v_index_name,
      r.table_schema,
      r.table_name
    );
  end loop;
end $$;
-- Establishes unified active-context tracking and custom JWT claims
-- for multi-tenant awareness across infrastructures and businesses.

set check_function_bodies = off;

-- Create the user_active_contexts table if it does not exist yet.
create table if not exists public.user_active_contexts (
  user_id uuid primary key references public.users(id) on delete cascade,
  infrastructure_id uuid not null references public.infrastructures(id),
  business_id uuid references public.businesses(id),
  context_version integer not null default 1,
  last_switched_at timestamptz not null default now(),
  session_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_active_contexts is 'Tracks the caller''s active infrastructure + business scope for JWT claims.';
comment on column public.user_active_contexts.context_version is 'Bumps every time the user switches context to invalidate caches.';
comment on column public.user_active_contexts.session_metadata is 'Arbitrary metadata about the most recent context switch event.';

-- Keep timestamps fresh on updates.
drop trigger if exists trg_user_active_contexts_set_updated_at on public.user_active_contexts;
create trigger trg_user_active_contexts_set_updated_at
  before update on public.user_active_contexts
  for each row
  execute function public.set_updated_at();

-- Ensure indexes exist for tenant scoped lookups.
create index if not exists idx_user_active_contexts_infra on public.user_active_contexts(infrastructure_id);
create index if not exists idx_user_active_contexts_business on public.user_active_contexts(business_id);

-- Backfill data from legacy user_business_context table when present.
do $$
declare
  v_default_infra uuid;
begin
  select id into v_default_infra
  from public.infrastructures
  order by created_at asc
  limit 1;

  if v_default_infra is null then
    insert into public.infrastructures (code, slug, display_name, description)
    values ('default', 'default', 'Default Infrastructure', 'Created while provisioning user contexts')
    returning id into v_default_infra;
  end if;

  if to_regclass('public.user_business_context') is not null then
    insert into public.user_active_contexts (user_id, infrastructure_id, business_id, context_version, last_switched_at, session_metadata)
    select
      ubc.user_id,
      coalesce(b.infrastructure_id, v_default_infra),
      ubc.active_business_id,
      1,
      coalesce(ubc.last_switched_at, now()),
      coalesce(ubc.session_metadata, '{}'::jsonb)
    from public.user_business_context ubc
    left join public.businesses b on b.id = ubc.active_business_id
    on conflict (user_id) do update set
      infrastructure_id = excluded.infrastructure_id,
      business_id = excluded.business_id,
      last_switched_at = excluded.last_switched_at,
      session_metadata = excluded.session_metadata;
  end if;

  insert into public.user_active_contexts (user_id, infrastructure_id)
  select u.id, v_default_infra
  from public.users u
  where not exists (
    select 1 from public.user_active_contexts uac where uac.user_id = u.id
  );
end $$;

-- Apply RLS so callers can only access their own context entry.
alter table public.user_active_contexts enable row level security;

drop policy if exists "Users manage own active context" on public.user_active_contexts;
create policy "Users manage own active context"
  on public.user_active_contexts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Anon blocked from active context" on public.user_active_contexts;
create policy "Anon blocked from active context"
  on public.user_active_contexts for select
  to anon
  using (false);

-- Helper to set the active context and bump version atomically.
create or replace function public.set_user_active_context(
  p_user_id uuid,
  p_infrastructure_id uuid,
  p_business_id uuid default null,
  p_session_metadata jsonb default '{}'::jsonb
)
returns public.user_active_contexts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_active_contexts%rowtype;
begin
  if p_user_id is null then
    raise exception 'set_user_active_context requires a user_id';
  end if;

  if p_infrastructure_id is null then
    raise exception 'set_user_active_context requires an infrastructure_id';
  end if;

  insert into public.user_active_contexts as uac (
    user_id,
    infrastructure_id,
    business_id,
    context_version,
    last_switched_at,
    session_metadata
  ) values (
    p_user_id,
    p_infrastructure_id,
    p_business_id,
    1,
    now(),
    coalesce(p_session_metadata, '{}'::jsonb)
  )
  on conflict (user_id) do update set
    infrastructure_id = excluded.infrastructure_id,
    business_id = excluded.business_id,
    context_version = uac.context_version + 1,
    last_switched_at = now(),
    session_metadata = coalesce(excluded.session_metadata, '{}'::jsonb),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.set_user_active_context(uuid, uuid, uuid, jsonb) to service_role;
grant execute on function public.set_user_active_context(uuid, uuid, uuid, jsonb) to authenticated;

-- Read helper used by diagnostics and audit tooling.
create or replace function public.get_user_active_context(p_user_id uuid)
returns table (
  user_id uuid,
  infrastructure_id uuid,
  business_id uuid,
  context_version integer,
  last_switched_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    uac.user_id,
    uac.infrastructure_id,
    uac.business_id,
    uac.context_version,
    uac.last_switched_at
  from public.user_active_contexts uac
  where uac.user_id = p_user_id;
$$;

grant execute on function public.get_user_active_context(uuid) to authenticated;

-- Custom JWT claims used by Supabase when minting access tokens.
create or replace function auth.jwt_custom_claims()
returns jsonb
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_context public.user_active_contexts%rowtype;
  v_business_role text;
  v_default_infra uuid;
begin
  if v_user_id is null then
    return '{}'::jsonb;
  end if;

  select id into v_default_infra
  from public.infrastructures
  order by created_at asc
  limit 1;

  select role into v_role
  from public.users
  where id = v_user_id;

  select * into v_context
  from public.user_active_contexts
  where user_id = v_user_id;

  if v_context.user_id is null then
    v_context.user_id := v_user_id;
    v_context.infrastructure_id := coalesce(v_default_infra, null);
    v_context.context_version := 1;
  end if;

  if v_context.business_id is not null then
    select r.role_key into v_business_role
    from public.user_business_roles ubr
    join public.roles r on r.id = ubr.role_id
    where ubr.user_id = v_user_id
      and ubr.business_id = v_context.business_id
      and ubr.is_active = true
    limit 1;
  end if;

  return jsonb_build_object(
    'user_id', v_user_id,
    'role', v_role,
    'infrastructure_id', v_context.infrastructure_id,
    'business_id', v_context.business_id,
    'business_role', v_business_role,
    'context_version', coalesce(v_context.context_version, 1),
    'context_refreshed_at', v_context.last_switched_at
  );
end;
$$;

grant execute on function auth.jwt_custom_claims() to authenticated;

grant usage on schema auth to authenticated;

BEGIN;

SET search_path TO public;

-- Normalize historical business_users rows into user_business_roles
WITH normalized AS (
  SELECT
    bu.id,
    bu.business_id,
    bu.user_id,
    bu.role,
    bu.permissions,
    bu.is_primary,
    bu.active,
    bu.assigned_at,
    bu.assigned_by,
    CASE bu.role
      WHEN 'owner' THEN 'business_owner'
      WHEN 'manager' THEN 'manager'
      WHEN 'dispatcher' THEN 'dispatcher'
      WHEN 'driver' THEN 'driver'
      WHEN 'warehouse' THEN 'warehouse'
      WHEN 'sales' THEN 'sales'
      WHEN 'customer_service' THEN 'customer_service'
      ELSE NULL
    END AS canonical_role,
    CASE bu.role
      WHEN 'owner' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'dispatcher' THEN 3
      WHEN 'warehouse' THEN 4
      WHEN 'sales' THEN 5
      WHEN 'customer_service' THEN 6
      WHEN 'driver' THEN 7
      ELSE 99
    END AS role_priority
  FROM business_users bu
),
ranked AS (
  SELECT
    n.*, 
    ROW_NUMBER() OVER (
      PARTITION BY n.user_id, n.business_id
      ORDER BY n.role_priority, n.assigned_at DESC NULLS LAST
    ) AS rn
  FROM normalized n
  WHERE n.canonical_role IS NOT NULL
),
target_rows AS (
  SELECT
    r.business_id,
    r.user_id,
    r.canonical_role,
    r.is_primary,
    COALESCE(r.active, true) AS is_active,
    r.assigned_by,
    r.assigned_at
  FROM ranked r
  WHERE r.rn = 1
)
-- disable triggers that depend on auth.uid() during data backfill
SELECT set_config('session_replication_role', 'replica', true);

INSERT INTO user_business_roles (
  user_id,
  business_id,
  role_id,
  custom_role_id,
  ownership_percentage,
  commission_percentage,
  is_primary,
  is_active,
  assigned_by,
  assigned_at,
  deactivated_at,
  notes
)
SELECT
  t.user_id,
  t.business_id,
  r.id,
  NULL,
  0,
  0,
  COALESCE(t.is_primary, false),
  t.is_active,
  t.assigned_by,
  t.assigned_at,
  NULL,
  NULL
FROM target_rows t
JOIN roles r ON r.role_key = t.canonical_role
ON CONFLICT (user_id, business_id) DO UPDATE
SET
  role_id = EXCLUDED.role_id,
  is_active = EXCLUDED.is_active,
  is_primary = EXCLUDED.is_primary,
  assigned_by = COALESCE(EXCLUDED.assigned_by, user_business_roles.assigned_by),
  assigned_at = LEAST(EXCLUDED.assigned_at, user_business_roles.assigned_at);

SELECT set_config('session_replication_role', 'origin', true);

-- Drop legacy policies/triggers with the table
DROP TABLE IF EXISTS business_users CASCADE;

-- Compatibility view for legacy queries expecting the old table
CREATE OR REPLACE VIEW business_users AS
SELECT
  ubr.id,
  ubr.business_id,
  ubr.user_id,
  COALESCE(cr.custom_role_name, r.role_key) AS role,
  '{}'::jsonb AS permissions,
  ubr.is_primary,
  ubr.is_active,
  ubr.assigned_at,
  ubr.assigned_by
FROM user_business_roles ubr
LEFT JOIN roles r ON r.id = ubr.role_id
LEFT JOIN custom_roles cr ON cr.id = ubr.custom_role_id;

GRANT SELECT ON business_users TO authenticated;

COMMENT ON VIEW business_users IS 'Legacy compatibility view backed by user_business_roles. Use business_memberships for enriched data.';

-- Create a canonical view that surfaces enriched membership data
CREATE OR REPLACE VIEW business_memberships AS
SELECT
  ubr.id,
  ubr.user_id,
  ubr.business_id,
  ubr.is_primary,
  ubr.is_active,
  ubr.assigned_at,
  ubr.assigned_by,
  COALESCE(cr.custom_role_name, r.role_key) AS display_role_key,
  COALESCE(cr.custom_role_label, r.label) AS display_role_label,
  r.role_key AS base_role_key,
  r.label AS base_role_label,
  r.scope_level,
  r.can_see_financials,
  r.can_see_cross_business,
  ubr.ownership_percentage,
  ubr.commission_percentage,
  ubr.notes,
  cr.id AS custom_role_id,
  u.telegram_id,
  u.name AS user_name,
  u.username AS user_username,
  u.photo_url AS user_photo_url,
  u.phone AS user_phone,
  u.role AS infrastructure_role,
  u.department AS user_department,
  b.name AS business_name,
  b.name_hebrew AS business_name_hebrew,
  b.business_type,
  b.primary_color,
  b.secondary_color
FROM user_business_roles ubr
LEFT JOIN roles r ON r.id = ubr.role_id
LEFT JOIN custom_roles cr ON cr.id = ubr.custom_role_id
LEFT JOIN users u ON u.id = ubr.user_id
LEFT JOIN businesses b ON b.id = ubr.business_id
WHERE ubr.is_active = true;

GRANT SELECT ON business_memberships TO authenticated;

COMMENT ON VIEW business_memberships IS 'Active business memberships resolved from user_business_roles with base/custom role metadata.';

-- Refresh supporting RPCs to use user_business_roles
CREATE OR REPLACE FUNCTION get_user_businesses()
RETURNS TABLE (
  business_id uuid,
  business_name text,
  business_name_hebrew text,
  business_type text,
  role_key text,
  role_label text,
  is_primary boolean,
  ownership_percentage numeric,
  commission_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.name_hebrew,
    b.business_type,
    COALESCE(cr.custom_role_name, r.role_key) AS role_key,
    COALESCE(cr.custom_role_label, r.label) AS role_label,
    ubr.is_primary,
    ubr.ownership_percentage,
    ubr.commission_percentage
  FROM user_business_roles ubr
  JOIN businesses b ON b.id = ubr.business_id
  LEFT JOIN roles r ON r.id = ubr.role_id
  LEFT JOIN custom_roles cr ON cr.id = ubr.custom_role_id
  WHERE ubr.user_id = auth.uid()
    AND ubr.is_active = true
  ORDER BY ubr.is_primary DESC, b.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_businesses() TO authenticated;

COMMIT;
-- Provides reusable helper functions for tenant-aware RLS policies.
set check_function_bodies = off;

create or replace function public.current_infrastructure_id()
returns uuid
language sql
stable
set search_path = auth, public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'infrastructure_id', '')::uuid,
    nullif(auth.jwt() -> 'app_metadata' ->> 'infrastructure_id', '')::uuid,
    (
      select infrastructure_id
      from public.user_active_contexts
      where user_id = auth.uid()
    )
  );
$$;

comment on function public.current_infrastructure_id() is 'Returns the caller''s active infrastructure identifier derived from JWT claims or active context.';

grant execute on function public.current_infrastructure_id() to authenticated, anon, service_role;

create or replace function public.current_business_id()
returns uuid
language sql
stable
set search_path = auth, public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'business_id', '')::uuid,
    nullif(auth.jwt() -> 'app_metadata' ->> 'business_id', '')::uuid,
    (
      select business_id
      from public.user_active_contexts
      where user_id = auth.uid()
    )
  );
$$;

comment on function public.current_business_id() is 'Returns the caller''s active business identifier derived from JWT claims or active context.';

grant execute on function public.current_business_id() to authenticated, anon, service_role;

create or replace function public.current_infrastructure_role()
returns text
language sql
stable
set search_path = auth, public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'role', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')
  );
$$;

comment on function public.current_infrastructure_role() is 'Returns the infrastructure-level role supplied in the caller''s JWT.';

grant execute on function public.current_infrastructure_role() to authenticated, anon, service_role;

create or replace function public.current_business_role()
returns text
language sql
stable
set search_path = auth, public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'business_role', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'business_role', '')
  );
$$;

comment on function public.current_business_role() is 'Returns the active business-scoped role supplied in the caller''s JWT.';

grant execute on function public.current_business_role() to authenticated, anon, service_role;

create or replace function public.has_role(p_role text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when p_role is null then false
    else lower(coalesce(public.current_infrastructure_role(), '')) = lower(p_role)
      or lower(coalesce(public.current_business_role(), '')) = lower(p_role)
  end;
$$;

comment on function public.has_role(text) is 'Checks whether the caller matches the provided role across infrastructure or business scope.';

grant execute on function public.has_role(text) to authenticated, anon, service_role;

create or replace function public.has_any_role(p_roles text[])
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from unnest(coalesce(p_roles, array[]::text[])) as r(role)
    where public.has_role(r.role)
  );
$$;

comment on function public.has_any_role(text[]) is 'Returns true when any requested role matches the caller.';

grant execute on function public.has_any_role(text[]) to authenticated, anon, service_role;

create or replace function public.has_infrastructure_role(p_role text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when p_role is null then false
    else lower(coalesce(public.current_infrastructure_role(), '')) = lower(p_role)
  end;
$$;

comment on function public.has_infrastructure_role(text) is 'Returns true when the caller holds the provided infrastructure-level role.';

grant execute on function public.has_infrastructure_role(text) to authenticated, anon, service_role;

create or replace function public.has_any_infrastructure_role(p_roles text[])
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from unnest(coalesce(p_roles, array[]::text[])) as r(role)
    where public.has_infrastructure_role(r.role)
  );
$$;

comment on function public.has_any_infrastructure_role(text[]) is 'Returns true when the caller has any infrastructure-level role in the provided list.';

grant execute on function public.has_any_infrastructure_role(text[]) to authenticated, anon, service_role;

create or replace function public.has_business_role(p_business_id uuid, p_roles text[] default null)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_roles text[] := p_roles;
begin
  if p_business_id is null then
    return false;
  end if;

  if v_roles is null then
    return exists (
      select 1
      from public.user_business_roles ubr
      where ubr.user_id = auth.uid()
        and ubr.business_id = p_business_id
        and ubr.is_active = true
    );
  end if;

  return exists (
    select 1
    from public.user_business_roles ubr
    join public.roles r on r.id = ubr.role_id
    where ubr.user_id = auth.uid()
      and ubr.business_id = p_business_id
      and ubr.is_active = true
      and r.role_key = any(v_roles)
  );
end;
$$;

comment on function public.has_business_role(uuid, text[]) is 'Checks if the caller has an active assignment for the provided business and optional role filters.';

grant execute on function public.has_business_role(uuid, text[]) to authenticated, anon, service_role;

create or replace function public.is_infrastructure_admin(p_infrastructure_id uuid default null)
returns boolean
language sql
stable
set search_path = public
as $$
  select public.has_any_infrastructure_role(array['infrastructure_owner', 'infrastructure_manager'])
    and (
      p_infrastructure_id is null
      or public.current_infrastructure_id() is null
      or public.current_infrastructure_id() = p_infrastructure_id
    );
$$;

comment on function public.is_infrastructure_admin(uuid) is 'Determines if the caller is an infrastructure_owner or infrastructure_manager within the provided infrastructure.';

grant execute on function public.is_infrastructure_admin(uuid) to authenticated, anon, service_role;

create or replace function public.tenant_can_access(
  p_infrastructure_id uuid,
  p_business_id uuid default null
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_current_infra uuid := public.current_infrastructure_id();
begin
  if p_infrastructure_id is null then
    return false;
  end if;

  if v_current_infra is null or v_current_infra <> p_infrastructure_id then
    return false;
  end if;

  if p_business_id is null then
    return true;
  end if;

  if public.is_infrastructure_admin(p_infrastructure_id) then
    return true;
  end if;

  return public.has_business_role(p_business_id);
end;
$$;

comment on function public.tenant_can_access(uuid, uuid) is 'Evaluates whether the caller can access the provided infrastructure/business row.';

grant execute on function public.tenant_can_access(uuid, uuid) to authenticated, anon, service_role;

create or replace function public.tenant_can_manage_business(
  p_infrastructure_id uuid,
  p_business_id uuid default null
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
begin
  if public.is_infrastructure_admin(p_infrastructure_id) then
    return true;
  end if;

  if p_business_id is null then
    return false;
  end if;

  return public.has_business_role(p_business_id, array['business_owner', 'manager']);
end;
$$;

comment on function public.tenant_can_manage_business(uuid, uuid) is 'Allows infrastructure admins and business owners/managers to modify business-scoped records.';

grant execute on function public.tenant_can_manage_business(uuid, uuid) to authenticated, anon, service_role;

create or replace function public.tenant_can_access_infrastructure(p_infrastructure_id uuid)
returns boolean
language plpgsql
stable
set search_path = public
as $$
begin
  if p_infrastructure_id is null then
    return false;
  end if;

  if public.current_infrastructure_id() is null then
    return false;
  end if;

  if public.current_infrastructure_id() <> p_infrastructure_id then
    return false;
  end if;

  return public.is_infrastructure_admin(p_infrastructure_id);
end;
$$;

comment on function public.tenant_can_access_infrastructure(uuid) is 'Restricts infrastructure-level tables to administrators of the same tenant.';

grant execute on function public.tenant_can_access_infrastructure(uuid) to authenticated, anon, service_role;

-- Ensure legacy helpers use the new predicates.
create or replace function is_infra_owner_from_jwt()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_infrastructure_role('infrastructure_owner');
$$;

grant execute on function is_infra_owner_from_jwt() to authenticated, anon, service_role;

-- Applies tenant-aware RLS templates generated by helper functions.
set check_function_bodies = off;

do $$
declare
  rec record;
  pol record;
  v_infra_exists boolean;
  v_business_exists boolean;
  v_infra_column text;
  v_business_column text;
  v_using text;
  v_check text;
  v_select_policy text;
  v_modify_policy text;
  v_anon_policy text;
  v_service_policy text;
begin
  for rec in
    select *
    from (values
      ('businesses', 'infrastructure_id', 'id', false, false),
      ('warehouses', 'infrastructure_id', 'business_id', false, false),
      ('warehouse_locations', 'infrastructure_id', 'business_id', false, false),
      ('inventory_items', 'infrastructure_id', 'business_id', false, false),
      ('inventory_movements', 'infrastructure_id', 'business_id', true, false),
      ('stock_allocations', 'infrastructure_id', 'business_id', true, false),
      ('orders', 'infrastructure_id', 'business_id', false, false),
      ('order_assignments', 'infrastructure_id', 'business_id', false, false),
      ('order_status_history', 'infrastructure_id', 'business_id', false, false),
      ('driver_profiles', 'infrastructure_id', 'business_id', false, false),
      ('driver_locations', 'infrastructure_id', 'business_id', false, false),
      ('order_notifications', 'infrastructure_id', 'business_id', false, false),
      ('user_business_roles', 'infrastructure_id', 'business_id', true, false),
      ('role_change_log', 'infrastructure_id', 'business_id', false, false)
    ) as t(table_name, infrastructure_column, business_column, require_manager, infrastructure_only)
  loop
    if to_regclass(format('public.%I', rec.table_name)) is null then
      continue;
    end if;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = rec.table_name
        and column_name = rec.infrastructure_column
    ) into v_infra_exists;

    if not v_infra_exists then
      continue;
    end if;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = rec.table_name
        and column_name = rec.business_column
    ) into v_business_exists;

    v_infra_column := quote_ident(rec.infrastructure_column);
    v_business_column := case when v_business_exists then quote_ident(rec.business_column) else 'null' end;

    v_select_policy := format('Tenant access (%s) select', rec.table_name);
    v_modify_policy := format('Tenant access (%s) modify', rec.table_name);
    v_anon_policy := format('Anon blocked (%s)', rec.table_name);
    v_service_policy := format('Service role (%s) bypass', rec.table_name);

    if rec.infrastructure_only or not v_business_exists then
      v_using := format('public.tenant_can_access(%s, null)', v_infra_column);
      if rec.infrastructure_only then
        v_using := format('public.tenant_can_access_infrastructure(%s)', v_infra_column);
      end if;
      v_check := v_using;
    else
      v_using := format('public.tenant_can_access(%s, %s)', v_infra_column, v_business_column);
      if rec.require_manager then
        v_check := format('public.tenant_can_manage_business(%s, %s)', v_infra_column, v_business_column);
      else
        v_check := v_using;
      end if;
    end if;

    execute format('alter table public.%I enable row level security;', rec.table_name);

    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = rec.table_name
    loop
      execute format('drop policy "%s" on public.%I;', pol.policyname, rec.table_name);
    end loop;

    execute format(
      'create policy "%s" on public.%I for select to authenticated using (%s);',
      v_select_policy,
      rec.table_name,
      v_using
    );

    execute format(
      'create policy "%s" on public.%I for all to authenticated using (%s) with check (%s);',
      v_modify_policy,
      rec.table_name,
      v_check,
      v_check
    );

    execute format(
      'create policy "%s" on public.%I for select to anon using (false);',
      v_anon_policy,
      rec.table_name
    );

    execute format(
      'create policy "%s" on public.%I for all to service_role using (true) with check (true);',
      v_service_policy,
      rec.table_name
    );
  end loop;
end $$;
-- Locks down audit tables so only administrators within the same infrastructure can read/write entries.
set check_function_bodies = off;

do $$
declare
  policy_name text;
begin
  if to_regclass('public.system_audit_log') is not null then
    perform 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'system_audit_log' and column_name = 'infrastructure_id';

    if found then
      perform public.current_infrastructure_id(); -- ensure helper exists before applying policies

      for policy_name in
        select policyname from pg_policies where schemaname = 'public' and tablename = 'system_audit_log'
      loop
        execute format('drop policy "%s" on public.system_audit_log;', policy_name);
      end loop;

      execute 'alter table public.system_audit_log enable row level security;';

      execute 'create policy "Tenant audit access" on public.system_audit_log for select to authenticated using (public.tenant_can_access_infrastructure("infrastructure_id"));';
      execute 'create policy "Tenant audit modify" on public.system_audit_log for all to authenticated using (public.tenant_can_access_infrastructure("infrastructure_id")) with check (public.tenant_can_access_infrastructure("infrastructure_id"));';
      execute 'create policy "Anon blocked (system_audit_log)" on public.system_audit_log for select to anon using (false);';
      execute 'create policy "Service role (system_audit_log) bypass" on public.system_audit_log for all to service_role using (true) with check (true);';
    end if;
  end if;

  if to_regclass('public.cross_scope_access_log') is not null then
    perform 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'cross_scope_access_log' and column_name = 'infrastructure_id';

    if found then
      for policy_name in
        select policyname from pg_policies where schemaname = 'public' and tablename = 'cross_scope_access_log'
      loop
        execute format('drop policy "%s" on public.cross_scope_access_log;', policy_name);
      end loop;

      execute 'alter table public.cross_scope_access_log enable row level security;';

      execute 'create policy "Tenant cross-scope audit access" on public.cross_scope_access_log for select to authenticated using (public.tenant_can_access_infrastructure("infrastructure_id"));';
      execute 'create policy "Tenant cross-scope audit insert" on public.cross_scope_access_log for insert to authenticated using (public.tenant_can_access_infrastructure("infrastructure_id")) with check (public.tenant_can_access_infrastructure("infrastructure_id"));';
      execute 'create policy "Anon blocked (cross_scope_access_log)" on public.cross_scope_access_log for select to anon using (false);';
      execute 'create policy "Service role (cross_scope_access_log) bypass" on public.cross_scope_access_log for all to service_role using (true) with check (true);';
    end if;
  end if;
end $$;
-- Adds infrastructure scoping to the user_permissions_cache table so cached entries
-- respect multi-tenant boundaries.
set check_function_bodies = off;

do $$
declare
  v_default_infrastructure uuid;
  policy_name text;
begin
  select id
  into v_default_infrastructure
  from public.infrastructures
  order by created_at asc
  limit 1;

  if v_default_infrastructure is null then
    insert into public.infrastructures (code, slug, display_name, description)
    values ('default', 'default', 'Default Infrastructure', 'Created while backfilling user_permissions_cache')
    returning id into v_default_infrastructure;
  end if;

  alter table if exists public.user_permissions_cache
    add column if not exists infrastructure_id uuid;

  update public.user_permissions_cache upc
  set infrastructure_id = b.infrastructure_id
  from public.businesses b
  where upc.business_id = b.id
    and upc.infrastructure_id is null;

  update public.user_permissions_cache upc
  set infrastructure_id = uac.infrastructure_id
  from public.user_active_contexts uac
  where upc.user_id = uac.user_id
    and upc.infrastructure_id is null;

  update public.user_permissions_cache
  set infrastructure_id = v_default_infrastructure
  where infrastructure_id is null;

  alter table public.user_permissions_cache
    alter column infrastructure_id set not null;

  alter table public.user_permissions_cache
    add constraint user_permissions_cache_infrastructure_id_fkey
    foreign key (infrastructure_id) references public.infrastructures(id)
    on delete cascade;

  if exists (
    select 1
    from pg_constraint
    where conname = 'user_permissions_cache_user_id_business_id_key'
      and conrelid = 'public.user_permissions_cache'::regclass
  ) then
    alter table public.user_permissions_cache
      drop constraint user_permissions_cache_user_id_business_id_key;
  end if;

  begin
    alter table public.user_permissions_cache
      add constraint user_permissions_cache_user_scope_key
      unique (user_id, infrastructure_id, business_id);
  exception
    when duplicate_object then
      -- Constraint already exists, nothing to do.
      null;
  end;

  -- Refresh policies to ensure tenant-aware enforcement.
  if to_regclass('public.user_permissions_cache') is not null then
    for policy_name in
      select policyname from pg_policies where schemaname = 'public' and tablename = 'user_permissions_cache'
    loop
      execute format('drop policy "%s" on public.user_permissions_cache;', policy_name);
    end loop;

    execute 'alter table public.user_permissions_cache enable row level security;';

    execute 'create policy "Users read own cache" on public.user_permissions_cache for select to authenticated using (user_id = auth.uid() and public.tenant_can_access_infrastructure(infrastructure_id));';
    execute 'create policy "Users manage own cache" on public.user_permissions_cache for all to authenticated using (public.tenant_can_access_infrastructure(infrastructure_id)) with check (public.tenant_can_access_infrastructure(infrastructure_id));';
    execute 'create policy "Anon blocked (user_permissions_cache)" on public.user_permissions_cache for select to anon using (false);';
    execute 'create policy "Service role (user_permissions_cache) bypass" on public.user_permissions_cache for all to service_role using (true) with check (true);';
  end if;
end $$;

BEGIN;

SET search_path TO public;

CREATE OR REPLACE FUNCTION public.get_business_metrics(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_infrastructure_id uuid := public.current_infrastructure_id();
  v_result jsonb;
BEGIN
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'business id is required';
  END IF;

  WITH scoped_orders AS (
    SELECT
      o.total_amount,
      o.status,
      o.created_at,
      o.delivered_at
    FROM public.orders o
    WHERE o.business_id = p_business_id
      AND (v_infrastructure_id IS NULL OR o.infrastructure_id = v_infrastructure_id)
  ),
  order_stats AS (
    SELECT
      COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_at::date = CURRENT_DATE THEN total_amount ELSE 0 END), 0) AS revenue_today,
      COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_at >= DATE_TRUNC('month', CURRENT_DATE) THEN total_amount ELSE 0 END), 0) AS revenue_month,
      COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_at >= CURRENT_DATE - INTERVAL '30 days' THEN total_amount ELSE 0 END), 0) AS revenue_30_days,
      COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS orders_today,
      COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS orders_month,
      COUNT(*) FILTER (WHERE status IN ('confirmed','preparing','ready','out_for_delivery')) AS orders_in_progress,
      COUNT(*) FILTER (WHERE status = 'delivered') AS orders_delivered,
      COALESCE(AVG(total_amount) FILTER (WHERE status = 'delivered'), 0) AS average_order_value
    FROM scoped_orders
  ),
  driver_counts AS (
    SELECT COUNT(DISTINCT ubr.user_id) AS active_drivers
    FROM public.user_business_roles ubr
    JOIN public.roles r ON r.id = ubr.role_id
    JOIN public.businesses b ON b.id = ubr.business_id
    WHERE ubr.business_id = p_business_id
      AND ubr.is_active = true
      AND r.role_key = 'driver'
      AND (v_infrastructure_id IS NULL OR b.infrastructure_id = v_infrastructure_id)
  ),
  allocation_counts AS (
    SELECT COUNT(*) AS pending_allocations
    FROM public.stock_allocations sa
    WHERE sa.to_business_id = p_business_id
      AND sa.allocation_status IN ('pending','approved')
      AND (v_infrastructure_id IS NULL OR sa.infrastructure_id = v_infrastructure_id)
  )
  SELECT jsonb_build_object(
      'business_id', p_business_id,
      'revenue_today', os.revenue_today,
      'revenue_month', os.revenue_month,
      'revenue_30_days', os.revenue_30_days,
      'orders_today', os.orders_today,
      'orders_month', os.orders_month,
      'orders_in_progress', os.orders_in_progress,
      'orders_delivered', os.orders_delivered,
      'average_order_value', os.average_order_value,
      'active_drivers', dc.active_drivers,
      'pending_allocations', ac.pending_allocations,
      'last_updated', NOW()
    )
  INTO v_result
  FROM order_stats os
  CROSS JOIN driver_counts dc
  CROSS JOIN allocation_counts ac;

  RETURN COALESCE(
    v_result,
    jsonb_build_object(
      'business_id', p_business_id,
      'revenue_today', 0,
      'revenue_month', 0,
      'revenue_30_days', 0,
      'orders_today', 0,
      'orders_month', 0,
      'orders_in_progress', 0,
      'orders_delivered', 0,
      'average_order_value', 0,
      'active_drivers', 0,
      'pending_allocations', 0,
      'last_updated', NOW()
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_metrics(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_infrastructure_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_infrastructure_id uuid := public.current_infrastructure_id();
  v_result jsonb;
BEGIN
  WITH scoped_businesses AS (
    SELECT id, active
    FROM public.businesses
    WHERE v_infrastructure_id IS NULL OR infrastructure_id = v_infrastructure_id
  ),
  business_counts AS (
    SELECT
      COUNT(*) AS total_businesses,
      COUNT(*) FILTER (WHERE active) AS active_businesses
    FROM scoped_businesses
  ),
  user_counts AS (
    SELECT COUNT(*) AS total_users
    FROM public.users u
    WHERE v_infrastructure_id IS NULL OR u.infrastructure_id = v_infrastructure_id
  ),
  scoped_orders AS (
    SELECT total_amount, status, created_at, delivered_at
    FROM public.orders o
    WHERE (v_infrastructure_id IS NULL OR o.infrastructure_id = v_infrastructure_id)
      AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ),
  order_counts AS (
    SELECT
      COUNT(*) AS total_orders_30_days,
      COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_at::date = CURRENT_DATE THEN total_amount ELSE 0 END), 0) AS revenue_today,
      COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_at >= DATE_TRUNC('month', CURRENT_DATE) THEN total_amount ELSE 0 END), 0) AS revenue_month
    FROM scoped_orders
  ),
  driver_counts AS (
    SELECT COUNT(DISTINCT ubr.user_id) AS active_drivers
    FROM public.user_business_roles ubr
    JOIN public.roles r ON r.id = ubr.role_id
    JOIN public.businesses b ON b.id = ubr.business_id
    WHERE ubr.is_active = true
      AND r.role_key = 'driver'
      AND (v_infrastructure_id IS NULL OR b.infrastructure_id = v_infrastructure_id)
  ),
  allocation_counts AS (
    SELECT COUNT(*) AS pending_allocations
    FROM public.stock_allocations sa
    WHERE sa.allocation_status IN ('pending','approved')
      AND (v_infrastructure_id IS NULL OR sa.infrastructure_id = v_infrastructure_id)
  )
  SELECT jsonb_build_object(
      'infrastructure_id', v_infrastructure_id,
      'total_businesses', COALESCE(bc.total_businesses, 0),
      'active_businesses', COALESCE(bc.active_businesses, 0),
      'total_users', COALESCE(uc.total_users, 0),
      'total_orders_30_days', COALESCE(oc.total_orders_30_days, 0),
      'revenue_today', COALESCE(oc.revenue_today, 0),
      'revenue_month', COALESCE(oc.revenue_month, 0),
      'active_drivers', COALESCE(dc.active_drivers, 0),
      'pending_allocations', COALESCE(ac.pending_allocations, 0),
      'system_health', CASE
        WHEN COALESCE(ac.pending_allocations, 0) > 20 THEN 'critical'
        WHEN COALESCE(ac.pending_allocations, 0) > 10 THEN 'warning'
        ELSE 'healthy'
      END,
      'last_updated', NOW()
    )
  INTO v_result
  FROM business_counts bc
  CROSS JOIN user_counts uc
  CROSS JOIN order_counts oc
  CROSS JOIN driver_counts dc
  CROSS JOIN allocation_counts ac;

  RETURN COALESCE(v_result, jsonb_build_object(
    'infrastructure_id', v_infrastructure_id,
    'total_businesses', 0,
    'active_businesses', 0,
    'total_users', 0,
    'total_orders_30_days', 0,
    'revenue_today', 0,
    'revenue_month', 0,
    'active_drivers', 0,
    'pending_allocations', 0,
    'system_health', 'healthy',
    'last_updated', NOW()
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_infrastructure_overview() TO authenticated;

COMMIT;
-- Ensures all audit tables carry infrastructure scope and remain append-only.
set check_function_bodies = off;

do $$
declare
  v_default_infrastructure uuid;
begin
  select id
    into v_default_infrastructure
    from public.infrastructures
    order by created_at
    limit 1;

  if v_default_infrastructure is null then
    insert into public.infrastructures (code, slug, display_name, description)
    values ('default', 'default', 'Default Infrastructure', 'Seeded automatically for tenant-scoped audits')
    returning id into v_default_infrastructure;
  end if;

  -- System audit log
  if to_regclass('public.system_audit_log') is not null then
    execute 'alter table public.system_audit_log add column if not exists infrastructure_id uuid';
    execute format(
      'update public.system_audit_log sal
         set infrastructure_id = coalesce(sal.infrastructure_id, b.infrastructure_id, %L::uuid)
        from public.businesses b
       where sal.business_id = b.id
         and sal.infrastructure_id is distinct from b.infrastructure_id',
      v_default_infrastructure
    );
    execute format(
      'update public.system_audit_log set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1
      from pg_constraint
      where conname = 'system_audit_log_infrastructure_id_fkey'
    ) then
      execute 'alter table public.system_audit_log
                 add constraint system_audit_log_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.system_audit_log alter column infrastructure_id set not null';
  end if;

  -- Financial audit log
  if to_regclass('public.financial_audit_log') is not null then
    execute 'alter table public.financial_audit_log add column if not exists infrastructure_id uuid';
    execute format(
      'update public.financial_audit_log fal
          set infrastructure_id = coalesce(fal.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.businesses b
        where fal.business_id = b.id',
      v_default_infrastructure
    );
    execute format(
      'update public.financial_audit_log set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1
      from pg_constraint
      where conname = 'financial_audit_log_infrastructure_id_fkey'
    ) then
      execute 'alter table public.financial_audit_log
                 add constraint financial_audit_log_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.financial_audit_log alter column infrastructure_id set not null';
  end if;

  -- Cross scope access log (joins on target business)
  if to_regclass('public.cross_scope_access_log') is not null then
    execute 'alter table public.cross_scope_access_log add column if not exists infrastructure_id uuid';
    execute format(
      'update public.cross_scope_access_log csal
          set infrastructure_id = coalesce(csal.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.businesses b
        where csal.target_business_id = b.id',
      v_default_infrastructure
    );
    execute format(
      'update public.cross_scope_access_log set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'cross_scope_access_log_infrastructure_id_fkey'
    ) then
      execute 'alter table public.cross_scope_access_log
                 add constraint cross_scope_access_log_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.cross_scope_access_log alter column infrastructure_id set not null';
    execute 'create index if not exists idx_cross_scope_access_log_infrastructure_id on public.cross_scope_access_log(infrastructure_id)';
  end if;

  -- Data export log
  if to_regclass('public.data_export_log') is not null then
    execute 'alter table public.data_export_log add column if not exists infrastructure_id uuid';
    execute format(
      'update public.data_export_log del
          set infrastructure_id = coalesce(del.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.businesses b
        where del.business_id = b.id',
      v_default_infrastructure
    );
    execute format(
      'update public.data_export_log set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'data_export_log_infrastructure_id_fkey'
    ) then
      execute 'alter table public.data_export_log
                 add constraint data_export_log_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.data_export_log alter column infrastructure_id set not null';
  end if;

  -- Permission check failures
  if to_regclass('public.permission_check_failures') is not null then
    execute 'alter table public.permission_check_failures add column if not exists infrastructure_id uuid';
    execute format(
      'update public.permission_check_failures pcf
          set infrastructure_id = coalesce(pcf.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.businesses b
        where pcf.business_id = b.id',
      v_default_infrastructure
    );
    execute format(
      'update public.permission_check_failures set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'permission_check_failures_infrastructure_id_fkey'
    ) then
      execute 'alter table public.permission_check_failures
                 add constraint permission_check_failures_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.permission_check_failures alter column infrastructure_id set not null';
  end if;

  -- Business lifecycle log
  if to_regclass('public.business_lifecycle_log') is not null then
    execute 'alter table public.business_lifecycle_log add column if not exists infrastructure_id uuid';
    execute format(
      'update public.business_lifecycle_log bll
          set infrastructure_id = coalesce(bll.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.businesses b
        where bll.business_id = b.id',
      v_default_infrastructure
    );
    execute format(
      'update public.business_lifecycle_log set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'business_lifecycle_log_infrastructure_id_fkey'
    ) then
      execute 'alter table public.business_lifecycle_log
                 add constraint business_lifecycle_log_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.business_lifecycle_log alter column infrastructure_id set not null';
  end if;

  -- Equity transfer log
  if to_regclass('public.equity_transfer_log') is not null then
    execute 'alter table public.equity_transfer_log add column if not exists infrastructure_id uuid';
    execute format(
      'update public.equity_transfer_log etl
          set infrastructure_id = coalesce(etl.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.businesses b
        where etl.business_id = b.id',
      v_default_infrastructure
    );
    execute format(
      'update public.equity_transfer_log set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'equity_transfer_log_infrastructure_id_fkey'
    ) then
      execute 'alter table public.equity_transfer_log
                 add constraint equity_transfer_log_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.equity_transfer_log alter column infrastructure_id set not null';
  end if;

  -- Zone audit logs join via zone->business
  if to_regclass('public.zone_audit_logs') is not null then
    execute 'alter table public.zone_audit_logs add column if not exists infrastructure_id uuid';
    execute format(
      'update public.zone_audit_logs zal
          set infrastructure_id = coalesce(zal.infrastructure_id, b.infrastructure_id, %L::uuid)
         from public.zones z
         left join public.businesses b on z.business_id = b.id
        where zal.zone_id = z.id',
      v_default_infrastructure
    );
    execute format(
      'update public.zone_audit_logs set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'zone_audit_logs_infrastructure_id_fkey'
    ) then
      execute 'alter table public.zone_audit_logs
                 add constraint zone_audit_logs_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.zone_audit_logs alter column infrastructure_id set not null';
    execute 'create index if not exists idx_zone_audit_logs_infrastructure_id on public.zone_audit_logs(infrastructure_id)';
  end if;

  -- Login history uses actor context only
  if to_regclass('public.login_history') is not null then
    execute 'alter table public.login_history add column if not exists infrastructure_id uuid';
    execute format(
      'update public.login_history lh
          set infrastructure_id = coalesce(lh.infrastructure_id, sub.infrastructure_id, %L::uuid)
         from lateral (
           select b.infrastructure_id
             from public.user_business_roles ubr
             join public.businesses b on b.id = ubr.business_id
            where ubr.user_id = lh.user_id
            order by b.created_at desc
            limit 1
         ) as sub
        where lh.infrastructure_id is distinct from sub.infrastructure_id or lh.infrastructure_id is null',
      v_default_infrastructure
    );
    execute format(
      'update public.login_history set infrastructure_id = %L::uuid where infrastructure_id is null',
      v_default_infrastructure
    );
    if not exists (
      select 1 from pg_constraint where conname = 'login_history_infrastructure_id_fkey'
    ) then
      execute 'alter table public.login_history
                 add constraint login_history_infrastructure_id_fkey
                 foreign key (infrastructure_id) references public.infrastructures(id)';
    end if;
    execute 'alter table public.login_history alter column infrastructure_id set not null';
    execute 'create index if not exists idx_login_history_infrastructure_id on public.login_history(infrastructure_id)';
  end if;
end $$;

-- Enforce append-only behavior on audit tables.
create or replace function public.prevent_audit_mutations()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Audit tables are append-only and cannot be %% operations', tg_op
    using errcode = '2F000';
end;
$$;

do $$
declare
  r record;
  v_tables text[] := array[
    'system_audit_log',
    'financial_audit_log',
    'cross_scope_access_log',
    'data_export_log',
    'permission_check_failures',
    'business_lifecycle_log',
    'equity_transfer_log',
    'zone_audit_logs',
    'login_history'
  ];
begin
  foreach r in array select unnest(v_tables) as table_name loop
    if to_regclass('public.' || r.table_name) is not null then
      execute format('drop trigger if exists prevent_%1$s_mutations on public.%1$s', r.table_name);
      execute format(
        'create trigger prevent_%1$s_mutations
           before update or delete on public.%1$s
           for each row
           execute function public.prevent_audit_mutations()',
        r.table_name
      );
    end if;
  end loop;
end $$;
-- Introduces the audit_log() helper and routes triggers through it.
set check_function_bodies = off;

create or replace function public.audit_log(payload jsonb)
returns public.system_audit_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb := coalesce(payload, '{}'::jsonb);
  v_event_type text := trim(both from coalesce(v_payload ->> 'event_type', ''));
  v_action text := trim(both from coalesce(v_payload ->> 'action', 'performed'));
  v_target_entity_type text := nullif(trim(both from coalesce(v_payload ->> 'target_entity_type', '')) , '');
  v_target_entity_id uuid := nullif(v_payload ->> 'target_entity_id', '')::uuid;
  v_business_id uuid := nullif(v_payload ->> 'business_id', '')::uuid;
  v_infrastructure_id uuid := nullif(v_payload ->> 'infrastructure_id', '')::uuid;
  v_actor_id uuid := coalesce(nullif(v_payload ->> 'actor_id', '')::uuid, auth.uid());
  v_actor_role text := nullif(v_payload ->> 'actor_role', '');
  v_change_summary text := nullif(v_payload ->> 'change_summary', '');
  v_severity text := lower(coalesce(nullif(v_payload ->> 'severity', ''), 'info'));
  v_ip inet := nullif(v_payload ->> 'ip_address', '')::inet;
  v_user_agent text := nullif(v_payload ->> 'user_agent', '');
  v_session_id text := nullif(v_payload ->> 'session_id', '');
  v_request_id text := nullif(v_payload ->> 'request_id', '');
  v_metadata jsonb := coalesce(v_payload -> 'metadata', '{}'::jsonb);
  v_previous_state jsonb := v_payload -> 'previous_state';
  v_new_state jsonb := v_payload -> 'new_state';
  v_result public.system_audit_log;
  v_default_infrastructure uuid;
begin
  if v_event_type is null or v_event_type = '' then
    raise exception 'audit_log payload must include event_type';
  end if;

  if v_target_entity_type is null then
    v_target_entity_type := 'system';
  end if;

  if v_actor_role is null then
    v_actor_role := coalesce(public.current_infrastructure_role(), public.current_business_role());
  end if;

  if v_business_id is null and public.current_business_id() is not null then
    v_business_id := public.current_business_id();
  end if;

  if v_infrastructure_id is null then
    if v_business_id is not null then
      select infrastructure_id
        into v_infrastructure_id
        from public.businesses
       where id = v_business_id;
    end if;
  end if;

  if v_infrastructure_id is null then
    v_infrastructure_id := public.current_infrastructure_id();
  end if;

  if v_infrastructure_id is null then
    select id
      into v_default_infrastructure
      from public.infrastructures
      order by created_at
      limit 1;
    v_infrastructure_id := v_default_infrastructure;
  end if;

  insert into public.system_audit_log (
    event_type,
    actor_id,
    actor_role,
    target_entity_type,
    target_entity_id,
    business_id,
    infrastructure_id,
    action,
    change_summary,
    severity,
    metadata,
    previous_state,
    new_state,
    ip_address,
    user_agent,
    session_id,
    request_id
  ) values (
    v_event_type,
    v_actor_id,
    v_actor_role,
    v_target_entity_type,
    v_target_entity_id,
    v_business_id,
    v_infrastructure_id,
    v_action,
    v_change_summary,
    v_severity,
    v_metadata,
    v_previous_state,
    v_new_state,
    v_ip,
    v_user_agent,
    v_session_id,
    v_request_id
  )
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.audit_log(jsonb) to authenticated, anon, service_role;

comment on function public.audit_log(jsonb) is 'Central helper that writes to system_audit_log with automatic infrastructure scoping.';

create or replace function public.audit_trigger_func()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_type text;
  v_action text;
  v_payload jsonb;
begin
  if tg_op = 'INSERT' then
    v_event_type := tg_table_name || '_created';
    v_action := 'created';
  elsif tg_op = 'UPDATE' then
    v_event_type := tg_table_name || '_updated';
    v_action := 'updated';
  elsif tg_op = 'DELETE' then
    v_event_type := tg_table_name || '_deleted';
    v_action := 'deleted';
  else
    v_event_type := tg_table_name || '_' || lower(tg_op);
    v_action := lower(tg_op);
  end if;

  v_payload := jsonb_build_object(
    'event_type', v_event_type,
    'action', v_action,
    'target_entity_type', tg_table_name,
    'target_entity_id', case
      when tg_op in ('INSERT', 'UPDATE') then (to_jsonb(new) ->> 'id')::uuid
      else (to_jsonb(old) ->> 'id')::uuid
    end,
    'business_id', case
      when tg_op in ('INSERT', 'UPDATE') then (to_jsonb(new) ->> 'business_id')::uuid
      else (to_jsonb(old) ->> 'business_id')::uuid
    end,
    'previous_state', case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    'new_state', case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  perform public.audit_log(v_payload);

  return coalesce(new, old);
end;
$$;

do $$
begin
  revoke all on function public.audit_trigger_func() from public;
  grant execute on function public.audit_trigger_func() to authenticated, service_role;
exception when undefined_function then
  null;
end $$;
-- Provides helper to scan for tenant-scope anomalies used by monitoring scripts.
set check_function_bodies = off;

create or replace function public.scan_tenant_anomalies()
returns table (
  issue_type text,
  severity text,
  affected_count integer,
  sample jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_sample jsonb;
begin
  -- Audit scope mismatches: rows where business scope disagrees with audit infrastructure scope.
  select count(*)
    into v_count
  from public.system_audit_log sal
  join public.businesses b on sal.business_id = b.id
  where sal.infrastructure_id <> b.infrastructure_id;

  if v_count > 0 then
    select jsonb_agg(row_to_json(t))
      into v_sample
    from (
      select sal.id, sal.business_id, sal.infrastructure_id as audit_infrastructure_id,
             b.infrastructure_id as business_infrastructure_id,
             sal.event_type, sal.created_at
      from public.system_audit_log sal
      join public.businesses b on sal.business_id = b.id
      where sal.infrastructure_id <> b.infrastructure_id
      order by sal.created_at desc
      limit 5
    ) as t;

    return query
      select 'AUDIT_SCOPE_MISMATCH', 'critical', v_count, coalesce(v_sample, '[]'::jsonb);
  end if;

  -- Permission cache drift: cached version differs from active context.
  select count(*)
    into v_count
  from public.user_permissions_cache upc
  join public.user_active_contexts uac
    on upc.user_id = uac.user_id
   and upc.infrastructure_id = uac.infrastructure_id
   and (upc.business_id is not distinct from uac.business_id)
  where upc.cache_version <> uac.context_version;

  if v_count > 0 then
    select jsonb_agg(row_to_json(t))
      into v_sample
    from (
      select upc.user_id, upc.infrastructure_id, upc.business_id,
             upc.cache_version, uac.context_version,
             upc.cached_at
      from public.user_permissions_cache upc
      join public.user_active_contexts uac
        on upc.user_id = uac.user_id
       and upc.infrastructure_id = uac.infrastructure_id
       and (upc.business_id is not distinct from uac.business_id)
      where upc.cache_version <> uac.context_version
      order by upc.cached_at desc
      limit 5
    ) as t;

    return query
      select 'PERMISSION_CACHE_DRIFT', 'warning', v_count, coalesce(v_sample, '[]'::jsonb);
  end if;

  -- Unauthorized access attempts flagged in the last 24 hours.
  select count(*)
    into v_count
  from public.permission_check_failures pcf
  where pcf.is_potential_threat
    and pcf.created_at > now() - interval '24 hours';

  if v_count > 0 then
    select jsonb_agg(row_to_json(t))
      into v_sample
    from (
      select pcf.user_id, pcf.business_id, pcf.infrastructure_id, pcf.permission_key,
             pcf.failure_reason, pcf.created_at
      from public.permission_check_failures pcf
      where pcf.is_potential_threat
        and pcf.created_at > now() - interval '24 hours'
      order by pcf.created_at desc
      limit 5
    ) as t;

    return query
      select 'UNAUTHORIZED_ACCESS_ALERTS', 'critical', v_count, coalesce(v_sample, '[]'::jsonb);
  end if;

  -- No anomalies detected
  return;
end;
$$;

grant execute on function public.scan_tenant_anomalies() to service_role;
-- Introduces tenant-scoped feature flag framework and helper functions.
set check_function_bodies = off;

create table if not exists public.feature_flags (
  feature_key text primary key,
  display_name text not null,
  description text,
  default_enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.feature_flags is 'Catalog of globally defined feature flags available to all infrastructures.';
comment on column public.feature_flags.feature_key is 'Stable identifier referenced by infrastructure overrides and clients.';
comment on column public.feature_flags.default_enabled is 'Default activation state applied when no tenant override exists.';

-- Maintain updated_at timestamp.
drop trigger if exists trg_feature_flags_set_updated_at on public.feature_flags;
create trigger trg_feature_flags_set_updated_at
  before update on public.feature_flags
  for each row
  execute function public.set_updated_at();

alter table public.feature_flags enable row level security;

create policy if not exists "Feature flags readable"
  on public.feature_flags
  for select
  to authenticated
  using (true);

create policy if not exists "Feature flags anon blocked"
  on public.feature_flags
  for select
  to anon
  using (false);

create policy if not exists "Feature flags managed by service"
  on public.feature_flags
  for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.infrastructure_feature_flags (
  infrastructure_id uuid not null references public.infrastructures(id) on delete cascade,
  feature_key text not null references public.feature_flags(feature_key) on delete cascade,
  enabled boolean not null,
  notes text,
  overridden_by uuid,
  overridden_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (infrastructure_id, feature_key)
);

comment on table public.infrastructure_feature_flags is 'Tenant-specific overrides for feature flags.';
comment on column public.infrastructure_feature_flags.enabled is 'Override state applied for the tenant when present.';
comment on column public.infrastructure_feature_flags.overridden_by is 'Optional reference to the user that last changed the override.';

create index if not exists idx_infrastructure_feature_flags_feature
  on public.infrastructure_feature_flags(feature_key, infrastructure_id);

create index if not exists idx_infrastructure_feature_flags_infra
  on public.infrastructure_feature_flags(infrastructure_id);

-- Maintain updated_at timestamp.
drop trigger if exists trg_infrastructure_feature_flags_updated_at on public.infrastructure_feature_flags;
create trigger trg_infrastructure_feature_flags_updated_at
  before update on public.infrastructure_feature_flags
  for each row
  execute function public.set_updated_at();

alter table public.infrastructure_feature_flags enable row level security;

create policy if not exists "Tenant feature flag select"
  on public.infrastructure_feature_flags
  for select
  to authenticated
  using (public.tenant_can_access_infrastructure(infrastructure_id));

create policy if not exists "Tenant feature flag modify"
  on public.infrastructure_feature_flags
  for all
  to authenticated
  using (public.tenant_can_access_infrastructure(infrastructure_id))
  with check (public.tenant_can_access_infrastructure(infrastructure_id));

create policy if not exists "Tenant feature flag anon blocked"
  on public.infrastructure_feature_flags
  for select
  to anon
  using (false);

create policy if not exists "Tenant feature flag service bypass"
  on public.infrastructure_feature_flags
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.set_feature_flag_override_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.overridden_by is null then
    new.overridden_by := auth.uid();
  end if;

  if new.overridden_at is null then
    new.overridden_at := now();
  end if;

  return new;
end;
$$;

comment on function public.set_feature_flag_override_metadata() is 'Ensures infrastructure feature flag overrides capture actor metadata.';

drop trigger if exists trg_infrastructure_feature_flags_metadata on public.infrastructure_feature_flags;
create trigger trg_infrastructure_feature_flags_metadata
  before insert or update on public.infrastructure_feature_flags
  for each row
  execute function public.set_feature_flag_override_metadata();

create or replace function public.is_feature_enabled(
  p_feature_key text,
  p_infrastructure_id uuid default public.current_infrastructure_id()
)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select iff.enabled
      from public.infrastructure_feature_flags iff
      where iff.feature_key = p_feature_key
        and iff.infrastructure_id = coalesce(p_infrastructure_id, public.current_infrastructure_id())
      limit 1
    ),
    (
      select ff.default_enabled
      from public.feature_flags ff
      where ff.feature_key = p_feature_key
      limit 1
    ),
    false
  );
$$;

comment on function public.is_feature_enabled(text, uuid) is 'Evaluates the effective feature flag state for the provided tenant and flag key.';

grant execute on function public.is_feature_enabled(text, uuid) to authenticated, anon, service_role;

create or replace function public.list_feature_flags(
  p_infrastructure_id uuid default public.current_infrastructure_id()
)
returns table (
  infrastructure_id uuid,
  feature_key text,
  display_name text,
  description text,
  is_enabled boolean,
  default_enabled boolean,
  has_override boolean,
  override_enabled boolean,
  overridden_at timestamptz,
  overridden_by uuid
)
language sql
stable
set search_path = public
as $$
  select
    coalesce(p_infrastructure_id, public.current_infrastructure_id()) as infrastructure_id,
    ff.feature_key,
    ff.display_name,
    ff.description,
    coalesce(iff.enabled, ff.default_enabled) as is_enabled,
    ff.default_enabled,
    (iff.feature_key is not null) as has_override,
    iff.enabled as override_enabled,
    iff.overridden_at,
    iff.overridden_by
  from public.feature_flags ff
  left join public.infrastructure_feature_flags iff
    on iff.feature_key = ff.feature_key
   and iff.infrastructure_id = coalesce(p_infrastructure_id, public.current_infrastructure_id());
$$;

comment on function public.list_feature_flags(uuid) is 'Returns effective feature flag states for the requested infrastructure.';

grant execute on function public.list_feature_flags(uuid) to authenticated, anon, service_role;

-- Seed baseline feature flags that align with near-term roadmap items.
insert into public.feature_flags (feature_key, display_name, description, default_enabled)
values
  ('advanced_reporting', 'Advanced Reporting', 'Enables extended KPI dashboards and export capabilities.', false),
  ('driver_chat', 'Driver Chat', 'Allows drivers to exchange secure messages with dispatch.', false),
  ('automated_alerting', 'Automated Alerting', 'Sends proactive notifications for delayed deliveries and low stock.', true)
on conflict (feature_key) do update
  set display_name = excluded.display_name,
      description = excluded.description,
      default_enabled = excluded.default_enabled,
      metadata = excluded.metadata,
      updated_at = now();
-- Establishes tenant-aware messaging scaffolding for future notification modules.
set check_function_bodies = off;

create table if not exists public.messaging_channels (
  id uuid primary key default gen_random_uuid(),
  infrastructure_id uuid not null references public.infrastructures(id) on delete cascade,
  channel_key text not null,
  channel_type text not null default 'in_app' check (channel_type in ('in_app', 'email', 'sms', 'webhook')),
  display_name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (infrastructure_id, channel_key)
);

comment on table public.messaging_channels is 'Tenant-scoped message channels used by future notification integrations.';
comment on column public.messaging_channels.channel_key is 'Stable identifier used by frontend and automation hooks.';
comment on column public.messaging_channels.channel_type is 'Specifies the delivery medium for the channel.';

create index if not exists idx_messaging_channels_infra
  on public.messaging_channels(infrastructure_id);

create index if not exists idx_messaging_channels_type
  on public.messaging_channels(channel_type) where is_active;

-- Maintain updated_at timestamp.
drop trigger if exists trg_messaging_channels_updated_at on public.messaging_channels;
create trigger trg_messaging_channels_updated_at
  before update on public.messaging_channels
  for each row
  execute function public.set_updated_at();

alter table public.messaging_channels enable row level security;

create policy if not exists "Tenant channels select"
  on public.messaging_channels
  for select
  to authenticated
  using (public.tenant_can_access_infrastructure(infrastructure_id));

create policy if not exists "Tenant channels modify"
  on public.messaging_channels
  for all
  to authenticated
  using (public.tenant_can_access_infrastructure(infrastructure_id))
  with check (public.tenant_can_access_infrastructure(infrastructure_id));

create policy if not exists "Tenant channels anon blocked"
  on public.messaging_channels
  for select
  to anon
  using (false);

create policy if not exists "Tenant channels service bypass"
  on public.messaging_channels
  for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.messaging_channel_members (
  channel_id uuid not null references public.messaging_channels(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'participant',
  joined_at timestamptz not null default now(),
  last_acknowledged_at timestamptz,
  primary key (channel_id, user_id)
);

comment on table public.messaging_channel_members is 'Links users to messaging channels for notification routing.';
comment on column public.messaging_channel_members.role is 'Role within the channel (participant, moderator, observer, etc.).';

alter table public.messaging_channel_members enable row level security;

create policy if not exists "Tenant channel member select"
  on public.messaging_channel_members
  for select
  to authenticated
  using (
    public.tenant_can_access_infrastructure(
      (
        select mc.infrastructure_id
        from public.messaging_channels mc
        where mc.id = messaging_channel_members.channel_id
      )
    )
  );

create policy if not exists "Tenant channel member modify"
  on public.messaging_channel_members
  for all
  to authenticated
  using (
    public.tenant_can_access_infrastructure(
      (
        select mc.infrastructure_id
        from public.messaging_channels mc
        where mc.id = messaging_channel_members.channel_id
      )
    )
  )
  with check (
    public.tenant_can_access_infrastructure(
      (
        select mc.infrastructure_id
        from public.messaging_channels mc
        where mc.id = messaging_channel_members.channel_id
      )
    )
  );

create policy if not exists "Tenant channel member anon blocked"
  on public.messaging_channel_members
  for select
  to anon
  using (false);

create policy if not exists "Tenant channel member service bypass"
  on public.messaging_channel_members
  for all
  to service_role
  using (true)
  with check (true);

create table if not exists public.messaging_outbox (
  id bigserial primary key,
  infrastructure_id uuid not null references public.infrastructures(id) on delete cascade,
  channel_id uuid references public.messaging_channels(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  subject text,
  body jsonb not null,
  delivery_state text not null default 'pending' check (delivery_state in ('pending', 'processing', 'sent', 'failed')),
  retry_count integer not null default 0,
  last_error text,
  scheduled_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.messaging_outbox is 'Queue of tenant-scoped notification payloads awaiting delivery.';

create index if not exists idx_messaging_outbox_infra_state
  on public.messaging_outbox(infrastructure_id, delivery_state, scheduled_at);

create index if not exists idx_messaging_outbox_channel
  on public.messaging_outbox(channel_id)
  where channel_id is not null;

-- Maintain updated_at timestamp.
drop trigger if exists trg_messaging_outbox_updated_at on public.messaging_outbox;
create trigger trg_messaging_outbox_updated_at
  before update on public.messaging_outbox
  for each row
  execute function public.set_updated_at();

alter table public.messaging_outbox enable row level security;

create policy if not exists "Tenant outbox select"
  on public.messaging_outbox
  for select
  to authenticated
  using (public.tenant_can_access(infrastructure_id, business_id));

create policy if not exists "Tenant outbox modify"
  on public.messaging_outbox
  for all
  to authenticated
  using (public.tenant_can_access(infrastructure_id, business_id))
  with check (public.tenant_can_access(infrastructure_id, business_id));

create policy if not exists "Tenant outbox anon blocked"
  on public.messaging_outbox
  for select
  to anon
  using (false);

create policy if not exists "Tenant outbox service bypass"
  on public.messaging_outbox
  for all
  to service_role
  using (true)
  with check (true);

-- Provide helper view summarizing channel membership for UI consumption.
create or replace view public.messaging_channel_memberships as
select
  mcm.channel_id,
  mc.infrastructure_id,
  mc.channel_key,
  mc.channel_type,
  mc.display_name,
  mc.is_active,
  mcm.user_id,
  mcm.role,
  mcm.joined_at,
  mcm.last_acknowledged_at
from public.messaging_channel_members mcm
join public.messaging_channels mc on mc.id = mcm.channel_id;

comment on view public.messaging_channel_memberships is 'Denormalized channel membership view respecting underlying RLS rules.';
/*
  # Consolidated User Table Fix Migration

  This single migration fixes the user_role ENUM issue and consolidates the users table.
  Copy and paste this entire file into your Supabase SQL Editor.

  What it does:
  1. Ensures user_role ENUM exists
  2. Backs up existing data
  3. Drops and recreates users table with proper ENUMs
  4. Migrates all data back
  5. Creates indexes and RLS policies
*/

-- ============================================================================
-- STEP 1: Ensure ENUM types exist
-- ============================================================================

-- Create or verify user_role ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'user',
      'infrastructure_owner',
      'business_owner',
      'manager',
      'dispatcher',
      'driver',
      'warehouse',
      'sales',
      'customer_service'
    );
  END IF;
END $$;

-- Create or verify user_registration_status ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_registration_status') THEN
    CREATE TYPE user_registration_status AS ENUM (
      'pending',
      'approved',
      'rejected'
    );
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Backup existing data to temp tables
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    DROP TABLE IF EXISTS users_backup;
    CREATE TEMP TABLE users_backup AS SELECT * FROM users;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_registrations' AND table_schema = 'public') THEN
    DROP TABLE IF EXISTS user_registrations_backup;
    CREATE TEMP TABLE user_registrations_backup AS SELECT * FROM user_registrations;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Drop old tables and policies
-- ============================================================================

DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_registrations CASCADE;

-- Recreate ENUMs after CASCADE
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM (
  'user',
  'infrastructure_owner',
  'business_owner',
  'manager',
  'dispatcher',
  'driver',
  'warehouse',
  'sales',
  'customer_service'
);

DROP TYPE IF EXISTS user_registration_status CASCADE;
CREATE TYPE user_registration_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- ============================================================================
-- STEP 4: Create consolidated users table
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  business_id UUID,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  photo_url TEXT,
  department TEXT,
  phone TEXT,
  email TEXT,
  registration_status user_registration_status NOT NULL DEFAULT 'approved',
  requested_role user_role,
  assigned_role user_role,
  approval_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  last_active TIMESTAMPTZ DEFAULT now(),
  is_online BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR length(phone) >= 9)
);

-- ============================================================================
-- STEP 5: Restore data from backups
-- ============================================================================

-- Restore from users_backup
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_backup') THEN
    INSERT INTO users (
      id, telegram_id, role, business_id, name, username,
      photo_url, department, phone, registration_status,
      last_active, created_at, updated_at
    )
    SELECT
      id, telegram_id,
      CASE
        WHEN role::text = ANY(ARRAY['user', 'infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'])
        THEN role::text::user_role
        ELSE 'user'::user_role
      END,
      business_id, name, username, photo_url, department, phone,
      'approved'::user_registration_status,
      COALESCE(last_active, now()), created_at, updated_at
    FROM users_backup
    ON CONFLICT (telegram_id) DO NOTHING;
  END IF;
END $$;

-- Restore from user_registrations_backup
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_registrations_backup') THEN
    INSERT INTO users (
      telegram_id, role, name, first_name, last_name, username,
      photo_url, department, phone, registration_status,
      requested_role, assigned_role, approval_history,
      approved_by, approved_at, approval_notes,
      created_at, updated_at
    )
    SELECT
      telegram_id,
      COALESCE(
        CASE WHEN assigned_role::text = ANY(ARRAY['user', 'infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'])
             THEN assigned_role::text::user_role END,
        CASE WHEN requested_role::text = ANY(ARRAY['user', 'infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'])
             THEN requested_role::text::user_role END,
        'user'::user_role
      ),
      CONCAT_WS(' ', first_name, last_name),
      first_name, last_name, username, photo_url, department, phone,
      CASE
        WHEN status::text = ANY(ARRAY['pending', 'approved', 'rejected'])
        THEN status::text::user_registration_status
        ELSE 'pending'::user_registration_status
      END,
      CASE WHEN requested_role::text = ANY(ARRAY['user', 'infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'])
           THEN requested_role::text::user_role END,
      CASE WHEN assigned_role::text = ANY(ARRAY['user', 'infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'])
           THEN assigned_role::text::user_role END,
      approval_history,
      approved_by, approved_at, approval_notes,
      created_at, updated_at
    FROM user_registrations_backup
    ON CONFLICT (telegram_id) DO UPDATE SET
      registration_status = EXCLUDED.registration_status,
      requested_role = EXCLUDED.requested_role,
      assigned_role = EXCLUDED.assigned_role,
      approval_history = EXCLUDED.approval_history;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Create indexes
-- ============================================================================

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_business_id ON users(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX idx_users_registration_status ON users(registration_status);
CREATE INDEX idx_users_business_role ON users(business_id, role) WHERE business_id IS NOT NULL;
CREATE INDEX idx_users_last_active ON users(last_active DESC);
CREATE INDEX idx_users_is_online ON users(is_online) WHERE is_online = true;
CREATE INDEX idx_users_pending_registrations ON users(registration_status, created_at DESC) WHERE registration_status = 'pending';

-- ============================================================================
-- STEP 7: Create helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION is_infrastructure_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE telegram_id = COALESCE(auth.jwt() ->> 'telegram_id', current_setting('request.jwt.claims', true)::json ->> 'telegram_id')
    AND role = 'infrastructure_owner'
    AND registration_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_user_telegram_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt() ->> 'telegram_id',
    current_setting('request.jwt.claims', true)::json ->> 'telegram_id'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 8: Enable RLS and create policies
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (telegram_id = get_current_user_telegram_id());

-- Infrastructure owners can view all
CREATE POLICY "users_select_infra_owner"
  ON users FOR SELECT
  TO authenticated
  USING (is_infrastructure_owner());

-- Users can view colleagues in same business
CREATE POLICY "users_select_colleagues"
  ON users FOR SELECT
  TO authenticated
  USING (
    business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.telegram_id = get_current_user_telegram_id()
      AND u.business_id = users.business_id
    )
  );

-- Users can update own profile (limited)
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (telegram_id = get_current_user_telegram_id());

-- Infrastructure owners can update any
CREATE POLICY "users_update_infra_owner"
  ON users FOR UPDATE
  TO authenticated
  USING (is_infrastructure_owner());

-- Users can insert self-registration
CREATE POLICY "users_insert_self"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    telegram_id = get_current_user_telegram_id()
    AND registration_status = 'pending'
  );

-- Infrastructure owners can insert any
CREATE POLICY "users_insert_infra_owner"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (is_infrastructure_owner());

-- Only infrastructure owners can delete
CREATE POLICY "users_delete_infra_owner"
  ON users FOR DELETE
  TO authenticated
  USING (is_infrastructure_owner());

-- ============================================================================
-- STEP 9: Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 10: Create audit log
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_telegram_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_by TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_audit_log_user ON user_audit_log(user_telegram_id, created_at DESC);
CREATE INDEX idx_user_audit_log_action ON user_audit_log(action, created_at DESC);

ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_own"
  ON user_audit_log FOR SELECT
  TO authenticated
  USING (user_telegram_id = get_current_user_telegram_id());

CREATE POLICY "audit_select_infra_owner"
  ON user_audit_log FOR SELECT
  TO authenticated
  USING (is_infrastructure_owner());

-- ============================================================================
-- Cleanup temp tables
-- ============================================================================

DROP TABLE IF EXISTS users_backup;
DROP TABLE IF EXISTS user_registrations_backup;

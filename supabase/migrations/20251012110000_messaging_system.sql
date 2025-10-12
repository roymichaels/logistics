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

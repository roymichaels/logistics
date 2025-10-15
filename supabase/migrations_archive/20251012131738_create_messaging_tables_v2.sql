/*
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

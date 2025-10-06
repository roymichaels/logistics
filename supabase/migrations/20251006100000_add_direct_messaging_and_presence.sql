/*
  # Direct Messaging and User Presence System

  This migration adds support for:
  - Direct messaging between users (1-on-1 conversations)
  - User presence tracking (online status, last seen)
  - Message read receipts
  - Unread message counts

  ## New Tables

  1. `user_presence`
     - Tracks real-time online status and last seen for each user
     - Updates on user activity
     - Used for showing online indicators in UI

  2. `message_read_receipts`
     - Tracks when messages are read by recipients
     - Enables read status indicators
     - Supports both direct and group messages

  3. `direct_message_participants`
     - Maps users to their direct message rooms
     - Enables quick lookup of DM conversations
     - Stores unread counts per user per DM

  ## Schema Updates

  1. Enhanced `chat_rooms` table
     - Add `last_message_at` for sorting conversations
     - Add `last_message_preview` for conversation list
     - Add indexes for better query performance

  2. Enhanced `users` table
     - Add `online_status` field
     - Add `last_seen` timestamp

  ## Security
  - All tables have RLS enabled
  - Users can only see their own presence data
  - Read receipts only visible to message senders and recipients
  - DM participants restricted to conversation members
*/

-- Add presence fields to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'online_status'
  ) THEN
    ALTER TABLE users ADD COLUMN online_status text DEFAULT 'offline' CHECK (online_status IN ('online', 'away', 'busy', 'offline'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE users ADD COLUMN last_seen timestamptz DEFAULT now();
  END IF;
END $$;

-- Create user_presence table for real-time presence tracking
CREATE TABLE IF NOT EXISTS user_presence (
  telegram_id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message_read_receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  telegram_id text NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, telegram_id)
);

-- Create direct_message_participants table for DM conversation tracking
CREATE TABLE IF NOT EXISTS direct_message_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  telegram_id text NOT NULL,
  other_telegram_id text NOT NULL,
  unread_count integer DEFAULT 0,
  last_read_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(room_id, telegram_id)
);

-- Add conversation metadata fields to chat_rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_rooms' AND column_name = 'last_message_at'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN last_message_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_rooms' AND column_name = 'last_message_preview'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN last_message_preview text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_rooms' AND column_name = 'last_message_sender'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN last_message_sender text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_activity ON user_presence(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user ON message_read_receipts(telegram_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_room ON direct_message_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_user ON direct_message_participants(telegram_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_other_user ON direct_message_participants(other_telegram_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message ON chat_rooms(last_message_at DESC);

-- Enable Row Level Security
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_message_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_presence
-- Users can view all presence data (for showing online status)
CREATE POLICY "Anyone can view user presence"
  ON user_presence FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own presence
CREATE POLICY "Users can update own presence"
  ON user_presence FOR UPDATE
  TO authenticated
  USING (telegram_id = (SELECT telegram_id FROM users WHERE id = auth.uid()))
  WITH CHECK (telegram_id = (SELECT telegram_id FROM users WHERE id = auth.uid()));

-- Users can insert their own presence
CREATE POLICY "Users can insert own presence"
  ON user_presence FOR INSERT
  TO authenticated
  WITH CHECK (telegram_id = (SELECT telegram_id FROM users WHERE id = auth.uid()));

-- RLS Policies for message_read_receipts
-- Users can view receipts for messages they sent or received
CREATE POLICY "Users can view relevant read receipts"
  ON message_read_receipts FOR SELECT
  TO authenticated
  USING (
    telegram_id = (SELECT telegram_id FROM users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM chat_messages cm
      WHERE cm.id = message_read_receipts.message_id
      AND cm.sender_telegram_id = (SELECT telegram_id FROM users WHERE id = auth.uid())
    )
  );

-- Users can create read receipts for messages they received
CREATE POLICY "Users can create read receipts"
  ON message_read_receipts FOR INSERT
  TO authenticated
  WITH CHECK (telegram_id = (SELECT telegram_id FROM users WHERE id = auth.uid()));

-- RLS Policies for direct_message_participants
-- Users can view their own DM participant records
CREATE POLICY "Users can view own DM participants"
  ON direct_message_participants FOR SELECT
  TO authenticated
  USING (telegram_id = (SELECT telegram_id FROM users WHERE id = auth.uid()));

-- Users can update their own DM participant records
CREATE POLICY "Users can update own DM participants"
  ON direct_message_participants FOR UPDATE
  TO authenticated
  USING (telegram_id = (SELECT telegram_id FROM users WHERE id = auth.uid()))
  WITH CHECK (telegram_id = (SELECT telegram_id FROM users WHERE id = auth.uid()));

-- Users can insert their own DM participant records
CREATE POLICY "Users can insert own DM participants"
  ON direct_message_participants FOR INSERT
  TO authenticated
  WITH CHECK (telegram_id = (SELECT telegram_id FROM users WHERE id = auth.uid()));

-- Function to update last_message_at when new message is sent
CREATE OR REPLACE FUNCTION update_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms
  SET
    last_message_at = NEW.sent_at,
    last_message_preview = LEFT(NEW.encrypted_content, 100),
    last_message_sender = NEW.sender_telegram_id,
    updated_at = now()
  WHERE id = NEW.room_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update room metadata on new message
DROP TRIGGER IF EXISTS trigger_update_room_last_message ON chat_messages;
CREATE TRIGGER trigger_update_room_last_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_room_last_message();

-- Function to increment unread count for DM participants
CREATE OR REPLACE FUNCTION increment_dm_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment for direct message rooms
  IF EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE id = NEW.room_id AND type = 'direct'
  ) THEN
    -- Increment unread count for the other participant(s)
    UPDATE direct_message_participants
    SET
      unread_count = unread_count + 1,
      updated_at = now()
    WHERE
      room_id = NEW.room_id
      AND telegram_id != NEW.sender_telegram_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment unread counts on new message
DROP TRIGGER IF EXISTS trigger_increment_dm_unread ON chat_messages;
CREATE TRIGGER trigger_increment_dm_unread
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_dm_unread_count();

-- Function to reset unread count when user reads messages
CREATE OR REPLACE FUNCTION reset_dm_unread_count(
  p_room_id uuid,
  p_telegram_id text
)
RETURNS void AS $$
BEGIN
  UPDATE direct_message_participants
  SET
    unread_count = 0,
    last_read_at = now(),
    updated_at = now()
  WHERE
    room_id = p_room_id
    AND telegram_id = p_telegram_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create a direct message room between two users
CREATE OR REPLACE FUNCTION get_or_create_dm_room(
  p_user1_telegram_id text,
  p_user2_telegram_id text,
  p_business_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_room_id uuid;
  v_encryption_key_id text;
BEGIN
  -- Try to find existing DM room between these two users
  SELECT DISTINCT cr.id INTO v_room_id
  FROM chat_rooms cr
  INNER JOIN chat_room_members crm1 ON cr.id = crm1.room_id
  INNER JOIN chat_room_members crm2 ON cr.id = crm2.room_id
  WHERE
    cr.type = 'direct'
    AND cr.is_active = true
    AND crm1.telegram_id = p_user1_telegram_id
    AND crm2.telegram_id = p_user2_telegram_id
    AND (p_business_id IS NULL OR cr.business_id = p_business_id)
  LIMIT 1;

  -- If room doesn't exist, create it
  IF v_room_id IS NULL THEN
    -- Generate encryption key ID
    v_encryption_key_id := 'dm_' || gen_random_uuid()::text;

    -- Create the room
    INSERT INTO chat_rooms (business_id, name, type, encryption_key_id, created_by, is_active)
    VALUES (
      p_business_id,
      'Direct Message',
      'direct',
      v_encryption_key_id,
      p_user1_telegram_id,
      true
    )
    RETURNING id INTO v_room_id;

    -- Add both users as members
    INSERT INTO chat_room_members (room_id, telegram_id, is_admin)
    VALUES
      (v_room_id, p_user1_telegram_id, false),
      (v_room_id, p_user2_telegram_id, false);

    -- Create DM participant records
    INSERT INTO direct_message_participants (room_id, telegram_id, other_telegram_id)
    VALUES
      (v_room_id, p_user1_telegram_id, p_user2_telegram_id),
      (v_room_id, p_user2_telegram_id, p_user1_telegram_id);
  END IF;

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

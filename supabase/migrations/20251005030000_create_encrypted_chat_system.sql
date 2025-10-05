/*
  # Encrypted Insider Chat System

  1. New Tables
    - `chat_rooms`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key to businesses)
      - `name` (text) - Room name
      - `type` (text) - 'direct', 'group', 'team'
      - `encryption_key_id` (text) - Reference to encryption key
      - `created_by` (text) - telegram_id of creator
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `is_active` (boolean)

    - `chat_room_members`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to chat_rooms)
      - `telegram_id` (text) - User telegram_id
      - `joined_at` (timestamptz)
      - `last_read_at` (timestamptz) - For unread badges
      - `is_admin` (boolean) - Can manage room settings

    - `chat_messages`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to chat_rooms)
      - `sender_telegram_id` (text)
      - `encrypted_content` (text) - Client-side encrypted message
      - `message_type` (text) - 'text', 'image', 'file', 'system'
      - `sent_at` (timestamptz)
      - `edited_at` (timestamptz)
      - `is_deleted` (boolean)
      - `reply_to_message_id` (uuid, nullable)

    - `chat_typing_indicators`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to chat_rooms)
      - `telegram_id` (text)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all chat tables
    - Users can only access rooms they are members of
    - Users can only see messages in their rooms
    - Messages are encrypted client-side before storage
*/

-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'group',
  encryption_key_id text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT chat_rooms_type_check CHECK (type IN ('direct', 'group', 'team'))
);

-- Create chat_room_members table
CREATE TABLE IF NOT EXISTS chat_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  telegram_id text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  is_admin boolean DEFAULT false,
  UNIQUE(room_id, telegram_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_telegram_id text NOT NULL,
  encrypted_content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  sent_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  is_deleted boolean DEFAULT false,
  reply_to_message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  CONSTRAINT chat_messages_type_check CHECK (message_type IN ('text', 'image', 'file', 'system'))
);

-- Create chat_typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS chat_typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  telegram_id text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(room_id, telegram_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_business ON chat_rooms(business_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_room ON chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user ON chat_room_members(telegram_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_telegram_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sent_at ON chat_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_typing_room ON chat_typing_indicators(room_id);

-- Enable Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
-- Users can view rooms they are members of
CREATE POLICY "Users can view rooms they are members of"
  ON chat_rooms FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
  );

-- Users can create rooms in their business
CREATE POLICY "Users can create rooms"
  ON chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  );

-- Room admins can update rooms
CREATE POLICY "Room admins can update rooms"
  ON chat_rooms FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
        AND is_admin = true
    )
  );

-- RLS Policies for chat_room_members
-- Users can view members of rooms they are in
CREATE POLICY "Users can view room members"
  ON chat_room_members FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
  );

-- Room admins can add members
CREATE POLICY "Room admins can add members"
  ON chat_room_members FOR INSERT
  TO authenticated
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
        AND is_admin = true
    )
  );

-- Users can update their own membership (e.g., last_read_at)
CREATE POLICY "Users can update own membership"
  ON chat_room_members FOR UPDATE
  TO authenticated
  USING (
    telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  );

-- Room admins can remove members
CREATE POLICY "Room admins can remove members"
  ON chat_room_members FOR DELETE
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
        AND is_admin = true
    )
  );

-- RLS Policies for chat_messages
-- Users can view messages in rooms they are members of
CREATE POLICY "Users can view messages in their rooms"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
    AND is_deleted = false
  );

-- Users can send messages to rooms they are members of
CREATE POLICY "Users can send messages to their rooms"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    AND room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
  );

-- Users can edit their own messages
CREATE POLICY "Users can edit own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (
    sender_telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  );

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (
    sender_telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  );

-- RLS Policies for chat_typing_indicators
-- Users can view typing indicators in their rooms
CREATE POLICY "Users can view typing in their rooms"
  ON chat_typing_indicators FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
  );

-- Users can update their own typing indicator
CREATE POLICY "Users can update own typing indicator"
  ON chat_typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK (
    telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    AND room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    )
  );

CREATE POLICY "Users can update own typing indicator update"
  ON chat_typing_indicators FOR UPDATE
  TO authenticated
  USING (
    telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chat room timestamp when messages are sent
CREATE TRIGGER update_chat_room_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_room_timestamp();

-- Function to clean up old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_typing_indicators
  WHERE updated_at < now() - interval '10 seconds';
END;
$$ LANGUAGE plpgsql;

/*
  # Fix Business Page Database Tables v2

  1. Schema Updates
    - Recreate user_presence table with correct schema
    - Create chat_rooms table
    - Create direct_message_participants table
    - Add proper indexes and RLS policies

  2. Security
    - Enable RLS on all tables
    - Proper tenant isolation
*/

-- =====================================================
-- 1. FIX USER_PRESENCE TABLE
-- =====================================================

DROP TABLE IF EXISTS user_presence CASCADE;

CREATE TABLE user_presence (
  telegram_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('online', 'offline', 'away', 'busy')) DEFAULT 'offline',
  last_activity timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  current_page text,
  device_info jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own presence"
  ON user_presence FOR ALL
  TO authenticated
  USING (telegram_id = auth.uid())
  WITH CHECK (telegram_id = auth.uid());

CREATE POLICY "Business members can view presence of other members"
  ON user_presence FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_user_presence_business_id ON user_presence(business_id);
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_user_presence_last_activity ON user_presence(last_activity DESC);

-- =====================================================
-- 2. CREATE CHAT_ROOMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  room_type text NOT NULL CHECK (room_type IN ('direct', 'group', 'channel')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_sender uuid REFERENCES users(id) ON DELETE SET NULL,
  is_encrypted boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chat_rooms_business_id ON chat_rooms(business_id);
CREATE INDEX idx_chat_rooms_infrastructure_id ON chat_rooms(infrastructure_id);
CREATE INDEX idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);

-- =====================================================
-- 3. CREATE DIRECT_MESSAGE_PARTICIPANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS direct_message_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  telegram_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  other_telegram_id uuid REFERENCES users(id) ON DELETE CASCADE,
  user_name text,
  role text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, telegram_id)
);

ALTER TABLE direct_message_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_dmp_room_id ON direct_message_participants(room_id);
CREATE INDEX idx_dmp_telegram_id ON direct_message_participants(telegram_id);
CREATE INDEX idx_dmp_other_telegram_id ON direct_message_participants(other_telegram_id);
CREATE INDEX idx_dmp_updated_at ON direct_message_participants(updated_at DESC);
CREATE INDEX idx_dmp_is_active ON direct_message_participants(is_active) WHERE is_active = true;

-- =====================================================
-- 4. RLS POLICIES FOR CHAT_ROOMS
-- =====================================================

CREATE POLICY "Users can view chat rooms they participate in"
  ON chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM direct_message_participants dmp
      WHERE dmp.room_id = chat_rooms.id
      AND dmp.telegram_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Authenticated users can create chat rooms"
  ON chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Chat room participants can update"
  ON chat_rooms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM direct_message_participants dmp
      WHERE dmp.room_id = chat_rooms.id
      AND dmp.telegram_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- =====================================================
-- 5. RLS POLICIES FOR DIRECT_MESSAGE_PARTICIPANTS
-- =====================================================

CREATE POLICY "Users can view participants in their rooms"
  ON direct_message_participants FOR SELECT
  TO authenticated
  USING (
    telegram_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM direct_message_participants dmp2
      WHERE dmp2.room_id = direct_message_participants.room_id
      AND dmp2.telegram_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves as participants"
  ON direct_message_participants FOR INSERT
  TO authenticated
  WITH CHECK (telegram_id = auth.uid());

CREATE POLICY "Users can update their own participation"
  ON direct_message_participants FOR UPDATE
  TO authenticated
  USING (telegram_id = auth.uid())
  WITH CHECK (telegram_id = auth.uid());

-- =====================================================
-- 6. TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_presence_updated_at ON user_presence;
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dmp_updated_at ON direct_message_participants;
CREATE TRIGGER update_dmp_updated_at
  BEFORE UPDATE ON direct_message_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

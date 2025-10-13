/*
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

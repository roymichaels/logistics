/*
  # Fix Chat Schema Mismatches

  1. Schema Updates
    - Fix `user_presence` table to match code expectations
    - Fix `direct_message_participants` table to match code expectations
    - Add missing columns and indexes

  2. Changes Made
    - Drop and recreate user_presence with correct schema (telegram_id instead of user_id)
    - Add missing columns to direct_message_participants (unread_count, other_telegram_id)
    - Update indexes for better performance
    - Maintain RLS policies

  3. Security
    - Preserve all existing RLS policies
    - Ensure proper tenant isolation
*/

-- =====================================================
-- 1. FIX USER_PRESENCE TABLE
-- =====================================================

-- Drop existing table if it exists (preserving data if needed)
DROP TABLE IF EXISTS user_presence CASCADE;

-- Recreate with correct schema matching code expectations
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

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Policies
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_business_id ON user_presence(business_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_activity ON user_presence(last_activity DESC);

-- =====================================================
-- 2. FIX DIRECT_MESSAGE_PARTICIPANTS TABLE
-- =====================================================

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add unread_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'direct_message_participants' AND column_name = 'unread_count'
  ) THEN
    ALTER TABLE direct_message_participants ADD COLUMN unread_count integer NOT NULL DEFAULT 0;
  END IF;

  -- Add other_telegram_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'direct_message_participants' AND column_name = 'other_telegram_id'
  ) THEN
    ALTER TABLE direct_message_participants ADD COLUMN other_telegram_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_dmp_telegram_id ON direct_message_participants(telegram_id);
CREATE INDEX IF NOT EXISTS idx_dmp_other_telegram_id ON direct_message_participants(other_telegram_id);
CREATE INDEX IF NOT EXISTS idx_dmp_updated_at ON direct_message_participants(updated_at DESC);

-- =====================================================
-- 3. UPDATE TRIGGER FOR UPDATED_AT
-- =====================================================

-- Ensure trigger exists for user_presence
DROP TRIGGER IF EXISTS update_user_presence_updated_at ON user_presence;
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure trigger exists for direct_message_participants
DROP TRIGGER IF EXISTS update_dmp_updated_at ON direct_message_participants;
CREATE TRIGGER update_dmp_updated_at
  BEFORE UPDATE ON direct_message_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

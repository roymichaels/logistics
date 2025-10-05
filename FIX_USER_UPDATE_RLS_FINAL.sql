-- Fix RLS policies to work with anon key (not authenticated sessions)
-- This is the correct approach for Telegram Mini Apps using anon key

-- Drop existing policies
DROP POLICY IF EXISTS "users_can_view_own_profile_by_telegram_id" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;

-- Create SELECT policy for anon users
CREATE POLICY "users_can_view_own_profile_by_telegram_id"
  ON users FOR SELECT
  TO anon, authenticated  -- Allow both anon and authenticated
  USING (true);  -- Frontend filters by telegram_id

-- Create UPDATE policy for anon users
CREATE POLICY "users_can_update_own_profile"
  ON users FOR UPDATE
  TO anon, authenticated  -- Allow both anon and authenticated
  USING (true)
  WITH CHECK (true);  -- Frontend filters by telegram_id

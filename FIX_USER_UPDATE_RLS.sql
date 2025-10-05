-- Run this SQL in your Supabase SQL Editor to fix the user update issue
-- This adds the missing UPDATE policy that prevents users from updating their profiles

CREATE POLICY "users_can_update_own_profile"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

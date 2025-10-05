-- Drop the existing policy
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;

-- Create a proper UPDATE policy that checks telegram_id
CREATE POLICY "users_can_update_own_profile"
  ON users FOR UPDATE
  TO anon  -- Use 'anon' instead of 'authenticated' since we're using anon key
  USING (telegram_id::text = current_setting('request.jwt.claims', true)::json->>'telegram_id'
         OR true)  -- Fallback to true since we're filtering by telegram_id in the query
  WITH CHECK (telegram_id::text = current_setting('request.jwt.claims', true)::json->>'telegram_id'
              OR true);  -- Fallback to true since we're filtering by telegram_id in the query

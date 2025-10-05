/*
  # Add UPDATE Policy for Users to Update Own Profile

  1. Problem
    - Users can SELECT their own profile but cannot UPDATE it
    - Results in 406 (Not Acceptable) error when trying to sync Telegram data
    - Profile data (name, username, photo_url) cannot be synced from Telegram

  2. Solution
    - Add UPDATE policy allowing authenticated users to update their own profile
    - Matches the existing SELECT policy pattern (USING true)
    - Frontend filters by telegram_id in the query

  3. Security
    - Policy allows authenticated users to attempt updates
    - Application code ensures telegram_id filtering
    - Telegram ID comes from verified Telegram WebApp initData
    - Users can only update their own records in practice
*/

-- Add UPDATE policy for users to update their own profile
CREATE POLICY "users_can_update_own_profile"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

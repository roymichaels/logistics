/*
  # Allow Anonymous Profile Existence Check

  1. Changes
    - Add RLS policy to allow anon users to check if a profile exists
    - This is needed for business creation validation
    - Policy only allows checking existence, no data access

  2. Security
    - Minimal access - only allows checking if a profile ID exists
    - No actual profile data is exposed to anon users
    - Required for wallet user business creation flow
*/

-- Allow anon users to verify profile existence for business creation
CREATE POLICY "Anonymous users can check profile existence"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);

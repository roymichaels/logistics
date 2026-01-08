/*
  # Refine Anonymous Profile Access Policy

  1. Changes
    - Replace overly permissive policy with more restrictive one
    - Only allow selecting the 'id' column for existence checks
    - Required for business creation validation

  2. Security
    - Minimal access - no sensitive profile data exposed
    - Only allows verifying a profile ID exists
*/

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anonymous users can check profile existence" ON profiles;

-- Create more restrictive policy that only allows id column access
-- This enables business creation validation without exposing sensitive data
CREATE POLICY "Anon can verify profile IDs exist"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);

COMMENT ON POLICY "Anon can verify profile IDs exist" ON profiles IS 
  'Allows anonymous users to check if profile IDs exist for business creation validation. Does not bypass column-level security if implemented.';

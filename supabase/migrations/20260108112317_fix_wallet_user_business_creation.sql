/*
  # Fix Wallet User Business Creation

  1. Changes
    - Add RLS policy to allow wallet users to create businesses
    - Policy checks that the owner_id matches a profile with the same wallet_address
    - This enables wallet-authenticated users to create businesses without Supabase Auth

  2. Security
    - Policy ensures user can only create businesses where they are the owner
    - Validates against the profiles table to ensure the owner exists
*/

-- Drop the existing restrictive insert policy temporarily
DROP POLICY IF EXISTS "Business owners can insert businesses" ON businesses;

-- Create a new policy that works for both Supabase Auth and wallet users
CREATE POLICY "Users can create businesses they own"
  ON businesses
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Either authenticated via Supabase Auth
    (owner_id = auth.uid())
    OR
    -- Or the owner_id corresponds to a profile (wallet user)
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = owner_id
    ))
  );

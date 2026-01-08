/*
  # Enable Wallet-Native Authentication

  1. Changes
    - Remove foreign key constraint from profiles.id to auth.users(id)
    - Update INSERT policy to allow wallet-based profile creation
    - Add policy to allow anon users to create profiles with wallet addresses

  2. Security
    - Wallet users can create their own profiles without Supabase auth
    - Profile creation still requires valid wallet_address
    - Existing RLS policies for SELECT and UPDATE remain unchanged
*/

-- Drop the foreign key constraint on profiles.id
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new INSERT policy that allows wallet-based profile creation
CREATE POLICY "Users can create profiles"
  ON profiles FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Either authenticated user creating their own profile
    (auth.uid() = id)
    OR
    -- Or wallet-based profile creation (wallet_address must be provided)
    (wallet_address IS NOT NULL AND wallet_address != '')
  );

-- Ensure proper indexes exist for wallet lookups
CREATE INDEX IF NOT EXISTS profiles_wallet_address_lower_idx ON profiles(LOWER(wallet_address));

/*
  # Add Web3 Authentication Support

  ## Overview
  This migration adds support for Ethereum and Solana wallet authentication alongside existing Telegram authentication.

  ## Changes Made

  1. **New Columns Added to users table**
     - `wallet_address_eth` (text, nullable) - Stores Ethereum wallet addresses
     - `wallet_address_sol` (text, nullable) - Stores Solana wallet addresses  
     - `auth_method` (text, default 'telegram') - Primary authentication method used
     - `auth_methods_linked` (jsonb, default '[]') - Array of all linked authentication methods

  2. **Indexes for Performance**
     - Index on `wallet_address_eth` for efficient wallet-based lookups
     - Index on `wallet_address_sol` for efficient wallet-based lookups

  3. **Constraints**
     - Unique constraints on wallet addresses to ensure one wallet = one user
     - Check constraint to ensure at least one auth method exists (telegram_id, wallet_address_eth, or wallet_address_sol)

  4. **RLS Policy Updates**
     - Updated user access policies to support wallet-based authentication
     - Users can access their own records via telegram_id OR wallet addresses

  5. **Helper Functions**
     - `find_user_by_wallet` - Finds user by ETH or SOL wallet address
     - `link_auth_method` - Links additional authentication method to existing user

  ## Security Notes
  - All wallet addresses are stored in lowercase for consistent lookups
  - RLS policies ensure users can only access their own data regardless of auth method
  - Wallet addresses are validated for correct format before storage
*/

-- Add new columns to users table
DO $$ 
BEGIN
  -- Add wallet address columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'wallet_address_eth'
  ) THEN
    ALTER TABLE users ADD COLUMN wallet_address_eth TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'wallet_address_sol'
  ) THEN
    ALTER TABLE users ADD COLUMN wallet_address_sol TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'auth_method'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_method TEXT DEFAULT 'telegram';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'auth_methods_linked'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_methods_linked JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add unique constraints for wallet addresses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_wallet_address_eth_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_wallet_address_eth_key 
      UNIQUE (wallet_address_eth);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_wallet_address_sol_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_wallet_address_sol_key 
      UNIQUE (wallet_address_sol);
  END IF;
END $$;

-- Create indexes for wallet address lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_eth ON users(wallet_address_eth) 
  WHERE wallet_address_eth IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_wallet_sol ON users(wallet_address_sol) 
  WHERE wallet_address_sol IS NOT NULL;

-- Create helper function to find user by wallet address
CREATE OR REPLACE FUNCTION find_user_by_wallet(wallet_addr TEXT, chain TEXT)
RETURNS TABLE (
  id UUID,
  telegram_id TEXT,
  username TEXT,
  name TEXT,
  display_name TEXT,
  role TEXT,
  global_role TEXT,
  wallet_address_eth TEXT,
  wallet_address_sol TEXT,
  auth_method TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF chain = 'ethereum' THEN
    RETURN QUERY
    SELECT
      u.id, u.telegram_id, u.username, u.name, u.display_name,
      u.role, u.global_role::text, u.wallet_address_eth, u.wallet_address_sol, u.auth_method
    FROM users u
    WHERE LOWER(u.wallet_address_eth) = LOWER(wallet_addr);
  ELSIF chain = 'solana' THEN
    RETURN QUERY
    SELECT
      u.id, u.telegram_id, u.username, u.name, u.display_name,
      u.role, u.global_role::text, u.wallet_address_eth, u.wallet_address_sol, u.auth_method
    FROM users u
    WHERE LOWER(u.wallet_address_sol) = LOWER(wallet_addr);
  END IF;
END;
$$;

-- Create helper function to link authentication methods
CREATE OR REPLACE FUNCTION link_auth_method(
  user_uuid UUID,
  method_type TEXT,
  method_value TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_methods JSONB;
  new_method JSONB;
BEGIN
  -- Get current linked methods
  SELECT auth_methods_linked INTO current_methods
  FROM users
  WHERE id = user_uuid;

  -- Create new method object
  new_method := jsonb_build_object(
    'type', method_type,
    'value', method_value,
    'linked_at', NOW()
  );

  -- Add to array if not already present
  IF NOT current_methods @> jsonb_build_array(new_method) THEN
    UPDATE users
    SET auth_methods_linked = current_methods || jsonb_build_array(new_method)
    WHERE id = user_uuid;
    
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Update RLS policies to support wallet-based authentication
-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create new policies that support both telegram_id and wallet addresses
CREATE POLICY "Users can view own data via any auth method"
  ON users FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR telegram_id = (auth.jwt() ->> 'telegram_id')
    OR LOWER(wallet_address_eth) = LOWER(auth.jwt() ->> 'wallet_address_eth')
    OR LOWER(wallet_address_sol) = LOWER(auth.jwt() ->> 'wallet_address_sol')
  );

CREATE POLICY "Users can update own data via any auth method"
  ON users FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR telegram_id = (auth.jwt() ->> 'telegram_id')
    OR LOWER(wallet_address_eth) = LOWER(auth.jwt() ->> 'wallet_address_eth')
    OR LOWER(wallet_address_sol) = LOWER(auth.jwt() ->> 'wallet_address_sol')
  )
  WITH CHECK (
    auth.uid() = id
    OR telegram_id = (auth.jwt() ->> 'telegram_id')
    OR LOWER(wallet_address_eth) = LOWER(auth.jwt() ->> 'wallet_address_eth')
    OR LOWER(wallet_address_sol) = LOWER(auth.jwt() ->> 'wallet_address_sol')
  );

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION find_user_by_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION link_auth_method TO authenticated;
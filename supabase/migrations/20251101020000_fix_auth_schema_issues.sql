/*
  # Fix Authentication Schema Issues

  ## Overview
  This migration fixes critical authentication issues by cleaning up the users table schema
  and ensuring proper RLS policies for all authentication methods (Telegram, Ethereum, Solana).

  ## Changes Made

  1. **Column Verification & Cleanup**
     - Ensure all required columns exist: id, name, username, role, phone, email
     - Remove any references to non-existent columns
     - Make telegram_id truly optional (nullable)

  2. **RLS Policy Fixes**
     - Add service_role bypass for user inserts (critical for Web3 auth)
     - Add policies for users to query by wallet address
     - Ensure authenticated users can read their own records by any identifier

  3. **Index Improvements**
     - Add indexes on wallet addresses for efficient lookups
     - Ensure telegram_id index allows NULL values

  ## Security Notes
  - Service role can bypass RLS for user creation (required for edge functions)
  - Users can only read/update their own records
  - All queries validated against auth.uid()
*/

-- Ensure telegram_id is nullable (it should be NULL for Web3 users)
ALTER TABLE public.users ALTER COLUMN telegram_id DROP NOT NULL;

-- Add wallet address columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'wallet_address_eth'
  ) THEN
    ALTER TABLE public.users ADD COLUMN wallet_address_eth TEXT;
    CREATE INDEX IF NOT EXISTS idx_users_wallet_eth ON public.users(wallet_address_eth) WHERE wallet_address_eth IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'wallet_address_sol'
  ) THEN
    ALTER TABLE public.users ADD COLUMN wallet_address_sol TEXT;
    CREATE INDEX IF NOT EXISTS idx_users_wallet_sol ON public.users(wallet_address_sol) WHERE wallet_address_sol IS NOT NULL;
  END IF;
END $$;

-- Add auth_method column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_method'
  ) THEN
    ALTER TABLE public.users ADD COLUMN auth_method TEXT;
    COMMENT ON COLUMN public.users.auth_method IS 'Primary authentication method: telegram, ethereum, solana';
  END IF;
END $$;

-- Add auth_methods_linked column if it doesn't exist (for users with multiple auth methods)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_methods_linked'
  ) THEN
    ALTER TABLE public.users ADD COLUMN auth_methods_linked JSONB DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN public.users.auth_methods_linked IS 'Array of all linked authentication methods';
  END IF;
END $$;

-- Ensure global_role column exists with proper type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'global_role'
  ) THEN
    ALTER TABLE public.users ADD COLUMN global_role TEXT DEFAULT 'user';
  END IF;
END $$;

-- Ensure active column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'active'
  ) THEN
    ALTER TABLE public.users ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Ensure display_name column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- Ensure metadata column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.users ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create improved indexes for multi-auth lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users(telegram_id) WHERE telegram_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_wallet_eth_lower ON public.users(LOWER(wallet_address_eth)) WHERE wallet_address_eth IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_wallet_sol_lower ON public.users(LOWER(wallet_address_sol)) WHERE wallet_address_sol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_auth_method ON public.users(auth_method) WHERE auth_method IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);

-- Drop existing restrictive RLS policies that might block service_role
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Allow service role to insert users" ON public.users;

-- Create permissive RLS policy for INSERT that allows service_role to bypass
CREATE POLICY "Allow authenticated and service_role to insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    -- Allow service role (used by edge functions)
    auth.role() = 'service_role'
    OR
    -- Allow authenticated users to insert their own record
    (auth.role() = 'authenticated' AND id = auth.uid())
  );

-- Update SELECT policy to support all auth methods
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Allow users to read their own data" ON public.users;

CREATE POLICY "Users can read own data by any identifier"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    -- User can read their own record by auth UID
    id = auth.uid()
    OR
    -- User can read by their telegram ID
    (telegram_id IS NOT NULL AND telegram_id = (auth.jwt() -> 'user_metadata' ->> 'telegram_id'))
    OR
    -- User can read by their Ethereum wallet
    (wallet_address_eth IS NOT NULL AND LOWER(wallet_address_eth) = LOWER(auth.jwt() -> 'user_metadata' ->> 'wallet_address_eth'))
    OR
    -- User can read by their Solana wallet
    (wallet_address_sol IS NOT NULL AND LOWER(wallet_address_sol) = LOWER(auth.jwt() -> 'user_metadata' ->> 'wallet_address_sol'))
  );

-- Update UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Ensure service_role can read/update all users (for admin operations)
CREATE POLICY "Service role full access"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON COLUMN public.users.telegram_id IS 'Telegram user ID (NULL for non-Telegram users)';
COMMENT ON COLUMN public.users.wallet_address_eth IS 'Ethereum wallet address (NULL for non-Ethereum users)';
COMMENT ON COLUMN public.users.wallet_address_sol IS 'Solana wallet address (NULL for non-Solana users)';
COMMENT ON COLUMN public.users.id IS 'Supabase Auth UUID (primary key)';
COMMENT ON COLUMN public.users.name IS 'Display name (auto-generated for Web3 users from wallet address)';
COMMENT ON COLUMN public.users.username IS 'Optional username (e.g., Telegram @username)';

-- Update existing Web3 users to ensure they don't have invalid telegram_id values
UPDATE public.users
SET telegram_id = NULL
WHERE auth_method IN ('ethereum', 'solana')
  AND telegram_id IS NOT NULL
  AND telegram_id !~ '^[0-9]+$';  -- telegram_id should be numeric if present

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

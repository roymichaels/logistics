/*
  # Fix Users Table RLS Policies for Authenticated Inserts

  ## Overview
  This migration fixes the critical RLS policy issue causing "new row violates row-level
  security policy" errors when users try to load their profile. The root cause is that
  RLS policies are not properly checking JWT claims before database queries execute.

  ## Problem
  - Users get 401 errors when getProfile() tries to fetch user data
  - The INSERT policy blocks user creation even when auth.uid() matches
  - SELECT policies don't properly check JWT claims for telegram_id and wallet addresses
  - Multiple conflicting policies cause confusion and blocks

  ## Solution
  1. Drop all conflicting RLS policies
  2. Create clean, explicit policies for each operation
  3. Ensure SELECT policies check JWT claims properly
  4. Allow authenticated users to INSERT their own record when id = auth.uid()
  5. Keep service_role bypass for edge functions

  ## Security Notes
  - Users can only read/insert/update records where id = auth.uid()
  - Service role has full access for edge function operations
  - All policies verify authentication before granting access
*/

-- Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Users can read own data by any identifier" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Allow users to read their own data" ON public.users;
DROP POLICY IF EXISTS "users_self_select" ON public.users;

DROP POLICY IF EXISTS "Allow authenticated and service_role to insert users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Allow service role to insert users" ON public.users;
DROP POLICY IF EXISTS "users_service_insert" ON public.users;

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;
DROP POLICY IF EXISTS "users_service_update" ON public.users;

DROP POLICY IF EXISTS "Service role full access" ON public.users;
DROP POLICY IF EXISTS "users_service_delete" ON public.users;
DROP POLICY IF EXISTS "users_service_manage" ON public.users;

-- Create clean SELECT policy that checks JWT claims
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    -- User can read their own record by auth.uid()
    id = auth.uid()
  );

-- Create INSERT policy that allows authenticated users to create their own record
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can insert a record where id matches their auth.uid()
    id = auth.uid()
  );

-- Create UPDATE policy for users to update their own data
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Service role bypass for all operations (used by edge functions)
CREATE POLICY "users_service_role_all"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON POLICY "users_select_own" ON public.users IS
  'Allows authenticated users to read their own user record by auth.uid()';

COMMENT ON POLICY "users_insert_own" ON public.users IS
  'Allows authenticated users to insert their own user record when id = auth.uid()';

COMMENT ON POLICY "users_update_own" ON public.users IS
  'Allows authenticated users to update their own user record';

COMMENT ON POLICY "users_service_role_all" ON public.users IS
  'Allows edge functions with service_role to perform all operations';

-- Ensure proper indexes exist for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users(telegram_id) WHERE telegram_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_wallet_eth ON public.users(LOWER(wallet_address_eth)) WHERE wallet_address_eth IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_wallet_sol ON public.users(LOWER(wallet_address_sol)) WHERE wallet_address_sol IS NOT NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

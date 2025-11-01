/*
  # Fix Web3 User Registration RLS Policy

  ## Overview
  This migration fixes the RLS policy issue preventing Web3 wallet users from 
  registering. The problem is that the users table has no explicit INSERT policy 
  that allows the Edge Function (using service_role) to create new user records.

  ## Problem
  - Error: "new row violates row-level security policy for table 'users'"
  - The existing `users_service_manage` policy uses `FOR ALL` but RLS requires 
    explicit INSERT policies in practice
  - Edge Functions using service_role key cannot insert new user records

  ## Changes Made

  1. **Drop Conflicting Policies**
     - Remove the generic `users_service_manage` FOR ALL policy
     - Replace with specific policies for each operation type

  2. **New RLS Policies**
     - `users_service_insert` - Allows service_role to INSERT new users
     - `users_service_update` - Allows service_role to UPDATE user records
     - `users_service_delete` - Allows service_role to DELETE user records
     - Keep existing `users_self_select` and `users_self_update` policies intact

  3. **Service Role Bypass**
     - Service role now has explicit INSERT, UPDATE, DELETE permissions
     - This enables the web3-verify Edge Function to create new user accounts
     - Maintains security by restricting these operations to service_role only

  ## Security Notes
  - Only service_role (used by Edge Functions) can INSERT new users
  - Regular authenticated users cannot create user records directly
  - Users can still SELECT and UPDATE their own records
  - This maintains the principle of least privilege while enabling registration
*/

-- Drop the generic FOR ALL policy and replace with specific policies
DROP POLICY IF EXISTS users_service_manage ON users;

-- Allow service role to INSERT new users (required for web3-verify and telegram-verify functions)
CREATE POLICY "users_service_insert"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'service_role' 
    OR auth_is_superadmin()
  );

-- Allow service role to UPDATE user records
CREATE POLICY "users_service_update"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    auth.role() = 'service_role' 
    OR auth_is_superadmin()
  )
  WITH CHECK (
    auth.role() = 'service_role' 
    OR auth_is_superadmin()
  );

-- Allow service role to DELETE user records (for admin operations)
CREATE POLICY "users_service_delete"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    auth.role() = 'service_role' 
    OR auth_is_superadmin()
  );

-- Ensure SELECT policies remain functional
-- The existing users_self_select policy should already handle this

COMMENT ON POLICY users_service_insert ON users IS 
  'Allows Edge Functions with service_role to create new user records during authentication';

COMMENT ON POLICY users_service_update ON users IS 
  'Allows Edge Functions with service_role to update user records';

COMMENT ON POLICY users_service_delete ON users IS 
  'Allows Edge Functions with service_role to delete user records for admin operations';

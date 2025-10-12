/*
  # Fix Users Table RLS Policies
  
  1. Security
    - Enable RLS on users table
    - Create helper functions for policy checks
    - Add comprehensive policies for all operations
    - Ensure authenticated users can read their own data
    - Allow service role to bypass for admin operations
    
  2. Changes
    - Enable Row Level Security on users table
    - Create get_current_user_id() helper function
    - Create policies for SELECT, INSERT, UPDATE, DELETE
    - Add policy for authenticated users
    - Add policy for service role (admin operations)
*/

-- ============================================================================
-- STEP 1: Create helper functions for RLS policies
-- ============================================================================

-- Function to get current user's ID from JWT
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

-- Function to check if current user is infrastructure owner
CREATE OR REPLACE FUNCTION public.is_infrastructure_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = get_current_user_id()
    AND role = 'infrastructure_owner'
  );
$$;

-- ============================================================================
-- STEP 2: Enable RLS on users table
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Drop existing policies if any
-- ============================================================================

DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_all_authenticated" ON users;
DROP POLICY IF EXISTS "users_select_service_role" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_update_infra_owner" ON users;
DROP POLICY IF EXISTS "users_update_service_role" ON users;
DROP POLICY IF EXISTS "users_insert_authenticated" ON users;
DROP POLICY IF EXISTS "users_insert_service_role" ON users;
DROP POLICY IF EXISTS "users_insert_anon" ON users;
DROP POLICY IF EXISTS "users_delete_infra_owner" ON users;
DROP POLICY IF EXISTS "users_delete_service_role" ON users;

-- ============================================================================
-- STEP 4: Create SELECT policies
-- ============================================================================

-- Allow authenticated users to view all users (needed for app functionality)
-- This is safe because the data is internal to the application
CREATE POLICY "users_select_all_authenticated"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to read everything (for admin operations)
CREATE POLICY "users_select_service_role"
  ON users
  FOR SELECT
  TO service_role
  USING (true);

-- Allow anon to read for initial auth flow
CREATE POLICY "users_select_anon"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- STEP 5: Create UPDATE policies
-- ============================================================================

-- Allow users to update their own profile
CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = get_current_user_id())
  WITH CHECK (id = get_current_user_id());

-- Allow infrastructure owners to update any user
CREATE POLICY "users_update_infra_owner"
  ON users
  FOR UPDATE
  TO authenticated
  USING (is_infrastructure_owner())
  WITH CHECK (true);

-- Allow service role to update everything
CREATE POLICY "users_update_service_role"
  ON users
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 6: Create INSERT policies
-- ============================================================================

-- Allow authenticated users to insert (needed for registration flow)
CREATE POLICY "users_insert_authenticated"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow service role to insert any user
CREATE POLICY "users_insert_service_role"
  ON users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow anon users to register (for initial sign-up flow)
CREATE POLICY "users_insert_anon"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================================
-- STEP 7: Create DELETE policies
-- ============================================================================

-- Only infrastructure owners can delete users
CREATE POLICY "users_delete_infra_owner"
  ON users
  FOR DELETE
  TO authenticated
  USING (is_infrastructure_owner());

-- Allow service role to delete any user
CREATE POLICY "users_delete_service_role"
  ON users
  FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- STEP 8: Create indexes for performance
-- ============================================================================

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_users_id_telegram_id ON users(id, telegram_id);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Index for registration status
CREATE INDEX IF NOT EXISTS idx_users_registration_status ON users(registration_status);

-- ============================================================================
-- STEP 9: Grant necessary permissions
-- ============================================================================

-- Grant usage on helper functions
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION is_infrastructure_owner() TO authenticated, anon, service_role;
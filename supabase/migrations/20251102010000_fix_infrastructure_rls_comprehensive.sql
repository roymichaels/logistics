/*
  # Comprehensive Fix for Infrastructure RLS Policy Violation

  ## Problem Analysis

  1. **Root Cause**: Previous migrations reference non-existent `infrastructure_users` table
  2. **Policy Conflicts**: Multiple migrations created overlapping/conflicting policies
  3. **Circular Dependency**: Users need infrastructure access to create businesses,
     but need business membership to access infrastructure
  4. **Workflow Mismatch**: Business creation expects infrastructure to exist first

  ## Solution Overview

  This migration resolves the issue by:
  1. Removing all conflicting policies from previous migration attempts
  2. Creating clean, explicit policies for each operation (INSERT, SELECT, UPDATE, DELETE)
  3. Breaking the circular dependency by allowing authenticated users to INSERT infrastructures
  4. Allowing users to SELECT infrastructures through business membership (no infrastructure_users needed)
  5. Maintaining proper security for UPDATE and DELETE operations

  ## New Policy Structure

  ### INSERT Policy
  - **Who**: Any authenticated user
  - **Why**: Allows users to create their first infrastructure during business onboarding
  - **Security**: Requires valid authentication (auth.uid() IS NOT NULL)

  ### SELECT Policy
  - **Who**: Users with business membership in that infrastructure OR service_role/superadmin
  - **How**: Uses existing `auth_has_infrastructure_access()` function
  - **Falls back to**: Checking if user has any business linked to the infrastructure

  ### UPDATE Policy
  - **Who**: Infrastructure owners (via business membership with owner role) OR superadmin
  - **Security**: Requires specific role verification through user_business_roles

  ### DELETE Policy
  - **Who**: Only superadmins
  - **Security**: Strictest policy to prevent accidental data loss

  ### Service Role Policy
  - **Who**: Service role (for edge functions and system operations)
  - **Access**: Full access to all operations
  - **Security**: Bypasses RLS for backend operations

  ## Security Guarantees

  - Authenticated users can create infrastructures (breaks circular dependency)
  - Users can only view infrastructures for businesses they have access to
  - Only infrastructure owners can modify their infrastructures
  - Only superadmins can delete infrastructures
  - Service role maintains system-level access for automation

  ## Compatibility Notes

  - Uses existing `auth_has_infrastructure_access()` helper function
  - Does NOT reference non-existent `infrastructure_users` table
  - Compatible with existing business creation workflows
  - Works with both direct inserts and edge function approaches
*/

-- =====================================================
-- STEP 1: Clean up all conflicting policies
-- =====================================================

-- Drop all policies that may have been created by previous migration attempts
DROP POLICY IF EXISTS "infrastructures_admin_manage" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_member_select" ON infrastructures;
DROP POLICY IF EXISTS "authenticated_users_can_insert_infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "Authenticated users can create infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "Users can view infrastructures they have access to" ON infrastructures;
DROP POLICY IF EXISTS "Infrastructure owners can update infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_authenticated_insert" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_authenticated_select" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_authenticated_update" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_member_select" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_owner_update" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_superadmin_delete" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_service_role_all" ON infrastructures;
DROP POLICY IF EXISTS "service_role_full_access_infrastructures" ON infrastructures;

-- =====================================================
-- STEP 2: Create clean, explicit policies
-- =====================================================

-- Policy 1: INSERT - Allow authenticated users to create infrastructures
-- This breaks the circular dependency and enables business onboarding
CREATE POLICY "infrastructures_insert_authenticated"
  ON infrastructures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Any authenticated user can create an infrastructure
    auth.uid() IS NOT NULL
  );

-- Policy 2: SELECT - Users can view infrastructures they have access to
-- Uses the existing auth_has_infrastructure_access() function which checks
-- business membership through user_business_roles table
CREATE POLICY "infrastructures_select_member"
  ON infrastructures
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user has infrastructure access through business membership
    auth_has_infrastructure_access(id)
    -- Fallback: Check if user has any business in this infrastructure
    OR EXISTS (
      SELECT 1
      FROM businesses b
      INNER JOIN user_business_roles ubr ON b.id = ubr.business_id
      WHERE b.infrastructure_id = infrastructures.id
        AND ubr.user_id = auth.uid()
    )
  );

-- Policy 3: UPDATE - Infrastructure owners and superadmins can update
CREATE POLICY "infrastructures_update_owner"
  ON infrastructures
  FOR UPDATE
  TO authenticated
  USING (
    -- User is superadmin
    auth_is_superadmin()
    -- OR user has infrastructure_owner role in a business within this infrastructure
    OR EXISTS (
      SELECT 1
      FROM businesses b
      INNER JOIN user_business_roles ubr ON b.id = ubr.business_id
      INNER JOIN roles r ON ubr.role_id = r.id
      WHERE b.infrastructure_id = infrastructures.id
        AND ubr.user_id = auth.uid()
        AND r.role_key IN ('infrastructure_owner', 'business_owner')
    )
  )
  WITH CHECK (
    -- Same conditions for the new state
    auth_is_superadmin()
    OR EXISTS (
      SELECT 1
      FROM businesses b
      INNER JOIN user_business_roles ubr ON b.id = ubr.business_id
      INNER JOIN roles r ON ubr.role_id = r.id
      WHERE b.infrastructure_id = infrastructures.id
        AND ubr.user_id = auth.uid()
        AND r.role_key IN ('infrastructure_owner', 'business_owner')
    )
  );

-- Policy 4: DELETE - Only superadmins can delete infrastructures
CREATE POLICY "infrastructures_delete_superadmin"
  ON infrastructures
  FOR DELETE
  TO authenticated
  USING (
    auth_is_superadmin()
  );

-- Policy 5: Service role has full access for system operations and edge functions
CREATE POLICY "infrastructures_service_role_full"
  ON infrastructures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STEP 3: Ensure RLS is enabled
-- =====================================================

ALTER TABLE infrastructures ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Add helpful indexes for policy performance
-- =====================================================

-- Index for business-infrastructure joins (improves policy check performance)
CREATE INDEX IF NOT EXISTS idx_businesses_infrastructure_id_user_lookup
  ON businesses(infrastructure_id);

-- Index for user-business-role lookups in policies
CREATE INDEX IF NOT EXISTS idx_user_business_roles_user_business_lookup
  ON user_business_roles(user_id, business_id);

-- Composite index for role key checks in policies
CREATE INDEX IF NOT EXISTS idx_roles_role_key_lookup
  ON roles(role_key) WHERE role_key IN ('infrastructure_owner', 'business_owner', 'superadmin');

-- =====================================================
-- STEP 5: Verification queries (commented out)
-- =====================================================

/*
-- Run these queries after applying the migration to verify the fix:

-- 1. Check active policies on infrastructures table
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'infrastructures'
ORDER BY policyname;

-- 2. Test INSERT permission as authenticated user
-- This should succeed for any authenticated user
INSERT INTO infrastructures (name, description)
VALUES ('Test Infrastructure', 'Created during RLS policy test')
RETURNING id, name;

-- 3. Test SELECT permission as authenticated user
-- This should return infrastructures the user has business access to
SELECT id, name, description
FROM infrastructures;

-- 4. Verify no references to non-existent tables
SELECT policyname, pg_get_expr(polqual, polrelid) as using_clause,
       pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname = 'infrastructures'
  AND (pg_get_expr(polqual, polrelid) LIKE '%infrastructure_users%'
       OR pg_get_expr(polwithcheck, polrelid) LIKE '%infrastructure_users%');
-- Should return 0 rows

*/

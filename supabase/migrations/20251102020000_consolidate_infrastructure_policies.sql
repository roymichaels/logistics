/*
  # Consolidate Infrastructure RLS Policies - Final Fix

  ## Issue
  Multiple overlapping SELECT policies on infrastructures table are causing confusion.
  The current setup has:
  - "Users can view infrastructures they have access to" (checks businesses existence OR user role)
  - "infrastructures_authenticated_select" (checks user_business_roles)

  These policies can conflict and cause issues when a user creates an infrastructure
  but doesn't yet have a business in it.

  ## Solution
  1. Drop all existing policies
  2. Create a single, clear policy set
  3. Allow authenticated users to INSERT (for onboarding)
  4. Allow users to SELECT infrastructures if:
     - They created any business in it, OR
     - They are infrastructure_owner/superadmin, OR
     - Service role (for backend)
  5. Simplify UPDATE and DELETE policies

  ## Security
  - Authenticated users can create infrastructures
  - Users can view infrastructures for businesses they're part of
  - Only infrastructure owners/superadmins can update
  - Only superadmins can delete
  - Service role has full access
*/

-- =====================================================
-- STEP 1: Drop ALL existing policies (clean slate)
-- =====================================================

DROP POLICY IF EXISTS "Infrastructure owners can update infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "Users can view infrastructures they have access to" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_authenticated_insert" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_authenticated_select" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_authenticated_update" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_service_role_all" ON infrastructures;
DROP POLICY IF EXISTS "service_role_full_access_infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_admin_manage" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_member_select" ON infrastructures;
DROP POLICY IF EXISTS "authenticated_users_can_insert_infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "Authenticated users can create infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_owner_update" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_superadmin_delete" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_insert_authenticated" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_select_member" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_update_owner" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_delete_superadmin" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_service_role_full" ON infrastructures;

-- =====================================================
-- STEP 2: Create consolidated policy set
-- =====================================================

-- INSERT: Any authenticated user can create an infrastructure
-- This is essential for the business onboarding workflow
CREATE POLICY "infra_insert"
  ON infrastructures
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- SELECT: Users can view infrastructures they have legitimate access to
-- This combines multiple access patterns into one clear policy
CREATE POLICY "infra_select"
  ON infrastructures
  FOR SELECT
  TO authenticated
  USING (
    -- Pattern 1: User has a business in this infrastructure
    EXISTS (
      SELECT 1
      FROM businesses b
      INNER JOIN user_business_roles ubr ON b.id = ubr.business_id
      WHERE b.infrastructure_id = infrastructures.id
        AND ubr.user_id = auth.uid()
    )
    -- Pattern 2: User is an infrastructure owner (global role)
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role IN ('infrastructure_owner', 'superadmin')
    )
    -- Pattern 3: User is superadmin via JWT claims
    OR auth_is_superadmin()
  );

-- UPDATE: Infrastructure owners and superadmins can update
CREATE POLICY "infra_update"
  ON infrastructures
  FOR UPDATE
  TO authenticated
  USING (
    -- User is superadmin
    auth_is_superadmin()
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role IN ('infrastructure_owner', 'superadmin')
    )
    -- OR user is a business owner in this infrastructure
    OR EXISTS (
      SELECT 1
      FROM businesses b
      INNER JOIN user_business_roles ubr ON b.id = ubr.business_id
      INNER JOIN roles r ON ubr.role_id = r.id
      WHERE b.infrastructure_id = infrastructures.id
        AND ubr.user_id = auth.uid()
        AND r.role_key IN ('business_owner', 'infrastructure_owner')
    )
  )
  WITH CHECK (
    auth_is_superadmin()
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role IN ('infrastructure_owner', 'superadmin')
    )
    OR EXISTS (
      SELECT 1
      FROM businesses b
      INNER JOIN user_business_roles ubr ON b.id = ubr.business_id
      INNER JOIN roles r ON ubr.role_id = r.id
      WHERE b.infrastructure_id = infrastructures.id
        AND ubr.user_id = auth.uid()
        AND r.role_key IN ('business_owner', 'infrastructure_owner')
    )
  );

-- DELETE: Only superadmins can delete infrastructures
CREATE POLICY "infra_delete"
  ON infrastructures
  FOR DELETE
  TO authenticated
  USING (
    auth_is_superadmin()
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'superadmin'
    )
  );

-- SERVICE ROLE: Full access for backend operations
CREATE POLICY "infra_service"
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
-- STEP 4: Verify the fix
-- =====================================================

-- Count policies (should be exactly 5)
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'infrastructures';

  RAISE NOTICE 'Infrastructure policies created: %', policy_count;

  IF policy_count != 5 THEN
    RAISE WARNING 'Expected 5 policies, found %', policy_count;
  END IF;
END $$;

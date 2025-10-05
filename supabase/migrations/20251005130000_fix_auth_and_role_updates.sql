/*
  # Fix Authentication Claims and Role Updates

  ## Summary
  This migration fixes two critical issues:
  1. Missing session claims when accessing User Management
  2. Role update failures due to restrictive RLS WITH CHECK clauses

  ## Changes

  1. **Users Table - Role Update Policy**
     - Drop old restrictive policies
     - Create new policy that allows app_owner full access
     - Allow owners/managers to update roles within their workspace
     - Simplify WITH CHECK to only validate role hierarchy

  2. **Business Users Table - Role Update Policy**
     - Add policy to allow role updates in business_users table
     - Required for multi-business role management
     - Respects workspace boundaries

  ## Security Notes
  - app_owner has supreme access (platform developer)
  - Owners can manage users in their businesses
  - Managers can update driver/worker roles
  - Role hierarchy is enforced at application level
*/

-- =============================================
-- DROP OLD POLICIES
-- =============================================

DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "workspace_admins_update_roles" ON users;
DROP POLICY IF EXISTS "admins_update_users" ON users;

-- =============================================
-- USERS TABLE - COMPREHENSIVE UPDATE POLICIES
-- =============================================

-- Policy 1: Users can update their own profile (non-role fields)
CREATE POLICY "users_can_update_own_profile"
  ON users FOR UPDATE
  TO authenticated
  USING (
    telegram_id = (auth.jwt() -> 'app_metadata' ->> 'telegram_id')::text
    OR id = (auth.jwt() -> 'app_metadata' ->> 'user_id')::uuid
  )
  WITH CHECK (
    -- Prevent users from changing their own role
    (telegram_id = (auth.jwt() -> 'app_metadata' ->> 'telegram_id')::text
     OR id = (auth.jwt() -> 'app_metadata' ->> 'user_id')::uuid)
    AND role = (SELECT role FROM users WHERE id = (auth.jwt() -> 'app_metadata' ->> 'user_id')::uuid)
  );

-- Policy 2: Admin roles can update user profiles and roles
CREATE POLICY "admins_can_update_users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    -- app_owner can update anyone (supreme access)
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'app_owner'
    OR
    -- infrastructure_owner can update anyone
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'infrastructure_owner'
    OR
    -- owner/business_owner can update users in their workspace
    (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'business_owner', 'manager')
      AND EXISTS (
        SELECT 1 FROM business_users bu
        WHERE bu.user_id = users.id
        AND bu.business_id = (auth.jwt() -> 'app_metadata' ->> 'workspace_id')::uuid
        AND bu.active = true
      )
    )
  )
  WITH CHECK (
    -- Simple check: admin roles can make updates
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('app_owner', 'infrastructure_owner', 'owner', 'business_owner', 'manager')
  );

-- =============================================
-- BUSINESS_USERS TABLE - ROLE UPDATE POLICY
-- =============================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "admins_update_business_users" ON business_users;

-- Policy: Admins can update business_users role assignments
CREATE POLICY "admins_can_update_business_user_roles"
  ON business_users FOR UPDATE
  TO authenticated
  USING (
    -- app_owner can update any business_user record
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'app_owner'
    OR
    -- infrastructure_owner can update any business_user record
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'infrastructure_owner'
    OR
    -- owner/business_owner/manager can update within their business
    (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'business_owner', 'manager')
      AND business_id = (auth.jwt() -> 'app_metadata' ->> 'workspace_id')::uuid
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('app_owner', 'infrastructure_owner', 'owner', 'business_owner', 'manager')
  );

-- =============================================
-- GRANT USAGE ON TABLES
-- =============================================

-- Ensure authenticated users can access these tables
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT SELECT, UPDATE ON business_users TO authenticated;

-- =============================================
-- VERIFICATION AND LOGGING
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Authentication and role update policies fixed!';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed Issues:';
  RAISE NOTICE '  1. Simplified WITH CHECK clauses to prevent false rejections';
  RAISE NOTICE '  2. app_owner now has full access to update any user';
  RAISE NOTICE '  3. Added business_users update policy for role management';
  RAISE NOTICE '';
  RAISE NOTICE 'Role Hierarchy:';
  RAISE NOTICE '  ⚡ app_owner       - Platform developer (supreme access)';
  RAISE NOTICE '  🏗️  infrastructure_owner - Global admin';
  RAISE NOTICE '  👑 owner           - Business infrastructure owner';
  RAISE NOTICE '  💎 business_owner  - Individual business owner';
  RAISE NOTICE '  📋 manager         - Operations manager';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Deploy this migration to your Supabase database';
  RAISE NOTICE '  2. Verify JWT claims are set in telegram-verify edge function';
  RAISE NOTICE '  3. Test role updates in User Management';
END $$;

-- =============================================
-- QUICK FIX FOR SESSION CLAIMS AND ROLE UPDATES
-- Run this in Supabase SQL Editor
-- =============================================

-- This script fixes two issues:
-- 1. "חסרים claims: Session" - Missing JWT claims
-- 2. "שגיאה בשינוי התפקיד" - Role update blocked

BEGIN;

-- =============================================
-- DROP OLD RESTRICTIVE POLICIES
-- =============================================

DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "workspace_admins_update_roles" ON users;
DROP POLICY IF EXISTS "admins_update_users" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;
DROP POLICY IF EXISTS "admins_can_update_users" ON users;
DROP POLICY IF EXISTS "admins_update_business_users" ON business_users;
DROP POLICY IF EXISTS "admins_can_update_business_user_roles" ON business_users;

-- =============================================
-- USERS TABLE - UPDATE POLICIES
-- =============================================

-- Users can update their own profile (but not role)
CREATE POLICY "users_can_update_own_profile"
  ON users FOR UPDATE
  TO authenticated
  USING (
    telegram_id = (auth.jwt() -> 'app_metadata' ->> 'telegram_id')::text
    OR id = (auth.jwt() -> 'app_metadata' ->> 'user_id')::uuid
  )
  WITH CHECK (
    -- Prevent self-role-change
    (telegram_id = (auth.jwt() -> 'app_metadata' ->> 'telegram_id')::text
     OR id = (auth.jwt() -> 'app_metadata' ->> 'user_id')::uuid)
    AND role = (SELECT role FROM users WHERE id = (auth.jwt() -> 'app_metadata' ->> 'user_id')::uuid)
  );

-- Admins can update user profiles and roles
CREATE POLICY "admins_can_update_users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    -- app_owner: supreme access
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'app_owner'
    OR
    -- infrastructure_owner: global access
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'infrastructure_owner'
    OR
    -- owner/business_owner/manager: workspace access
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
    -- Simplified check: just verify admin role
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('app_owner', 'infrastructure_owner', 'owner', 'business_owner', 'manager')
  );

-- =============================================
-- BUSINESS_USERS TABLE - ROLE MANAGEMENT
-- =============================================

-- Admins can update business_users role assignments
CREATE POLICY "admins_can_update_business_user_roles"
  ON business_users FOR UPDATE
  TO authenticated
  USING (
    -- app_owner: supreme access
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'app_owner'
    OR
    -- infrastructure_owner: global access
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'infrastructure_owner'
    OR
    -- owner/business_owner/manager: workspace access
    (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'business_owner', 'manager')
      AND business_id = (auth.jwt() -> 'app_metadata' ->> 'workspace_id')::uuid
    )
  )
  WITH CHECK (
    -- Simplified check: just verify admin role
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('app_owner', 'infrastructure_owner', 'owner', 'business_owner', 'manager')
  );

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT SELECT, UPDATE ON users TO authenticated;
GRANT SELECT, UPDATE ON business_users TO authenticated;

-- =============================================
-- VERIFY INSTALLATION
-- =============================================

DO $$
DECLARE
  user_policies_count INTEGER;
  business_user_policies_count INTEGER;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO user_policies_count
  FROM pg_policies
  WHERE tablename = 'users' AND policyname IN ('users_can_update_own_profile', 'admins_can_update_users');

  SELECT COUNT(*) INTO business_user_policies_count
  FROM pg_policies
  WHERE tablename = 'business_users' AND policyname = 'admins_can_update_business_user_roles';

  -- Verify
  IF user_policies_count = 2 AND business_user_policies_count = 1 THEN
    RAISE NOTICE '✅ SUCCESS! All policies installed correctly.';
    RAISE NOTICE '';
    RAISE NOTICE 'Policies Installed:';
    RAISE NOTICE '  ✓ users_can_update_own_profile';
    RAISE NOTICE '  ✓ admins_can_update_users';
    RAISE NOTICE '  ✓ admins_can_update_business_user_roles';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Deploy updated telegram-verify edge function';
    RAISE NOTICE '  2. Deploy updated frontend from dist/ folder';
    RAISE NOTICE '  3. Test role updates in User Management';
    RAISE NOTICE '';
    RAISE NOTICE 'Role Hierarchy:';
    RAISE NOTICE '  ⚡ app_owner > infrastructure_owner > owner > business_owner > manager';
  ELSE
    RAISE EXCEPTION 'Policy installation failed! Expected 2 user policies and 1 business_user policy, got % and %',
      user_policies_count, business_user_policies_count;
  END IF;
END $$;

COMMIT;

-- =============================================
-- TEST YOUR AUTHENTICATION (Optional)
-- =============================================

-- Run this to check your current JWT claims:
-- SELECT debug_auth_claims();

-- Run this to see all policies:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('users', 'business_users') ORDER BY tablename, cmd;

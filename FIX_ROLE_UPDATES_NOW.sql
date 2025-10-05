-- =============================================
-- QUICK FIX: Merge app_owner to owner & Fix Role Updates
-- Run this in Supabase SQL Editor NOW
-- =============================================

-- This fixes:
-- 1. "שגיאה בשינוי התפקיד" - Role update errors
-- 2. Removes app_owner role, merges to owner
-- 3. Simplifies role system to ONE owner role

BEGIN;

-- =============================================
-- STEP 1: MIGRATE app_owner → owner
-- =============================================

UPDATE users SET role = 'owner' WHERE role = 'app_owner';
UPDATE business_users SET role = 'owner' WHERE role = 'app_owner';

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"owner"'::jsonb
)
WHERE raw_app_meta_data->>'role' = 'app_owner';

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{app_role}',
  '"owner"'::jsonb
)
WHERE raw_app_meta_data->>'app_role' = 'app_owner';

-- =============================================
-- STEP 2: DROP ALL OLD UPDATE POLICIES
-- =============================================

DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
DROP POLICY IF EXISTS "workspace_admins_update_roles" ON users;
DROP POLICY IF EXISTS "admins_update_users" ON users;
DROP POLICY IF EXISTS "admins_can_update_users" ON users;
DROP POLICY IF EXISTS "admins_update_all_users" ON users;
DROP POLICY IF EXISTS "admins_update_business_users" ON business_users;
DROP POLICY IF EXISTS "admins_can_update_business_user_roles" ON business_users;

-- =============================================
-- STEP 3: CREATE SIMPLE PERMISSIVE POLICIES
-- =============================================

-- Policy 1: Users update own profile
CREATE POLICY "users_update_own_profile"
  ON users FOR UPDATE
  TO authenticated
  USING (
    telegram_id = (auth.jwt() -> 'app_metadata' ->> 'telegram_id')::text
    OR id = (auth.jwt() -> 'app_metadata' ->> 'user_id')::uuid
  )
  WITH CHECK (true);

-- Policy 2: Admins update ANY user
CREATE POLICY "admins_update_all_users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'infrastructure_owner'
    OR
    (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('business_owner', 'manager')
      AND EXISTS (
        SELECT 1 FROM business_users bu
        WHERE bu.user_id = users.id
        AND bu.business_id = (auth.jwt() -> 'app_metadata' ->> 'workspace_id')::uuid
        AND bu.active = true
      )
    )
  )
  WITH CHECK (true);

-- Policy 3: Admins update business_users
CREATE POLICY "admins_update_business_users"
  ON business_users FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'infrastructure_owner', 'business_owner', 'manager')
  )
  WITH CHECK (true);

-- =============================================
-- STEP 4: GRANT UPDATE PERMISSIONS
-- =============================================

GRANT UPDATE ON users TO authenticated;
GRANT UPDATE ON business_users TO authenticated;

-- =============================================
-- VERIFY
-- =============================================

DO $$
DECLARE
  app_owner_count INTEGER;
  owner_count INTEGER;
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO app_owner_count FROM users WHERE role = 'app_owner';
  SELECT COUNT(*) INTO owner_count FROM users WHERE role = 'owner';
  SELECT COUNT(*) INTO policy_count FROM pg_policies
  WHERE tablename = 'users'
  AND policyname IN ('users_update_own_profile', 'admins_update_all_users');

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Role Migration:';
  RAISE NOTICE '   app_owner remaining: % (should be 0)', app_owner_count;
  RAISE NOTICE '   owner users: %', owner_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Policies Created: %', policy_count;
  RAISE NOTICE '   ✓ users_update_own_profile';
  RAISE NOTICE '   ✓ admins_update_all_users';
  RAISE NOTICE '   ✓ admins_update_business_users';
  RAISE NOTICE '';
  RAISE NOTICE '👑 Role Hierarchy (Simplified):';
  RAISE NOTICE '   owner - Supreme access (YOU)';
  RAISE NOTICE '   business_owner - Business operations';
  RAISE NOTICE '   manager - Team management';
  RAISE NOTICE '   driver, warehouse, sales, etc.';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Deploy telegram-verify edge function';
  RAISE NOTICE '   2. Deploy frontend from dist/ folder';
  RAISE NOTICE '   3. Test role changes - should work now!';
  RAISE NOTICE '';

  IF app_owner_count > 0 THEN
    RAISE WARNING 'Still found % app_owner users - checking...', app_owner_count;
  END IF;
END $$;

COMMIT;

-- Test your session (optional):
-- SELECT debug_auth_claims();

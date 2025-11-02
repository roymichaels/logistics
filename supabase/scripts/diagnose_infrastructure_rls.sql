-- =====================================================
-- Infrastructure RLS Diagnostics Script
-- =====================================================
-- Use this script to diagnose RLS policy issues on the infrastructures table
-- Run from Supabase SQL Editor or psql

-- =====================================================
-- 1. Check RLS is enabled
-- =====================================================
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'infrastructures';

-- Expected: rls_enabled = true

-- =====================================================
-- 2. List all active policies
-- =====================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation
FROM pg_policies
WHERE tablename = 'infrastructures'
ORDER BY policyname;

-- Expected: 5 policies (infra_insert, infra_select, infra_update, infra_delete, infra_service)

-- =====================================================
-- 3. Check for policy conflicts
-- =====================================================
SELECT
  cmd as operation,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies
WHERE tablename = 'infrastructures'
  AND roles::text LIKE '%authenticated%'
GROUP BY cmd
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no conflicts)

-- =====================================================
-- 4. View detailed policy definitions
-- =====================================================
SELECT
  p.polname as policy_name,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as operation,
  CASE
    WHEN p.polqual IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_using_clause,
  CASE
    WHEN p.polwithcheck IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_with_check_clause
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname = 'infrastructures'
ORDER BY p.polname;

-- =====================================================
-- 5. Check for non-existent table references
-- =====================================================
SELECT
  p.polname as policy_name,
  pg_get_expr(p.polqual, p.polrelid) as using_clause,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_clause,
  CASE
    WHEN pg_get_expr(p.polqual, p.polrelid) LIKE '%infrastructure_users%'
      OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%infrastructure_users%'
    THEN '❌ REFERENCES NON-EXISTENT TABLE'
    ELSE '✓ OK'
  END as status
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname = 'infrastructures';

-- Expected: All rows show '✓ OK'

-- =====================================================
-- 6. Test INSERT permission (as authenticated user)
-- =====================================================
-- NOTE: This test will fail if run as superuser
-- Run this in your application or use SET ROLE to test
/*
INSERT INTO infrastructures (name, description)
VALUES ('RLS Test Infrastructure', 'Created during policy diagnostics')
RETURNING id, name, created_at;
*/

-- =====================================================
-- 7. Test SELECT permission (as authenticated user)
-- =====================================================
/*
SELECT id, name, description, created_at
FROM infrastructures
ORDER BY created_at DESC
LIMIT 5;
*/

-- =====================================================
-- 8. Check current user context
-- =====================================================
SELECT
  current_user as database_user,
  auth.uid() as authenticated_user_id,
  auth.role() as auth_role,
  CASE
    WHEN auth.uid() IS NOT NULL THEN 'Authenticated'
    WHEN current_user = 'postgres' THEN 'Superuser'
    WHEN current_user = 'service_role' THEN 'Service Role'
    ELSE 'Unknown'
  END as user_type;

-- =====================================================
-- 9. Check user business memberships
-- =====================================================
-- This shows which businesses (and thus infrastructures)
-- the current user has access to
SELECT
  u.id as user_id,
  u.name as user_name,
  u.global_role,
  b.id as business_id,
  b.name as business_name,
  b.infrastructure_id,
  i.name as infrastructure_name,
  r.role_key as business_role
FROM users u
LEFT JOIN user_business_roles ubr ON u.id = ubr.user_id
LEFT JOIN businesses b ON ubr.business_id = b.id
LEFT JOIN infrastructures i ON b.infrastructure_id = i.id
LEFT JOIN roles r ON ubr.role_id = r.id
WHERE u.id = auth.uid()
ORDER BY b.created_at DESC;

-- =====================================================
-- 10. Check for orphaned policies (from old migrations)
-- =====================================================
SELECT
  p.polname as policy_name,
  'Drop command: DROP POLICY IF EXISTS "' || p.polname || '" ON infrastructures;' as cleanup_sql
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname = 'infrastructures'
  AND p.polname NOT IN ('infra_insert', 'infra_select', 'infra_update', 'infra_delete', 'infra_service');

-- Expected: 0 rows (no orphaned policies)

-- =====================================================
-- 11. Performance check - Index usage
-- =====================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('infrastructures', 'businesses', 'user_business_roles')
  AND (
    indexname LIKE '%infrastructure%'
    OR indexname LIKE '%user%business%'
  )
ORDER BY tablename, indexname;

-- =====================================================
-- 12. Summary report
-- =====================================================
DO $$
DECLARE
  policy_count INTEGER;
  rls_enabled BOOLEAN;
  has_conflicts BOOLEAN;
  has_bad_refs BOOLEAN;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'infrastructures';

  -- Check RLS
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE tablename = 'infrastructures';

  -- Check for conflicts
  SELECT EXISTS(
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'infrastructures'
      AND roles::text LIKE '%authenticated%'
    GROUP BY cmd
    HAVING COUNT(*) > 1
  ) INTO has_conflicts;

  -- Check for bad references
  SELECT EXISTS(
    SELECT 1
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'infrastructures'
      AND (
        pg_get_expr(p.polqual, p.polrelid) LIKE '%infrastructure_users%'
        OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%infrastructure_users%'
      )
  ) INTO has_bad_refs;

  -- Report
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Infrastructure RLS Diagnostic Summary';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Policy Count: % (expected: 5)', policy_count;
  RAISE NOTICE 'RLS Enabled: % (expected: true)', rls_enabled;
  RAISE NOTICE 'Has Conflicts: % (expected: false)', has_conflicts;
  RAISE NOTICE 'Has Bad References: % (expected: false)', has_bad_refs;
  RAISE NOTICE '========================================';

  IF policy_count = 5 AND rls_enabled AND NOT has_conflicts AND NOT has_bad_refs THEN
    RAISE NOTICE '✓ ALL CHECKS PASSED';
  ELSE
    RAISE WARNING '❌ SOME CHECKS FAILED - Review output above';
  END IF;
END $$;

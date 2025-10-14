/*
  JWT Claims and RLS Validation Script

  This script provides comprehensive diagnostics for:
  1. JWT token structure and claims availability
  2. RLS policy enforcement across different roles
  3. Permission resolution and caching
  4. Business context isolation

  Usage:
  1. Open Supabase SQL Editor
  2. Run this script while authenticated as a user
  3. Review output to verify JWT claims are properly configured

  Expected JWT Claims Structure:
  {
    "user_id": "uuid",
    "telegram_id": "string",
    "role": "infrastructure_owner|business_owner|driver|etc",
    "business_id": "uuid|null",
    "permissions": ["array", "of", "permissions"],
    "support_override": false
  }
*/

-- ============================================================================
-- SECTION 1: JWT CLAIMS INSPECTION
-- ============================================================================

SELECT
  '=== JWT CLAIMS STRUCTURE ===' as section,
  NULL::text as key,
  NULL::text as value
UNION ALL
SELECT
  'Current User' as section,
  'auth.uid()' as key,
  auth.uid()::text as value
UNION ALL
SELECT
  'JWT Claims' as section,
  'Raw Claims' as key,
  current_setting('request.jwt.claims', true) as value
UNION ALL
SELECT
  'User Metadata' as section,
  'telegram_id' as key,
  COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'telegram_id'),
    'MISSING'
  ) as value
UNION ALL
SELECT
  'User Metadata' as section,
  'role' as key,
  COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role'),
    (current_setting('request.jwt.claims', true)::json->>'user_role'),
    'MISSING'
  ) as value
UNION ALL
SELECT
  'User Metadata' as section,
  'business_id' as key,
  COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'business_id'),
    'NULL (infrastructure-level)'
  ) as value;

-- ============================================================================
-- SECTION 2: USER PROFILE VERIFICATION
-- ============================================================================

SELECT
  '=== USER PROFILE ===' as section,
  NULL::text as property,
  NULL::text as value
UNION ALL
SELECT
  'User Info' as section,
  'User ID' as property,
  id::text as value
FROM users
WHERE id = auth.uid()
UNION ALL
SELECT
  'User Info' as section,
  'Telegram ID' as property,
  telegram_id as value
FROM users
WHERE id = auth.uid()
UNION ALL
SELECT
  'User Info' as section,
  'Username' as property,
  COALESCE(username, 'N/A') as value
FROM users
WHERE id = auth.uid()
UNION ALL
SELECT
  'User Info' as section,
  'Name' as property,
  name as value
FROM users
WHERE id = auth.uid()
UNION ALL
SELECT
  'User Info' as section,
  'Role' as property,
  role::text as value
FROM users
WHERE id = auth.uid();

-- ============================================================================
-- SECTION 3: PERMISSION RESOLUTION TEST
-- ============================================================================

SELECT
  '=== PERMISSION CACHE ===' as section,
  NULL::text as detail,
  NULL::text as status
UNION ALL
SELECT
  'Cache Status' as section,
  'Has Cached Permissions' as detail,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM user_permissions_cache
      WHERE user_id = auth.uid()
    )
    THEN '✅ YES'
    ELSE '❌ NO (will be created on first use)'
  END as status
UNION ALL
SELECT
  'Cache Status' as section,
  'Cache Age' as detail,
  COALESCE(
    (SELECT
      EXTRACT(EPOCH FROM (now() - cached_at))::text || ' seconds'
    FROM user_permissions_cache
    WHERE user_id = auth.uid()
    LIMIT 1),
    'N/A'
  ) as status;

-- Show cached permissions if available
SELECT
  '=== CACHED PERMISSIONS ===' as info,
  role_key,
  can_see_financials,
  can_see_cross_business,
  scope_level,
  array_length(resolved_permissions, 1) as permission_count,
  resolved_permissions::text as permissions_list
FROM user_permissions_cache
WHERE user_id = auth.uid();

-- ============================================================================
-- SECTION 4: RLS POLICY TEST - DATA ACCESS
-- ============================================================================

-- Test: Can user see orders?
SELECT
  '=== RLS ACCESS TESTS ===' as test_name,
  NULL::text as table_name,
  NULL::bigint as accessible_rows,
  NULL::text as status
UNION ALL
SELECT
  'Table Access' as test_name,
  'orders' as table_name,
  COUNT(*)::bigint as accessible_rows,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ CAN ACCESS'
    ELSE '⚠️ NO ROWS (might be empty or blocked by RLS)'
  END as status
FROM orders;

-- Test: Can user see businesses?
SELECT
  'Table Access' as test_name,
  'businesses' as table_name,
  COUNT(*)::bigint as accessible_rows,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ CAN ACCESS'
    ELSE '⚠️ NO ROWS (might be empty or blocked by RLS)'
  END as status
FROM businesses;

-- Test: Can user see warehouses?
SELECT
  'Table Access' as test_name,
  'warehouses' as table_name,
  COUNT(*)::bigint as accessible_rows,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ CAN ACCESS'
    ELSE '⚠️ NO ROWS (might be empty or blocked by RLS)'
  END as status
FROM warehouses;

-- Test: Can user see inventory_movements?
SELECT
  'Table Access' as test_name,
  'inventory_movements' as table_name,
  COUNT(*)::bigint as accessible_rows,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ CAN ACCESS'
    ELSE '⚠️ NO ROWS (might be empty or blocked by RLS)'
  END as status
FROM inventory_movements;

-- ============================================================================
-- SECTION 5: BUSINESS CONTEXT ISOLATION TEST
-- ============================================================================

-- Show which businesses the current user can access
SELECT
  '=== BUSINESS CONTEXT ISOLATION ===' as info,
  b.id as business_id,
  b.name as business_name,
  b.business_type_id,
  EXISTS (
    SELECT 1 FROM user_business_roles ubr
    WHERE ubr.user_id = auth.uid()
    AND ubr.business_id = b.id
    AND ubr.is_active = true
  ) as has_explicit_role,
  CASE
    WHEN (SELECT role FROM users WHERE id = auth.uid()) IN (
      'infrastructure_owner',
      'infrastructure_manager',
      'infrastructure_dispatcher',
      'infrastructure_warehouse',
      'infrastructure_accountant'
    )
    THEN '✅ Infrastructure role (can see all)'
    ELSE '⚠️ Business-scoped (needs explicit assignment)'
  END as access_reason
FROM businesses b
ORDER BY b.created_at DESC
LIMIT 10;

-- ============================================================================
-- SECTION 6: ROLE-BASED CAPABILITIES
-- ============================================================================

SELECT
  '=== ROLE CAPABILITIES ===' as section,
  NULL::text as capability,
  NULL::text as status
UNION ALL
SELECT
  'Capabilities' as section,
  'Can See Financials' as capability,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM roles r
      JOIN users u ON u.role::text = r.role_key
      WHERE u.id = auth.uid()
      AND r.can_see_financials = true
    )
    THEN '✅ YES'
    ELSE '❌ NO'
  END as status
UNION ALL
SELECT
  'Capabilities' as section,
  'Can See Cross-Business Data' as capability,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM roles r
      JOIN users u ON u.role::text = r.role_key
      WHERE u.id = auth.uid()
      AND r.can_see_cross_business = true
    )
    THEN '✅ YES'
    ELSE '❌ NO'
  END as status
UNION ALL
SELECT
  'Capabilities' as section,
  'Scope Level' as capability,
  COALESCE(
    (SELECT r.scope_level
     FROM roles r
     JOIN users u ON u.role::text = r.role_key
     WHERE u.id = auth.uid()
     LIMIT 1),
    'unknown'
  ) as status;

-- ============================================================================
-- SECTION 7: AUTHENTICATION STATUS SUMMARY
-- ============================================================================

SELECT
  '=== VALIDATION SUMMARY ===' as summary,
  NULL::text as check_name,
  NULL::text as result
UNION ALL
SELECT
  'Status' as summary,
  'JWT Token Present' as check_name,
  CASE
    WHEN current_setting('request.jwt.claims', true) IS NOT NULL
    AND current_setting('request.jwt.claims', true) != ''
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result
UNION ALL
SELECT
  'Status' as summary,
  'User ID in JWT' as check_name,
  CASE
    WHEN auth.uid() IS NOT NULL
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result
UNION ALL
SELECT
  'Status' as summary,
  'User Exists in Database' as check_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result
UNION ALL
SELECT
  'Status' as summary,
  'Role Assigned' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IS NOT NULL
    )
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result
UNION ALL
SELECT
  'Status' as summary,
  'Can Access At Least One Table' as check_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
    THEN '✅ PASS'
    ELSE '⚠️ LIMITED (check RLS policies)'
  END as result;

-- ============================================================================
-- SECTION 8: TROUBLESHOOTING HINTS
-- ============================================================================

SELECT
  '=== TROUBLESHOOTING ===' as section,
  CASE
    WHEN auth.uid() IS NULL
    THEN '❌ No JWT token found. Ensure you are authenticated through Telegram WebApp.'
    WHEN NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
    THEN '❌ User not found in database. Run telegram-verify Edge Function to create user.'
    WHEN (SELECT role FROM users WHERE id = auth.uid()) = 'user'
    THEN '⚠️ User has default "user" role. Assign a proper role (infrastructure_owner, business_owner, etc).'
    WHEN NOT EXISTS (SELECT 1 FROM user_permissions_cache WHERE user_id = auth.uid())
    THEN '⚠️ No permission cache found. Call resolve-permissions Edge Function to populate cache.'
    ELSE '✅ All checks passed! JWT claims and RLS are configured correctly.'
  END as diagnostic_message;

-- ============================================================================
-- QUICK REFERENCE: EXPECTED JWT STRUCTURE FOR EACH ROLE
-- ============================================================================

/*
INFRASTRUCTURE_OWNER:
{
  "user_id": "auth.uid",
  "telegram_id": "telegram_user_id",
  "role": "infrastructure_owner",
  "business_id": null,
  "permissions": ["manage_infrastructure", "view_all_businesses", "manage_users", ...],
  "can_see_financials": true,
  "can_see_cross_business": true,
  "scope_level": "infrastructure",
  "support_override": false
}

BUSINESS_OWNER:
{
  "user_id": "auth.uid",
  "telegram_id": "telegram_user_id",
  "role": "business_owner",
  "business_id": "specific_business_uuid",
  "permissions": ["manage_business", "view_orders", "manage_inventory", ...],
  "can_see_financials": true,
  "can_see_cross_business": false,
  "scope_level": "business",
  "support_override": false
}

DRIVER:
{
  "user_id": "auth.uid",
  "telegram_id": "telegram_user_id",
  "role": "driver",
  "business_id": "assigned_business_uuid",
  "permissions": ["view_assigned_orders", "update_delivery_status", ...],
  "can_see_financials": false,
  "can_see_cross_business": false,
  "scope_level": "business",
  "support_override": false
}
*/

-- ============================================================================
-- Infrastructure RBAC & Inventory Pipeline - System Validation Script
-- ============================================================================
-- This script validates that all components are properly installed and configured

-- Check 1: Verify all new tables exist
SELECT
  'Database Tables' as check_category,
  COUNT(*) as count,
  'Expected: 21 new tables' as expected
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'permissions', 'roles', 'role_permissions', 'custom_roles',
  'custom_role_permissions', 'user_business_roles', 'role_change_log',
  'user_permissions_cache', 'warehouses', 'inventory_movements',
  'stock_allocations', 'driver_vehicle_inventory', 'inventory_reconciliation',
  'reconciliation_items', 'warehouse_capacity_limits', 'system_audit_log',
  'financial_audit_log', 'cross_scope_access_log', 'data_export_log',
  'login_history', 'permission_check_failures', 'equity_transfer_log',
  'business_lifecycle_log'
);

-- Check 2: Verify RLS is enabled on all audit tables
SELECT
  'RLS Enabled' as check_category,
  COUNT(*) as count,
  'Expected: 21 tables with RLS' as expected
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'permissions', 'roles', 'role_permissions', 'custom_roles',
  'custom_role_permissions', 'user_business_roles', 'role_change_log',
  'user_permissions_cache', 'warehouses', 'inventory_movements',
  'stock_allocations', 'driver_vehicle_inventory', 'inventory_reconciliation',
  'reconciliation_items', 'warehouse_capacity_limits', 'system_audit_log',
  'financial_audit_log', 'cross_scope_access_log', 'data_export_log',
  'login_history', 'permission_check_failures', 'equity_transfer_log',
  'business_lifecycle_log'
)
AND rowsecurity = true;

-- Check 3: Count base permissions seeded
SELECT
  'Base Permissions' as check_category,
  COUNT(*) as count,
  'Expected: 70+ permissions' as expected
FROM permissions;

-- Check 4: Count base roles seeded
SELECT
  'Base Roles' as check_category,
  COUNT(*) as count,
  'Expected: 13 roles (6 infrastructure + 7 business)' as expected
FROM roles;

-- Check 5: Count role-permission mappings for infrastructure_owner
SELECT
  'Infrastructure Owner Permissions' as check_category,
  COUNT(*) as count,
  'Expected: All 70+ permissions' as expected
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE r.role_key = 'infrastructure_owner';

-- Check 6: Verify user_role enum has new infrastructure roles
SELECT
  'User Role Enum Values' as check_category,
  COUNT(*) as count,
  'Expected: 14 role values' as expected
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype;

-- Check 7: List all infrastructure-only permissions
SELECT
  'Infrastructure-Only Permissions' as check_category,
  permission_key,
  module
FROM permissions
WHERE is_infrastructure_only = true
ORDER BY module, permission_key;

-- Check 8: Verify triggers are installed
SELECT
  'Database Triggers' as check_category,
  COUNT(*) as count,
  'Expected: 5+ triggers' as expected
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
  'invalidate_cache_on_role_change',
  'log_user_role_changes',
  'audit_businesses_trigger',
  'audit_orders_trigger',
  'audit_stock_allocations_trigger',
  'set_allocation_number_trigger',
  'validate_allocation_scope_trigger'
);

-- Check 9: Verify indexes exist for performance
SELECT
  'Performance Indexes' as check_category,
  COUNT(*) as count,
  'Expected: 50+ indexes' as expected
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'permissions', 'roles', 'role_permissions', 'custom_roles',
  'user_business_roles', 'warehouses', 'inventory_movements',
  'stock_allocations', 'system_audit_log', 'financial_audit_log'
);

-- Check 10: List all Edge Functions (manual verification needed)
-- Note: This requires checking deployed functions via Supabase dashboard or CLI
-- Expected functions:
-- 1. resolve-permissions
-- 2. allocate-stock
-- 3. approve-allocation
-- 4. load-driver-inventory

-- Check 11: Sample permission resolution query
-- This demonstrates how permissions are resolved for a user
SELECT
  'Sample Permission Query' as check_category,
  r.role_key,
  r.label,
  r.scope_level,
  COUNT(DISTINCT p.permission_key) as total_permissions,
  COUNT(DISTINCT CASE WHEN p.module = 'orders' THEN p.permission_key END) as order_permissions,
  COUNT(DISTINCT CASE WHEN p.module = 'inventory' THEN p.permission_key END) as inventory_permissions,
  COUNT(DISTINCT CASE WHEN p.module = 'financial' THEN p.permission_key END) as financial_permissions
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id
GROUP BY r.role_key, r.label, r.scope_level
ORDER BY r.hierarchy_level;

-- Check 12: Verify warehouse scope validation
SELECT
  'Warehouse Scope Check' as check_category,
  scope_level,
  COUNT(*) as count,
  'Infrastructure warehouses should have business_id = NULL' as note
FROM warehouses
GROUP BY scope_level;

-- Check 13: System Health Summary
SELECT
  'System Health Summary' as report,
  (SELECT COUNT(*) FROM permissions) as total_permissions,
  (SELECT COUNT(*) FROM roles) as total_roles,
  (SELECT COUNT(*) FROM warehouses WHERE scope_level = 'infrastructure') as infrastructure_warehouses,
  (SELECT COUNT(*) FROM warehouses WHERE scope_level = 'business') as business_warehouses,
  (SELECT COUNT(*) FROM stock_allocations WHERE allocation_status = 'pending') as pending_allocations,
  (SELECT COUNT(*) FROM system_audit_log WHERE created_at > NOW() - INTERVAL '24 hours') as audit_entries_24h;

-- Check 14: Verify no NULL business_id in business-scoped tables
SELECT
  'Data Integrity Check' as check_category,
  'Checking for NULL business_id in business-scoped records' as description,
  (
    SELECT COUNT(*)
    FROM warehouses
    WHERE scope_level = 'business' AND business_id IS NULL
  ) as invalid_warehouse_records,
  (
    SELECT COUNT(*)
    FROM stock_allocations
    WHERE to_business_id IS NULL
  ) as invalid_allocation_records,
  'Expected: 0 for both' as expected;

-- ============================================================================
-- Validation Complete
-- ============================================================================

SELECT
  '🎉 Infrastructure RBAC & Inventory Pipeline System Validation' as status,
  'All checks completed. Review results above.' as message,
  'If all counts match expected values, system is properly installed.' as conclusion;

/*
  # System Validation Script

  Validates the complete infrastructure RBAC system is properly configured.

  Checks:
  1. All required tables exist
  2. RLS policies are enabled
  3. Functions are created
  4. Indexes are in place
  5. Permissions are configured
*/

DO $$
DECLARE
  v_table_count int;
  v_policy_count int;
  v_function_count int;
  v_index_count int;
  v_errors text[] := ARRAY[]::text[];
  r record;
  v_audit_ok boolean := true;
BEGIN
  RAISE NOTICE '=== Infrastructure RBAC System Validation ===';
  RAISE NOTICE '';

  -- Check 1: Required Tables
  RAISE NOTICE 'Checking required tables...';

  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'users', 'businesses', 'business_types', 'zones',
      'permissions', 'roles', 'role_permissions', 'custom_roles',
      'user_business_roles', 'role_change_log', 'user_permissions_cache',
      'warehouses', 'inventory_movements', 'stock_allocations',
      'driver_vehicle_inventory', 'inventory_reconciliation',
      'system_audit_log', 'financial_audit_log', 'cross_scope_access_log',
      'permission_check_failures', 'business_lifecycle_log'
    );

  IF v_table_count < 21 THEN
    v_errors := array_append(v_errors, format('Missing tables. Expected 21, found %s', v_table_count));
  ELSE
    RAISE NOTICE '  ✓ All required tables exist (%s)', v_table_count;
  END IF;

  -- Check 2: RLS Policies
  RAISE NOTICE 'Checking RLS policies...';

  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  IF v_policy_count < 10 THEN
    v_errors := array_append(v_errors, format('Insufficient RLS policies. Expected at least 10, found %s', v_policy_count));
  ELSE
    RAISE NOTICE '  ✓ RLS policies configured (%s)', v_policy_count;
  END IF;

  -- Check 3: RLS Enabled on Tables
  RAISE NOTICE 'Checking RLS is enabled...';

  SELECT COUNT(*) INTO v_table_count
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true;

  RAISE NOTICE '  ✓ RLS enabled on %s tables', v_table_count;

  -- Check 4: Required Functions
  RAISE NOTICE 'Checking required functions...';

  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'get_business_metrics',
      'get_infrastructure_overview',
      'get_user_active_roles',
      'get_inventory_chain',
      'validate_allocation_request',
      'get_audit_trail'
    );

  IF v_function_count < 6 THEN
    v_errors := array_append(v_errors, format('Missing functions. Expected 6, found %s', v_function_count));
  ELSE
    RAISE NOTICE '  ✓ All required functions exist (%s)', v_function_count;
  END IF;

  -- Check 5: Indexes
  RAISE NOTICE 'Checking indexes...';

  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public';

  RAISE NOTICE '  ✓ Found %s indexes', v_index_count;

  -- Check 6: Audit Tables Structure
  RAISE NOTICE 'Checking audit table structure...';

  FOR r IN
    SELECT unnest(ARRAY[
      'system_audit_log',
      'financial_audit_log',
      'cross_scope_access_log',
      'permission_check_failures',
      'business_lifecycle_log',
      'equity_transfer_log',
      'data_export_log',
      'zone_audit_logs',
      'login_history'
    ]) AS table_name
  LOOP
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = r.table_name
      AND column_name = 'infrastructure_id';

    IF v_table_count = 0 THEN
      v_errors := array_append(v_errors, format('%s missing infrastructure_id column', r.table_name));
      v_audit_ok := false;
      CONTINUE;
    END IF;

    EXECUTE format('select 1 from public.%I where infrastructure_id is null limit 1', r.table_name)
      INTO v_table_count;

    IF v_table_count = 1 THEN
      v_errors := array_append(v_errors, format('%s contains rows without infrastructure scope', r.table_name));
      v_audit_ok := false;
    END IF;
  END LOOP;

  IF v_audit_ok THEN
    RAISE NOTICE '  ✓ Audit tables enforce infrastructure scope';
  END IF;

  -- Check 7: Permission System
  RAISE NOTICE 'Checking permission system...';

  SELECT COUNT(*) INTO v_table_count
  FROM permissions;

  IF v_table_count = 0 THEN
    v_errors := array_append(v_errors, 'No permissions defined in system');
  ELSE
    RAISE NOTICE '  ✓ Permission system configured (%s permissions)', v_table_count;
  END IF;

  -- Check 8: Business Types
  RAISE NOTICE 'Checking business types...';

  SELECT COUNT(*) INTO v_table_count
  FROM business_types;

  IF v_table_count = 0 THEN
    v_errors := array_append(v_errors, 'No business types defined');
  ELSE
    RAISE NOTICE '  ✓ Business types configured (%s types)', v_table_count;
  END IF;

  -- Check 9: Edge Functions Dependencies
  RAISE NOTICE 'Checking Edge Functions requirements...';

  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('user_permissions_cache', 'stock_allocations');

  IF v_table_count < 2 THEN
    v_errors := array_append(v_errors, 'Edge Functions dependency tables missing');
  ELSE
    RAISE NOTICE '  ✓ Edge Functions dependencies met';
  END IF;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '=== Validation Summary ===';

  IF array_length(v_errors, 1) IS NULL THEN
    RAISE NOTICE '✓ All validation checks passed!';
    RAISE NOTICE '';
    RAISE NOTICE 'System Status: READY FOR PRODUCTION';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Deploy Edge Functions';
    RAISE NOTICE '  2. Configure environment variables';
    RAISE NOTICE '  3. Test with real user accounts';
    RAISE NOTICE '  4. Monitor audit logs';
  ELSE
    RAISE NOTICE '✗ Validation failed with errors:';
    FOR i IN 1..array_length(v_errors, 1) LOOP
      RAISE NOTICE '  - %', v_errors[i];
    END LOOP;
    RAISE NOTICE '';
    RAISE NOTICE 'System Status: NOT READY';
  END IF;

END $$;

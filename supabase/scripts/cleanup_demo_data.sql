/*
  # Clean Up Demo Data Script

  This script removes all demo/test data from the system while preserving:
  - Schema structure
  - Functions and triggers
  - RLS policies
  - System configuration

  WARNING: This will delete ALL user data. Use with caution!

  Usage:
  1. Backup your database first
  2. Run this script in a transaction
  3. Review changes before committing
*/

BEGIN;

-- Step 1: Disable triggers temporarily
SET session_replication_role = replica;

-- Step 2: Clear audit logs (keep structure)
TRUNCATE TABLE system_audit_log CASCADE;
TRUNCATE TABLE financial_audit_log CASCADE;
TRUNCATE TABLE cross_scope_access_log CASCADE;
TRUNCATE TABLE data_export_log CASCADE;
TRUNCATE TABLE login_history CASCADE;
TRUNCATE TABLE permission_check_failures CASCADE;
TRUNCATE TABLE equity_transfer_log CASCADE;
TRUNCATE TABLE business_lifecycle_log CASCADE;

-- Step 3: Clear operational data
TRUNCATE TABLE driver_vehicle_inventory CASCADE;
TRUNCATE TABLE inventory_reconciliation CASCADE;
TRUNCATE TABLE stock_allocations CASCADE;
TRUNCATE TABLE inventory_movements CASCADE;

-- Step 4: Clear order data
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;

-- Step 5: Clear messaging data
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE group_chat_members CASCADE;
TRUNCATE TABLE group_chats CASCADE;
TRUNCATE TABLE channel_members CASCADE;
TRUNCATE TABLE channels CASCADE;

-- Step 6: Clear user-business relationships
TRUNCATE TABLE user_business_roles CASCADE;
TRUNCATE TABLE role_change_log CASCADE;
TRUNCATE TABLE user_permissions_cache CASCADE;

-- Step 7: Clear business data
TRUNCATE TABLE zones CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE warehouses CASCADE;
TRUNCATE TABLE businesses CASCADE;

-- Step 8: Clear user registrations and sessions
TRUNCATE TABLE pin_attempts CASCADE;
TRUNCATE TABLE active_sessions CASCADE;
TRUNCATE TABLE user_registrations CASCADE;

-- Step 9: Clear users (but keep the structure)
TRUNCATE TABLE users CASCADE;

-- Step 10: Reset sequences (if any)
-- Add sequence resets here if needed

-- Step 11: Re-enable triggers
SET session_replication_role = DEFAULT;

-- Step 12: Verify cleanup
DO $$
DECLARE
  v_user_count int;
  v_business_count int;
  v_order_count int;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM users;
  SELECT COUNT(*) INTO v_business_count FROM businesses;
  SELECT COUNT(*) INTO v_order_count FROM orders;

  RAISE NOTICE 'Cleanup Summary:';
  RAISE NOTICE '  Users remaining: %', v_user_count;
  RAISE NOTICE '  Businesses remaining: %', v_business_count;
  RAISE NOTICE '  Orders remaining: %', v_order_count;

  IF v_user_count > 0 OR v_business_count > 0 OR v_order_count > 0 THEN
    RAISE WARNING 'Cleanup may not be complete. Review tables manually.';
  ELSE
    RAISE NOTICE 'System successfully cleaned. All demo data removed.';
  END IF;
END $$;

-- Uncomment to commit changes
-- COMMIT;

-- Or rollback if you want to review first
ROLLBACK;

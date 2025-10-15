/*
  # Add Missing Audit Event Types

  ## Problem
  The system_audit_log table has a CHECK constraint with a fixed list of event types.
  Dynamic table triggers are generating new event types that aren't in the list.

  ## Solution
  Add all missing event types including businesses_created, zones_created, etc.
*/

-- Drop the old constraint
ALTER TABLE system_audit_log DROP CONSTRAINT IF EXISTS system_audit_log_event_type_check;

-- Add new comprehensive constraint with all event types
ALTER TABLE system_audit_log 
ADD CONSTRAINT system_audit_log_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'user_created'::text,
  'user_updated'::text,
  'user_deleted'::text,
  'business_created'::text,
  'business_updated'::text,
  'business_deleted'::text,
  'businesses_created'::text,
  'businesses_updated'::text,
  'businesses_deleted'::text,
  'order_created'::text,
  'order_updated'::text,
  'order_cancelled'::text,
  'orders_created'::text,
  'orders_updated'::text,
  'orders_deleted'::text,
  'zones_created'::text,
  'zones_updated'::text,
  'zones_deleted'::text,
  'products_created'::text,
  'products_updated'::text,
  'products_deleted'::text,
  'stock_allocations_created'::text,
  'stock_allocations_updated'::text,
  'stock_allocations_deleted'::text,
  'inventory_transferred'::text,
  'inventory_adjusted'::text,
  'role_assigned'::text,
  'role_changed'::text,
  'permission_modified'::text,
  'financial_accessed'::text,
  'report_generated'::text,
  'settings_changed'::text,
  'data_exported'::text,
  'login_success'::text,
  'login_failed'::text,
  'logout'::text,
  'api_call'::text,
  'webhook_received'::text
]));

COMMENT ON CONSTRAINT system_audit_log_event_type_check ON system_audit_log IS 'Allowed audit event types - includes all table operations';

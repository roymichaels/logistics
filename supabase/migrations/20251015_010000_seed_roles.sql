BEGIN;

-- Canonical role permission definitions to simplify resolution pipeline
WITH canonical_roles AS (
  SELECT 'business_owner'::text AS role_key, ARRAY[
    'orders:view_all_business',
    'orders:view_business',
    'orders:view_own',
    'orders:view_assigned',
    'orders:create',
    'orders:update',
    'orders:delete',
    'orders:assign_driver',
    'orders:change_status',
    'products:view',
    'products:create',
    'products:update',
    'products:delete',
    'products:set_pricing',
    'inventory:view_all_business',
    'inventory:view_business',
    'inventory:view_own',
    'inventory:create',
    'inventory:update',
    'inventory:delete',
    'inventory:transfer',
    'inventory:request_restock',
    'inventory:approve_restock',
    'inventory:fulfill_restock',
    'users:view_all_business',
    'users:view_business',
    'users:view_own',
    'users:create',
    'users:update',
    'users:delete',
    'users:change_role',
    'users:approve',
    'users:set_ownership',
    'users:assign_to_business',
    'financial:view_own_business',
    'financial:view_own_earnings',
    'financial:view_business_revenue',
    'financial:view_business_costs',
    'financial:view_business_profit',
    'financial:view_ownership_distribution',
    'financial:manage_distributions',
    'financial:export_reports',
    'business:view_own',
    'business:update',
    'business:manage_settings',
    'business:manage_ownership',
    'business:switch_context',
    'system:view_audit_logs',
    'zones:view',
    'zones:create',
    'zones:update',
    'zones:assign_drivers',
    'analytics:view_all_business',
    'analytics:view_business',
    'analytics:view_own',
    'analytics:export',
    'messaging:send',
    'messaging:view',
    'groups:create',
    'groups:view',
    'groups:manage_own',
    'channels:create',
    'channels:view',
    'channels:manage_own'
  ] AS permission_keys
  UNION ALL
  SELECT 'manager'::text, ARRAY[
    'orders:view_all_business',
    'orders:view_business',
    'orders:view_own',
    'orders:view_assigned',
    'orders:create',
    'orders:update',
    'orders:assign_driver',
    'orders:change_status',
    'products:view',
    'products:create',
    'products:update',
    'inventory:view_all_business',
    'inventory:view_business',
    'inventory:view_own',
    'inventory:create',
    'inventory:update',
    'inventory:transfer',
    'inventory:request_restock',
    'inventory:approve_restock',
    'inventory:fulfill_restock',
    'users:view_business',
    'users:view_own',
    'users:assign_to_business',
    'users:change_role',
    'business:view_own',
    'business:update',
    'business:manage_settings',
    'business:switch_context',
    'zones:view',
    'zones:create',
    'zones:update',
    'zones:assign_drivers',
    'analytics:view_business',
    'analytics:view_own',
    'messaging:send',
    'messaging:view',
    'groups:view',
    'groups:manage_own',
    'channels:view',
    'channels:manage_own'
  ]
  UNION ALL
  SELECT 'driver'::text, ARRAY[
    'orders:view_assigned',
    'orders:view_own',
    'orders:change_status',
    'inventory:view_own',
    'inventory:request_restock',
    'messaging:view',
    'messaging:send',
    'groups:view',
    'channels:view'
  ]
),
role_records AS (
  SELECT r.id, r.role_key, c.permission_keys
  FROM canonical_roles c
  JOIN roles r ON r.role_key = c.role_key
),
permission_records AS (
  SELECT rr.id AS role_id, p.id AS permission_id
  FROM role_records rr
  JOIN permissions p ON p.permission_key = ANY(rr.permission_keys)
  WHERE COALESCE(p.is_infrastructure_only, false) = false
)
-- remove legacy mappings so the canonical set becomes authoritative
DELETE FROM role_permissions rp
USING role_records rr
WHERE rp.role_id = rr.id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM permission_records
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ensure infrastructure_owner retains full access (including newly added permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'infrastructure_owner'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- publish aggregated view for downstream services and documentation
CREATE OR REPLACE VIEW canonical_role_permissions AS
SELECT
  r.role_key,
  r.label,
  r.description,
  r.scope_level,
  r.hierarchy_level,
  r.can_see_financials,
  r.can_see_cross_business,
  array_remove(array_agg(DISTINCT p.permission_key ORDER BY p.permission_key), NULL) AS permission_keys
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id
GROUP BY r.id;

GRANT SELECT ON canonical_role_permissions TO authenticated;

COMMENT ON VIEW canonical_role_permissions IS 'Materialized view of canonical permissions per system role used by resolve-permissions and documentation.';

COMMIT;

BEGIN;

SET search_path TO public;

-- Normalize historical business_users rows into user_business_roles
WITH normalized AS (
  SELECT
    bu.id,
    bu.business_id,
    bu.user_id,
    bu.role,
    bu.permissions,
    bu.is_primary,
    bu.active,
    bu.assigned_at,
    bu.assigned_by,
    CASE bu.role
      WHEN 'owner' THEN 'business_owner'
      WHEN 'manager' THEN 'manager'
      WHEN 'dispatcher' THEN 'dispatcher'
      WHEN 'driver' THEN 'driver'
      WHEN 'warehouse' THEN 'warehouse'
      WHEN 'sales' THEN 'sales'
      WHEN 'customer_service' THEN 'customer_service'
      ELSE NULL
    END AS canonical_role,
    CASE bu.role
      WHEN 'owner' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'dispatcher' THEN 3
      WHEN 'warehouse' THEN 4
      WHEN 'sales' THEN 5
      WHEN 'customer_service' THEN 6
      WHEN 'driver' THEN 7
      ELSE 99
    END AS role_priority
  FROM business_users bu
),
ranked AS (
  SELECT
    n.*, 
    ROW_NUMBER() OVER (
      PARTITION BY n.user_id, n.business_id
      ORDER BY n.role_priority, n.assigned_at DESC NULLS LAST
    ) AS rn
  FROM normalized n
  WHERE n.canonical_role IS NOT NULL
),
target_rows AS (
  SELECT
    r.business_id,
    r.user_id,
    r.canonical_role,
    r.is_primary,
    COALESCE(r.active, true) AS is_active,
    r.assigned_by,
    r.assigned_at
  FROM ranked r
  WHERE r.rn = 1
)
-- disable triggers that depend on auth.uid() during data backfill
SELECT set_config('session_replication_role', 'replica', true);

INSERT INTO user_business_roles (
  user_id,
  business_id,
  role_id,
  custom_role_id,
  ownership_percentage,
  commission_percentage,
  is_primary,
  is_active,
  assigned_by,
  assigned_at,
  deactivated_at,
  notes
)
SELECT
  t.user_id,
  t.business_id,
  r.id,
  NULL,
  0,
  0,
  COALESCE(t.is_primary, false),
  t.is_active,
  t.assigned_by,
  t.assigned_at,
  NULL,
  NULL
FROM target_rows t
JOIN roles r ON r.role_key = t.canonical_role
ON CONFLICT (user_id, business_id) DO UPDATE
SET
  role_id = EXCLUDED.role_id,
  is_active = EXCLUDED.is_active,
  is_primary = EXCLUDED.is_primary,
  assigned_by = COALESCE(EXCLUDED.assigned_by, user_business_roles.assigned_by),
  assigned_at = LEAST(EXCLUDED.assigned_at, user_business_roles.assigned_at);

SELECT set_config('session_replication_role', 'origin', true);

-- Drop legacy policies/triggers with the table
DROP TABLE IF EXISTS business_users CASCADE;

-- Compatibility view for legacy queries expecting the old table
CREATE OR REPLACE VIEW business_users AS
SELECT
  ubr.id,
  ubr.business_id,
  ubr.user_id,
  COALESCE(cr.custom_role_name, r.role_key) AS role,
  '{}'::jsonb AS permissions,
  ubr.is_primary,
  ubr.is_active,
  ubr.assigned_at,
  ubr.assigned_by
FROM user_business_roles ubr
LEFT JOIN roles r ON r.id = ubr.role_id
LEFT JOIN custom_roles cr ON cr.id = ubr.custom_role_id;

GRANT SELECT ON business_users TO authenticated;

COMMENT ON VIEW business_users IS 'Legacy compatibility view backed by user_business_roles. Use business_memberships for enriched data.';

-- Create a canonical view that surfaces enriched membership data
CREATE OR REPLACE VIEW business_memberships AS
SELECT
  ubr.id,
  ubr.user_id,
  ubr.business_id,
  ubr.is_primary,
  ubr.is_active,
  ubr.assigned_at,
  ubr.assigned_by,
  COALESCE(cr.custom_role_name, r.role_key) AS display_role_key,
  COALESCE(cr.custom_role_label, r.label) AS display_role_label,
  r.role_key AS base_role_key,
  r.label AS base_role_label,
  r.scope_level,
  r.can_see_financials,
  r.can_see_cross_business,
  ubr.ownership_percentage,
  ubr.commission_percentage,
  ubr.notes,
  cr.id AS custom_role_id,
  u.telegram_id,
  u.name AS user_name,
  u.username AS user_username,
  u.photo_url AS user_photo_url,
  u.phone AS user_phone,
  u.role AS infrastructure_role,
  u.department AS user_department,
  b.name AS business_name,
  b.name_hebrew AS business_name_hebrew,
  b.business_type,
  b.primary_color,
  b.secondary_color
FROM user_business_roles ubr
LEFT JOIN roles r ON r.id = ubr.role_id
LEFT JOIN custom_roles cr ON cr.id = ubr.custom_role_id
LEFT JOIN users u ON u.id = ubr.user_id
LEFT JOIN businesses b ON b.id = ubr.business_id
WHERE ubr.is_active = true;

GRANT SELECT ON business_memberships TO authenticated;

COMMENT ON VIEW business_memberships IS 'Active business memberships resolved from user_business_roles with base/custom role metadata.';

-- Refresh supporting RPCs to use user_business_roles
CREATE OR REPLACE FUNCTION get_user_businesses()
RETURNS TABLE (
  business_id uuid,
  business_name text,
  business_name_hebrew text,
  business_type text,
  role_key text,
  role_label text,
  is_primary boolean,
  ownership_percentage numeric,
  commission_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.name_hebrew,
    b.business_type,
    COALESCE(cr.custom_role_name, r.role_key) AS role_key,
    COALESCE(cr.custom_role_label, r.label) AS role_label,
    ubr.is_primary,
    ubr.ownership_percentage,
    ubr.commission_percentage
  FROM user_business_roles ubr
  JOIN businesses b ON b.id = ubr.business_id
  LEFT JOIN roles r ON r.id = ubr.role_id
  LEFT JOIN custom_roles cr ON cr.id = ubr.custom_role_id
  WHERE ubr.user_id = auth.uid()
    AND ubr.is_active = true
  ORDER BY ubr.is_primary DESC, b.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_businesses() TO authenticated;

COMMIT;

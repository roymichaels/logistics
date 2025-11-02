/*
  # Fix Custom Roles Column References

  1. Purpose
     - Fix "column cr.is_active does not exist" error in get_user_businesses
     - The actual custom_roles table uses: role_key, name_en, active
     - SQL queries were incorrectly using: custom_role_name, custom_role_label, is_active

  2. Root Cause
     - Actual database schema has: role_key, name_en, active
     - Migration files tried to create different schema: custom_role_name, custom_role_label, is_active
     - This mismatch causes 400 errors when fetching user businesses

  3. Changes
     - Update get_user_businesses() to use actual database columns
     - Update business_memberships view to use actual column names
     - Use active instead of is_active, role_key instead of custom_role_name

  4. Security
     - Maintains all existing RLS policies
     - No changes to access permissions
     - Uses SECURITY DEFINER for consistent access
*/

-- =====================================================
-- Fix get_user_businesses Function
-- =====================================================

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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS business_id,
    b.name AS business_name,
    b.name_hebrew AS business_name_hebrew,
    b.business_type,
    -- Use actual column names from custom_roles table in database
    COALESCE(cr.role_key, r.role_key) AS role_key,
    COALESCE(cr.name_en, r.name_en) AS role_label,
    ubr.is_primary,
    ubr.ownership_percentage,
    ubr.commission_percentage
  FROM user_business_roles ubr
  JOIN businesses b ON b.id = ubr.business_id
  LEFT JOIN roles r ON r.id = ubr.role_id
  -- Fix: use active (not is_active) as per actual database schema
  LEFT JOIN custom_roles cr ON cr.id = ubr.custom_role_id AND cr.active = true
  WHERE ubr.user_id = auth.uid()
    AND ubr.is_active = true
  ORDER BY ubr.is_primary DESC, b.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_businesses() TO authenticated;

COMMENT ON FUNCTION get_user_businesses() IS 'Returns list of businesses for the authenticated user with correct custom_roles column references';

-- =====================================================
-- Fix business_memberships View
-- =====================================================

DROP VIEW IF EXISTS business_memberships CASCADE;

CREATE OR REPLACE VIEW business_memberships AS
SELECT
  ubr.id,
  ubr.user_id,
  ubr.business_id,
  ubr.is_primary,
  ubr.is_active,
  ubr.assigned_at,
  ubr.assigned_by,
  ubr.infrastructure_id,
  ubr.ownership_percentage,
  ubr.commission_percentage,
  ubr.notes,
  -- Role information with fallback to base role
  -- Use actual column names: role_key, name_en, active
  COALESCE(cr.role_key, r.role_key) AS display_role_key,
  COALESCE(cr.name_en, r.name_en) AS display_role_label,
  r.role_key AS base_role_key,
  r.name_en AS base_role_label,
  r.scope AS scope_level,
  cr.id AS custom_role_id,
  -- User information
  u.telegram_id,
  u.display_name AS user_name,
  u.first_name AS user_first_name,
  u.last_name AS user_last_name,
  u.photo_url AS user_photo_url,
  u.phone AS user_phone,
  u.global_role AS infrastructure_role,
  -- Business information
  b.name AS business_name,
  b.name_hebrew AS business_name_hebrew
FROM user_business_roles ubr
LEFT JOIN roles r ON r.id = ubr.role_id
-- Fix: use active (not is_active) as per actual database schema
LEFT JOIN custom_roles cr ON cr.id = ubr.custom_role_id AND cr.active = true
LEFT JOIN users u ON u.id = ubr.user_id
LEFT JOIN businesses b ON b.id = ubr.business_id
WHERE ubr.is_active = true;

-- Grant access to the view
GRANT SELECT ON business_memberships TO authenticated;
GRANT SELECT ON business_memberships TO anon;

COMMENT ON VIEW business_memberships IS 'Active business memberships with correct custom_roles column references';

-- =====================================================
-- Update get_user_business_role Function
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_business_role(
  p_user_id uuid,
  p_business_id uuid
)
RETURNS TABLE (
  role_key text,
  role_label text,
  is_custom boolean,
  custom_role_id uuid,
  ownership_percentage numeric,
  is_primary boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bm.display_role_key AS role_key,
    bm.display_role_label AS role_label,
    (bm.custom_role_id IS NOT NULL) AS is_custom,
    bm.custom_role_id,
    bm.ownership_percentage,
    bm.is_primary
  FROM business_memberships bm
  WHERE bm.user_id = p_user_id
    AND bm.business_id = p_business_id
    AND bm.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_user_business_role TO authenticated;

-- =====================================================
-- Verification
-- =====================================================

DO $$
DECLARE
  function_count int;
  view_count int;
BEGIN
  -- Verify function exists
  SELECT COUNT(*)
  INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'get_user_businesses';

  IF function_count = 0 THEN
    RAISE EXCEPTION 'get_user_businesses function was not created';
  END IF;

  -- Verify view exists
  SELECT COUNT(*)
  INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name = 'business_memberships';

  IF view_count = 0 THEN
    RAISE EXCEPTION 'business_memberships view was not created';
  END IF;

  -- Verify custom_roles columns exist (actual schema)
  PERFORM 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'custom_roles'
    AND column_name IN ('role_key', 'name_en', 'active')
  HAVING COUNT(*) = 3;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'custom_roles table missing required columns';
  END IF;

  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE '✅ get_user_businesses function fixed with correct column names';
  RAISE NOTICE '✅ business_memberships view fixed with correct column names';
  RAISE NOTICE '✅ All custom_roles column references updated to match actual schema';
END $$;

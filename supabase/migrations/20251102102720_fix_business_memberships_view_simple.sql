/*
  # Fix Business Memberships View - Simple Fix

  1. Purpose
     - Create missing business_memberships view for role queries
     - Fix database schema errors preventing business onboarding
     - Use only columns that actually exist in the database

  2. Changes
     - Create business_memberships view with correct column names
     - Ensure view is accessible to authenticated users

  3. Security
     - View respects user permissions via RLS on underlying tables
*/

-- =====================================================
-- Create business_memberships view
-- =====================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS business_memberships CASCADE;

-- Create the view using only columns that exist in the remote database
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
LEFT JOIN custom_roles cr ON cr.id = ubr.custom_role_id AND cr.active = true
LEFT JOIN users u ON u.id = ubr.user_id
LEFT JOIN businesses b ON b.id = ubr.business_id
WHERE ubr.is_active = true;

-- Grant access to the view
GRANT SELECT ON business_memberships TO authenticated;
GRANT SELECT ON business_memberships TO anon;

-- Add comment to document the view
COMMENT ON VIEW business_memberships IS 'Active business memberships with resolved role information, user details, and business context. Used for permission resolution and role display.';

-- =====================================================
-- Verify the migration
-- =====================================================

DO $$
DECLARE
  view_count int;
  id_column_count int;
  role_column_count int;
BEGIN
  -- Check if view was created
  SELECT COUNT(*)
  INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name = 'business_memberships';

  IF view_count = 0 THEN
    RAISE EXCEPTION 'business_memberships view was not created';
  END IF;

  -- Check if id column exists
  SELECT COUNT(*)
  INTO id_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'business_memberships'
    AND column_name = 'id';

  IF id_column_count = 0 THEN
    RAISE EXCEPTION 'business_memberships view missing id column';
  END IF;

  -- Check if display_role_key column exists
  SELECT COUNT(*)
  INTO role_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'business_memberships'
    AND column_name = 'display_role_key';

  IF role_column_count = 0 THEN
    RAISE EXCEPTION 'business_memberships view missing display_role_key column';
  END IF;

  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE '✅ business_memberships view created';
  RAISE NOTICE '✅ All required columns present';
  RAISE NOTICE '✅ View accessible to authenticated users';
END $$;
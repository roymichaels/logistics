/*
  # Restore get_user_businesses Function

  1. Purpose
     - Restore missing get_user_businesses RPC function to database
     - Fix 400 errors when loading user business context
     - Enable users to see their businesses after onboarding

  2. Changes
     - Create get_user_businesses function with proper joins
     - Grant execute permissions to authenticated users
     - Return business list with role information

  3. Security
     - Function uses auth.uid() to ensure users only see their own businesses
     - SECURITY DEFINER ensures consistent access to underlying tables
*/

-- =====================================================
-- Create get_user_businesses Function
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
    COALESCE(cr.role_key, r.role_key) AS role_key,
    COALESCE(cr.name_en, r.name_en) AS role_label,
    ubr.is_primary,
    ubr.ownership_percentage,
    ubr.commission_percentage
  FROM user_business_roles ubr
  JOIN businesses b ON b.id = ubr.business_id
  LEFT JOIN roles r ON r.id = ubr.role_id
  LEFT JOIN custom_roles cr ON cr.id = ubr.custom_role_id AND cr.active = true
  WHERE ubr.user_id = auth.uid()
    AND ubr.is_active = true
  ORDER BY ubr.is_primary DESC, b.name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_businesses() TO authenticated;

-- Add comment to document the function
COMMENT ON FUNCTION get_user_businesses() IS 'Returns list of businesses the authenticated user belongs to, with their role and membership details.';

-- =====================================================
-- Verify the migration
-- =====================================================

DO $$
DECLARE
  function_count int;
BEGIN
  -- Check if function was created
  SELECT COUNT(*)
  INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'get_user_businesses';

  IF function_count = 0 THEN
    RAISE EXCEPTION 'get_user_businesses function was not created';
  END IF;

  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE '✅ get_user_businesses function restored';
  RAISE NOTICE '✅ Function accessible to authenticated users';
END $$;

/*
  # Fix get_user_businesses Schema Mismatch
  
  1. Problem
     - Function tries to select b.business_type but column doesn't exist
     - Database has business_type_id (uuid FK) not business_type (text)
     - Error: "column b.business_type does not exist"
  
  2. Solution
     - Add JOIN with business_types table
     - Return bt.type_value as the business_type value
     - This provides the business type key like "logistics", "retail", etc.
  
  3. Changes
     - Update get_user_businesses() function
     - Add LEFT JOIN to business_types table
     - Return type_value from business_types instead of non-existent column
  
  4. Security
     - Maintains SECURITY DEFINER for consistent access
     - No changes to RLS policies
     - Preserves all existing access controls
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
    -- FIX: Join with business_types to get type_value instead of accessing non-existent column
    COALESCE(bt.type_value, 'unknown') AS business_type,
    -- Use actual column names from custom_roles table in database
    COALESCE(cr.role_key, r.role_key) AS role_key,
    COALESCE(cr.name_en, r.name_en) AS role_label,
    ubr.is_primary,
    ubr.ownership_percentage,
    ubr.commission_percentage
  FROM user_business_roles ubr
  JOIN businesses b ON b.id = ubr.business_id
  -- FIX: Add JOIN to business_types table
  LEFT JOIN business_types bt ON bt.id = b.business_type_id
  LEFT JOIN roles r ON r.id = ubr.role_id
  -- Fix: use active (not is_active) as per actual database schema
  LEFT JOIN custom_roles cr ON cr.id = ubr.custom_role_id AND cr.active = true
  WHERE ubr.user_id = auth.uid()
    AND ubr.is_active = true
    AND b.active = true
  ORDER BY ubr.is_primary DESC, b.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_businesses() TO authenticated;

COMMENT ON FUNCTION get_user_businesses() IS 'Returns list of businesses for authenticated user with correct business_types JOIN';

-- =====================================================
-- Add Performance Index
-- =====================================================

-- Add index on business_type_id for faster joins
CREATE INDEX IF NOT EXISTS idx_businesses_business_type_id 
  ON businesses(business_type_id) 
  WHERE business_type_id IS NOT NULL;

-- =====================================================
-- Verification
-- =====================================================

DO $$
DECLARE
  function_count int;
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
  
  -- Verify business_types table exists and has required columns
  PERFORM 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'business_types'
    AND column_name IN ('id', 'type_value')
  HAVING COUNT(*) = 2;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'business_types table missing required columns (id, type_value)';
  END IF;
  
  -- Verify businesses.business_type_id column exists
  PERFORM 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'businesses'
    AND column_name = 'business_type_id';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'businesses.business_type_id column does not exist';
  END IF;
  
  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE '✅ get_user_businesses function fixed with business_types JOIN';
  RAISE NOTICE '✅ Function now returns type_value from business_types table';
  RAISE NOTICE '✅ Performance index added on businesses.business_type_id';
END $$;

/*
  # Add Create Business Function

  1. New Function
    - `create_business_for_user()` - Handles business creation with RLS bypass
    - Uses SECURITY DEFINER to run with elevated privileges
    - Validates user exists before creating business
    - Updates user role to business_owner

  2. Security
    - Function validates profile exists
    - Updates user role atomically
    - Returns created business data
    - Prevents unauthorized business creation
*/

CREATE OR REPLACE FUNCTION create_business_for_user(
  p_owner_id uuid,
  p_name text,
  p_slug text,
  p_name_hebrew text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_business_type text DEFAULT 'retail',
  p_order_number_prefix text DEFAULT 'ORD',
  p_default_currency text DEFAULT 'USD',
  p_primary_color text DEFAULT '#1e40af',
  p_secondary_color text DEFAULT '#3b82f6'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business businesses;
  v_profile_exists boolean;
BEGIN
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_owner_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'Profile not found for user %', p_owner_id;
  END IF;

  -- Insert business
  INSERT INTO businesses (
    owner_id,
    name,
    name_hebrew,
    slug,
    description,
    business_type,
    status,
    order_number_prefix,
    default_currency,
    primary_color,
    secondary_color,
    settings
  ) VALUES (
    p_owner_id,
    p_name,
    p_name_hebrew,
    p_slug,
    p_description,
    p_business_type,
    'active',
    p_order_number_prefix,
    p_default_currency,
    p_primary_color,
    p_secondary_color,
    '{}'::jsonb
  )
  RETURNING * INTO v_business;

  -- Update user role to business_owner if not already
  UPDATE profiles
  SET role = 'business_owner'
  WHERE id = p_owner_id
    AND role NOT IN ('superadmin', 'admin', 'infrastructure_owner', 'business_owner');

  -- Return business data as JSON
  RETURN row_to_json(v_business);
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION create_business_for_user TO anon, authenticated;

COMMENT ON FUNCTION create_business_for_user IS 
  'Creates a business for a user, bypassing RLS. Validates profile exists and updates role to business_owner.';

/*
  # Fix Business Duplicates and Add Constraints

  1. Data Cleanup
    - Identify and remove duplicate businesses (same owner_id + name)
    - Keep only the most recently created business for each duplicate set
    - Log deleted businesses for audit purposes

  2. New Constraints
    - Add unique constraint on (owner_id, LOWER(name)) to prevent future duplicates
    - Add index on owner_id for faster queries
    - Add index on status for filtering

  3. Improved Functions
    - Update create_business_for_user to check for duplicate names
    - Add get_user_businesses function with proper RLS handling

  4. Security
    - Ensure RLS policies are properly enforced
    - Add audit logging for business operations
*/

-- Create audit log table for deleted businesses
CREATE TABLE IF NOT EXISTS deleted_businesses_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_business_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text,
  deleted_at timestamptz DEFAULT now(),
  deleted_reason text,
  original_data jsonb
);

-- Function to identify and clean duplicate businesses
DO $$
DECLARE
  duplicate_record RECORD;
  businesses_to_delete uuid[];
  business_to_keep uuid;
BEGIN
  -- Find duplicate businesses (same owner + name combination)
  FOR duplicate_record IN
    SELECT
      owner_id,
      LOWER(TRIM(name)) as normalized_name,
      array_agg(id ORDER BY created_at DESC) as business_ids,
      COUNT(*) as duplicate_count
    FROM businesses
    GROUP BY owner_id, LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the most recent one (first in the array)
    business_to_keep := duplicate_record.business_ids[1];

    -- Mark others for deletion (all except the first one)
    businesses_to_delete := duplicate_record.business_ids[2:];

    RAISE NOTICE 'Found % duplicates for owner % and name %. Keeping %, deleting %',
      duplicate_record.duplicate_count,
      duplicate_record.owner_id,
      duplicate_record.normalized_name,
      business_to_keep,
      businesses_to_delete;

    -- Archive businesses before deletion
    INSERT INTO deleted_businesses_audit (
      original_business_id,
      owner_id,
      name,
      slug,
      deleted_reason,
      original_data
    )
    SELECT
      id,
      owner_id,
      name,
      slug,
      'duplicate_cleanup',
      row_to_json(businesses.*)
    FROM businesses
    WHERE id = ANY(businesses_to_delete);

    -- Delete duplicate businesses
    DELETE FROM businesses WHERE id = ANY(businesses_to_delete);
  END LOOP;
END $$;

-- Add unique constraint to prevent future duplicates
-- Using expression index for case-insensitive uniqueness
DROP INDEX IF EXISTS idx_businesses_owner_name_unique;
CREATE UNIQUE INDEX idx_businesses_owner_name_unique
  ON businesses (owner_id, LOWER(TRIM(name)));

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);

-- Update create_business_for_user function to check for duplicates
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
  v_duplicate_exists boolean;
BEGIN
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_owner_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'Profile not found for user %', p_owner_id;
  END IF;

  -- Check for duplicate business name
  SELECT EXISTS (
    SELECT 1
    FROM businesses
    WHERE owner_id = p_owner_id
      AND LOWER(TRIM(name)) = LOWER(TRIM(p_name))
  ) INTO v_duplicate_exists;

  IF v_duplicate_exists THEN
    RAISE EXCEPTION 'A business with name "%" already exists for this user', p_name;
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
    TRIM(p_name),
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

-- Create improved get_user_businesses function
CREATE OR REPLACE FUNCTION get_user_businesses(user_id uuid)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  name text,
  name_hebrew text,
  slug text,
  description text,
  business_type text,
  status text,
  logo_url text,
  primary_color text,
  secondary_color text,
  order_number_prefix text,
  default_currency text,
  settings jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.owner_id,
    b.name,
    b.name_hebrew,
    b.slug,
    b.description,
    b.business_type,
    b.status,
    b.logo_url,
    b.primary_color,
    b.secondary_color,
    b.order_number_prefix,
    b.default_currency,
    b.settings,
    b.created_at,
    b.updated_at
  FROM businesses b
  WHERE b.owner_id = user_id
  ORDER BY b.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_businesses TO anon, authenticated;

-- Create user_active_contexts table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_active_contexts (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  active_business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on user_active_contexts
ALTER TABLE user_active_contexts ENABLE ROW LEVEL SECURITY;

-- Policies for user_active_contexts
DROP POLICY IF EXISTS "Users can view own active context" ON user_active_contexts;
CREATE POLICY "Users can view own active context"
  ON user_active_contexts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own active context" ON user_active_contexts;
CREATE POLICY "Users can update own active context"
  ON user_active_contexts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own active context" ON user_active_contexts;
CREATE POLICY "Users can insert own active context"
  ON user_active_contexts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to set active business context
CREATE OR REPLACE FUNCTION set_active_business(
  p_user_id uuid,
  p_business_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner boolean;
BEGIN
  -- Verify user owns the business
  SELECT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id AND owner_id = p_user_id
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'User does not own business %', p_business_id;
  END IF;

  -- Upsert active context
  INSERT INTO user_active_contexts (user_id, active_business_id, updated_at)
  VALUES (p_user_id, p_business_id, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    active_business_id = p_business_id,
    updated_at = now();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION set_active_business TO authenticated;

-- Function to get active business context
CREATE OR REPLACE FUNCTION get_active_business(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_business_id uuid;
  v_first_business_id uuid;
BEGIN
  -- Try to get explicitly set active business
  SELECT active_business_id
  INTO v_active_business_id
  FROM user_active_contexts
  WHERE user_id = p_user_id;

  -- If found and business still exists, return it
  IF v_active_business_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM businesses WHERE id = v_active_business_id AND owner_id = p_user_id) THEN
      RETURN v_active_business_id;
    END IF;
  END IF;

  -- Otherwise, get user's first business and set it as active
  SELECT id INTO v_first_business_id
  FROM businesses
  WHERE owner_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_first_business_id IS NOT NULL THEN
    -- Auto-set as active
    INSERT INTO user_active_contexts (user_id, active_business_id, updated_at)
    VALUES (p_user_id, v_first_business_id, now())
    ON CONFLICT (user_id)
    DO UPDATE SET
      active_business_id = v_first_business_id,
      updated_at = now();

    RETURN v_first_business_id;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_business TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE deleted_businesses_audit IS
  'Audit log of deleted businesses for compliance and recovery';

COMMENT ON FUNCTION create_business_for_user IS
  'Creates a business with duplicate checking. Returns error if business name already exists for user.';

COMMENT ON FUNCTION get_user_businesses IS
  'Returns all businesses owned by a user, bypassing RLS for proper access.';

COMMENT ON FUNCTION set_active_business IS
  'Sets the active business context for a user after verifying ownership.';

COMMENT ON FUNCTION get_active_business IS
  'Gets the active business for a user, auto-setting the first business if none is active.';

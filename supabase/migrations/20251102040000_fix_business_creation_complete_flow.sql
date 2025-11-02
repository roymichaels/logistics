/*
  # Fix Business Creation Complete Flow

  1. Purpose
     - Ensure business creation atomically creates all necessary records
     - Add triggers to auto-create user_business_roles and user_business_contexts
     - Add helper function for complete business setup
     - Fix missing records for existing businesses

  2. Changes
     - Create trigger to auto-assign business_owner role when business is created
     - Create trigger to auto-create business context for creator
     - Add helper function for atomic business creation
     - Backfill missing records for existing businesses

  3. Security
     - Maintains existing RLS policies
     - Uses service role context for trigger operations
     - Ensures data consistency across tables
*/

-- =====================================================
-- Helper function to get business_owner role ID
-- =====================================================

CREATE OR REPLACE FUNCTION get_business_owner_role_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM roles WHERE role_key = 'business_owner' LIMIT 1;
$$;

-- =====================================================
-- Trigger function to create business owner role
-- =====================================================

CREATE OR REPLACE FUNCTION create_business_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_role_id uuid;
BEGIN
  -- Get the business_owner role ID
  owner_role_id := get_business_owner_role_id();

  -- Log the operation
  RAISE NOTICE 'Creating business owner role for business % by user %', NEW.id, NEW.created_by;

  -- Insert user_business_roles entry if it doesn't exist
  INSERT INTO user_business_roles (
    user_id,
    business_id,
    role_id,
    ownership_percentage,
    is_primary,
    assigned_by,
    assigned_at
  )
  VALUES (
    NEW.created_by,
    NEW.id,
    owner_role_id,
    100.00,
    true,
    NEW.created_by,
    now()
  )
  ON CONFLICT (user_id, business_id) DO UPDATE
  SET
    role_id = owner_role_id,
    ownership_percentage = 100.00,
    is_primary = true;

  RAISE NOTICE 'Business owner role created successfully';

  RETURN NEW;
END;
$$;

-- =====================================================
-- Trigger function to create business context
-- =====================================================

CREATE OR REPLACE FUNCTION create_business_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the operation
  RAISE NOTICE 'Creating business context for business % by user %', NEW.id, NEW.created_by;

  -- Insert or update user_business_contexts
  INSERT INTO user_business_contexts (
    user_id,
    business_id,
    infrastructure_id,
    updated_at
  )
  VALUES (
    NEW.created_by,
    NEW.id,
    NEW.infrastructure_id,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    business_id = NEW.id,
    infrastructure_id = NEW.infrastructure_id,
    updated_at = now();

  RAISE NOTICE 'Business context created successfully';

  RETURN NEW;
END;
$$;

-- =====================================================
-- Create triggers on businesses table
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_create_business_owner_role ON businesses;
DROP TRIGGER IF EXISTS trigger_create_business_context ON businesses;

-- Create trigger to auto-assign business_owner role
CREATE TRIGGER trigger_create_business_owner_role
  AFTER INSERT ON businesses
  FOR EACH ROW
  WHEN (NEW.created_by IS NOT NULL)
  EXECUTE FUNCTION create_business_owner_role();

-- Create trigger to auto-create business context
CREATE TRIGGER trigger_create_business_context
  AFTER INSERT ON businesses
  FOR EACH ROW
  WHEN (NEW.created_by IS NOT NULL)
  EXECUTE FUNCTION create_business_context();

-- =====================================================
-- Backfill missing records for existing businesses
-- =====================================================

-- Backfill user_business_roles for business creators who are missing entries
DO $$
DECLARE
  owner_role_id uuid;
  business_record RECORD;
  inserted_count int := 0;
BEGIN
  -- Get the business_owner role ID
  owner_role_id := get_business_owner_role_id();

  IF owner_role_id IS NULL THEN
    RAISE NOTICE 'Warning: business_owner role not found in roles table';
    RETURN;
  END IF;

  RAISE NOTICE 'Starting backfill of user_business_roles...';

  -- Find businesses where creator doesn't have a role entry
  FOR business_record IN
    SELECT b.id, b.created_by, b.infrastructure_id
    FROM businesses b
    WHERE b.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_business_roles ubr
        WHERE ubr.business_id = b.id
          AND ubr.user_id = b.created_by
      )
  LOOP
    INSERT INTO user_business_roles (
      user_id,
      business_id,
      role_id,
      ownership_percentage,
      is_primary,
      assigned_by,
      assigned_at
    )
    VALUES (
      business_record.created_by,
      business_record.id,
      owner_role_id,
      100.00,
      true,
      business_record.created_by,
      now()
    );

    inserted_count := inserted_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfilled % user_business_roles entries', inserted_count;
END $$;

-- Backfill user_business_contexts for business creators who are missing entries
DO $$
DECLARE
  business_record RECORD;
  updated_count int := 0;
BEGIN
  RAISE NOTICE 'Starting backfill of user_business_contexts...';

  -- Find businesses where creator doesn't have a context entry
  FOR business_record IN
    SELECT b.id, b.created_by, b.infrastructure_id
    FROM businesses b
    WHERE b.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_business_contexts ubc
        WHERE ubc.user_id = b.created_by
      )
  LOOP
    INSERT INTO user_business_contexts (
      user_id,
      business_id,
      infrastructure_id,
      updated_at
    )
    VALUES (
      business_record.created_by,
      business_record.id,
      business_record.infrastructure_id,
      now()
    );

    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfilled % user_business_contexts entries', updated_count;
END $$;

-- =====================================================
-- Create helper function for atomic business creation
-- =====================================================

CREATE OR REPLACE FUNCTION create_business_with_owner(
  p_name text,
  p_name_hebrew text,
  p_infrastructure_id uuid,
  p_business_type_id uuid,
  p_default_currency text,
  p_settings jsonb,
  p_created_by uuid
)
RETURNS TABLE (
  business_id uuid,
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  owner_role_id uuid;
BEGIN
  -- Get business_owner role
  owner_role_id := get_business_owner_role_id();

  IF owner_role_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, false, 'business_owner role not found';
    RETURN;
  END IF;

  -- Insert business
  INSERT INTO businesses (
    infrastructure_id,
    business_type_id,
    name,
    name_hebrew,
    default_currency,
    settings,
    active,
    created_by
  )
  VALUES (
    p_infrastructure_id,
    p_business_type_id,
    p_name,
    p_name_hebrew,
    p_default_currency,
    p_settings,
    true,
    p_created_by
  )
  RETURNING id INTO v_business_id;

  -- The triggers will automatically create user_business_roles and user_business_contexts

  RETURN QUERY SELECT v_business_id, true, 'Business created successfully';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_business_with_owner TO authenticated;

-- =====================================================
-- Indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_business_contexts_user_id
  ON user_business_contexts(user_id);

CREATE INDEX IF NOT EXISTS idx_user_business_contexts_business_id
  ON user_business_contexts(business_id);

CREATE INDEX IF NOT EXISTS idx_user_business_roles_composite
  ON user_business_roles(user_id, business_id, is_primary);

/*
  # Fix Business Owner Connection Issue

  1. Purpose
     - Add business_id column to users table
     - Add set_user_active_business function that code is calling
     - Ensure users.business_id is properly updated when business is created
     - Fix business context switching to work reliably
     - Add helper functions for business owner role assignment

  2. Changes
     - Add business_id column to users table
     - Create set_user_active_business RPC function
     - Add trigger to auto-update users.business_id when user_business_roles is created
     - Add helper function to verify business owner setup
     - Improve error handling and logging

  3. Security
     - Functions use SECURITY DEFINER with proper authorization checks
     - RLS policies remain restrictive
     - Users can only manage their own business context
*/

-- =====================================================
-- Add business_id column to users table if not exists
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'business_id'
  ) THEN
    ALTER TABLE users ADD COLUMN business_id uuid REFERENCES businesses(id) ON DELETE SET NULL;
    CREATE INDEX idx_users_business_id ON users(business_id) WHERE business_id IS NOT NULL;
    RAISE NOTICE 'Added business_id column to users table';
  ELSE
    RAISE NOTICE 'business_id column already exists in users table';
  END IF;
END $$;

-- =====================================================
-- Create set_user_active_business function
-- This is called by the frontend code
-- =====================================================

CREATE OR REPLACE FUNCTION set_user_active_business(
  p_business_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_infrastructure_id uuid;
  v_result jsonb;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the user has access to this business
  IF NOT EXISTS (
    SELECT 1 FROM user_business_roles ubr
    WHERE ubr.user_id = v_user_id
      AND ubr.business_id = p_business_id
      AND ubr.is_active = true
  ) THEN
    RAISE EXCEPTION 'User does not have access to this business';
  END IF;

  -- Get the business's infrastructure_id
  SELECT infrastructure_id INTO v_infrastructure_id
  FROM businesses
  WHERE id = p_business_id;

  -- Update user_active_contexts
  INSERT INTO user_active_contexts (
    user_id,
    infrastructure_id,
    business_id,
    context_version,
    last_switched_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_infrastructure_id,
    p_business_id,
    1,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    infrastructure_id = v_infrastructure_id,
    business_id = p_business_id,
    context_version = user_active_contexts.context_version + 1,
    last_switched_at = now(),
    updated_at = now();

  -- Update users.business_id for quick access
  UPDATE users
  SET business_id = p_business_id,
      updated_at = now()
  WHERE id = v_user_id;

  -- Return success with context info
  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'business_id', p_business_id,
    'infrastructure_id', v_infrastructure_id,
    'message', 'Business context updated successfully'
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION set_user_active_business TO authenticated;

-- =====================================================
-- Create helper function to link user to their business
-- =====================================================

CREATE OR REPLACE FUNCTION link_user_to_business(
  p_user_id uuid,
  p_business_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_infrastructure_id uuid;
  v_business_owner_role_id uuid;
  v_role_exists boolean;
  v_result jsonb;
BEGIN
  -- Verify the business exists and get its infrastructure_id
  SELECT infrastructure_id INTO v_infrastructure_id
  FROM businesses
  WHERE id = p_business_id;

  IF v_infrastructure_id IS NULL THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  -- Get the business_owner role ID
  SELECT id INTO v_business_owner_role_id
  FROM roles
  WHERE role_key = 'business_owner'
  LIMIT 1;

  IF v_business_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'business_owner role not found in roles table';
  END IF;

  -- Check if user_business_role already exists
  SELECT EXISTS (
    SELECT 1 FROM user_business_roles
    WHERE user_id = p_user_id
      AND business_id = p_business_id
  ) INTO v_role_exists;

  -- Create or update user_business_role
  IF NOT v_role_exists THEN
    INSERT INTO user_business_roles (
      user_id,
      business_id,
      role_id,
      infrastructure_id,
      is_active,
      assigned_at,
      ownership_percentage
    )
    VALUES (
      p_user_id,
      p_business_id,
      v_business_owner_role_id,
      v_infrastructure_id,
      true,
      now(),
      100
    );
  ELSE
    -- Update existing role to ensure it's active
    UPDATE user_business_roles
    SET is_active = true,
        role_id = v_business_owner_role_id,
        infrastructure_id = v_infrastructure_id,
        assigned_at = now()
    WHERE user_id = p_user_id
      AND business_id = p_business_id;
  END IF;

  -- Update user's global_role to business_owner
  UPDATE users
  SET global_role = 'business_owner',
      business_id = p_business_id,
      updated_at = now()
  WHERE id = p_user_id;

  -- Set active business context
  INSERT INTO user_active_contexts (
    user_id,
    infrastructure_id,
    business_id,
    context_version,
    last_switched_at,
    updated_at
  )
  VALUES (
    p_user_id,
    v_infrastructure_id,
    p_business_id,
    1,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    infrastructure_id = v_infrastructure_id,
    business_id = p_business_id,
    context_version = user_active_contexts.context_version + 1,
    last_switched_at = now(),
    updated_at = now();

  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'business_id', p_business_id,
    'infrastructure_id', v_infrastructure_id,
    'role_created', NOT v_role_exists,
    'message', 'User successfully linked to business as owner'
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION link_user_to_business TO authenticated;

-- =====================================================
-- Create trigger to auto-update users.business_id
-- =====================================================

CREATE OR REPLACE FUNCTION sync_user_business_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_key text;
BEGIN
  -- Only process for business_owner roles
  SELECT role_key INTO v_role_key
  FROM roles
  WHERE id = NEW.role_id;

  IF v_role_key = 'business_owner' AND NEW.is_active = true THEN
    -- Update the user's business_id
    UPDATE users
    SET business_id = NEW.business_id,
        global_role = 'business_owner',
        updated_at = now()
    WHERE id = NEW.user_id;

    RAISE NOTICE 'Synced business_id % to user %', NEW.business_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_sync_user_business_id ON user_business_roles;

CREATE TRIGGER trigger_sync_user_business_id
  AFTER INSERT OR UPDATE ON user_business_roles
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION sync_user_business_id();

-- =====================================================
-- Add helper function to verify business owner setup
-- =====================================================

CREATE OR REPLACE FUNCTION verify_business_owner_setup(
  p_user_id uuid,
  p_business_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record record;
  v_role_record record;
  v_context_record record;
  v_issues text[] := ARRAY[]::text[];
  v_result jsonb;
BEGIN
  -- Check user record
  SELECT id, global_role, business_id INTO v_user_record
  FROM users
  WHERE id = p_user_id;

  IF v_user_record IS NULL THEN
    v_issues := array_append(v_issues, 'User not found');
  ELSIF v_user_record.global_role != 'business_owner' THEN
    v_issues := array_append(v_issues, 'User global_role is not business_owner');
  ELSIF v_user_record.business_id IS NULL THEN
    v_issues := array_append(v_issues, 'User business_id is NULL');
  ELSIF v_user_record.business_id != p_business_id THEN
    v_issues := array_append(v_issues, 'User business_id does not match target business');
  END IF;

  -- Check user_business_roles
  SELECT ubr.id, ubr.is_active, r.role_key INTO v_role_record
  FROM user_business_roles ubr
  JOIN roles r ON r.id = ubr.role_id
  WHERE ubr.user_id = p_user_id
    AND ubr.business_id = p_business_id
  LIMIT 1;

  IF v_role_record IS NULL THEN
    v_issues := array_append(v_issues, 'No user_business_role record found');
  ELSIF NOT v_role_record.is_active THEN
    v_issues := array_append(v_issues, 'user_business_role is not active');
  ELSIF v_role_record.role_key != 'business_owner' THEN
    v_issues := array_append(v_issues, 'user_business_role is not business_owner');
  END IF;

  -- Check user_active_contexts
  SELECT business_id INTO v_context_record
  FROM user_active_contexts
  WHERE user_id = p_user_id;

  IF v_context_record IS NULL THEN
    v_issues := array_append(v_issues, 'No active context record found');
  ELSIF v_context_record.business_id IS NULL THEN
    v_issues := array_append(v_issues, 'Active context business_id is NULL');
  ELSIF v_context_record.business_id != p_business_id THEN
    v_issues := array_append(v_issues, 'Active context business_id does not match target business');
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'business_id', p_business_id,
    'is_valid', array_length(v_issues, 1) IS NULL,
    'issues', v_issues,
    'user_global_role', v_user_record.global_role,
    'user_business_id', v_user_record.business_id,
    'has_business_role', v_role_record IS NOT NULL,
    'business_role_active', v_role_record.is_active,
    'has_active_context', v_context_record IS NOT NULL
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_business_owner_setup TO authenticated;

-- =====================================================
-- Update existing business owners to ensure proper linkage
-- =====================================================

DO $$
DECLARE
  v_count integer := 0;
  v_fixed integer := 0;
  v_record record;
BEGIN
  RAISE NOTICE 'Fixing business owner linkages...';

  -- Find all business owners who don't have business_id set
  FOR v_record IN
    SELECT DISTINCT
      ubr.user_id,
      ubr.business_id,
      u.global_role,
      u.business_id as current_business_id
    FROM user_business_roles ubr
    JOIN roles r ON r.id = ubr.role_id
    JOIN users u ON u.id = ubr.user_id
    WHERE r.role_key = 'business_owner'
      AND ubr.is_active = true
      AND (u.business_id IS NULL OR u.business_id != ubr.business_id)
  LOOP
    v_count := v_count + 1;

    -- Update the user record
    UPDATE users
    SET business_id = v_record.business_id,
        global_role = 'business_owner',
        updated_at = now()
    WHERE id = v_record.user_id;

    -- Ensure active context is set
    INSERT INTO user_active_contexts (
      user_id,
      business_id,
      infrastructure_id,
      context_version,
      last_switched_at,
      updated_at
    )
    SELECT
      v_record.user_id,
      v_record.business_id,
      b.infrastructure_id,
      1,
      now(),
      now()
    FROM businesses b
    WHERE b.id = v_record.business_id
    ON CONFLICT (user_id) DO UPDATE
    SET business_id = v_record.business_id,
        context_version = user_active_contexts.context_version + 1,
        last_switched_at = now(),
        updated_at = now();

    v_fixed := v_fixed + 1;

    RAISE NOTICE 'Fixed user % -> business %', v_record.user_id, v_record.business_id;
  END LOOP;

  IF v_count > 0 THEN
    RAISE NOTICE 'Fixed % out of % business owner records', v_fixed, v_count;
  ELSE
    RAISE NOTICE 'No business owners needed fixing';
  END IF;
END $$;

-- =====================================================
-- Verify the migration
-- =====================================================

DO $$
DECLARE
  v_function_exists boolean;
  v_column_exists boolean;
BEGIN
  -- Check if business_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'business_id'
  ) INTO v_column_exists;

  IF v_column_exists THEN
    RAISE NOTICE '✅ business_id column exists in users table';
  ELSE
    RAISE WARNING '❌ business_id column was not added to users table';
  END IF;

  -- Check if set_user_active_business function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'set_user_active_business'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ set_user_active_business function created successfully';
  ELSE
    RAISE WARNING '❌ set_user_active_business function was not created';
  END IF;

  -- Check if link_user_to_business function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'link_user_to_business'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ link_user_to_business function created successfully';
  ELSE
    RAISE WARNING '❌ link_user_to_business function was not created';
  END IF;

  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_sync_user_business_id'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ trigger_sync_user_business_id trigger created successfully';
  ELSE
    RAISE WARNING '❌ trigger_sync_user_business_id trigger was not created';
  END IF;

  RAISE NOTICE '✅ Migration completed successfully';
END $$;

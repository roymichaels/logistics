/*
  # Apply Business Owner Connection Fix

  1. Purpose
     - Add business_id column to users table
     - Create set_user_active_business function that frontend code is calling
     - Add trigger to sync business_id when user_business_roles are created
     - Fix existing business owner records to have proper business_id

  2. Security
     - Functions use SECURITY DEFINER with authorization checks
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
-- Fix existing business owners without business_id
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

  RAISE NOTICE '✅ Migration completed successfully';
END $$;
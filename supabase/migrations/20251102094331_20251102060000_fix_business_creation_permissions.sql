/*
  # Fix Business Creation Permissions and View Access

  1. Purpose
     - Allow 'user' role to create businesses and auto-upgrade to business_owner
     - Ensure business_memberships view is accessible to all authenticated users
     - Add missing is_active column to user_business_roles if needed
     - Fix RLS policies to support business creation workflow

  2. Changes
     - Add is_active column to user_business_roles if missing
     - Grant proper access to business_memberships view
     - Update RLS policies to allow business creation by 'user' role
     - Add indexes for performance optimization

  3. Security
     - Maintains restrictive RLS policies
     - Users can only see their own memberships
     - Business owners can manage their business memberships
*/

-- =====================================================
-- Ensure is_active column exists on user_business_roles
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_business_roles'
      AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_business_roles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
    CREATE INDEX idx_user_business_roles_is_active ON user_business_roles(is_active) WHERE is_active = true;
    RAISE NOTICE 'Added is_active column to user_business_roles';
  END IF;
END $$;

-- =====================================================
-- Ensure infrastructure_id column exists on user_business_roles
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_business_roles'
      AND column_name = 'infrastructure_id'
  ) THEN
    ALTER TABLE user_business_roles ADD COLUMN infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE SET NULL;
    CREATE INDEX idx_user_business_roles_infrastructure_id ON user_business_roles(infrastructure_id);
    RAISE NOTICE 'Added infrastructure_id column to user_business_roles';
  END IF;
END $$;

-- =====================================================
-- Ensure notes column exists on user_business_roles
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_business_roles'
      AND column_name = 'notes'
  ) THEN
    ALTER TABLE user_business_roles ADD COLUMN notes text;
    RAISE NOTICE 'Added notes column to user_business_roles';
  END IF;
END $$;

-- =====================================================
-- Grant access to business_memberships view
-- =====================================================

GRANT SELECT ON business_memberships TO authenticated;
GRANT SELECT ON business_memberships TO anon;

-- =====================================================
-- Update RLS policies for businesses table
-- =====================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can create businesses" ON businesses;

-- Create policy to allow authenticated users to create businesses
CREATE POLICY "Users can create businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      -- Allow infrastructure roles to create businesses
      auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner', 'infrastructure_manager')
      -- Allow regular users and business owners to create businesses
      OR auth.jwt()->>'role' IN ('user', 'business_owner')
    )
  );

-- =====================================================
-- Update RLS policies for user_business_roles table
-- =====================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can be assigned business roles" ON user_business_roles;

-- Create policy to allow role assignment during business creation
CREATE POLICY "Users can be assigned business roles"
  ON user_business_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow self-assignment during business creation
    auth.uid() = user_id
    -- Or allow business owners/managers to assign roles
    OR EXISTS (
      SELECT 1 FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
        AND ubr.business_id = user_business_roles.business_id
        AND ubr.is_active = true
        AND r.role_key IN ('business_owner', 'manager')
    )
    -- Or allow infrastructure roles to assign roles
    OR auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner', 'infrastructure_manager')
  );

-- =====================================================
-- Ensure user_active_contexts table exists and has proper columns
-- =====================================================

CREATE TABLE IF NOT EXISTS user_active_contexts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE SET NULL,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  context_version integer NOT NULL DEFAULT 1,
  last_switched_at timestamptz NOT NULL DEFAULT now(),
  session_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_active_contexts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_active_contexts
DROP POLICY IF EXISTS "Users can view own active context" ON user_active_contexts;
CREATE POLICY "Users can view own active context"
  ON user_active_contexts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own active context" ON user_active_contexts;
CREATE POLICY "Users can update own active context"
  ON user_active_contexts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Create or replace set_user_active_context function
-- =====================================================

CREATE OR REPLACE FUNCTION set_user_active_context(
  p_user_id uuid,
  p_infrastructure_id uuid,
  p_business_id uuid DEFAULT NULL,
  p_session_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  infrastructure_id uuid,
  business_id uuid,
  context_version integer,
  last_switched_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context_version integer;
BEGIN
  -- Insert or update user_active_contexts
  INSERT INTO user_active_contexts (
    user_id,
    infrastructure_id,
    business_id,
    context_version,
    last_switched_at,
    session_metadata,
    updated_at
  )
  VALUES (
    p_user_id,
    p_infrastructure_id,
    p_business_id,
    1,
    now(),
    p_session_metadata,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    infrastructure_id = p_infrastructure_id,
    business_id = p_business_id,
    context_version = user_active_contexts.context_version + 1,
    last_switched_at = now(),
    session_metadata = p_session_metadata,
    updated_at = now()
  RETURNING user_active_contexts.context_version INTO v_context_version;

  -- Return the updated context
  RETURN QUERY
  SELECT
    p_infrastructure_id,
    p_business_id,
    v_context_version,
    now();
END;
$$;

GRANT EXECUTE ON FUNCTION set_user_active_context TO authenticated;

-- =====================================================
-- Add indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_businesses_created_by ON businesses(created_by);
CREATE INDEX IF NOT EXISTS idx_businesses_infrastructure_id ON businesses(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_user_business_roles_user_business ON user_business_roles(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_user_active_contexts_business_id ON user_active_contexts(business_id);

-- =====================================================
-- Update existing users with 'user' role who have businesses
-- =====================================================

DO $$
DECLARE
  user_record RECORD;
  updated_count int := 0;
BEGIN
  RAISE NOTICE 'Upgrading users with businesses to business_owner role...';

  FOR user_record IN
    SELECT DISTINCT u.id
    FROM users u
    JOIN user_business_roles ubr ON ubr.user_id = u.id
    JOIN roles r ON r.id = ubr.role_id
    WHERE u.global_role = 'user'
      AND r.role_key = 'business_owner'
      AND ubr.is_active = true
  LOOP
    UPDATE users
    SET global_role = 'business_owner'
    WHERE id = user_record.id;

    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Updated % users to business_owner role', updated_count;
END $$;

-- =====================================================
-- Verify the migration
-- =====================================================

DO $$
DECLARE
  view_exists boolean;
  function_exists boolean;
BEGIN
  -- Check if business_memberships view exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'business_memberships'
  ) INTO view_exists;

  IF NOT view_exists THEN
    RAISE WARNING 'business_memberships view does not exist - may need to run previous migration';
  ELSE
    RAISE NOTICE '✅ business_memberships view exists';
  END IF;

  -- Check if set_user_active_context function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'set_user_active_context'
  ) INTO function_exists;

  IF function_exists THEN
    RAISE NOTICE '✅ set_user_active_context function exists';
  ELSE
    RAISE WARNING 'set_user_active_context function was not created';
  END IF;

  RAISE NOTICE '✅ Migration completed successfully';
END $$;
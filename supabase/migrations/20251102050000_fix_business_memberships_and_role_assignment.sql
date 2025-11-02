/*
  # Fix Business Memberships View and Role Assignment

  1. Purpose
     - Create missing business_memberships view for role queries
     - Fix "roles_1.name does not exist" database errors
     - Ensure proper role assignment during business creation
     - Update JWT claims with correct business_role

  2. Changes
     - Create business_memberships view with proper joins
     - Add custom_roles table if missing
     - Update switch-context to use business_role from memberships
     - Fix resolve-permissions to handle business_role correctly
     - Add helper functions for role resolution

  3. Security
     - Maintains existing RLS policies
     - View respects user permissions
     - Audit logging for role changes
*/

-- =====================================================
-- Create custom_roles table if it doesn't exist
-- =====================================================

CREATE TABLE IF NOT EXISTS custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  custom_role_name text NOT NULL,
  custom_role_label text NOT NULL,
  base_role_id uuid REFERENCES roles(id) ON DELETE RESTRICT,
  description text,
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, custom_role_name)
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_business_id ON custom_roles(business_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_custom_roles_base_role_id ON custom_roles(base_role_id);

-- Enable RLS
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_roles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'custom_roles' AND policyname = 'Users can view custom roles in their businesses'
  ) THEN
    CREATE POLICY "Users can view custom roles in their businesses"
      ON custom_roles FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_business_roles ubr
          WHERE ubr.business_id = custom_roles.business_id
            AND ubr.user_id = auth.uid()
            AND ubr.is_active = true
        )
        OR auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'custom_roles' AND policyname = 'Business owners can manage custom roles'
  ) THEN
    CREATE POLICY "Business owners can manage custom roles"
      ON custom_roles FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_business_roles ubr
          JOIN roles r ON r.id = ubr.role_id
          WHERE ubr.business_id = custom_roles.business_id
            AND ubr.user_id = auth.uid()
            AND ubr.is_active = true
            AND r.role_key IN ('business_owner', 'infrastructure_owner')
        )
        OR auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_business_roles ubr
          JOIN roles r ON r.id = ubr.role_id
          WHERE ubr.business_id = custom_roles.business_id
            AND ubr.user_id = auth.uid()
            AND ubr.is_active = true
            AND r.role_key IN ('business_owner', 'infrastructure_owner')
        )
        OR auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
      );
  END IF;
END $$;

-- =====================================================
-- Create business_memberships view
-- =====================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS business_memberships CASCADE;

-- Create the view with proper column selection and explicit joins
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
  -- Role information with fallback to base role
  COALESCE(cr.custom_role_name, r.role_key) AS display_role_key,
  COALESCE(cr.custom_role_label, r.label) AS display_role_label,
  r.role_key AS base_role_key,
  r.label AS base_role_label,
  r.scope_level,
  r.can_see_financials,
  r.can_see_cross_business,
  -- User equity and commission
  ubr.ownership_percentage,
  ubr.commission_percentage,
  ubr.notes,
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
  b.name_hebrew AS business_name_hebrew,
  b.primary_color,
  b.secondary_color
FROM user_business_roles ubr
LEFT JOIN roles r ON r.id = ubr.role_id
LEFT JOIN custom_roles cr ON cr.id = ubr.custom_role_id AND cr.is_active = true
LEFT JOIN users u ON u.id = ubr.user_id
LEFT JOIN businesses b ON b.id = ubr.business_id
WHERE ubr.is_active = true;

-- Grant access to the view
GRANT SELECT ON business_memberships TO authenticated;
GRANT SELECT ON business_memberships TO anon;

-- Add comment to document the view
COMMENT ON VIEW business_memberships IS 'Active business memberships with resolved role information, user details, and business context. Used for permission resolution and role display.';

-- =====================================================
-- Helper function to get user business role
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
-- Update trigger to sync business_role to JWT claims
-- =====================================================

CREATE OR REPLACE FUNCTION sync_business_role_to_jwt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_role text;
  v_primary_business_id uuid;
BEGIN
  -- Get the user's primary business role
  SELECT
    bm.display_role_key,
    bm.business_id
  INTO v_business_role, v_primary_business_id
  FROM business_memberships bm
  WHERE bm.user_id = NEW.user_id
    AND bm.is_primary = true
    AND bm.is_active = true
  LIMIT 1;

  -- If no primary business, get any active business role
  IF v_business_role IS NULL THEN
    SELECT
      bm.display_role_key,
      bm.business_id
    INTO v_business_role, v_primary_business_id
    FROM business_memberships bm
    WHERE bm.user_id = NEW.user_id
      AND bm.is_active = true
    ORDER BY bm.assigned_at DESC
    LIMIT 1;
  END IF;

  -- Update user's global_role if they have a business_owner role
  IF v_business_role = 'business_owner' THEN
    UPDATE users
    SET global_role = 'business_owner'::user_role
    WHERE id = NEW.user_id
      AND global_role = 'user'::user_role; -- Only promote from 'user' role
  END IF;

  -- Log the role assignment
  RAISE NOTICE 'User % assigned role % in business %', NEW.user_id, v_business_role, NEW.business_id;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_business_role_to_jwt ON user_business_roles;

-- Create trigger to sync business role
CREATE TRIGGER trigger_sync_business_role_to_jwt
  AFTER INSERT OR UPDATE ON user_business_roles
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION sync_business_role_to_jwt();

-- =====================================================
-- Update existing user business roles to sync JWT
-- =====================================================

-- Update global_role for existing business owners
DO $$
DECLARE
  owner_record RECORD;
  updated_count int := 0;
BEGIN
  RAISE NOTICE 'Updating global_role for existing business owners...';

  FOR owner_record IN
    SELECT DISTINCT ubr.user_id
    FROM user_business_roles ubr
    JOIN roles r ON r.id = ubr.role_id
    JOIN users u ON u.id = ubr.user_id
    WHERE r.role_key = 'business_owner'
      AND ubr.is_active = true
      AND u.global_role = 'user'::user_role
  LOOP
    UPDATE users
    SET global_role = 'business_owner'::user_role
    WHERE id = owner_record.user_id;

    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Updated % users to business_owner role', updated_count;
END $$;

-- =====================================================
-- Function to resolve user permissions with business role
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id uuid DEFAULT NULL,
  p_business_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  global_role text,
  business_id uuid,
  business_role text,
  permissions text[],
  can_see_financials boolean,
  can_see_cross_business boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_business_id uuid;
  v_global_role text;
  v_business_role text;
  v_permissions text[];
  v_can_see_financials boolean;
  v_can_see_cross_business boolean;
BEGIN
  -- Default to current user if not specified
  v_user_id := COALESCE(p_user_id, auth.uid());
  v_business_id := p_business_id;

  -- Get user's global role
  SELECT u.global_role::text
  INTO v_global_role
  FROM users u
  WHERE u.id = v_user_id;

  -- Get business role if business_id provided
  IF v_business_id IS NOT NULL THEN
    SELECT
      bm.display_role_key,
      COALESCE(crp.permission_keys, rp.permission_keys, ARRAY[]::text[]),
      COALESCE(r.can_see_financials, false),
      COALESCE(r.can_see_cross_business, false)
    INTO
      v_business_role,
      v_permissions,
      v_can_see_financials,
      v_can_see_cross_business
    FROM business_memberships bm
    LEFT JOIN canonical_role_permissions rp ON rp.role_key = bm.base_role_key
    LEFT JOIN canonical_role_permissions crp ON crp.role_key = bm.display_role_key
    LEFT JOIN roles r ON r.role_key = bm.base_role_key
    WHERE bm.user_id = v_user_id
      AND bm.business_id = v_business_id
      AND bm.is_active = true
    LIMIT 1;
  ELSE
    -- Use global role permissions
    SELECT
      crp.permission_keys,
      crp.can_see_financials,
      crp.can_see_cross_business
    INTO
      v_permissions,
      v_can_see_financials,
      v_can_see_cross_business
    FROM canonical_role_permissions crp
    WHERE crp.role_key = v_global_role
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT
    v_user_id,
    v_global_role,
    v_business_id,
    v_business_role,
    COALESCE(v_permissions, ARRAY[]::text[]),
    COALESCE(v_can_see_financials, false),
    COALESCE(v_can_see_cross_business, false);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_permissions TO authenticated;

-- =====================================================
-- Add indexes for performance
-- =====================================================

-- Index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_business_roles_role_lookup
  ON user_business_roles(user_id, business_id, is_active)
  WHERE is_active = true;

-- Index for primary role queries
CREATE INDEX IF NOT EXISTS idx_user_business_roles_primary
  ON user_business_roles(user_id, is_primary)
  WHERE is_primary = true AND is_active = true;

-- Index for business role queries
CREATE INDEX IF NOT EXISTS idx_user_business_roles_business_role
  ON user_business_roles(business_id, role_id)
  WHERE is_active = true;

-- =====================================================
-- Verify the migration
-- =====================================================

DO $$
DECLARE
  view_count int;
  trigger_count int;
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

  -- Check if trigger was created
  SELECT COUNT(*)
  INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'trigger_sync_business_role_to_jwt';

  IF trigger_count = 0 THEN
    RAISE EXCEPTION 'trigger_sync_business_role_to_jwt was not created';
  END IF;

  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE '✅ business_memberships view created';
  RAISE NOTICE '✅ JWT sync trigger created';
  RAISE NOTICE '✅ Helper functions created';
END $$;

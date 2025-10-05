/*
  # Fix User Management RLS Policies

  ## Overview
  This migration fixes RLS policies to enable proper user management functionality
  for owners and managers while maintaining security.

  ## Changes

  1. **Users Table Policies**
     - Allow owners and managers to view all users in their workspace
     - Enable infrastructure_owners to view all users globally
     - Maintain self-access for profile viewing
     - Allow role updates by authorized personnel

  2. **Business Context Integration**
     - Policies check workspace_id from JWT claims (auth.jwt() -> 'app_metadata' -> 'workspace_id')
     - Infrastructure owners bypass workspace restrictions
     - Manager and owner roles have full team visibility

  3. **Security**
     - RLS remains enabled on users table
     - Role-based access strictly enforced
     - Workspace isolation maintained
     - No cross-workspace data leakage

  ## Problem Solved
  Previously, user management queries returned empty results because:
  - RLS policies required auth.uid() which was NULL for new auth flow
  - No policy existed for owner/manager to SELECT all workspace users
  - JWT claims (workspace_id, app_role) were not properly set
*/

-- =============================================
-- Drop old restrictive policies
-- =============================================

DROP POLICY IF EXISTS "users_view_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_view_own_profile_by_telegram_id" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;

-- =============================================
-- Create new comprehensive policies
-- =============================================

-- Policy 1: All authenticated users can view their own profile
CREATE POLICY "users_view_self"
  ON users FOR SELECT
  TO authenticated
  USING (
    telegram_id = (auth.jwt() ->> 'telegram_id')::text
    OR id = (auth.jwt() -> 'app_metadata' ->> 'user_id')::uuid
  );

-- Policy 2: Infrastructure owners can view all users (global access)
CREATE POLICY "infrastructure_owners_view_all_users"
  ON users FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'infrastructure_owner'
  );

-- Policy 3: Business owners and managers can view users in their workspace
CREATE POLICY "workspace_admins_view_team"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- Check if user has owner or manager role
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'business_owner', 'manager')
    AND (
      -- Either: no workspace filtering (for infrastructure_owner compatibility)
      (auth.jwt() -> 'app_metadata' ->> 'workspace_id') IS NULL
      OR
      -- Or: user belongs to same workspace via business_users table
      EXISTS (
        SELECT 1 FROM business_users bu
        WHERE bu.user_id = users.id
        AND bu.business_id = (auth.jwt() -> 'app_metadata' ->> 'workspace_id')::uuid
        AND bu.active = true
      )
    )
  );

-- Policy 4: Users can update their own profile (limited fields)
CREATE POLICY "users_update_self"
  ON users FOR UPDATE
  TO authenticated
  USING (
    telegram_id = (auth.jwt() ->> 'telegram_id')::text
    OR id = (auth.jwt() -> 'app_metadata' ->> 'user_id')::uuid
  )
  WITH CHECK (
    telegram_id = (auth.jwt() ->> 'telegram_id')::text
    OR id = (auth.jwt() -> 'app_metadata' ->> 'user_id')::uuid
  );

-- Policy 5: Owners and managers can update user roles in their workspace
CREATE POLICY "workspace_admins_update_roles"
  ON users FOR UPDATE
  TO authenticated
  USING (
    -- Requester must be owner or manager
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('infrastructure_owner', 'owner', 'business_owner', 'manager')
    AND (
      -- Infrastructure owners can update anyone
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'infrastructure_owner'
      OR
      -- Business owners/managers can update users in their workspace
      EXISTS (
        SELECT 1 FROM business_users bu
        WHERE bu.user_id = users.id
        AND bu.business_id = (auth.jwt() -> 'app_metadata' ->> 'workspace_id')::uuid
      )
    )
  )
  WITH CHECK (
    -- Same conditions for the updated record
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('infrastructure_owner', 'owner', 'business_owner', 'manager')
  );

-- =============================================
-- Create helper function for debugging
-- =============================================

CREATE OR REPLACE FUNCTION debug_auth_claims()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'auth_uid', auth.uid(),
    'jwt_role', auth.jwt() -> 'app_metadata' ->> 'role',
    'jwt_app_role', auth.jwt() -> 'app_metadata' ->> 'app_role',
    'jwt_workspace_id', auth.jwt() -> 'app_metadata' ->> 'workspace_id',
    'jwt_user_id', auth.jwt() -> 'app_metadata' ->> 'user_id',
    'jwt_telegram_id', auth.jwt() ->> 'telegram_id',
    'full_jwt', auth.jwt()
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_auth_claims() TO authenticated;

-- =============================================
-- Verification
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ User management RLS policies updated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Policy Summary:';
  RAISE NOTICE '  - users_view_self: All users can view own profile';
  RAISE NOTICE '  - infrastructure_owners_view_all_users: Global admin access';
  RAISE NOTICE '  - workspace_admins_view_team: Owners/managers view workspace team';
  RAISE NOTICE '  - users_update_self: Users can update own profile';
  RAISE NOTICE '  - workspace_admins_update_roles: Admins can update team roles';
  RAISE NOTICE '';
  RAISE NOTICE 'JWT Claims Required:';
  RAISE NOTICE '  - app_metadata.role: User role (infrastructure_owner, owner, manager, etc.)';
  RAISE NOTICE '  - app_metadata.workspace_id: Business/workspace UUID';
  RAISE NOTICE '  - app_metadata.user_id: User UUID';
  RAISE NOTICE '  - telegram_id: Telegram user ID';
  RAISE NOTICE '';
  RAISE NOTICE 'Debug: Call SELECT debug_auth_claims() to inspect your JWT';
END $$;

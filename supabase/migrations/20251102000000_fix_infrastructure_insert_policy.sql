-- Fix Infrastructure Insert Policy for Business Creation
-- Issue: Users cannot create infrastructures due to RLS policy conflicts
-- Solution: Add explicit INSERT policy for authenticated users

-- First, drop conflicting policies
DROP POLICY IF EXISTS "infrastructures_admin_manage" ON infrastructures;
DROP POLICY IF EXISTS "authenticated_users_can_insert_infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "Authenticated users can create infrastructures" ON infrastructures;

-- Create separate policies for different operations
-- 1. INSERT policy - Allow authenticated users to create infrastructures
CREATE POLICY "infrastructures_authenticated_insert"
  ON infrastructures
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. SELECT policy - Users can view infrastructures they have access to
CREATE POLICY "infrastructures_member_select"
  ON infrastructures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM infrastructure_users iu
      WHERE iu.infrastructure_id = infrastructures.id
      AND iu.user_id = auth.uid()
    )
    OR auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
  );

-- 3. UPDATE policy - Infrastructure owners can update
CREATE POLICY "infrastructures_owner_update"
  ON infrastructures
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM infrastructure_users iu
      WHERE iu.infrastructure_id = infrastructures.id
      AND iu.user_id = auth.uid()
      AND iu.role = 'infrastructure_owner'
    )
    OR auth.jwt()->>'role' = 'superadmin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM infrastructure_users iu
      WHERE iu.infrastructure_id = infrastructures.id
      AND iu.user_id = auth.uid()
      AND iu.role = 'infrastructure_owner'
    )
    OR auth.jwt()->>'role' = 'superadmin'
  );

-- 4. DELETE policy - Only superadmins
CREATE POLICY "infrastructures_superadmin_delete"
  ON infrastructures
  FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'role' = 'superadmin');

-- 5. Service role has full access (for edge functions)
CREATE POLICY "infrastructures_service_role_all"
  ON infrastructures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE infrastructures ENABLE ROW LEVEL SECURITY;

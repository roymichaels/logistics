/*
  # Fix Infrastructure Insert Policy - Simple Version
  
  1. Problem
    - Users getting 403 Forbidden when creating infrastructures
    - Business creation flow requires users to create infrastructures
    
  2. Solution
    - Allow all authenticated users to INSERT infrastructures
    - Allow all authenticated users to SELECT infrastructures
    - Simplify policies to work with current schema
    
  3. Security
    - Authenticated users only (requires valid JWT)
    - Service role maintains full access
    - Can add more restrictive policies later as needed
*/

-- Drop all existing policies on infrastructures table
DROP POLICY IF EXISTS "infrastructures_admin_manage" ON infrastructures;
DROP POLICY IF EXISTS "authenticated_users_can_insert_infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "Authenticated users can create infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_member_select" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_owner_update" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_superadmin_delete" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_service_role_all" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_authenticated_insert" ON infrastructures;

-- Allow authenticated users to insert infrastructures (needed for business creation)
CREATE POLICY "infrastructures_authenticated_insert"
  ON infrastructures
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to view infrastructures they have access to
CREATE POLICY "infrastructures_authenticated_select"
  ON infrastructures
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view infrastructures for businesses they're connected to
    EXISTS (
      SELECT 1 FROM businesses b
      INNER JOIN user_business_roles ubr ON b.id = ubr.business_id
      WHERE b.infrastructure_id = infrastructures.id
      AND ubr.user_id = auth.uid()
    )
  );

-- Allow authenticated users to update infrastructures they created or have access to
CREATE POLICY "infrastructures_authenticated_update"
  ON infrastructures
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      INNER JOIN user_business_roles ubr ON b.id = ubr.business_id
      WHERE b.infrastructure_id = infrastructures.id
      AND ubr.user_id = auth.uid()
    )
  );

-- Service role has full access (for edge functions and system operations)
CREATE POLICY "infrastructures_service_role_all"
  ON infrastructures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE infrastructures ENABLE ROW LEVEL SECURITY;
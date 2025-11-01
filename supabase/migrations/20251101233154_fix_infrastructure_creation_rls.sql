/*
  # Fix Infrastructure Creation RLS Policy
  
  1. Problem Analysis
    - Users are getting 403 Forbidden when trying to create infrastructures
    - The current RLS policy "Authenticated users can create infrastructures" has WITH CHECK (true)
    - The issue appears to be that the policy is not being evaluated correctly for INSERT operations
    
  2. Changes Made
    - Drop and recreate the INSERT policy with explicit conditions
    - Add a policy that allows any authenticated user to create an infrastructure
    - Ensure the policy explicitly checks for authenticated role using auth.role()
    - Add a permissive policy for service_role as well for edge function operations
    
  3. Security Considerations
    - Authenticated users can create infrastructures (needed for business onboarding)
    - Service role can also create infrastructures (for system operations)
    - The policy is permissive to allow business creation flow to work
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create infrastructures" ON infrastructures;

-- Create a more explicit INSERT policy that checks authentication
CREATE POLICY "authenticated_users_can_insert_infrastructures"
  ON infrastructures
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Allow if the request is authenticated (has a valid JWT)
    auth.uid() IS NOT NULL
    OR
    -- Or if it's a service role (for edge functions)
    auth.role() = 'service_role'
  );

-- Also ensure service_role can do everything (for edge functions and admin operations)
CREATE POLICY "service_role_full_access_infrastructures"
  ON infrastructures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE infrastructures ENABLE ROW LEVEL SECURITY;

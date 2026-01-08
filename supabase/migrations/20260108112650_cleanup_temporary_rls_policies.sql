/*
  # Cleanup Temporary RLS Policies

  1. Changes
    - Remove overly permissive anon profile read policy
    - Keep only secure RLS policies
    - Business creation now uses SECURITY DEFINER function instead

  2. Security
    - Reduces attack surface by removing unnecessary anon access
    - Business creation handled securely via stored function
*/

-- Remove the temporary anon profile read policy
-- Business creation now uses the secure create_business_for_user function
DROP POLICY IF EXISTS "Anon can verify profile IDs exist" ON profiles;
DROP POLICY IF EXISTS "Anonymous users can check profile existence" ON profiles;

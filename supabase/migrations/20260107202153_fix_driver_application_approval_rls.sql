/*
  # Fix Driver Application Approval RLS

  ## Changes

  1. Update RLS policies on `driver_applications`
     - Remove policies that check for non-existent 'admin' and 'superadmin' roles
     - Allow business_owner role to approve/reject driver applications
     - Maintain security: users can still only read their own applications
     - Business owners can read and manage all applications

  ## Security

  - Business owners can approve driver applications
  - Users can read their own applications
  - Users can create their own applications
  - Business owners can update application status (approve/reject)
*/

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Admins can read all driver applications" ON driver_applications;
DROP POLICY IF EXISTS "Admins can update driver applications" ON driver_applications;

-- Business owners can read all applications
CREATE POLICY "Business owners can read all driver applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'business_owner'
    )
  );

-- Business owners can update applications (approve/reject)
CREATE POLICY "Business owners can update driver applications"
  ON driver_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'business_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'business_owner'
    )
  );

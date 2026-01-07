/*
  # Fix Driver Profile Creation During Approval

  ## Changes

  1. Add policy to allow business owners to create driver profiles for approved applicants
     - Business owners need to create profiles when approving applications
     - Previously only drivers could create their own profiles

  ## Security

  - Business owners with role 'business_owner' can create driver profiles
  - Maintains existing security: drivers still own their profiles
  - Business owners still manage profiles attached to their businesses
*/

-- Allow business owners to create driver profiles (for approving applications)
CREATE POLICY "Business owners can create driver profiles"
  ON driver_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'business_owner'
    )
  );

/*
  # Fix RLS Policies to Use auth.uid() Instead of JWT Claims

  ## Overview
  Updates RLS policies to use auth.uid() which is reliably available in the JWT,
  instead of custom claims like telegram_id which require additional configuration.

  ## Changes Made
  
  1. **Helper Functions**
     - Create function to get user by auth UID
     - Create function to check if current auth user is infrastructure owner
  
  2. **Update Policies**
     - Simplify policies to use auth.uid() instead of telegram_id from JWT
     - Make policies more reliable and maintainable

  ## Security
  - Maintains same security posture
  - More reliable since auth.uid() is always present
*/

-- Create helper function to get current user's telegram_id from auth.uid()
CREATE OR REPLACE FUNCTION get_current_user_telegram_id_from_auth()
RETURNS TEXT AS $$
DECLARE
  v_telegram_id TEXT;
BEGIN
  SELECT telegram_id INTO v_telegram_id
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN v_telegram_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create helper function to check if current authenticated user is infrastructure owner
CREATE OR REPLACE FUNCTION is_current_user_infrastructure_owner()
RETURNS BOOLEAN AS $$
DECLARE
  v_is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'infrastructure_owner'
    AND registration_status = 'approved'
  ) INTO v_is_owner;
  
  RETURN COALESCE(v_is_owner, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create helper function to check if current user is manager or above
CREATE OR REPLACE FUNCTION is_current_user_manager_or_above()
RETURNS BOOLEAN AS $$
DECLARE
  v_is_manager BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('infrastructure_owner', 'business_owner', 'manager')
    AND registration_status = 'approved'
  ) INTO v_is_manager;
  
  RETURN COALESCE(v_is_manager, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update user_registrations UPDATE policies to use new helper functions
DROP POLICY IF EXISTS "Infrastructure owners update registrations" ON user_registrations;
DROP POLICY IF EXISTS "Managers update registrations" ON user_registrations;
DROP POLICY IF EXISTS "Users update own registration" ON user_registrations;

CREATE POLICY "Infrastructure owners update registrations"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (is_current_user_infrastructure_owner());

CREATE POLICY "Managers update registrations"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (is_current_user_manager_or_above());

CREATE POLICY "Users update own registration"
  ON user_registrations FOR UPDATE
  TO authenticated
  USING (telegram_id = get_current_user_telegram_id_from_auth());

-- Update DELETE policy
DROP POLICY IF EXISTS "Infrastructure owners delete registrations" ON user_registrations;

CREATE POLICY "Infrastructure owners delete registrations"
  ON user_registrations FOR DELETE
  TO authenticated
  USING (is_current_user_infrastructure_owner());

-- Add comments
COMMENT ON FUNCTION get_current_user_telegram_id_from_auth() IS 'Gets telegram_id for current authenticated user via auth.uid()';
COMMENT ON FUNCTION is_current_user_infrastructure_owner() IS 'Checks if current authenticated user is an approved infrastructure owner';
COMMENT ON FUNCTION is_current_user_manager_or_above() IS 'Checks if current authenticated user is manager, business owner, or infrastructure owner';

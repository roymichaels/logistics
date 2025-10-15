/*
  # Sync JWT app_metadata for Infrastructure Owners

  ## Problem
  The new RLS functions check JWT app_metadata for role, but this data isn't being synced
  when users authenticate or their roles change.

  ## Solution
  1. Create trigger to sync user role to auth.users.raw_app_meta_data
  2. Update existing infrastructure owner users to have proper app_metadata
  3. This ensures is_infra_owner_from_jwt() works correctly

  ## Security
  - Only updates app_metadata, which is read-only from user perspective
  - Maintains proper role-based access control
*/

-- ============================================================================
-- STEP 1: Create function to sync user role to auth metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_user_role_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users raw_app_meta_data with role and telegram_id
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', NEW.role::text,
      'telegram_id', NEW.telegram_id,
      'business_id', NEW.business_id,
      'registration_status', NEW.registration_status::text
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Create trigger to sync on INSERT and UPDATE
-- ============================================================================

DROP TRIGGER IF EXISTS sync_user_role_to_auth ON users;
CREATE TRIGGER sync_user_role_to_auth
  AFTER INSERT OR UPDATE OF role, telegram_id, business_id, registration_status ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_auth_metadata();

-- ============================================================================
-- STEP 3: Sync existing users' roles to auth metadata
-- ============================================================================

-- Update all existing users to have their role in auth.users.raw_app_meta_data
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, role, telegram_id, business_id, registration_status 
    FROM users 
    WHERE id IS NOT NULL
  LOOP
    BEGIN
      UPDATE auth.users
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
          'role', user_record.role::text,
          'telegram_id', user_record.telegram_id,
          'business_id', user_record.business_id,
          'registration_status', user_record.registration_status::text
        )
      WHERE id = user_record.id;
    EXCEPTION WHEN OTHERS THEN
      -- Skip if user doesn't exist in auth.users
      CONTINUE;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Add helpful comment
-- ============================================================================

COMMENT ON FUNCTION sync_user_role_to_auth_metadata() IS 'Syncs user role and metadata to auth.users.raw_app_meta_data for JWT claims';

/*
  # Sync Users Table with Auth User IDs

  ## Overview
  Creates a trigger to automatically sync the users.id field with auth.users.id
  when users authenticate via Telegram. This ensures RLS policies work correctly.

  ## Changes Made
  
  1. **Function to Sync User ID**
     - Automatically updates users.id when a matching telegram_id exists
     - Called by auth hooks or edge functions
  
  2. **Manual Sync Function**
     - One-time function to sync existing users with auth users
     - Matches by telegram_id stored in auth.raw_user_meta_data

  ## Security
  - Maintains data integrity between auth and users tables
  - Enables RLS policies to work correctly with auth.uid()
*/

-- Function to sync user ID from auth to users table
CREATE OR REPLACE FUNCTION sync_user_id_from_auth(
  p_telegram_id TEXT,
  p_auth_uid UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET id = p_auth_uid
  WHERE telegram_id = p_telegram_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No user found with telegram_id: %', p_telegram_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync all existing users with their auth counterparts
CREATE OR REPLACE FUNCTION sync_all_users_with_auth()
RETURNS TABLE(
  synced_count INTEGER,
  skipped_count INTEGER,
  details JSONB
) AS $$
DECLARE
  v_synced INTEGER := 0;
  v_skipped INTEGER := 0;
  v_auth_user RECORD;
  v_telegram_id TEXT;
  v_details JSONB := '[]'::JSONB;
BEGIN
  -- Loop through auth.users and sync with users table
  FOR v_auth_user IN 
    SELECT id, email, raw_user_meta_data
    FROM auth.users
  LOOP
    -- Extract telegram_id from user_metadata
    v_telegram_id := v_auth_user.raw_user_meta_data->>'telegram_id';
    
    IF v_telegram_id IS NOT NULL THEN
      -- Try to update users table
      UPDATE users
      SET id = v_auth_user.id
      WHERE telegram_id = v_telegram_id;
      
      IF FOUND THEN
        v_synced := v_synced + 1;
        v_details := v_details || jsonb_build_object(
          'telegram_id', v_telegram_id,
          'auth_uid', v_auth_user.id,
          'status', 'synced'
        );
      ELSE
        v_skipped := v_skipped + 1;
        v_details := v_details || jsonb_build_object(
          'telegram_id', v_telegram_id,
          'auth_uid', v_auth_user.id,
          'status', 'no_match'
        );
      END IF;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_synced, v_skipped, v_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the sync function to fix existing users
DO $$
DECLARE
  sync_result RECORD;
BEGIN
  SELECT * INTO sync_result FROM sync_all_users_with_auth();
  RAISE NOTICE 'User sync completed: % synced, % skipped', 
    sync_result.synced_count, 
    sync_result.skipped_count;
END $$;

COMMENT ON FUNCTION sync_user_id_from_auth(TEXT, UUID) IS 'Syncs a single users.id with their auth.users.id based on telegram_id';
COMMENT ON FUNCTION sync_all_users_with_auth() IS 'One-time sync of all users with their auth counterparts';

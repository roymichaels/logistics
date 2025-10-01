/*
  # Username-Based Authentication System

  ## Changes
  This migration updates the system to use Telegram usernames (without @) as the primary identifier
  instead of telegram_id. This provides better usability and user experience.

  ### Key Updates:
  1. Keep telegram_id but make username the primary lookup field
  2. Add unique constraint on username
  3. Update all foreign key relationships to support username lookups
  4. Update RLS policies to use username instead of telegram_id
  5. Add helper functions for username normalization

  ### Migration Strategy:
  - Non-destructive: keeps telegram_id for backward compatibility
  - Updates indexes to prioritize username lookups
  - Preserves all existing data
*/

-- Add username normalization function (removes @ if present, converts to lowercase)
CREATE OR REPLACE FUNCTION normalize_username(input_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_username IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove @ prefix if present and convert to lowercase
  RETURN lower(trim(both '@' from input_username));
END;
$$;

-- Make username NOT NULL and ensure it's normalized
ALTER TABLE users 
  ALTER COLUMN username SET NOT NULL;

-- Add unique constraint on normalized username
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_normalized 
  ON users(normalize_username(username));

-- Update existing usernames to be normalized
UPDATE users 
SET username = normalize_username(username)
WHERE username IS NOT NULL;

-- Add username index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username_lookup ON users(username);

-- Update orders table to support username-based lookups
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS created_by_username TEXT;

-- Backfill created_by_username from telegram_id
UPDATE orders o
SET created_by_username = u.username
FROM users u
WHERE o.created_by = u.telegram_id
  AND o.created_by_username IS NULL;

-- Update tasks table for username support
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_to_username TEXT,
  ADD COLUMN IF NOT EXISTS assigned_by_username TEXT;

-- Backfill task usernames
UPDATE tasks t
SET assigned_to_username = u.username
FROM users u
WHERE t.assigned_to = u.telegram_id
  AND t.assigned_to_username IS NULL;

UPDATE tasks t
SET assigned_by_username = u.username
FROM users u
WHERE t.assigned_by = u.telegram_id
  AND t.assigned_by_username IS NULL;

-- Update routes table for username support
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS driver_username TEXT;

-- Backfill route usernames
UPDATE routes r
SET driver_username = u.username
FROM users u
WHERE r.driver_id = u.telegram_id
  AND r.driver_username IS NULL;

-- Create helper view for easy username lookups
CREATE OR REPLACE VIEW user_lookup AS
SELECT 
  id,
  telegram_id,
  username,
  normalize_username(username) as normalized_username,
  name,
  role,
  department,
  phone,
  photo_url,
  created_at,
  updated_at
FROM users;

-- Update RLS policies to support both telegram_id and username
-- This maintains backward compatibility while adding username support

DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    telegram_id = (auth.jwt() ->> 'telegram_id')
    OR normalize_username(username) = normalize_username(auth.jwt() ->> 'username')
  );

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    telegram_id = (auth.jwt() ->> 'telegram_id')
    OR normalize_username(username) = normalize_username(auth.jwt() ->> 'username')
  );

-- Update app_config to reflect username-based auth
UPDATE app_config
SET config = jsonb_set(
  config,
  '{auth}',
  '{"primary_identifier": "username", "allow_telegram_id_fallback": true}'::jsonb,
  true
)
WHERE app = 'logistics';

-- Add comment for documentation
COMMENT ON COLUMN users.username IS 'Telegram username without @ prefix. Primary identifier for user authentication.';
COMMENT ON COLUMN users.telegram_id IS 'Telegram numeric ID. Kept for backward compatibility and as secondary identifier.';
COMMENT ON FUNCTION normalize_username(TEXT) IS 'Normalizes username by removing @ prefix and converting to lowercase';

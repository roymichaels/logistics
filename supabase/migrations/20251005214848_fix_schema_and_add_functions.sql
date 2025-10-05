/*
  # Fix Schema Issues and Add Missing Functions

  ## Changes
  1. Add first_name and last_name columns to users table for compatibility
  2. Create get_user_businesses RPC function for business context loading
  3. Add get_user_business_roles helper function
  4. Update users table to handle NULL name values gracefully

  ## Security
  - Maintains existing RLS policies
  - Functions respect user context
*/

-- Add first_name and last_name columns if they don't exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Create trigger to sync name with first_name/last_name
CREATE OR REPLACE FUNCTION sync_user_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If first_name or last_name changed, update name
  IF (NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name) THEN
    NEW.name := TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')));
  END IF;

  -- If name changed but first_name/last_name didn't, try to split name
  IF (NEW.name IS DISTINCT FROM OLD.name AND NEW.first_name IS NOT DISTINCT FROM OLD.first_name) THEN
    IF NEW.name IS NOT NULL AND NEW.name != '' THEN
      -- Simple split: first word = first_name, rest = last_name
      NEW.first_name := SPLIT_PART(NEW.name, ' ', 1);
      IF ARRAY_LENGTH(STRING_TO_ARRAY(NEW.name, ' '), 1) > 1 THEN
        NEW.last_name := SUBSTRING(NEW.name FROM LENGTH(NEW.first_name) + 2);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_name_trigger ON users;
CREATE TRIGGER sync_user_name_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_name();

-- Backfill first_name from existing name column
UPDATE users
SET first_name = SPLIT_PART(name, ' ', 1),
    last_name = CASE
      WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1
      THEN SUBSTRING(name FROM LENGTH(SPLIT_PART(name, ' ', 1)) + 2)
      ELSE NULL
    END
WHERE first_name IS NULL AND name IS NOT NULL AND name != '';

-- Create get_user_businesses function
CREATE OR REPLACE FUNCTION get_user_businesses()
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  role TEXT,
  is_primary BOOLEAN,
  business_logo TEXT,
  business_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get the current user's ID from the auth context
  v_user_id := (SELECT id FROM users WHERE telegram_id = (auth.jwt() ->> 'telegram_id') LIMIT 1);

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get user's infrastructure role
  SELECT u.role INTO v_user_role FROM users u WHERE u.id = v_user_id;

  -- Infrastructure owners can see all businesses
  IF v_user_role = 'infrastructure_owner' OR v_user_role = 'owner' THEN
    RETURN QUERY
    SELECT
      b.id as business_id,
      b.name as business_name,
      'owner'::TEXT as role,
      true as is_primary,
      b.logo as business_logo,
      b.status as business_status,
      b.created_at,
      b.updated_at
    FROM businesses b
    WHERE b.status = 'active'
    ORDER BY b.created_at DESC;
  ELSE
    -- Regular users see only their associated businesses
    RETURN QUERY
    SELECT
      b.id as business_id,
      b.name as business_name,
      bu.role::TEXT as role,
      bu.is_primary,
      b.logo as business_logo,
      b.status as business_status,
      bu.created_at,
      bu.updated_at
    FROM business_users bu
    JOIN businesses b ON b.id = bu.business_id
    WHERE bu.user_id = v_user_id
      AND bu.active = true
      AND b.status = 'active'
    ORDER BY bu.is_primary DESC, bu.created_at DESC;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_businesses() TO authenticated;

-- Create get_user_business_roles helper function
CREATE OR REPLACE FUNCTION get_user_business_roles(p_user_id UUID)
RETURNS TABLE (
  business_id UUID,
  business_role TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    business_id,
    role::TEXT as business_role
  FROM business_users
  WHERE user_id = p_user_id
    AND active = true;
$$;

GRANT EXECUTE ON FUNCTION get_user_business_roles(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_businesses() IS 'Returns all businesses the current user has access to, with their role in each business';
COMMENT ON FUNCTION get_user_business_roles(UUID) IS 'Returns all business associations for a given user';
COMMENT ON COLUMN users.first_name IS 'User first name from Telegram';
COMMENT ON COLUMN users.last_name IS 'User last name from Telegram';

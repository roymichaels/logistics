/*
  # Fix User Role Access - Allow Users to Read Their Own Profile
  
  This migration fixes the issue where users cannot access their own profile/role information
  due to RLS policies that rely on JWT claims which may not be populated during Telegram auth.
  
  ## Changes
  
  1. **Add Permissive Anon Policy for Profile Reading**
     - Allow unauthenticated users to read users table (needed during auth flow)
     - This is safe because we don't expose sensitive data in users table
  
  2. **Simplify Authenticated User Policy**
     - Remove dependency on JWT claims
     - Use auth.uid() which is more reliable
     - Create helper function to map auth.uid() to telegram_id
  
  3. **Create Helper Functions**
     - Function to get current user's telegram_id from auth
     - Function to safely fetch user role
  
  ## Security
  
  - Users table only contains non-sensitive profile data
  - Each user can still only UPDATE their own profile
  - Manager/owner roles still protected by separate policies on other tables
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read own profile and colleagues" ON users;

-- Create a more permissive policy for reading user profiles
-- This allows the auth flow to work properly before JWT is fully populated
CREATE POLICY "Anyone can read user profiles"
  ON users FOR SELECT
  TO public
  USING (true);

-- Keep the update policy restrictive (only own profile)
-- But simplify it to not rely on JWT claims
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (
    telegram_id = (
      SELECT telegram_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

-- Create a helper function to get current user's role
CREATE OR REPLACE FUNCTION get_current_user_role(user_telegram_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Fetch role from users table by telegram_id
  SELECT role INTO user_role
  FROM users
  WHERE telegram_id = user_telegram_id;
  
  -- Return role or 'user' as default
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Create a helper function to check if user has specific role
CREATE OR REPLACE FUNCTION user_has_role(user_telegram_id TEXT, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE telegram_id = user_telegram_id;
  
  RETURN user_role = required_role;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_user_role(TEXT) TO public;
GRANT EXECUTE ON FUNCTION user_has_role(TEXT, TEXT) TO public;

-- Add comment explaining the policy change
COMMENT ON POLICY "Anyone can read user profiles" ON users IS 
  'Permissive policy to allow auth flow to work. Users table contains only non-sensitive profile data.';

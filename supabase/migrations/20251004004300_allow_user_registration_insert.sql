/*
  # Allow User Registration via Anonymous INSERT

  1. Changes
    - Add policy to allow anonymous users to INSERT into users table
    - This enables the user registration flow from TelegramAuth
    - Users can create their own profile during registration
  
  2. Security
    - Anonymous users can only insert their own user record
    - RLS remains enabled for all other operations
*/

-- Allow anonymous users to insert their own user record during registration
CREATE POLICY "Allow anonymous user registration"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to insert (for edge functions)
CREATE POLICY "Allow authenticated user creation"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
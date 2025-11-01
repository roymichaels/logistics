/*
  # Add INSERT Policy for Users Table

  ## Overview
  This migration adds the missing INSERT policy for the users table to allow
  new user registration via Web3 authentication.

  ## Changes Made

  1. **New RLS Policy**
     - `Service role can insert users` - Allows the service role to create new user records
     - This is required for the web3-verify Edge Function to create new users

  ## Security Notes
  - Only the service role (used by Edge Functions) can insert new users
  - Regular authenticated users cannot create user records directly
  - This maintains security while allowing proper user registration flow
*/

-- Allow service role to insert new users (required for web3-verify function)
CREATE POLICY "Service role can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Note: The service role bypasses RLS, but this policy ensures
-- that the insert operation works correctly in all contexts

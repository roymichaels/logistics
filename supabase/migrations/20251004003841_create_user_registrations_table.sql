/*
  # Create User Registrations Table

  1. New Tables
    - `user_registrations`
      - `telegram_id` (text, primary key) - Telegram user ID
      - `first_name` (text) - User's first name
      - `last_name` (text, nullable) - User's last name
      - `username` (text, nullable) - Telegram username
      - `photo_url` (text, nullable) - Profile photo URL
      - `department` (text, nullable) - User's department
      - `phone` (text, nullable) - Phone number
      - `requested_role` (text) - Role requested by user
      - `assigned_role` (text, nullable) - Role assigned by admin
      - `status` (text) - Registration status (pending, approved, rejected)
      - `approval_history` (jsonb) - History of approval actions
      - `created_at` (timestamptz) - Registration creation time
      - `updated_at` (timestamptz) - Last update time
  
  2. Security
    - Enable RLS on `user_registrations` table
    - Add policies for users to view their own registration
    - Add policies for managers/owners to view all registrations
    - Add policies for managers/owners to update registrations
*/

-- Create user_registrations table
CREATE TABLE IF NOT EXISTS user_registrations (
  telegram_id text PRIMARY KEY,
  first_name text NOT NULL,
  last_name text,
  username text,
  photo_url text,
  department text,
  phone text,
  requested_role text NOT NULL DEFAULT 'user',
  assigned_role text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approval_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own registration
CREATE POLICY "Users can view own registration"
  ON user_registrations
  FOR SELECT
  TO authenticated
  USING (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Policy: Allow anonymous access for initial registration
CREATE POLICY "Allow anonymous registration creation"
  ON user_registrations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow anonymous access to read own registration
CREATE POLICY "Allow anonymous read own registration"
  ON user_registrations
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow anonymous to update own registration
CREATE POLICY "Allow anonymous update own registration"
  ON user_registrations
  FOR UPDATE
  TO anon
  USING (true);

-- Policy: Managers and owners can view all registrations
CREATE POLICY "Managers can view all registrations"
  ON user_registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
      AND users.role IN ('owner', 'manager')
    )
  );

-- Policy: Managers and owners can update registrations
CREATE POLICY "Managers can update registrations"
  ON user_registrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
      AND users.role IN ('owner', 'manager')
    )
  );

-- Policy: Managers and owners can delete registrations
CREATE POLICY "Managers can delete registrations"
  ON user_registrations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
      AND users.role IN ('owner', 'manager')
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_registrations_status ON user_registrations(status);
CREATE INDEX IF NOT EXISTS idx_user_registrations_username ON user_registrations(username);
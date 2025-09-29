/*
  # Security Infrastructure Tables

  This migration creates the core security infrastructure tables for the encrypted Telegram Mini App:

  ## New Tables Created

  ### 1. `user_security_profiles`
  - `user_id` (text, primary key) - References telegram user ID
  - `pin_hash` (text) - Hashed PIN for authentication
  - `salt` (text) - Salt for PIN hashing
  - `failed_attempts` (integer) - Count of failed PIN attempts
  - `locked_until` (timestamptz) - When account unlocks if locked
  - `pin_changed_at` (timestamptz) - When PIN was last changed
  - `requires_pin_change` (boolean) - Whether PIN change is required
  - `master_key_encrypted` (text) - Encrypted master key for user data
  - `created_at` (timestamptz) - Profile creation time
  - `updated_at` (timestamptz) - Last profile update

  ### 2. `encrypted_chats`
  - `id` (text, primary key) - Chat identifier
  - `name` (text) - Chat name (encrypted)
  - `description` (text) - Chat description (encrypted)
  - `chat_type` (text) - 'direct', 'group', or 'channel'
  - `encryption_key_version` (integer) - Key rotation version
  - `last_key_rotation` (timestamptz) - When keys were last rotated
  - `created_by` (text) - User who created the chat
  - `is_active` (boolean) - Whether chat is active
  - `created_at` (timestamptz) - Chat creation time
  - `updated_at` (timestamptz) - Last chat update

  ### 3. `encrypted_messages`
  - `id` (text, primary key) - Message identifier
  - `chat_id` (text) - References encrypted_chats.id
  - `sender_id` (text) - User who sent the message
  - `encrypted_content` (text) - AES-encrypted message content
  - `iv` (text) - Initialization vector for decryption
  - `auth_tag` (text) - Authentication tag for integrity
  - `message_type` (text) - 'text', 'file', 'image', 'system'
  - `reply_to_id` (text) - Optional reply to another message
  - `is_edited` (boolean) - Whether message was edited
  - `edited_at` (timestamptz) - When message was last edited
  - `is_deleted` (boolean) - Whether message is deleted (soft delete)
  - `deleted_at` (timestamptz) - When message was deleted
  - `created_at` (timestamptz) - Message creation time

  ### 4. `chat_members`
  - `id` (uuid, primary key) - Unique member record ID
  - `chat_id` (text) - References encrypted_chats.id
  - `user_id` (text) - User's telegram ID
  - `role` (text) - 'admin', 'member', or 'viewer'
  - `encrypted_chat_key` (text) - Chat key encrypted with user's public key
  - `public_key` (text) - User's RSA public key for this chat
  - `joined_at` (timestamptz) - When user joined chat
  - `left_at` (timestamptz) - When user left chat (if applicable)
  - `is_active` (boolean) - Whether membership is active

  ### 5. `security_audit_log`
  - `id` (uuid, primary key) - Log entry identifier
  - `user_id` (text) - User associated with event
  - `event_type` (text) - Type of security event
  - `event_details` (jsonb) - Encrypted details of the event
  - `ip_address` (text) - User's IP address (if available)
  - `user_agent` (text) - User agent string
  - `success` (boolean) - Whether the event was successful
  - `risk_level` (text) - 'low', 'medium', 'high', 'critical'
  - `created_at` (timestamptz) - When event occurred

  ### 6. `user_sessions`
  - `id` (uuid, primary key) - Session identifier
  - `user_id` (text) - User's telegram ID
  - `session_token` (text) - Encrypted session token
  - `encrypted_data` (text) - Encrypted session data
  - `expires_at` (timestamptz) - Session expiration time
  - `last_activity` (timestamptz) - Last session activity
  - `is_active` (boolean) - Whether session is active
  - `created_at` (timestamptz) - Session creation time

  ## Security Features
  - All tables have Row Level Security (RLS) enabled
  - Restrictive policies ensure users can only access their own data
  - Audit logging tracks all security-related events
  - Encrypted fields use application-level encryption before storage
  - Foreign key constraints maintain data integrity

  ## Notes
  - All sensitive data is encrypted at the application level before database storage
  - PIN hashes use PBKDF2 with high iteration counts
  - Chat keys are encrypted with RSA public keys for each member
  - Soft deletes are used for messages to maintain audit trails
  - Session tokens are encrypted and regularly rotated
*/

-- Create user security profiles table
CREATE TABLE IF NOT EXISTS user_security_profiles (
  user_id text PRIMARY KEY,
  pin_hash text NOT NULL,
  salt text NOT NULL,
  failed_attempts integer DEFAULT 0,
  locked_until timestamptz,
  pin_changed_at timestamptz DEFAULT now(),
  requires_pin_change boolean DEFAULT false,
  master_key_encrypted text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create encrypted chats table
CREATE TABLE IF NOT EXISTS encrypted_chats (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  chat_type text NOT NULL CHECK (chat_type IN ('direct', 'group', 'channel')),
  encryption_key_version integer DEFAULT 1,
  last_key_rotation timestamptz DEFAULT now(),
  created_by text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create encrypted messages table
CREATE TABLE IF NOT EXISTS encrypted_messages (
  id text PRIMARY KEY,
  chat_id text NOT NULL REFERENCES encrypted_chats(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  encrypted_content text NOT NULL,
  iv text NOT NULL,
  auth_tag text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
  reply_to_id text REFERENCES encrypted_messages(id),
  is_edited boolean DEFAULT false,
  edited_at timestamptz,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create chat members table
CREATE TABLE IF NOT EXISTS chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL REFERENCES encrypted_chats(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  encrypted_chat_key text NOT NULL,
  public_key text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(chat_id, user_id)
);

-- Create security audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  event_type text NOT NULL,
  event_details jsonb,
  ip_address text,
  user_agent text,
  success boolean DEFAULT true,
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at timestamptz DEFAULT now()
);

-- Create user sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  session_token text NOT NULL,
  encrypted_data text,
  expires_at timestamptz NOT NULL,
  last_activity timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_encrypted_messages_chat_id ON encrypted_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_messages_created_at ON encrypted_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id ON chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Enable Row Level Security on all tables
ALTER TABLE user_security_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_security_profiles
CREATE POLICY "Users can manage own security profile"
  ON user_security_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.jwt() ->> 'telegram_id')
  WITH CHECK (user_id = auth.jwt() ->> 'telegram_id');

-- RLS Policies for encrypted_chats
CREATE POLICY "Users can view chats they are members of"
  ON encrypted_chats
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT chat_id FROM chat_members 
      WHERE user_id = auth.jwt() ->> 'telegram_id' AND is_active = true
    )
  );

CREATE POLICY "Users can create chats"
  ON encrypted_chats
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.jwt() ->> 'telegram_id');

CREATE POLICY "Chat admins can update chats"
  ON encrypted_chats
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT chat_id FROM chat_members 
      WHERE user_id = auth.jwt() ->> 'telegram_id' 
      AND role = 'admin' AND is_active = true
    )
  );

-- RLS Policies for encrypted_messages
CREATE POLICY "Users can view messages in their chats"
  ON encrypted_messages
  FOR SELECT
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id FROM chat_members 
      WHERE user_id = auth.jwt() ->> 'telegram_id' AND is_active = true
    )
  );

CREATE POLICY "Users can send messages to their chats"
  ON encrypted_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.jwt() ->> 'telegram_id' AND
    chat_id IN (
      SELECT chat_id FROM chat_members 
      WHERE user_id = auth.jwt() ->> 'telegram_id' AND is_active = true
    )
  );

CREATE POLICY "Users can edit their own messages"
  ON encrypted_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.jwt() ->> 'telegram_id')
  WITH CHECK (sender_id = auth.jwt() ->> 'telegram_id');

-- RLS Policies for chat_members
CREATE POLICY "Users can view chat members of their chats"
  ON chat_members
  FOR SELECT
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id FROM chat_members 
      WHERE user_id = auth.jwt() ->> 'telegram_id' AND is_active = true
    )
  );

CREATE POLICY "Chat admins can manage members"
  ON chat_members
  FOR ALL
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id FROM chat_members 
      WHERE user_id = auth.jwt() ->> 'telegram_id' 
      AND role = 'admin' AND is_active = true
    )
  );

-- RLS Policies for security_audit_log
CREATE POLICY "Users can view own audit log"
  ON security_audit_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.jwt() ->> 'telegram_id');

CREATE POLICY "System can insert audit logs"
  ON security_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for user_sessions
CREATE POLICY "Users can manage own sessions"
  ON user_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.jwt() ->> 'telegram_id')
  WITH CHECK (user_id = auth.jwt() ->> 'telegram_id');
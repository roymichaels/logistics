/*
  # User Management Audit Log System

  1. New Tables
    - `user_audit_log`
      - `id` (uuid, primary key) - Unique identifier for each audit entry
      - `target_user_id` (text) - Telegram ID of user being modified
      - `target_username` (text, nullable) - Username for easier tracking
      - `action` (text) - Type of action (role_change, user_approved, user_deleted, etc.)
      - `performed_by` (text) - Telegram ID of admin who performed action
      - `performed_by_username` (text, nullable) - Username of admin
      - `previous_value` (jsonb, nullable) - Previous state (e.g., old role)
      - `new_value` (jsonb, nullable) - New state (e.g., new role)
      - `metadata` (jsonb, nullable) - Additional context data
      - `ip_address` (text, nullable) - IP address if available
      - `user_agent` (text, nullable) - Browser/client info
      - `created_at` (timestamptz) - When action occurred

  2. Security
    - Enable RLS on `user_audit_log` table
    - Only managers and owners can view audit logs
    - Audit logs cannot be modified or deleted (append-only)
    - Automatic timestamps

  3. Indexes
    - Index on target_user_id for fast user history lookup
    - Index on performed_by for admin activity tracking
    - Index on created_at for time-based queries
    - Index on action for filtering by action type
*/

-- Create audit log table
CREATE TABLE IF NOT EXISTS user_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id text NOT NULL,
  target_username text,
  action text NOT NULL,
  performed_by text NOT NULL,
  performed_by_username text,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_target_user ON user_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON user_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON user_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON user_audit_log(action);

-- Enable Row Level Security
ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only managers and owners can view audit logs
CREATE POLICY "Managers and owners can view audit logs"
  ON user_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.telegram_id = auth.jwt() ->> 'sub'
      AND users.role IN ('manager', 'owner')
    )
  );

-- Policy: System can insert audit logs (no user updates/deletes allowed)
CREATE POLICY "System can insert audit logs"
  ON user_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to automatically log role changes
CREATE OR REPLACE FUNCTION log_user_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if role actually changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO user_audit_log (
      target_user_id,
      target_username,
      action,
      performed_by,
      previous_value,
      new_value,
      metadata
    ) VALUES (
      NEW.telegram_id,
      NEW.username,
      'role_changed',
      COALESCE(current_setting('app.current_user_id', TRUE), 'system'),
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      jsonb_build_object('changed_at', now())
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically log role changes on users table
DROP TRIGGER IF EXISTS trigger_log_user_role_change ON users;
CREATE TRIGGER trigger_log_user_role_change
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_role_change();

-- Function to log user approval
CREATE OR REPLACE FUNCTION log_user_approval(
  p_target_user_id text,
  p_target_username text,
  p_performed_by text,
  p_performed_by_username text,
  p_assigned_role text,
  p_notes text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_audit_log (
    target_user_id,
    target_username,
    action,
    performed_by,
    performed_by_username,
    new_value,
    metadata
  ) VALUES (
    p_target_user_id,
    p_target_username,
    'user_approved',
    p_performed_by,
    p_performed_by_username,
    jsonb_build_object('assigned_role', p_assigned_role),
    jsonb_build_object('notes', p_notes, 'approved_at', now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user deletion
CREATE OR REPLACE FUNCTION log_user_deletion(
  p_target_user_id text,
  p_target_username text,
  p_performed_by text,
  p_performed_by_username text,
  p_previous_role text,
  p_reason text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_audit_log (
    target_user_id,
    target_username,
    action,
    performed_by,
    performed_by_username,
    previous_value,
    metadata
  ) VALUES (
    p_target_user_id,
    p_target_username,
    'user_deleted',
    p_performed_by,
    p_performed_by_username,
    jsonb_build_object('role', p_previous_role),
    jsonb_build_object('reason', p_reason, 'deleted_at', now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON user_audit_log TO authenticated;
GRANT INSERT ON user_audit_log TO authenticated;

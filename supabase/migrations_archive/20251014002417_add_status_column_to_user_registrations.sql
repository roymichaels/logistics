/*
  # Add Status Column to User Registrations Table

  ## Overview
  Adds the missing `status` column to the `user_registrations` table to enable proper
  filtering of pending and approved users in the user management interface.

  ## Changes Made
  
  1. **Add status column**
     - Column name: `status`
     - Type: TEXT with CHECK constraint
     - Values: 'pending', 'approved', 'rejected'
     - Default: 'pending'
     - NOT NULL constraint
  
  2. **Data Migration**
     - Existing rows without assigned_role → 'pending'
     - Existing rows with assigned_role → 'approved'
  
  3. **Performance**
     - Add index on status column for efficient filtering
  
  ## Security
  - No changes to RLS policies needed
  - Maintains existing security posture
*/

-- Add status column with default value
ALTER TABLE user_registrations 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Migrate existing data: if assigned_role exists, mark as approved
UPDATE user_registrations 
SET status = 'approved' 
WHERE assigned_role IS NOT NULL AND status = 'pending';

-- Add index for performance on status filtering
CREATE INDEX IF NOT EXISTS idx_user_registrations_status 
ON user_registrations(status);

-- Add composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_user_registrations_status_created 
ON user_registrations(status, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN user_registrations.status IS 'Registration status: pending (awaiting approval), approved (active user), rejected (denied access)';

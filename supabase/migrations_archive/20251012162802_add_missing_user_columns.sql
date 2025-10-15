/*
  # Add Missing User Table Columns

  This migration adds columns that are referenced in the codebase but missing from the users table.

  ## Changes
  1. Add business_id column for multi-tenancy support
  2. Add is_online column for user presence tracking
  3. Add last_active column for activity tracking
  4. Add metadata column for extensible user data storage
  5. Create indexes for efficient queries

  ## New Columns
  - business_id: UUID reference to businesses table (nullable)
  - is_online: Boolean flag for current online status
  - last_active: Timestamp of last user activity
  - metadata: JSONB for flexible data storage

  ## Security
  - RLS policies already cover these columns through existing policies
  - No additional security changes needed
*/

-- =====================================================
-- Add missing columns to users table
-- =====================================================

DO $$
BEGIN
  -- Add business_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE users ADD COLUMN business_id UUID;
    COMMENT ON COLUMN users.business_id IS 'Reference to primary business for multi-tenancy';
  END IF;

  -- Add is_online column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_online'
  ) THEN
    ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT false;
    COMMENT ON COLUMN users.is_online IS 'Current online/offline status of user';
  END IF;

  -- Add last_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE users ADD COLUMN last_active TIMESTAMPTZ DEFAULT now();
    COMMENT ON COLUMN users.last_active IS 'Timestamp of last user activity';
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE users ADD COLUMN metadata JSONB;
    COMMENT ON COLUMN users.metadata IS 'Flexible storage for additional user data';
  END IF;
END $$;

-- =====================================================
-- Create indexes for efficient queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_business_role ON users(business_id, role) WHERE business_id IS NOT NULL;

-- =====================================================
-- Add foreign key constraint for business_id
-- =====================================================

DO $$
BEGIN
  -- Check if businesses table exists before adding foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'businesses'
  ) THEN
    -- Check if constraint doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'users_business_id_fkey'
      AND table_name = 'users'
    ) THEN
      ALTER TABLE users 
        ADD CONSTRAINT users_business_id_fkey 
        FOREIGN KEY (business_id) 
        REFERENCES businesses(id) 
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =====================================================
-- Update existing RLS helper functions to handle new columns
-- =====================================================

-- This function is already created, just ensuring it works with new columns
-- No changes needed as it only checks role and telegram_id
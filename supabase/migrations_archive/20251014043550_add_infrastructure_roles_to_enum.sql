/*
  # Add Infrastructure-Level Roles to user_role Enum

  ## Changes
  - Adds infrastructure_manager, infrastructure_dispatcher, infrastructure_driver, infrastructure_warehouse, infrastructure_accountant to user_role enum
  - These roles enable infrastructure-level operations separate from business-level roles

  ## Security
  - No RLS changes - only extending enum values
  - Existing roles remain unchanged
*/

-- Add new infrastructure-level role values to the enum
DO $$ 
BEGIN
  -- Add infrastructure_manager if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'infrastructure_manager' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'infrastructure_manager';
  END IF;

  -- Add infrastructure_dispatcher if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'infrastructure_dispatcher' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'infrastructure_dispatcher';
  END IF;

  -- Add infrastructure_driver if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'infrastructure_driver' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'infrastructure_driver';
  END IF;

  -- Add infrastructure_warehouse if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'infrastructure_warehouse' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'infrastructure_warehouse';
  END IF;

  -- Add infrastructure_accountant if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'infrastructure_accountant' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'infrastructure_accountant';
  END IF;
END $$;

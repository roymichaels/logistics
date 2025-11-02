/*
  # Create Business Owner Role Assignment Triggers
  
  1. Problem
     - Business creation succeeds but user_business_roles entry is not created
     - After 5 retries, business role is still not found
     - User cannot switch to business context
  
  2. Root Cause
     - Triggers defined in migration but never actually created in database
     - Without triggers, business creator never gets business_owner role assigned
  
  3. Solution
     - Create trigger functions for automatic role assignment
     - Create triggers on businesses table that fire AFTER INSERT
     - Ensure triggers are SECURITY DEFINER to bypass RLS
     - Add infrastructure_id to user_business_roles for proper scoping
  
  4. Changes
     - Helper function to get business_owner role ID
     - Trigger function to create user_business_roles entry
     - Trigger function to create user_business_contexts entry
     - Both triggers fire immediately after business INSERT
*/

-- =====================================================
-- Helper function to get business_owner role ID
-- =====================================================

CREATE OR REPLACE FUNCTION get_business_owner_role_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM roles WHERE role_key = 'business_owner' LIMIT 1;
$$;

-- =====================================================
-- Trigger function to create business owner role
-- =====================================================

CREATE OR REPLACE FUNCTION create_business_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_role_id uuid;
BEGIN
  -- Get the business_owner role ID
  owner_role_id := get_business_owner_role_id();
  
  IF owner_role_id IS NULL THEN
    RAISE WARNING 'business_owner role not found - cannot assign role to user %', NEW.created_by;
    RETURN NEW;
  END IF;

  -- Log the operation
  RAISE NOTICE 'Creating business owner role for business % by user %', NEW.id, NEW.created_by;

  -- Insert user_business_roles entry if it doesn't exist
  INSERT INTO user_business_roles (
    user_id,
    business_id,
    role_id,
    infrastructure_id,
    ownership_percentage,
    is_primary,
    is_active,
    assigned_by,
    assigned_at
  )
  VALUES (
    NEW.created_by,
    NEW.id,
    owner_role_id,
    NEW.infrastructure_id,
    100.00,
    true,
    true,
    NEW.created_by,
    now()
  )
  ON CONFLICT (user_id, business_id) DO UPDATE
  SET
    role_id = owner_role_id,
    ownership_percentage = 100.00,
    is_primary = true,
    is_active = true,
    infrastructure_id = NEW.infrastructure_id;

  RAISE NOTICE 'Business owner role created successfully for user % in business %', NEW.created_by, NEW.id;

  RETURN NEW;
END;
$$;

-- =====================================================
-- Trigger function to create business context
-- =====================================================

CREATE OR REPLACE FUNCTION create_business_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the operation
  RAISE NOTICE 'Creating business context for business % by user %', NEW.id, NEW.created_by;

  -- Insert or update user_business_contexts
  INSERT INTO user_business_contexts (
    user_id,
    business_id,
    infrastructure_id,
    updated_at
  )
  VALUES (
    NEW.created_by,
    NEW.id,
    NEW.infrastructure_id,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    business_id = NEW.id,
    infrastructure_id = NEW.infrastructure_id,
    updated_at = now();

  RAISE NOTICE 'Business context created successfully for user %', NEW.created_by;

  RETURN NEW;
END;
$$;

-- =====================================================
-- Create triggers on businesses table
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_create_business_owner_role ON businesses;
DROP TRIGGER IF EXISTS trigger_create_business_context ON businesses;

-- Create trigger to auto-assign business_owner role
-- This fires AFTER INSERT so the business.id is available
CREATE TRIGGER trigger_create_business_owner_role
  AFTER INSERT ON businesses
  FOR EACH ROW
  WHEN (NEW.created_by IS NOT NULL)
  EXECUTE FUNCTION create_business_owner_role();

-- Create trigger to auto-create business context
CREATE TRIGGER trigger_create_business_context
  AFTER INSERT ON businesses
  FOR EACH ROW
  WHEN (NEW.created_by IS NOT NULL)
  EXECUTE FUNCTION create_business_context();

-- =====================================================
-- Backfill missing roles for existing businesses
-- =====================================================

DO $$
DECLARE
  owner_role_id uuid;
  business_record RECORD;
  inserted_count int := 0;
BEGIN
  -- Get the business_owner role ID
  owner_role_id := get_business_owner_role_id();

  IF owner_role_id IS NULL THEN
    RAISE WARNING 'business_owner role not found - skipping backfill';
    RETURN;
  END IF;

  RAISE NOTICE 'Starting backfill of user_business_roles for existing businesses...';

  -- Find businesses where creator doesn't have a role entry
  FOR business_record IN
    SELECT b.id, b.created_by, b.infrastructure_id
    FROM businesses b
    WHERE b.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_business_roles ubr
        WHERE ubr.business_id = b.id
          AND ubr.user_id = b.created_by
      )
  LOOP
    INSERT INTO user_business_roles (
      user_id,
      business_id,
      role_id,
      infrastructure_id,
      ownership_percentage,
      is_primary,
      is_active,
      assigned_by,
      assigned_at
    )
    VALUES (
      business_record.created_by,
      business_record.id,
      owner_role_id,
      business_record.infrastructure_id,
      100.00,
      true,
      true,
      business_record.created_by,
      now()
    );

    inserted_count := inserted_count + 1;
  END LOOP;

  IF inserted_count > 0 THEN
    RAISE NOTICE '✅ Backfilled % user_business_roles entries', inserted_count;
  ELSE
    RAISE NOTICE '✅ No missing user_business_roles entries found';
  END IF;
END $$;

-- =====================================================
-- Verification
-- =====================================================

DO $$
DECLARE
  trigger_count int;
  function_count int;
BEGIN
  -- Verify triggers exist
  SELECT COUNT(*)
  INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'businesses'
    AND t.tgname IN ('trigger_create_business_owner_role', 'trigger_create_business_context');
  
  IF trigger_count < 2 THEN
    RAISE EXCEPTION 'Business creation triggers were not created properly';
  END IF;
  
  -- Verify functions exist
  SELECT COUNT(*)
  INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('create_business_owner_role', 'create_business_context');
  
  IF function_count < 2 THEN
    RAISE EXCEPTION 'Business creation trigger functions were not created';
  END IF;
  
  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE '✅ Business owner role trigger created';
  RAISE NOTICE '✅ Business context trigger created';
  RAISE NOTICE '✅ Triggers will fire automatically on business INSERT';
END $$;

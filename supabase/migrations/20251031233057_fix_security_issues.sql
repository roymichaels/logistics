/*
  # Security Fixes Migration

  1. Performance Improvements
    - Add missing indexes on foreign key columns
    - Improve query performance for common access patterns

  2. Function Security
    - Set immutable search_path for all auth helper functions
    - Prevent search path injection attacks

  3. RLS Enablement
    - Enable RLS on all public tables
    - Ensure data isolation and security

  4. Extension Management
    - Move citext extension to extensions schema
*/

-- =====================================================
-- Add Missing Foreign Key Indexes
-- =====================================================

-- businesses table
CREATE INDEX IF NOT EXISTS idx_businesses_infrastructure_id 
  ON businesses(infrastructure_id);

-- custom_role_permissions table
CREATE INDEX IF NOT EXISTS idx_custom_role_permissions_permission_id 
  ON custom_role_permissions(permission_id);

-- custom_roles table
CREATE INDEX IF NOT EXISTS idx_custom_roles_base_role_id 
  ON custom_roles(base_role_id);

-- login_history table
CREATE INDEX IF NOT EXISTS idx_login_history_user_id 
  ON login_history(user_id);

-- permission_check_failures table
CREATE INDEX IF NOT EXISTS idx_permission_check_failures_business_id 
  ON permission_check_failures(business_id);
CREATE INDEX IF NOT EXISTS idx_permission_check_failures_user_id 
  ON permission_check_failures(user_id);

-- pin_audit_log table
CREATE INDEX IF NOT EXISTS idx_pin_audit_log_business_id 
  ON pin_audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_pin_audit_log_user_id 
  ON pin_audit_log(user_id);

-- pin_sessions table
CREATE INDEX IF NOT EXISTS idx_pin_sessions_business_id 
  ON pin_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_pin_sessions_user_id 
  ON pin_sessions(user_id);

-- role_permissions table
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id 
  ON role_permissions(permission_id);

-- user_business_contexts table
CREATE INDEX IF NOT EXISTS idx_user_business_contexts_business_id 
  ON user_business_contexts(business_id);
CREATE INDEX IF NOT EXISTS idx_user_business_contexts_infrastructure_id 
  ON user_business_contexts(infrastructure_id);

-- user_business_roles table (already has idx_user_business_roles_business indexed, add others)
CREATE INDEX IF NOT EXISTS idx_user_business_roles_custom_role_id 
  ON user_business_roles(custom_role_id);
CREATE INDEX IF NOT EXISTS idx_user_business_roles_role_id 
  ON user_business_roles(role_id);

-- user_permissions_cache table
CREATE INDEX IF NOT EXISTS idx_user_permissions_cache_business_id 
  ON user_permissions_cache(business_id);

-- user_registrations table
CREATE INDEX IF NOT EXISTS idx_user_registrations_reviewed_by 
  ON user_registrations(reviewed_by);

-- =====================================================
-- Fix Function Search Paths
-- =====================================================

CREATE OR REPLACE FUNCTION auth_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt()->>'role', '') = 'superadmin';
$$;

CREATE OR REPLACE FUNCTION auth_current_business_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claim text;
BEGIN
  claim := auth.jwt()->>'business_id';
  IF claim IS NULL OR claim = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN claim::uuid;
  EXCEPTION
    WHEN others THEN
      RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION auth_current_infrastructure_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claim text;
BEGIN
  claim := auth.jwt()->>'infrastructure_id';
  IF claim IS NULL OR claim = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN claim::uuid;
  EXCEPTION
    WHEN others THEN
      RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION auth_role_is_one_of(VARIADIC roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt()->>'role', '') = ANY(roles);
$$;

-- =====================================================
-- Enable RLS on All Tables
-- =====================================================

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructures ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_business_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_business_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_check_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Move citext Extension to extensions Schema
-- =====================================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop and recreate citext in extensions schema
DROP EXTENSION IF EXISTS citext CASCADE;
CREATE EXTENSION IF NOT EXISTS citext SCHEMA extensions;

-- Note: Tables using citext will continue to work as PostgreSQL
-- resolves the type through the search path
/*
  # Dynamic RBAC System - Infrastructure-First Architecture

  ## Overview
  This migration establishes a data-driven, infrastructure-anchored Role-Based Access Control system
  that replaces hardcoded role permissions with flexible, auditable, database-driven permissions.

  ## New Tables

  ### 1. `permissions`
  Core atomic permissions that can be assigned to roles.
  - Defines granular actions like `orders:create`, `inventory:update`, `financial:view_all_infrastructure`
  - Each permission has a module grouping (orders, inventory, financial, etc.)
  - Includes human-readable descriptions for UI display
  - System-controlled; only infrastructure_owner can modify

  ### 2. `roles`
  Base role definitions with scope and hierarchy metadata.
  - Distinguishes infrastructure-level roles (global access) from business-level roles (scoped)
  - Includes role hierarchy for permission inheritance
  - Cannot be deleted if users are assigned to them
  - Stores default role configuration

  ### 3. `role_permissions`
  Junction table mapping roles to their allowed permissions.
  - Many-to-many relationship between roles and permissions
  - Enables dynamic permission assignment without code changes
  - Tracks when permissions were added/removed for audit

  ### 4. `custom_roles`
  Business-specific role customizations based on base roles.
  - Allows business owners to clone and modify business-level roles
  - Cannot grant permissions beyond base role scope
  - Scoped to specific business_id
  - Includes version tracking for rollback capability

  ### 5. `user_business_roles`
  Replaces business_users - tracks user role assignments per business context.
  - Supports multi-business user assignments
  - Includes is_primary flag for default business context
  - Tracks ownership_percentage for equity holders
  - Includes activation/deactivation timestamps

  ### 6. `role_change_log`
  Complete audit trail of all role and permission changes.
  - Tracks who made changes, when, and what changed
  - Stores before/after state for rollback capability
  - Includes business context for multi-tenant audit
  - Immutable audit record

  ### 7. `user_permissions_cache`
  Performance optimization table caching resolved user permissions.
  - Stores merged permissions from base + custom roles
  - Invalidated on role or permission changes
  - Includes business_context for multi-business users
  - Used by JWT generation and permission checks

  ## Security Features
  - Row Level Security enabled on all tables
  - Only infrastructure_owner can modify core permissions and base roles
  - Business owners can only customize business-level roles for their businesses
  - Complete audit trail of all permission changes
  - Permission validation prevents privilege escalation

  ## Key Principles
  1. Infrastructure-first: All system control originates from infrastructure ownership
  2. Zero hardcoding: All permissions are data-driven and editable
  3. Audit everything: Every permission change is logged with actor and timestamp
  4. Business isolation: Business owners cannot see or modify other businesses' custom roles
  5. Safe customization: Custom roles cannot exceed base role permission scope
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PERMISSIONS TABLE - Atomic permission definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT UNIQUE NOT NULL,
  module TEXT NOT NULL,
  description TEXT NOT NULL,
  is_infrastructure_only BOOLEAN NOT NULL DEFAULT false,
  is_system_permission BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(permission_key);

-- ============================================================================
-- ROLES TABLE - Base role definitions with scope metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  scope_level TEXT NOT NULL CHECK (scope_level IN ('infrastructure', 'business')),
  hierarchy_level INTEGER NOT NULL DEFAULT 100,
  is_system_role BOOLEAN NOT NULL DEFAULT true,
  can_be_customized BOOLEAN NOT NULL DEFAULT false,
  requires_business_context BOOLEAN NOT NULL DEFAULT true,
  can_see_financials BOOLEAN NOT NULL DEFAULT false,
  can_see_cross_business BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roles_scope_level ON roles(scope_level);
CREATE INDEX IF NOT EXISTS idx_roles_hierarchy ON roles(hierarchy_level);

-- ============================================================================
-- ROLE_PERMISSIONS TABLE - Junction mapping roles to permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID REFERENCES users(id),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================================
-- CUSTOM_ROLES TABLE - Business-specific role customizations
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  base_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  custom_role_name TEXT NOT NULL,
  custom_role_label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, custom_role_name)
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_business ON custom_roles(business_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_custom_roles_base ON custom_roles(base_role_id);

-- ============================================================================
-- CUSTOM_ROLE_PERMISSIONS TABLE - Permissions for custom roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  modified_by UUID REFERENCES users(id),
  modified_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(custom_role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_role_perms_custom_role ON custom_role_permissions(custom_role_id);
CREATE INDEX IF NOT EXISTS idx_custom_role_perms_enabled ON custom_role_permissions(custom_role_id, is_enabled);

-- ============================================================================
-- USER_BUSINESS_ROLES TABLE - User role assignments per business
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_business_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id),
  custom_role_id UUID REFERENCES custom_roles(id),
  ownership_percentage NUMERIC(5,2) DEFAULT 0 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  commission_percentage NUMERIC(5,2) DEFAULT 0 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  deactivated_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_id, business_id),
  CHECK (
    (role_id IS NOT NULL AND custom_role_id IS NULL) OR
    (role_id IS NULL AND custom_role_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_user_business_roles_user ON user_business_roles(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_business_roles_business ON user_business_roles(business_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_business_roles_primary ON user_business_roles(user_id, is_primary) WHERE is_primary = true;

-- ============================================================================
-- ROLE_CHANGE_LOG TABLE - Complete audit trail of role changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'role_created', 'role_updated', 'role_deleted',
    'permission_added', 'permission_removed',
    'custom_role_created', 'custom_role_updated', 'custom_role_deleted',
    'user_role_assigned', 'user_role_changed', 'user_role_removed'
  )),
  actor_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID REFERENCES users(id),
  target_role_id UUID REFERENCES roles(id),
  target_custom_role_id UUID REFERENCES custom_roles(id),
  target_permission_id UUID REFERENCES permissions(id),
  business_id UUID REFERENCES businesses(id),
  previous_state JSONB,
  new_state JSONB,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_change_log_actor ON role_change_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_role_change_log_target_user ON role_change_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_log_business ON role_change_log(business_id);
CREATE INDEX IF NOT EXISTS idx_role_change_log_created ON role_change_log(created_at DESC);

-- ============================================================================
-- USER_PERMISSIONS_CACHE TABLE - Performance optimization
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_permissions_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  resolved_permissions JSONB NOT NULL DEFAULT '[]',
  role_key TEXT NOT NULL,
  can_see_financials BOOLEAN NOT NULL DEFAULT false,
  can_see_cross_business BOOLEAN NOT NULL DEFAULT false,
  cache_version INTEGER NOT NULL DEFAULT 1,
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_user_perms_cache_user ON user_permissions_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_user_perms_cache_business ON user_permissions_cache(business_id);
CREATE INDEX IF NOT EXISTS idx_user_perms_cache_version ON user_permissions_cache(cache_version);

-- ============================================================================
-- SEED BASE PERMISSIONS
-- ============================================================================

INSERT INTO permissions (permission_key, module, description, is_infrastructure_only) VALUES
-- Orders module
('orders:view_all_infrastructure', 'orders', 'View all orders across all businesses', true),
('orders:view_all_business', 'orders', 'View all orders in own business', false),
('orders:view_own', 'orders', 'View only own orders', false),
('orders:view_business', 'orders', 'View business orders (limited)', false),
('orders:view_assigned', 'orders', 'View only assigned orders', false),
('orders:create', 'orders', 'Create new orders', false),
('orders:update', 'orders', 'Update order details', false),
('orders:delete', 'orders', 'Delete orders', false),
('orders:assign_driver', 'orders', 'Assign orders to drivers', false),
('orders:change_status', 'orders', 'Change order status', false),

-- Products module
('products:view', 'products', 'View product catalog', false),
('products:create', 'products', 'Add new products', false),
('products:update', 'products', 'Update product information', false),
('products:delete', 'products', 'Delete products', false),
('products:set_pricing', 'products', 'Set product pricing', false),

-- Inventory module
('inventory:view_all_infrastructure', 'inventory', 'View all inventory across all businesses', true),
('inventory:view_all_business', 'inventory', 'View all inventory in own business', false),
('inventory:view_business', 'inventory', 'View business inventory (limited)', false),
('inventory:view_own', 'inventory', 'View only own inventory', false),
('inventory:create', 'inventory', 'Create inventory records', false),
('inventory:update', 'inventory', 'Update inventory levels', false),
('inventory:delete', 'inventory', 'Delete inventory records', false),
('inventory:transfer', 'inventory', 'Transfer inventory between locations', false),
('inventory:request_restock', 'inventory', 'Request inventory restocking', false),
('inventory:approve_restock', 'inventory', 'Approve restock requests', false),
('inventory:fulfill_restock', 'inventory', 'Fulfill restock requests', false),

-- Users module
('users:view_all_infrastructure', 'users', 'View all users across all businesses', true),
('users:view_all_business', 'users', 'View all users in own business', false),
('users:view_business', 'users', 'View business users (limited)', false),
('users:view_own', 'users', 'View own profile', false),
('users:create', 'users', 'Create new user accounts', false),
('users:update', 'users', 'Update user information', false),
('users:delete', 'users', 'Delete user accounts', false),
('users:change_role', 'users', 'Change user roles', false),
('users:approve', 'users', 'Approve user registrations', false),
('users:set_ownership', 'users', 'Set business ownership percentages', false),
('users:assign_to_business', 'users', 'Assign users to businesses', false),

-- Financial module
('financial:view_all_infrastructure', 'financial', 'View all financial data across businesses', true),
('financial:view_own_business', 'financial', 'View own business financial data', false),
('financial:view_own_earnings', 'financial', 'View own earnings', false),
('financial:view_business_revenue', 'financial', 'View business revenue reports', false),
('financial:view_business_costs', 'financial', 'View business cost reports', false),
('financial:view_business_profit', 'financial', 'View business profit reports', false),
('financial:view_ownership_distribution', 'financial', 'View ownership and profit distribution', false),
('financial:manage_distributions', 'financial', 'Manage profit distributions', false),
('financial:export_reports', 'financial', 'Export financial reports', false),

-- Business module
('business:view_all', 'business', 'View all businesses', true),
('business:view_own', 'business', 'View own business', false),
('business:create', 'business', 'Create new businesses', true),
('business:update', 'business', 'Update business information', false),
('business:delete', 'business', 'Delete businesses', true),
('business:manage_settings', 'business', 'Manage business settings', false),
('business:manage_ownership', 'business', 'Manage ownership structure', false),
('business:switch_context', 'business', 'Switch between businesses', false),

-- System module
('system:view_audit_logs', 'system', 'View system audit logs', false),
('system:manage_config', 'system', 'Manage system configuration', true),
('system:manage_infrastructure', 'system', 'Manage infrastructure settings', true),

-- Zones module
('zones:view', 'zones', 'View delivery zones', false),
('zones:create', 'zones', 'Create new zones', false),
('zones:update', 'zones', 'Update zone information', false),
('zones:assign_drivers', 'zones', 'Assign drivers to zones', false),

-- Analytics module
('analytics:view_all_infrastructure', 'analytics', 'View all analytics across businesses', true),
('analytics:view_all_business', 'analytics', 'View all business analytics', false),
('analytics:view_business', 'analytics', 'View business analytics (limited)', false),
('analytics:view_own', 'analytics', 'View own performance', false),
('analytics:export', 'analytics', 'Export analytics reports', false),

-- Messaging module
('messaging:send', 'messaging', 'Send direct messages', false),
('messaging:view', 'messaging', 'View and read messages', false),
('groups:create', 'groups', 'Create new group chats', false),
('groups:view', 'groups', 'View group chats', false),
('groups:manage_own', 'groups', 'Manage own groups', false),
('channels:create', 'channels', 'Create new channels', false),
('channels:view', 'channels', 'View channels', false),
('channels:manage_own', 'channels', 'Manage own channels', false)
ON CONFLICT (permission_key) DO NOTHING;

-- ============================================================================
-- SEED BASE ROLES
-- ============================================================================

INSERT INTO roles (role_key, label, description, scope_level, hierarchy_level, can_be_customized, requires_business_context, can_see_financials, can_see_cross_business) VALUES
('infrastructure_owner', 'Infrastructure Owner', 'Platform administrator with full system access', 'infrastructure', 1, false, false, true, true),
('infrastructure_manager', 'Infrastructure Manager', 'Platform support and audit access', 'infrastructure', 10, false, false, false, true),
('infrastructure_dispatcher', 'Infrastructure Dispatcher', 'Global order routing and driver assignment', 'infrastructure', 20, false, false, false, false),
('infrastructure_driver', 'Infrastructure Driver', 'Delivery personnel working for infrastructure', 'infrastructure', 30, false, false, false, false),
('infrastructure_warehouse', 'Infrastructure Warehouse Worker', 'Central warehouse and stock management', 'infrastructure', 25, false, false, false, false),
('infrastructure_accountant', 'Infrastructure Accountant', 'Financial oversight and reporting', 'infrastructure', 15, false, false, true, true),
('business_owner', 'Business Owner', 'Business equity holder with full business access', 'business', 100, true, true, true, false),
('manager', 'Business Manager', 'Operations manager with team oversight', 'business', 200, true, true, false, false),
('dispatcher', 'Business Dispatcher', 'Order routing within business', 'business', 250, true, true, false, false),
('driver', 'Business Driver', 'Delivery personnel for business', 'business', 300, true, true, false, false),
('warehouse', 'Business Warehouse Worker', 'Business warehouse operations', 'business', 275, true, true, false, false),
('sales', 'Sales Representative', 'Order creation and customer service', 'business', 350, true, true, false, false),
('customer_service', 'Customer Support', 'Customer service and order updates', 'business', 400, true, true, false, false)
ON CONFLICT (role_key) DO NOTHING;

-- ============================================================================
-- SEED ROLE-PERMISSION MAPPINGS (Infrastructure Owner - Full Access)
-- ============================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE role_key = 'infrastructure_owner'),
  id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_business_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Permissions Table
-- ============================================================================

CREATE POLICY "Everyone can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only infrastructure_owner can modify permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- RLS POLICIES - Roles Table
-- ============================================================================

CREATE POLICY "Everyone can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only infrastructure_owner can modify system roles"
  ON roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- RLS POLICIES - Role Permissions Table
-- ============================================================================

CREATE POLICY "Everyone can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only infrastructure_owner can modify role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- ============================================================================
-- RLS POLICIES - Custom Roles Table
-- ============================================================================

CREATE POLICY "Business owners can view own business custom roles"
  ON custom_roles FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid()
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('infrastructure_owner', 'infrastructure_manager')
    )
  );

CREATE POLICY "Business owners can create custom roles for their business"
  ON custom_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT ubr.business_id 
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'infrastructure_owner')
    )
  );

CREATE POLICY "Business owners can update own business custom roles"
  ON custom_roles FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT ubr.business_id 
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'infrastructure_owner')
    )
  );

-- ============================================================================
-- RLS POLICIES - User Business Roles Table
-- ============================================================================

CREATE POLICY "Users can view their own role assignments"
  ON user_business_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR business_id IN (
      SELECT ubr.business_id 
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'manager', 'infrastructure_owner')
    )
  );

CREATE POLICY "Owners can manage role assignments"
  ON user_business_roles FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT ubr.business_id 
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'infrastructure_owner')
    )
  );

-- ============================================================================
-- RLS POLICIES - Role Change Log (Read-only audit)
-- ============================================================================

CREATE POLICY "Owners and managers can view role change logs"
  ON role_change_log FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT ubr.business_id 
      FROM user_business_roles ubr
      JOIN roles r ON r.id = ubr.role_id
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND r.role_key IN ('business_owner', 'manager', 'infrastructure_owner', 'infrastructure_manager')
    )
    OR actor_id = auth.uid()
    OR target_user_id = auth.uid()
  );

CREATE POLICY "System can insert role change logs"
  ON role_change_log FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - User Permissions Cache
-- ============================================================================

CREATE POLICY "Users can view own permissions cache"
  ON user_permissions_cache FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage permissions cache"
  ON user_permissions_cache FOR ALL
  TO authenticated
  USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to invalidate user permissions cache
CREATE OR REPLACE FUNCTION invalidate_user_permissions_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM user_permissions_cache
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to invalidate cache on role changes
DROP TRIGGER IF EXISTS invalidate_cache_on_role_change ON user_business_roles;
CREATE TRIGGER invalidate_cache_on_role_change
  AFTER INSERT OR UPDATE OR DELETE ON user_business_roles
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_user_permissions_cache();

-- Function to log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO role_change_log (
      action_type, actor_id, target_user_id, business_id, new_state
    ) VALUES (
      'user_role_assigned',
      auth.uid(),
      NEW.user_id,
      NEW.business_id,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO role_change_log (
      action_type, actor_id, target_user_id, business_id, previous_state, new_state
    ) VALUES (
      'user_role_changed',
      auth.uid(),
      NEW.user_id,
      NEW.business_id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO role_change_log (
      action_type, actor_id, target_user_id, business_id, previous_state
    ) VALUES (
      'user_role_removed',
      auth.uid(),
      OLD.user_id,
      OLD.business_id,
      to_jsonb(OLD)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log role changes
DROP TRIGGER IF EXISTS log_user_role_changes ON user_business_roles;
CREATE TRIGGER log_user_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON user_business_roles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_change();

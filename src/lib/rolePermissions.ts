/**
 * Role-Based Access Control (RBAC) Permissions Matrix
 *
 * This module defines comprehensive permissions for all user roles
 * with clear separation between infrastructure-level and business-level access.
 *
 * KEY PRINCIPLES:
 * 1. Infrastructure Owner: Full platform access but clearly distinguished from business ownership
 * 2. Business Owner: Full access to their business data including financials, but sandboxed from other businesses
 * 3. Complete financial data isolation between businesses
 * 4. Multi-business users must have explicit business context
 */

import type { User } from '../data/types';

export type Permission =
  // Platform (Admin only)
  | 'platform:view_all'
  | 'platform:manage_infrastructures'
  | 'platform:manage_system_config'
  | 'platform:view_system_logs'
  | 'platform:manage_feature_flags'
  | 'platform:manage_superadmins'
  // Infrastructure Management
  | 'infrastructure:create'
  | 'infrastructure:delete'
  | 'infrastructure:assign_ownership'
  | 'infrastructure:view_all'
  | 'infrastructure:view_own'
  | 'infrastructure:update_own'
  | 'infrastructure:manage_settings'
  // Orders
  | 'orders:view_all_platform'
  | 'orders:view_all_infrastructure'
  | 'orders:view_all_business'
  | 'orders:view_own'
  | 'orders:view_business'
  | 'orders:view_assigned'
  | 'orders:create'
  | 'orders:update'
  | 'orders:delete'
  | 'orders:assign_driver'
  | 'orders:change_status'
  // Products
  | 'products:view'
  | 'products:create'
  | 'products:update'
  | 'products:delete'
  | 'products:set_pricing'
  // Catalog Management
  | 'catalog:view_platform'
  | 'catalog:edit_platform'
  | 'catalog:view_all_businesses'
  | 'catalog:view_infrastructure'
  | 'catalog:edit_infrastructure'
  | 'catalog:view_business'
  | 'catalog:edit_business'
  | 'catalog:inherit_from_platform'
  | 'catalog:inherit_from_infrastructure'
  | 'catalog:publish_to_businesses'
  | 'catalog:approve_products'
  | 'catalog:create_templates'
  | 'catalog:manage_categories'
  | 'catalog:bulk_operations'
  | 'catalog:export'
  // Permissions Management
  | 'permissions:view_all'
  | 'permissions:view_own'
  | 'permissions:manage_roles'
  | 'permissions:assign_roles'
  | 'permissions:audit_logs'
  | 'permissions:delegate'
  // Inventory
  | 'inventory:view_all_platform'
  | 'inventory:view_all_infrastructure'
  | 'inventory:view_all_business'
  | 'inventory:view_business'
  | 'inventory:view_own'
  | 'inventory:create'
  | 'inventory:update'
  | 'inventory:delete'
  | 'inventory:transfer'
  | 'inventory:request_restock'
  | 'inventory:approve_restock'
  | 'inventory:fulfill_restock'
  // Users
  | 'users:view_all_platform'
  | 'users:view_all_infrastructure'
  | 'users:view_all_business'
  | 'users:view_business'
  | 'users:view_own'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:change_role'
  | 'users:approve'
  | 'users:set_ownership'
  | 'users:assign_to_business'
  | 'users:assign_to_infrastructure'
  // Financial
  | 'financial:view_all_platform'
  | 'financial:view_all_infrastructure'
  | 'financial:view_own_business'
  | 'financial:view_own_earnings'
  | 'financial:view_business_revenue'
  | 'financial:view_business_costs'
  | 'financial:view_business_profit'
  | 'financial:view_ownership_distribution'
  | 'financial:manage_distributions'
  | 'financial:export_reports'
  // Business Management
  | 'business:view_all'
  | 'business:view_all_in_infrastructure'
  | 'business:view_own'
  | 'business:create'
  | 'business:update'
  | 'business:delete'
  | 'business:manage_settings'
  | 'business:manage_ownership'
  | 'business:switch_context'
  // System
  | 'system:view_audit_logs'
  | 'system:manage_config'
  | 'system:manage_infrastructure'
  // Zones & Dispatch
  | 'zones:view'
  | 'zones:create'
  | 'zones:update'
  | 'zones:assign_drivers'
  // Analytics
  | 'analytics:view_all_platform'
  | 'analytics:view_all_infrastructure'
  | 'analytics:view_all_business'
  | 'analytics:view_business'
  | 'analytics:view_own'
  | 'analytics:export'
  // Messaging & Groups
  | 'messaging:send'
  | 'messaging:view'
  | 'groups:create'
  | 'groups:view'
  | 'groups:manage_own'
  | 'channels:create'
  | 'channels:view'
  | 'channels:manage_own';

export interface RolePermissions {
  role: User['role'];
  label: string;
  level: 'platform' | 'infrastructure' | 'business';
  description: string;
  permissions: Permission[];
  canSeeFinancials: boolean;
  canSeeCrossBusinessData: boolean;
  canSeeCrossInfrastructureData?: boolean;
}

/**
 * Complete permissions matrix for all roles
 */
export const ROLE_PERMISSIONS: Record<User['role'], RolePermissions> = {
  // ========================================
  // PLATFORM LEVEL ROLES
  // These roles operate at the absolute highest level with access to everything
  // Includes: superadmin, admin
  // ========================================

  superadmin: {
    role: 'superadmin',
    label: 'Super Administrator',
    level: 'platform',
    description: 'Absolute platform control with all permissions including superadmin management',
    canSeeFinancials: true,
    canSeeCrossBusinessData: true,
    canSeeCrossInfrastructureData: true,
    permissions: [
      // Platform - Absolute control
      'platform:view_all',
      'platform:manage_infrastructures',
      'platform:manage_system_config',
      'platform:view_system_logs',
      'platform:manage_feature_flags',
      'platform:manage_superadmins',

      // Infrastructure - Full control
      'infrastructure:create',
      'infrastructure:delete',
      'infrastructure:assign_ownership',
      'infrastructure:view_all',
      'infrastructure:update_own',
      'infrastructure:manage_settings',

      // Orders - Platform-wide access
      'orders:view_all_platform',
      'orders:view_all_infrastructure',
      'orders:view_all_business',
      'orders:create',
      'orders:update',
      'orders:delete',
      'orders:assign_driver',
      'orders:change_status',

      // Products - Full CRUD
      'products:view',
      'products:create',
      'products:update',
      'products:delete',
      'products:set_pricing',

      // Catalog - Full platform-wide access
      'catalog:view_platform',
      'catalog:edit_platform',
      'catalog:view_all_businesses',
      'catalog:view_infrastructure',
      'catalog:edit_infrastructure',
      'catalog:view_business',
      'catalog:edit_business',
      'catalog:inherit_from_platform',
      'catalog:inherit_from_infrastructure',
      'catalog:publish_to_businesses',
      'catalog:approve_products',
      'catalog:create_templates',
      'catalog:manage_categories',
      'catalog:bulk_operations',
      'catalog:export',

      // Permissions - Full management
      'permissions:view_all',
      'permissions:manage_roles',
      'permissions:assign_roles',
      'permissions:audit_logs',
      'permissions:delegate',

      // Inventory - Platform-wide access
      'inventory:view_all_platform',
      'inventory:view_all_infrastructure',
      'inventory:view_all_business',
      'inventory:create',
      'inventory:update',
      'inventory:delete',
      'inventory:transfer',
      'inventory:request_restock',
      'inventory:approve_restock',
      'inventory:fulfill_restock',

      // Users - Complete control
      'users:view_all_platform',
      'users:view_all_infrastructure',
      'users:view_all_business',
      'users:create',
      'users:update',
      'users:delete',
      'users:change_role',
      'users:approve',
      'users:set_ownership',
      'users:assign_to_business',
      'users:assign_to_infrastructure',

      // Financial - Complete visibility
      'financial:view_all_platform',
      'financial:view_all_infrastructure',
      'financial:view_business_revenue',
      'financial:view_business_costs',
      'financial:view_business_profit',
      'financial:view_ownership_distribution',
      'financial:manage_distributions',
      'financial:export_reports',

      // Business - Full management
      'business:view_all',
      'business:create',
      'business:update',
      'business:delete',
      'business:manage_settings',
      'business:manage_ownership',
      'business:switch_context',

      // System - Full control
      'system:view_audit_logs',
      'system:manage_config',
      'system:manage_infrastructure',

      // Zones - Full management
      'zones:view',
      'zones:create',
      'zones:update',
      'zones:assign_drivers',

      // Analytics - Platform-wide access
      'analytics:view_all_platform',
      'analytics:view_all_infrastructure',
      'analytics:view_all_business',
      'analytics:export',

      // Messaging & Groups - Full access
      'messaging:send',
      'messaging:view',
      'groups:create',
      'groups:view',
      'groups:manage_own',
      'channels:create',
      'channels:view',
      'channels:manage_own',
    ],
  },

  admin: {
    role: 'admin',
    label: 'Platform Administrator',
    level: 'platform',
    description: 'Full platform access across all infrastructures and businesses (cannot manage superadmins)',
    canSeeFinancials: true,
    canSeeCrossBusinessData: true,
    canSeeCrossInfrastructureData: true,
    permissions: [
      // Platform - Full access except superadmin management
      'platform:view_all',
      'platform:manage_infrastructures',
      'platform:manage_system_config',
      'platform:view_system_logs',
      'platform:manage_feature_flags',

      // Infrastructure - Full control
      'infrastructure:create',
      'infrastructure:delete',
      'infrastructure:assign_ownership',
      'infrastructure:view_all',
      'infrastructure:update_own',
      'infrastructure:manage_settings',

      // Orders - Platform-wide access
      'orders:view_all_platform',
      'orders:view_all_infrastructure',
      'orders:view_all_business',
      'orders:create',
      'orders:update',
      'orders:delete',
      'orders:assign_driver',
      'orders:change_status',

      // Products - Full CRUD
      'products:view',
      'products:create',
      'products:update',
      'products:delete',
      'products:set_pricing',

      // Catalog - Full platform-wide access
      'catalog:view_platform',
      'catalog:edit_platform',
      'catalog:view_all_businesses',
      'catalog:view_infrastructure',
      'catalog:edit_infrastructure',
      'catalog:view_business',
      'catalog:edit_business',
      'catalog:inherit_from_platform',
      'catalog:inherit_from_infrastructure',
      'catalog:publish_to_businesses',
      'catalog:approve_products',
      'catalog:create_templates',
      'catalog:manage_categories',
      'catalog:bulk_operations',
      'catalog:export',

      // Permissions - Full management
      'permissions:view_all',
      'permissions:manage_roles',
      'permissions:assign_roles',
      'permissions:audit_logs',
      'permissions:delegate',

      // Inventory - Platform-wide access
      'inventory:view_all_platform',
      'inventory:view_all_infrastructure',
      'inventory:view_all_business',
      'inventory:create',
      'inventory:update',
      'inventory:delete',
      'inventory:transfer',
      'inventory:request_restock',
      'inventory:approve_restock',
      'inventory:fulfill_restock',

      // Users - Complete control except superadmin management
      'users:view_all_platform',
      'users:view_all_infrastructure',
      'users:view_all_business',
      'users:create',
      'users:update',
      'users:delete',
      'users:change_role',
      'users:approve',
      'users:set_ownership',
      'users:assign_to_business',
      'users:assign_to_infrastructure',

      // Financial - Complete visibility
      'financial:view_all_platform',
      'financial:view_all_infrastructure',
      'financial:view_business_revenue',
      'financial:view_business_costs',
      'financial:view_business_profit',
      'financial:view_ownership_distribution',
      'financial:manage_distributions',
      'financial:export_reports',

      // Business - Full management
      'business:view_all',
      'business:create',
      'business:update',
      'business:delete',
      'business:manage_settings',
      'business:manage_ownership',
      'business:switch_context',

      // System - Full control
      'system:view_audit_logs',
      'system:manage_config',
      'system:manage_infrastructure',

      // Zones - Full management
      'zones:view',
      'zones:create',
      'zones:update',
      'zones:assign_drivers',

      // Analytics - Platform-wide access
      'analytics:view_all_platform',
      'analytics:view_all_infrastructure',
      'analytics:view_all_business',
      'analytics:export',

      // Messaging & Groups - Full access
      'messaging:send',
      'messaging:view',
      'groups:create',
      'groups:view',
      'groups:manage_own',
      'channels:create',
      'channels:view',
      'channels:manage_own',
    ],
  },

  // ========================================
  // INFRASTRUCTURE LEVEL ROLES
  // These roles operate at the infrastructure level and can work across businesses within their infrastructure
  // Includes: infrastructure_owner, manager, dispatcher, driver, warehouse, customer_service, user
  // ========================================

  infrastructure_owner: {
    role: 'infrastructure_owner',
    label: 'Infrastructure Owner',
    level: 'infrastructure',
    description: 'Owner of multiple businesses grouped as infrastructure with full access within their infrastructure',
    canSeeFinancials: true,
    canSeeCrossBusinessData: true,
    canSeeCrossInfrastructureData: false,
    permissions: [
      // Infrastructure - Own infrastructure only
      'infrastructure:view_own',
      'infrastructure:update_own',
      'infrastructure:manage_settings',

      // Business - Can create within infrastructure
      'business:view_all_in_infrastructure',
      'business:create',
      'business:switch_context',

      // Orders - Full cross-business access within infrastructure
      'orders:view_all_infrastructure',
      'orders:create',
      'orders:update',
      'orders:delete',
      'orders:assign_driver',
      'orders:change_status',

      // Products - Full CRUD
      'products:view',
      'products:create',
      'products:update',
      'products:delete',
      'products:set_pricing',

      // Catalog - Infrastructure-wide access
      'catalog:view_infrastructure',
      'catalog:edit_infrastructure',
      'catalog:view_business',
      'catalog:edit_business',
      'catalog:inherit_from_platform',
      'catalog:publish_to_businesses',
      'catalog:approve_products',
      'catalog:create_templates',
      'catalog:manage_categories',
      'catalog:bulk_operations',
      'catalog:export',

      // Permissions - Infrastructure level management
      'permissions:view_all',
      'permissions:manage_roles',
      'permissions:assign_roles',
      'permissions:audit_logs',

      // Inventory - Full cross-business access
      'inventory:view_all_infrastructure',
      'inventory:create',
      'inventory:update',
      'inventory:delete',
      'inventory:transfer',
      'inventory:request_restock',
      'inventory:approve_restock',
      'inventory:fulfill_restock',

      // Users - Full management across all businesses
      'users:view_all_infrastructure',
      'users:create',
      'users:update',
      'users:delete',
      'users:change_role',
      'users:approve',
      'users:set_ownership',
      'users:assign_to_business',

      // Financial - Complete visibility across ALL businesses
      'financial:view_all_infrastructure',
      'financial:view_business_revenue',
      'financial:view_business_costs',
      'financial:view_business_profit',
      'financial:view_ownership_distribution',
      'financial:manage_distributions',
      'financial:export_reports',

      // Business - Full management
      'business:view_all',
      'business:create',
      'business:update',
      'business:delete',
      'business:manage_settings',
      'business:manage_ownership',
      'business:switch_context',

      // System - Full control
      'system:view_audit_logs',
      'system:manage_config',
      'system:manage_infrastructure',

      // Zones - Full management
      'zones:view',
      'zones:create',
      'zones:update',
      'zones:assign_drivers',

      // Analytics - Complete cross-business access
      'analytics:view_all_infrastructure',
      'analytics:export',

      // Messaging & Groups - Full access
      'messaging:send',
      'messaging:view',
      'groups:create',
      'groups:view',
      'groups:manage_own',
      'channels:create',
      'channels:view',
      'channels:manage_own',
    ],
  },

  accountant: {
    role: 'accountant',
    label: 'Infrastructure Accountant',
    level: 'infrastructure',
    description: 'Financial specialist with read-only access to all financial data and reports across infrastructure',
    canSeeFinancials: true,
    canSeeCrossBusinessData: true,
    canSeeCrossInfrastructureData: false,
    permissions: [
      // Infrastructure - View only
      'infrastructure:view_own',

      // Business - View across infrastructure
      'business:view_all_in_infrastructure',

      // Orders - View for financial tracking
      'orders:view_all_infrastructure',

      // Products - View only
      'products:view',

      // Catalog - View only
      'catalog:view_infrastructure',
      'catalog:view_business',
      'catalog:export',

      // Inventory - View for financial tracking
      'inventory:view_all_infrastructure',

      // Users - View for organizational context
      'users:view_all_infrastructure',

      // Financial - Complete visibility across ALL businesses (read-only)
      'financial:view_all_infrastructure',
      'financial:view_business_revenue',
      'financial:view_business_costs',
      'financial:view_business_profit',
      'financial:view_ownership_distribution',
      'financial:export_reports',

      // Analytics - Complete cross-business access (read-only)
      'analytics:view_all_infrastructure',
      'analytics:export',

      // System - Audit log access
      'system:view_audit_logs',

      // Messaging & Groups - Team communication
      'messaging:send',
      'messaging:view',
      'groups:view',
      'channels:view',
    ],
  },

  // ========================================
  // BUSINESS LEVEL ROLES
  // These roles are tied to specific businesses and cannot operate across businesses
  // Includes: business_owner, sales
  // ========================================

  business_owner: {
    role: 'business_owner',
    label: 'Business Owner',
    level: 'business',
    description: 'Business equity holder with full access to their business including all financial data',
    canSeeFinancials: true,
    canSeeCrossBusinessData: false,
    permissions: [
      // Orders - Full business-scoped access
      'orders:view_all_business',
      'orders:create',
      'orders:update',
      'orders:delete',
      'orders:assign_driver',
      'orders:change_status',

      // Products - Full CRUD within business
      'products:view',
      'products:create',
      'products:update',
      'products:delete',
      'products:set_pricing',

      // Catalog - Business level access
      'catalog:view_business',
      'catalog:edit_business',
      'catalog:inherit_from_platform',
      'catalog:inherit_from_infrastructure',
      'catalog:manage_categories',
      'catalog:export',

      // Permissions - Business team management
      'permissions:view_own',
      'permissions:assign_roles',
      'permissions:audit_logs',

      // Inventory - Full business access
      'inventory:view_all_business',
      'inventory:create',
      'inventory:update',
      'inventory:delete',
      'inventory:transfer',
      'inventory:request_restock',
      'inventory:approve_restock',
      'inventory:fulfill_restock',

      // Users - Full business team management
      'users:view_all_business',
      'users:create',
      'users:update',
      'users:delete',
      'users:change_role',
      'users:approve',
      'users:set_ownership',
      'users:assign_to_business',

      // Financial - Complete visibility for OWN BUSINESS ONLY
      'financial:view_own_business',
      'financial:view_business_revenue',
      'financial:view_business_costs',
      'financial:view_business_profit',
      'financial:view_ownership_distribution',
      'financial:export_reports',

      // Business - Own business management
      'business:view_own',
      'business:update',
      'business:manage_settings',
      'business:manage_ownership',
      'business:switch_context',

      // Zones - Management
      'zones:view',
      'zones:create',
      'zones:update',
      'zones:assign_drivers',

      // Analytics - Business level
      'analytics:view_all_business',
      'analytics:export',

      // System - Limited audit access
      'system:view_audit_logs',

      // Messaging & Groups - Full access
      'messaging:send',
      'messaging:view',
      'groups:create',
      'groups:view',
      'groups:manage_own',
      'channels:create',
      'channels:view',
      'channels:manage_own',
    ],
  },

  // ========================================
  // INFRASTRUCTURE LEVEL ROLES (continued)
  // ========================================

  manager: {
    role: 'manager',
    label: 'Business Manager',
    level: 'infrastructure',
    description: 'Operations manager with team oversight but limited financial visibility',
    canSeeFinancials: false,
    canSeeCrossBusinessData: false,
    permissions: [
      // Orders - Business scoped
      'orders:view_business',
      'orders:create',
      'orders:update',
      'orders:assign_driver',
      'orders:change_status',

      // Products - View and inventory management
      'products:view',
      'inventory:view_business',
      'inventory:update',
      'inventory:request_restock',
      'inventory:approve_restock',

      // Users - Team management (no ownership changes)
      'users:view_business',
      'users:create',
      'users:update',
      'users:change_role',
      'users:approve',

      // Financial - NO ACCESS TO REVENUE/FINANCIALS
      // Managers cannot see financial data

      // Business - View and limited settings
      'business:view_own',
      'business:manage_settings',

      // Zones - Management
      'zones:view',
      'zones:update',
      'zones:assign_drivers',

      // Analytics - Operational metrics only (no financials)
      'analytics:view_business',

      // System - Limited audit access
      'system:view_audit_logs',

      // Messaging & Groups - Full team communication
      'messaging:send',
      'messaging:view',
      'groups:create',
      'groups:view',
      'groups:manage_own',
      'channels:view',
    ],
  },

  dispatcher: {
    role: 'dispatcher',
    label: 'Dispatcher',
    level: 'infrastructure',
    description: 'Order routing and driver assignment specialist',
    canSeeFinancials: false,
    canSeeCrossBusinessData: false,
    permissions: [
      // Orders - Full operational access
      'orders:view_business',
      'orders:update',
      'orders:assign_driver',
      'orders:change_status',

      // Products - View only
      'products:view',

      // Inventory - View for dispatch decisions
      'inventory:view_business',

      // Zones - View and assignment
      'zones:view',
      'zones:assign_drivers',

      // Analytics - Operational metrics
      'analytics:view_business',

      // Messaging & Groups - Team communication
      'messaging:send',
      'messaging:view',
      'groups:create',
      'groups:view',
      'groups:manage_own',
      'channels:view',
    ],
  },

  driver: {
    role: 'driver',
    label: 'Driver',
    level: 'infrastructure',
    description: 'Delivery personnel with access to assigned orders only',
    canSeeFinancials: false,
    canSeeCrossBusinessData: false,
    permissions: [
      // Orders - Only assigned orders
      'orders:view_assigned',
      'orders:change_status',

      // Inventory - Own inventory only
      'inventory:view_own',
      'inventory:update',
      'inventory:request_restock',

      // Products - View for reference
      'products:view',

      // Zones - View assigned zones
      'zones:view',

      // Financial - Own earnings only
      'financial:view_own_earnings',

      // Analytics - Own performance
      'analytics:view_own',

      // Users - Own profile
      'users:view_own',

      // Messaging & Groups - Team communication
      'messaging:send',
      'messaging:view',
      'groups:create',
      'groups:view',
      'groups:manage_own',
      'channels:view',
    ],
  },

  warehouse: {
    role: 'warehouse',
    label: 'Warehouse Worker',
    level: 'infrastructure',
    description: 'Inventory management specialist with full warehouse access',
    canSeeFinancials: false,
    canSeeCrossBusinessData: false,
    permissions: [
      // Orders - NO ACCESS (business rule)

      // Products - Full management
      'products:view',
      'products:create',
      'products:update',

      // Inventory - Full warehouse access
      'inventory:view_business',
      'inventory:create',
      'inventory:update',
      'inventory:transfer',
      'inventory:approve_restock',
      'inventory:fulfill_restock',

      // Zones - View for inventory planning
      'zones:view',

      // Users - Own profile
      'users:view_own',

      // Messaging & Groups - Team communication
      'messaging:send',
      'messaging:view',
      'groups:create',
      'groups:view',
      'groups:manage_own',
      'channels:view',
    ],
  },

  sales: {
    role: 'sales',
    label: 'Sales Representative',
    level: 'business',
    description: 'Order creation and customer service with commission tracking across multiple businesses',
    canSeeFinancials: false,
    canSeeCrossBusinessData: false,
    permissions: [
      // Orders - Create and view own
      'orders:view_own',
      'orders:create',

      // Products - View catalog
      'products:view',

      // Inventory - Read-only view
      'inventory:view_business',
      'inventory:request_restock',

      // Financial - Own commission across all businesses
      'financial:view_own_earnings',

      // Business - Switch context for multi-business salespeople
      'business:switch_context',

      // Analytics - Own performance across businesses
      'analytics:view_own',

      // Users - Own profile
      'users:view_own',

      // Messaging & Groups - Customer communication
      'messaging:send',
      'messaging:view',
      'groups:view',
      'channels:view',
    ],
  },

  customer_service: {
    role: 'customer_service',
    label: 'Customer Service',
    level: 'infrastructure',
    description: 'Customer support with order viewing and status update capabilities',
    canSeeFinancials: false,
    canSeeCrossBusinessData: false,
    permissions: [
      // Orders - View business orders
      'orders:view_business',
      'orders:update',

      // Products - View catalog
      'products:view',

      // Inventory - View for customer queries
      'inventory:view_business',

      // Users - Own profile
      'users:view_own',

      // Messaging & Groups - Customer support communication
      'messaging:send',
      'messaging:view',
      'groups:view',
      'channels:view',
    ],
  },

  user: {
    role: 'user',
    label: 'User',
    level: 'infrastructure',
    description: 'Basic user with limited access to view own data',
    canSeeFinancials: false,
    canSeeCrossBusinessData: false,
    permissions: [
      // Users - Own profile only
      'users:view_own',

      // Messaging & Groups - Basic communication
      'messaging:send',
      'messaging:view',
      'groups:view',
      'channels:view',
    ],
  },

  customer: {
    role: 'customer',
    label: 'Customer',
    level: 'infrastructure',
    description: 'Customer with shopping and order management access',
    canSeeFinancials: false,
    canSeeCrossBusinessData: false,
    permissions: [
      // Users - Own profile only
      'users:view_own',

      // Messaging & Groups - Basic communication
      'messaging:send',
      'messaging:view',
      'groups:view',
      'channels:view',

      // Shopping & Orders - Customer-specific
      'catalog:view',
      'orders:create',
      'orders:view_own',
    ],
  },
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;

  const rolePermissions = ROLE_PERMISSIONS[user.role];
  if (!rolePermissions) return false;

  return rolePermissions.permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;

  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;

  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Get all permissions for a user's role
 */
export function getUserPermissions(user: User | null): Permission[] {
  if (!user) return [];

  const rolePermissions = ROLE_PERMISSIONS[user.role];
  return rolePermissions ? rolePermissions.permissions : [];
}

/**
 * Get role information
 */
export function getRoleInfo(role: User['role']): RolePermissions | null {
  return ROLE_PERMISSIONS[role] || null;
}

/**
 * Check if user can see financial data
 */
export function canViewFinancials(user: User | null): boolean {
  if (!user) return false;

  const roleInfo = getRoleInfo(user.role);
  return roleInfo?.canSeeFinancials || false;
}

/**
 * Check if user can see data across multiple businesses
 */
export function canViewCrossBusinessData(user: User | null): boolean {
  if (!user) return false;

  const roleInfo = getRoleInfo(user.role);
  return roleInfo?.canSeeCrossBusinessData || false;
}

/**
 * Check if user needs business context to operate
 */
export function requiresBusinessContext(user: User | null): boolean {
  if (!user) return false;

  // Infrastructure owners and accountants don't need business context (they can see everything in their infrastructure)
  if (user.role === 'infrastructure_owner' || user.role === 'accountant') return false;

  // All other roles are business-scoped
  return true;
}

/**
 * Check if user can change another user's role
 */
export function canChangeUserRole(
  actor: User | null,
  targetCurrentRole: User['role'],
  targetNewRole: User['role']
): { allowed: boolean; reason?: string } {
  if (!actor) {
    return { allowed: false, reason: 'No actor provided' };
  }

  // Cannot change own role
  if (actor.role === targetCurrentRole && targetNewRole !== targetCurrentRole) {
    return { allowed: false, reason: 'Cannot change your own role' };
  }

  // Infrastructure owner can change any role
  if (actor.role === 'infrastructure_owner') {
    return { allowed: true };
  }

  // Business owner can change business-level roles
  if (actor.role === 'business_owner') {
    // Cannot promote to infrastructure_owner
    if (targetNewRole === 'infrastructure_owner') {
      return { allowed: false, reason: 'Only infrastructure owner can assign infrastructure roles' };
    }

    // Cannot demote other business owners without ownership transfer
    if (targetCurrentRole === 'business_owner' && targetNewRole !== 'business_owner') {
      return { allowed: false, reason: 'Business owner role requires ownership transfer first' };
    }

    // Can change other business roles
    if (['business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'].includes(targetNewRole)) {
      return { allowed: true };
    }
  }

  // Manager can change non-owner business roles
  if (actor.role === 'manager') {
    // Cannot promote to any owner role
    if (targetNewRole === 'infrastructure_owner' || targetNewRole === 'business_owner') {
      return { allowed: false, reason: 'Only owners can assign ownership roles' };
    }

    // Cannot change current owners
    if (targetCurrentRole === 'infrastructure_owner' || targetCurrentRole === 'business_owner') {
      return { allowed: false, reason: 'Cannot change owner roles' };
    }

    // Can change other business roles
    if (['manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'].includes(targetNewRole)) {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: 'Insufficient permissions' };
}

/**
 * Get data access scope for a role
 */
export function getDataAccessScope(role: User['role']): 'platform' | 'infrastructure' | 'business' | 'own' | 'assigned' {
  switch (role) {
    case 'superadmin':
    case 'admin':
      return 'platform'; // All infrastructures and businesses
    case 'infrastructure_owner':
    case 'accountant':
      return 'infrastructure'; // All businesses within infrastructure
    case 'business_owner':
    case 'manager':
    case 'dispatcher':
    case 'warehouse':
    case 'customer_service':
      return 'business'; // Own business only
    case 'sales':
      return 'own'; // Only their own data (but across multiple businesses)
    case 'driver':
      return 'assigned'; // Only assigned orders
    default:
      return 'business';
  }
}

/**
 * Permission descriptions for UI display
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  // Platform
  'platform:view_all': 'View all platform data across all infrastructures',
  'platform:manage_infrastructures': 'Create, update, and delete infrastructures',
  'platform:manage_system_config': 'Manage system-wide configuration',
  'platform:view_system_logs': 'View system audit and error logs',
  'platform:manage_feature_flags': 'Manage feature flags and experiments',
  'platform:manage_superadmins': 'Manage superadmin accounts',

  // Infrastructure
  'infrastructure:create': 'Create new infrastructures',
  'infrastructure:delete': 'Delete infrastructures',
  'infrastructure:assign_ownership': 'Assign infrastructure ownership',
  'infrastructure:view_all': 'View all infrastructures',
  'infrastructure:view_own': 'View own infrastructure',
  'infrastructure:update_own': 'Update own infrastructure',
  'infrastructure:manage_settings': 'Manage infrastructure settings',

  // Orders
  'orders:view_all_platform': 'View all orders across all infrastructures and businesses',
  'orders:view_all_infrastructure': 'View all orders across all businesses (infrastructure)',
  'orders:view_all_business': 'View all orders in your business',
  'orders:view_own': 'View only orders you created',
  'orders:view_business': 'View business orders (limited)',
  'orders:view_assigned': 'View only orders assigned to you',
  'orders:create': 'Create new orders',
  'orders:update': 'Update order details',
  'orders:delete': 'Delete orders',
  'orders:assign_driver': 'Assign orders to drivers',
  'orders:change_status': 'Change order status',

  'products:view': 'View product catalog',
  'products:create': 'Add new products',
  'products:update': 'Update product information',
  'products:delete': 'Delete products',
  'products:set_pricing': 'Set product pricing',

  'catalog:view_platform': 'View platform master catalog',
  'catalog:edit_platform': 'Edit platform master catalog',
  'catalog:view_all_businesses': 'View all business catalogs across platform',
  'catalog:view_infrastructure': 'View infrastructure catalog and all businesses within',
  'catalog:edit_infrastructure': 'Edit infrastructure-level catalog',
  'catalog:view_business': 'View own business catalog',
  'catalog:edit_business': 'Edit own business catalog',
  'catalog:inherit_from_platform': 'Inherit products from platform master catalog',
  'catalog:inherit_from_infrastructure': 'Inherit products from infrastructure catalog',
  'catalog:publish_to_businesses': 'Publish catalog changes to multiple businesses',
  'catalog:approve_products': 'Approve product changes and additions',
  'catalog:create_templates': 'Create product templates for reuse',
  'catalog:manage_categories': 'Manage product categories',
  'catalog:bulk_operations': 'Perform bulk catalog operations',
  'catalog:export': 'Export catalog data',

  'permissions:view_all': 'View all permissions and roles',
  'permissions:view_own': 'View own team permissions',
  'permissions:manage_roles': 'Create and edit role permissions',
  'permissions:assign_roles': 'Assign roles to users',
  'permissions:audit_logs': 'View permission change audit logs',
  'permissions:delegate': 'Delegate permissions temporarily',

  'inventory:view_all_platform': 'View all inventory across all infrastructures and businesses',
  'inventory:view_all_infrastructure': 'View all inventory across all businesses',
  'inventory:view_all_business': 'View all inventory in your business',
  'inventory:view_business': 'View business inventory (limited)',
  'inventory:view_own': 'View only your own inventory',
  'inventory:create': 'Create inventory records',
  'inventory:update': 'Update inventory levels',
  'inventory:delete': 'Delete inventory records',
  'inventory:transfer': 'Transfer inventory between locations',
  'inventory:request_restock': 'Request inventory restocking',
  'inventory:approve_restock': 'Approve restock requests',
  'inventory:fulfill_restock': 'Fulfill restock requests',

  'users:view_all_platform': 'View all users across all infrastructures and businesses',
  'users:view_all_infrastructure': 'View all users across all businesses',
  'users:view_all_business': 'View all users in your business',
  'users:view_business': 'View business users (limited)',
  'users:view_own': 'View your own profile',
  'users:create': 'Create new user accounts',
  'users:update': 'Update user information',
  'users:delete': 'Delete user accounts',
  'users:change_role': 'Change user roles',
  'users:approve': 'Approve user registrations',
  'users:set_ownership': 'Set business ownership percentages',
  'users:assign_to_business': 'Assign users to businesses',
  'users:assign_to_infrastructure': 'Assign users to infrastructures',

  'financial:view_all_platform': 'View all financial data across all infrastructures and businesses',
  'financial:view_all_infrastructure': 'View all financial data across businesses',
  'financial:view_own_business': 'View your business financial data',
  'financial:view_own_earnings': 'View your own earnings',
  'financial:view_business_revenue': 'View business revenue reports',
  'financial:view_business_costs': 'View business cost reports',
  'financial:view_business_profit': 'View business profit reports',
  'financial:view_ownership_distribution': 'View ownership and profit distribution',
  'financial:manage_distributions': 'Manage profit distributions',
  'financial:export_reports': 'Export financial reports',

  'business:view_all': 'View all businesses',
  'business:view_all_in_infrastructure': 'View all businesses in your infrastructure',
  'business:view_own': 'View your business',
  'business:create': 'Create new businesses',
  'business:update': 'Update business information',
  'business:delete': 'Delete businesses',
  'business:manage_settings': 'Manage business settings',
  'business:manage_ownership': 'Manage ownership structure',
  'business:switch_context': 'Switch between businesses',

  'system:view_audit_logs': 'View system audit logs',
  'system:manage_config': 'Manage system configuration',
  'system:manage_infrastructure': 'Manage infrastructure settings',

  'zones:view': 'View delivery zones',
  'zones:create': 'Create new zones',
  'zones:update': 'Update zone information',
  'zones:assign_drivers': 'Assign drivers to zones',

  'analytics:view_all_platform': 'View all analytics across all infrastructures and businesses',
  'analytics:view_all_infrastructure': 'View all analytics across businesses',
  'analytics:view_all_business': 'View all business analytics',
  'analytics:view_business': 'View business analytics (limited)',
  'analytics:view_own': 'View your own performance',
  'analytics:export': 'Export analytics reports',

  'messaging:send': 'Send direct messages',
  'messaging:view': 'View and read messages',
  'groups:create': 'Create new group chats',
  'groups:view': 'View group chats',
  'groups:manage_own': 'Manage groups you created',
  'channels:create': 'Create new channels',
  'channels:view': 'View channels',
  'channels:manage_own': 'Manage channels you created',
};

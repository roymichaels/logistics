/**
 * Role-Based Access Control (RBAC) Permissions Matrix
 *
 * Simplified role system based on business ownership and operational roles.
 * NO platform-level admin roles. Authority derives from business ownership.
 *
 * KEY PRINCIPLES:
 * 1. Business Owner: Full control of their own businesses
 * 2. Multi-business owners gain additional capabilities (computed, not a role)
 * 3. All operational roles are scoped to a business context
 * 4. No god-mode roles - everyone operates within business boundaries
 */

import type { User } from '../data/types';

export type Permission =
  // Business Management
  | 'business:view_own'
  | 'business:create'
  | 'business:update'
  | 'business:delete'
  | 'business:manage_settings'
  | 'business:manage_ownership'
  | 'business:switch_context'
  // Orders
  | 'orders:view_business'
  | 'orders:view_assigned'
  | 'orders:view_own'
  | 'orders:create'
  | 'orders:update'
  | 'orders:delete'
  | 'orders:assign_driver'
  | 'orders:change_status'
  // Products & Catalog
  | 'products:view'
  | 'products:create'
  | 'products:update'
  | 'products:delete'
  | 'products:set_pricing'
  | 'catalog:view_business'
  | 'catalog:edit_business'
  | 'catalog:manage_categories'
  | 'catalog:bulk_operations'
  | 'catalog:export'
  // Inventory
  | 'inventory:view_business'
  | 'inventory:view_own'
  | 'inventory:create'
  | 'inventory:update'
  | 'inventory:delete'
  | 'inventory:transfer'
  | 'inventory:request_restock'
  | 'inventory:approve_restock'
  | 'inventory:fulfill_restock'
  // Users & Team
  | 'users:view_business'
  | 'users:view_own'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:change_role'
  | 'users:approve'
  | 'users:assign_to_business'
  // Financial
  | 'financial:view_own_business'
  | 'financial:view_own_earnings'
  | 'financial:view_business_revenue'
  | 'financial:view_business_costs'
  | 'financial:view_business_profit'
  | 'financial:view_ownership_distribution'
  | 'financial:manage_distributions'
  | 'financial:export_reports'
  // Zones & Dispatch
  | 'zones:view'
  | 'zones:create'
  | 'zones:update'
  | 'zones:assign_drivers'
  | 'dispatch:view'
  | 'dispatch:assign'
  | 'dispatch:reassign'
  // Analytics
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
  | 'channels:manage_own'
  // Drivers
  | 'drivers:view_business'
  | 'drivers:view_own'
  | 'drivers:manage'
  | 'drivers:approve'
  | 'drivers:assign_zones'
  // Permissions Management
  | 'permissions:view_own'
  | 'permissions:assign_roles'
  | 'permissions:audit_logs';

export interface RolePermissions {
  role: string;
  label: string;
  level: 'business' | 'operational' | 'customer';
  description: string;
  permissions: Permission[];
  canSeeFinancials: boolean;
  requiresBusinessContext: boolean;
}

/**
 * Complete permissions matrix for all roles
 */
export const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  // ========================================
  // BUSINESS OWNER
  // Full control over owned businesses
  // ========================================
  business_owner: {
    role: 'business_owner',
    label: 'Business Owner',
    level: 'business',
    description: 'Full control over owned businesses including financials, staff, and operations',
    canSeeFinancials: true,
    requiresBusinessContext: true,
    permissions: [
      // Business Management
      'business:view_own',
      'business:create',
      'business:update',
      'business:delete',
      'business:manage_settings',
      'business:manage_ownership',
      'business:switch_context',

      // Orders - Full control
      'orders:view_business',
      'orders:create',
      'orders:update',
      'orders:delete',
      'orders:assign_driver',
      'orders:change_status',

      // Products & Catalog - Full control
      'products:view',
      'products:create',
      'products:update',
      'products:delete',
      'products:set_pricing',
      'catalog:view_business',
      'catalog:edit_business',
      'catalog:manage_categories',
      'catalog:bulk_operations',
      'catalog:export',

      // Inventory - Full control
      'inventory:view_business',
      'inventory:create',
      'inventory:update',
      'inventory:delete',
      'inventory:transfer',
      'inventory:request_restock',
      'inventory:approve_restock',
      'inventory:fulfill_restock',

      // Users & Team - Full control
      'users:view_business',
      'users:create',
      'users:update',
      'users:delete',
      'users:change_role',
      'users:approve',
      'users:assign_to_business',

      // Financial - Full visibility
      'financial:view_own_business',
      'financial:view_business_revenue',
      'financial:view_business_costs',
      'financial:view_business_profit',
      'financial:view_ownership_distribution',
      'financial:manage_distributions',
      'financial:export_reports',

      // Zones & Dispatch - Full control
      'zones:view',
      'zones:create',
      'zones:update',
      'zones:assign_drivers',
      'dispatch:view',
      'dispatch:assign',
      'dispatch:reassign',

      // Drivers - Full control
      'drivers:view_business',
      'drivers:manage',
      'drivers:approve',
      'drivers:assign_zones',

      // Analytics
      'analytics:view_business',
      'analytics:export',

      // Messaging
      'messaging:send',
      'messaging:view',
      'groups:create',
      'groups:view',
      'groups:manage_own',
      'channels:create',
      'channels:view',
      'channels:manage_own',

      // Permissions
      'permissions:view_own',
      'permissions:assign_roles',
      'permissions:audit_logs',
    ],
  },

  // ========================================
  // MANAGER
  // Operational control with restricted permissions
  // Cannot delete business, assign owners, or create other managers
  // ========================================
  manager: {
    role: 'manager',
    label: 'Manager',
    level: 'business',
    description: 'Operational control within a business with restricted financial access',
    canSeeFinancials: false,
    requiresBusinessContext: true,
    permissions: [
      'business:view_own',

      'orders:view_business',
      'orders:create',
      'orders:update',
      'orders:assign_driver',
      'orders:change_status',

      'products:view',
      'products:create',
      'products:update',
      'catalog:view_business',
      'catalog:edit_business',

      'inventory:view_business',
      'inventory:update',
      'inventory:transfer',
      'inventory:request_restock',
      'inventory:fulfill_restock',

      'users:view_business',

      'zones:view',
      'zones:update',
      'dispatch:view',
      'dispatch:assign',

      'drivers:view_business',
      'drivers:assign_zones',

      'analytics:view_business',

      'messaging:send',
      'messaging:view',
      'groups:view',
      'channels:view',
    ],
  },

  // ========================================
  // WAREHOUSE
  // Inventory receiving, storing, and fulfillment
  // ========================================
  warehouse: {
    role: 'warehouse',
    label: 'Warehouse Staff',
    level: 'operational',
    description: 'Inventory receiving, storing, and fulfillment operations',
    canSeeFinancials: false,
    requiresBusinessContext: true,
    permissions: [
      'orders:view_business',
      'orders:change_status',

      'products:view',
      'catalog:view_business',

      'inventory:view_business',
      'inventory:create',
      'inventory:update',
      'inventory:transfer',
      'inventory:request_restock',
      'inventory:fulfill_restock',

      'messaging:send',
      'messaging:view',
    ],
  },

  // ========================================
  // DISPATCHER
  // Delivery routing and driver assignment
  // ========================================
  dispatcher: {
    role: 'dispatcher',
    label: 'Dispatcher',
    level: 'operational',
    description: 'Live delivery routing and driver assignment',
    canSeeFinancials: false,
    requiresBusinessContext: true,
    permissions: [
      'orders:view_business',
      'orders:assign_driver',
      'orders:change_status',

      'zones:view',
      'dispatch:view',
      'dispatch:assign',
      'dispatch:reassign',

      'drivers:view_business',
      'drivers:assign_zones',

      'messaging:send',
      'messaging:view',
    ],
  },

  // ========================================
  // SALES
  // Customer relationship management and sales
  // ========================================
  sales: {
    role: 'sales',
    label: 'Sales Representative',
    level: 'operational',
    description: 'Customer relationship management and order creation',
    canSeeFinancials: false,
    requiresBusinessContext: true,
    permissions: [
      'orders:view_business',
      'orders:create',
      'orders:update',

      'products:view',
      'catalog:view_business',

      'users:view_business',

      'analytics:view_own',

      'messaging:send',
      'messaging:view',
      'groups:view',
      'channels:view',
    ],
  },

  // ========================================
  // CUSTOMER SERVICE
  // Customer support and order assistance
  // ========================================
  customer_service: {
    role: 'customer_service',
    label: 'Customer Service',
    level: 'operational',
    description: 'Customer support, tickets, and order assistance',
    canSeeFinancials: false,
    requiresBusinessContext: true,
    permissions: [
      'orders:view_business',
      'orders:update',

      'products:view',
      'catalog:view_business',

      'users:view_business',

      'messaging:send',
      'messaging:view',
      'groups:view',
      'channels:view',
    ],
  },

  // ========================================
  // DRIVER
  // Delivery lifecycle management
  // ========================================
  driver: {
    role: 'driver',
    label: 'Driver',
    level: 'operational',
    description: 'Delivery lifecycle management with mobile-first experience',
    canSeeFinancials: false,
    requiresBusinessContext: false,
    permissions: [
      'orders:view_assigned',
      'orders:change_status',

      'inventory:view_own',
      'inventory:update',

      'zones:view',

      'drivers:view_own',

      'financial:view_own_earnings',

      'analytics:view_own',

      'messaging:send',
      'messaging:view',
    ],
  },

  // ========================================
  // CUSTOMER
  // Shopping and order tracking
  // ========================================
  customer: {
    role: 'customer',
    label: 'Customer',
    level: 'customer',
    description: 'Shopping, order placement, and order tracking',
    canSeeFinancials: false,
    requiresBusinessContext: false,
    permissions: [
      'orders:view_own',
      'orders:create',

      'products:view',
      'catalog:view_business',

      'users:view_own',

      'messaging:send',
      'messaging:view',
    ],
  },

  // ========================================
  // GUEST
  // Browse only (no authentication)
  // ========================================
  guest: {
    role: 'guest',
    label: 'Guest',
    level: 'customer',
    description: 'Browse catalog without authentication',
    canSeeFinancials: false,
    requiresBusinessContext: false,
    permissions: [
      'products:view',
      'catalog:view_business',
    ],
  },
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: string | null, permission: Permission): boolean {
  if (!userRole) return false;

  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) return false;

  return rolePermissions.permissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: string): Permission[] {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions?.permissions || [];
}

/**
 * Check if a role can see financial data
 */
export function canSeeFinancials(role: string): boolean {
  return ROLE_PERMISSIONS[role]?.canSeeFinancials || false;
}

/**
 * Check if a role requires business context to operate
 */
export function requiresBusinessContext(role: string): boolean {
  return ROLE_PERMISSIONS[role]?.requiresBusinessContext || false;
}

/**
 * Human-readable descriptions for permissions
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  // Business Management
  'business:view_own': 'View owned businesses',
  'business:create': 'Create new businesses',
  'business:update': 'Update business information',
  'business:delete': 'Delete businesses',
  'business:manage_settings': 'Manage business settings',
  'business:manage_ownership': 'Manage business ownership and equity',
  'business:switch_context': 'Switch between multiple businesses',

  // Orders
  'orders:view_business': 'View all business orders',
  'orders:view_assigned': 'View assigned orders',
  'orders:view_own': 'View own orders',
  'orders:create': 'Create new orders',
  'orders:update': 'Update order details',
  'orders:delete': 'Delete orders',
  'orders:assign_driver': 'Assign drivers to orders',
  'orders:change_status': 'Change order status',

  // Products & Catalog
  'products:view': 'View products',
  'products:create': 'Create new products',
  'products:update': 'Update product details',
  'products:delete': 'Delete products',
  'products:set_pricing': 'Set product pricing',
  'catalog:view_business': 'View business catalog',
  'catalog:edit_business': 'Edit business catalog',
  'catalog:manage_categories': 'Manage product categories',
  'catalog:bulk_operations': 'Perform bulk catalog operations',
  'catalog:export': 'Export catalog data',

  // Inventory
  'inventory:view_business': 'View business inventory',
  'inventory:view_own': 'View own inventory',
  'inventory:create': 'Add inventory items',
  'inventory:update': 'Update inventory levels',
  'inventory:delete': 'Remove inventory items',
  'inventory:transfer': 'Transfer inventory between locations',
  'inventory:request_restock': 'Request inventory restock',
  'inventory:approve_restock': 'Approve restock requests',
  'inventory:fulfill_restock': 'Fulfill restock requests',

  // Users & Team
  'users:view_business': 'View business users',
  'users:view_own': 'View own profile',
  'users:create': 'Create new users',
  'users:update': 'Update user information',
  'users:delete': 'Delete users',
  'users:change_role': 'Change user roles',
  'users:approve': 'Approve new users',
  'users:assign_to_business': 'Assign users to business',

  // Financial
  'financial:view_own_business': 'View business financials',
  'financial:view_own_earnings': 'View personal earnings',
  'financial:view_business_revenue': 'View business revenue',
  'financial:view_business_costs': 'View business costs',
  'financial:view_business_profit': 'View business profit',
  'financial:view_ownership_distribution': 'View ownership distribution',
  'financial:manage_distributions': 'Manage profit distributions',
  'financial:export_reports': 'Export financial reports',

  // Zones & Dispatch
  'zones:view': 'View delivery zones',
  'zones:create': 'Create new zones',
  'zones:update': 'Update zone information',
  'zones:assign_drivers': 'Assign drivers to zones',
  'dispatch:view': 'View dispatch board',
  'dispatch:assign': 'Assign deliveries',
  'dispatch:reassign': 'Reassign deliveries',

  // Analytics
  'analytics:view_business': 'View business analytics',
  'analytics:view_own': 'View personal analytics',
  'analytics:export': 'Export analytics data',

  // Messaging & Groups
  'messaging:send': 'Send messages',
  'messaging:view': 'View messages',
  'groups:create': 'Create groups',
  'groups:view': 'View groups',
  'groups:manage_own': 'Manage own groups',
  'channels:create': 'Create channels',
  'channels:view': 'View channels',
  'channels:manage_own': 'Manage own channels',

  // Drivers
  'drivers:view_business': 'View business drivers',
  'drivers:view_own': 'View own driver profile',
  'drivers:manage': 'Manage drivers',
  'drivers:approve': 'Approve new drivers',
  'drivers:assign_zones': 'Assign drivers to zones',

  // Permissions Management
  'permissions:view_own': 'View own permissions',
  'permissions:assign_roles': 'Assign roles to users',
  'permissions:audit_logs': 'View permission audit logs',
};

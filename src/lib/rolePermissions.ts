/**
 * Role-Based Access Control (RBAC) Permissions Matrix
 *
 * This module defines comprehensive permissions for all user roles
 * across infrastructure and business levels.
 */

import type { User } from '../../data/types';

export type Permission =
  // Orders
  | 'orders:view_all'
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
  // Inventory
  | 'inventory:view_all'
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
  | 'users:view_all'
  | 'users:view_business'
  | 'users:view_own'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:change_role'
  | 'users:approve'
  | 'users:set_ownership'
  // Financial
  | 'financial:view_all'
  | 'financial:view_business'
  | 'financial:view_own_earnings'
  | 'financial:view_revenue'
  | 'financial:view_costs'
  | 'financial:view_profit'
  | 'financial:manage_distributions'
  | 'financial:export_reports'
  // Business Management
  | 'business:view_all'
  | 'business:view_own'
  | 'business:create'
  | 'business:update'
  | 'business:delete'
  | 'business:manage_settings'
  | 'business:manage_ownership'
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
  | 'analytics:view_all'
  | 'analytics:view_business'
  | 'analytics:view_own'
  | 'analytics:export';

export interface RolePermissions {
  role: User['role'];
  label: string;
  level: 'infrastructure' | 'business';
  description: string;
  permissions: Permission[];
}

/**
 * Complete permissions matrix for all roles
 */
export const ROLE_PERMISSIONS: Record<User['role'], RolePermissions> = {
  // ========================================
  // INFRASTRUCTURE LEVEL ROLES
  // ========================================

  owner: {
    role: 'owner',
    label: 'Infrastructure Owner',
    level: 'infrastructure',
    description: 'Platform super admin with full access to all businesses and system configuration',
    permissions: [
      // Orders - Full access across all businesses
      'orders:view_all',
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

      // Inventory - Full access
      'inventory:view_all',
      'inventory:create',
      'inventory:update',
      'inventory:delete',
      'inventory:transfer',
      'inventory:request_restock',
      'inventory:approve_restock',
      'inventory:fulfill_restock',

      // Users - Full management
      'users:view_all',
      'users:create',
      'users:update',
      'users:delete',
      'users:change_role',
      'users:approve',
      'users:set_ownership',

      // Financial - Complete visibility
      'financial:view_all',
      'financial:view_revenue',
      'financial:view_costs',
      'financial:view_profit',
      'financial:manage_distributions',
      'financial:export_reports',

      // Business - Full management
      'business:view_all',
      'business:create',
      'business:update',
      'business:delete',
      'business:manage_settings',
      'business:manage_ownership',

      // System - Full control
      'system:view_audit_logs',
      'system:manage_config',
      'system:manage_infrastructure',

      // Zones - Full management
      'zones:view',
      'zones:create',
      'zones:update',
      'zones:assign_drivers',

      // Analytics - Complete access
      'analytics:view_all',
      'analytics:export',
    ],
  },

  // ========================================
  // BUSINESS LEVEL ROLES
  // ========================================

  manager: {
    role: 'manager',
    label: 'Business Manager',
    level: 'business',
    description: 'Day-to-day operations manager with team oversight and approval authority',
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

      // Users - Team management
      'users:view_business',
      'users:create',
      'users:update',
      'users:change_role', // Limited to non-owner roles
      'users:approve',

      // Financial - Revenue visibility
      'financial:view_business',
      'financial:view_revenue',
      'financial:export_reports',

      // Business - View and limited settings
      'business:view_own',
      'business:manage_settings',

      // Zones - Management
      'zones:view',
      'zones:update',
      'zones:assign_drivers',

      // Analytics - Business level
      'analytics:view_business',
      'analytics:export',

      // System - Limited audit access
      'system:view_audit_logs',
    ],
  },

  dispatcher: {
    role: 'dispatcher',
    label: 'Dispatcher',
    level: 'business',
    description: 'Order routing and driver assignment specialist',
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
    ],
  },

  driver: {
    role: 'driver',
    label: 'Driver',
    level: 'business',
    description: 'Delivery personnel with access to assigned orders only',
    permissions: [
      // Orders - Only assigned orders
      'orders:view_assigned',
      'orders:change_status', // Only for assigned orders

      // Inventory - Own inventory only
      'inventory:view_own',
      'inventory:update', // Own inventory adjustments
      'inventory:request_restock',

      // Products - View for reference
      'products:view',

      // Zones - View assigned zones
      'zones:view',

      // Financial - Own earnings
      'financial:view_own_earnings',

      // Analytics - Own performance
      'analytics:view_own',

      // Users - Own profile
      'users:view_own',
    ],
  },

  warehouse: {
    role: 'warehouse',
    label: 'Warehouse Worker',
    level: 'business',
    description: 'Inventory management specialist with full warehouse access',
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
    ],
  },

  sales: {
    role: 'sales',
    label: 'Sales Representative',
    level: 'business',
    description: 'Order creation and customer service with limited permissions',
    permissions: [
      // Orders - Create and view own
      'orders:view_own',
      'orders:create',

      // Products - View catalog
      'products:view',

      // Inventory - Read-only view
      'inventory:view_business',
      'inventory:request_restock',

      // Financial - Own commission
      'financial:view_own_earnings',

      // Analytics - Own performance
      'analytics:view_own',

      // Users - Own profile
      'users:view_own',
    ],
  },

  customer_service: {
    role: 'customer_service',
    label: 'Customer Service',
    level: 'business',
    description: 'Customer support with order viewing and status update capabilities',
    permissions: [
      // Orders - View business orders
      'orders:view_business',
      'orders:update', // Limited to status and notes

      // Products - View catalog
      'products:view',

      // Inventory - View for customer queries
      'inventory:view_business',

      // Users - Own profile
      'users:view_own',
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
  if (actor.role === 'owner') {
    return { allowed: true };
  }

  // Manager can change business-level roles (except owner)
  if (actor.role === 'manager') {
    // Cannot promote to owner
    if (targetNewRole === 'owner') {
      return { allowed: false, reason: 'Only platform owner can assign owner role' };
    }

    // Cannot demote current owners
    if (targetCurrentRole === 'owner') {
      return { allowed: false, reason: 'Cannot change owner role' };
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
export function getDataAccessScope(role: User['role']): 'all' | 'business' | 'own' | 'assigned' {
  switch (role) {
    case 'owner':
      return 'all'; // All businesses
    case 'manager':
    case 'dispatcher':
    case 'warehouse':
    case 'customer_service':
      return 'business'; // Own business only
    case 'sales':
      return 'own'; // Only their own data
    case 'driver':
      return 'assigned'; // Only assigned orders
    default:
      return 'all'; // Default to owner permissions
  }
}

/**
 * Permission descriptions for UI display
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'orders:view_all': 'View all orders across all businesses',
  'orders:view_own': 'View only orders you created',
  'orders:view_business': 'View all orders in your business',
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

  'inventory:view_all': 'View all inventory across businesses',
  'inventory:view_business': 'View business inventory',
  'inventory:view_own': 'View only your own inventory',
  'inventory:create': 'Create inventory records',
  'inventory:update': 'Update inventory levels',
  'inventory:delete': 'Delete inventory records',
  'inventory:transfer': 'Transfer inventory between locations',
  'inventory:request_restock': 'Request inventory restocking',
  'inventory:approve_restock': 'Approve restock requests',
  'inventory:fulfill_restock': 'Fulfill restock requests',

  'users:view_all': 'View all users across all businesses',
  'users:view_business': 'View users in your business',
  'users:view_own': 'View your own profile',
  'users:create': 'Create new user accounts',
  'users:update': 'Update user information',
  'users:delete': 'Delete user accounts',
  'users:change_role': 'Change user roles',
  'users:approve': 'Approve user registrations',
  'users:set_ownership': 'Set business ownership percentages',

  'financial:view_all': 'View all financial data across businesses',
  'financial:view_business': 'View business financial data',
  'financial:view_own_earnings': 'View your own earnings',
  'financial:view_revenue': 'View revenue reports',
  'financial:view_costs': 'View cost reports',
  'financial:view_profit': 'View profit reports',
  'financial:manage_distributions': 'Manage profit distributions',
  'financial:export_reports': 'Export financial reports',

  'business:view_all': 'View all businesses',
  'business:view_own': 'View your business',
  'business:create': 'Create new businesses',
  'business:update': 'Update business information',
  'business:delete': 'Delete businesses',
  'business:manage_settings': 'Manage business settings',
  'business:manage_ownership': 'Manage ownership structure',

  'system:view_audit_logs': 'View system audit logs',
  'system:manage_config': 'Manage system configuration',
  'system:manage_infrastructure': 'Manage infrastructure settings',

  'zones:view': 'View delivery zones',
  'zones:create': 'Create new zones',
  'zones:update': 'Update zone information',
  'zones:assign_drivers': 'Assign drivers to zones',

  'analytics:view_all': 'View all analytics across businesses',
  'analytics:view_business': 'View business analytics',
  'analytics:view_own': 'View your own performance',
  'analytics:export': 'Export analytics reports',
};

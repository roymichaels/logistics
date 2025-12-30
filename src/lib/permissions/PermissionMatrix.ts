import { UserRole } from '../../shells/types';

export interface RolePermissions {
  canAccess: string[];
  cannotAccess: string[];
  canView: string[];
  canEdit: string[];
  canCreate: string[];
  canDelete: string[];
  actions: string[];
}

export const PERMISSION_MATRIX: Record<UserRole, RolePermissions> = {
  superadmin: {
    canAccess: ['/admin/*', '/infrastructure/*', '/business/*', '/driver/*', '/store/*'],
    cannotAccess: [],
    canView: ['all'],
    canEdit: ['all'],
    canCreate: ['all'],
    canDelete: ['all'],
    actions: ['all']
  },

  admin: {
    canAccess: ['/admin/*', '/infrastructure/*', '/business/*', '/driver/*', '/store/*'],
    cannotAccess: [],
    canView: ['businesses', 'users', 'orders', 'drivers', 'analytics', 'logs', 'settings'],
    canEdit: ['businesses', 'users', 'settings'],
    canCreate: ['businesses', 'users'],
    canDelete: ['users'],
    actions: ['view_platform_analytics', 'manage_businesses', 'manage_users', 'view_logs']
  },

  infrastructure_owner: {
    canAccess: ['/infrastructure/*', '/business/*'],
    cannotAccess: ['/admin/*', '/driver/*', '/store/*'],
    canView: ['businesses', 'orders', 'reports', 'analytics', 'drivers', 'team', 'catalogs'],
    canEdit: ['businesses', 'team', 'zones', 'drivers', 'catalogs'],
    canCreate: ['businesses', 'team_members', 'products'],
    canDelete: ['team_members'],
    actions: ['create_business', 'manage_team', 'view_consolidated_reports', 'manage_catalogs']
  },

  accountant: {
    canAccess: ['/infrastructure/*'],
    cannotAccess: ['/admin/*', '/business/*', '/driver/*', '/store/*'],
    canView: ['reports', 'analytics', 'orders'],
    canEdit: [],
    canCreate: [],
    canDelete: [],
    actions: ['view_reports', 'view_analytics', 'export_data']
  },

  business_owner: {
    canAccess: ['/business/*'],
    cannotAccess: ['/admin/*', '/infrastructure/*', '/driver/*', '/store/*'],
    canView: ['orders', 'products', 'inventory', 'reports', 'team', 'drivers', 'zones', 'analytics'],
    canEdit: ['products', 'inventory', 'team', 'zones', 'settings'],
    canCreate: ['products', 'orders', 'team_members'],
    canDelete: ['products', 'team_members'],
    actions: ['manage_products', 'manage_inventory', 'manage_team', 'manage_orders', 'view_reports']
  },

  manager: {
    canAccess: ['/business/*'],
    cannotAccess: ['/admin/*', '/infrastructure/*', '/driver/*', '/store/*'],
    canView: ['orders', 'products', 'inventory', 'reports', 'team', 'drivers', 'zones'],
    canEdit: ['products', 'inventory', 'orders', 'zones'],
    canCreate: ['products', 'orders'],
    canDelete: [],
    actions: ['manage_products', 'manage_inventory', 'manage_orders', 'assign_drivers']
  },

  warehouse: {
    canAccess: ['/business/inventory', '/business/incoming', '/business/restock', '/business/warehouse', '/business/dashboard'],
    cannotAccess: ['/admin/*', '/infrastructure/*', '/driver/*', '/store/*', '/business/team', '/business/settings'],
    canView: ['inventory', 'incoming', 'restock_requests', 'orders'],
    canEdit: ['inventory'],
    canCreate: ['restock_requests'],
    canDelete: [],
    actions: ['receive_inventory', 'pack_orders', 'submit_restock', 'update_stock']
  },

  dispatcher: {
    canAccess: ['/business/dispatch', '/business/orders', '/business/drivers', '/business/zones', '/business/dashboard'],
    cannotAccess: ['/admin/*', '/infrastructure/*', '/driver/*', '/store/*', '/business/team', '/business/settings', '/business/inventory'],
    canView: ['orders', 'drivers', 'zones', 'dispatch'],
    canEdit: ['orders', 'driver_assignments'],
    canCreate: ['routes'],
    canDelete: [],
    actions: ['assign_drivers', 'manage_routes', 'track_deliveries', 'update_order_status']
  },

  sales: {
    canAccess: ['/business/orders', '/business/dashboard', '/business/sales'],
    cannotAccess: ['/admin/*', '/infrastructure/*', '/driver/*', '/store/*', '/business/team', '/business/settings', '/business/inventory'],
    canView: ['orders', 'customers'],
    canEdit: ['orders'],
    canCreate: ['orders'],
    canDelete: [],
    actions: ['create_orders', 'manage_customers', 'apply_discounts']
  },

  customer_service: {
    canAccess: ['/business/orders', '/business/support', '/business/dashboard'],
    cannotAccess: ['/admin/*', '/infrastructure/*', '/driver/*', '/store/*', '/business/team', '/business/settings', '/business/inventory'],
    canView: ['orders', 'customers', 'support_tickets'],
    canEdit: ['orders', 'support_tickets'],
    canCreate: ['support_tickets'],
    canDelete: [],
    actions: ['modify_orders', 'handle_support', 'escalate_issues']
  },

  driver: {
    canAccess: ['/driver/*'],
    cannotAccess: ['/admin/*', '/infrastructure/*', '/business/*'],
    canView: ['deliveries', 'earnings', 'profile', 'tasks'],
    canEdit: ['profile', 'status'],
    canCreate: [],
    canDelete: [],
    actions: ['accept_delivery', 'update_status', 'complete_delivery', 'view_earnings']
  },

  customer: {
    canAccess: ['/store/*'],
    cannotAccess: ['/admin/*', '/infrastructure/*', '/business/*', '/driver/*'],
    canView: ['catalog', 'cart', 'orders', 'profile'],
    canEdit: ['profile', 'cart'],
    canCreate: ['orders'],
    canDelete: [],
    actions: ['browse_catalog', 'add_to_cart', 'checkout', 'track_order']
  },

  user: {
    canAccess: ['/store/*', '/auth/*'],
    cannotAccess: ['/admin/*', '/infrastructure/*', '/business/*', '/driver/*'],
    canView: ['catalog', 'profile'],
    canEdit: ['profile'],
    canCreate: [],
    canDelete: [],
    actions: ['browse_catalog', 'view_products']
  }
};

export function hasPermission(role: UserRole | null, permission: string): boolean {
  if (!role) return false;

  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) return false;

  if (permissions.actions.includes('all')) return true;
  if (permissions.actions.includes(permission)) return true;

  return false;
}

export function canAccessRoute(role: UserRole | null, path: string): boolean {
  if (!role) {
    return path.startsWith('/auth') || path.startsWith('/store') || path === '/';
  }

  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) return false;

  const cannotAccess = permissions.cannotAccess.some(pattern => {
    if (pattern.endsWith('/*')) {
      const base = pattern.slice(0, -2);
      return path.startsWith(base);
    }
    return path === pattern;
  });

  if (cannotAccess) return false;

  const canAccess = permissions.canAccess.some(pattern => {
    if (pattern.endsWith('/*')) {
      const base = pattern.slice(0, -2);
      return path.startsWith(base);
    }
    return path === pattern;
  });

  return canAccess;
}

export function canViewResource(role: UserRole | null, resource: string): boolean {
  if (!role) return false;

  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) return false;

  return permissions.canView.includes('all') || permissions.canView.includes(resource);
}

export function canEditResource(role: UserRole | null, resource: string): boolean {
  if (!role) return false;

  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) return false;

  return permissions.canEdit.includes('all') || permissions.canEdit.includes(resource);
}

export function canCreateResource(role: UserRole | null, resource: string): boolean {
  if (!role) return false;

  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) return false;

  return permissions.canCreate.includes('all') || permissions.canCreate.includes(resource);
}

export function canDeleteResource(role: UserRole | null, resource: string): boolean {
  if (!role) return false;

  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) return false;

  return permissions.canDelete.includes('all') || permissions.canDelete.includes(resource);
}

export function getAccessibleRoutes(role: UserRole | null): string[] {
  if (!role) return ['/auth/*', '/store/*'];

  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) return [];

  return permissions.canAccess;
}

export function getForbiddenRoutes(role: UserRole | null): string[] {
  if (!role) return [];

  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) return [];

  return permissions.cannotAccess;
}

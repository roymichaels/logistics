import React from 'react';
import { UserRole } from '../shells/types';

export interface RouteConfig {
  path: string;
  name: string;
  icon?: string;
  roles: UserRole[];
  children?: RouteConfig[];
  isEntryPoint?: boolean;
}

export const UNIFIED_ROUTES: RouteConfig[] = [
  // Admin routes (superadmin, admin only - NO infrastructure_owner per knowledgebase)
  {
    path: '/admin',
    name: 'Admin',
    roles: ['superadmin', 'admin'],
    isEntryPoint: true,
    children: [
      { path: '/admin/platform-dashboard', name: 'Platform Dashboard', roles: ['superadmin', 'admin'], isEntryPoint: true },
      { path: '/admin/infrastructures', name: 'Infrastructures', roles: ['superadmin', 'admin'] },
      { path: '/admin/superadmins', name: 'Superadmins', roles: ['superadmin', 'admin'] },
      { path: '/admin/businesses', name: 'Businesses', roles: ['superadmin', 'admin'] },
      { path: '/admin/users', name: 'Users', roles: ['superadmin', 'admin'] },
      { path: '/admin/platform-catalog', name: 'Platform Catalog', roles: ['superadmin', 'admin'] },
      { path: '/admin/analytics', name: 'Analytics', roles: ['superadmin', 'admin'] },
      { path: '/admin/orders', name: 'Orders', roles: ['superadmin', 'admin'] },
      { path: '/admin/drivers', name: 'Drivers', roles: ['superadmin', 'admin'] },
      { path: '/admin/driver-applications', name: 'Driver Applications', roles: ['superadmin', 'admin'] },
      { path: '/admin/logs', name: 'Audit Logs', roles: ['superadmin', 'admin'] },
      { path: '/admin/feature-flags', name: 'Feature Flags', roles: ['superadmin', 'admin'] },
      { path: '/admin/permissions', name: 'Permissions', roles: ['superadmin', 'admin'] },
      { path: '/admin/system-settings', name: 'System Settings', roles: ['superadmin', 'admin'] }
    ]
  },

  // Business routes
  {
    path: '/business',
    name: 'Business',
    roles: ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service'],
    isEntryPoint: true,
    children: [
      { path: '/business/dashboard', name: 'Dashboard', roles: ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service'], isEntryPoint: true },
      { path: '/business/businesses', name: 'My Businesses', roles: ['business_owner', 'manager'] },
      { path: '/business/catalog', name: 'Product Catalog', roles: ['business_owner', 'manager'] },
      { path: '/business/inventory', name: 'Inventory', roles: ['business_owner', 'manager', 'warehouse'] },
      { path: '/business/orders', name: 'Orders', roles: ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service'] },
      { path: '/business/dispatch', name: 'Dispatch', roles: ['business_owner', 'manager', 'dispatcher'] },
      { path: '/business/drivers', name: 'Drivers', roles: ['business_owner', 'manager'] },
      { path: '/business/zones', name: 'Zones', roles: ['business_owner', 'manager'] },
      { path: '/business/team', name: 'Team', roles: ['business_owner', 'manager'] },
      { path: '/business/reports', name: 'Reports', roles: ['business_owner', 'manager'] },
      { path: '/business/settings', name: 'Settings', roles: ['business_owner'] }
    ]
  },

  // Driver routes
  {
    path: '/driver',
    name: 'Driver',
    roles: ['driver'],
    isEntryPoint: true,
    children: [
      { path: '/driver/drivers', name: 'My Deliveries', roles: ['driver'], isEntryPoint: true },
      { path: '/driver/analytics', name: 'Analytics & Earnings', roles: ['driver'] },
      { path: '/driver/profile', name: 'Profile', roles: ['driver'] }
    ]
  },

  // Store/Customer routes
  {
    path: '/store',
    name: 'Store',
    roles: ['customer', 'guest'],
    isEntryPoint: true,
    children: [
      { path: '/store/catalog', name: 'Catalog', roles: ['customer', 'guest'], isEntryPoint: true },
      { path: '/store/cart', name: 'Cart', roles: ['customer', 'guest'] },
      { path: '/store/orders', name: 'Orders', roles: ['customer'] },
      { path: '/store/profile', name: 'Profile', roles: ['customer', 'guest'] }
    ]
  },

  // Auth routes (available to all)
  {
    path: '/auth',
    name: 'Authentication',
    roles: ['superadmin', 'admin', 'business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service', 'driver', 'customer', 'guest'],
    children: [
      { path: '/auth/login', name: 'Login', roles: ['superadmin', 'admin', 'business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service', 'driver', 'customer', 'guest'] },
      { path: '/auth/kyc', name: 'KYC', roles: ['superadmin', 'admin', 'business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service', 'driver', 'customer', 'guest'] }
    ]
  },

  // Multi-business owner portfolio (computed capability, not a role)
  {
    path: '/portfolio',
    name: 'Portfolio',
    roles: ['business_owner'],
    children: [
      { path: '/portfolio/dashboard', name: 'Portfolio Dashboard', roles: ['business_owner'], isEntryPoint: true },
      { path: '/portfolio/businesses', name: 'All Businesses', roles: ['business_owner'] },
      { path: '/portfolio/analytics', name: 'Cross-Business Analytics', roles: ['business_owner'] }
    ]
  }
];

export function canAccessRoute(
  userRole: UserRole | null,
  routePath: string,
  isMultiBusinessOwner?: boolean
): boolean {
  if (!userRole) {
    // Non-authenticated users can access public routes
    return routePath.startsWith('/auth') || routePath.startsWith('/store');
  }

  // Admin roles can access all admin routes
  if ((userRole === 'superadmin' || userRole === 'admin') && routePath.startsWith('/admin')) {
    return true;
  }

  // Multi-business owner portfolio routes (computed capability)
  if (routePath.startsWith('/portfolio')) {
    return userRole === 'business_owner' && isMultiBusinessOwner === true;
  }

  function findRoute(routes: RouteConfig[], path: string): RouteConfig | null {
    for (const route of routes) {
      if (route.path === path) return route;
      if (route.children) {
        const found = findRoute(route.children, path);
        if (found) return found;
      }
    }
    return null;
  }

  const route = findRoute(UNIFIED_ROUTES, routePath);
  if (!route) return false;

  return route.roles.includes(userRole);
}

export function getEntryPointForRole(role: UserRole | null, isMultiBusinessOwner?: boolean): string {
  if (!role) return '/store/catalog';

  // Multi-business owners get portfolio dashboard (computed capability per knowledgebase)
  if (role === 'business_owner' && isMultiBusinessOwner) {
    return '/portfolio/dashboard';
  }

  const entryPoints: Record<UserRole, string> = {
    superadmin: '/admin/platform-dashboard',
    admin: '/admin/platform-dashboard',
    business_owner: '/business/dashboard',
    manager: '/business/dashboard',
    warehouse: '/business/warehouse',
    dispatcher: '/business/dispatch',
    sales: '/business/sales',
    customer_service: '/business/support',
    driver: '/driver/drivers',
    customer: '/store/catalog',
    guest: '/store/catalog'
  };

  return entryPoints[role] || '/store/catalog';
}

export function getShellTypeForPath(path: string): 'admin' | 'business' | 'driver' | 'store' | 'auth' {
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/business')) return 'business';
  if (path.startsWith('/driver')) return 'driver';
  if (path.startsWith('/store')) return 'store';
  if (path.startsWith('/auth')) return 'auth';
  return 'store';
}

export function getRouteMetadata(path: string) {
  function findRoute(routes: RouteConfig[]): RouteConfig | null {
    for (const route of routes) {
      if (route.path === path) return route;
      if (route.children) {
        const found = findRoute(route.children);
        if (found) return found;
      }
    }
    return null;
  }

  return findRoute(UNIFIED_ROUTES);
}

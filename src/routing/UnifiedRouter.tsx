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
      { path: '/driver/deliveries', name: 'Deliveries', roles: ['driver'], isEntryPoint: true },
      { path: '/driver/earnings', name: 'Earnings', roles: ['driver'] },
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
    roles: ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service', 'driver', 'customer', 'guest'],
    children: [
      { path: '/auth/login', name: 'Login', roles: ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service', 'driver', 'customer', 'guest'] },
      { path: '/auth/kyc', name: 'KYC', roles: ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service', 'driver', 'customer', 'guest'] }
    ]
  }
];

export function canAccessRoute(userRole: UserRole | null, routePath: string): boolean {
  if (!userRole) {
    // Non-authenticated users can access public routes
    return routePath.startsWith('/auth') || routePath.startsWith('/store');
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

export function getEntryPointForRole(role: UserRole | null): string {
  if (!role) return '/store/catalog';

  const entryPoints: Record<UserRole, string> = {
    business_owner: '/business/dashboard',
    manager: '/business/dashboard',
    warehouse: '/business/inventory',
    dispatcher: '/business/dispatch',
    sales: '/business/orders',
    customer_service: '/business/orders',
    driver: '/driver/deliveries',
    customer: '/store/catalog',
    guest: '/store/catalog'
  };

  return entryPoints[role] || '/store/catalog';
}

export function getShellTypeForPath(path: string): 'business' | 'driver' | 'store' | 'auth' {
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

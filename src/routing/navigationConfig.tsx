import React from 'react';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  badge?: number | string;
  children?: NavigationItem[];
  roles?: string[];
}

export const ADMIN_NAVIGATION: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/admin/platform-dashboard',
    icon: '🏗️',
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'infrastructures',
    label: 'Infrastructures',
    path: '/admin/infrastructures',
    icon: '🏭',
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'businesses',
    label: 'Businesses',
    path: '/admin/businesses',
    icon: '🏢',
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'users',
    label: 'Users',
    path: '/admin/users',
    icon: '👥',
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'catalog',
    label: 'Platform Catalog',
    path: '/admin/platform-catalog',
    icon: '📦',
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/admin/analytics',
    icon: '📊',
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'orders',
    label: 'Orders',
    path: '/admin/orders',
    icon: '📋',
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'drivers',
    label: 'Drivers',
    path: '/admin/drivers',
    icon: '🚗',
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'logs',
    label: 'Audit Logs',
    path: '/admin/logs',
    icon: '📋',
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'feature-flags',
    label: 'Feature Flags',
    path: '/admin/feature-flags',
    icon: '🚩',
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'permissions',
    label: 'Permissions',
    path: '/admin/permissions',
    icon: '🔐',
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'settings',
    label: 'System Settings',
    path: '/admin/system-settings',
    icon: '⚙️',
    roles: ['superadmin', 'admin'],
  },
  {
    id: 'superadmins',
    label: 'Superadmins',
    path: '/admin/superadmins',
    icon: '👑',
    roles: ['superadmin', 'admin'],
  },
];

export const BUSINESS_NAVIGATION: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/business/dashboard',
    icon: '📊',
    roles: ['business_owner', 'manager'],
  },
  {
    id: 'orders',
    label: 'Orders',
    path: '/business/orders',
    icon: '📦',
    roles: ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service'],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    path: '/business/inventory',
    icon: '📋',
    roles: ['business_owner', 'manager', 'warehouse'],
  },
  {
    id: 'drivers',
    label: 'Drivers',
    path: '/business/drivers',
    icon: '🚚',
    roles: ['business_owner', 'manager', 'dispatcher'],
  },
  {
    id: 'zones',
    label: 'Zones',
    path: '/business/zones',
    icon: '🗺️',
    roles: ['business_owner', 'manager', 'dispatcher'],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    path: '/business/catalog',
    icon: '🛍️',
    roles: ['business_owner', 'manager', 'warehouse'],
  },
  {
    id: 'sales',
    label: 'Sales',
    path: '/business/sales',
    icon: '💰',
    roles: ['business_owner', 'manager', 'sales'],
  },
  {
    id: 'support',
    label: 'Support',
    path: '/business/support',
    icon: '🎧',
    roles: ['business_owner', 'manager', 'customer_service'],
  },
  {
    id: 'warehouse',
    label: 'Warehouse',
    path: '/business/warehouse',
    icon: '🏭',
    roles: ['business_owner', 'manager', 'warehouse'],
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    path: '/business/dispatch',
    icon: '🚦',
    roles: ['business_owner', 'manager', 'dispatcher'],
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/business/reports',
    icon: '📈',
    roles: ['business_owner', 'manager'],
  },
  {
    id: 'team',
    label: 'Team',
    path: '/business/team',
    icon: '👥',
    roles: ['business_owner', 'manager'],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/business/settings',
    icon: '⚙️',
    roles: ['business_owner', 'manager'],
  },
];

export const DRIVER_NAVIGATION: NavigationItem[] = [
  {
    id: 'deliveries',
    label: 'My Deliveries',
    path: '/driver/deliveries',
    icon: '🚚',
    roles: ['driver'],
  },
  {
    id: 'earnings',
    label: 'My Earnings',
    path: '/driver/earnings',
    icon: '💰',
    roles: ['driver'],
  },
  {
    id: 'stats',
    label: 'My Stats',
    path: '/driver/stats',
    icon: '📊',
    roles: ['driver'],
  },
];

export const STORE_NAVIGATION: NavigationItem[] = [
  {
    id: 'catalog',
    label: 'Shop',
    path: '/store/catalog',
    icon: '🛍️',
    roles: ['customer', 'user'],
  },
  {
    id: 'cart',
    label: 'Cart',
    path: '/store/cart',
    icon: '🛒',
    roles: ['customer', 'user'],
  },
  {
    id: 'orders',
    label: 'My Orders',
    path: '/store/orders',
    icon: '📦',
    roles: ['customer'],
  },
  {
    id: 'search',
    label: 'Search',
    path: '/store/search',
    icon: '🔍',
    roles: ['customer', 'user'],
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/store/profile',
    icon: '👤',
    roles: ['customer'],
  },
];

export function getNavigationForRole(role: string): NavigationItem[] {
  if (['superadmin', 'admin'].includes(role)) {
    return ADMIN_NAVIGATION;
  }

  if (['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service'].includes(role)) {
    return BUSINESS_NAVIGATION.filter(item =>
      !item.roles || item.roles.includes(role)
    );
  }

  if (role === 'driver') {
    return DRIVER_NAVIGATION;
  }

  if (role === 'customer') {
    return STORE_NAVIGATION.filter(item => item.roles?.includes('customer'));
  }

  return STORE_NAVIGATION.filter(item => item.roles?.includes('user'));
}

export function filterNavigationByPermissions(
  items: NavigationItem[],
  userRole: string
): NavigationItem[] {
  return items.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });
}

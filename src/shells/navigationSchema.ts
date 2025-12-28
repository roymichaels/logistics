import { NavigationItem, UserRole } from './types';

export const ADMIN_SHELL_NAV: NavigationItem[] = [
  {
    id: 'platform-dashboard',
    label: 'Platform Dashboard',
    path: '/admin/platform-dashboard',
    icon: '🌐',
    description: 'Platform-wide metrics and overview',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'infrastructures',
    label: 'Infrastructures',
    path: '/admin/infrastructures',
    icon: '🏗️',
    description: 'Manage all infrastructures',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'all-businesses',
    label: 'All Businesses',
    path: '/admin/businesses',
    icon: '🏢',
    description: 'View and manage all businesses',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'all-users',
    label: 'All Users',
    path: '/admin/users',
    icon: '👥',
    description: 'User management across platform',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'platform-analytics',
    label: 'Platform Analytics',
    path: '/admin/analytics',
    icon: '📊',
    description: 'Platform-wide analytics and reports',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'platform-orders',
    label: 'All Orders',
    path: '/admin/orders',
    icon: '📋',
    description: 'View all orders across platform',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'platform-drivers',
    label: 'All Drivers',
    path: '/admin/drivers',
    icon: '🚗',
    description: 'View all drivers across platform',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'system-settings',
    label: 'System Settings',
    path: '/admin/system-settings',
    icon: '⚙️',
    description: 'System-wide configuration',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    path: '/admin/logs',
    icon: '📜',
    description: 'System audit and error logs',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'feature-flags',
    label: 'Feature Flags',
    path: '/admin/feature-flags',
    icon: '🚩',
    description: 'Manage feature flags',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'superadmin-management',
    label: 'Superadmins',
    path: '/admin/superadmins',
    icon: '👑',
    description: 'Manage superadmin accounts',
    visible: true,
    requiredRoles: ['superadmin']
  }
];

export const INFRASTRUCTURE_SHELL_NAV: NavigationItem[] = [
  {
    id: 'infrastructure-dashboard',
    label: 'Infrastructure Dashboard',
    path: '/infrastructure/dashboard',
    icon: '🏗️',
    description: 'Aggregated view across all businesses',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'my-businesses',
    label: 'My Businesses',
    path: '/infrastructure/businesses',
    icon: '🏢',
    description: 'List and manage businesses in infrastructure',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'consolidated-reports',
    label: 'Consolidated Reports',
    path: '/infrastructure/reports',
    icon: '📊',
    description: 'Financial reports across all businesses',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'cross-business-analytics',
    label: 'Analytics',
    path: '/infrastructure/analytics',
    icon: '📈',
    description: 'Performance analytics across infrastructure',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'infrastructure-orders',
    label: 'All Orders',
    path: '/infrastructure/orders',
    icon: '📋',
    description: 'Orders across all businesses',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'infrastructure-drivers',
    label: 'All Drivers',
    path: '/infrastructure/drivers',
    icon: '🚗',
    description: 'Drivers across all businesses',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'infrastructure-team',
    label: 'Team',
    path: '/infrastructure/team',
    icon: '👥',
    description: 'Manage team across businesses',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'infrastructure-settings',
    label: 'Settings',
    path: '/infrastructure/settings',
    icon: '⚙️',
    description: 'Infrastructure settings',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  }
];

export const BUSINESS_SHELL_NAV: NavigationItem[] = [
  {
    id: 'business-dashboard',
    label: 'Dashboard',
    path: '/business/dashboard',
    icon: '📊',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service']
  },
  {
    id: 'business-businesses',
    label: 'My Businesses',
    path: '/business/businesses',
    icon: '🏢',
    visible: true,
    requiredRoles: ['business_owner', 'manager']
  },
  {
    id: 'business-inventory',
    label: 'Inventory',
    path: '/business/inventory',
    icon: '📦',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse']
  },
  {
    id: 'business-orders',
    label: 'Orders',
    path: '/business/orders',
    icon: '📋',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service']
  },
  {
    id: 'business-dispatch',
    label: 'Dispatch',
    path: '/business/dispatch',
    icon: '🚚',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'dispatcher']
  },
  {
    id: 'business-drivers',
    label: 'Drivers',
    path: '/business/drivers',
    icon: '🚗',
    visible: true,
    requiredRoles: ['business_owner', 'manager']
  },
  {
    id: 'business-zones',
    label: 'Zones',
    path: '/business/zones',
    icon: '📍',
    visible: true,
    requiredRoles: ['business_owner', 'manager']
  },
  {
    id: 'business-team',
    label: 'Team',
    path: '/business/team',
    icon: '👔',
    visible: true,
    requiredRoles: ['business_owner', 'manager']
  },
  {
    id: 'business-reports',
    label: 'Reports',
    path: '/business/reports',
    icon: '📈',
    visible: true,
    requiredRoles: ['business_owner', 'manager']
  },
  {
    id: 'business-sales',
    label: 'Sales CRM',
    path: '/business/sales',
    icon: '💼',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'sales']
  },
  {
    id: 'business-support',
    label: 'Support',
    path: '/business/support',
    icon: '🎧',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'customer_service']
  },
  {
    id: 'business-warehouse',
    label: 'Warehouse',
    path: '/business/warehouse',
    icon: '🏭',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse']
  },
  {
    id: 'business-settings',
    label: 'Settings',
    path: '/business/settings',
    icon: '⚙️',
    visible: true,
    requiredRoles: ['business_owner']
  }
];

export const DRIVER_SHELL_NAV: NavigationItem[] = [
  {
    id: 'driver-deliveries',
    label: 'Deliveries',
    path: '/driver/deliveries',
    icon: '🚚',
    visible: true,
    requiredRoles: ['driver']
  },
  {
    id: 'driver-dashboard',
    label: 'Dashboard',
    path: '/driver/dashboard',
    icon: '📊',
    visible: true,
    requiredRoles: ['driver']
  },
  {
    id: 'driver-earnings',
    label: 'Earnings',
    path: '/driver/earnings',
    icon: '💰',
    visible: true,
    requiredRoles: ['driver']
  },
  {
    id: 'driver-profile',
    label: 'Profile',
    path: '/driver/profile',
    icon: '👤',
    visible: true,
    requiredRoles: ['driver']
  }
];

export const STORE_SHELL_NAV: NavigationItem[] = [
  {
    id: 'store-catalog',
    label: 'Shop',
    path: '/store/catalog',
    icon: '🛒',
    visible: true,
    requiredRoles: ['customer', 'user']
  },
  {
    id: 'store-cart',
    label: 'Cart',
    path: '/store/cart',
    icon: '🛍️',
    visible: true,
    requiredRoles: ['customer', 'user']
  },
  {
    id: 'store-orders',
    label: 'Orders',
    path: '/store/orders',
    icon: '📋',
    visible: true,
    requiredRoles: ['customer']
  },
  {
    id: 'store-profile',
    label: 'Profile',
    path: '/store/profile',
    icon: '👤',
    visible: true,
    requiredRoles: ['customer', 'user']
  }
];

export function getNavigationForRole(role: UserRole | null): NavigationItem[] {
  if (!role) return STORE_SHELL_NAV;

  switch (role) {
    case 'superadmin':
    case 'admin':
      return ADMIN_SHELL_NAV;
    case 'infrastructure_owner':
      return INFRASTRUCTURE_SHELL_NAV;
    case 'business_owner':
    case 'manager':
    case 'warehouse':
    case 'dispatcher':
    case 'sales':
    case 'customer_service':
      return BUSINESS_SHELL_NAV;
    case 'driver':
      return DRIVER_SHELL_NAV;
    case 'customer':
    case 'user':
    default:
      return STORE_SHELL_NAV;
  }
}

export function getShellTypeForRole(role: UserRole | null): 'admin' | 'infrastructure' | 'business' | 'driver' | 'store' {
  if (!role) return 'store';

  switch (role) {
    case 'superadmin':
    case 'admin':
      return 'admin';
    case 'infrastructure_owner':
      return 'infrastructure';
    case 'business_owner':
    case 'manager':
    case 'warehouse':
    case 'dispatcher':
    case 'sales':
    case 'customer_service':
      return 'business';
    case 'driver':
      return 'driver';
    case 'customer':
    case 'user':
    default:
      return 'store';
  }
}

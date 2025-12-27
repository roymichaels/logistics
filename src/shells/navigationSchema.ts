import { NavigationItem, UserRole } from './types';

export const ADMIN_SHELL_NAV: NavigationItem[] = [
  {
    id: 'admin-dashboard',
    label: 'Platform Dashboard',
    path: '/admin/dashboard',
    icon: '📊',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'admin-businesses',
    label: 'Businesses',
    path: '/admin/businesses',
    icon: '🏢',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'admin-users',
    label: 'Users',
    path: '/admin/users',
    icon: '👥',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'admin-settings',
    label: 'Settings',
    path: '/admin/settings',
    icon: '⚙️',
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
    case 'infrastructure_owner':
      return ADMIN_SHELL_NAV;
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

export function getShellTypeForRole(role: UserRole | null): 'admin' | 'business' | 'driver' | 'store' {
  if (!role) return 'store';

  switch (role) {
    case 'infrastructure_owner':
      return 'admin';
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

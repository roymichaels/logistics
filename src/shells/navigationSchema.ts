import { NavigationItem, UserRole } from './types';


export const BUSINESS_SHELL_NAV: NavigationItem[] = [
  {
    id: 'business-dashboard',
    label: 'לוח בקרה',
    path: '/business/dashboard',
    icon: '📊',
    visible: true,
    requiredRoles: ['business_owner', 'manager']
  },
  {
    id: 'business-businesses',
    label: 'העסקים שלי',
    path: '/business/businesses',
    icon: '🏢',
    visible: true,
    requiredRoles: ['business_owner']
  },
  {
    id: 'business-orders',
    label: 'הזמנות',
    path: '/business/orders',
    icon: '📋',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service']
  },
  {
    id: 'business-inventory',
    label: 'מלאי',
    path: '/business/inventory',
    icon: '📦',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse']
  },
  {
    id: 'business-catalog',
    label: 'קטלוג מוצרים',
    path: '/business/catalog',
    icon: '📚',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse']
  },
  {
    id: 'business-permissions',
    label: 'הרשאות צוות',
    path: '/business/permissions',
    icon: '🔐',
    visible: true,
    requiredRoles: ['business_owner']
  },
  {
    id: 'business-dispatch',
    label: 'שיבוץ',
    path: '/business/dispatch',
    icon: '🚚',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'dispatcher']
  },
  {
    id: 'business-drivers',
    label: 'נהגים',
    path: '/business/drivers',
    icon: '🚗',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'dispatcher']
  },
  {
    id: 'business-team',
    label: 'צוות',
    path: '/business/team',
    icon: '👔',
    visible: true,
    requiredRoles: ['business_owner', 'manager']
  },
  {
    id: 'business-reports',
    label: 'דוחות',
    path: '/business/business-reports',
    icon: '📈',
    visible: true,
    requiredRoles: ['business_owner', 'manager']
  },
  {
    id: 'business-tasks',
    label: 'משימות',
    path: '/business/tasks',
    icon: '✅',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse', 'dispatcher']
  },
  {
    id: 'business-sales',
    label: 'מכירות',
    path: '/business/sales',
    icon: '💼',
    visible: true,
    requiredRoles: ['business_owner', 'sales']
  },
  {
    id: 'business-support',
    label: 'תמיכה',
    path: '/business/support',
    icon: '🎧',
    visible: true,
    requiredRoles: ['business_owner', 'customer_service']
  },
  {
    id: 'business-warehouse',
    label: 'מחסן',
    path: '/business/warehouse',
    icon: '🏭',
    visible: true,
    requiredRoles: ['business_owner', 'warehouse']
  },
  {
    id: 'business-zones',
    label: 'אזורים',
    path: '/business/zones',
    icon: '📍',
    visible: true,
    requiredRoles: ['business_owner'] // Manager should NOT configure zones
  },
  {
    id: 'business-settings',
    label: 'הגדרות',
    path: '/business/settings',
    icon: '⚙️',
    visible: true,
    requiredRoles: ['business_owner'] // Only business owner can change settings
  }
];

export const DRIVER_SHELL_NAV: NavigationItem[] = [
  {
    id: 'driver-deliveries',
    label: 'משלוחים',
    path: '/driver/deliveries',
    icon: '🚚',
    visible: true,
    requiredRoles: ['driver']
  },
  {
    id: 'driver-dashboard',
    label: 'לוח בקרה',
    path: '/driver/dashboard',
    icon: '📊',
    visible: true,
    requiredRoles: ['driver']
  },
  {
    id: 'driver-earnings',
    label: 'רווחים',
    path: '/driver/earnings',
    icon: '💰',
    visible: true,
    requiredRoles: ['driver']
  },
  {
    id: 'driver-profile',
    label: 'פרופיל',
    path: '/driver/profile',
    icon: '👤',
    visible: true,
    requiredRoles: ['driver']
  }
];

export const STORE_SHELL_NAV: NavigationItem[] = [
  {
    id: 'store-catalog',
    label: 'חנות',
    path: '/store/catalog',
    icon: '🛒',
    visible: true,
    requiredRoles: ['customer', 'user']
  },
  {
    id: 'store-cart',
    label: 'עגלה',
    path: '/store/cart',
    icon: '🛍️',
    visible: true,
    requiredRoles: ['customer', 'user']
  },
  {
    id: 'store-orders',
    label: 'הזמנות',
    path: '/store/orders',
    icon: '📋',
    visible: true,
    requiredRoles: ['customer']
  },
  {
    id: 'store-profile',
    label: 'פרופיל',
    path: '/store/profile',
    icon: '👤',
    visible: true,
    requiredRoles: ['customer', 'user']
  }
];

export function getNavigationForRole(role: UserRole | null): NavigationItem[] {
  if (!role) return STORE_SHELL_NAV;

  let navItems: NavigationItem[] = [];

  switch (role) {
    case 'business_owner':
    case 'manager':
    case 'warehouse':
    case 'dispatcher':
    case 'sales':
    case 'customer_service':
      navItems = BUSINESS_SHELL_NAV;
      break;
    case 'driver':
      navItems = DRIVER_SHELL_NAV;
      break;
    case 'customer':
    case 'guest':
    default:
      navItems = STORE_SHELL_NAV;
      break;
  }

  // Filter navigation items based on role requirements
  return navItems.filter(item => {
    if (!item.requiredRoles || item.requiredRoles.length === 0) {
      return true;
    }
    return item.requiredRoles.includes(role as any);
  });
}

export function getShellTypeForRole(role: UserRole | null): 'business' | 'driver' | 'store' {
  if (!role) return 'store';

  switch (role) {
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
    case 'guest':
    default:
      return 'store';
  }
}

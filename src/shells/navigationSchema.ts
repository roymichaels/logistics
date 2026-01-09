import { NavigationItem, UserRole } from './types';

export const ADMIN_SHELL_NAV: NavigationItem[] = [
  {
    id: 'admin-platform-dashboard',
    label: 'לוח בקרה פלטפורמה',
    path: '/admin/platform-dashboard',
    icon: '🏗️',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'admin-infrastructures',
    label: 'תשתיות',
    path: '/admin/infrastructures',
    icon: '🏭',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'admin-superadmins',
    label: 'מנהלי על',
    path: '/admin/superadmins',
    icon: '👑',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'admin-businesses',
    label: 'עסקים',
    path: '/admin/businesses',
    icon: '🏢',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'admin-users',
    label: 'משתמשים',
    path: '/admin/users',
    icon: '👥',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'admin-catalog',
    label: 'קטלוג פלטפורמה',
    path: '/admin/platform-catalog',
    icon: '📦',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'admin-analytics',
    label: 'אנליטיקה',
    path: '/admin/analytics',
    icon: '📊',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'admin-orders',
    label: 'הזמנות',
    path: '/admin/orders',
    icon: '📋',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'admin-drivers',
    label: 'נהגים',
    path: '/admin/drivers',
    icon: '🚗',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'admin-logs',
    label: 'יומני ביקורת',
    path: '/admin/logs',
    icon: '📋',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'admin-feature-flags',
    label: 'דגלי תכונות',
    path: '/admin/feature-flags',
    icon: '🚩',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'admin-permissions',
    label: 'הרשאות',
    path: '/admin/permissions',
    icon: '🔐',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'admin-settings',
    label: 'הגדרות מערכת',
    path: '/admin/system-settings',
    icon: '⚙️',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  }
];

export const BUSINESS_SHELL_NAV: NavigationItem[] = [
  {
    id: 'business-dashboard',
    label: 'לוח בקרה',
    path: '/business/dashboard',
    icon: '🏢',
    visible: true,
    requiredRoles: ['business_owner', 'manager']
  },
  {
    id: 'business-businesses',
    label: 'העסקים שלי',
    path: '/business/businesses',
    icon: '🏪',
    visible: true,
    requiredRoles: ['business_owner']
  },
  {
    id: 'business-operations',
    label: 'מרכז פעולות',
    path: '/business/operations',
    icon: '⚙️',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse', 'dispatcher']
  },
  {
    id: 'business-analytics',
    label: 'אנליטיקה',
    path: '/business/analytics',
    icon: '📊',
    visible: true,
    requiredRoles: ['business_owner', 'manager']
  },
  {
    id: 'business-customers',
    label: 'לקוחות ומכירות',
    path: '/business/customers',
    icon: '👥',
    visible: true,
    requiredRoles: ['business_owner', 'sales']
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
    id: 'business-settings',
    label: 'הגדרות',
    path: '/business/settings',
    icon: '⚙️',
    visible: true,
    requiredRoles: ['business_owner']
  }
];

export const DRIVER_SHELL_NAV: NavigationItem[] = [
  {
    id: 'driver-drivers',
    label: 'נהגים',
    path: '/driver/drivers',
    icon: '🚗',
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
    case 'superadmin':
    case 'admin':
    case 'infrastructure_owner':
      navItems = ADMIN_SHELL_NAV;
      break;
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

export function getShellTypeForRole(role: UserRole | null): 'admin' | 'business' | 'driver' | 'store' {
  if (!role) return 'store';

  switch (role) {
    case 'superadmin':
    case 'admin':
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
    case 'guest':
    default:
      return 'store';
  }
}

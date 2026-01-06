import { NavigationItem, UserRole } from './types';

export const ADMIN_SHELL_NAV: NavigationItem[] = [
  {
    id: 'platform-dashboard',
    label: 'לוח בקרה פלטפורמה',
    path: '/admin/platform-dashboard',
    icon: '🌐',
    description: 'מדדים וסקירה כללית של הפלטפורמה',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'infrastructures',
    label: 'תשתיות',
    path: '/admin/infrastructures',
    icon: '🏗️',
    description: 'ניהול כל התשתיות',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'all-businesses',
    label: 'כל העסקים',
    path: '/admin/businesses',
    icon: '🏢',
    description: 'צפייה וניהול של כל העסקים',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'all-users',
    label: 'כל המשתמשים',
    path: '/admin/users',
    icon: '👥',
    description: 'ניהול משתמשים בכל הפלטפורמה',
    visible: true,
    requiredRoles: ['superadmin', 'admin', 'infrastructure_owner']
  },
  {
    id: 'platform-analytics',
    label: 'אנליטיקה פלטפורמה',
    path: '/admin/analytics',
    icon: '📊',
    description: 'אנליטיקה ודוחות של כל הפלטפורמה',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'platform-orders',
    label: 'כל ההזמנות',
    path: '/admin/orders',
    icon: '📋',
    description: 'צפייה בכל ההזמנות בפלטפורמה',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'platform-drivers',
    label: 'כל הנהגים',
    path: '/admin/drivers',
    icon: '🚗',
    description: 'צפייה בכל הנהגים בפלטפורמה',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'platform-catalog',
    label: 'קטלוג פלטפורמה',
    path: '/admin/platform-catalog',
    icon: '📦',
    description: 'ניהול קטלוג מוצרים ברמת הפלטפורמה',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'permission-management',
    label: 'ניהול הרשאות',
    path: '/admin/permissions',
    icon: '🔐',
    description: 'ניהול תפקידים והרשאות',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'system-settings',
    label: 'הגדרות מערכת',
    path: '/admin/system-settings',
    icon: '⚙️',
    description: 'תצורה כללית של המערכת',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'audit-logs',
    label: 'יומני ביקורת',
    path: '/admin/logs',
    icon: '📜',
    description: 'יומני ביקורת ושגיאות מערכת',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'feature-flags',
    label: 'דגלי תכונות',
    path: '/admin/feature-flags',
    icon: '🚩',
    description: 'ניהול דגלי תכונות',
    visible: true,
    requiredRoles: ['superadmin', 'admin']
  },
  {
    id: 'superadmin-management',
    label: 'מנהלי על',
    path: '/admin/superadmins',
    icon: '👑',
    description: 'ניהול חשבונות מנהלי על',
    visible: true,
    requiredRoles: ['superadmin']
  }
];

export const INFRASTRUCTURE_SHELL_NAV: NavigationItem[] = [
  {
    id: 'infrastructure-dashboard',
    label: 'לוח בקרה תשתית',
    path: '/infrastructure/dashboard',
    icon: '🏗️',
    description: 'תצוגה מצטברת של כל העסקים',
    visible: true,
    requiredRoles: ['infrastructure_owner', 'accountant']
  },
  {
    id: 'my-businesses',
    label: 'העסקים שלי',
    path: '/infrastructure/businesses',
    icon: '🏢',
    description: 'רשימה וניהול של עסקים בתשתית',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'consolidated-reports',
    label: 'דוחות מאוחדים',
    path: '/infrastructure/reports',
    icon: '📊',
    description: 'דוחות פיננסיים של כל העסקים',
    visible: true,
    requiredRoles: ['infrastructure_owner', 'accountant']
  },
  {
    id: 'cross-business-analytics',
    label: 'אנליטיקה',
    path: '/infrastructure/analytics',
    icon: '📈',
    description: 'ניתוח ביצועים בכל התשתית',
    visible: true,
    requiredRoles: ['infrastructure_owner', 'accountant']
  },
  {
    id: 'infrastructure-orders',
    label: 'כל ההזמנות',
    path: '/infrastructure/orders',
    icon: '📋',
    description: 'הזמנות מכל העסקים',
    visible: true,
    requiredRoles: ['infrastructure_owner', 'accountant']
  },
  {
    id: 'infrastructure-drivers',
    label: 'כל הנהגים',
    path: '/infrastructure/drivers',
    icon: '🚗',
    description: 'נהגים מכל העסקים',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'infrastructure-catalogs',
    label: 'קטלוגים',
    path: '/infrastructure/catalogs',
    icon: '📦',
    description: 'ניהול קטלוגים של כל העסקים',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'infrastructure-permissions',
    label: 'הרשאות',
    path: '/infrastructure/permissions',
    icon: '🔐',
    description: 'ניהול תפקידים והרשאות',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'infrastructure-team',
    label: 'צוות',
    path: '/infrastructure/team',
    icon: '👥',
    description: 'ניהול צוות בכל העסקים',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  },
  {
    id: 'infrastructure-settings',
    label: 'הגדרות',
    path: '/infrastructure/settings',
    icon: '⚙️',
    description: 'הגדרות תשתית',
    visible: true,
    requiredRoles: ['infrastructure_owner']
  }
];

export const BUSINESS_SHELL_NAV: NavigationItem[] = [
  {
    id: 'business-dashboard',
    label: 'לוח בקרה',
    path: '/business/dashboard',
    icon: '📊',
    visible: true,
    requiredRoles: ['infrastructure_owner', 'business_owner', 'manager']
  },
  {
    id: 'business-businesses',
    label: 'העסקים שלי',
    path: '/business/businesses',
    icon: '🏢',
    visible: true,
    requiredRoles: ['infrastructure_owner', 'business_owner']
  },
  {
    id: 'consolidated-reports',
    label: 'דוחות מאוחדים',
    path: '/business/reports',
    icon: '📊',
    description: 'דוחות פיננסיים של כל העסקים',
    visible: true,
    requiredRoles: ['infrastructure_owner', 'accountant']
  },
  {
    id: 'cross-business-analytics',
    label: 'אנליטיקה מתקדמת',
    path: '/business/analytics',
    icon: '📈',
    description: 'ניתוח ביצועים בכל העסקים',
    visible: true,
    requiredRoles: ['infrastructure_owner', 'accountant']
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
    case 'superadmin':
    case 'admin':
      navItems = ADMIN_SHELL_NAV;
      break;
    case 'infrastructure_owner':
    case 'accountant':
      navItems = INFRASTRUCTURE_SHELL_NAV;
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
    case 'user':
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

export function getShellTypeForRole(role: UserRole | null): 'admin' | 'infrastructure' | 'business' | 'driver' | 'store' {
  if (!role) return 'store';

  switch (role) {
    case 'superadmin':
    case 'admin':
      return 'admin';
    case 'infrastructure_owner':
    case 'accountant':
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

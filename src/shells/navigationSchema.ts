import { NavigationItem, UserRole } from './types';

export const ADMIN_SHELL_NAV: NavigationItem[] = [
  {
    id: 'admin-platform-dashboard',
    label: 'לוח בקרה פלטפורמה',
    path: '/admin/platform-dashboard',
    icon: '🏗️',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'overview'
  },
  {
    id: 'admin-infrastructures',
    label: 'תשתיות',
    path: '/admin/infrastructures',
    icon: '🏭',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'platform'
  },
  {
    id: 'admin-superadmins',
    label: 'מנהלי על',
    path: '/admin/superadmins',
    icon: '👑',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'platform'
  },
  {
    id: 'admin-businesses',
    label: 'עסקים',
    path: '/admin/businesses',
    icon: '🏢',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'entities'
  },
  {
    id: 'admin-users',
    label: 'משתמשים',
    path: '/admin/users',
    icon: '👥',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'entities'
  },
  {
    id: 'admin-drivers',
    label: 'נהגים',
    path: '/admin/drivers',
    icon: '🚗',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'entities'
  },
  {
    id: 'admin-catalog',
    label: 'קטלוג פלטפורמה',
    path: '/admin/platform-catalog',
    icon: '📦',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'operations'
  },
  {
    id: 'admin-orders',
    label: 'הזמנות',
    path: '/admin/orders',
    icon: '📋',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'operations'
  },
  {
    id: 'admin-analytics',
    label: 'אנליטיקה',
    path: '/admin/analytics',
    icon: '📊',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'analytics'
  },
  {
    id: 'admin-logs',
    label: 'יומני ביקורת',
    path: '/admin/logs',
    icon: '📋',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'analytics'
  },
  {
    id: 'admin-feature-flags',
    label: 'דגלי תכונות',
    path: '/admin/feature-flags',
    icon: '🚩',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'settings'
  },
  {
    id: 'admin-permissions',
    label: 'הרשאות',
    path: '/admin/permissions',
    icon: '🔐',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'settings'
  },
  {
    id: 'admin-settings',
    label: 'הגדרות מערכת',
    path: '/admin/system-settings',
    icon: '⚙️',
    visible: true,
    requiredRoles: ['superadmin', 'admin'],
    category: 'settings'
  }
];

export const BUSINESS_SHELL_NAV: NavigationItem[] = [
  // Main Navigation
  {
    id: 'business-dashboard',
    label: 'לוח בקרה',
    path: '/business/dashboard',
    icon: '🏢',
    visible: true,
    requiredRoles: ['business_owner', 'manager'],
    requiresBusinessContext: true
  },
  {
    id: 'business-businesses',
    label: 'העסקים שלי',
    path: '/business/businesses',
    icon: '🏪',
    visible: true,
    requiredRoles: ['business_owner'],
    requiresBusinessContext: false
  },
  {
    id: 'business-preview',
    label: 'תצוגה מקדימה',
    path: '/business/preview',
    icon: '👁️',
    visible: true,
    requiredRoles: ['business_owner', 'manager'],
    requiresBusinessContext: true,
    category: 'content'
  },

  // Operations Category
  {
    id: 'business-operations',
    label: 'מרכז פעולות',
    path: '/business/operations',
    icon: '⚙️',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse', 'dispatcher'],
    requiresBusinessContext: true,
    category: 'operations'
  },
  {
    id: 'business-orders',
    label: 'הזמנות',
    path: '/business/orders',
    icon: '📦',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'sales', 'customer_service'],
    requiresBusinessContext: true,
    category: 'operations'
  },
  {
    id: 'business-dispatch',
    label: 'שיבוץ ומשלוחים',
    path: '/business/dispatch',
    icon: '🚚',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'dispatcher'],
    requiresBusinessContext: true,
    category: 'operations'
  },

  // Inventory Category
  {
    id: 'business-inventory',
    label: 'מלאי',
    path: '/business/inventory',
    icon: '📦',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse'],
    requiresBusinessContext: true,
    category: 'inventory'
  },
  {
    id: 'business-products',
    label: 'מוצרים',
    path: '/business/products',
    icon: '🏷️',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse'],
    requiresBusinessContext: true,
    category: 'inventory'
  },
  {
    id: 'business-catalog',
    label: 'ניהול קטלוג',
    path: '/business/catalog',
    icon: '📚',
    visible: true,
    requiredRoles: ['business_owner', 'manager'],
    requiresBusinessContext: true,
    category: 'inventory'
  },
  {
    id: 'business-incoming',
    label: 'קבלת סחורה',
    path: '/business/incoming',
    icon: '📥',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse'],
    requiresBusinessContext: true,
    category: 'inventory'
  },
  {
    id: 'business-restock',
    label: 'בקשות חידוש מלאי',
    path: '/business/restock',
    icon: '🔄',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'warehouse'],
    requiresBusinessContext: true,
    category: 'inventory'
  },

  // Analytics Category
  {
    id: 'business-analytics',
    label: 'אנליטיקה',
    path: '/business/analytics',
    icon: '📊',
    visible: true,
    requiredRoles: ['business_owner', 'manager'],
    requiresBusinessContext: true,
    category: 'analytics'
  },
  {
    id: 'business-reports',
    label: 'דוחות',
    path: '/business/reports',
    icon: '📋',
    visible: true,
    requiredRoles: ['business_owner', 'manager'],
    requiresBusinessContext: true,
    category: 'analytics'
  },
  {
    id: 'business-audit-logs',
    label: 'יומני ביקורת',
    path: '/business/audit-logs',
    icon: '📝',
    visible: true,
    requiredRoles: ['business_owner', 'manager'],
    requiresBusinessContext: true,
    category: 'analytics'
  },

  // Team Management Category
  {
    id: 'business-customers',
    label: 'לקוחות',
    path: '/business/customers',
    icon: '👥',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'sales', 'customer_service'],
    requiresBusinessContext: true,
    category: 'team'
  },
  {
    id: 'business-team',
    label: 'צוות',
    path: '/business/team',
    icon: '👔',
    visible: true,
    requiredRoles: ['business_owner', 'manager'],
    requiresBusinessContext: true,
    category: 'team'
  },
  {
    id: 'business-drivers',
    label: 'נהגים',
    path: '/business/drivers',
    icon: '🚗',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'dispatcher'],
    requiresBusinessContext: true,
    category: 'team'
  },
  {
    id: 'business-zones',
    label: 'אזורי חלוקה',
    path: '/business/zones',
    icon: '🗺️',
    visible: true,
    requiredRoles: ['business_owner', 'manager', 'dispatcher'],
    requiresBusinessContext: true,
    category: 'team'
  },

  // Settings Category
  {
    id: 'business-settings',
    label: 'הגדרות',
    path: '/business/settings',
    icon: '⚙️',
    visible: true,
    requiredRoles: ['business_owner'],
    requiresBusinessContext: true,
    category: 'settings'
  },
  {
    id: 'business-permissions',
    label: 'הרשאות',
    path: '/business/permissions',
    icon: '🔐',
    visible: true,
    requiredRoles: ['business_owner', 'manager'],
    requiresBusinessContext: true,
    category: 'settings'
  },
  {
    id: 'business-feature-flags',
    label: 'דגלי תכונות',
    path: '/business/feature-flags',
    icon: '🚩',
    visible: true,
    requiredRoles: ['business_owner'],
    requiresBusinessContext: true,
    category: 'settings'
  }
];

// Menu categories for organized navigation
export const ADMIN_MENU_CATEGORIES = [
  { id: 'overview', label: 'סקירה כללית', icon: '🏗️', defaultOpen: true },
  { id: 'platform', label: 'ניהול פלטפורמה', icon: '🏭', defaultOpen: false },
  { id: 'entities', label: 'ישויות ומשתמשים', icon: '👥', defaultOpen: false },
  { id: 'operations', label: 'פעילות תפעולית', icon: '📦', defaultOpen: false },
  { id: 'analytics', label: 'מעקב וניתוח', icon: '📊', defaultOpen: false },
  { id: 'settings', label: 'הגדרות ותצורות', icon: '⚙️', defaultOpen: false }
];

export const BUSINESS_MENU_CATEGORIES = [
  { id: 'operations', label: 'פעילות ותפעול', icon: '⚙️', defaultOpen: true },
  { id: 'inventory', label: 'מלאי ומוצרים', icon: '📦', defaultOpen: false },
  { id: 'analytics', label: 'אנליטיקה ודוחות', icon: '📊', defaultOpen: false },
  { id: 'team', label: 'אנשים וקבוצות', icon: '👥', defaultOpen: false },
  { id: 'content', label: 'תוכן ופרסום', icon: '✨', defaultOpen: false },
  { id: 'settings', label: 'הגדרות ותצורה', icon: '⚙️', defaultOpen: false }
];

export const DRIVER_SHELL_NAV: NavigationItem[] = [
  {
    id: 'driver-deliveries',
    label: 'המשלוחים שלי',
    path: '/driver/deliveries',
    icon: '🚚',
    visible: true,
    requiredRoles: ['driver']
  },
  {
    id: 'driver-earnings',
    label: 'הרווחים שלי',
    path: '/driver/earnings',
    icon: '💰',
    visible: true,
    requiredRoles: ['driver']
  },
  {
    id: 'driver-stats',
    label: 'הסטטיסטיקות שלי',
    path: '/driver/stats',
    icon: '📊',
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

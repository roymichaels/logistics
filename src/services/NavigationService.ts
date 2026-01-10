import { ROLE_PERMISSIONS, Permission } from '../lib/rolePermissions';

export interface NavigationRoute {
  path: string;
  label: string;
  icon?: string;
  permission?: Permission;
  roles?: string[];
  children?: NavigationRoute[];
}

export class NavigationService {
  private userRole: string | null;
  private permissions: Set<Permission>;

  constructor(userRole: string | null) {
    this.userRole = userRole;
    this.permissions = new Set(this.getRolePermissions(userRole));
  }

  private getRolePermissions(role: string | null): Permission[] {
    if (!role) return [];
    const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
    if (!rolePerms) return [];
    return rolePerms.permissions;
  }

  hasPermission(permission: Permission): boolean {
    return this.permissions.has(permission);
  }

  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every((p) => this.hasPermission(p));
  }

  hasRole(role: string | string[]): boolean {
    if (!this.userRole) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(this.userRole);
  }

  canAccessRoute(route: NavigationRoute): boolean {
    if (route.permission && !this.hasPermission(route.permission)) {
      return false;
    }

    if (route.roles && !this.hasRole(route.roles)) {
      return false;
    }

    return true;
  }

  filterRoutes(routes: NavigationRoute[]): NavigationRoute[] {
    return routes
      .filter((route) => this.canAccessRoute(route))
      .map((route) => ({
        ...route,
        children: route.children ? this.filterRoutes(route.children) : undefined,
      }));
  }

  getNavigationForRole(): NavigationRoute[] {
    return this.filterRoutes(this.getAllRoutes());
  }

  private getAllRoutes(): NavigationRoute[] {
    const commonRoutes: NavigationRoute[] = [
      {
        path: '/profile',
        label: 'Profile',
        icon: '👤',
      },
      {
        path: '/notifications',
        label: 'Notifications',
        icon: '🔔',
      },
    ];

    const businessRoutes: NavigationRoute[] = [
      {
        path: '/business/dashboard',
        label: 'Dashboard',
        icon: '📊',
        permission: 'view:business_dashboard',
      },
      {
        path: '/business/products',
        label: 'Products',
        icon: '📦',
        permission: 'view:products',
      },
      {
        path: '/business/orders',
        label: 'Orders',
        icon: '📋',
        permission: 'view:orders',
      },
      {
        path: '/business/inventory',
        label: 'Inventory',
        icon: '🏪',
        permission: 'view:inventory',
      },
      {
        path: '/business/drivers',
        label: 'Drivers',
        icon: '🚗',
        permission: 'view:drivers',
      },
      {
        path: '/business/zones',
        label: 'Zones',
        icon: '📍',
        permission: 'manage:zones',
      },
      {
        path: '/business/analytics',
        label: 'Analytics',
        icon: '📈',
        permission: 'view:analytics',
      },
      {
        path: '/business/financials',
        label: 'Financials',
        icon: '💰',
        permission: 'view:financials',
      },
      {
        path: '/business/settings',
        label: 'Settings',
        icon: '⚙️',
        permission: 'manage:business_settings',
      },
    ];

    const driverRoutes: NavigationRoute[] = [
      {
        path: '/driver/dashboard',
        label: 'Home',
        icon: '🏠',
        roles: ['driver'],
      },
      {
        path: '/driver/routes',
        label: 'Routes',
        icon: '🗺️',
        permission: 'view:routes',
      },
      {
        path: '/driver/deliveries',
        label: 'Deliveries',
        icon: '📦',
        permission: 'view:own_deliveries',
      },
      {
        path: '/driver/inventory',
        label: 'Inventory',
        icon: '📋',
        permission: 'view:own_inventory',
      },
      {
        path: '/driver/zones',
        label: 'Zones',
        icon: '📍',
        permission: 'view:zones',
      },
      {
        path: '/driver/analytics',
        label: 'Analytics & Earnings',
        icon: '📊',
        permission: 'view:own_earnings',
      },
    ];

    const storeRoutes: NavigationRoute[] = [
      {
        path: '/store/catalog',
        label: 'Shop',
        icon: '🏪',
      },
      {
        path: '/store/search',
        label: 'Search',
        icon: '🔍',
      },
      {
        path: '/store/cart',
        label: 'Cart',
        icon: '🛒',
      },
      {
        path: '/store/orders',
        label: 'Orders',
        icon: '📦',
      },
      {
        path: '/store/profile',
        label: 'Account',
        icon: '👤',
      },
    ];

    const adminRoutes: NavigationRoute[] = [
      {
        path: '/admin/dashboard',
        label: 'Dashboard',
        icon: '🏠',
        roles: ['infrastructure_owner'],
      },
      {
        path: '/admin/businesses',
        label: 'Businesses',
        icon: '🏢',
        permission: 'view:all_businesses',
      },
      {
        path: '/admin/users',
        label: 'Users',
        icon: '👥',
        permission: 'manage:users',
      },
      {
        path: '/admin/drivers',
        label: 'Drivers',
        icon: '🚗',
        permission: 'view:all_drivers',
      },
      {
        path: '/admin/orders',
        label: 'Orders',
        icon: '📋',
        permission: 'view:all_orders',
      },
      {
        path: '/admin/financials',
        label: 'Financials',
        icon: '💰',
        permission: 'view:platform_financials',
      },
      {
        path: '/admin/analytics',
        label: 'Analytics',
        icon: '📊',
        permission: 'view:platform_analytics',
      },
      {
        path: '/admin/infrastructure',
        label: 'Infrastructure',
        icon: '🔧',
        permission: 'manage:infrastructure',
      },
      {
        path: '/admin/audit',
        label: 'Audit Logs',
        icon: '📜',
        permission: 'view:audit_logs',
      },
      {
        path: '/admin/settings',
        label: 'Settings',
        icon: '⚙️',
        permission: 'manage:platform_settings',
      },
    ];

    if (this.userRole === 'infrastructure_owner') {
      return [...adminRoutes, ...commonRoutes];
    }

    if (
      this.userRole === 'business_owner' ||
      this.userRole === 'manager' ||
      this.userRole === 'dispatcher' ||
      this.userRole === 'warehouse' ||
      this.userRole === 'sales' ||
      this.userRole === 'customer_service'
    ) {
      return [...businessRoutes, ...commonRoutes];
    }

    if (this.userRole === 'driver') {
      return [...driverRoutes, ...commonRoutes];
    }

    return [...storeRoutes, ...commonRoutes];
  }
}

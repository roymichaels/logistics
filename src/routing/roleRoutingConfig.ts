export type UserRole =
  | 'business_owner'
  | 'manager'
  | 'warehouse'
  | 'dispatcher'
  | 'sales'
  | 'customer_service'
  | 'driver'
  | 'customer'
  | 'guest';

export type ShellType = 'BusinessShell' | 'DriverShell' | 'StoreShell';

export interface RoleRouteConfig {
  role: UserRole;
  shell: ShellType;
  homePath: string;
  homePageName: string;
  description: string;
}

export const ROLE_ROUTING_MAP: Record<UserRole, RoleRouteConfig> = {
  business_owner: {
    role: 'business_owner',
    shell: 'BusinessShell',
    homePath: '/business/dashboard',
    homePageName: 'Business Dashboard',
    description: 'Full business operations control',
  },
  manager: {
    role: 'manager',
    shell: 'BusinessShell',
    homePath: '/business/dashboard',
    homePageName: 'Manager Dashboard',
    description: 'Business operations with restricted permissions',
  },
  warehouse: {
    role: 'warehouse',
    shell: 'BusinessShell',
    homePath: '/business/warehouse',
    homePageName: 'Warehouse Dashboard',
    description: 'Inventory receiving, storing, and fulfillment',
  },
  dispatcher: {
    role: 'dispatcher',
    shell: 'BusinessShell',
    homePath: '/business/dispatch',
    homePageName: 'Dispatch Console',
    description: 'Live delivery routing and driver assignment',
  },
  sales: {
    role: 'sales',
    shell: 'BusinessShell',
    homePath: '/business/sales',
    homePageName: 'Sales Dashboard',
    description: 'Customer relationship management and sales',
  },
  customer_service: {
    role: 'customer_service',
    shell: 'BusinessShell',
    homePath: '/business/support',
    homePageName: 'Support Console',
    description: 'Customer support and order assistance',
  },
  driver: {
    role: 'driver',
    shell: 'DriverShell',
    homePath: '/driver/drivers',
    homePageName: 'Drivers',
    description: 'Delivery lifecycle management',
  },
  customer: {
    role: 'customer',
    shell: 'StoreShell',
    homePath: '/store/catalog',
    homePageName: 'Catalog',
    description: 'Shopping and order tracking',
  },
  guest: {
    role: 'guest',
    shell: 'StoreShell',
    homePath: '/store/catalog',
    homePageName: 'Catalog',
    description: 'Browsing (guest)',
  },
};

export function getRoleConfig(role: UserRole): RoleRouteConfig {
  return ROLE_ROUTING_MAP[role] || ROLE_ROUTING_MAP.guest;
}

export function getShellForRole(role: UserRole): ShellType {
  return getRoleConfig(role).shell;
}

export function getHomePathForRole(role: UserRole): string {
  return getRoleConfig(role).homePath;
}

export function isBusinessRole(role: UserRole): boolean {
  return ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service'].includes(role);
}

export function isDriverRole(role: UserRole): boolean {
  return role === 'driver';
}

export function isCustomerRole(role: UserRole): boolean {
  return ['customer', 'guest'].includes(role);
}

export const BUSINESS_ROLES: UserRole[] = [
  'business_owner',
  'manager',
  'warehouse',
  'dispatcher',
  'sales',
  'customer_service',
];

export const ALL_ROLES: UserRole[] = [
  'business_owner',
  'manager',
  'warehouse',
  'dispatcher',
  'sales',
  'customer_service',
  'driver',
  'customer',
  'guest',
];

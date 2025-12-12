const storefrontPages = new Set([
  'catalog',
  'store',
  'cart',
  'checkout',
  'orders',
  'profile',
  'product',
]);

const businessPages = new Set([
  'dashboard',
  'products',
  'orders',
  'inventory',
  'incoming',
  'restock',
  'settings',
  'reports',
  'drivers',
  'zones',
  'manager-inventory',
  'warehouse',
  'dispatch',
  'sandbox',
  'start-new',
  'logs',
  'channels',
  'notifications',
  'chat',
]);

const driverPages = new Set([
  'driver',
  'routes',
  'tasks',
  'my-deliveries',
  'my-inventory',
  'my-zones',
  'status',
]);

export function canView(pageId: string, role: string): boolean {
  if (!role) return false;

  const normalized = role.toLowerCase();

  if (normalized === 'admin' || normalized === 'infrastructure_owner') {
    return true;
  }

  if (normalized === 'client' || normalized === 'user') {
    return storefrontPages.has(pageId);
  }

  if (normalized === 'business' || normalized === 'business_owner' || normalized === 'manager') {
    return storefrontPages.has(pageId) || businessPages.has(pageId);
  }

  if (normalized === 'driver') {
    return storefrontPages.has(pageId) || driverPages.has(pageId);
  }

  return false;
}

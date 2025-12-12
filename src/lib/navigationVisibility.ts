// Role-based visibility helper for routing/navigation.
// Roles: 'client' | 'business' | 'driver' | 'admin'

export type AppRole = 'client' | 'business' | 'driver' | 'admin' | string | null | undefined;

export function canView(page: string, role: AppRole): boolean {
  const r = (role || '').toString();

  // Admin sees everything
  if (r === 'admin') return true;

  const clientPages = [
    '/store/catalog',
    '/store/cart',
    '/store/checkout',
    '/store/orders',
    '/store/profile',
    '/store/product'
  ];

  const businessPages = [
    '/business/dashboard',
    '/business/products',
    '/business/orders',
    '/business/restock',
    '/business/inventory',
    '/business/drivers',
    '/business/zones',
    '/business/analytics',
    '/business/settings',
    '/sandbox'
  ];

  const driverPages = [
    '/driver/dashboard',
    '/driver/tasks',
    '/driver/routes',
    '/driver/inventory',
    '/driver/zones'
  ];

  if (r === 'client') {
    return clientPages.some(p => page.startsWith(p));
  }

  if (r === 'business') {
    return businessPages.some(p => page.startsWith(p)) || clientPages.some(p => page.startsWith(p));
  }

  if (r === 'driver') {
    return driverPages.some(p => page.startsWith(p));
  }

  // Fallback: allow legacy pages
  return true;
}

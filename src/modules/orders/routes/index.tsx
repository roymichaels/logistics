import { lazy } from 'react';

const OrdersPage = lazy(() => import('../pages/OrdersPage').then(m => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('../pages/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));

export const ordersRoutes = [
  {
    path: '/orders',
    component: OrdersPage,
    roles: ['business_owner', 'manager', 'dispatcher', 'warehouse'],
  },
  {
    path: '/orders/:id',
    component: OrderDetailPage,
    roles: ['business_owner', 'manager', 'dispatcher', 'warehouse'],
  },
];

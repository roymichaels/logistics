import React from 'react';

export const inventoryRoutes = {
  inventory: {
    path: '/inventory',
    component: React.lazy(() =>
      import('../pages/InventoryPage').then(module => ({
        default: module.InventoryPage
      }))
    ),
  },
  myInventory: {
    path: '/my-inventory',
    component: React.lazy(() =>
      import('../pages/DriverInventoryPage').then(module => ({
        default: module.DriverInventoryPage
      }))
    ),
  },
};

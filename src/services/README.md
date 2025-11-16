# Service Architecture

This directory contains the modular service architecture that replaces the monolithic `supabaseDataStore.ts` file.

## Architecture Overview

The service architecture follows these principles:

1. **Single Responsibility** - Each service handles one domain area
2. **Type Safety** - Proper TypeScript types throughout
3. **Reusability** - Services can be composed and reused
4. **Testability** - Smaller, focused modules are easier to test
5. **Maintainability** - Clear separation of concerns

## Directory Structure

```
services/
├── base/
│   └── BaseService.ts          # Base class with shared functionality
├── modules/
│   ├── InventoryService.ts     # Inventory & product management
│   ├── ZoneService.ts          # Zone management
│   ├── DriverService.ts        # Driver operations
│   ├── OrderService.ts         # Order management
│   └── index.ts                # Central exports
└── README.md                   # This file
```

## Services

### BaseService

Base class that all services extend. Provides:
- Supabase client management
- Common error handling
- Utility methods (timestamps, query execution)

**Example:**
```typescript
import { BaseService } from './base/BaseService';

export class MyService extends BaseService {
  async myMethod() {
    // Access this.supabase
    // Access this.userTelegramId
    // Use this.now() for timestamps
  }
}
```

### InventoryService

Handles all inventory-related operations:

**Products:**
- `listProducts(filters?)` - List products with optional filtering
- `getProduct(id)` - Get single product
- `createProduct(input)` - Create new product
- `updateProduct(id, updates)` - Update product

**Inventory:**
- `listInventory(filters?)` - List inventory records
- `getInventory(productId, locationId?)` - Get inventory for product
- `listInventoryLocations()` - List all locations
- `getInventorySummary(productId)` - Get complete inventory summary

**Restock Requests:**
- `listRestockRequests(filters?)` - List restock requests
- `submitRestockRequest(input)` - Submit new request
- `approveRestockRequest(id, input)` - Approve request
- `fulfillRestockRequest(id, input)` - Fulfill request
- `rejectRestockRequest(id, input?)` - Reject request

**Transfers:**
- `transferInventory(input)` - Transfer between locations

**Logs & Alerts:**
- `listInventoryLogs(filters?)` - List inventory logs
- `listSalesLogs(filters?)` - List sales logs
- `recordSale(input)` - Record a sale
- `getLowStockAlerts(filters?)` - Get low stock alerts

**Example:**
```typescript
import { InventoryService } from './modules';

const inventoryService = new InventoryService(userTelegramId);

// List products
const products = await inventoryService.listProducts({ category: 'electronics' });

// Get inventory summary
const summary = await inventoryService.getInventorySummary(productId);

// Submit restock request
const { id } = await inventoryService.submitRestockRequest({
  product_id: productId,
  requested_quantity: 100,
  to_location_id: locationId
});
```

### ZoneService

Handles zone management and assignments:

**Zone Management:**
- `listZones(filters?)` - List zones
- `getZone(id)` - Get single zone
- `createZone(input)` - Create new zone
- `updateZone(id, input)` - Update zone
- `deleteZone(id, softDelete?)` - Delete zone (soft or hard)
- `restoreZone(id)` - Restore soft-deleted zone
- `getZoneAuditLogs(zoneId, limit?)` - Get audit logs

**Driver Assignments:**
- `listDriverZones(filters?)` - List driver zone assignments
- `assignDriverToZone(input)` - Assign driver to zone
- `unassignDriverFromZone(input)` - Unassign driver from zone

**Example:**
```typescript
import { ZoneService } from './modules';

const zoneService = new ZoneService(userTelegramId);

// Create zone
const { id } = await zoneService.createZone({
  name: 'Downtown',
  city: 'Tel Aviv',
  active: true
});

// Assign driver to zone
await zoneService.assignDriverToZone({
  zone_id: zoneId,
  driver_id: driverId,
  active: true
});
```

### DriverService

Handles driver status, inventory, and movements:

**Driver Status:**
- `updateDriverStatus(input)` - Update driver status
- `setDriverOnline(input?)` - Set driver online
- `setDriverOffline(input?)` - Set driver offline
- `toggleDriverOnline(input)` - Toggle online/offline
- `getDriverStatus(driver_id?)` - Get driver status
- `listDriverStatuses(filters?)` - List all driver statuses

**Driver Inventory:**
- `listDriverInventory(filters?)` - List driver inventory
- `transferInventoryToDriver(input)` - Transfer to driver
- `adjustDriverInventory(input)` - Adjust driver inventory
- `syncDriverInventory(input)` - Sync driver inventory

**Driver Movements:**
- `recordDriverMovement(input)` - Record movement log
- `listDriverMovements(filters?)` - List movement logs

**Example:**
```typescript
import { DriverService } from './modules';

const driverService = new DriverService(userTelegramId);

// Set driver online
await driverService.setDriverOnline({
  zone_id: zoneId,
  status: 'available'
});

// Get driver status
const status = await driverService.getDriverStatus(driverId);

// Sync inventory
const result = await driverService.syncDriverInventory({
  driver_id: driverId,
  entries: [
    { product_id: 'prod1', quantity: 10 },
    { product_id: 'prod2', quantity: 5 }
  ]
});
```

### OrderService

Handles order management:

**Order Operations:**
- `listOrders(filters?)` - List orders with advanced filtering
- `getOrder(id)` - Get single order
- `createOrder(input)` - Create new order
- `updateOrder(id, updates)` - Update order
- `deleteOrder(id)` - Delete order
- `assignDriverToOrder(orderId, driverId)` - Assign driver
- `updateOrderStatus(orderId, status)` - Update status

**Example:**
```typescript
import { OrderService } from './modules';

const orderService = new OrderService(userTelegramId);

// Create order
const { id } = await orderService.createOrder({
  customer_name: 'John Doe',
  customer_phone: '050-1234567',
  customer_address: 'Tel Aviv',
  items: [
    { product_id: 'prod1', quantity: 2, price: 100 }
  ],
  entry_mode: 'manual'
});

// Assign driver
await orderService.assignDriverToOrder(orderId, driverId);

// Update status
await orderService.updateOrderStatus(orderId, 'out_for_delivery');
```

## Usage Patterns

### Basic Usage

```typescript
import { InventoryService, ZoneService } from '@/services/modules';

// Initialize services
const inventoryService = new InventoryService(userTelegramId);
const zoneService = new ZoneService(userTelegramId);

// Use services
const products = await inventoryService.listProducts();
const zones = await zoneService.listZones();
```

### Error Handling

All services throw errors that should be caught:

```typescript
try {
  const product = await inventoryService.getProduct(productId);
  // Handle success
} catch (error) {
  // Handle error
  console.error('Failed to fetch product:', error);
}
```

### Composition

Services can be used together:

```typescript
const inventoryService = new InventoryService(userId);
const driverService = new DriverService(userId);
const zoneService = new ZoneService(userId);

// Get driver status
const driverStatus = await driverService.getDriverStatus(driverId);

// Get zone info
const zone = driverStatus.current_zone_id
  ? await zoneService.getZone(driverStatus.current_zone_id)
  : null;

// Get driver inventory
const inventory = await inventoryService.listDriverInventory({
  driver_id: driverId
});
```

## Migration Guide

### From supabaseDataStore.ts

**Before:**
```typescript
import { createDataStore } from '@/lib/supabaseDataStore';

const dataStore = createDataStore(userId);
const products = await dataStore.listProducts();
```

**After:**
```typescript
import { InventoryService } from '@/services/modules';

const inventoryService = new InventoryService(userId);
const products = await inventoryService.listProducts();
```

### Benefits of Migration

1. **Better TypeScript Support** - Proper types throughout
2. **Smaller Bundle Size** - Only import what you need
3. **Easier Testing** - Test individual services
4. **Better Organization** - Clear separation of concerns
5. **Improved Maintainability** - Smaller files, focused responsibilities

## Testing

Services are designed to be easily testable:

```typescript
import { InventoryService } from '@/services/modules';
import { describe, it, expect, beforeEach } from 'vitest';

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(() => {
    service = new InventoryService('test-user-id');
  });

  it('should list products', async () => {
    const products = await service.listProducts();
    expect(products).toBeInstanceOf(Array);
  });
});
```

## Future Services

Planned services to complete the migration:

- `TaskService` - Task management
- `RouteService` - Route planning
- `CommunicationService` - Messaging and notifications
- `ProfileService` - User profile management
- `BusinessService` - Business management
- `AnalyticsService` - Analytics and reporting

## Contributing

When adding new services:

1. Extend `BaseService`
2. Follow the established patterns
3. Add proper TypeScript types
4. Document all public methods
5. Update this README
6. Add tests

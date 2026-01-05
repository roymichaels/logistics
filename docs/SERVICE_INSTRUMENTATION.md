# Service Instrumentation Guide

## Overview

All services in the application are automatically instrumented for performance tracking and diagnostics via the `runtimeRegistry`. This document explains how to use instrumented services properly.

## Core Components

### 1. ServiceFactory

The `ServiceFactory` creates and caches instrumented service instances:

```typescript
import { serviceFactory, createService } from '@/services/ServiceFactory';
import { OrderService } from '@/services/modules';

// Method 1: Using factory directly
const orderService = serviceFactory.create(OrderService, userId);

// Method 2: Using helper function
const orderService2 = createService(OrderService, userId);

// With options
const orderService3 = createService(OrderService, userId, {
  cached: false, // Disable caching for this instance
  serviceName: 'CustomOrderService' // Custom name for tracking
});
```

### 2. useService Hook

React hook for components:

```typescript
import { useService } from '@/hooks';
import { OrderService, DriverService } from '@/services/modules';

function OrdersPage() {
  const { user } = useAuth();
  const orderService = useService(OrderService, user.id);

  const loadOrders = async () => {
    const orders = await orderService.listOrders();
    // Service call is automatically tracked
  };

  // ...
}
```

### 3. useServices Hook

For multiple services:

```typescript
import { useServices } from '@/hooks';
import { OrderService, DriverService, InventoryService } from '@/services/modules';

function Dashboard() {
  const { user } = useAuth();
  const [orderService, driverService, inventoryService] = useServices(
    user.id,
    [OrderService, DriverService, InventoryService]
  );

  // All services are instrumented and cached
}
```

## Automatic Tracking

Every service method call is automatically tracked with:

- **Execution time** - How long the method took to execute
- **Success/failure** - Whether the method succeeded or threw an error
- **Call frequency** - How many times the method was called
- **Service name** - The service and method name (e.g., `OrderService.listOrders`)

## Viewing Diagnostics

Access diagnostics data via `runtimeRegistry`:

```typescript
import { runtimeRegistry } from '@/lib/diagnostics';

// Get all function calls (including service methods)
const functionCalls = runtimeRegistry.getAllFunctionCalls();

// Get slow functions (>50ms average)
const slowFunctions = runtimeRegistry.getSlowFunctions();

// Get functions with errors
const errorFunctions = functionCalls.filter(f => f.errors > 0);

// Export diagnostics
const report = runtimeRegistry.exportDiagnostics();
console.log(report);
```

## Service Patterns

### Pattern 1: In Components (Recommended)

```typescript
import { useService } from '@/hooks';
import { OrderService } from '@/services/modules';

export function OrdersList() {
  const { user } = useAuth();
  const orderService = useService(OrderService, user.id);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.listOrders()
  });

  return <div>{/* ... */}</div>;
}
```

### Pattern 2: In Standalone Functions

```typescript
import { createService } from '@/services/ServiceFactory';
import { OrderService } from '@/services/modules';

export async function processOrder(orderId: string, userId: string) {
  const orderService = createService(OrderService, userId);
  const order = await orderService.getOrder(orderId);

  // Service is automatically instrumented
  await orderService.updateOrderStatus(orderId, 'processing');

  return order;
}
```

### Pattern 3: In Tests

```typescript
import { createService } from '@/services/ServiceFactory';
import { OrderService } from '@/services/modules';

describe('Order Processing', () => {
  it('should create an order', async () => {
    const orderService = createService(OrderService, 'test-user', {
      cached: false // Disable caching in tests
    });

    const order = await orderService.createOrder({
      customer_name: 'Test Customer',
      items: [/* ... */]
    });

    expect(order).toBeDefined();
  });
});
```

## Cache Management

The ServiceFactory caches service instances by default:

```typescript
import { serviceFactory } from '@/services/ServiceFactory';

// Clear cache for a specific user
serviceFactory.clearCache('user-123');

// Clear all caches
serviceFactory.clearCache();

// Get cache statistics
const stats = serviceFactory.getCacheStats();
console.log(stats);
// {
//   totalServices: 5,
//   totalInstances: 12,
//   serviceBreakdown: {
//     OrderService: 3,
//     DriverService: 4,
//     InventoryService: 5
//   }
// }
```

## Performance Optimization

### 1. Use Caching (Default)

Services are cached by default per user:

```typescript
// First call creates and caches
const service1 = createService(OrderService, userId);

// Second call returns cached instance
const service2 = createService(OrderService, userId);

// service1 === service2 (true)
```

### 2. Disable Caching When Needed

```typescript
// Each call creates a new instance
const service = createService(OrderService, userId, { cached: false });
```

### 3. Monitor Slow Queries

```typescript
import { runtimeRegistry } from '@/lib/diagnostics';

// Get slow service methods
const slowMethods = runtimeRegistry.getSlowFunctions(100); // >100ms

slowMethods.forEach(method => {
  console.warn(`Slow method: ${method.functionName}`);
  console.warn(`Average duration: ${method.avgDuration}ms`);
  console.warn(`Call count: ${method.callCount}`);
});
```

## Best Practices

1. **Always use instrumented services** - Use `useService` or `createService` instead of direct instantiation
2. **Cache appropriately** - Use default caching for production, disable for tests
3. **Monitor performance** - Regularly check slow functions in development
4. **Clean up caches** - Clear user caches on logout
5. **Use typed services** - TypeScript will catch method errors at compile time

## Migration Guide

### Before (Direct Instantiation)

```typescript
import { OrderService } from '@/services/modules';

function MyComponent() {
  const { user } = useAuth();
  const orderService = new OrderService(user.id); // ❌ Not instrumented

  // ...
}
```

### After (Instrumented)

```typescript
import { useService } from '@/hooks';
import { OrderService } from '@/services/modules';

function MyComponent() {
  const { user } = useAuth();
  const orderService = useService(OrderService, user.id); // ✅ Instrumented

  // ...
}
```

## Troubleshooting

### Service Not Being Tracked

**Problem**: Service calls don't appear in runtime registry

**Solution**: Ensure you're using `createService` or `useService`, not `new Service()`

### Performance Issues

**Problem**: Too many service instances created

**Solution**: Check cache usage and ensure caching is enabled for production

### Memory Leaks

**Problem**: Service instances not being cleaned up

**Solution**: Clear cache on user logout:

```typescript
function handleLogout() {
  serviceFactory.clearCache(currentUserId);
  // ... rest of logout logic
}
```

## Advanced Usage

### Custom Service Names

```typescript
const service = createService(OrderService, userId, {
  serviceName: 'LegacyOrderService'
});

// Tracked as "LegacyOrderService" instead of "OrderService"
```

### Conditional Instrumentation

```typescript
const service = createService(OrderService, userId, {
  cached: process.env.NODE_ENV === 'production'
});
```

### Service Composition

```typescript
class CompositeService {
  private orderService: OrderService;
  private inventoryService: InventoryService;

  constructor(userId: string) {
    this.orderService = createService(OrderService, userId);
    this.inventoryService = createService(InventoryService, userId);
  }

  async processOrderWithInventory(orderId: string) {
    // Both services are instrumented independently
    const order = await this.orderService.getOrder(orderId);
    const inventory = await this.inventoryService.checkStock(order.items);

    return { order, inventory };
  }
}
```

## Next Steps

- See `docs/OBSERVABILITY.md` for full diagnostic capabilities
- See `docs/DEVELOPMENT.md` for development workflow
- Check `src/lib/runtime-registry.ts` for all tracking APIs

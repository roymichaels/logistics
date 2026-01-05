# Query & Mutation Instrumentation Examples

## Overview

This document provides practical examples of using instrumented queries and mutations in the application. All examples automatically track performance metrics via `runtimeRegistry`.

## Table of Contents

1. [Basic Query Usage](#basic-query-usage)
2. [Query with Options](#query-with-options)
3. [Basic Mutation Usage](#basic-mutation-usage)
4. [Mutation with Cache Invalidation](#mutation-with-cache-invalidation)
5. [Batch Queries](#batch-queries)
6. [Custom Query Wrappers](#custom-query-wrappers)
7. [Monitoring Performance](#monitoring-performance)

---

## Basic Query Usage

### Example: Fetching Orders

```tsx
import { useQuery } from '@/application/hooks';
import { useService } from '@/hooks';
import { OrderService } from '@/services/modules';
import { useAuth } from '@/context/AuthContext';

function OrdersList() {
  const { user } = useAuth();
  const orderService = useService(OrderService, user.id);

  const { data: orders, loading, error, refetch } = useQuery(
    ['orders', user.id],
    () => orderService.listOrders(),
    {
      ttl: 30000, // 30 second cache
      refetchOnFocus: true, // Refetch when window gains focus
    }
  );

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {orders?.map(order => (
        <div key={order.id}>{order.customer_name}</div>
      ))}
    </div>
  );
}
```

**What's tracked:**
- Query execution time
- Cache hits/misses
- Error occurrences
- Background refetch operations

---

## Query with Options

### Example: Filtered Products with Auto-Refetch

```tsx
import { useQuery } from '@/application/hooks';
import { useService } from '@/hooks';
import { InventoryService } from '@/services/modules';

function ProductsPage() {
  const { user } = useAuth();
  const inventoryService = useService(InventoryService, user.id);
  const [filters, setFilters] = useState({ category: 'all', inStock: true });

  const { data: products, loading, stale } = useQuery(
    ['products', filters.category, filters.inStock],
    () => inventoryService.listProducts(filters),
    {
      ttl: 60000, // 1 minute cache
      enabled: true,
      refetchInterval: 120000, // Auto-refetch every 2 minutes
      persistCache: true, // Persist to IndexedDB
      onSuccess: (data) => {
        console.log(`Loaded ${data.length} products`);
      },
      onError: (error) => {
        console.error('Failed to load products:', error);
      },
    }
  );

  return (
    <div>
      {stale && <div>Data is stale, refreshing...</div>}
      {loading && <div>Loading...</div>}
      {products?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

**Advanced features:**
- Query key depends on filters (auto-refetch when filters change)
- Persistent cache for offline support
- Automatic background refetching
- Stale indicator
- Success/error callbacks

---

## Basic Mutation Usage

### Example: Creating an Order

```tsx
import { useMutation } from '@/application/hooks';
import { useService } from '@/hooks';
import { OrderService } from '@/services/modules';

function CreateOrderForm() {
  const { user } = useAuth();
  const orderService = useService(OrderService, user.id);

  const { mutate: createOrder, loading, error, data } = useMutation(
    (input) => orderService.createOrder(input),
    {
      onSuccess: (data, input) => {
        console.log('Order created:', data);
        // Navigate to order details
      },
      onError: (error, input) => {
        console.error('Failed to create order:', error);
      },
    }
  );

  const handleSubmit = (formData) => {
    createOrder({
      customer_name: formData.name,
      customer_phone: formData.phone,
      items: formData.items,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Order'}
      </button>
      {error && <div className="error">{error.message}</div>}
    </form>
  );
}
```

**What's tracked:**
- Mutation execution time
- Success/failure rate
- Input/output data size
- Error types

---

## Mutation with Cache Invalidation

### Example: Update Product with Auto-Refresh

```tsx
import { useMutation } from '@/application/hooks';
import { useService } from '@/hooks';
import { InventoryService } from '@/services/modules';

function EditProductForm({ productId }) {
  const { user } = useAuth();
  const inventoryService = useService(InventoryService, user.id);

  const { mutate: updateProduct, loading } = useMutation(
    (input) => inventoryService.updateProduct(productId, input),
    {
      // Invalidate queries to trigger automatic refetch
      invalidateKeys: [
        `products.${productId}`,
        'products:list',
      ],
      invalidatePatterns: ['products'], // Invalidate all product queries

      // Emit domain event for other components
      emitEvent: 'product.updated',

      // Optimistic update (show changes immediately)
      optimisticUpdate: (input) => {
        // Update local cache optimistically
        queryCache.update(`products.${productId}`, (old) => ({
          ...old,
          ...input,
        }));
      },

      // Rollback if mutation fails
      rollbackOptimistic: () => {
        // Restore original data
        queryCache.invalidate(`products.${productId}`);
      },

      onSuccess: () => {
        showToast('Product updated successfully');
      },
    }
  );

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      updateProduct({ name: 'New Name', price: 29.99 });
    }}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>Update</button>
    </form>
  );
}
```

**Advanced features:**
- Cache invalidation (automatic refetch)
- Optimistic updates (instant UI feedback)
- Rollback on error
- Domain event emission
- Pattern-based cache clearing

---

## Batch Queries

### Example: Loading Dashboard Data

```tsx
import { batchQueries } from '@/lib/diagnostics';
import { useService } from '@/hooks';
import { OrderService, DriverService, InventoryService } from '@/services/modules';

function Dashboard() {
  const { user } = useAuth();
  const orderService = useService(OrderService, user.id);
  const driverService = useService(DriverService, user.id);
  const inventoryService = useService(InventoryService, user.id);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      try {
        // Load multiple queries in parallel with tracking
        const [orders, drivers, lowStockProducts] = await batchQueries([
          {
            fn: () => orderService.listOrders({ status: 'pending' }),
            name: 'dashboard:pendingOrders',
          },
          {
            fn: () => driverService.listDrivers({ status: 'available' }),
            name: 'dashboard:availableDrivers',
          },
          {
            fn: () => inventoryService.listProducts({ lowStock: true }),
            name: 'dashboard:lowStockProducts',
          },
        ]);

        setDashboardData({ orders, drivers, lowStockProducts });
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <StatsCard title="Pending Orders" value={dashboardData.orders.length} />
      <StatsCard title="Available Drivers" value={dashboardData.drivers.length} />
      <StatsCard title="Low Stock" value={dashboardData.lowStockProducts.length} />
    </div>
  );
}
```

**Benefits:**
- All queries tracked individually
- Combined batch tracking
- Parallel execution
- Single loading state

---

## Custom Query Wrappers

### Example: Reusable Query Hooks

```tsx
// Custom hook file: hooks/useOrders.ts
import { useQuery } from '@/application/hooks';
import { useService } from '@/hooks';
import { OrderService } from '@/services/modules';
import { useAuth } from '@/context/AuthContext';

export function useOrders(filters = {}) {
  const { user } = useAuth();
  const orderService = useService(OrderService, user.id);

  return useQuery(
    ['orders', user.id, JSON.stringify(filters)],
    () => orderService.listOrders(filters),
    {
      ttl: 30000,
      refetchOnFocus: true,
      persistCache: true,
    }
  );
}

export function useOrder(orderId: string) {
  const { user } = useAuth();
  const orderService = useService(OrderService, user.id);

  return useQuery(
    ['orders', orderId],
    () => orderService.getOrder(orderId),
    {
      ttl: 60000,
      enabled: !!orderId,
    }
  );
}

// Usage in component
function OrdersPage() {
  const { data: orders, loading, refetch } = useOrders({ status: 'pending' });

  return <div>{/* ... */}</div>;
}
```

**Advantages:**
- Consistent query configuration
- Automatic instrumentation
- Type safety
- Reusable across components

---

## Monitoring Performance

### Example: Viewing Query Performance

```tsx
import { runtimeRegistry } from '@/lib/diagnostics';

function PerformanceMonitor() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const allCalls = runtimeRegistry.getAllFunctionCalls();

      // Filter to queries and mutations only
      const queries = allCalls.filter(c => c.category === 'query');
      const mutations = allCalls.filter(c => c.category === 'mutation');

      // Find slow queries (>100ms average)
      const slowQueries = queries.filter(q => q.avgDuration > 100);

      // Calculate stats
      setStats({
        totalQueries: queries.length,
        totalMutations: mutations.length,
        slowQueries: slowQueries.length,
        errorRate: allCalls.filter(c => c.errors > 0).length / allCalls.length,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>Query Performance</h2>
      <div>Total Queries: {stats?.totalQueries}</div>
      <div>Total Mutations: {stats?.totalMutations}</div>
      <div>Slow Queries: {stats?.slowQueries}</div>
      <div>Error Rate: {(stats?.errorRate * 100).toFixed(2)}%</div>
    </div>
  );
}
```

### Example: Exporting Diagnostics

```tsx
function ExportDiagnostics() {
  const handleExport = () => {
    const report = runtimeRegistry.exportDiagnostics();

    // Filter to query/mutation data
    const queryData = report.functionCalls.filter(
      f => f.category === 'query' || f.category === 'mutation'
    );

    // Download as JSON
    const blob = new Blob([JSON.stringify(queryData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query-diagnostics.json';
    a.click();
  };

  return <button onClick={handleExport}>Export Query Diagnostics</button>;
}
```

---

## Best Practices

### 1. Query Keys

Use descriptive, hierarchical query keys:

```tsx
// ✅ Good
['orders', userId, { status: 'pending', page: 1 }]
['products', 'category', categoryId]
['driver', driverId, 'inventory']

// ❌ Bad
['data']
['orders123']
['temp']
```

### 2. Cache Invalidation

Be specific with invalidation:

```tsx
// ✅ Good - invalidate specific queries
invalidateKeys: ['orders.123', 'orders:list:pending']

// ❌ Bad - invalidates everything
invalidatePatterns: ['*']
```

### 3. Error Handling

Always handle errors gracefully:

```tsx
const { data, error } = useQuery(key, fetcher, {
  onError: (error) => {
    if (error.type === 'network') {
      showToast('Network error. Please check your connection.');
    } else {
      showToast('Something went wrong. Please try again.');
    }
  },
});
```

### 4. Loading States

Provide feedback to users:

```tsx
if (loading) return <LoadingSkeleton />;
if (error) return <ErrorDisplay error={error} />;
if (!data) return <EmptyState />;

return <DataView data={data} />;
```

### 5. Optimize Refetching

Balance freshness with performance:

```tsx
// For frequently changing data
{ ttl: 10000, refetchInterval: 30000 }

// For rarely changing data
{ ttl: 300000, refetchOnFocus: false }

// For static data
{ ttl: Infinity, persistCache: true }
```

---

## Troubleshooting

### Query Not Updating

**Problem**: Query shows stale data

**Solution**: Check TTL and invalidation:

```tsx
// Force refetch
refetch();

// Or adjust TTL
{ ttl: 0 } // Always fresh
```

### Too Many Requests

**Problem**: Query refetches too often

**Solution**: Adjust refetch settings:

```tsx
{
  ttl: 60000, // Longer cache time
  refetchOnFocus: false, // Disable focus refetch
  refetchInterval: undefined, // Disable auto-refetch
}
```

### Memory Issues

**Problem**: Cache growing too large

**Solution**: Clear old queries:

```tsx
import { queryCache } from '@/application/cache/QueryCache';

// Clear specific pattern
queryCache.clearPattern('old-data');

// Clear everything
queryCache.clear();
```

---

## Next Steps

- See [SERVICE_INSTRUMENTATION.md](./SERVICE_INSTRUMENTATION.md) for service-level tracking
- See [OBSERVABILITY.md](./OBSERVABILITY.md) for full diagnostic capabilities
- Check [DEVELOPMENT.md](./DEVELOPMENT.md) for development workflow

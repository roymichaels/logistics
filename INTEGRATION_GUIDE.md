# Quick Integration Guide

## The persistence system is already implemented! Here's how to start using it:

## Step 1: Update Your Main App Component

Add the PersistenceProvider and UI components to your main App.tsx:

```tsx
import { PersistenceProvider } from './context/PersistenceContext';
import { ConnectionIndicator } from './components/ConnectionIndicator';
import { SyncStatusBanner } from './components/SyncStatusBanner';

// In your App component's render:
<PersistenceProvider>
  <ConnectionIndicator />
  <SyncStatusBanner />
  {/* Your existing app content */}
</PersistenceProvider>
```

## Step 2: Use in Your Components

### Example: Fetch Orders with Automatic Caching

```tsx
import { useCachedData } from './hooks/usePersistenceHooks';

function OrdersList() {
  const { data: orders, isLoading, error, refetch } = useCachedData({
    entityType: 'orders',
    filters: { status: 'pending' },
    cache: true,
    ttl: 1000 * 60 * 15 // 15 minutes
  });

  if (isLoading) return <div>Loading...</div>;
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

### Example: Create Order with Optimistic Update

```tsx
import { useOptimisticUpdate } from './hooks/usePersistenceHooks';

function CreateOrderForm() {
  const { create, isUpdating, error } = useOptimisticUpdate({
    entityType: 'orders',
    onSuccess: (order) => console.log('Order created:', order),
    onError: (err) => console.error('Failed:', err)
  });

  const handleSubmit = async (formData) => {
    await create({
      customer_name: formData.name,
      customer_phone: formData.phone,
      items: formData.items,
      total_amount: formData.total
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
      <button disabled={isUpdating}>
        {isUpdating ? 'Creating...' : 'Create Order'}
      </button>
    </form>
  );
}
```

### Example: Show Offline Warning

```tsx
import { OfflineWarning } from './components/OfflineWarning';
import { useOnlineStatus } from './hooks/usePersistenceHooks';

function MyPage() {
  const { isOnline } = useOnlineStatus();

  return (
    <div>
      {!isOnline && <OfflineWarning />}
      {/* Your page content */}
    </div>
  );
}
```

## Step 3: Direct API Usage (Alternative)

If you prefer not using hooks:

```tsx
import { unifiedDataLayer } from './lib/persistence';

// Query
const orders = await unifiedDataLayer.query('orders', { status: 'pending' });

// Get by ID
const order = await unifiedDataLayer.getById('orders', 'order-id');

// Create
const newOrder = await unifiedDataLayer.create('orders', orderData, {
  optimistic: true,
  priority: 'high'
});

// Update
await unifiedDataLayer.update('orders', 'order-id', { status: 'completed' }, {
  optimistic: true
});

// Delete
await unifiedDataLayer.delete('orders', 'order-id', {
  optimistic: true
});
```

## Features You Get Automatically

✅ **Offline Mode** - Works without internet, syncs when reconnected
✅ **Smart Caching** - Fast access to frequently used data
✅ **Optimistic Updates** - Instant UI feedback
✅ **Connection Monitoring** - Real-time status indicators
✅ **Error Recovery** - Automatic retry with backoff
✅ **Conflict Resolution** - Smart merging of offline changes
✅ **Background Sync** - Automatic synchronization
✅ **Service Worker** - Asset caching and offline pages

## Available Hooks

1. **useOnlineStatus()** - Connection state and quality
2. **useSyncStatus()** - Synchronization status and controls
3. **useCachedData()** - Fetch data with automatic caching
4. **useOptimisticUpdate()** - Create/update/delete with optimistic UI
5. **useOfflineQueue()** - View pending operations
6. **useDataFreshness()** - Check if cached data is stale

## UI Components

1. **ConnectionIndicator** - Shows online/offline status badge
2. **SyncStatusBanner** - Displays sync progress and errors
3. **OfflineWarning** - Alerts when offline

## Configuration (Optional)

### Custom Cache TTL

```tsx
import { unifiedDataLayer } from './lib/persistence';

await unifiedDataLayer.query('products', {}, {
  cache: true,
  ttl: 1000 * 60 * 30 // 30 minutes
});
```

### Conflict Resolution

```tsx
import { syncEngine } from './lib/persistence';

syncEngine.registerConflictResolver('orders', async (type, local, server) => {
  // Custom merge logic
  return {
    ...server,
    notes: local.notes || server.notes
  };
});
```

### Error Handling

```tsx
import { errorHandler, ErrorCategory } from './lib/persistence';

errorHandler.registerHandler(ErrorCategory.Network, async (error) => {
  // Custom network error handling
  console.log('Network issue:', error.message);
});
```

## Testing Offline Mode

1. Open Chrome DevTools
2. Go to Network tab
3. Select "Offline" from throttling dropdown
4. Continue using the app - it will work seamlessly!

## Need Help?

See full documentation at `docs/persistence-system.md`

## That's It!

The system is production-ready and requires minimal integration. Just wrap your app with PersistenceProvider and start using the hooks or direct API. Everything else happens automatically!

# Data Storage Documentation

## Overview

This application uses a **frontend-only data persistence strategy** with no backend servers. All data is stored locally in the browser.

## Storage Technologies

### IndexedDB (Primary Storage)
- **Purpose**: Structured data storage
- **Capacity**: ~50MB typical, up to 1GB+
- **Performance**: Fast indexed queries
- **Use Cases**: Orders, products, inventory, users

### LocalStorage (Session Storage)
- **Purpose**: Simple key-value storage
- **Capacity**: ~5-10MB
- **Performance**: Synchronous, fast
- **Use Cases**: Sessions, preferences, UI state

### Optional: Space & Time (SxT)
- **Purpose**: Blockchain-verifiable data
- **Use Cases**: Audit trails, immutable records
- **Note**: Optional integration, not required

## IndexedDB Schema

### Database Structure

```typescript
const DB_NAME = 'logistics-platform';
const DB_VERSION = 1;

const STORES = {
  users: 'users',
  businesses: 'businesses',
  products: 'products',
  orders: 'orders',
  inventory: 'inventory',
  drivers: 'drivers',
  zones: 'zones',
  messages: 'messages',
  notifications: 'notifications'
};
```

### Store Schemas

#### Users Store
```typescript
interface User {
  id: string;              // Primary key (wallet address)
  walletAddress: string;
  walletType: 'ethereum' | 'solana' | 'ton';
  displayName?: string;
  email?: string;
  phone?: string;
  roles: string[];
  businesses: string[];    // Business IDs user belongs to
  currentRole: string;
  currentBusiness?: string;
  preferences: UserPreferences;
  createdAt: number;
  updatedAt: number;
}

// Indexes
- walletAddress (unique)
- roles (multiEntry)
- currentRole
```

#### Businesses Store
```typescript
interface Business {
  id: string;              // Primary key (UUID)
  name: string;
  type: string;
  owner: string;           // Wallet address
  description?: string;
  logo?: string;
  status: 'active' | 'inactive' | 'suspended';
  settings: BusinessSettings;
  team: TeamMember[];
  createdAt: number;
  updatedAt: number;
}

// Indexes
- owner
- status
- name
```

#### Products Store
```typescript
interface Product {
  id: string;              // Primary key (UUID)
  businessId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  sku?: string;
  images: string[];
  status: 'active' | 'inactive' | 'archived';
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

// Indexes
- businessId
- category
- status
- [businessId, category] (compound)
- [businessId, status] (compound)
```

#### Orders Store
```typescript
interface Order {
  id: string;              // Primary key (UUID)
  businessId: string;
  customerId: string;      // Wallet address
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  deliveryAddress: DeliveryAddress;
  assignedDriver?: string;
  timeline: OrderTimeline[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// Indexes
- businessId
- customerId
- status
- assignedDriver
- [businessId, status] (compound)
- [customerId, createdAt] (compound)
- createdAt
```

#### Inventory Store
```typescript
interface InventoryItem {
  id: string;              // Primary key (UUID)
  productId: string;
  businessId: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  location?: string;
  lastRestocked?: number;
  createdAt: number;
  updatedAt: number;
}

// Indexes
- productId (unique)
- businessId
- [businessId, productId] (compound)
- quantity
```

#### Drivers Store
```typescript
interface Driver {
  id: string;              // Primary key (wallet address)
  businessId: string;
  name: string;
  phone: string;
  vehicle?: VehicleInfo;
  status: 'online' | 'offline' | 'busy';
  currentLocation?: Coordinates;
  assignedZones: string[];
  stats: DriverStats;
  earnings: number;
  createdAt: number;
  updatedAt: number;
}

// Indexes
- businessId
- status
- [businessId, status] (compound)
```

#### Zones Store
```typescript
interface Zone {
  id: string;              // Primary key (UUID)
  businessId: string;
  name: string;
  boundaries: Coordinates[];
  deliveryFee: number;
  active: boolean;
  assignedDrivers: string[];
  createdAt: number;
  updatedAt: number;
}

// Indexes
- businessId
- active
- [businessId, active] (compound)
```

## Data Access Layer

### Opening Database

```typescript
import { openDB } from 'idb';

async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      // Create stores if they don't exist

      // Users store
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('walletAddress', 'walletAddress', { unique: true });
        userStore.createIndex('roles', 'roles', { multiEntry: true });
        userStore.createIndex('currentRole', 'currentRole');
      }

      // Businesses store
      if (!db.objectStoreNames.contains('businesses')) {
        const businessStore = db.createObjectStore('businesses', { keyPath: 'id' });
        businessStore.createIndex('owner', 'owner');
        businessStore.createIndex('status', 'status');
      }

      // Products store
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('businessId', 'businessId');
        productStore.createIndex('category', 'category');
        productStore.createIndex('status', 'status');
        productStore.createIndex('businessCategory', ['businessId', 'category']);
      }

      // Orders store
      if (!db.objectStoreNames.contains('orders')) {
        const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
        orderStore.createIndex('businessId', 'businessId');
        orderStore.createIndex('customerId', 'customerId');
        orderStore.createIndex('status', 'status');
        orderStore.createIndex('createdAt', 'createdAt');
        orderStore.createIndex('businessStatus', ['businessId', 'status']);
      }

      // Additional stores...
    }
  });

  return db;
}
```

### CRUD Operations

**Create**
```typescript
async function createOrder(order: Order): Promise<void> {
  const db = await initDB();
  await db.add('orders', order);
}
```

**Read**
```typescript
// Get by ID
async function getOrder(id: string): Promise<Order | undefined> {
  const db = await initDB();
  return await db.get('orders', id);
}

// Get by index
async function getOrdersByStatus(businessId: string, status: string): Promise<Order[]> {
  const db = await initDB();
  return await db.getAllFromIndex('orders', 'businessStatus', [businessId, status]);
}

// Get all
async function getAllOrders(): Promise<Order[]> {
  const db = await initDB();
  return await db.getAll('orders');
}
```

**Update**
```typescript
async function updateOrder(id: string, updates: Partial<Order>): Promise<void> {
  const db = await initDB();
  const order = await db.get('orders', id);
  if (order) {
    const updated = { ...order, ...updates, updatedAt: Date.now() };
    await db.put('orders', updated);
  }
}
```

**Delete**
```typescript
async function deleteOrder(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('orders', id);
}
```

### Querying with Cursors

For advanced queries:

```typescript
async function getRecentOrders(businessId: string, limit: number): Promise<Order[]> {
  const db = await initDB();
  const tx = db.transaction('orders', 'readonly');
  const index = tx.store.index('businessStatus');
  const orders: Order[] = [];

  let cursor = await index.openCursor(
    IDBKeyRange.bound([businessId, ''], [businessId, '\uffff']),
    'prev' // Descending order
  );

  while (cursor && orders.length < limit) {
    orders.push(cursor.value);
    cursor = await cursor.continue();
  }

  return orders;
}
```

## LocalStorage Usage

### Session Management

```typescript
// Store session
const session = {
  walletAddress: '0x...',
  signature: '...',
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
};
localStorage.setItem('auth_session', JSON.stringify(session));

// Retrieve session
const sessionStr = localStorage.getItem('auth_session');
const session = sessionStr ? JSON.parse(sessionStr) : null;

// Clear session
localStorage.removeItem('auth_session');
```

### User Preferences

```typescript
// UI preferences
interface UIPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  compactMode: boolean;
  notifications: boolean;
}

// Store
localStorage.setItem('ui_preferences', JSON.stringify(preferences));

// Retrieve
const prefs = JSON.parse(localStorage.getItem('ui_preferences') || '{}');
```

### Cart State

```typescript
// Shopping cart
interface CartItem {
  productId: string;
  quantity: number;
}

localStorage.setItem('cart', JSON.stringify(cartItems));
```

## Data Synchronization

### Optimistic Updates

```typescript
async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  // 1. Update UI immediately (optimistic)
  dispatch({ type: 'ORDER_STATUS_UPDATED', orderId, status: newStatus });

  try {
    // 2. Persist to IndexedDB
    await updateOrder(orderId, { status: newStatus });

    // 3. Optional: Sync to SxT if available
    if (sxtEnabled) {
      await sxtService.syncOrder(orderId);
    }
  } catch (error) {
    // 4. Rollback UI on error
    dispatch({ type: 'ORDER_UPDATE_FAILED', orderId, error });
    showError('Failed to update order');
  }
}
```

### Offline Queue

```typescript
interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
}

// Queue operation when offline
async function queueOperation(operation: QueuedOperation) {
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
  queue.push(operation);
  localStorage.setItem('offline_queue', JSON.stringify(queue));
}

// Process queue when online
async function processOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');

  for (const operation of queue) {
    try {
      await executeOperation(operation);
      // Remove from queue on success
      removeFromQueue(operation.id);
    } catch (error) {
      console.error('Failed to process operation:', operation, error);
      // Keep in queue for retry
    }
  }
}
```

## Data Export/Import

### Export Data

```typescript
async function exportData(): Promise<Blob> {
  const db = await initDB();
  const data: any = {};

  // Export all stores
  for (const storeName of db.objectStoreNames) {
    data[storeName] = await db.getAll(storeName);
  }

  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json' });
}

// Trigger download
function downloadExport(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `data-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Import Data

```typescript
async function importData(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text);

  const db = await initDB();
  const tx = db.transaction(db.objectStoreNames, 'readwrite');

  for (const [storeName, items] of Object.entries(data)) {
    const store = tx.objectStore(storeName);
    for (const item of items as any[]) {
      await store.put(item);
    }
  }

  await tx.done;
}
```

## Data Encryption

### Encrypting Sensitive Data

```typescript
import { encrypt, decrypt } from '@lib/crypto';

// Encrypt before storing
async function storeSecureData(key: string, data: any, userKey: string) {
  const encrypted = await encrypt(JSON.stringify(data), userKey);
  localStorage.setItem(key, encrypted);
}

// Decrypt when reading
async function getSecureData(key: string, userKey: string) {
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;
  const decrypted = await decrypt(encrypted, userKey);
  return JSON.parse(decrypted);
}
```

## Performance Optimization

### Indexing Strategy

```typescript
// Good: Uses index
const orders = await db.getAllFromIndex('orders', 'businessId', businessId);

// Bad: Scans all records
const orders = (await db.getAll('orders')).filter(o => o.businessId === businessId);
```

### Batch Operations

```typescript
async function batchInsert(items: any[], storeName: string) {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');

  for (const item of items) {
    tx.store.add(item);
  }

  await tx.done;
}
```

### Caching

```typescript
class CachedDataStore {
  private cache = new Map<string, any>();

  async get(id: string): Promise<any> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }

    // Load from IndexedDB
    const data = await this.loadFromDB(id);

    // Cache it
    this.cache.set(id, data);

    return data;
  }

  invalidate(id: string) {
    this.cache.delete(id);
  }
}
```

## Data Migration

### Version Upgrades

```typescript
const db = await openDB(DB_NAME, 2, {
  upgrade(db, oldVersion, newVersion) {
    if (oldVersion < 2) {
      // Migrate from v1 to v2
      const orderStore = db.transaction.objectStore('orders');
      orderStore.createIndex('priority', 'priority');
    }
  }
});
```

### Data Transformation

```typescript
async function migrateOrderData() {
  const db = await initDB();
  const orders = await db.getAll('orders');

  const tx = db.transaction('orders', 'readwrite');

  for (const order of orders) {
    // Transform old format to new format
    const updated = {
      ...order,
      newField: transformOldData(order)
    };
    await tx.store.put(updated);
  }

  await tx.done;
}
```

## Storage Limits

### Checking Available Space

```typescript
async function checkStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const percentUsed = (estimate.usage! / estimate.quota!) * 100;

    console.log(`Storage used: ${percentUsed.toFixed(2)}%`);
    console.log(`Usage: ${estimate.usage} bytes`);
    console.log(`Quota: ${estimate.quota} bytes`);

    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentUsed
    };
  }
}
```

### Handling Storage Full

```typescript
async function handleStorageFull() {
  // 1. Clear old data
  await clearOldRecords();

  // 2. Compress data
  await compressLargeRecords();

  // 3. Archive to file
  const backup = await exportData();
  downloadExport(backup);

  // 4. Notify user
  showNotification('Storage nearly full. Old data has been archived.');
}
```

## Data Integrity

### Validation

```typescript
function validateOrder(order: any): order is Order {
  return (
    typeof order.id === 'string' &&
    typeof order.businessId === 'string' &&
    typeof order.customerId === 'string' &&
    Array.isArray(order.items) &&
    typeof order.total === 'number'
  );
}

async function safeAddOrder(order: any) {
  if (!validateOrder(order)) {
    throw new Error('Invalid order data');
  }
  await db.add('orders', order);
}
```

### Consistency Checks

```typescript
async function checkDataConsistency() {
  const db = await initDB();

  // Check for orphaned records
  const orders = await db.getAll('orders');
  const businesses = await db.getAll('businesses');
  const businessIds = new Set(businesses.map(b => b.id));

  const orphanedOrders = orders.filter(o => !businessIds.has(o.businessId));

  if (orphanedOrders.length > 0) {
    console.warn(`Found ${orphanedOrders.length} orphaned orders`);
    // Handle orphaned records
  }
}
```

## Backup Strategies

### Automatic Backups

```typescript
// Backup every day
setInterval(async () => {
  const backup = await exportData();
  // Store in cloud storage or download
  await uploadBackup(backup);
}, 24 * 60 * 60 * 1000);
```

### Manual Backup

```tsx
function BackupButton() {
  const handleBackup = async () => {
    const backup = await exportData();
    downloadExport(backup);
    showNotification('Backup created successfully');
  };

  return <Button onClick={handleBackup}>Backup Data</Button>;
}
```

## Debugging

### Inspecting IndexedDB

```typescript
// In browser console
async function inspectDB() {
  const db = await initDB();
  const storeNames = Array.from(db.objectStoreNames);

  for (const name of storeNames) {
    const count = await db.count(name);
    console.log(`${name}: ${count} records`);
  }
}
```

### Clearing Data

```typescript
async function clearAllData() {
  // Clear IndexedDB
  const db = await initDB();
  for (const storeName of db.objectStoreNames) {
    await db.clear(storeName);
  }

  // Clear LocalStorage
  localStorage.clear();

  // Clear SessionStorage
  sessionStorage.clear();
}
```

## Best Practices

1. **Always use indexes** for queries
2. **Batch operations** when possible
3. **Cache frequently accessed data**
4. **Validate data** before storing
5. **Handle storage limits** gracefully
6. **Implement backup strategies**
7. **Use transactions** for related operations
8. **Close database connections** when done
9. **Handle errors** appropriately
10. **Test with large datasets**

## Monitoring

Track storage metrics:

```typescript
// Storage usage
trackMetric('storage:usage_bytes', usageBytes);
trackMetric('storage:usage_percent', usagePercent);

// Operation performance
trackTiming('storage:read_order', readDuration);
trackTiming('storage:write_order', writeDuration);

// Error rates
trackEvent('storage:error', { operation, error });
```

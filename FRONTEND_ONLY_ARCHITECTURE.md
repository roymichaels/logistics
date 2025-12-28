# Frontend-Only Architecture

## Overview

This application is built as a **100% frontend-only** platform with **no backend dependencies**. All data persistence is handled through browser storage mechanisms, and authentication is wallet-based.

## Architecture Principles

### ✅ What We Use
- **IndexedDB** - Primary data storage
- **localStorage** - Session and configuration storage
- **Wallet Authentication** - Ethereum, Solana wallet connections
- **Client-side State Management** - Zustand for global state
- **Mock Data Stores** - Production-ready mock implementations

### ❌ What We Don't Use
- No Supabase
- No backend API servers
- No remote databases
- No traditional authentication servers

## Data Storage Architecture

### 1. LocalDataStore (`src/foundation/data/LocalDataStore.ts`)

The primary data store that provides a SQL-like query interface:

```typescript
// Query Builder Pattern
const users = await store
  .from('users')
  .select('*')
  .eq('role', 'driver')
  .limit(10);

// Insert data
await store
  .from('orders')
  .insert({ customer_name: 'John', total: 100 });

// Subscriptions (local events)
const unsubscribe = store.subscribe('orders', (payload) => {
  console.log('Order changed:', payload);
});
```

**Features:**
- Query builder interface compatible with Supabase API
- Automatic localStorage persistence
- Change subscriptions for reactive updates
- Supports filtering, sorting, pagination
- Transaction-like operations

### 2. FrontendDataStore (`src/lib/frontendDataStore.ts`)

Domain-specific data store with business logic:

```typescript
const store = new HebrewLogisticsDataStore(user);

// Products
const products = await store.listProducts({ category: 'electronics' });
const product = await store.getProduct('prod-1');
await store.createProduct({ name: 'Laptop', price: 999 });

// Orders
const orders = await store.listOrders({ status: 'pending' });
await store.createOrder({
  customer_name: 'Jane Doe',
  items: [{ product_id: 'prod-1', quantity: 2 }]
});

// Driver Operations
await store.assignDriverToZone({ driver_id: '123', zone_id: 'zone-1' });
await store.updateDriverStatus({ status: 'available' });
const inventory = await store.listDriverInventory({ driver_id: '123' });
```

**Features:**
- Pre-populated mock data for demos
- Role-based data filtering
- Business logic enforcement
- Hebrew content support
- Realistic order/inventory workflows

### 3. FrontendOnlyDataStore (`src/lib/frontendOnlyDataStore.ts`)

Generic table-based storage:

```typescript
const store = frontendOnlyDataStore;

// Generic CRUD operations
await store.insert('products', { name: 'Laptop', price: 999 });
const products = await store.query('products', { category: 'electronics' });
await store.update('products', 'prod-1', { price: 899 });
await store.delete('products', 'prod-1');

// Batch operations
await store.batchInsert('orders', [order1, order2, order3]);

// Statistics
const stats = store.getStats(); // { products: 20, orders: 15, ... }
```

**Features:**
- 70+ predefined tables
- Automatic localStorage sync
- Batch operations
- Data statistics
- Clear all functionality

## Authentication

### Wallet-Based Authentication

Users authenticate using Web3 wallets:

```typescript
// Ethereum
import { useWallet } from '@/hooks/useWallet';

const { connect, disconnect, address, chainId } = useWallet();

await connect('ethereum');
// User is now authenticated with their ETH address

// Solana
await connect('solana');
// User is now authenticated with their SOL address
```

### Session Management

Sessions are stored in localStorage:

```typescript
// Session structure
{
  wallet: "0x1234...",
  walletType: "ethereum",
  role: "business_owner",
  timestamp: 1234567890,
  user: {
    id: "user-uuid",
    name: "John Doe",
    wallet_address: "0x1234..."
  }
}
```

**Session Features:**
- 24-hour expiration
- Automatic restoration on page refresh
- Role persistence
- Logout clears all session data

## Data Flow

### 1. Application Bootstrap

```
User Visits App
      ↓
Check localStorage for session
      ↓
   Session exists?
      ↓         ↓
    Yes        No
      ↓         ↓
Restore     Show Login
Session        Page
      ↓
Initialize DataStore
      ↓
Route to Role Dashboard
```

### 2. Data Operations

```
User Action (e.g., Create Order)
      ↓
Call DataStore Method
      ↓
Validate Business Logic
      ↓
Update In-Memory Data
      ↓
Save to localStorage
      ↓
Trigger Subscriptions
      ↓
UI Updates Reactively
```

### 3. Offline Capabilities

All operations work offline by default:
- Create orders
- Update inventory
- Assign drivers
- Track deliveries
- Message other users

Data never leaves the browser.

## Role System

### Supported Roles

The application supports 10 distinct roles:

#### Business Side (B2B)
1. **infrastructure_owner** - Platform administrator
2. **business_owner** - Full business control
3. **manager** - Business operations (restricted)
4. **warehouse** - Inventory management
5. **dispatcher** - Delivery routing
6. **sales** - Customer interactions
7. **customer_service** - Support operations

#### Delivery Side
8. **driver** - Delivery fulfillment

#### Consumer Side
9. **customer** - Shopping experience
10. **user** - Guest browsing

### Role Assignment

Roles are assigned during initial wallet connection:

```typescript
// Default role
const defaultRole = 'customer';

// Override role (development)
localStorage.setItem('dev-console:role-override', 'business_owner');

// Role stored in user profile
{
  id: 'user-123',
  wallet_address: '0x1234...',
  role: 'business_owner',
  permissions: ['create_order', 'manage_inventory']
}
```

## Supabase Shim Layer

For compatibility with existing code, Supabase calls are shimmed:

```typescript
// src/lib/supabaseClient.ts
const mockSupabaseClient = {
  from: (table) => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: null, error: null }),
    update: () => ({ data: null, error: null }),
    delete: () => ({ data: null, error: null })
  }),
  auth: {
    signUp: async () => ({ user: null, error: new Error('Frontend-only') }),
    signInWithPassword: async () => ({ user: null, error: new Error('Frontend-only') }),
    signOut: async () => ({ error: null })
  }
};
```

**Why?**
- Prevents runtime errors
- Maintains existing code structure
- Allows gradual migration
- Preserves type safety

## Development Workflow

### Environment Configuration

```bash
# .env file

# Supabase DISABLED
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=...

# Frontend-Only Mode
VITE_USE_FRONTEND_ONLY=true
```

### Running the Application

```bash
# Development
npm run dev
# Runs on http://localhost:5173

# Production Build
npm run build
# Creates optimized bundle in dist/

# Preview Build
npm run preview
# Test production build locally
```

### Dev Console

Access the developer console for testing:

```typescript
// Press ` (backtick) to open dev console

// Available features:
- Role switching
- Data inspection
- Mock data generation
- State debugging
- Feature flag toggles
```

## Data Persistence Strategy

### What Gets Saved

1. **User Profile**
   - Wallet address
   - Role
   - Preferences
   - Settings

2. **Business Data**
   - Products
   - Inventory
   - Orders
   - Customers

3. **Operational Data**
   - Driver locations
   - Zone assignments
   - Task queues
   - Messages

4. **Session Data**
   - Authentication state
   - Active context
   - UI preferences

### Storage Limits

- **localStorage**: ~5-10MB (varies by browser)
- **IndexedDB**: ~50MB-unlimited (quota-based)

### Data Cleanup

```typescript
// Clear all data
localStorage.clear();
indexedDB.deleteDatabase('app-local-datastore');

// Clear specific data
localStorage.removeItem('user_session');
store.clearAll();
```

## Migration from Backend Systems

### If You Had Supabase Before

The architecture is designed to work as a drop-in replacement:

1. **Query API**: Compatible interface
   ```typescript
   // Before (Supabase)
   const { data } = await supabase.from('products').select('*');

   // After (Frontend-Only)
   const { data } = await store.from('products').select('*');
   ```

2. **Real-time**: Local subscriptions
   ```typescript
   // Before (Supabase)
   supabase
     .channel('products')
     .on('postgres_changes', callback)
     .subscribe();

   // After (Frontend-Only)
   store.subscribe('products', callback);
   ```

3. **Auth**: Wallet-based
   ```typescript
   // Before (Supabase)
   await supabase.auth.signInWithPassword({ email, password });

   // After (Frontend-Only)
   await connectWallet('ethereum');
   ```

### Benefits of Frontend-Only

✅ **No backend costs**
✅ **Instant deployment**
✅ **Perfect offline support**
✅ **No API rate limits**
✅ **Complete data privacy**
✅ **Fast development**
✅ **Easy testing**

### Tradeoffs

⚠️ **Data is local only** - No sync between devices
⚠️ **Storage limits** - Browser storage quotas
⚠️ **No server-side validation** - Trust the client
⚠️ **No cross-user data sharing** - Each user has isolated data

## Future Enhancements

### Optional Backend Integration

The architecture supports adding backend sync:

```typescript
// Sync adapter pattern
interface SyncAdapter {
  push(entity: string, data: any): Promise<void>;
  pull(entity: string): Promise<any[]>;
  subscribe(entity: string, callback: Function): void;
}

// Could implement:
- Supabase sync
- Firebase sync
- Custom API sync
- P2P sync (IPFS, WebRTC)
```

### Space and Time Integration

For blockchain-verifiable data:

```typescript
import { createSxTDataStore } from '@/lib/sxt/sxtDataStore';

// Enable with flag
VITE_USE_SXT=true

// Queries execute on-chain
const orders = await sxtStore.from('orders').select('*');
```

## Security Considerations

### Data Privacy

- All data stays in browser
- No transmission to servers
- User controls deletion
- Wallet-based identity

### Best Practices

1. **Validate Input** - Client-side validation
2. **Sanitize Data** - Prevent XSS
3. **Encrypt Sensitive Data** - Use Web Crypto API
4. **Secure Wallet Connections** - WalletConnect standards
5. **Session Timeouts** - 24-hour expiration

## Testing

### Unit Tests

```bash
npm test
```

Tests use the same data stores:

```typescript
import { LocalDataStore } from '@/foundation/data/LocalDataStore';

describe('Orders', () => {
  let store: LocalDataStore;

  beforeEach(() => {
    store = new LocalDataStore();
    store.clearAll();
  });

  test('create order', async () => {
    const result = await store
      .from('orders')
      .insert({ customer_name: 'Test', total: 100 });

    expect(result.success).toBe(true);
  });
});
```

### Manual Testing

Use the dev console:
1. Switch roles
2. Generate mock data
3. Test workflows
4. Verify persistence

## Deployment

### Static Hosting

Deploy to any static host:

```bash
# Build
npm run build

# Deploy to:
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages
- AWS S3
- Any CDN
```

### Configuration

No environment variables needed in production:

```javascript
// Runtime configuration
window.__APP_CONFIG__ = {
  name: 'My Logistics App',
  version: '1.0.0',
  theme: 'light',
  language: 'en'
};
```

## Troubleshooting

### Data Not Persisting

```typescript
// Check localStorage
console.log(localStorage.getItem('app-local-datastore'));

// Check IndexedDB
indexedDB.databases().then(dbs => console.log(dbs));
```

### Session Lost

```typescript
// Restore session manually
const session = {
  wallet: '0x1234...',
  walletType: 'ethereum',
  role: 'business_owner',
  timestamp: Date.now()
};
localStorage.setItem('user_session', JSON.stringify(session));
```

### Performance Issues

```typescript
// Limit data size
store.from('orders')
  .select('*')
  .limit(100); // Paginate large datasets

// Clear old data
const oldOrders = orders.filter(o =>
  new Date(o.created_at) < thirtyDaysAgo
);
oldOrders.forEach(o => store.delete('orders', o.id));
```

## Support & Documentation

- **Architecture Guide**: This file
- **API Reference**: `/docs/api.md`
- **Component Library**: `/docs/components.md`
- **Workflow Guide**: `/docs/workflows.md`

## License

This frontend-only architecture is part of the larger application and follows the same licensing terms.

---

**Last Updated**: 2024
**Status**: Production Ready ✅

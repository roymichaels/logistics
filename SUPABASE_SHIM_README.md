# Supabase Shim Implementation Guide

This document describes the no-op Supabase shim layer that enables the application to run completely offline without backend dependencies.

## Overview

The Supabase shim provides a frontend-only alternative to backend integration. Instead of making API calls to Supabase, the shim:

- Manages authentication state in localStorage
- Persists data in IndexedDB
- Returns empty/no-op responses for all database operations
- Maintains full API compatibility with the real Supabase client
- Allows the application to run offline with local-only data

## Architecture

```
├── src/lib/
│   ├── supabaseClient.ts (original - unchanged)
│   ├── supabaseClientShim.ts (NEW - no-op client using localStorage for auth)
│   ├── sessionManager.ts (original)
│   ├── sessionManagerShim.ts (NEW - localStorage-backed session management)
│   └── supabaseShimConfig.ts (NEW - configuration detection)
├── src/foundation/adapters/
│   ├── SupabaseAuthAdapter.ts (original)
│   ├── SupabaseAuthShim.ts (NEW - no-op auth with localStorage persistence)
│   ├── SupabaseDataStoreAdapter.ts (original)
│   ├── SupabaseDataStoreShim.ts (NEW - IndexedDB-backed data store)
│   ├── createAuthAdapter.ts (NEW - factory for conditional creation)
│   ├── createDataStoreAdapter.ts (NEW - factory for conditional creation)
│   └── index.ts (updated - exports new shims and factories)
├── src/context/
│   ├── SupabaseReadyContext.tsx (original)
│   └── SupabaseShimContext.tsx (NEW - provider for shim mode)
└── src/main.tsx (updated - conditional initialization based on env var)
```

## Activation

To enable the Supabase shim, set the environment variable:

```bash
VITE_USE_SUPABASE_SHIM=true
```

This can be set in:
1. `.env` file in the project root
2. System environment variables
3. Build-time configuration

## How It Works

### 1. Client Initialization

**Without Shim (default):**
```typescript
const supabase = await initSupabase();
// Makes HTTP request to Supabase project
```

**With Shim:**
```typescript
const supabase = await initSupabaseShim();
// Returns in-memory no-op client, no network calls
```

### 2. Authentication Flow

**Session Storage (localStorage):**
```
Key: twa-undergroundlab-session-v2
Value: {
  user: { id, email, user_metadata, app_metadata },
  access_token: string,
  refresh_token: string,
  expires_at: number
}
```

**Auth Shim Methods:**
- `getCurrentUser()` - Returns logged-in user or null (no API call)
- `getCurrentSession()` - Returns session from localStorage
- `login(credentials)` - Creates mock user, saves to localStorage
- `logout()` - Clears session from localStorage
- `refreshSession()` - Generates new tokens, updates localStorage
- `onAuthStateChange(callback)` - Notifies listeners of auth state changes

### 3. Data Persistence

**IndexedDB Storage:**
```
Database: twa-undergroundlab-db
Object Store: tables
  - Key: table_name
  - Value: { id, data: [], timestamp }
```

**Data Store Shim Methods:**
- `query(table, filters, options)` - Returns empty array or filtered in-memory data
- `queryOne(table, filters)` - Returns first matching item or null
- `insert(table, data)` - Stores in memory + IndexedDB
- `update(table, filters, data)` - Updates matching items
- `delete(table, filters)` - Removes matching items
- `rpc(functionName, params)` - Logs warning, returns null
- `subscribe(table, callback, filters)` - Creates no-op subscription

### 4. Context Provider Switching

**Application initialization (src/main.tsx):**
```typescript
const useShim = import.meta.env.VITE_USE_SUPABASE_SHIM === 'true';

if (useShim) {
  // Uses SupabaseShimProvider (always reports "ready")
  root.render(
    <SupabaseShimProvider>
      <App />
    </SupabaseShimProvider>
  );
} else if (useSXT) {
  // Uses SxT auth provider
  root.render(
    <SxtAuthProvider>
      <App />
    </SxtAuthProvider>
  );
} else {
  // Uses real SupabaseReadyProvider (waits for async init)
  root.render(
    <SupabaseReadyProvider>
      <App />
    </SupabaseReadyProvider>
  );
}
```

## Usage Examples

### Enable Shim Mode

**Development:**
```bash
# Create .env file
echo "VITE_USE_SUPABASE_SHIM=true" >> .env
npm run dev
```

**Production Build:**
```bash
VITE_USE_SUPABASE_SHIM=true npm run build
```

### Using with Components

Components don't need to change. The authentication and data adapters are automatically selected based on the environment:

```typescript
import { createAuthAdapter, createDataStoreAdapter } from './foundation/adapters';

// Automatically uses shim if VITE_USE_SUPABASE_SHIM=true
const authAdapter = createAuthAdapter(supabaseClient);
const dataStoreAdapter = createDataStoreAdapter(supabaseClient);
```

### Testing Auth Persistence

```typescript
import { sessionManagerShim } from './lib/sessionManagerShim';

// Simulate login
await sessionManagerShim.saveSession({
  user: { id: 'test-user', email: 'test@example.com' },
  access_token: 'token123',
  refresh_token: 'refresh123'
});

// Session persists across page reloads via localStorage
const restored = await sessionManagerShim.restoreSession();
console.log(restored.user.id); // 'test-user'
```

## Data Limitations

When using the shim:

- **No Real-Time Sync**: Subscriptions don't receive live updates from other clients
- **Local-Only Storage**: Data is lost when IndexedDB is cleared
- **No Synchronization**: Multiple tabs have independent data stores
- **No Server Validation**: All operations succeed without validation
- **No Permissions**: Row-level security policies are not enforced

## Migration Between Shim and Real Backend

To migrate from shim mode to real Supabase:

1. Disable the shim in `.env`: `VITE_USE_SUPABASE_SHIM=false`
2. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Run migrations to sync IndexedDB data to backend
4. Clear localStorage for clean state: `localStorage.clear()`

## Development & Debugging

### Enable Verbose Logging

```bash
VITE_LOG_LEVEL=DEBUG VITE_USE_SUPABASE_SHIM=true npm run dev
```

### Inspect IndexedDB

Browser DevTools > Application > IndexedDB > twa-undergroundlab-db

### Inspect Auth State

```typescript
// In browser console
localStorage.getItem('twa-undergroundlab-session-v2')
```

### Verify Shim is Active

```typescript
// In browser console
import { isSupabaseShimEnabled } from './lib/supabaseShimConfig';
console.log(isSupabaseShimEnabled()); // true if shim is active
```

## API Compatibility

The shim maintains 100% API compatibility with Supabase client:

```typescript
// All methods work identically
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('id', '123')
  .single();

// With shim: returns { data: null, error: null } (no-op)
// Without shim: returns actual data from Supabase
```

## Performance Notes

- **Faster**: No network latency, all operations are in-memory
- **Limited**: No real database transactions, just simple CRUD
- **Scalable Locally**: IndexedDB can handle MB of data
- **No Concurrency**: Single-threaded JavaScript execution

## Troubleshooting

### Session Not Persisting

```
Issue: Logged-in user disappears after page reload
Solution: Check localStorage.getItem('twa-undergroundlab-session-v2')
          Verify VITE_USE_SUPABASE_SHIM=true
```

### Data Not Saving

```
Issue: Inserted data doesn't appear in subsequent queries
Solution: Verify IndexedDB is enabled in browser
          Check IndexedDB in DevTools: Application > IndexedDB
```

### Shim Not Activating

```
Issue: App still tries to connect to Supabase despite env var
Solution: Verify VITE_USE_SUPABASE_SHIM=true (case sensitive)
          Rebuild: npm run build
          Check console logs for activation message
```

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/supabaseClientShim.ts` | No-op Supabase client |
| `src/lib/sessionManagerShim.ts` | Session persistence using localStorage |
| `src/lib/supabaseShimConfig.ts` | Configuration detection |
| `src/foundation/adapters/SupabaseAuthShim.ts` | Authentication adapter |
| `src/foundation/adapters/SupabaseDataStoreShim.ts` | Data store adapter |
| `src/foundation/adapters/createAuthAdapter.ts` | Factory for auth |
| `src/foundation/adapters/createDataStoreAdapter.ts` | Factory for data store |
| `src/context/SupabaseShimContext.tsx` | Provider for shim readiness |

## Limitations & Future Work

- [ ] Real-time sync between tabs using SharedWorker
- [ ] Data export/import for migration
- [ ] Compression for IndexedDB storage
- [ ] Service Worker for offline caching
- [ ] Conflict resolution for multi-tab writes

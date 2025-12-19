# Supabase Shim Verification Checklist

Use this checklist to verify the Supabase shim is working correctly.

## Pre-Deployment Verification

### 1. Build Succeeds

```bash
npm run build
```

Expected: ✅ Build completes without errors
Check: Terminal shows "✓ built in X.XXs"

### 2. TypeScript Compilation

```bash
npx tsc --noEmit
```

Expected: ✅ No type errors
Check: Command completes silently with exit code 0

### 3. File Structure

Verify all shim files exist:

```bash
ls -la src/lib/supabaseClientShim.ts
ls -la src/lib/sessionManagerShim.ts
ls -la src/lib/supabaseShimConfig.ts
ls -la src/foundation/adapters/SupabaseAuthShim.ts
ls -la src/foundation/adapters/SupabaseDataStoreShim.ts
ls -la src/foundation/adapters/createAuthAdapter.ts
ls -la src/foundation/adapters/createDataStoreAdapter.ts
ls -la src/context/SupabaseShimContext.tsx
```

Expected: ✅ All files present
Check: No "No such file or directory" errors

### 4. Environment Variable Detection

Create `.env` file:

```bash
echo "VITE_USE_SUPABASE_SHIM=true" > .env
```

Expected: ✅ Environment variable readable
Check: File created and contains the variable

## Runtime Verification (Dev Mode)

### 1. Start Dev Server

```bash
npm run dev
```

Expected: ✅ Dev server starts
Check: Output shows "Local: http://localhost:5173" or similar

### 2. Check Browser Console Logs

Open browser DevTools (F12) and check Console tab for:

```
🔧 Using Supabase Shim: true
Supabase shim active — using no-op client with localStorage/IndexedDB
✅ Supabase shim initialized successfully in X.XXms
```

Expected: ✅ All three log messages present
Check: No error messages before these logs

### 3. Verify Authentication Flow

**Test Case 1: Initial Load (No Session)**

1. Clear localStorage: `localStorage.clear()`
2. Refresh page
3. Check console: Should NOT show "Session restored" message

Expected: ✅ Message shows "No existing session found"
Check: Browser console displays: "ℹ️ No existing session found"

**Test Case 2: Session Persistence**

1. Open DevTools Console
2. Run:
   ```javascript
   localStorage.setItem('twa-undergroundlab-session-v2', JSON.stringify({
     user: { id: 'test-user-123', email: 'test@example.com' },
     access_token: 'token_abc',
     refresh_token: 'refresh_xyz'
   }));
   ```
3. Refresh page
4. Check console

Expected: ✅ Message shows "Session restored successfully"
Check: Browser console displays: "✅ Session restored successfully"

### 4. Verify IndexedDB Creation

1. Open DevTools
2. Navigate to Application tab
3. Expand IndexedDB → twa-undergroundlab-db → tables

Expected: ✅ IndexedDB database exists
Check: "tables" object store is visible (may be empty initially)

### 5. Test No-Op Client Behavior

Open DevTools Console and run:

```javascript
import { getSupabaseShim } from './lib/supabaseClientShim';
const client = getSupabaseShim();

// Test auth methods
const user = await client.auth.getUser();
console.log('User:', user); // Should return { data: { user: null } }

// Test data methods
const result = await client.from('test_table').select('*');
console.log('Query result:', result); // Should return { data: [], error: null }
```

Expected: ✅ All methods return without errors
Check: Console shows no error messages

## Component Testing

### 1. SupabaseReadyContext Replacement

Components using `useSupabaseReady()` should render without errors:

```typescript
import { useSupabaseReady } from './context/SupabaseReadyContext';

function MyComponent() {
  const { isSupabaseReady } = useSupabaseReady();
  return <div>{isSupabaseReady ? 'Ready' : 'Loading'}</div>;
}
```

Expected: ✅ Component renders "Ready" immediately
Check: No console errors, correct text displayed

### 2. Auth Adapter Usage

Components that depend on auth should work:

```typescript
import { createAuthAdapter } from './foundation/adapters';

const authAdapter = createAuthAdapter();
const session = await authAdapter.getCurrentSession();
console.log(session); // Should return null or stored session
```

Expected: ✅ Returns valid result object
Check: No type errors, proper return value

### 3. Data Store Adapter Usage

Components that query data should handle empty results:

```typescript
import { createDataStoreAdapter } from './foundation/adapters';

const store = createDataStoreAdapter();
const result = await store.query('users', []);
console.log(result); // Should return Ok([])
```

Expected: ✅ Returns empty array result
Check: Properly typed AsyncResult

## Performance Checks

### 1. Build Size

```bash
npm run build
ls -lh dist/index.html dist/assets/index*.js
```

Expected: ✅ No significant increase from shim (< 5% increase)
Check: Main bundle size remains reasonable

### 2. Initialization Time

Check browser console:

```
⏱️ [TIMING] Starting Supabase shim initialization at...
✅ Supabase shim initialized successfully in X.XXms
```

Expected: ✅ Initialization under 100ms
Check: Time shows "X.XXms" (usually 1-5ms)

### 3. Memory Usage

Open DevTools → Memory tab:

1. Take heap snapshot before login
2. Simulate login (save session to localStorage)
3. Take another snapshot
4. Compare

Expected: ✅ Memory increase under 5MB
Check: No memory leaks on repeated operations

## Data Persistence Testing

### 1. Write Data

```javascript
import { createDataStoreAdapter } from './foundation/adapters';

const store = createDataStoreAdapter();
const result = await store.insert('test', { id: '1', name: 'Test' });
console.log(result); // Should show inserted data
```

Expected: ✅ Data inserted successfully
Check: Result contains the inserted item

### 2. Query Data

```javascript
const result = await store.query('test', []);
console.log(result); // Should show previously inserted data
```

Expected: ✅ Data persists in memory
Check: Can retrieve previously inserted item

### 3. Verify IndexedDB Persistence

```javascript
indexedDB.open('twa-undergroundlab-db', 1).onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction(['tables'], 'readonly');
  const store = tx.objectStore('tables');
  store.get('test').onsuccess = (e) => {
    console.log('IndexedDB data:', e.target.result);
  };
};
```

Expected: ✅ Data stored in IndexedDB
Check: IndexedDB contains persisted table data

## Disabling Shim Verification

### 1. Disable Shim Mode

```bash
# Remove or set to false
export VITE_USE_SUPABASE_SHIM=false
```

### 2. Rebuild

```bash
npm run build
```

### 3. Verify Real Supabase Activation

Check console should show:

```
🔧 Using Supabase Shim: false
🔄 Initializing Supabase...
```

(Not using shim mode)

Expected: ✅ Regular Supabase initialization attempts
Check: Console shows Supabase URL being used

## Edge Cases Testing

### 1. Multiple Tabs

1. Open app in two browser tabs
2. Login in tab 1
3. Check tab 2

Expected: ✅ Tabs have independent sessions (localStorage shared, but different IndexedDB contexts)
Check: Each tab can have independent auth state

### 2. IndexedDB Disabled

Simulate disabled IndexedDB:
1. DevTools → Application → IndexedDB (disable in DevTools settings, if available)
2. Refresh app

Expected: ✅ App still works with in-memory storage only
Check: No console errors, shim continues to function

### 3. Large Dataset

```javascript
const store = createDataStoreAdapter();
for (let i = 0; i < 1000; i++) {
  await store.insert('test_large', { id: `${i}`, name: `Item ${i}` });
}
const result = await store.query('test_large', []);
console.log(result.value.length); // Should be 1000
```

Expected: ✅ Handles 1000+ items without error
Check: Query completes and returns correct count

## Success Criteria

All of the following must pass for full verification:

- [ ] Build completes without errors
- [ ] TypeScript compilation passes
- [ ] All shim files exist
- [ ] Dev server starts
- [ ] Console logs show shim activation
- [ ] Session persistence works
- [ ] IndexedDB database created
- [ ] Auth methods work without errors
- [ ] Data query methods work
- [ ] Components render correctly
- [ ] Performance is acceptable (< 100ms init, < 5MB memory)
- [ ] Data persists in IndexedDB
- [ ] Multiple tabs can operate independently
- [ ] App works with large datasets

## Rollback Plan

If shim mode causes issues:

1. **Disable shim**: `export VITE_USE_SUPABASE_SHIM=false` or remove from `.env`
2. **Rebuild**: `npm run build`
3. **Clear cache**: DevTools → Application → Clear site data
4. **Restart**: `npm run dev`
5. **Verify**: Check console for real Supabase initialization

## Support & Troubleshooting

For issues, check:

1. **Console Logs**: Look for initialization messages
2. **Storage**: Verify localStorage and IndexedDB in DevTools
3. **Network**: Verify no network calls to Supabase (should be 0)
4. **Cache**: Clear browser cache if seeing old behavior
5. **Environment**: Confirm `VITE_USE_SUPABASE_SHIM=true` is set

See `SUPABASE_SHIM_README.md` for detailed troubleshooting guide.

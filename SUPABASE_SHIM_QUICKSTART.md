# Supabase Shim - Quick Start Guide

Enable your application to run 100% offline with persistent authentication and data storage.

## 30-Second Setup

### 1. Enable Shim Mode

```bash
echo "VITE_USE_SUPABASE_SHIM=true" >> .env
```

### 2. Start Dev Server

```bash
npm run dev
```

### 3. Check It Works

Open browser DevTools (F12) → Console tab

Look for:
```
🔧 Using Supabase Shim: true
✅ Supabase shim initialized successfully in X.XXms
```

Done! Your app now runs offline.

## What Just Happened

- ✅ Authentication uses browser localStorage (persists across reloads)
- ✅ Data is stored in browser IndexedDB (survives page refreshes)
- ✅ Zero network calls to Supabase backend
- ✅ All existing pages and components work unchanged

## Quick Tests

### Test 1: Session Persistence

1. Open DevTools Console
2. Paste this:
   ```javascript
   localStorage.setItem('twa-undergroundlab-session-v2', JSON.stringify({
     user: { id: 'test-123', email: 'me@example.com' },
     access_token: 'token_abc'
   }));
   ```
3. Refresh page
4. Check console - should show: "✅ Session restored successfully"

### Test 2: Data Storage

1. Open DevTools Console
2. Paste this:
   ```javascript
   import { createDataStoreAdapter } from './foundation/adapters';
   const db = createDataStoreAdapter();
   await db.insert('users', { id: '1', name: 'Alice' });
   const result = await db.query('users', []);
   console.log(result.value); // Should show [ { id: '1', name: 'Alice' } ]
   ```

## Disable Shim

To go back to real Supabase:

```bash
# Option 1: Remove from .env
rm .env  # or manually edit it

# Option 2: Or set it to false
echo "VITE_USE_SUPABASE_SHIM=false" >> .env

# Then restart dev server
npm run dev
```

## Common Issues

### "Session Not Found After Reload"

Check localStorage:
```javascript
console.log(localStorage.getItem('twa-undergroundlab-session-v2'));
```

Should show `null` (no session) or a JSON object (session exists).

### "Shim Not Active"

Check environment variable:
```javascript
import { isSupabaseShimEnabled } from './lib/supabaseShimConfig';
console.log(isSupabaseShimEnabled()); // Should be true
```

If false, verify `.env` file has `VITE_USE_SUPABASE_SHIM=true`

### "App Still Connecting to Supabase"

Confirm shim is enabled - check console for:
```
Using Supabase Shim: true
```

If showing `false`, rebuild with shim enabled.

## Limits to Know

- ❌ No real-time sync with backend
- ❌ Data lost if browser storage is cleared
- ❌ Multiple browser tabs have independent data
- ❌ No backend validation of data
- ❌ RPC functions return null

For full details, see [SUPABASE_SHIM_README.md](./SUPABASE_SHIM_README.md)

## Full Documentation

- **Quick Overview**: This file
- **Complete Guide**: [SUPABASE_SHIM_README.md](./SUPABASE_SHIM_README.md)
- **Testing Checklist**: [SUPABASE_SHIM_VERIFICATION.md](./SUPABASE_SHIM_VERIFICATION.md)
- **Implementation Details**: [SUPABASE_SHIM_IMPLEMENTATION_SUMMARY.md](./SUPABASE_SHIM_IMPLEMENTATION_SUMMARY.md)

## That's It!

Your app is now running completely offline with persistent user sessions and data storage. All existing pages and components work without modification.

Changes are automatically saved to:
- 📱 localStorage (auth sessions)
- 💾 IndexedDB (application data)

Happy coding!

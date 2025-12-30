# Storage System Usage Guide

Quick reference for using the new unified storage architecture.

---

## Basic Data Storage

### Simple Key-Value Storage

```typescript
import { getUnifiedDataStore } from '@/lib/storage';

const store = getUnifiedDataStore();

// Store data
await store.set('user_preferences', {
  theme: 'dark',
  language: 'he',
  notifications: true
});

// Retrieve data
const prefs = await store.get('user_preferences');

// Check if key exists
const exists = await store.has('user_preferences');

// Delete data
await store.delete('user_preferences');

// Clear all data
await store.clear();
```

### Batch Operations

```typescript
// Set multiple values at once
const data = new Map([
  ['setting1', { value: 'foo' }],
  ['setting2', { value: 'bar' }],
  ['setting3', { value: 'baz' }]
]);
await store.setMultiple(data);

// Get multiple values at once
const keys = ['setting1', 'setting2', 'setting3'];
const results = await store.getMultiple(keys);

// results is a Map<string, any>
console.log(results.get('setting1')); // { value: 'foo' }
```

### Cache Management

```typescript
// Skip cache on read (force fresh read from storage)
const data = await store.get('key', { useCache: false });

// Skip cache on write (don't update memory cache)
await store.set('key', value, { skipCache: true });

// Invalidate specific cache entry
store.invalidateCache('key');

// Clear entire memory cache (persistent storage untouched)
store.clearCache();
```

---

## File/Image Storage

### Storing Files

```typescript
import { getBlobStore } from '@/lib/storage';

const blobStore = getBlobStore();

// Store a file (with compression and thumbnail)
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const fileId = await blobStore.store(file, 'profile-photo.jpg', {
  compress: true,          // Apply image compression (images only)
  generateThumbnail: true  // Generate thumbnail (images only)
});

console.log('Stored file:', fileId); // "blob_1703943217_abc123"
```

### Retrieving Files

```typescript
// Get the blob object
const blob = await blobStore.get(fileId);

// Get a URL to display in <img> or download
const url = await blobStore.getURL(fileId);

// Display image
const img = document.createElement('img');
img.src = url;

// Get thumbnail URL (faster loading)
const thumbUrl = await blobStore.getURL(fileId, { useThumbnail: true });
```

### File Metadata

```typescript
const metadata = await blobStore.getMetadata(fileId);

console.log(metadata);
// {
//   id: "blob_1703943217_abc123",
//   filename: "profile-photo.jpg",
//   mimeType: "image/jpeg",
//   size: 2048000,           // Original size
//   compressedSize: 512000,  // Compressed size
//   uploadedAt: "2024-12-30T10:00:00Z",
//   lastAccessed: "2024-12-30T10:05:00Z"
// }
```

### Managing Storage

```typescript
// List all stored files
const allFiles = await blobStore.list();

// Get total storage usage
const totalBytes = await blobStore.getTotalSize();
console.log(`Using ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

// Delete a file
await blobStore.delete(fileId);

// Cleanup old files (remove files not accessed in 30 days)
const deletedCount = await blobStore.cleanup(30);
console.log(`Cleaned up ${deletedCount} old files`);

// Revoke all cached URLs (free memory)
blobStore.revokeAllURLs();
```

---

## Network Status & Offline Support

### Using Network Context

```typescript
import { useNetwork } from '@/contexts/NetworkContext';

function MyComponent() {
  const {
    isOnline,
    pendingOperations,
    addPendingOperation,
    retryPendingOperations,
    clearPendingOperations
  } = useNetwork();

  const handleSave = async (data) => {
    if (isOnline) {
      // Online: save immediately
      await saveToBackend(data);
    } else {
      // Offline: queue for later
      addPendingOperation('save_data', data);
    }
  };

  return (
    <div>
      <div>Status: {isOnline ? '🟢 Online' : '🔴 Offline'}</div>
      {pendingOperations.length > 0 && (
        <div>
          📤 {pendingOperations.length} operations pending
          <button onClick={retryPendingOperations}>Retry Now</button>
        </div>
      )}
    </div>
  );
}
```

### Adding Network Indicator

```typescript
import { NetworkStatusIndicator } from '@/contexts/NetworkContext';

function App() {
  return (
    <NetworkProvider>
      <NetworkStatusIndicator />
      {/* Your app content */}
    </NetworkProvider>
  );
}
```

---

## Storage Strategies

### Memory Only (Fastest, Volatile)

```typescript
const store = getUnifiedDataStore({ strategy: 'memory' });
// Data lost on page reload
// Best for: Temporary UI state, session data
```

### LocalStorage (Fast, Persistent, Limited)

```typescript
const store = getUnifiedDataStore({ strategy: 'localStorage' });
// ~5-10MB limit
// Best for: User preferences, settings, small datasets
```

### IndexedDB (Unlimited, Persistent)

```typescript
const store = getUnifiedDataStore({ strategy: 'indexedDB' });
// No practical size limit
// Best for: Large datasets, offline data, files
```

### Multi-Tier (Recommended)

```typescript
const store = getUnifiedDataStore({ strategy: 'multi' });
// Combines all three: memory cache + localStorage + IndexedDB
// Best for: Production use, optimal performance
```

---

## Advanced Patterns

### User Profile Storage

```typescript
const store = getUnifiedDataStore();

// Save user profile
await store.set('user_profile', {
  id: user.id,
  name: user.name,
  avatar: user.avatar,
  lastLogin: new Date().toISOString()
});

// Load on app start
const profile = await store.get('user_profile');
if (profile) {
  // Restore session
  restoreUserSession(profile);
}
```

### Product Catalog Caching

```typescript
const store = getUnifiedDataStore({ ttl: 3600000 }); // 1 hour TTL

// Cache catalog
await store.set('product_catalog', products);

// Later retrieval (from cache if available)
const catalog = await store.get('product_catalog');

// Force refresh
await store.set('product_catalog', freshProducts);
store.invalidateCache('product_catalog');
```

### Shopping Cart Persistence

```typescript
const store = getUnifiedDataStore({ strategy: 'multi' });

// Update cart (auto-persisted)
const updateCart = async (cart) => {
  await store.set('shopping_cart', {
    items: cart.items,
    total: cart.total,
    updatedAt: new Date().toISOString()
  });
};

// Load cart on page load
const savedCart = await store.get('shopping_cart');
if (savedCart) {
  restoreCart(savedCart);
}
```

### Image Gallery with Thumbnails

```typescript
const blobStore = getBlobStore({
  maxSize: 10 * 1024 * 1024,  // 10MB max per file
  enableCompression: true,
  compressionQuality: 0.8,
  generateThumbnails: true,
  thumbnailSize: 200
});

// Upload multiple images
const fileIds = await Promise.all(
  files.map(file => blobStore.store(file))
);

// Display thumbnails (fast)
const thumbnailUrls = await Promise.all(
  fileIds.map(id => blobStore.getURL(id, { useThumbnail: true }))
);

// Full image on click
const fullImageUrl = await blobStore.getURL(fileId);
```

---

## Error Handling

### Storage Operations

```typescript
try {
  await store.set('key', largeData);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Storage full - cleanup old data
    await blobStore.cleanup(30);
    // Retry
    await store.set('key', largeData);
  } else {
    console.error('Storage error:', error);
  }
}
```

### File Upload

```typescript
const blobStore = getBlobStore({ maxSize: 5 * 1024 * 1024 }); // 5MB limit

try {
  const fileId = await blobStore.store(file);
  return fileId;
} catch (error) {
  if (error.message.includes('exceeds maximum')) {
    alert('File too large. Maximum size is 5MB.');
  } else {
    alert('Upload failed: ' + error.message);
  }
}
```

---

## Performance Tips

1. **Use multi-strategy for production**
   ```typescript
   const store = getUnifiedDataStore({ strategy: 'multi' });
   ```

2. **Batch operations when possible**
   ```typescript
   await store.setMultiple(dataMap); // Better than multiple set() calls
   ```

3. **Compress images before storage**
   ```typescript
   await blobStore.store(file, filename, { compress: true });
   ```

4. **Use thumbnails for lists/grids**
   ```typescript
   const thumbUrl = await blobStore.getURL(id, { useThumbnail: true });
   ```

5. **Clean up periodically**
   ```typescript
   // Run weekly
   await blobStore.cleanup(30);
   ```

6. **Revoke URLs when done**
   ```typescript
   useEffect(() => {
     return () => blobStore.revokeAllURLs();
   }, []);
   ```

---

## Migration from Old Code

### Before (Supabase)

```typescript
import { supabase } from '@/lib/supabaseClient';

const { data, error } = await supabase
  .from('products')
  .select('*');
```

### After (Local Storage)

```typescript
import { getUnifiedDataStore } from '@/lib/storage';

const store = getUnifiedDataStore();
const products = await store.get('products') || [];
```

### File Upload Migration

```typescript
// Before (Supabase Storage)
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('user.jpg', file);

// After (Local Blob Store)
const blobStore = getBlobStore();
const fileId = await blobStore.store(file, 'user.jpg');
await store.set('user_avatar_id', fileId);
```

---

## Best Practices

✅ **DO**:
- Use `multi` strategy in production
- Enable compression for images
- Clean up old files periodically
- Handle QuotaExceededError
- Revoke blob URLs when unmounting
- Use batch operations for bulk updates

❌ **DON'T**:
- Store sensitive data without encryption
- Keep unlimited blob URLs active
- Skip error handling
- Store massive files (>10MB)
- Use memory-only strategy for important data
- Ignore storage quota limits

---

## Troubleshooting

**Q: Storage quota exceeded**
```typescript
// Check usage
const totalBytes = await blobStore.getTotalSize();

// Cleanup old files
await blobStore.cleanup(30);

// Or clear specific keys
await store.delete('large_dataset');
```

**Q: Images not compressing**
```typescript
// Ensure file is an image
if (!file.type.startsWith('image/')) {
  console.warn('Compression only works for images');
}

// Check compression result
const metadata = await blobStore.getMetadata(fileId);
console.log('Original:', metadata.size);
console.log('Compressed:', metadata.compressedSize);
```

**Q: Cache not working**
```typescript
// Verify strategy
const store = getUnifiedDataStore({ strategy: 'multi' });

// Check TTL hasn't expired
const store = getUnifiedDataStore({ ttl: 3600000 }); // 1 hour
```

---

## Support

For issues or questions:
- Check console logs (logger.info/warn/error)
- Review file: `PHASE_1_STORAGE_COMPLETE.md`
- Inspect IndexedDB in DevTools → Application → IndexedDB

---

**Last Updated**: December 30, 2025
**Version**: 1.0.0

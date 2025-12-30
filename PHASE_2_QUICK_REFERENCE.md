# Phase 2: Quick Reference Guide

Fast lookup for all Phase 2 features.

---

## Search Engine

```typescript
import { getSearchEngine } from '@/lib/storage';
const search = getSearchEngine();

// Index documents
await search.indexDocument('products', 'id_123', doc, ['name', 'desc']);
await search.indexStore('products'); // Index entire store

// Search
const results = await search.search('query', {
  stores: ['products'],
  maxResults: 10,
  includeDocument: true,
  minScore: 20
});

// Manage index
await search.rebuildIndex('products');
await search.clearIndex('products');
const stats = await search.getIndexStats();
```

---

## Encryption

```typescript
import { getSecureStorage, getEncryptionService } from '@/lib/storage';

// High-level API (recommended)
const secure = getSecureStorage();
await secure.initialize('password'); // or (undefined, wallet, signature)
await secure.set('key', sensitiveData);
const data = await secure.get('key');
secure.lock(); // Clear keys from memory

// Low-level API
const encryption = getEncryptionService();
const keyId = await encryption.generateKey();
const encrypted = await encryption.encrypt(data, keyId);
const decrypted = await encryption.decrypt(encrypted, keyId);
```

---

## Sync Engine

```typescript
import { getSyncEngine } from '@/lib/storage';
const sync = getSyncEngine('latest-wins');

// Track changes
await sync.trackChange('products', 'id_123', 'update', data);

// Sync with remote
const result = await sync.sync('products', remoteData);
// { synced: 45, conflicts: [], errors: [] }

// Handle conflicts
const conflicts = await sync.getConflicts();
await sync.resolveManualConflict(conflictId, resolvedData);

// Stats
const stats = await sync.getSyncStats();
```

**Strategies**: `local-wins`, `remote-wins`, `latest-wins`, `merge-deep`, `manual`

---

## Import/Export

```typescript
import { getImportExportService } from '@/lib/storage';
const io = getImportExportService();

// Export
await io.exportToFile('backup.json', {
  includeBlobs: true,
  stores: ['products', 'orders']
});
await io.exportCSVToFile('products', 'products.csv');

// Import
await io.importFromFile(file, {
  overwrite: false,
  merge: true
});

// Stats
const stats = await io.getStorageStats();

// Clear
await io.clearAllData(); // ⚠️ Caution!
```

---

## Analytics UI

```typescript
import { StorageAnalytics } from '@/components/StorageAnalytics';

function Dashboard() {
  return <StorageAnalytics />;
}
```

**Shows**: Storage stats, sync status, search indexes, file storage

**Actions**: Refresh, Export, Clear Cache, Cleanup Blobs

---

## Complete Integration Example

```typescript
import {
  getUnifiedDataStore,
  getBlobStore,
  getSearchEngine,
  getSecureStorage,
  getSyncEngine,
  getImportExportService
} from '@/lib/storage';

// Setup
const store = getUnifiedDataStore();
const blobs = getBlobStore();
const search = getSearchEngine();
const secure = getSecureStorage();
const sync = getSyncEngine('latest-wins');
const io = getImportExportService();

// 1. Store encrypted credentials
await secure.initialize('password');
await secure.set('api_key', 'secret_key_123');

// 2. Store and index product
const product = { id: '1', name: 'Product', description: '...' };
await store.set('product_1', product);
await search.indexDocument('products', '1', product);

// 3. Upload image
const imageId = await blobs.store(imageFile, 'product.jpg', {
  compress: true,
  generateThumbnail: true
});

// 4. Track change for sync
await sync.trackChange('products', '1', 'create', product);

// 5. Search
const results = await search.search('product name');

// 6. Export backup
await io.exportToFile('daily_backup.json', { includeBlobs: true });
```

---

## Common Patterns

### Secure User Data
```typescript
const secure = getSecureStorage();
await secure.initialize(undefined, walletAddress, signature);
await secure.set('private_key', key);
```

### Index After Bulk Import
```typescript
await importExport.importFromFile(file);
await searchEngine.indexStore('products');
```

### Daily Backup
```typescript
await importExport.exportToFile(
  `backup_${new Date().toISOString().split('T')[0]}.json`,
  { includeBlobs: true }
);
```

### Sync When Online
```typescript
if (navigator.onLine) {
  const pending = await sync.getPendingChanges();
  if (pending.length > 0) {
    await sync.sync('products', remoteData);
  }
}
```

---

## Performance Tips

✅ Batch operations when possible
✅ Index only searchable fields
✅ Use thumbnails for image lists
✅ Clean up old sync logs
✅ Compress images before storage
✅ Lock secure storage when not in use
✅ Set appropriate minScore for search
✅ Use merge import for updates

---

## Error Handling

```typescript
try {
  await search.indexStore('products');
} catch (error) {
  console.error('Indexing failed:', error);
  // Fallback: continue without search
}

try {
  await secure.set('key', data);
} catch (error) {
  if (error.message.includes('not initialized')) {
    await secure.initialize('password');
    await secure.set('key', data);
  }
}

try {
  await blobs.store(file);
} catch (error) {
  if (error.message.includes('exceeds maximum')) {
    // File too large
  }
}
```

---

## Quick Diagnostics

```typescript
// Check search index health
const searchStats = await search.getIndexStats();
console.log('Indexed:', searchStats.totalDocuments);

// Check sync status
const syncStats = await sync.getSyncStats();
console.log('Pending:', syncStats.pending);

// Check storage usage
const storageStats = await io.getStorageStats();
console.log('Total records:', storageStats.total);

// Check blob storage
const blobSize = await blobs.getTotalSize();
console.log('Blob storage:', (blobSize / 1024 / 1024).toFixed(2), 'MB');
```

---

## Module Locations

| Feature | Import Path |
|---------|-------------|
| Search | `@/lib/storage` → `getSearchEngine` |
| Encryption | `@/lib/storage` → `getSecureStorage` |
| Sync | `@/lib/storage` → `getSyncEngine` |
| Import/Export | `@/lib/storage` → `getImportExportService` |
| Analytics | `@/components/StorageAnalytics` |

---

**Last Updated**: December 30, 2025
**Version**: 2.0.0

For detailed docs, see: `PHASE_2_ADVANCED_STORAGE_COMPLETE.md`

export {
  UnifiedDataStore,
  getUnifiedDataStore,
  resetUnifiedDataStore,
  type StorageAdapter,
  type CacheStrategy,
  type UnifiedDataStoreConfig
} from './UnifiedDataStore';

export {
  BlobStore,
  getBlobStore,
  resetBlobStore,
  type BlobMetadata,
  type BlobStoreConfig
} from './BlobStore';

export {
  SearchEngine,
  getSearchEngine,
  resetSearchEngine,
  type SearchIndex,
  type SearchResult,
  type SearchOptions
} from './SearchEngine';

export {
  EncryptionService,
  SecureStorage,
  getEncryptionService,
  getSecureStorage,
  resetEncryption,
  type EncryptionKey,
  type EncryptedData
} from './Encryption';

export {
  SyncEngine,
  getSyncEngine,
  resetSyncEngine,
  type ConflictResolutionStrategy,
  type SyncRecord,
  type ConflictInfo,
  type SyncResult
} from './SyncEngine';

export {
  ImportExportService,
  getImportExportService,
  resetImportExportService,
  type ExportOptions,
  type ImportOptions,
  type ExportMetadata,
  type ExportData
} from './ImportExport';

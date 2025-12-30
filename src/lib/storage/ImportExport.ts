import { getIndexedDB, IndexedDBStore } from '../indexedDBStore';
import { getBlobStore } from './BlobStore';
import { logger } from '../logger';

export interface ExportOptions {
  stores?: string[];
  includeBlobs?: boolean;
  format?: 'json' | 'csv';
  compress?: boolean;
}

export interface ImportOptions {
  overwrite?: boolean;
  merge?: boolean;
  validate?: boolean;
}

export interface ExportMetadata {
  exportedAt: string;
  version: string;
  stores: string[];
  totalRecords: number;
  includesBlobs: boolean;
}

export interface ExportData {
  metadata: ExportMetadata;
  data: Record<string, any[]>;
  blobs?: Record<string, { data: string; metadata: any }>;
}

export class ImportExportService {
  private db: IndexedDBStore | null = null;

  private async ensureDB(): Promise<IndexedDBStore> {
    if (!this.db) {
      this.db = await getIndexedDB();
    }
    return this.db;
  }

  async exportData(options: ExportOptions = {}): Promise<ExportData> {
    const db = await this.ensureDB();
    const blobStore = getBlobStore();

    const allStores = [
      'users', 'businesses', 'business_memberships', 'products',
      'orders', 'order_items', 'inventory', 'driver_profiles',
      'driver_zones', 'driver_inventory', 'zones', 'posts',
      'post_media', 'post_likes', 'post_comments', 'user_follows',
      'shopping_carts', 'cart_items'
    ];

    const storesToExport = options.stores || allStores;
    const data: Record<string, any[]> = {};
    let totalRecords = 0;

    for (const storeName of storesToExport) {
      try {
        const records = await db.getAll<any>(storeName);
        data[storeName] = records;
        totalRecords += records.length;
        logger.info(`[ImportExport] Exported ${records.length} records from ${storeName}`);
      } catch (error) {
        logger.warn(`[ImportExport] Failed to export ${storeName}`, error);
        data[storeName] = [];
      }
    }

    const exportData: ExportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        stores: storesToExport,
        totalRecords,
        includesBlobs: options.includeBlobs || false
      },
      data
    };

    if (options.includeBlobs) {
      const blobs: Record<string, { data: string; metadata: any }> = {};
      const blobMetadataList = await blobStore.list();

      for (const metadata of blobMetadataList) {
        const blob = await blobStore.get(metadata.id);
        if (blob) {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          blobs[metadata.id] = {
            data: base64,
            metadata
          };
        }
      }

      exportData.blobs = blobs;
      logger.info(`[ImportExport] Exported ${Object.keys(blobs).length} blobs`);
    }

    return exportData;
  }

  async exportToJSON(options: ExportOptions = {}): Promise<string> {
    const data = await this.exportData(options);
    return JSON.stringify(data, null, 2);
  }

  async exportToFile(filename: string, options: ExportOptions = {}): Promise<void> {
    const json = await this.exportToJSON(options);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `export_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logger.info('[ImportExport] Exported to file', { filename });
  }

  async importData(exportData: ExportData, options: ImportOptions = {}): Promise<{
    imported: number;
    skipped: number;
    errors: Array<{ store: string; error: string }>;
  }> {
    const db = await this.ensureDB();
    const blobStore = getBlobStore();

    const result = {
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ store: string; error: string }>
    };

    for (const [storeName, records] of Object.entries(exportData.data)) {
      try {
        for (const record of records) {
          try {
            if (options.overwrite) {
              await db.put(storeName, record);
              result.imported++;
            } else if (options.merge) {
              const existing = await db.get(storeName, record.id);
              if (existing) {
                const merged = { ...existing, ...record };
                await db.put(storeName, merged);
                result.imported++;
              } else {
                await db.put(storeName, record);
                result.imported++;
              }
            } else {
              const existing = await db.get(storeName, record.id);
              if (!existing) {
                await db.put(storeName, record);
                result.imported++;
              } else {
                result.skipped++;
              }
            }
          } catch (error) {
            result.errors.push({
              store: storeName,
              error: (error as Error).message
            });
          }
        }

        logger.info(`[ImportExport] Imported ${records.length} records to ${storeName}`);
      } catch (error) {
        result.errors.push({
          store: storeName,
          error: (error as Error).message
        });
      }
    }

    if (exportData.blobs) {
      for (const [blobId, blobData] of Object.entries(exportData.blobs)) {
        try {
          const base64Response = await fetch(blobData.data);
          const blob = await base64Response.blob();
          await blobStore.store(blob, blobData.metadata.filename);
          result.imported++;
        } catch (error) {
          result.errors.push({
            store: 'blobs',
            error: `Failed to import blob ${blobId}: ${(error as Error).message}`
          });
        }
      }
    }

    logger.info('[ImportExport] Import completed', result);
    return result;
  }

  async importFromJSON(json: string, options: ImportOptions = {}): Promise<ReturnType<ImportExportService['importData']>> {
    const exportData: ExportData = JSON.parse(json);
    return await this.importData(exportData, options);
  }

  async importFromFile(file: File, options: ImportOptions = {}): Promise<ReturnType<ImportExportService['importData']>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const json = e.target?.result as string;
          const result = await this.importFromJSON(json, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  async exportToCSV(storeName: string): Promise<string> {
    const db = await this.ensureDB();
    const records = await db.getAll<any>(storeName);

    if (records.length === 0) {
      return '';
    }

    const headers = Object.keys(records[0]);
    const csvRows = [headers.join(',')];

    for (const record of records) {
      const values = headers.map((header) => {
        const value = record[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        const stringValue = String(value);
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  async exportCSVToFile(storeName: string, filename?: string): Promise<void> {
    const csv = await this.exportToCSV(storeName);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${storeName}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logger.info('[ImportExport] Exported CSV to file', { storeName, filename });
  }

  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    const stores = [
      'users', 'businesses', 'business_memberships', 'products',
      'orders', 'order_items', 'inventory', 'driver_profiles',
      'driver_zones', 'driver_inventory', 'zones', 'posts',
      'post_media', 'post_likes', 'post_comments', 'user_follows',
      'shopping_carts', 'cart_items', 'blobs', 'blob_metadata',
      'key_value_store', 'search_index', 'sync_log', 'sync_conflicts'
    ];

    for (const store of stores) {
      try {
        await db.clear(store);
      } catch (error) {
        logger.warn(`[ImportExport] Failed to clear ${store}`, error);
      }
    }

    localStorage.clear();
    logger.info('[ImportExport] Cleared all data');
  }

  async getStorageStats(): Promise<{
    stores: Record<string, number>;
    total: number;
    blobCount: number;
    blobSize: number;
  }> {
    const db = await this.ensureDB();
    const blobStore = getBlobStore();

    const stores: Record<string, number> = {};
    let total = 0;

    const storeNames = [
      'users', 'businesses', 'business_memberships', 'products',
      'orders', 'order_items', 'inventory', 'driver_profiles',
      'driver_zones', 'driver_inventory', 'zones', 'posts',
      'post_media', 'post_likes', 'post_comments', 'user_follows',
      'shopping_carts', 'cart_items'
    ];

    for (const storeName of storeNames) {
      try {
        const count = await db.count(storeName);
        stores[storeName] = count;
        total += count;
      } catch (error) {
        stores[storeName] = 0;
      }
    }

    const blobMetadata = await blobStore.list();
    const blobCount = blobMetadata.length;
    const blobSize = await blobStore.getTotalSize();

    return {
      stores,
      total,
      blobCount,
      blobSize
    };
  }
}

let globalImportExportService: ImportExportService | null = null;

export function getImportExportService(): ImportExportService {
  if (!globalImportExportService) {
    globalImportExportService = new ImportExportService();
  }
  return globalImportExportService;
}

export function resetImportExportService(): void {
  globalImportExportService = null;
}

logger.info('[ImportExport] Module loaded');

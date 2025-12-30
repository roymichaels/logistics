import { getIndexedDB, IndexedDBStore } from '../indexedDBStore';
import { logger } from '../logger';

export interface BlobMetadata {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  compressedSize?: number;
  uploadedAt: string;
  lastAccessed: string;
  url?: string;
  thumbnail?: string;
}

export interface BlobStoreConfig {
  maxSize?: number;
  enableCompression?: boolean;
  compressionQuality?: number;
  generateThumbnails?: boolean;
  thumbnailSize?: number;
}

export class BlobStore {
  private db: IndexedDBStore | null = null;
  private config: Required<BlobStoreConfig>;
  private blobURLCache: Map<string, string> = new Map();
  private readonly BLOB_STORE = 'blobs';
  private readonly METADATA_STORE = 'blob_metadata';

  constructor(config: BlobStoreConfig = {}) {
    this.config = {
      maxSize: config.maxSize || 10 * 1024 * 1024,
      enableCompression: config.enableCompression !== false,
      compressionQuality: config.compressionQuality || 0.8,
      generateThumbnails: config.generateThumbnails !== false,
      thumbnailSize: config.thumbnailSize || 200
    };
  }

  private async ensureDB(): Promise<IndexedDBStore> {
    if (!this.db) {
      this.db = await getIndexedDB();
    }
    return this.db;
  }

  private async compressImage(
    blob: Blob,
    quality: number = this.config.compressionQuality
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(blob);
        return;
      }

      const url = URL.createObjectURL(blob);

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (compressedBlob) => {
            URL.revokeObjectURL(url);
            if (compressedBlob && compressedBlob.size < blob.size) {
              resolve(compressedBlob);
            } else {
              resolve(blob);
            }
          },
          blob.type || 'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for compression'));
      };

      img.src = url;
    });
  }

  private async generateThumbnail(blob: Blob, size: number = this.config.thumbnailSize): Promise<Blob | null> {
    if (!blob.type.startsWith('image/')) {
      return null;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      const url = URL.createObjectURL(blob);

      img.onload = () => {
        const aspectRatio = img.width / img.height;
        let width = size;
        let height = size;

        if (aspectRatio > 1) {
          height = size / aspectRatio;
        } else {
          width = size * aspectRatio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (thumbnailBlob) => {
            URL.revokeObjectURL(url);
            resolve(thumbnailBlob);
          },
          'image/jpeg',
          0.7
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    });
  }

  async store(
    file: File | Blob,
    filename?: string,
    options?: { compress?: boolean; generateThumbnail?: boolean }
  ): Promise<string> {
    const db = await this.ensureDB();

    let processedBlob = file;
    let thumbnailBlob: Blob | null = null;

    if (file.size > this.config.maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.config.maxSize} bytes`);
    }

    const shouldCompress = options?.compress !== false && this.config.enableCompression && file.type.startsWith('image/');

    if (shouldCompress) {
      try {
        processedBlob = await this.compressImage(file);
        logger.info('[BlobStore] Compressed image', {
          original: file.size,
          compressed: processedBlob.size,
          savings: ((1 - processedBlob.size / file.size) * 100).toFixed(2) + '%'
        });
      } catch (error) {
        logger.warn('[BlobStore] Compression failed, using original', error);
        processedBlob = file;
      }
    }

    const shouldGenerateThumbnail = options?.generateThumbnail !== false && this.config.generateThumbnails;

    if (shouldGenerateThumbnail && file.type.startsWith('image/')) {
      try {
        thumbnailBlob = await this.generateThumbnail(file);
      } catch (error) {
        logger.warn('[BlobStore] Thumbnail generation failed', error);
      }
    }

    const id = `blob_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    const metadata: BlobMetadata = {
      id,
      filename: filename || (file instanceof File ? file.name : 'unnamed'),
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      compressedSize: shouldCompress ? processedBlob.size : undefined,
      uploadedAt: now,
      lastAccessed: now
    };

    await db.put(this.BLOB_STORE, {
      id,
      data: processedBlob,
      thumbnail: thumbnailBlob
    });

    await db.put(this.METADATA_STORE, metadata);

    logger.info('[BlobStore] Stored blob:', id);
    return id;
  }

  async get(id: string): Promise<Blob | null> {
    const db = await this.ensureDB();

    try {
      const result = await db.get<{ id: string; data: Blob }>(this.BLOB_STORE, id);
      if (result) {
        await this.updateLastAccessed(id);
        return result.data;
      }
      return null;
    } catch (error) {
      logger.error('[BlobStore] Error retrieving blob', error as Error, { id });
      return null;
    }
  }

  async getURL(id: string, options?: { useThumbnail?: boolean }): Promise<string | null> {
    const cacheKey = options?.useThumbnail ? `${id}_thumb` : id;

    if (this.blobURLCache.has(cacheKey)) {
      return this.blobURLCache.get(cacheKey)!;
    }

    const db = await this.ensureDB();

    try {
      const result = await db.get<{ id: string; data: Blob; thumbnail?: Blob }>(this.BLOB_STORE, id);

      if (!result) {
        return null;
      }

      const blob = options?.useThumbnail && result.thumbnail ? result.thumbnail : result.data;
      const url = URL.createObjectURL(blob);
      this.blobURLCache.set(cacheKey, url);

      await this.updateLastAccessed(id);
      return url;
    } catch (error) {
      logger.error('[BlobStore] Error generating URL', error as Error, { id });
      return null;
    }
  }

  async getMetadata(id: string): Promise<BlobMetadata | null> {
    const db = await this.ensureDB();

    try {
      return await db.get<BlobMetadata>(this.METADATA_STORE, id);
    } catch (error) {
      logger.error('[BlobStore] Error retrieving metadata', error as Error, { id });
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    const db = await this.ensureDB();

    const url = this.blobURLCache.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      this.blobURLCache.delete(id);
    }

    const thumbUrl = this.blobURLCache.get(`${id}_thumb`);
    if (thumbUrl) {
      URL.revokeObjectURL(thumbUrl);
      this.blobURLCache.delete(`${id}_thumb`);
    }

    await db.delete(this.BLOB_STORE, id);
    await db.delete(this.METADATA_STORE, id);

    logger.info('[BlobStore] Deleted blob:', id);
  }

  async list(): Promise<BlobMetadata[]> {
    const db = await this.ensureDB();

    try {
      return await db.getAll<BlobMetadata>(this.METADATA_STORE);
    } catch (error) {
      logger.error('[BlobStore] Error listing blobs', error as Error);
      return [];
    }
  }

  async cleanup(olderThanDays: number = 30): Promise<number> {
    const db = await this.ensureDB();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const allMetadata = await this.list();
    let deletedCount = 0;

    for (const metadata of allMetadata) {
      const lastAccessed = new Date(metadata.lastAccessed);
      if (lastAccessed < cutoffDate) {
        await this.delete(metadata.id);
        deletedCount++;
      }
    }

    logger.info(`[BlobStore] Cleanup completed: ${deletedCount} blobs removed`);
    return deletedCount;
  }

  async getTotalSize(): Promise<number> {
    const allMetadata = await this.list();
    return allMetadata.reduce((total, meta) => total + (meta.compressedSize || meta.size), 0);
  }

  private async updateLastAccessed(id: string): Promise<void> {
    const db = await this.ensureDB();
    const metadata = await this.getMetadata(id);

    if (metadata) {
      metadata.lastAccessed = new Date().toISOString();
      await db.put(this.METADATA_STORE, metadata);
    }
  }

  revokeAllURLs(): void {
    for (const url of this.blobURLCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.blobURLCache.clear();
    logger.info('[BlobStore] Revoked all cached URLs');
  }
}

let globalBlobStore: BlobStore | null = null;

export function getBlobStore(config?: BlobStoreConfig): BlobStore {
  if (!globalBlobStore) {
    globalBlobStore = new BlobStore(config);
  }
  return globalBlobStore;
}

export function resetBlobStore(): void {
  if (globalBlobStore) {
    globalBlobStore.revokeAllURLs();
  }
  globalBlobStore = null;
}

logger.info('[BlobStore] Module loaded');

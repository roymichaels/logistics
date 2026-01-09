import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  path: string;
  publicUrl: string;
}

export class SupabaseStorageService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  private readonly BUCKETS = {
    businessLogos: 'business-logos',
    businessBanners: 'business-banners',
    productImages: 'product-images',
    userAvatars: 'user-avatars',
  };

  constructor() {
    logger.info('[SupabaseStorage] Initialized');
  }

  /**
   * Upload business logo (512x512 recommended)
   */
  async uploadBusinessLogo(
    businessId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    logger.info('[SupabaseStorage] Uploading business logo', { businessId, fileName: file.name });

    this.validateImageFile(file);
    const compressedFile = await this.compressImage(file, 512, 512, 0.9);

    const filePath = `${businessId}/${Date.now()}-${this.sanitizeFileName(file.name)}`;
    return this.uploadFile(this.BUCKETS.businessLogos, filePath, compressedFile, onProgress);
  }

  /**
   * Upload business banner (1920x600 recommended)
   */
  async uploadBusinessBanner(
    businessId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    logger.info('[SupabaseStorage] Uploading business banner', { businessId, fileName: file.name });

    this.validateImageFile(file);
    const compressedFile = await this.compressImage(file, 1920, 600, 0.85);

    const filePath = `${businessId}/${Date.now()}-${this.sanitizeFileName(file.name)}`;
    return this.uploadFile(this.BUCKETS.businessBanners, filePath, compressedFile, onProgress);
  }

  /**
   * Upload product image (800x800 recommended)
   */
  async uploadProductImage(
    businessId: string,
    productId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    logger.info('[SupabaseStorage] Uploading product image', { businessId, productId, fileName: file.name });

    this.validateImageFile(file);
    const compressedFile = await this.compressImage(file, 800, 800, 0.85);

    const filePath = `${businessId}/${productId}/${Date.now()}-${this.sanitizeFileName(file.name)}`;
    return this.uploadFile(this.BUCKETS.productImages, filePath, compressedFile, onProgress);
  }

  /**
   * Upload user avatar (256x256 recommended)
   */
  async uploadUserAvatar(
    userId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    logger.info('[SupabaseStorage] Uploading user avatar', { userId, fileName: file.name });

    this.validateImageFile(file);
    const compressedFile = await this.compressImage(file, 256, 256, 0.9);

    const filePath = `${userId}/${Date.now()}-avatar.jpg`;
    return this.uploadFile(this.BUCKETS.userAvatars, filePath, compressedFile, onProgress);
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    logger.info('[SupabaseStorage] Deleting file', { bucket, path });

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      logger.error('[SupabaseStorage] Failed to delete file', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    logger.info('[SupabaseStorage] File deleted successfully');
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Core upload function
   */
  private async uploadFile(
    bucket: string,
    path: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Delete old file if exists
      await supabase.storage.from(bucket).remove([path]);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        logger.error('[SupabaseStorage] Upload failed', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      const publicUrl = this.getPublicUrl(bucket, path);

      logger.info('[SupabaseStorage] Upload successful', { path, publicUrl });

      // Simulate progress for now (Supabase SDK doesn't support progress callbacks yet)
      if (onProgress) {
        onProgress({ loaded: file.size, total: file.size, percentage: 100 });
      }

      return {
        url: data.path,
        path: data.path,
        publicUrl,
      };
    } catch (error) {
      logger.error('[SupabaseStorage] Upload error', error);
      throw error;
    }
  }

  /**
   * Compress and resize image
   */
  private async compressImage(
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  }

  /**
   * Validate image file
   */
  private validateImageFile(file: File): void {
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Invalid image type. Allowed: JPEG, PNG, GIF, WebP');
    }
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
  }

  /**
   * Sanitize file name for storage
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-');
  }
}

// Export singleton instance
export const storageService = new SupabaseStorageService();

import type { SupabaseClient } from '../lib/supabaseTypes';
import type { MediaType } from '../data/types';

export class MediaUploadService {
  private readonly BUCKET_NAME = 'social-media';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  private readonly ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

  constructor(private supabase: SupabaseClient) {
    this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    const { data: buckets } = await this.supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === this.BUCKET_NAME);

    if (!bucketExists) {
      await this.supabase.storage.createBucket(this.BUCKET_NAME, {
        public: true,
        fileSizeLimit: this.MAX_FILE_SIZE,
        allowedMimeTypes: [...this.ALLOWED_IMAGE_TYPES, ...this.ALLOWED_VIDEO_TYPES]
      });
    }
  }

  async uploadImage(file: File): Promise<{ url: string; type: MediaType }> {
    this.validateImageFile(file);
    return this.uploadFile(file, 'image');
  }

  async uploadVideo(file: File): Promise<{ url: string; type: MediaType; thumbnail?: string }> {
    this.validateVideoFile(file);
    const result = await this.uploadFile(file, 'video');

    const thumbnail = await this.generateVideoThumbnail(file);
    if (thumbnail) {
      const thumbnailResult = await this.uploadFile(thumbnail, 'image');
      return { ...result, thumbnail: thumbnailResult.url };
    }

    return result;
  }

  async uploadMultiple(files: File[]): Promise<Array<{ url: string; type: MediaType; thumbnail?: string }>> {
    const uploads = files.map(async (file) => {
      if (this.isImageFile(file)) {
        return this.uploadImage(file);
      } else if (this.isVideoFile(file)) {
        return this.uploadVideo(file);
      }
      throw new Error(`Unsupported file type: ${file.type}`);
    });

    return Promise.all(uploads);
  }

  private async uploadFile(file: File, mediaType: MediaType): Promise<{ url: string; type: MediaType }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = this.supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(data.path);

    return { url: publicUrl, type: mediaType };
  }

  async deleteMedia(url: string): Promise<void> {
    const path = this.extractPathFromUrl(url);
    if (!path) return;

    const { error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .remove([path]);

    if (error) throw error;
  }

  private validateImageFile(file: File): void {
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Invalid image type. Allowed: JPEG, PNG, GIF, WebP');
    }
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
  }

  private validateVideoFile(file: File): void {
    if (!this.ALLOWED_VIDEO_TYPES.includes(file.type)) {
      throw new Error('Invalid video type. Allowed: MP4, WebM, MOV');
    }
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
  }

  private isImageFile(file: File): boolean {
    return this.ALLOWED_IMAGE_TYPES.includes(file.type);
  }

  private isVideoFile(file: File): boolean {
    return this.ALLOWED_VIDEO_TYPES.includes(file.type);
  }

  private extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
      return pathMatch ? pathMatch[1] : null;
    } catch {
      return null;
    }
  }

  private async generateVideoThumbnail(videoFile: File): Promise<File | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 2);
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const thumbnailFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
            resolve(thumbnailFile);
          } else {
            resolve(null);
          }
          URL.revokeObjectURL(video.src);
        }, 'image/jpeg', 0.8);
      };

      video.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(videoFile);
    });
  }

  async compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
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
}

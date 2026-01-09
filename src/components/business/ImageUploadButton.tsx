import React, { useState, useRef } from 'react';
import { tokens } from '../../styles/tokens';
import { storageService, UploadProgress } from '../../services/supabaseStorage';
import { logger } from '../../lib/logger';

interface ImageUploadButtonProps {
  businessId: string;
  currentImageUrl?: string;
  uploadType: 'logo' | 'banner';
  onUploadComplete: (publicUrl: string) => void;
  disabled?: boolean;
}

export function ImageUploadButton({
  businessId,
  currentImageUrl,
  uploadType,
  onUploadComplete,
  disabled = false,
}: ImageUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Start upload
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      logger.info('[ImageUpload] Starting upload', { uploadType, fileName: file.name });

      const onProgress = (progress: UploadProgress) => {
        setUploadProgress(progress.percentage);
      };

      let result;
      if (uploadType === 'logo') {
        result = await storageService.uploadBusinessLogo(businessId, file, onProgress);
      } else {
        result = await storageService.uploadBusinessBanner(businessId, file, onProgress);
      }

      logger.info('[ImageUpload] Upload complete', { publicUrl: result.publicUrl });
      onUploadComplete(result.publicUrl);
      setPreviewUrl(null);
    } catch (err) {
      logger.error('[ImageUpload] Upload failed', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const dimensions = uploadType === 'logo' ? '512x512' : '1920x600';
  const label = uploadType === 'logo' ? 'Upload Logo' : 'Upload Banner';

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />

      <button
        onClick={handleClick}
        disabled={disabled || isUploading}
        style={{
          padding: '12px 24px',
          backgroundColor: isUploading ? tokens.colors.bg : tokens.colors.primary,
          color: isUploading ? tokens.colors.subtle : '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          opacity: disabled ? 0.5 : 1,
          position: 'relative',
          overflow: 'hidden',
          minWidth: '150px',
        }}
      >
        {isUploading ? (
          <>
            <span>Uploading... {uploadProgress}%</span>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '3px',
                width: `${uploadProgress}%`,
                backgroundColor: tokens.colors.primary,
                transition: 'width 0.3s ease',
              }}
            />
          </>
        ) : (
          <>📤 {label}</>
        )}
      </button>

      {!isUploading && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '11px',
            color: tokens.colors.subtle,
          }}
        >
          Recommended: {dimensions}, Max: 10MB
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: `${tokens.colors.error}20`,
            border: `1px solid ${tokens.colors.error}`,
            borderRadius: '6px',
            fontSize: '12px',
            color: tokens.colors.error,
          }}
        >
          {error}
        </div>
      )}

      {previewUrl && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: tokens.colors.bg,
            borderRadius: '8px',
            border: `1px solid ${tokens.colors.border.default}`,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: tokens.colors.subtle,
              marginBottom: '8px',
            }}
          >
            Preview:
          </div>
          <img
            src={previewUrl}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: uploadType === 'logo' ? '200px' : '150px',
              borderRadius: '6px',
              objectFit: 'contain',
            }}
          />
        </div>
      )}
    </div>
  );
}

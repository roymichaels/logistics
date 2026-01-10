import React, { useState, useRef, useCallback } from 'react';
import { logger } from '../../lib/logger';

interface ImageUploadZoneProps {
  onImageSelect: (file: File) => void;
  onUploadComplete?: (url: string) => void;
  currentImageUrl?: string | null;
  uploadType: 'product' | 'business-logo' | 'business-banner' | 'user-avatar';
  maxSizeMB?: number;
  aspectRatio?: '1:1' | '16:9' | '4:3';
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

const ASPECT_RATIO_DIMENSIONS = {
  '1:1': { width: 400, height: 400, description: 'Square (1:1)' },
  '16:9': { width: 1920, height: 1080, description: 'Wide (16:9)' },
  '4:3': { width: 800, height: 600, description: 'Standard (4:3)' }
};

const UPLOAD_TYPE_CONFIG = {
  'product': { maxSizeMB: 5, acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'], aspectRatio: '1:1' as const },
  'business-logo': { maxSizeMB: 2, acceptedFormats: ['image/png', 'image/jpeg', 'image/webp'], aspectRatio: '1:1' as const },
  'business-banner': { maxSizeMB: 5, acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'], aspectRatio: '16:9' as const },
  'user-avatar': { maxSizeMB: 1, acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'], aspectRatio: '1:1' as const }
};

export function ImageUploadZone({
  onImageSelect,
  onUploadComplete,
  currentImageUrl,
  uploadType,
  maxSizeMB,
  aspectRatio,
  label,
  helperText,
  disabled = false
}: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = UPLOAD_TYPE_CONFIG[uploadType];
  const finalMaxSizeMB = maxSizeMB || config.maxSizeMB;
  const finalAspectRatio = aspectRatio || config.aspectRatio;
  const dimensions = ASPECT_RATIO_DIMENSIONS[finalAspectRatio];

  const validateFile = (file: File): string | null => {
    if (!config.acceptedFormats.includes(file.type)) {
      return `Please upload an image file (${config.acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')})`;
    }

    const maxBytes = finalMaxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File size must be less than ${finalMaxSizeMB}MB`;
    }

    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      logger.warn('Image validation failed', { error: validationError, fileName: file.name });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onImageSelect(file);

    logger.info('Image selected for upload', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadType
    });
  }, [onImageSelect, uploadType, finalMaxSizeMB]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile, disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="image-upload-zone-container">
      {label && (
        <label className="image-upload-label">
          {label}
        </label>
      )}

      <div
        className={`image-upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${error ? 'error' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Upload ${uploadType} image`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={config.acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          className="image-upload-input"
          disabled={disabled}
          aria-hidden="true"
        />

        {preview ? (
          <div className="image-preview-container">
            <img
              src={preview}
              alt="Preview"
              className="image-preview"
              loading="lazy"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="image-remove-btn"
                aria-label="Remove image"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
            {isUploading && (
              <div className="upload-overlay">
                <div className="upload-spinner"></div>
                <span>Uploading...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="upload-placeholder">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="upload-icon">
              <path d="M24 14V34M14 24H34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
            </svg>
            <p className="upload-text">
              {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
            </p>
            <p className="upload-hint">
              {dimensions.description} • Max {finalMaxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {helperText && !error && (
        <p className="helper-text">{helperText}</p>
      )}

      {error && (
        <p className="error-text" role="alert">{error}</p>
      )}

      <style>{`
        .image-upload-zone-container {
          width: 100%;
        }

        .image-upload-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
          color: var(--text-primary, #1a1a1a);
        }

        .image-upload-zone {
          position: relative;
          width: 100%;
          min-height: 200px;
          border: 2px dashed var(--border-color, #d1d5db);
          border-radius: 8px;
          background-color: var(--bg-surface, #ffffff);
          cursor: pointer;
          transition: all 0.2s ease;
          overflow: hidden;
        }

        .image-upload-zone:hover:not(.disabled) {
          border-color: var(--primary-color, #3b82f6);
          background-color: var(--bg-hover, #f9fafb);
        }

        .image-upload-zone:focus-visible {
          outline: 2px solid var(--primary-color, #3b82f6);
          outline-offset: 2px;
        }

        .image-upload-zone.dragging {
          border-color: var(--primary-color, #3b82f6);
          background-color: var(--primary-bg, #eff6ff);
        }

        .image-upload-zone.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .image-upload-zone.error {
          border-color: var(--error-color, #ef4444);
        }

        .image-upload-input {
          display: none;
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          min-height: 200px;
        }

        .upload-icon {
          color: var(--text-tertiary, #9ca3af);
          margin-bottom: 16px;
        }

        .upload-text {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary, #4b5563);
          margin: 0 0 4px 0;
        }

        .upload-hint {
          font-size: 12px;
          color: var(--text-tertiary, #9ca3af);
          margin: 0;
        }

        .image-preview-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 200px;
        }

        .image-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .image-remove-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, 0.6);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease;
        }

        .image-remove-btn:hover {
          background-color: rgba(0, 0, 0, 0.8);
        }

        .image-remove-btn:focus-visible {
          outline: 2px solid white;
          outline-offset: 2px;
        }

        .upload-overlay {
          position: absolute;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .upload-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .helper-text {
          margin: 8px 0 0 0;
          font-size: 12px;
          color: var(--text-tertiary, #9ca3af);
        }

        .error-text {
          margin: 8px 0 0 0;
          font-size: 12px;
          color: var(--error-color, #ef4444);
        }
      `}</style>
    </div>
  );
}

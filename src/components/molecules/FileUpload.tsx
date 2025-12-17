import React, { useRef, useState } from 'react';
import { colors, spacing, shadows } from '../../design-system';
import { Button } from '../atoms/Button';

export interface FileUploadProps {
  value: File | File[] | null;
  onChange: (files: File | File[] | null) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  showPreview?: boolean;
}

export function FileUpload({
  value,
  onChange,
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 5,
  disabled = false,
  error,
  label,
  required = false,
  showPreview = true,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const files = value ? (Array.isArray(value) ? value : [value]) : [];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFiles = (fileList: FileList): string | null => {
    const fileArray = Array.from(fileList);

    if (multiple && maxFiles && fileArray.length > maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    for (const file of fileArray) {
      if (maxSize && file.size > maxSize) {
        return `File "${file.name}" exceeds maximum size of ${formatFileSize(maxSize)}`;
      }

      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const fileType = file.type;
        const fileExtension = '.' + file.name.split('.').pop();

        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith('.')) {
            return fileExtension === type;
          }
          if (type.endsWith('/*')) {
            return fileType.startsWith(type.replace('/*', ''));
          }
          return fileType === type;
        });

        if (!isAccepted) {
          return `File "${file.name}" is not an accepted file type`;
        }
      }
    }

    return null;
  };

  const handleFiles = (fileList: FileList) => {
    setValidationError(null);

    const validationErr = validateFiles(fileList);
    if (validationErr) {
      setValidationError(validationErr);
      return;
    }

    const fileArray = Array.from(fileList);
    if (multiple) {
      onChange(fileArray);
    } else {
      onChange(fileArray[0] || null);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    if (multiple) {
      const newFiles = files.filter((_, i) => i !== index);
      onChange(newFiles.length > 0 ? newFiles : null);
    } else {
      onChange(null);
    }
  };

  const getFileIcon = (file: File): string => {
    const type = file.type;
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📎';
  };

  const displayError = validationError || error;

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: spacing[1],
            fontSize: '14px',
            fontWeight: 500,
            color: colors.text.primary,
          }}
        >
          {label}
          {required && <span style={{ color: colors.status.error, marginLeft: '4px' }}>*</span>}
        </label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          padding: spacing[4],
          border: `2px dashed ${
            isDragging
              ? colors.brand.primary
              : displayError
              ? colors.status.error
              : colors.border.primary
          }`,
          borderRadius: '8px',
          backgroundColor: isDragging
            ? colors.brand.faded
            : disabled
            ? colors.background.tertiary
            : colors.background.secondary,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 200ms ease-in-out',
          opacity: disabled ? 0.5 : 1,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '32px',
            marginBottom: spacing[2],
          }}
        >
          📤
        </div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: colors.text.primary,
            marginBottom: spacing[1],
          }}
        >
          {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: colors.text.tertiary,
          }}
        >
          {accept && `Accepted: ${accept}`}
          {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
          {multiple && maxFiles && ` • Max files: ${maxFiles}`}
        </div>
      </div>

      {displayError && (
        <div
          style={{
            marginTop: spacing[1],
            fontSize: '12px',
            color: colors.status.error,
          }}
        >
          {displayError}
        </div>
      )}

      {showPreview && files.length > 0 && (
        <div
          style={{
            marginTop: spacing[3],
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[2],
          }}
        >
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                padding: spacing[2],
                backgroundColor: colors.background.secondary,
                borderRadius: '6px',
                border: `1px solid ${colors.border.primary}`,
              }}
            >
              <div style={{ fontSize: '24px', flexShrink: 0 }}>{getFileIcon(file)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: colors.text.primary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file.name}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: colors.text.tertiary,
                  }}
                >
                  {formatFileSize(file.size)}
                </div>
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

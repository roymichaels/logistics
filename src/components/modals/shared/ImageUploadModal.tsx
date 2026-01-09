import React, { useState, useRef, useCallback } from 'react';
import { BaseModal } from '../BaseModal';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadModalProps {
  title?: string;
  currentImages?: string[];
  maxImages?: number;
  maxSizeMB?: number;
  aspectRatio?: number;
  onSave: (files: File[]) => Promise<void>;
  onClose: () => void;
  recommendedSize?: string;
}

export function ImageUploadModal({
  title = 'Upload Images',
  currentImages = [],
  maxImages = 5,
  maxSizeMB = 10,
  aspectRatio,
  onSave,
  onClose,
  recommendedSize = '1200x800px',
}: ImageUploadModalProps) {
  const [previews, setPreviews] = useState<string[]>(currentImages);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'File must be an image';
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `Image must be less than ${maxSizeMB}MB`;
    }

    return null;
  };

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(newFiles);

    if (previews.length + fileArray.length > maxImages) {
      setError(`You can only upload up to ${maxImages} images`);
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    fileArray.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      validFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          if (newPreviews.length === validFiles.length) {
            setPreviews(prev => [...prev, ...newPreviews]);
            setFiles(prev => [...prev, ...validFiles]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }, [previews.length, maxImages, maxSizeMB]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleRemove = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (files.length === 0) {
      setError('Please select at least one image');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(files);
      onClose();
    } catch (error) {
      console.error('Failed to upload images:', error);
      setError('Failed to upload images. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseModal
      title={title}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={files.length === 0 || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Uploading...' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${previews.length >= maxImages ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
          onClick={() => previews.length < maxImages && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Upload size={24} className="text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Drop images here or click to browse
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {maxImages - previews.length} of {maxImages} images remaining • Max {maxSizeMB}MB each
              </p>
              {recommendedSize && (
                <p className="text-xs text-gray-500">
                  Recommended: {recommendedSize}
                </p>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={maxImages > 1}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {previews.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Selected Images ({previews.length})
            </p>
            <div className="grid grid-cols-3 gap-3">
              {previews.map((preview, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group"
                >
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  >
                    <X size={16} />
                  </button>
                  {index === 0 && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                      Primary
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              The first image will be used as the primary image. Drag to reorder (coming soon).
            </p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <ImageIcon size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Image Guidelines
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Use high-quality images with good lighting</li>
                <li>• Show your product/business clearly</li>
                <li>• Avoid blurry or low-resolution images</li>
                <li>• First image is most important</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

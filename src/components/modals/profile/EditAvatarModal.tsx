import React, { useState, useRef } from 'react';
import { BaseModal } from '../BaseModal';
import { Upload, Camera } from 'lucide-react';

interface EditAvatarModalProps {
  currentAvatar?: string;
  onSave: (file: File) => Promise<void>;
  onClose: () => void;
}

export function EditAvatarModal({
  currentAvatar,
  onSave,
  onClose,
}: EditAvatarModalProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      await onSave(selectedFile);
      onClose();
    } catch (error) {
      console.error('Failed to save avatar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseModal
      title="Change Profile Photo"
      onClose={onClose}
      size="md"
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
            disabled={!selectedFile || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col items-center">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Avatar preview"
                className="w-40 h-40 rounded-full object-cover border-4 border-gray-200"
              />
            </div>
          ) : (
            <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center">
              <Camera size={48} className="text-gray-400" />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={20} />
            Choose Photo
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <p className="text-sm text-gray-500 text-center">
            Recommended: Square image, at least 400x400px
          </p>
        </div>
      </div>
    </BaseModal>
  );
}

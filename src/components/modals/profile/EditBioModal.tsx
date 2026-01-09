import React, { useState } from 'react';
import { BaseModal } from '../BaseModal';

interface EditBioModalProps {
  currentBio?: string;
  currentDisplayName?: string;
  currentUsername?: string;
  onSave: (data: {
    bio?: string;
    displayName?: string;
    username?: string;
  }) => Promise<void>;
  onClose: () => void;
  maxBioLength?: number;
}

export function EditBioModal({
  currentBio = '',
  currentDisplayName = '',
  currentUsername = '',
  onSave,
  onClose,
  maxBioLength = 150,
}: EditBioModalProps) {
  const [bio, setBio] = useState(currentBio);
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [username, setUsername] = useState(currentUsername);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const validateUsername = (value: string) => {
    if (!value) {
      setUsernameError('Username is required');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return false;
    }
    if (value.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return false;
    }
    setUsernameError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validateUsername(username)) return;

    setIsLoading(true);
    try {
      await onSave({
        bio,
        displayName,
        username,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges =
    bio !== currentBio ||
    displayName !== currentDisplayName ||
    username !== currentUsername;

  return (
    <BaseModal
      title="Edit Profile"
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
            disabled={!hasChanges || isLoading || !!usernameError}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                validateUsername(e.target.value);
              }}
              className={`
                flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${usernameError ? 'border-red-500' : 'border-gray-300'}
              `}
              placeholder="username"
            />
          </div>
          {usernameError && (
            <p className="text-sm text-red-600 mt-1">{usernameError}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => {
              if (e.target.value.length <= maxBioLength) {
                setBio(e.target.value);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Tell us about yourself..."
            rows={4}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              {bio.length}/{maxBioLength} characters
            </p>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

import React, { useState } from 'react';
import { BaseModal } from '../BaseModal';

interface EditBusinessInfoModalProps {
  currentData: {
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
  };
  onSave: (data: {
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
  }) => Promise<void>;
  onClose: () => void;
}

const BUSINESS_CATEGORIES = [
  'Restaurant',
  'Retail',
  'Grocery',
  'Pharmacy',
  'Electronics',
  'Fashion',
  'Beauty',
  'Home & Garden',
  'Sports',
  'Books',
  'Other',
];

export function EditBusinessInfoModal({
  currentData,
  onSave,
  onClose,
}: EditBusinessInfoModalProps) {
  const [name, setName] = useState(currentData.name);
  const [description, setDescription] = useState(currentData.description || '');
  const [category, setCategory] = useState(currentData.category || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(currentData.tags || []);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        category,
        tags,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save business info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges =
    name !== currentData.name ||
    description !== (currentData.description || '') ||
    category !== (currentData.category || '') ||
    JSON.stringify(tags) !== JSON.stringify(currentData.tags || []);

  return (
    <BaseModal
      title="Edit Business Information"
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
            disabled={!hasChanges || !name.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="My Business"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a category</option>
            {BUSINESS_CATEGORIES.map(cat => (
              <option key={cat} value={cat.toLowerCase()}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Describe your business..."
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {description.length}/500 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a tag..."
              maxLength={20}
            />
            <button
              onClick={handleAddTag}
              disabled={!tagInput.trim() || tags.length >= 10}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {tags.length}/10 tags
          </p>
        </div>
      </div>
    </BaseModal>
  );
}

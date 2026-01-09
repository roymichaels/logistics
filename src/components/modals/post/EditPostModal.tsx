import React, { useState } from 'react';
import { BaseModal } from '../BaseModal';
import { Hash, MapPin } from 'lucide-react';

interface Post {
  id: string;
  caption?: string;
  location?: string;
  hashtags?: string[];
}

interface EditPostModalProps {
  post: Post;
  onSave: (updates: Partial<Post>) => Promise<void>;
  onClose: () => void;
}

export function EditPostModal({
  post,
  onSave,
  onClose,
}: EditPostModalProps) {
  const [caption, setCaption] = useState(post.caption || '');
  const [location, setLocation] = useState(post.location || '');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>(post.hashtags || []);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag) && hashtags.length < 30) {
      setHashtags([...hashtags, tag]);
      setHashtagInput('');
    }
  };

  const handleRemoveHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave({
        caption: caption.trim(),
        location: location.trim(),
        hashtags,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges =
    caption !== (post.caption || '') ||
    location !== (post.location || '') ||
    JSON.stringify(hashtags) !== JSON.stringify(post.hashtags || []);

  return (
    <BaseModal
      title="Edit Post"
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
            disabled={!hasChanges || isLoading}
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
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Write a caption..."
            rows={5}
            maxLength={2200}
          />
          <p className="text-xs text-gray-500 mt-1">
            {caption.length}/2,200 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin size={16} className="inline mr-1" />
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add location..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Hash size={16} className="inline mr-1" />
            Hashtags
          </label>
          <div className="flex gap-2 mb-2">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddHashtag();
                  }
                }}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add hashtag..."
                maxLength={50}
              />
            </div>
            <button
              onClick={handleAddHashtag}
              disabled={!hashtagInput.trim() || hashtags.length >= 30}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
              {hashtags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveHashtag(tag)}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {hashtags.length}/30 hashtags
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Use relevant hashtags to increase your post's reach and help others discover your content.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}

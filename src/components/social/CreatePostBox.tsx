import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { CreatePostInput, PostVisibility } from '../../data/types';

interface CreatePostBoxProps {
  onSubmit: (input: CreatePostInput) => Promise<void>;
  placeholder?: string;
  replyToPostId?: string;
}

export function CreatePostBox({ onSubmit, placeholder = "What's happening?", replyToPostId }: CreatePostBoxProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        content: content.trim(),
        visibility,
        reply_to_post_id: replyToPostId
      });
      setContent('');
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0">
        {user?.photo_url ? (
          <img src={user.photo_url} alt={user.name || 'You'} className="w-12 h-12 rounded-full" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {(user?.name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full p-3 text-lg border-none focus:outline-none resize-none"
          rows={3}
        />

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
              title="Add image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            <button
              type="button"
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
              title="Add GIF"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as PostVisibility)}
              className="px-3 py-1 text-sm border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="public">Public</option>
              <option value="followers">Followers</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-sm ${content.length > 280 ? 'text-red-500' : 'text-gray-500'}`}>
              {content.length}/280
            </span>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || content.length > 280 || isSubmitting}
              className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

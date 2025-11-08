import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppServices } from '../../context/AppServicesContext';
import { MediaUploadService } from '../../services/mediaUpload';
import { i18n } from '../../lib/i18n';
import type { CreatePostInput, PostVisibility, MediaType } from '../../data/types';
import { logger } from '../../lib/logger';

interface CreatePostBoxProps {
  onSubmit: (input: CreatePostInput) => Promise<void>;
  placeholder?: string;
  replyToPostId?: string;
}

interface MediaPreview {
  file: File;
  url: string;
  type: MediaType;
}

export function CreatePostBox({ onSubmit, placeholder, replyToPostId }: CreatePostBoxProps) {
  const defaultPlaceholder = placeholder || i18n.getTranslations().social.whatsHappening;
  const { user } = useAuth();
  const { dataStore } = useAppServices();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPreviews: MediaPreview[] = [];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const type: MediaType = file.type.startsWith('video/') ? 'video' : 'image';
      newPreviews.push({ file, url, type });
    }

    setMediaFiles((prev) => [...prev, ...newPreviews].slice(0, 4));
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if ((!content.trim() && mediaFiles.length === 0) || isSubmitting) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let uploadedMedia: Array<{ media_type: MediaType; media_url: string; thumbnail_url?: string }> = [];

      if (mediaFiles.length > 0) {
        const mediaService = new MediaUploadService(dataStore.supabase);
        const results = await mediaService.uploadMultiple(mediaFiles.map((m) => m.file));
        uploadedMedia = results.map((result) => ({
          media_type: result.type,
          media_url: result.url,
          thumbnail_url: result.thumbnail
        }));
        setUploadProgress(100);
      }

      await onSubmit({
        content: content.trim() || i18n.getTranslations().social.sharedMedia,
        visibility,
        reply_to_post_id: replyToPostId,
        media: uploadedMedia.length > 0 ? uploadedMedia : undefined
      });

      setContent('');
      setMediaFiles([]);
      setUploadProgress(0);
    } catch (error) {
      logger.error('Failed to create post:', error);
      alert(i18n.getTranslations().social.postFailed);
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
          <img src={user.photo_url} alt={user.name || user.username || i18n.getTranslations().social.userAvatar} className="w-12 h-12 rounded-full" />
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
          placeholder={defaultPlaceholder}
          aria-label={i18n.getTranslations().social.whatsHappening}
          className="w-full p-3 text-lg border-none focus:outline-none resize-none"
          rows={3}
        />

        {mediaFiles.length > 0 && (
          <div className={`mt-3 grid gap-2 ${mediaFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {mediaFiles.map((media, index) => (
              <div key={index} className="relative rounded-2xl overflow-hidden bg-gray-100">
                {media.type === 'image' ? (
                  <img src={media.url} alt={i18n.getTranslations().social.postImage} className="w-full h-48 object-cover" />
                ) : (
                  <video src={media.url} className="w-full h-48 object-cover" />
                )}
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute top-2 right-2 w-8 h-8 bg-gray-900 bg-opacity-75 text-white rounded-full hover:bg-opacity-90 transition-colors flex items-center justify-center"
                  title={i18n.getTranslations().social.removeMedia}
                  aria-label={i18n.getTranslations().social.removeMedia}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">{i18n.getTranslations().social.uploadingMedia}... {uploadProgress}%</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={mediaFiles.length >= 4}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={i18n.getTranslations().social.addImageOrVideo}
              aria-label={i18n.getTranslations().social.addImageOrVideo}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as PostVisibility)}
              className="px-3 py-1 text-sm border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="public">{i18n.getTranslations().social.public}</option>
              <option value="followers">{i18n.getTranslations().social.followersOnly}</option>
              <option value="private">{i18n.getTranslations().social.private}</option>
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
              {isSubmitting ? i18n.getTranslations().social.posting : i18n.getTranslations().social.post}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

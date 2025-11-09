import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppServices } from '../../context/AppServicesContext';
import { MediaUploadService } from '../../services/mediaUpload';
import { i18n } from '../../lib/i18n';
import type { CreatePostInput, PostVisibility, MediaType } from '../../data/types';
import { logger } from '../../lib/logger';
import { TWITTER_COLORS } from '../../styles/twitterTheme';

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
    <div style={{ display: 'flex', gap: '12px' }}>
      <div style={{ flexShrink: 0 }}>
        {user?.photo_url ? (
          <img
            src={user.photo_url}
            alt={user.name || user.username || i18n.getTranslations().social.userAvatar}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: TWITTER_COLORS.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: TWITTER_COLORS.white,
            fontSize: '15px',
            fontWeight: '700'
          }}>
            {(user?.name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={defaultPlaceholder}
          aria-label={i18n.getTranslations().social.whatsHappening}
          style={{
            width: '100%',
            padding: '12px 0',
            fontSize: '20px',
            border: 'none',
            background: 'transparent',
            color: TWITTER_COLORS.text,
            resize: 'none',
            outline: 'none',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            lineHeight: '1.375'
          }}
          rows={3}
        />

        {mediaFiles.length > 0 && (
          <div style={{
            marginTop: '12px',
            display: 'grid',
            gap: '2px',
            gridTemplateColumns: mediaFiles.length === 1 ? '1fr' : '1fr 1fr',
            borderRadius: '16px',
            overflow: 'hidden'
          }}>
            {mediaFiles.map((media, index) => (
              <div key={index} style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: TWITTER_COLORS.backgroundHover }}>
                {media.type === 'image' ? (
                  <img
                    src={media.url}
                    alt={i18n.getTranslations().social.postImage}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                ) : (
                  <video
                    src={media.url}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                )}
                <button
                  onClick={() => removeMedia(index)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '32px',
                    height: '32px',
                    background: 'rgba(15, 20, 25, 0.75)',
                    backdropFilter: 'blur(4px)',
                    color: TWITTER_COLORS.white,
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 200ms ease-in-out'
                  }}
                  title={i18n.getTranslations().social.removeMedia}
                  aria-label={i18n.getTranslations().social.removeMedia}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(39, 44, 48, 0.75)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(15, 20, 25, 0.75)'; }}
                >
                  <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{
              width: '100%',
              height: '4px',
              background: TWITTER_COLORS.backgroundHover,
              borderRadius: '9999px',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  background: TWITTER_COLORS.primary,
                  height: '100%',
                  borderRadius: '9999px',
                  transition: 'width 300ms ease-in-out',
                  width: `${uploadProgress}%`
                }}
              />
            </div>
            <p style={{ fontSize: '13px', color: TWITTER_COLORS.textSecondary, marginTop: '8px' }}>
              {i18n.getTranslations().social.uploadingMedia}... {uploadProgress}%
            </p>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${TWITTER_COLORS.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={mediaFiles.length >= 4}
              style={{
                padding: '8px',
                color: TWITTER_COLORS.primary,
                background: 'transparent',
                border: 'none',
                borderRadius: '50%',
                cursor: mediaFiles.length >= 4 ? 'not-allowed' : 'pointer',
                opacity: mediaFiles.length >= 4 ? 0.5 : 1,
                transition: 'all 200ms ease-in-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={i18n.getTranslations().social.addImageOrVideo}
              aria-label={i18n.getTranslations().social.addImageOrVideo}
              onMouseEnter={(e) => {
                if (mediaFiles.length < 4) {
                  e.currentTarget.style.background = 'rgba(29, 161, 242, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as PostVisibility)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                border: `1px solid ${TWITTER_COLORS.border}`,
                borderRadius: '9999px',
                background: 'transparent',
                color: TWITTER_COLORS.primary,
                fontWeight: '700',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="public" style={{ background: TWITTER_COLORS.backgroundSecondary, color: TWITTER_COLORS.text }}>{i18n.getTranslations().social.public}</option>
              <option value="followers" style={{ background: TWITTER_COLORS.backgroundSecondary, color: TWITTER_COLORS.text }}>{i18n.getTranslations().social.followersOnly}</option>
              <option value="private" style={{ background: TWITTER_COLORS.backgroundSecondary, color: TWITTER_COLORS.text }}>{i18n.getTranslations().social.private}</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '13px',
              color: content.length > 280 ? TWITTER_COLORS.error : TWITTER_COLORS.textSecondary,
              fontWeight: content.length > 280 ? '700' : '400'
            }}>
              {content.length}/280
            </span>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || content.length > 280 || isSubmitting}
              style={{
                padding: '8px 16px',
                background: (!content.trim() || content.length > 280 || isSubmitting)
                  ? TWITTER_COLORS.buttonSecondaryBorder
                  : TWITTER_COLORS.primary,
                color: TWITTER_COLORS.white,
                borderRadius: '9999px',
                fontWeight: '700',
                fontSize: '15px',
                border: 'none',
                cursor: (!content.trim() || content.length > 280 || isSubmitting) ? 'not-allowed' : 'pointer',
                opacity: (!content.trim() || content.length > 280 || isSubmitting) ? 0.5 : 1,
                transition: 'all 200ms ease-in-out',
                minWidth: '80px'
              }}
              onMouseEnter={(e) => {
                if (content.trim() && content.length <= 280 && !isSubmitting) {
                  e.currentTarget.style.background = TWITTER_COLORS.primaryHover;
                }
              }}
              onMouseLeave={(e) => {
                if (content.trim() && content.length <= 280 && !isSubmitting) {
                  e.currentTarget.style.background = TWITTER_COLORS.primary;
                }
              }}
            >
              {isSubmitting ? i18n.getTranslations().social.posting : i18n.getTranslations().social.post}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

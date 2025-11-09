import React, { useState } from 'react';
import type { Post } from '../../data/types';
import { useAuth } from '../../context/AuthContext';
import { i18n } from '../../lib/i18n';
import { TWITTER_COLORS } from '../../styles/twitterTheme';

interface PostCardProps {
  post: Post;
  onLike: (isLiked: boolean) => void;
  onRepost: (comment?: string) => void;
  onDelete: () => void;
}

export function PostCard({ post, onLike, onRepost, onDelete }: PostCardProps) {
  const { user } = useAuth();
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostComment, setRepostComment] = useState('');

  const isOwnPost = user?.id === post.user_id;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const t = i18n.getTranslations();

    if (diffMins < 1) return t.social.now;
    if (diffMins < 60) return `${diffMins}${t.social.minutesAgo}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}${t.social.hoursAgo}`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}${t.social.daysAgo}`;
  };

  const handleRepost = () => {
    onRepost(repostComment || undefined);
    setShowRepostModal(false);
    setRepostComment('');
  };

  return (
    <div style={{
      background: TWITTER_COLORS.background,
      borderBottom: `1px solid ${TWITTER_COLORS.border}`,
      transition: 'background-color 200ms ease-in-out',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = TWITTER_COLORS.backgroundHover; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = TWITTER_COLORS.background; }}
    >
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flexShrink: 0 }}>
            {post.user?.photo_url ? (
              <img
                src={post.user.photo_url}
                alt={post.user.name || post.user.username || i18n.getTranslations().social.userAvatar}
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
                {(post.user?.name?.[0] || post.user?.username?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{
                fontWeight: '700',
                color: TWITTER_COLORS.text,
                fontSize: '15px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                {post.user?.name || post.user?.username || 'Unknown User'}
              </span>
              {post.user?.username && (
                <span style={{ color: TWITTER_COLORS.textSecondary, fontSize: '15px' }}>@{post.user.username}</span>
              )}
              <span style={{ color: TWITTER_COLORS.textSecondary, fontSize: '15px' }}>·</span>
              <span style={{ color: TWITTER_COLORS.textSecondary, fontSize: '15px' }}>{formatDate(post.created_at)}</span>

              {isOwnPost && (
                <button
                  onClick={onDelete}
                  style={{
                    marginLeft: 'auto',
                    color: TWITTER_COLORS.textSecondary,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '50%',
                    transition: 'all 200ms ease-in-out'
                  }}
                  title={i18n.getTranslations().social.deletePost}
                  aria-label={i18n.getTranslations().social.deletePost}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(244, 33, 46, 0.1)';
                    e.currentTarget.style.color = TWITTER_COLORS.error;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = TWITTER_COLORS.textSecondary;
                  }}
                >
                  <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            <div style={{ marginTop: '4px' }}>
              <p style={{
                color: TWITTER_COLORS.text,
                fontSize: '15px',
                lineHeight: '1.375',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>{post.content}</p>
            </div>

            {post.media && post.media.length > 0 && (
              <div style={{
                marginTop: '12px',
                display: 'grid',
                gap: '2px',
                gridTemplateColumns: post.media.length === 1 ? '1fr' : '1fr 1fr',
                borderRadius: '16px',
                overflow: 'hidden',
                border: `1px solid ${TWITTER_COLORS.border}`
              }}>
                {post.media.map((media, index) => (
                  <div key={media.id || index} style={{ overflow: 'hidden' }}>
                    {media.media_type === 'image' ? (
                      <img
                        src={media.media_url}
                        alt={i18n.getTranslations().social.postImage}
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '400px',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                      />
                    ) : media.media_type === 'video' ? (
                      <video
                        src={media.media_url}
                        controls
                        poster={media.thumbnail_url}
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '400px',
                          display: 'block'
                        }}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px', maxWidth: '425px', justifyContent: 'space-between' }}>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: TWITTER_COLORS.textSecondary,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 200ms ease-in-out'
                }}
                aria-label={`${post.comments_count || 0} ${i18n.getTranslations().social.comments}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(29, 161, 242, 0.1)';
                  e.currentTarget.style.color = TWITTER_COLORS.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = TWITTER_COLORS.textSecondary;
                }}
              >
                <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span style={{ fontSize: '13px' }}>{post.comments_count || 0}</span>
              </button>

              <button
                onClick={() => setShowRepostModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: post.is_reposted ? TWITTER_COLORS.success : TWITTER_COLORS.textSecondary,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 200ms ease-in-out'
                }}
                aria-label={`${i18n.getTranslations().social.repost}: ${post.reposts_count || 0}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 186, 124, 0.1)';
                  e.currentTarget.style.color = TWITTER_COLORS.success;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = post.is_reposted ? TWITTER_COLORS.success : TWITTER_COLORS.textSecondary;
                }}
              >
                <svg style={{ width: '18px', height: '18px' }} fill={post.is_reposted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span style={{ fontSize: '13px' }}>{post.reposts_count || 0}</span>
              </button>

              <button
                onClick={() => onLike(!!post.is_liked)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: post.is_liked ? TWITTER_COLORS.error : TWITTER_COLORS.textSecondary,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 200ms ease-in-out'
                }}
                aria-label={`${post.is_liked ? i18n.getTranslations().social.unlike : i18n.getTranslations().social.like}: ${post.likes_count || 0}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 33, 46, 0.1)';
                  e.currentTarget.style.color = TWITTER_COLORS.error;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = post.is_liked ? TWITTER_COLORS.error : TWITTER_COLORS.textSecondary;
                }}
              >
                <svg style={{ width: '18px', height: '18px' }} fill={post.is_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span style={{ fontSize: '13px' }}>{post.likes_count || 0}</span>
              </button>

              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: TWITTER_COLORS.textSecondary,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 200ms ease-in-out'
                }}
                aria-label={i18n.getTranslations().social.share}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(29, 161, 242, 0.1)';
                  e.currentTarget.style.color = TWITTER_COLORS.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = TWITTER_COLORS.textSecondary;
                }}
              >
                <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showRepostModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: TWITTER_COLORS.overlay,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div style={{
            background: TWITTER_COLORS.backgroundSecondary,
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            padding: '24px',
            border: `1px solid ${TWITTER_COLORS.border}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: TWITTER_COLORS.text }}>{i18n.getTranslations().social.repostTitle}</h3>
              <button
                onClick={() => setShowRepostModal(false)}
                style={{
                  color: TWITTER_COLORS.textSecondary,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 200ms ease-in-out'
                }}
                aria-label={i18n.getTranslations().social.closeModal}
                onMouseEnter={(e) => { e.currentTarget.style.background = TWITTER_COLORS.backgroundHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <textarea
              value={repostComment}
              onChange={(e) => setRepostComment(e.target.value)}
              placeholder={i18n.getTranslations().social.addCommentOptional}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${TWITTER_COLORS.border}`,
                borderRadius: '12px',
                resize: 'none',
                background: TWITTER_COLORS.background,
                color: TWITTER_COLORS.text,
                fontSize: '15px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                outline: 'none'
              }}
              rows={3}
              aria-label={i18n.getTranslations().social.addComment}
              onFocus={(e) => { e.currentTarget.style.borderColor = TWITTER_COLORS.primary; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = TWITTER_COLORS.border; }}
            />

            <div style={{
              background: TWITTER_COLORS.backgroundHover,
              borderRadius: '12px',
              padding: '12px',
              marginTop: '12px',
              border: `1px solid ${TWITTER_COLORS.border}`
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flexShrink: 0 }}>
                  {post.user?.photo_url ? (
                    <img src={post.user.photo_url} alt={post.user.name || 'User'} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                  ) : (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: TWITTER_COLORS.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: TWITTER_COLORS.white,
                      fontSize: '13px',
                      fontWeight: '700'
                    }}>
                      {(post.user?.name?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p style={{ fontWeight: '700', fontSize: '14px', color: TWITTER_COLORS.text }}>{post.user?.name || 'Unknown'}</p>
                  <p style={{ fontSize: '14px', color: TWITTER_COLORS.text, marginTop: '4px' }}>{post.content}</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={() => setShowRepostModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  border: `1px solid ${TWITTER_COLORS.border}`,
                  borderRadius: '9999px',
                  fontWeight: '700',
                  background: 'transparent',
                  color: TWITTER_COLORS.text,
                  cursor: 'pointer',
                  fontSize: '15px',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = TWITTER_COLORS.backgroundHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {i18n.getTranslations().social.cancel}
              </button>
              <button
                onClick={handleRepost}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: TWITTER_COLORS.success,
                  color: TWITTER_COLORS.white,
                  borderRadius: '9999px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '15px',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#00A368'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = TWITTER_COLORS.success; }}
              >
                {i18n.getTranslations().social.repost}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

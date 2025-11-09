import React, { useEffect, useState } from 'react';
import { useAppServices } from '../context/AppServicesContext';
import { i18n } from '../lib/i18n';
import type { Post, CreatePostInput } from '../data/types';
import { PostCard } from '../components/social/PostCard';
import { CreatePostBox } from '../components/social/CreatePostBox';
import { TrendingSidebar } from '../components/social/TrendingSidebar';
import { logger } from '../lib/logger';
import { TWITTER_COLORS } from '../styles/twitterTheme';

export function SocialFeed() {
  const { dataStore } = useAppServices();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'following'>('all');

  useEffect(() => {
    loadFeed();
  }, [filter]);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const feedFilters = filter === 'following' ? { following_only: true } : {};
      const feedData = await dataStore.getFeed?.(feedFilters);
      setPosts(feedData || []);
    } catch (error) {
      logger.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (input: CreatePostInput) => {
    try {
      await dataStore.createPost?.(input);
      await loadFeed();
    } catch (error) {
      logger.error('Failed to create post:', error);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await dataStore.unlikePost?.(postId);
      } else {
        await dataStore.likePost?.(postId);
      }
      await loadFeed();
    } catch (error) {
      logger.error('Failed to like/unlike post:', error);
    }
  };

  const handleRepost = async (postId: string, comment?: string) => {
    try {
      await dataStore.repostPost?.(postId, comment);
      await loadFeed();
    } catch (error) {
      logger.error('Failed to repost:', error);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await dataStore.deletePost?.(postId);
      await loadFeed();
    } catch (error) {
      logger.error('Failed to delete post:', error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: TWITTER_COLORS.background,
      color: TWITTER_COLORS.text
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '0'
        }}>
          <style>{`
            @media (min-width: 768px) {
              .social-feed-grid {
                grid-template-columns: minmax(0, 600px) 350px;
                gap: 0;
              }
            }
          `}</style>
          <div className="social-feed-grid" style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
            <div style={{ borderLeft: `1px solid ${TWITTER_COLORS.border}`, borderRight: `1px solid ${TWITTER_COLORS.border}` }}>
              <div style={{
                background: TWITTER_COLORS.navBackground,
                backdropFilter: TWITTER_COLORS.navBackdrop,
                borderBottom: `1px solid ${TWITTER_COLORS.border}`,
                position: 'sticky',
                top: '53px',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', borderBottom: `1px solid ${TWITTER_COLORS.border}` }}>
                  <button
                    onClick={() => setFilter('all')}
                    style={{
                      flex: 1,
                      padding: '16px',
                      fontSize: '15px',
                      fontWeight: filter === 'all' ? '700' : '400',
                      background: 'transparent',
                      border: 'none',
                      color: filter === 'all' ? TWITTER_COLORS.text : TWITTER_COLORS.textSecondary,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 200ms ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      if (filter !== 'all') {
                        e.currentTarget.style.background = TWITTER_COLORS.backgroundHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {i18n.getTranslations().social.forYou}
                    {filter === 'all' && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '56px',
                        height: '4px',
                        background: TWITTER_COLORS.primary,
                        borderRadius: '4px 4px 0 0'
                      }} />
                    )}
                  </button>
                  <button
                    onClick={() => setFilter('following')}
                    style={{
                      flex: 1,
                      padding: '16px',
                      fontSize: '15px',
                      fontWeight: filter === 'following' ? '700' : '400',
                      background: 'transparent',
                      border: 'none',
                      color: filter === 'following' ? TWITTER_COLORS.text : TWITTER_COLORS.textSecondary,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 200ms ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      if (filter !== 'following') {
                        e.currentTarget.style.background = TWITTER_COLORS.backgroundHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {i18n.getTranslations().social.followingFeed}
                    {filter === 'following' && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '56px',
                        height: '4px',
                        background: TWITTER_COLORS.primary,
                        borderRadius: '4px 4px 0 0'
                      }} />
                    )}
                  </button>
                </div>
              </div>

              <div style={{
                background: TWITTER_COLORS.background,
                borderBottom: `1px solid ${TWITTER_COLORS.border}`,
                padding: '16px'
              }}>
                <CreatePostBox onSubmit={handleCreatePost} />
              </div>

              <div>
                {loading ? (
                  <div style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: TWITTER_COLORS.textSecondary
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: `3px solid ${TWITTER_COLORS.border}`,
                      borderTopColor: TWITTER_COLORS.primary,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto'
                    }} role="status" aria-label={i18n.getTranslations().common.loading} />
                    <style>{`
                      @keyframes spin {
                        to { transform: rotate(360deg); }
                      }
                    `}</style>
                    <p style={{ marginTop: '12px', fontSize: '15px' }}>{i18n.getTranslations().social.loadingFeed}</p>
                  </div>
                ) : posts.length === 0 ? (
                  <div style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: TWITTER_COLORS.textSecondary,
                    fontSize: '15px'
                  }}>
                    <p>{i18n.getTranslations().social.noPostsYet}. {i18n.getTranslations().social.startFollowing} {i18n.getTranslations().social.createFirstPost}</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={(isLiked) => handleLike(post.id, isLiked)}
                      onRepost={(comment) => handleRepost(post.id, comment)}
                      onDelete={() => handleDelete(post.id)}
                    />
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'none' }} className="md-sidebar">
              <style>{`
                @media (min-width: 768px) {
                  .md-sidebar {
                    display: block !important;
                  }
                }
              `}</style>
              <div style={{ position: 'sticky', top: '69px', padding: '0 16px' }}>
                <TrendingSidebar />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

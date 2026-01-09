import React, { useState, useEffect, useRef, useCallback } from 'react';
import { feedAlgorithmService, FeedPost } from '../../services/feedAlgorithm';
import { PostCard } from '../social/PostCard';
import { LoadingState } from '../molecules/LoadingState';
import { logger } from '../../lib/logger';
import { Sparkles, TrendingUp, Clock } from 'lucide-react';

type FeedMode = 'for-you' | 'following' | 'trending';

export function PersonalizedFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<FeedMode>('for-you');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useRef<HTMLDivElement | null>(null);

  const POSTS_PER_PAGE = 10;

  useEffect(() => {
    loadInitialFeed();
  }, [mode]);

  useEffect(() => {
    setupInfiniteScroll();
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [posts, hasMore, loading]);

  const loadInitialFeed = async () => {
    try {
      setLoading(true);
      setPosts([]);
      setPage(0);
      const newPosts = await feedAlgorithmService.getPersonalizedFeed(POSTS_PER_PAGE, 0);
      setPosts(newPosts);
      setHasMore(newPosts.length === POSTS_PER_PAGE);
    } catch (error) {
      logger.error('Failed to load initial feed', { error });
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      const nextPage = page + 1;
      const newPosts = await feedAlgorithmService.getPersonalizedFeed(
        POSTS_PER_PAGE,
        nextPage * POSTS_PER_PAGE
      );

      if (newPosts.length > 0) {
        setPosts((prev) => [...prev, ...newPosts]);
        setPage(nextPage);
        setHasMore(newPosts.length === POSTS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      logger.error('Failed to load more posts', { error });
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  const setupInfiniteScroll = () => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasMore && !loading) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (lastPostRef.current) {
      observerRef.current.observe(lastPostRef.current);
    }
  };

  const handlePostInteraction = async (
    postId: string,
    interactionType: 'like' | 'comment' | 'share' | 'save'
  ) => {
    try {
      await feedAlgorithmService.trackInteraction({
        user_id: '',
        content_type: 'post',
        content_id: postId,
        interaction_type: interactionType,
      });
    } catch (error) {
      logger.error('Failed to track interaction', { error });
    }
  };

  const handlePostView = useCallback((postId: string, dwellTimeSeconds: number) => {
    feedAlgorithmService.trackInteraction({
      user_id: '',
      content_type: 'post',
      content_id: postId,
      interaction_type: 'dwell',
      dwell_time_seconds: dwellTimeSeconds,
    });
  }, []);

  return (
    <div
      style={{
        maxWidth: '630px',
        margin: '0 auto',
        paddingBottom: '60px',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          borderBottom: '1px solid #dbdbdb',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '12px 0',
          zIndex: 100,
        }}
      >
        <button
          onClick={() => setMode('for-you')}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: mode === 'for-you' ? '2px solid #262626' : 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            color: mode === 'for-you' ? '#262626' : '#8e8e8e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Sparkles size={18} />
          For You
        </button>
        <button
          onClick={() => setMode('following')}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: mode === 'following' ? '2px solid #262626' : 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            color: mode === 'following' ? '#262626' : '#8e8e8e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Clock size={18} />
          Following
        </button>
        <button
          onClick={() => setMode('trending')}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: mode === 'trending' ? '2px solid #262626' : 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            color: mode === 'trending' ? '#262626' : '#8e8e8e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <TrendingUp size={18} />
          Trending
        </button>
      </div>

      {loading && posts.length === 0 ? (
        <LoadingState />
      ) : (
        <>
          {posts.map((post, index) => (
            <div
              key={post.id}
              ref={index === posts.length - 1 ? lastPostRef : null}
              style={{
                borderBottom: '1px solid #efefef',
                marginBottom: '12px',
              }}
            >
              <PostCard
                post={post}
                onLike={(isLiked) => handlePostInteraction(post.id, 'like')}
                onRepost={() => handlePostInteraction(post.id, 'share')}
                onDelete={() => {}}
              />
            </div>
          ))}

          {loading && posts.length > 0 && (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #f3f3f3',
                  borderTop: '3px solid #0095f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto',
                }}
              />
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#8e8e8e',
                fontSize: '14px',
              }}
            >
              You're all caught up! 🎉
              <br />
              <span style={{ fontSize: '12px' }}>
                Check back later for more content
              </span>
            </div>
          )}

          {posts.length === 0 && !loading && (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: '#8e8e8e',
              }}
            >
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>
                No posts yet
              </h3>
              <p style={{ fontSize: '14px' }}>
                Follow people to see their posts in your feed
              </p>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

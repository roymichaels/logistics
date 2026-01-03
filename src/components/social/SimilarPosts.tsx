import React, { useEffect, useState } from 'react';
import { useAppServices } from '../../context/AppServicesContext';
import { i18n } from '../../lib/i18n';
import type { Post } from '../../data/types';
import { logger } from '../../lib/logger';

interface SimilarPostsProps {
  postId: string;
  limit?: number;
  onPostClick?: (postId: string) => void;
}

interface SimilarPost {
  id: string;
  content: string;
  user: {
    id: string;
    name?: string;
    username?: string;
    photo_url?: string;
  };
  likes_count: number;
  comments_count: number;
  created_at: string;
  similarity_score: number;
  common_hashtags: number;
}

export function SimilarPosts({ postId, limit = 5, onPostClick }: SimilarPostsProps) {
  const { dataStore } = useAppServices();
  const [similarPosts, setSimilarPosts] = useState<SimilarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSimilarPosts();
  }, [postId]);

  const loadSimilarPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!dataStore?.supabase) {
        setSimilarPosts([]);
        setLoading(false);
        return;
      }

      // Call database function to get similar posts
      const { data: similarPostIds, error: similarError } = await dataStore.supabase
        .rpc('get_similar_posts', {
          target_post_id: postId,
          limit_count: limit
        });

      if (similarError) throw similarError;

      if (similarPostIds && similarPostIds.length > 0) {
        // Fetch full post details
        const { data: posts, error: postsError } = await dataStore.supabase
          .from('posts')
          .select(`
            *,
            user:users!posts_user_id_fkey(id, name, username, photo_url)
          `)
          .in('id', similarPostIds.map((p: any) => p.similar_post_id))
          .is('deleted_at', null);

        if (postsError) throw postsError;

        // Merge similarity scores with post data
        const enrichedPosts = posts?.map(post => {
          const similarityData = similarPostIds.find((s: any) => s.similar_post_id === post.id);
          return {
            ...post,
            similarity_score: similarityData?.similarity_score || 0,
            common_hashtags: similarityData?.common_hashtags || 0
          };
        }) || [];

        setSimilarPosts(enrichedPosts);
      } else {
        setSimilarPosts([]);
      }
    } catch (err) {
      logger.error('Failed to load similar posts:', err);
      setError(i18n.getTranslations().social.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

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
    if (diffDays < 7) return `${diffDays}${t.social.daysAgo}`;
    return `${Math.floor(diffDays / 7)}${t.social.weeksAgo}`;
  };

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-2xl overflow-hidden p-4">
        <h2 className="text-xl font-bold mb-4">{i18n.getTranslations().social.similarPosts}</h2>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 rounded-2xl overflow-hidden p-4">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (similarPosts.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold">{i18n.getTranslations().social.similarPosts}</h2>
        <p className="text-xs text-gray-500 mt-1">{i18n.getTranslations().social.relatedContent}</p>
      </div>

      <div>
        {similarPosts.map((post) => (
          <div
            key={post.id}
            className="p-4 hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0 cursor-pointer"
            onClick={() => onPostClick?.(post.id)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onPostClick?.(post.id);
              }
            }}
          >
            <div className="flex gap-2">
              <div className="flex-shrink-0">
                {post.user.photo_url ? (
                  <img
                    src={post.user.photo_url}
                    alt={post.user.name || post.user.username || i18n.getTranslations().social.userAvatar}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                    {(post.user.name?.[0] || post.user.username?.[0] || 'U').toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900 truncate">
                    {post.user.name || post.user.username || 'Unknown'}
                  </span>
                  {post.user.username && (
                    <span className="text-gray-500 text-sm truncate">@{post.user.username}</span>
                  )}
                  <span className="text-gray-500 text-sm">·</span>
                  <span className="text-gray-500 text-sm">{formatDate(post.created_at)}</span>
                </div>

                <p className="text-sm text-gray-900 mt-1 line-clamp-3">{post.content}</p>

                <div className="flex items-center gap-4 mt-2 text-gray-500 text-xs">
                  <span>{post.likes_count || 0} {i18n.getTranslations().social.likes}</span>
                  <span>{post.comments_count || 0} {i18n.getTranslations().social.comments}</span>
                  {post.common_hashtags > 0 && (
                    <span className="text-blue-500">
                      {post.common_hashtags} {i18n.getTranslations().social.hashtag}{post.common_hashtags > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

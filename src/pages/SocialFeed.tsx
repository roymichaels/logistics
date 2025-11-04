import React, { useEffect, useState } from 'react';
import { useAppServices } from '../context/AppServicesContext';
import type { Post, CreatePostInput } from '../data/types';
import { PostCard } from '../components/social/PostCard';
import { CreatePostBox } from '../components/social/CreatePostBox';
import { TrendingSidebar } from '../components/social/TrendingSidebar';

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
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (input: CreatePostInput) => {
    try {
      await dataStore.createPost?.(input);
      await loadFeed();
    } catch (error) {
      console.error('Failed to create post:', error);
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
      console.error('Failed to like/unlike post:', error);
    }
  };

  const handleRepost = async (postId: string, comment?: string) => {
    try {
      await dataStore.repostPost?.(postId, comment);
      await loadFeed();
    } catch (error) {
      console.error('Failed to repost:', error);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await dataStore.deletePost?.(postId);
      await loadFeed();
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8">
            <div className="bg-white border-b sticky top-0 z-10">
              <div className="flex border-b">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 px-4 py-3 text-sm font-semibold ${
                    filter === 'all'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  For You
                </button>
                <button
                  onClick={() => setFilter('following')}
                  className={`flex-1 px-4 py-3 text-sm font-semibold ${
                    filter === 'following'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Following
                </button>
              </div>
            </div>

            <div className="bg-white border-b p-4">
              <CreatePostBox onSubmit={handleCreatePost} />
            </div>

            <div className="divide-y">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2">Loading feed...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No posts yet. Start following people or create your first post!</p>
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

          <div className="hidden md:block md:col-span-4">
            <div className="sticky top-4">
              <TrendingSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

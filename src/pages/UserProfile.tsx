import React, { useEffect, useState } from 'react';
import { useAppServices } from '../context/AppServicesContext';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, Post, User } from '../data/types';
import { PostCard } from '../components/social/PostCard';
import { logger } from '../lib/logger';

interface UserProfileProps {
  userId?: string;
}

export function UserProfilePage({ userId }: UserProfileProps) {
  const { dataStore } = useAppServices();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = !userId || userId === currentUser?.id;
  const targetUserId = userId || currentUser?.id;

  useEffect(() => {
    if (targetUserId) {
      loadProfile();
      loadPosts();
      if (!isOwnProfile) {
        checkFollowStatus();
      }
    }
  }, [targetUserId]);

  const loadProfile = async () => {
    try {
      if (!targetUserId) {
        logger.warn('[UserProfile] No target user ID');
        return;
      }

      const profileData = await dataStore.getUserProfile?.(targetUserId);
      if (profileData) {
        setProfile(profileData);
      } else {
        setProfile({
          id: targetUserId,
          bio: '',
          website: '',
          location: '',
          banner_url: '',
          followers_count: 0,
          following_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      const userData = await dataStore.getUser?.(targetUserId);
      if (userData) {
        setUser(userData);
      } else {
        setUser({
          id: targetUserId,
          wallet_address: targetUserId,
          name: targetUserId.slice(0, 8),
          username: targetUserId.slice(0, 12),
          role: 'customer',
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to load profile:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const postsData = await dataStore.getUserPosts?.(targetUserId!, 50);
      setPosts(postsData || []);
    } catch (error) {
      logger.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const following = await dataStore.isFollowing?.(targetUserId!);
      setIsFollowing(!!following);
    } catch (error) {
      logger.error('Failed to check follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!targetUserId) return;
    try {
      if (isFollowing) {
        await dataStore.unfollowUser?.(targetUserId);
      } else {
        await dataStore.followUser?.(targetUserId);
      }
      setIsFollowing(!isFollowing);
      await loadProfile();
    } catch (error) {
      logger.error('Failed to follow/unfollow:', error);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await dataStore.unlikePost?.(postId);
      } else {
        await dataStore.likePost?.(postId);
      }
      await loadPosts();
    } catch (error) {
      logger.error('Failed to like/unlike post:', error);
    }
  };

  const handleRepost = async (postId: string, comment?: string) => {
    try {
      await dataStore.repostPost?.(postId, comment);
      await loadPosts();
    } catch (error) {
      logger.error('Failed to repost:', error);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await dataStore.deletePost?.(postId);
      await loadPosts();
    } catch (error) {
      logger.error('Failed to delete post:', error);
    }
  };

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto border-x">
        {profile.banner_url && (
          <div className="h-48 bg-gray-200">
            <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
          </div>
        )}
        {!profile.banner_url && <div className="h-48 bg-gray-300"></div>}

        <div className="px-4 pb-4">
          <div className="flex justify-between items-start -mt-16 mb-4">
            <div className="relative">
              {user.photo_url ? (
                <img
                  src={user.photo_url}
                  alt={user.name || 'User'}
                  className="w-32 h-32 rounded-full border-4 border-white"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white bg-blue-500 flex items-center justify-center text-white text-4xl font-semibold">
                  {(user.name?.[0] || user.username?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>

            <div className="mt-16">
              {isOwnProfile ? (
                <button className="px-4 py-2 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 transition-colors">
                  Edit profile
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                    isFollowing
                      ? 'border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-600'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-2xl font-bold">{user.name || user.username || 'Unknown User'}</h1>
            {user.username && <p className="text-gray-500">@{user.username}</p>}
            {profile.bio && <p className="mt-3 text-gray-900">{profile.bio}</p>}

            <div className="flex gap-4 mt-3 text-gray-500">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {profile.website}
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-3">
              <button className="hover:underline">
                <span className="font-bold">{profile.following_count}</span>{' '}
                <span className="text-gray-500">Following</span>
              </button>
              <button className="hover:underline">
                <span className="font-bold">{profile.followers_count}</span>{' '}
                <span className="text-gray-500">Followers</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex">
            {['posts', 'replies', 'media', 'likes'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 px-4 py-4 text-center font-semibold capitalize hover:bg-gray-50 transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No posts yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={(isLiked) => handleLike(post.id, isLiked)}
                  onRepost={(comment) => handleRepost(post.id, comment)}
                  onDelete={() => handleDelete(post.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
